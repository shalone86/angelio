// Angelio hub (angelio.org): serves the hub page (public/) and puts every learning app under
// its own path, e.g. angelio.org/regroup/ → the "regroup" Worker, through a service binding.
//
// The apps don't change: they use relative links (css/app.css, api/tts, sw.js), so they work
// under a path as they are. The hub strips the prefix before passing the request on.
//
// To add an app: add it to APPS here, add a service binding in wrangler.jsonc, and add a card
// in public/js/apps.js.

export const APPS = {
  regroup: "REGROUP", // Regroup! (regroup Worker)
  snap: "SNAP", // PreK Math, was Snap & Split (snap-split Worker)
  doubles: "DOUBLES", // Doubles (doubles Worker)
  grammar: "GRAMMAR", // Grammar (grammar Worker)
  fractions: "FRACTIONS", // Fraction Feast (fractions Worker)
  letters: "LETTERS", // Letter Lane (letters Worker)
  read: "READALOUD", // Read Aloud (readaloud Worker)
  spell: "SPELLING", // Spelling (spelling Worker)
  watch: "WATCH", // Watch & Sing (watch Worker): the kids video lessons, quizzes and songs
  // Articulate also keeps its own address (articulate.shalonely.com): both work, no redirect.
  articulate: "ARTICULATE", // Articulate (articulation Worker)
  candles: "CANDLES", // Candle Rack (candles Worker): the game of getting the church ready before Mass
  usher: "USHER", // Mass Usher (usher Worker): seating families before Mass (a demo)
  porter: "PORTER", // Monastery Porter (porter Worker): keeping the monastery door (a demo)
  match: "MATCH", // Saints Match (match Worker): arcade memory cards with the saints (a demo)
  garden: "GARDEN", // Garden Givers (garden Worker): protect crops & deliver to the food bank (a demo)
};

import { normalizeCode, newCode, codeStatus, day, month } from "./codes.js";
import { stripeApi } from "./stripe.js";
import { studioApi, backupToGitHub, READING_LIVE, ART_LIVE, CANDLES_LAYOUT, voxKey } from "./studio.js";
import { artSlug } from "../public/js/art-content.js";
import { voiceSet, publicClips, isPrivate, putClip, deleteClip, voiceLinkApi, voicesAdminApi } from "./voices.js";

export default {
  // Every night: copy the Studio's library into GitHub (does nothing without a GITHUB_TOKEN secret).
  async scheduled(event, env, ctx) { ctx.waitUntil(backupToGitHub(env).then((r) => console.log("studio backup", JSON.stringify(r)))); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/stripe/")) return stripeApi(request, url, env).catch((e) => json({ error: String(e?.message ?? e) }, 500));
    if (url.pathname.startsWith("/api/")) return api(request, url, env).catch((e) => json({ error: String(e?.message ?? e) }, 500));
    const [, first = "", ...rest] = url.pathname.split("/");
    const binding = APPS[first.toLowerCase()];

    if (binding) {
      // /regroup → /regroup/ so the app's relative links resolve inside its folder.
      if (url.pathname === `/${first}`) return Response.redirect(`${url.origin}/${first}/${url.search}`, 301);
      const app = env[binding];
      if (!app) return new Response(`The ${first} app isn't connected to the hub yet.`, { status: 503 });
      const inner = new URL(request.url);
      inner.pathname = `/${rest.join("/")}`;
      const res = await app.fetch(new Request(inner, request));
      // Keep redirects inside the app's folder.
      const loc = res.headers.get("location");
      if (loc && loc.startsWith("/")) {
        const out = new Response(res.body, res);
        out.headers.set("location", `/${first}${loc}`);
        return out;
      }
      return res;
    }

    // Speech-check files too big for the site's own files (over 25 MB): the Whisper models and the speech engine
    // (ONNX Runtime), kept in R2 under models/ and downloaded once by each device. Their paths carry their version,
    // so they never change: cached for a year. Usable from the apps' other addresses.
    if (url.pathname.startsWith("/models/")) {
      const key = url.pathname.slice(1);
      if (!/^models\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(key) || key.includes("..")) return new Response("not found", { status: 404 });
      const obj = env.WATCH_MEDIA ? await env.WATCH_MEDIA.get(key) : null;
      if (!obj) return new Response("not found", { status: 404 });
      const type = { wasm: "application/wasm", mjs: "text/javascript", js: "text/javascript", json: "application/json" }[key.split(".").pop()] ?? "application/octet-stream";
      // (the engine starts a helper from these scripts: on the cross-origin isolated speech page it needs these two)
      return new Response(obj.body, { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*",
        "cross-origin-resource-policy": "cross-origin", "cross-origin-embedder-policy": "require-corp", etag: obj.httpEtag } });
    }

    // The shared fonts: usable from the apps' other addresses (fonts need CORS), kept for a month.
    if (url.pathname.startsWith("/fonts/")) {
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      out.headers.set("access-control-allow-origin", "*");
      if (res.ok) out.headers.set("cache-control", "public, max-age=2592000");
      return out;
    }

    // The speech test page: cross-origin isolated, so the speech engine may use several processor cores (faster);
    // everything it loads is from angelio.org itself.
    if (url.pathname === "/speech" || url.pathname.startsWith("/speech/")) {
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      out.headers.set("cross-origin-opener-policy", "same-origin");
      out.headers.set("cross-origin-embedder-policy", "require-corp");
      return out;
    }

    return env.ASSETS.fetch(request);
  },
};

