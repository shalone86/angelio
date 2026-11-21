// Family voices: real people (Mom, Dad, grandparents, friends) record the lines every game says, and kids pick whose
// voice reads to them, like choosing a robot voice. Mom ("f") and Dad ("m") are always there (they also record the
// letter sounds at /admin/sounds); everyone else is a voice set "v-" + six letters, added by the owner at /admin/.
//
// Each person gets a private recording link (angelio.org/voice/?t=…) and records on their own phone; no admin key.
// A voice can be FAMILY ONLY (a child's voice, say): it's listed and played only on devices with a family code.
//
// KV (CODES): "voices:list" = [{ id, name, emoji, private, token, created }] (Mom and Dad fill in when missing);
// the recordings themselves are clip:<set>:<id> with their versions in "clips:index", as before.
//   GET  /api/clips                         → { clips: { set: { id: version } }, voices: [{ id, name, emoji, lines }] }
//   GET  /api/voice?t=TOKEN                 → { voice: { id, name, emoji }, recorded: { id: version } }
//   POST /api/voice/clip?t=TOKEN&id=line-…  (body: audio/wav) · POST /api/voice/clip/delete?t=TOKEN&id=line-…
//   Admin: GET /api/admin/voices · POST /api/admin/voices { name, emoji, private } · …/update { id, name?, emoji?,
//   private?, newLink? } · …/delete { id }

export const BUILT_IN = [{ id: "f", name: "Mom", emoji: "👩" }, { id: "m", name: "Dad", emoji: "👨" }];
const SET_RE = /^(f|m|v-[a-z0-9]{6})$/;
/** A voice set's id, or null. */
export const voiceSet = (x) => (SET_RE.test(String(x ?? "")) ? String(x) : null);
export const MAX_LINES = 800; // recordings one person may keep (the games have about 540 lines)
const LINE_RE = /^line-[0-9a-z]{1,8}$/;

const rand = (n, abc = "abcdefghijkmnpqrstuvwxyz23456789") => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => abc[b % abc.length]).join("");
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

/** Everyone, Mom and Dad first (their saved names and links, if any, laid over the defaults). */
export async function listVoices(kv) {
  const saved = (await kv.get("voices:list", "json")) ?? [];
  const out = BUILT_IN.map((b) => ({ private: false, ...b, ...saved.find((v) => v.id === b.id) }));
  return out.concat(saved.filter((v) => !BUILT_IN.some((b) => b.id === v.id)));
}
const saveVoices = (kv, list) => kv.put("voices:list", JSON.stringify(list));
export const clipIndex = async (kv) => ({ f: {}, m: {}, ...((await kv.get("clips:index", "json")) ?? {}) });
const lineCount = (idx) => Object.keys(idx ?? {}).filter((k) => k.startsWith("line-")).length;

/** The voices a game may offer (family-only ones need a family code) and their recordings' index. */
export async function publicClips(kv, hasCode) {
  const [voices, index] = await Promise.all([listVoices(kv), clipIndex(kv)]);
  const shown = voices.filter((v) => !v.private || hasCode);
  const clips = {};
  for (const v of shown) clips[v.id] = index[v.id] ?? {};
  return { clips, voices: shown.map((v) => ({ id: v.id, name: v.name, emoji: v.emoji, lines: lineCount(index[v.id]) })) };
}
/** Is this voice family only? (Its recordings then need a family code to play.) */
export const isPrivate = async (kv, set) => !!(await listVoices(kv)).find((v) => v.id === set)?.private;

