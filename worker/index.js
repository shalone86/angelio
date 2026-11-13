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
  snap: "SNAP", // Snap & Split (snap-split Worker)
  doubles: "DOUBLES", // Doubles (doubles Worker)
  grammar: "GRAMMAR", // Grammar (grammar Worker)
  fractions: "FRACTIONS", // Fraction Feast (fractions Worker)
  letters: "LETTERS", // Letter Lane (letters Worker)
  read: "READALOUD", // Read Aloud (readaloud Worker)
  // Articulate also keeps its own address (articulate.shalonely.com): both work, no redirect.
  articulate: "ARTICULATE", // Articulate (articulation Worker)
};

import { normalizeCode, newCode, codeStatus, day, month } from "./codes.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

    return env.ASSETS.fetch(request);
  },
};

// ───────── family codes (worker/codes.js) ─────────
//   GET  /api/code?c=CODE            → { valid, name, limit, left }   (the parent's code box)
//   Admin, header x-admin-key = secret ADMIN_KEY (the page at /admin/):
//   GET  /api/admin/codes            → { codes: [{ code, name, limit, used, revoked, created }], today }
//   POST /api/admin/codes            { name, limit } → { code }
//   POST /api/admin/codes/update     { code, limit?, revoked? }
//   GET  /api/clips                  → { clips: { sound: version } }   (recorded sounds, for every app)
//   GET  /api/clip?id=tuh&v=…        → audio/wav
//   POST /api/admin/clip?id=tuh      (body: audio/wav) · POST /api/admin/clip/delete?id=tuh

/** A sound's name as the apps say it ("tuh", "shh", "fruh"): lowercase letters only. */
const clipId = (x) => (/^[a-z][a-z' -]{0,19}$/.test(String(x ?? "")) ? String(x) : null);

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
  if (route === "GET /api/clips") {
    const clips = (await env.CODES.get("clips:index", "json")) ?? {};
    return new Response(JSON.stringify({ clips }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=60" } });
  }
  if (route === "GET /api/clip") {
    const id = clipId(url.searchParams.get("id"));
    const wav = id && (await env.CODES.get(`clip:${id}`, "arrayBuffer"));
    if (!wav) return json({ error: "no recording" }, 404);
    return new Response(wav, { headers: { "content-type": "audio/wav", "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (!url.pathname.startsWith("/api/admin/")) return json({ error: "not found" }, 404);
  if (!(await sameSecret(request.headers.get("x-admin-key"), env.ADMIN_KEY))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "wrong admin key" }, 401);
  }
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
    const id = clipId(url.searchParams.get("id"));
    if (!id) return json({ error: "bad sound name" }, 400);
    const wav = await request.arrayBuffer();
    if (wav.byteLength < 100 || wav.byteLength > 400_000) return json({ error: "recording is empty or too long" }, 400);
    await kv.put(`clip:${id}`, wav);
    const index = (await kv.get("clips:index", "json")) ?? {};
    index[id] = Date.now();
    await kv.put("clips:index", JSON.stringify(index));
    return json({ id, v: index[id] });
  }
  if (route === "POST /api/admin/clip/delete") {
    const id = clipId(url.searchParams.get("id"));
    const index = (await kv.get("clips:index", "json")) ?? {};
    if (id) { delete index[id]; await kv.delete(`clip:${id}`); await kv.put("clips:index", JSON.stringify(index)); }
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