// ───────── family codes (worker/codes.js) ─────────
//   GET  /api/code?c=CODE            → { valid, name, limit, left }   (the parent's code box)
//   Admin, header x-admin-key = secret ADMIN_KEY (the page at /admin/):
//   GET  /api/admin/codes            → { codes: [{ code, name, limit, used, revoked, created }], today }
//   POST /api/admin/codes            { name, limit } → { code }
//   POST /api/admin/codes/update     { code, limit?, revoked? }
//   GET  /api/clips                  → { clips: { f: { sound: version }, m: {…}, "v-…": {…} }, voices: [...] }
//                                       (Mom's and Dad's sounds and lines, and the family voices: worker/voices.js)
//   GET  /api/clip?set=f&id=tuh&v=…  → audio/wav
//   POST /api/admin/clip?set=f&id=tuh  (body: audio/wav) · POST /api/admin/clip/delete?set=f&id=tuh

/** A song id as Watch & Sing writes it ("the-eucharist-song"), or null. */
const sheetId = (s) => (/^[a-z0-9][a-z0-9-]{0,79}$/.test(String(s ?? "")) ? s : null);

/** A sound's name as the apps say it ("tuh", "shh", "fruh"): lowercase letters only. */
/** Whose recordings: "f" (Mom), "m" (Dad), or a family voice "v-…" (voices.js); none given means Mom's. */
const clipSet = (x) => (x == null || x === "" ? "f" : voiceSet(x));
// A sound ("tuh") or a whole line ("line-" + a hash of its words, see the apps' tts.js lineId).
const clipId = (x) => (/^([a-z][a-z' -]{0,19}|line-[0-9a-z]{1,8})$/.test(String(x ?? "")) ? String(x) : null);

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function sameSecret(a, b) {
  const enc = new TextEncoder(), h = async (x) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(x ?? ""))));
  const [x, y] = await Promise.all([h(a), h(b)]);
  return !!b && x.every((v, i) => v === y[i]);
}

