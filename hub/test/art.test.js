import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../worker/index.js";
import { checkDrawing, CHECKLISTS, artSlug } from "../public/js/art-content.js";
import { readVox, toScene } from "../public/js/vox.js";

function fakeR2() {
  const files = new Map(); let n = 0;
  return {
    files,
    async get(key) { const f = files.get(key); return f ? { etag: f.etag, httpEtag: `"${f.etag}"`, body: f.body, json: async () => JSON.parse(f.body), arrayBuffer: async () => (typeof f.body === "string" ? new TextEncoder().encode(f.body) : f.body).slice().buffer } : null; },
    async put(key, body) { const etag = `e${++n}`; files.set(key, { body: body instanceof Uint8Array || body instanceof ArrayBuffer ? new Uint8Array(body) : String(body), etag }); return { etag }; },
    async delete(key) { files.delete(key); },
  };
}
const env = () => ({ ADMIN_KEY: "secret", CODES: { get: async () => null, put: async () => {}, list: async () => ({ keys: [], list_complete: true }) }, WATCH_MEDIA: fakeR2(), ASSETS: { fetch: async () => new Response("hub") } });
const call = (e, path, body, key = "secret") => worker.fetch(new Request(`https://angelio.org/api/admin/studio${path}`, body === undefined ? { headers: { "x-admin-key": key } } : { method: "POST", headers: { "x-admin-key": key }, body: JSON.stringify(body) }), e);
const altar = { name: "church-roman-altar", width: 8, height: 8, fps: 4, palette: ["#FF77A8", "#222E53"], frames: [Array(8).fill("01010101"), Array(8).fill("10101010")] };

test("drawings: the Lesson Studio's format and rules", () => {
  assert.equal(checkDrawing(altar).slug, "church-roman-altar");
  assert.equal(artSlug("Mary's Statue!"), "marys-statue");
  assert.throws(() => checkDrawing({ ...altar, name: "" }), /name/);
  assert.throws(() => checkDrawing({ ...altar, width: 70 }), /Size/);
  assert.throws(() => checkDrawing({ ...altar, frames: [Array(8).fill("0123")] }), /match/);
  assert.throws(() => checkDrawing({ ...altar, frames: [Array(8).fill("02020202")] }), /match/); // a color not in the palette
  assert.throws(() => checkDrawing({ ...altar, palette: ["pink"] }), /color/);
  const layered = checkDrawing({ ...altar, layers: [{ name: "Back", frames: altar.frames }, { name: "Front", hidden: true, frames: altar.frames }] }).drawing;
  assert.equal(layered.layers[1].hidden, true);
});

test("every checklist item has a good name, a size the editor allows, and no repeats", () => {
  const all = CHECKLISTS.flatMap((l) => l.items);
  assert.equal(new Set(all.map((i) => i.slug)).size, all.length);
  for (const i of all) {
    assert.equal(artSlug(i.slug), i.slug);
    assert.ok(i.size.every((n) => Number.isInteger(n) && n >= 8 && n <= 64), i.slug);
  }
  assert.ok(all.some((i) => i.slug === "man-beard-walk") && all.some((i) => i.slug === "man-beard-kneel"));
  for (const s of ["monk-idle", "monk-walk", "nun-idle", "nun-walk", "bishop-idle", "bishop-walk"]) assert.ok(all.some((i) => i.slug === s), s);
  const matchItems = CHECKLISTS.filter((c) => c.game === "Saints Match").flatMap((c) => c.items);
  assert.equal(matchItems.length, 37);
  assert.ok(matchItems.some((i) => i.slug === "saint-halo"));
  for (const i of matchItems) if (i.slug !== "saint-halo") assert.match(i.slug, /^saint-[a-z0-9-]+-idle$/);
  const gardenItems = CHECKLISTS.filter((c) => c.game === "Garden Givers").flatMap((c) => c.items);
  assert.ok(gardenItems.some((i) => i.slug === "bug-idle") && gardenItems.some((i) => i.slug === "garden-foodbank"));
});

