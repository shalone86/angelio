import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../worker/index.js";

const LIB = fs.readFileSync(new URL("../../apps/watch/public/data/library.json", import.meta.url), "utf8");

/** Just enough of an R2 bucket for the Studio. */
function fakeR2() {
  const files = new Map(), uploads = new Map();
  let n = 0;
  const obj = (key) => { const f = files.get(key); return f && { key, etag: f.etag, httpEtag: `"${f.etag}"`, size: f.body.length, body: f.body, json: async () => JSON.parse(f.body), text: async () => f.body }; };
  return {
    files,
    async get(key) { return obj(key) ?? null; },
    async put(key, body) { const etag = `e${++n}`; files.set(key, { body: typeof body === "string" ? body : String(body), etag }); return { etag }; },
    async list({ prefix }) { return { objects: [...files.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: files.get(k).body.length })), truncated: false }; },
    async createMultipartUpload(key) { const id = `u${++n}`; uploads.set(id, { key, parts: new Map() }); return { uploadId: id }; },
    resumeMultipartUpload(key, id) {
      const u = uploads.get(id);
      return {
        async uploadPart(i, data) { u.parts.set(i, new Uint8Array(data)); return { partNumber: i, etag: `p${i}` }; },
        async complete(parts) { const all = parts.map((p) => u.parts.get(p.partNumber)); files.set(key, { body: Buffer.concat(all).toString("latin1"), etag: `e${++n}` }); },
        async abort() { uploads.delete(id); },
      };
    },
  };
}
const env = () => ({
  ADMIN_KEY: "secret", CODES: { get: async () => null, put: async () => {}, list: async () => ({ keys: [], list_complete: true }) },
  WATCH_MEDIA: fakeR2(), WATCH: { fetch: async (req) => (new URL(req.url ?? req).pathname === "/data/library.json" ? new Response(LIB) : new Response("", { status: 404 })) },
  ASSETS: { fetch: async () => new Response("hub") },
});
const call = (e, method, path, body, key = "secret") => worker.fetch(new Request(`https://angelio.org/api/admin/studio${path}`, { method, headers: { "x-admin-key": key }, body }), e);

test("the Studio needs the admin key", async () => {
  const r = await call(env(), "GET", "/watch", undefined, "wrong");
  assert.equal(r.status, 401);
});

test("load (the app's copy at first), save (live, with the old one kept), stale saves refused", async () => {
  const e = env();
  const first = await (await call(e, "GET", "/watch")).json();
  assert.equal(first.version, "app");
  assert.equal(first.library.lessons.length, JSON.parse(LIB).lessons.length);
  const lib = first.library;
  lib.lessons[0].title = "What is Lent? (new)";
  const s1 = await (await call(e, "POST", "/watch?base=app&note=Renamed a lesson", JSON.stringify(lib))).json();
  assert.ok(s1.ok, JSON.stringify(s1));
  assert.equal(JSON.parse(e.WATCH_MEDIA.files.get("content/watch/library.json").body).lessons[0].title, "What is Lent? (new)");
  const hist = await (await call(e, "GET", "/watch/history")).json();
  assert.equal(hist.versions.length, 1);
  assert.equal(hist.versions[0].note, "Renamed a lesson");
  const old = await (await call(e, "GET", `/watch/version?key=${encodeURIComponent(hist.versions[0].key)}`)).json();
  assert.notEqual(old.lessons[0].title, "What is Lent? (new)"); // the version before the save
  // another tab still has the first version
  const stale = await call(e, "POST", "/watch?base=app", JSON.stringify(lib));
  assert.equal(stale.status, 409);
  const again = await (await call(e, "POST", `/watch?base=${s1.version}`, JSON.stringify(lib))).json();
  assert.ok(again.ok);
});

test("a broken library is refused and nothing changes", async () => {
  const e = env();
  const lib = JSON.parse(LIB);
  lib.courses[0].items.push("nope");
  const r = await call(e, "POST", "/watch", JSON.stringify(lib));
  assert.equal(r.status, 400);
  assert.match((await r.json()).errors.join(" "), /doesn't exist/);
  assert.equal(e.WATCH_MEDIA.files.size, 0);
});

test("uploads in parts become one file under studio/", async () => {
  const e = env();
  const start = await (await call(e, "POST", "/upload/start", JSON.stringify({ name: "My Poster.PNG", type: "image/png" }))).json();
  assert.match(start.key, /^studio\/\d{4}\/\d{2}\/my-poster-[\w-]{6}\.png$/);
  const q = `key=${encodeURIComponent(start.key)}&uploadId=${start.uploadId}`;
  const p1 = await (await call(e, "PUT", `/upload/part?${q}&n=1`, "hello ")).json();
  const p2 = await (await call(e, "PUT", `/upload/part?${q}&n=2`, "world")).json();
  const done = await (await call(e, "POST", `/upload/done?${q}`, JSON.stringify({ parts: [p1, p2] }))).json();
  assert.equal(done.url, `media/${start.key}`);
  assert.equal(e.WATCH_MEDIA.files.get(start.key).body, "hello world");
  const bad = await call(e, "POST", "/upload/start", JSON.stringify({ name: "x.exe", type: "application/x-msdownload" }));
  assert.equal(bad.status, 400);
});

test("backup without a GitHub key says how to turn it on", async () => {
  const r = await (await call(env(), "POST", "/backup")).json();
  assert.equal(r.ok, false);
  assert.match(r.error, /GITHUB_TOKEN/);
});