async function api(request, url, env) {
  if (!env.CODES) return json({ error: "codes aren't set up" }, 503);
  const route = `${request.method} ${url.pathname}`;
  if (route === "GET /api/code") {
    const st = await codeStatus(env, url.searchParams.get("c"));
    return json(st.valid ? { valid: true, name: st.name, limit: st.limit, left: st.left } : { valid: false, revoked: !!st.revoked });
  }
  // Recorded sounds ("tuh", "shh"): a grown-up records them at /admin/, every reading app plays them
  // instead of the robot voice (the apps live on angelio.org, so they ask the hub).
  // Family voices (voices.js): who can read to the kids, and their recorded lines. A family-only voice is listed and
  // played only with a family code (header x-angelio-code, or ?code= on a recording's address).
  const familyCode = async () => !!(await codeStatus(env, request.headers.get("x-angelio-code") || url.searchParams.get("code"))).valid;
  if (route === "GET /api/clips") {
    const hasCode = (request.headers.get("x-angelio-code") || url.searchParams.get("code")) ? await familyCode() : false;
    return new Response(JSON.stringify(await publicClips(env.CODES, hasCode)), { headers: { "content-type": "application/json", "cache-control": hasCode ? "private, no-store" : "public, max-age=60" } });
  }
  if (route === "GET /api/clip") {
    const id = clipId(url.searchParams.get("id")), set = clipSet(url.searchParams.get("set"));
    const secret = set && (await isPrivate(env.CODES, set));
    if (secret && !(await familyCode()) && !(await sameSecret(request.headers.get("x-admin-key"), env.ADMIN_KEY))) return json({ error: "no recording" }, 404);
    const wav = id && set && (await env.CODES.get(`clip:${set}:${id}`, "arrayBuffer"));
    if (!wav) return json({ error: "no recording" }, 404);
    return new Response(wav, { headers: { "content-type": "audio/wav", "cache-control": secret ? "private, max-age=31536000, immutable" : "public, max-age=31536000, immutable" } });
  }
  const link = await voiceLinkApi(request, url, env); // a family member's own recording link
  if (link) return link;
  // The reading lessons saved in the Studio (Letter Lane and Read Aloud load them; 404 = use their own copy).
  if (route === "GET /api/content/reading") {
    const obj = env.WATCH_MEDIA ? await env.WATCH_MEDIA.get(READING_LIVE) : null;
    if (!obj) return json({ error: "no saved lessons" }, 404);
    return new Response(obj.body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=60", etag: obj.httpEtag } });
  }
  // Her drawings (the Studio's Drawings page): everyone may read them (Claude and the games load them here).
  if (route === "GET /api/art") {
    const obj = env.WATCH_MEDIA ? await env.WATCH_MEDIA.get(ART_LIVE) : null;
    if (!obj) return json({ drawings: {}, favorites: [], done: {} });
    return new Response(obj.body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=20", "access-control-allow-origin": "*", etag: obj.httpEtag } });
  }
  // Candle Rack's placements (moved on the Studio's Candle Rack page); {} means the game's own
  if (route === "GET /api/candles/layout") {
    const obj = env.WATCH_MEDIA ? await env.WATCH_MEDIA.get(CANDLES_LAYOUT) : null;
    return new Response(obj ? obj.body : "{}", { headers: { "content-type": "application/json", "cache-control": "public, max-age=20", "access-control-allow-origin": "*" } });
  }
  if (route === "GET /api/art/vox") {
    const slug = artSlug(url.searchParams.get("slug"));
    const obj = slug && env.WATCH_MEDIA ? await env.WATCH_MEDIA.get(voxKey(slug)) : null;
    if (!obj) return json({ error: "no such model" }, 404);
    return new Response(obj.body, { headers: { "content-type": "application/octet-stream", "cache-control": "public, max-age=20", "access-control-allow-origin": "*", etag: obj.httpEtag } });
  }
  // Lead sheets (made at /admin/leadsheet.html): one per song, by the song's Watch & Sing id.
  if (route === "GET /api/leadsheets") {
    const ids = [];
    let cursor;
    do { const r = await env.CODES.list({ prefix: "leadsheet:", cursor }); ids.push(...r.keys.map((k) => k.name.slice(10))); cursor = r.list_complete ? null : r.cursor; } while (cursor);
    return new Response(JSON.stringify({ ids }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=60" } });
  }
  if (route === "GET /api/leadsheet") {
    const id = sheetId(url.searchParams.get("id"));
    const sheet = id && (await env.CODES.get(`leadsheet:${id}`));
    if (!sheet) return json({ error: "no lead sheet" }, 404);
    return new Response(sheet, { headers: { "content-type": "application/json", "cache-control": "public, max-age=60" } });
  }
  if (!url.pathname.startsWith("/api/admin/")) return json({ error: "not found" }, 404);
  if (!(await sameSecret(request.headers.get("x-admin-key"), env.ADMIN_KEY))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "wrong admin key" }, 401);
  }
  if (url.pathname.startsWith("/api/admin/studio/")) return studioApi(request, url, env);
  const voices = await voicesAdminApi(request, url, env);
  if (voices) return voices;
  const kv = env.CODES;
  if (route === "GET /api/admin/codes") {
    const codes = [];
    let cursor;
    do {
      const page = await kv.list({ prefix: "code:", cursor });
      for (const k of page.keys) {
        const code = k.name.slice(5), rec = (await kv.get(k.name, "json")) ?? {};
        codes.push({ code, ...rec, used: Number((await kv.get(`use:${code}:${month()}`)) ?? 0) });
      }
      cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    codes.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    const today = { speech: Number((await kv.get(`cap:speech:${day()}`)) ?? 0), tts: Number((await kv.get(`cap:tts:${day()}`)) ?? 0) };
    return json({ codes, today, month: month() });
  }
  if (route === "POST /api/admin/clip") {
    const id = clipId(url.searchParams.get("id")), set = clipSet(url.searchParams.get("set"));
    if (!id || !set) return json({ error: "bad sound name" }, 400);
    const r = await putClip(kv, set, id, await request.arrayBuffer());
    return json(r.error ? { error: r.error } : r, r.error ? 400 : 200);
  }
  if (route === "POST /api/admin/leadsheet") {
    const id = sheetId(url.searchParams.get("id"));
    if (!id) return json({ error: "bad song id" }, 400);
    const text = await request.text();
    if (text.length > 300_000) return json({ error: "lead sheet is too big" }, 400);
    let sheet;
    try { sheet = JSON.parse(text); } catch { return json({ error: "not JSON" }, 400); }
    if (!sheet || typeof sheet !== "object" || typeof sheet.text !== "string") return json({ error: "a lead sheet needs its words (text)" }, 400);
    sheet.id = id; sheet.saved = new Date().toISOString();
    await kv.put(`leadsheet:${id}`, JSON.stringify(sheet));
    return json({ ok: true, id, saved: sheet.saved });
  }
  if (route === "POST /api/admin/leadsheet/delete") {
    const id = sheetId(url.searchParams.get("id"));
    if (id) await kv.delete(`leadsheet:${id}`);
    return json({ ok: true });
  }
  if (route === "POST /api/admin/clip/delete") {
    const id = clipId(url.searchParams.get("id")), set = clipSet(url.searchParams.get("set"));
    if (id && set) await deleteClip(kv, set, id);
    return json({ ok: true });
  }
  const body = await request.json().catch(() => ({}));
  if (route === "POST /api/admin/codes") {
    const name = String(body.name ?? "").trim().slice(0, 60) || "Family";
    const limit = Math.max(1, Math.min(10000, Math.round(Number(body.limit) || 300)));
    let code;
    do code = newCode(); while (await kv.get(`code:${code}`));
    await kv.put(`code:${code}`, JSON.stringify({ name, limit, created: Date.now() }));
    return json({ code, name, limit });
  }
  if (route === "POST /api/admin/codes/update") {
    const code = normalizeCode(body.code);
    const rec = code && (await kv.get(`code:${code}`, "json"));
    if (!rec) return json({ error: "no such code" }, 404);
    if (body.limit != null) rec.limit = Math.max(1, Math.min(10000, Math.round(Number(body.limit))));
    if (body.revoked != null) rec.revoked = !!body.revoked;
    await kv.put(`code:${code}`, JSON.stringify(rec));
    return json({ code, ...rec });
  }
  return json({ error: "not found" }, 404);
}
