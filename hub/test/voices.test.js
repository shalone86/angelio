import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

function fakeKV() {
  const m = new Map();
  return {
    m,
    async get(k, type) { if (!m.has(k)) return null; const v = m.get(k); return type === "json" ? JSON.parse(v) : type === "arrayBuffer" ? v : v; },
    async put(k, v) { m.set(k, typeof v === "string" ? v : v); },
    async delete(k) { m.delete(k); },
    async list() { return { keys: [], list_complete: true }; },
  };
}
const setup = () => {
  const kv = fakeKV();
  kv.m.set("code:K7QM-4XPA-2NWD", JSON.stringify({ name: "Us", limit: 10, created: 1 }));
  return { ADMIN_KEY: "secret", CODES: kv, ASSETS: { fetch: async () => new Response("hub") } };
};
const req = (env, path, { method = "GET", body, headers = {} } = {}) => worker.fetch(new Request(`https://angelio.org${path}`, { method, body, headers }), env);
const admin = (env, path, body) => req(env, path, body === undefined ? { headers: { "x-admin-key": "secret" } } : { method: "POST", body: JSON.stringify(body), headers: { "x-admin-key": "secret" } });
const wav = () => new Uint8Array(2000).buffer;

test("family voices: Mom and Dad are always there; the owner adds people, each with their own recording link", async () => {
  const env = setup();
  let r = await (await admin(env, "/api/admin/voices")).json();
  assert.deepEqual(r.voices.map((v) => v.name), ["Mom", "Dad"]);
  r = await (await admin(env, "/api/admin/voices", { name: "Grandma Rose", emoji: "👵" })).json();
  const gr = r.voices.find((v) => v.name === "Grandma Rose");
  assert.match(gr.id, /^v-[a-z0-9]{6}$/);
  assert.ok(gr.token.length >= 16);
  assert.equal((await admin(env, "/api/admin/voices", { name: "  " })).status, 400);

  // she records with her link (no admin key); only whole lines, not letter sounds
  const me = await (await req(env, `/api/voice?t=${gr.token}`)).json();
  assert.equal(me.voice.name, "Grandma Rose");
  assert.equal((await req(env, `/api/voice/clip?t=${gr.token}&id=line-abc`, { method: "POST", body: wav() })).status, 200);
  assert.equal((await req(env, `/api/voice/clip?t=${gr.token}&id=tuh`, { method: "POST", body: wav() })).status, 400);
  assert.equal((await req(env, `/api/voice/clip?t=nope-nope-nope-nope&id=line-abc`, { method: "POST", body: wav() })).status, 403);
  assert.deepEqual(Object.keys((await (await req(env, `/api/voice?t=${gr.token}`)).json()).recorded), ["line-abc"]);

  // every game sees her and plays her line
  const pub = await (await req(env, "/api/clips")).json();
  assert.deepEqual(pub.voices.find((v) => v.id === gr.id), { id: gr.id, name: "Grandma Rose", emoji: "👵", lines: 1 });
  assert.ok(pub.clips[gr.id]["line-abc"]);
  assert.equal((await req(env, `/api/clip?set=${gr.id}&id=line-abc`)).status, 200);

  // a new link stops the old one
  r = await (await admin(env, "/api/admin/voices/update", { id: gr.id, newLink: true })).json();
  assert.equal((await req(env, `/api/voice?t=${gr.token}`)).status, 403);
  assert.equal((await req(env, `/api/voice?t=${r.voices.find((v) => v.id === gr.id).token}`)).status, 200);
});

test("a family-only voice is listed and played only with a family code", async () => {
  const env = setup();
  const r = await (await admin(env, "/api/admin/voices", { name: "Lucy", emoji: "👧", private: true })).json();
  const lucy = r.voices.find((v) => v.name === "Lucy");
  await req(env, `/api/voice/clip?t=${lucy.token}&id=line-abc`, { method: "POST", body: wav() });
  const open = await (await req(env, "/api/clips")).json();
  assert.ok(!open.voices.some((v) => v.id === lucy.id) && !open.clips[lucy.id]);
  assert.equal((await req(env, `/api/clip?set=${lucy.id}&id=line-abc`)).status, 404);
  const fam = await (await req(env, "/api/clips", { headers: { "x-angelio-code": "k7qm 4xpa 2nwd" } })).json();
  assert.ok(fam.voices.some((v) => v.id === lucy.id));
  const clip = await req(env, `/api/clip?set=${lucy.id}&id=line-abc&code=K7QM-4XPA-2NWD`);
  assert.equal(clip.status, 200);
  assert.match(clip.headers.get("cache-control"), /private/);
});

test("deleting a voice removes their recordings; Mom and Dad can't be deleted", async () => {
  const env = setup();
  const r = await (await admin(env, "/api/admin/voices", { name: "Uncle Joe" })).json();
  const joe = r.voices.find((v) => v.name === "Uncle Joe");
  await req(env, `/api/voice/clip?t=${joe.token}&id=line-abc`, { method: "POST", body: wav() });
  assert.equal((await admin(env, "/api/admin/voices/delete", { id: "f" })).status, 400);
  await admin(env, "/api/admin/voices/delete", { id: joe.id });
  assert.equal(env.CODES.m.has(`clip:${joe.id}:line-abc`), false);
  assert.ok(!(await (await req(env, "/api/clips")).json()).voices.some((v) => v.id === joe.id));
  assert.equal((await req(env, "/api/clip?set=v-zzzzzz&id=line-abc")).status, 404);
  assert.equal((await req(env, "/api/clip?set=../x&id=line-abc")).status, 404);
});

import { zipFiles, crc32 } from "../public/js/zip.js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
test("the keepsake download is a real .zip", async () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const blob = zipFiles([{ name: "001 Great job!.wav", data: new Uint8Array([1, 2, 3]) }, { name: "about.txt", data: new TextEncoder().encode("hi\n") }]);
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "zip-")), "v.zip");
  fs.writeFileSync(f, new Uint8Array(await blob.arrayBuffer()));
  try { const out = execFileSync("python3", ["-c", "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print('|'.join(z.namelist()))", f]).toString().trim(); assert.equal(out, "001 Great job!.wav|about.txt"); }
  catch (e) { if (e.code !== "ENOENT") throw e; } // no Python here: the CRC check above still ran
});
