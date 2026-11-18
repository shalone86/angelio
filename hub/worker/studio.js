// The Angelio Studio's server side (the page is public/studio/). Everything here is behind the admin key
// (worker/index.js checks it before calling studioApi).
//
// Watch & Sing's library lives in R2 (bucket watch-media, binding WATCH_MEDIA) at content/watch/library.json;
// the watch Worker serves it as /watch/data/library.json, so a save is live at once. Before each save the old
// library is kept in content/watch/history/, for undo. Uploads (videos, pictures, MP3s, PDFs) go to studio/YYYY/MM/
// and are served at /watch/media/<key>. With a GITHUB_TOKEN secret, the library is also copied into the repo
// (apps/watch/public/data/library.json) every night and on "Back up now".

import { validateLibrary, prepareForSave } from "../public/js/watch-content.js";
import { validateReading } from "../public/js/reading-content.js";
import * as phonics from "../../apps/letters/public/js/phonics.js";

const TYPES = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav", "application/pdf": "pdf" };
const REPO = "shalone86/angelio";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// What the Studio edits. Each: where it lives in R2, its history, how it's checked, and the app's own copy before
// the first save. The library/lessons are sent and saved whole (they're small: 160 KB and 60 KB).
const DOCS = {
  watch: { live: "content/watch/library.json", history: "content/watch/history/", backup: "apps/watch/public/data/library.json",
    check: (d) => validateLibrary(d), prepare: prepareForSave,
    builtIn: async (env) => { const r = env.WATCH ? await env.WATCH.fetch("https://watch/data/library.json") : null; if (!r?.ok) throw new Error("Couldn't read the library."); return r.json(); } },
  // Letter Lane and Read Aloud's phonics lessons (phonics.js PATTERNS); both apps load them (/api/content/reading).
  reading: { live: "content/reading/lessons.json", history: "content/reading/history/", backup: "backup/reading-lessons.json",
    check: (d) => validateReading(d, phonics), prepare: (d) => ({ patterns: d.patterns, saved: new Date().toISOString().slice(0, 10) }),
    builtIn: async () => ({ patterns: structuredClone(phonics.PATTERNS) }) },
};
export const LIVE = DOCS.watch.live;
export const READING_LIVE = DOCS.reading.live;

/** A document and its version (the R2 etag), or the app's own copy if the Studio hasn't saved it yet. */
async function current(env, doc) {
  const obj = await env.WATCH_MEDIA.get(doc.live);
  if (obj) return { library: await obj.json(), version: obj.etag, stored: true };
  return { library: await doc.builtIn(env), version: "app", stored: false };
}