/** Save one recording into a voice set and bump its version (shared with the admin recorder). */
export async function putClip(kv, set, id, wav) {
  const most = id.startsWith("line-") ? 3_000_000 : 400_000; // a line can be about 30 seconds; a sound, a few
  if (wav.byteLength < 100 || wav.byteLength > most) return { error: "The recording is empty or too long." };
  const index = await clipIndex(kv);
  index[set] ??= {};
  if (!(id in index[set]) && Object.keys(index[set]).length >= MAX_LINES) return { error: "That's as many recordings as one voice can keep." };
  await kv.put(`clip:${set}:${id}`, wav);
  index[set][id] = Date.now();
  await kv.put("clips:index", JSON.stringify(index));
  return { id, set, v: index[set][id] };
}
export async function deleteClip(kv, set, id) {
  const index = await clipIndex(kv);
  if (index[set]) delete index[set][id];
  await kv.delete(`clip:${set}:${id}`);
  await kv.put("clips:index", JSON.stringify(index));
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** The recording link's routes (/api/voice…): the token is the only key. Returns null for other routes. */
export async function voiceLinkApi(request, url, env) {
  if (!url.pathname.startsWith("/api/voice")) return null;
  const kv = env.CODES, t = String(url.searchParams.get("t") ?? "");
  const voice = t.length >= 16 ? (await listVoices(kv)).find((v) => v.token && v.token === t) : null;
  if (!voice) return json({ error: "This recording link doesn't work any more. Ask for a new one." }, 403);
  const route = `${request.method} ${url.pathname}`, id = String(url.searchParams.get("id") ?? "");
  if (route === "GET /api/voice") {
    const index = await clipIndex(kv);
    return json({ voice: { id: voice.id, name: voice.name, emoji: voice.emoji, private: !!voice.private }, recorded: Object.fromEntries(Object.entries(index[voice.id] ?? {}).filter(([k]) => k.startsWith("line-"))) });
  }
  if (!LINE_RE.test(id)) return json({ error: "Which line is it?" }, 400);
  if (route === "POST /api/voice/clip") { const r = await putClip(kv, voice.id, id, await request.arrayBuffer()); return json(r, r.error ? 400 : 200); }
  if (route === "POST /api/voice/clip/delete") { await deleteClip(kv, voice.id, id); return json({ ok: true }); }
  return json({ error: "not found" }, 404);
}

/** The owner's routes (/api/admin/voices…), after the admin key was checked. Returns null for other routes. */
export async function voicesAdminApi(request, url, env) {
  if (!url.pathname.startsWith("/api/admin/voices")) return null;
  const kv = env.CODES, route = `${request.method} ${url.pathname}`;
  const list = await listVoices(kv), index = await clipIndex(kv);
  const view = () => json({ voices: list.map((v) => ({ ...v, lines: lineCount(index[v.id]) })) });
  if (route === "GET /api/admin/voices") return view();
  if (route === "GET /api/admin/voices/index") { const set = voiceSet(url.searchParams.get("set")); return json({ index: (set && index[set]) || {} }); }
  const body = await request.json().catch(() => ({}));
  if (route === "POST /api/admin/voices") {
    const name = clean(body.name, 40);
    if (!name) return json({ error: "What's their name?" }, 400);
    let id; do id = `v-${rand(6)}`; while (list.some((v) => v.id === id));
    list.push({ id, name, emoji: clean(body.emoji, 8) || "🙂", private: !!body.private, token: rand(24), created: Date.now() });
    await saveVoices(kv, list); return view();
  }
  const v = list.find((x) => x.id === body.id);
  if (!v) return json({ error: "No such voice." }, 404);
  if (route === "POST /api/admin/voices/update") {
    if (body.name !== undefined) v.name = clean(body.name, 40) || v.name;
    if (body.emoji !== undefined) v.emoji = clean(body.emoji, 8) || v.emoji;
    if (body.private !== undefined && !BUILT_IN.some((b) => b.id === v.id)) v.private = !!body.private;
    if (body.newLink) v.token = rand(24); // the old link stops working
    if (body.noLink) delete v.token;
    await saveVoices(kv, list); return view();
  }
  if (route === "POST /api/admin/voices/delete") {
    if (BUILT_IN.some((b) => b.id === v.id)) return json({ error: "Mom and Dad stay." }, 400);
    for (const id of Object.keys(index[v.id] ?? {})) await kv.delete(`clip:${v.id}:${id}`);
    delete index[v.id];
    await kv.put("clips:index", JSON.stringify(index));
    await saveVoices(kv, list.filter((x) => x !== v));
    list.splice(list.indexOf(v), 1);
    return view();
  }
  return json({ error: "not found" }, 404);
}
