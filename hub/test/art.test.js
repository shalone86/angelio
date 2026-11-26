import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../worker/index.js";
import { checkDrawing, CHECKLISTS, artSlug } from "../public/js/art-content.js";
import { readVox, toScene } from "../public/js/vox.js";
import { readVoxMaterials, usedMaterials, toSceneWithMaterials } from "../public/studio/draw/voxmat.js";

function fakeR2() {
  const files = new Map(); let n = 0;
  return {
    files,
    async get(key) { const f = files.get(key); return f ? { etag: f.etag, httpEtag: `"${f.etag}"`, body: f.body, json: async () => JSON.parse(f.body), arrayBuffer: async () => (typeof f.body === "string" ? new TextEncoder().encode(f.body) : f.body).slice().buffer } : null; },
    async put(key, body, opts = {}) { if (opts.onlyIf?.etagMatches && files.get(key)?.etag !== opts.onlyIf.etagMatches) return null; const etag = `e${++n}`; files.set(key, { body: body instanceof Uint8Array || body instanceof ArrayBuffer ? new Uint8Array(body) : String(body), etag }); return { etag }; },
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
  for (const s of ["man-idle", "man-beard-idle", "woman-idle", "child-idle", "child-girl-idle", "monk-idle", "monk-walk", "nun-idle", "nun-walk", "bishop-idle", "bishop-walk"]) {
    assert.ok(all.some((i) => i.slug === s), s);
  }
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

function buildTestVoxWithMatl() {
  const enc = (s) => new TextEncoder().encode(s);
  const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
  const i32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setInt32(0, n, true); return b; };
  const str = (s) => { const sb = enc(s); return concat([u32(sb.length), sb]); };
  const dict = (obj) => {
    const entries = Object.entries(obj);
    return concat([u32(entries.length), ...entries.flatMap(([k, v]) => [str(k), str(String(v))])]);
  };
  const chunk = (id, payload) => concat([enc(id), u32(payload.length), u32(0), payload]);
  const concat = (arrs) => {
    const out = new Uint8Array(arrs.reduce((s, a) => s + a.length, 0));
    let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out;
  };

  const sizePayload = concat([u32(4), u32(4), u32(4)]);
  const voxels = [[0, 0, 0, 1], [1, 0, 0, 2], [2, 0, 0, 3], [3, 0, 0, 4], [0, 1, 0, 5]];
  const xyziPayload = concat([u32(voxels.length), ...voxels.map((v) => new Uint8Array(v))]);
  const matl = (id, props) => chunk("MATL", concat([i32(id), dict(props)]));

  const children = concat([
    chunk("SIZE", sizePayload),
    chunk("XYZI", xyziPayload),
    matl(1, { _type: "_diffuse", _rough: "0.1" }),
    matl(2, { _type: "_emit", _emit: "0.9", _flux: "2" }),
    matl(3, { _type: "_glass", _alpha: "0.75" }),
    matl(4, { _type: "_metal", _metal: "0.85", _rough: "0.2" }),
    matl(5, { _type: "_media", _weight: "0.5" }),
    matl(9, { _type: "_emit", _emit: "0.7" }), // unused palette slot
  ]);
  return concat([enc("VOX "), u32(150), enc("MAIN"), u32(0), u32(children.length), children]);
}

test("MATL reader (Studio Drawings experiment): parses emit, glass, metal, cloud and ignores unused palette slots", () => {
  const plain = fixture("priest-idle");
  const plainMats = readVoxMaterials(plain);
  assert.deepEqual(plainMats, {});
  assert.equal(usedMaterials(readVox(plain), plainMats).totalSpecial, 0);

  const bytes = buildTestVoxWithMatl();
  const mats = readVoxMaterials(bytes);
  assert.equal(mats[1], undefined);
  assert.equal(mats[2]?.kind, "emit");
  assert.equal(mats[2]?.flux, 2);
  assert.equal(mats[3]?.kind, "glass");
  assert.equal(mats[4]?.kind, "metal");
  assert.equal(mats[5]?.kind, "cloud");
  assert.equal(mats[9]?.kind, "emit");

  const vox = readVox(bytes);
  const used = usedMaterials(vox, mats);
  assert.deepEqual(used.counts, { emit: 1, glass: 1, metal: 1, cloud: 1 });
  assert.equal(used.totalSpecial, 4);
  assert.match(used.summary, /Emit \(1\).*Glass \(1\).*Metal \(1\).*Cloud \(1\)/);

  const scene = toSceneWithMaterials(vox, 0, mats);
  assert.equal(scene.length, 5);
  assert.equal(scene[0][4], null);
  assert.equal(scene[1][4]?.kind, "emit");
});

test("a save that lands while another studio saves is refused, never written over (3D models stay)", async () => {
  const e = env();
  await call(e, "/art/save", altar);
  const voxels = { "priest-3d": { saved: "2026-11-20T00:00:00.000Z", frames: 1, size: [8, 8, 8], bytes: 9, fps: 4 } };
  const doc = JSON.parse(e.WATCH_MEDIA.files.get("content/art/drawings.json").body);
  await e.WATCH_MEDIA.put("content/art/drawings.json", JSON.stringify({ ...doc, voxels }));
  // Another studio (Pico Parish, the Lesson Studio) saves between this save's read and its write.
  const realGet = e.WATCH_MEDIA.get.bind(e.WATCH_MEDIA);
  let once = true;
  e.WATCH_MEDIA.get = async (key) => {
    const got = await realGet(key);
    if (once && key === "content/art/drawings.json") {
      once = false;
      const now = JSON.parse(e.WATCH_MEDIA.files.get(key).body);
      now.drawings.lamp = { ...altar, name: "lamp", saved: "2026-11-26T00:00:00.000Z" };
      await e.WATCH_MEDIA.put(key, JSON.stringify(now));
    }
    return got;
  };
  const r = await call(e, "/art/save", { ...altar, name: "dove" });
  assert.equal(r.status, 409);
  e.WATCH_MEDIA.get = realGet;
  const after = JSON.parse(e.WATCH_MEDIA.files.get("content/art/drawings.json").body);
  assert.ok(after.drawings.lamp, "the other studio's drawing is kept");
  assert.deepEqual(after.voxels, voxels, "3D models are kept");
  assert.equal((await call(e, "/art/save", { ...altar, name: "dove" })).status, 200, "trying again works");
  assert.deepEqual(JSON.parse(e.WATCH_MEDIA.files.get("content/art/drawings.json").body).voxels, voxels);
});