export async function studioApi(request, url, env) {
  if (!env.WATCH_MEDIA) return json({ error: "The Studio's storage isn't connected (WATCH_MEDIA)." }, 503);
  const path = url.pathname.replace(/^\/api\/admin\/studio/, "");
  const q = (k) => url.searchParams.get(k);
  const m = /^\/(watch|reading)(\/history|\/version)?$/.exec(path);
  if (m) {
    const doc = DOCS[m[1]], route = `${request.method} ${m[2] ?? ""}`;
    if (route === "GET ") return json(await current(env, doc));
    if (route === "POST ") {
      let lib;
      try { lib = JSON.parse(await request.text()); } catch { return json({ error: "That wasn't readable." }, 400); }
      const { errors, warnings } = doc.check(lib);
      if (errors.length) return json({ error: "Some things need fixing first.", errors }, 400);
      const cur = await current(env, doc);
      if (q("base") && q("base") !== cur.version) return json({ error: "This was changed somewhere else (another tab?). Reload to get the newest one.", version: cur.version }, 409);
      const note = String(q("note") ?? "").replace(/[^\w -]/g, "").trim().slice(0, 60).replace(/\s+/g, "-");
      await env.WATCH_MEDIA.put(`${doc.history}${new Date().toISOString()}${note ? `--${note}` : ""}.json`, JSON.stringify(cur.library), { httpMetadata: { contentType: "application/json" } });
      const saved = doc.prepare(lib);
      const obj = await env.WATCH_MEDIA.put(doc.live, JSON.stringify(saved), { httpMetadata: { contentType: "application/json" } });
      return json({ ok: true, version: obj.etag, warnings, people: saved.people?.length });
    }
    if (route === "GET /history") {
      const list = [];
      let cursor;
      do {
        const r = await env.WATCH_MEDIA.list({ prefix: doc.history, cursor, limit: 1000 });
        list.push(...r.objects.map((o) => ({ key: o.key.slice(doc.history.length), size: o.size })));
        cursor = r.truncated ? r.cursor : null;
      } while (cursor && list.length < 5000);
      list.sort((a, b) => (a.key < b.key ? 1 : -1));
      return json({ versions: list.slice(0, 300).map(({ key, size }) => { const [at, note] = key.replace(/\.json$/, "").split("--"); return { key, at, note: note?.replace(/-/g, " ") ?? "", size }; }) });
    }
    if (route === "GET /version") {
      const key = q("key") ?? "";
      if (!/^[\w:.\-]+\.json$/.test(key)) return json({ error: "bad version" }, 400);
      const obj = await env.WATCH_MEDIA.get(doc.history + key);
      return obj ? new Response(obj.body, { headers: { "content-type": "application/json" } }) : json({ error: "no such version" }, 404);
    }
    return json({ error: "not found" }, 404);
  }
  const route = `${request.method} ${path}`;

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
const SOUND_BATCH = 10; // sounds per run: keeps each run under Cloudflare's limit on requests

/**
 * Copy into the repo (each file only if it changed), with the GITHUB_TOKEN secret:
 *   apps/watch/public/data/library.json  ← Watch & Sing's library (R2)
 *   backup/leadsheets.json               ← every lead sheet (KV leadsheet:*)
 *   backup/sounds/<m|f>/<sound>.wav      ← Dad's and Mom's recorded sounds (KV clip:*), SOUND_BATCH new ones a run;
 *                                          KV backup:sounds remembers which version of each is in GitHub
 * Returns { ok, commits, soundsLeft, notes } — "Back up now" calls again while soundsLeft > 0.
 */
export async function backupToGitHub(env) {
  if (!env.GITHUB_TOKEN) return { ok: false, error: "Backups to GitHub need a GITHUB_TOKEN secret on the angelio Worker (see the Studio's help)." };
  const headers = { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "angelio-studio", "x-github-api-version": "2022-11-28" };
  const url = (p) => `https://api.github.com/repos/${REPO}/contents/${p.split("/").map(encodeURIComponent).join("/")}`;
  const shaOf = async (p) => { const r = await fetch(`${url(p)}?ref=main`, { headers }); if (r.status === 404) return null; if (!r.ok) throw new Error(`GitHub said ${r.status} reading ${p}`); return (await r.json()).sha; };
  /** Write one file; `sha` is GitHub's current one (undefined = look it up). Returns the new sha, or the old one if nothing changed. */
  const putFile = async (p, bytes, message, sha) => {
    if (sha === undefined) sha = await shaOf(p);
    if (sha && sha === (await gitBlobSha(bytes))) return { sha, same: true };
    const r = await fetch(url(p), { method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ message, content: b64(bytes), branch: "main", ...(sha ? { sha } : {}) }) });
    if (r.status === 409 || r.status === 422) return putFile(p, bytes, message, await shaOf(p)); // our idea of its sha was old
    if (!r.ok) throw new Error(`GitHub said ${r.status} saving ${p}`);
    return { sha: (await r.json()).content?.sha, same: false };
  };
  const out = { ok: true, commits: 0, soundsLeft: 0, notes: [] };
  try {
    // 1. Watch & Sing's library and the reading lessons
    for (const [name, doc] of Object.entries(DOCS)) {
      const obj = await env.WATCH_MEDIA?.get(doc.live);
      if (!obj) continue;
      const r = await putFile(doc.backup, new TextEncoder().encode(JSON.stringify(await obj.json(), null, 1) + "\n"), `Studio backup: ${name === "watch" ? "Watch & Sing library" : "reading lessons"}`);
      if (!r.same) out.commits++;
    }
    if (!env.CODES) return out;
    // 2. lead sheets, all in one file
    const sheets = {};
    let cursor;
    do { const l = await env.CODES.list({ prefix: "leadsheet:", cursor }); for (const k of l.keys) sheets[k.name.slice(10)] = await env.CODES.get(k.name, "json"); cursor = l.list_complete ? null : l.cursor; } while (cursor);
    if (Object.keys(sheets).length) {
      const r = await putFile("backup/leadsheets.json", new TextEncoder().encode(JSON.stringify(sheets, null, 1) + "\n"), "Studio backup: lead sheets");
      if (!r.same) out.commits++;
    }
    // 3. recorded sounds, a few new or re-recorded ones each run
    const index = { f: {}, m: {}, ...((await env.CODES.get("clips:index", "json")) ?? {}) };
    const done = (await env.CODES.get("backup:sounds", "json")) ?? {};
    const todo = [];
    for (const set of ["m", "f"]) for (const [id, v] of Object.entries(index[set] ?? {})) if (done[`${set}:${id}`]?.v !== v) todo.push({ set, id, v });
    for (const t of todo.slice(0, SOUND_BATCH)) {
      const wav = await env.CODES.get(`clip:${t.set}:${t.id}`, "arrayBuffer");
      if (!wav) continue;
      const k = `${t.set}:${t.id}`;
      const r = await putFile(`backup/sounds/${t.set}/${t.id}.wav`, new Uint8Array(wav), `Studio backup: ${t.set === "m" ? "Dad" : "Mom"}'s "${t.id}"`, done[k]?.sha ?? null);
      done[k] = { v: t.v, sha: r.sha };
      if (!r.same) out.commits++;
    }
    await env.CODES.put("backup:sounds", JSON.stringify(done));
    out.soundsLeft = Math.max(0, todo.length - SOUND_BATCH);
  } catch (e) { return { ...out, ok: false, error: e.message }; }
  return out;
}
