// The Angelio Studio's server side (the page is public/studio/). Everything here is behind the admin key
// (worker/index.js checks it before calling studioApi).
//
// Watch & Sing's library lives in R2 (bucket watch-media, binding WATCH_MEDIA) at content/watch/library.json;
// the watch Worker serves it as /watch/data/library.json, so a save is live at once. Before each save the old
// library is kept in content/watch/history/, for undo. Uploads (videos, pictures, MP3s, PDFs) go to studio/YYYY/MM/
// and are served at /watch/media/<key>. With a GITHUB_TOKEN secret, the library is also copied into the repo
// (apps/watch/public/data/library.json) every night and on "Back up now".

import { validateLibrary, prepareForSave } from "../public/js/watch-content.js";

const LIVE = "content/watch/library.json";
const HISTORY = "content/watch/history/";
const TYPES = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav", "application/pdf": "pdf" };
const REPO = "shalone86/angelio", REPO_PATH = "apps/watch/public/data/library.json";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** The live library and its version (the R2 etag), or the app's own copy if the Studio hasn't saved yet. */
async function current(env) {
  const obj = await env.WATCH_MEDIA.get(LIVE);
  if (obj) return { library: await obj.json(), version: obj.etag, stored: true };
  const r = env.WATCH ? await env.WATCH.fetch("https://watch/data/library.json") : null;
  if (!r?.ok) throw new Error("Couldn't read the library.");
  return { library: await r.json(), version: "app", stored: false };
}

export async function studioApi(request, url, env) {
  if (!env.WATCH_MEDIA) return json({ error: "The Studio's storage isn't connected (WATCH_MEDIA)." }, 503);
  const route = `${request.method} ${url.pathname.replace(/^\/api\/admin\/studio/, "")}`;
  const q = (k) => url.searchParams.get(k);

  if (route === "GET /watch") return json(await current(env));

  if (route === "POST /watch") {
    let lib;
    try { lib = JSON.parse(await request.text()); } catch { return json({ error: "That wasn't a library." }, 400); }
    const { errors, warnings } = validateLibrary(lib);
    if (errors.length) return json({ error: "Some things need fixing first.", errors }, 400);
    const cur = await current(env);
    if (q("base") && q("base") !== cur.version) return json({ error: "The library was changed somewhere else (another tab?). Reload to get the newest one.", version: cur.version }, 409);
    const note = String(q("note") ?? "").replace(/[^\w -]/g, "").trim().slice(0, 60).replace(/\s+/g, "-");
    await env.WATCH_MEDIA.put(`${HISTORY}${new Date().toISOString()}${note ? `--${note}` : ""}.json`, JSON.stringify(cur.library), { httpMetadata: { contentType: "application/json" } });
    const saved = prepareForSave(lib);
    const obj = await env.WATCH_MEDIA.put(LIVE, JSON.stringify(saved), { httpMetadata: { contentType: "application/json" } });
    return json({ ok: true, version: obj.etag, warnings, people: saved.people.length });
  }

  if (route === "GET /watch/history") {
    const list = [];
    let cursor;
    do {
      const r = await env.WATCH_MEDIA.list({ prefix: HISTORY, cursor, limit: 1000 });
      list.push(...r.objects.map((o) => ({ key: o.key.slice(HISTORY.length), size: o.size })));
      cursor = r.truncated ? r.cursor : null;
    } while (cursor && list.length < 5000);
    list.sort((a, b) => (a.key < b.key ? 1 : -1));
    return json({ versions: list.slice(0, 300).map(({ key, size }) => { const [at, note] = key.replace(/\.json$/, "").split("--"); return { key, at, note: note?.replace(/-/g, " ") ?? "", size }; }) });
  }
  if (route === "GET /watch/version") {
    const key = q("key") ?? "";
    if (!/^[\w:.\-]+\.json$/.test(key)) return json({ error: "bad version" }, 400);
    const obj = await env.WATCH_MEDIA.get(HISTORY + key);
    return obj ? new Response(obj.body, { headers: { "content-type": "application/json" } }) : json({ error: "no such version" }, 404);
  }

  // ── uploads, in parts (each request stays small; R2 joins them) ──
  if (route === "POST /upload/start") {
    const { name = "", type = "" } = await request.json().catch(() => ({}));
    const ext = TYPES[type];
    if (!ext) return json({ error: `Angelio can't keep that kind of file (${type || "unknown"}).` }, 400);
    const now = new Date(), base = String(name).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
    const key = `studio/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${base}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
    const up = await env.WATCH_MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: type } });
    return json({ key, uploadId: up.uploadId, url: `media/${key}` });
  }
  if (route === "PUT /upload/part" || route === "POST /upload/done" || route === "POST /upload/abort") {
    const key = q("key") ?? "", n = Number(q("n"));
    if (!/^studio\/\d{4}\/\d{2}\/[a-z0-9-]+\.\w+$/.test(key) || !q("uploadId")) return json({ error: "bad upload" }, 400);
    const up = env.WATCH_MEDIA.resumeMultipartUpload(key, q("uploadId"));
    if (route === "PUT /upload/part") {
      if (!(n >= 1 && n <= 10000)) return json({ error: "bad part" }, 400);
      const part = await up.uploadPart(n, await request.arrayBuffer());
      return json({ n: part.partNumber, etag: part.etag });
    }
    if (route === "POST /upload/abort") { await up.abort().catch(() => {}); return json({ ok: true }); }
    const { parts = [] } = await request.json().catch(() => ({}));
    await up.complete(parts.map((p) => ({ partNumber: p.n, etag: p.etag })));
    return json({ ok: true, url: `media/${key}` });
  }

  if (route === "POST /backup") return json(await backupToGitHub(env));
  return json({ error: "not found" }, 404);
}

// ── backup to GitHub ──
const b64 = (bytes) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
async function gitBlobSha(bytes) {
  const head = new TextEncoder().encode(`blob ${bytes.length}\0`), all = new Uint8Array(head.length + bytes.length);
  all.set(head); all.set(bytes, head.length);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-1", all))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** Copy the live library into the repo (one commit, only if it changed). Needs the GITHUB_TOKEN secret. */
export async function backupToGitHub(env) {
  if (!env.GITHUB_TOKEN) return { ok: false, error: "Backups to GitHub need a GITHUB_TOKEN secret on the angelio Worker (see the Studio's help)." };
  const obj = await env.WATCH_MEDIA?.get(LIVE);
  if (!obj) return { ok: true, note: "Nothing saved in the Studio yet." };
  const text = JSON.stringify(await obj.json(), null, 1) + "\n", bytes = new TextEncoder().encode(text);
  const api = `https://api.github.com/repos/${REPO}/contents/${REPO_PATH}`;
  const headers = { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "angelio-studio", "x-github-api-version": "2022-11-28" };
  const cur = await fetch(`${api}?ref=main`, { headers });
  if (!cur.ok && cur.status !== 404) return { ok: false, error: `GitHub said ${cur.status} when reading the file.` };
  const sha = cur.ok ? (await cur.json()).sha : undefined;
  if (sha && sha === (await gitBlobSha(bytes))) return { ok: true, note: "Already backed up." };
  const put = await fetch(api, { method: "PUT", headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ message: "Studio backup: Watch & Sing library", content: b64(bytes), branch: "main", ...(sha ? { sha } : {}) }) });
  if (!put.ok) return { ok: false, error: `GitHub said ${put.status} when saving.` };
  return { ok: true, commit: (await put.json()).commit?.sha?.slice(0, 7) };
}