test("save, keep the old version, favorite, tick, delete to the trash; anyone can read them", async () => {
  const e = env();
  assert.equal((await call(e, "/art", undefined, "wrong")).status, 401);
  assert.deepEqual((await (await call(e, "/art")).json()).drawings, {});
  const s1 = await (await call(e, "/art/save", altar)).json();
  assert.ok(s1.ok && s1.art.drawings["church-roman-altar"]);
  await call(e, "/art/save", { ...altar, fps: 6 });
  assert.equal([...e.WATCH_MEDIA.files.keys()].filter((k) => k.startsWith("content/art/history/church-roman-altar/")).length, 1);
  assert.equal((await call(e, "/art/save", { ...altar, width: 3 })).status, 400);
  await call(e, "/art/favorite", { slug: "church-roman-altar", on: true });
  const t = await (await call(e, "/art/done", { slug: "church-roman-altar", on: true })).json();
  assert.deepEqual(t.art.favorites, ["church-roman-altar"]);
  assert.equal(t.art.done["church-roman-altar"], true);
  const pub = await (await worker.fetch(new Request("https://angelio.org/api/art"), e)).json();
  assert.equal(pub.drawings["church-roman-altar"].fps, 6);
  const d = await (await call(e, "/art/delete", { slug: "church-roman-altar" })).json();
  assert.deepEqual(d.art.drawings, {});
  assert.deepEqual(d.art.favorites, []);
  assert.ok([...e.WATCH_MEDIA.files.keys()].some((k) => k.startsWith("content/art/trash/church-roman-altar-")));
});

test("the Drawings page's editor is the Lesson Studio's, with only the marked changes", () => {
  const copy = fs.readFileSync(new URL("../public/studio/draw/pixels.js", import.meta.url), "utf8");
  assert.equal((copy.match(/Angelio:/g) ?? []).length, 4); // the note at the top, plus the three marked lines
  assert.match(copy, /opts\.start/);
});

const fixture = (n) => new Uint8Array(fs.readFileSync(new URL(`fixtures/${n}.vox`, import.meta.url)));

test(".vox files from MagicaVoxel: frames, sizes and colors", () => {
  const idle = readVox(fixture("priest-idle")), walk = readVox(fixture("priest-walk-fast"));
  assert.equal(idle.frames.length, 4);
  assert.equal(walk.frames.length, 2); // her file keeps an old model it no longer shows
  // a copied frame: MagicaVoxel points frame 4 at frame 2's model again
  assert.deepEqual(idle.frames[3].voxels, idle.frames[1].voxels);
  assert.notDeepEqual(idle.frames[0].voxels, idle.frames[1].voxels);
  assert.deepEqual(idle.frames[0].size, [8, 8, 8]);
  for (const [x, y, z, c] of toScene(idle, 3)) { assert.ok(y > 0 && y < 8 && Math.abs(x) < 4 && Math.abs(z) < 4); assert.match(c, /^#[0-9a-f]{6}$/); }
  assert.throws(() => readVox(new TextEncoder().encode("not a vox file at all")), /MagicaVoxel/);
  assert.throws(() => readVox(fixture("priest-idle").slice(0, 200)), /cut short|damaged/);
});

test("upload a model, replace it (old one kept), anyone can download it, remove it to the trash", async () => {
  const e = env();
  const up = (slug, bytes) => worker.fetch(new Request(`https://angelio.org/api/admin/studio/art/vox?slug=${slug}`, { method: "POST", headers: { "x-admin-key": "secret" }, body: bytes }), e);
  assert.equal((await up("priest-idle", new TextEncoder().encode("hello"))).status, 400);
  const r1 = await (await up("priest-idle", fixture("priest-idle"))).json();
  assert.deepEqual(r1.art.voxels["priest-idle"].size, [8, 8, 8]);
  assert.equal(r1.art.voxels["priest-idle"].frames, 4);
  await up("priest-idle", fixture("priest-walk-fast"));
  assert.ok([...e.WATCH_MEDIA.files.keys()].some((k) => /^content\/art\/history\/priest-idle\/.*\.vox$/.test(k)));
  const dl = await worker.fetch(new Request("https://angelio.org/api/art/vox?slug=priest-idle"), e);
  assert.equal(readVox(new Uint8Array(await dl.arrayBuffer())).frames.length, 2);
  const sp = await (await call(e, "/art/vox-speed", { slug: "priest-idle", fps: 2 })).json();
  assert.equal(sp.art.voxels["priest-idle"].fps, 2);
  await up("priest-idle", fixture("priest-walk-fast")); // replacing the file keeps its speed
  const pub = await (await worker.fetch(new Request("https://angelio.org/api/art"), e)).json();
  assert.equal(pub.voxels["priest-idle"].frames, 2);
  assert.equal(pub.voxels["priest-idle"].fps, 2);
  const del = await (await call(e, "/art/vox-delete", { slug: "priest-idle" })).json();
  assert.deepEqual(del.art.voxels, {});
  assert.equal((await worker.fetch(new Request("https://angelio.org/api/art/vox?slug=priest-idle"), e)).status, 404);
  assert.ok([...e.WATCH_MEDIA.files.keys()].some((k) => /^content\/art\/trash\/priest-idle-.*\.vox$/.test(k)));
});
