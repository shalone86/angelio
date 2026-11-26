// The drawings sync with the library the Angelio and Pico Parish Studios share (scripts/art-sync.mjs), with a pretend
// angelio.org. Needs no packages.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncArt, hashOf } from "../scripts/art-sync.mjs";

const pic = (name, c, extra = {}) => ({ name, width: 8, height: 8, fps: 4, palette: ["#000000", "#ffffff"], frames: [Array(8).fill(c.repeat(8))], ...extra });
const slugOf = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function fakeAngelio(drawings, voxels = { "priest-3d": { saved: "2026-11-20T00:00:00.000Z", frames: 1 } }) {
  const lib = { drawings: { ...drawings }, favorites: [], done: {}, voxels };
  let clock = Date.parse("2026-11-26T12:00:00.000Z");
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(url);
    if (u.pathname === "/api/art") return Response.json(lib);
    if (u.pathname === "/api/admin/studio/art/save") {
      if (opts.headers["x-admin-key"] !== "k") return Response.json({ error: "no" }, { status: 401 });
      const d = JSON.parse(opts.body), slug = slugOf(d.name);
      lib.drawings[slug] = { ...d, saved: new Date((clock += 1000)).toISOString() };
      return Response.json({ ok: true, slug, art: lib });
    }
    return Response.json({ error: "not found" }, { status: 404 });
  };
  return { lib, fetchImpl };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "art-sync-"));
const write = (dir, slug, d, mtime) => {
  fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(d, null, 1) + "\n");
  if (mtime) fs.utimesSync(path.join(dir, `${slug}.json`), new Date(mtime), new Date(mtime));
};
const readHere = (dir, slug) => JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), "utf8"));

test("new drawings go both ways, the same ones stay put, and 3D models are never touched", async () => {
  const dir = tmp();
  write(dir, "angel", pic("Angel", "1"));
  write(dir, "boat", pic("Boat", "1"));
  fs.writeFileSync(path.join(dir, "sky.json"), JSON.stringify({ name: "Sky", kind: "sketch", width: 64, height: 64, fps: 4, frames: ["sky/1.png"] }));
  const { lib, fetchImpl } = fakeAngelio({ boat: { ...pic("Boat", "1"), saved: "2026-11-18T00:00:00.000Z", from: "Lesson Studio" }, fish: { ...pic("Fish", "0"), saved: "2026-11-25T00:00:00.000Z" } });
  const voxels = structuredClone(lib.voxels);
  const r = await syncArt({ force: true, dir, key: "k", fetchImpl, site: "https://angelio.test" });
  assert.deepEqual(r.pushed, ["angel"], "only the new one goes up (Boat is the same picture)");
  assert.deepEqual(r.pulled, ["fish"]);
  assert.ok(!lib.drawings.sky, "sketches stay here");
  assert.equal(readHere(dir, "fish").saved, undefined, "saved in the studio's own format");
  assert.deepEqual(lib.voxels, voxels);
  const again = await syncArt({ force: true, dir, key: "k", fetchImpl, site: "https://angelio.test" });
  assert.deepEqual([again.pushed, again.pulled], [[], []], "nothing changes the second time");
});

test("a change on either side wins over the old copy, and the old copy is kept", async () => {
  const dir = tmp();
  write(dir, "boat", pic("Boat", "1"));
  const { lib, fetchImpl } = fakeAngelio({});
  const go = () => syncArt({ force: true, dir, key: "k", fetchImpl, site: "https://angelio.test" });
  await go();
  // changed in Pico Parish
  lib.drawings.boat = { ...pic("Boat", "0"), saved: "2026-11-27T00:00:00.000Z" };
  assert.deepEqual((await go()).pulled, ["boat"]);
  assert.equal(readHere(dir, "boat").frames[0][0], "00000000");
  assert.ok(fs.readdirSync(path.join(dir, ".replaced")).some((f) => f.startsWith("boat-")));
  // changed here
  write(dir, "boat", pic("Boat", "1"));
  assert.deepEqual((await go()).pushed, ["boat"]);
  assert.equal(lib.drawings.boat.frames[0][0], "11111111");
  // changed in both: the newer wins
  write(dir, "boat", pic("Boat", "0"), "2026-11-28T00:00:00.000Z");
  lib.drawings.boat = { ...pic("Boat", "1", { fps: 6 }), saved: "2026-11-29T00:00:00.000Z" };
  assert.deepEqual((await go()).pulled, ["boat"]);
  assert.equal(readHere(dir, "boat").fps, 6);
});

test("a delete on one side isn't undone by the other", async () => {
  const dir = tmp();
  write(dir, "boat", pic("Boat", "1"));
  write(dir, "fish", pic("Fish", "1"));
  const { lib, fetchImpl } = fakeAngelio({});
  const go = () => syncArt({ force: true, dir, key: "k", fetchImpl, site: "https://angelio.test" });
  await go();
  delete lib.drawings.boat; // deleted in Pico Parish
  fs.rmSync(path.join(dir, "fish.json")); // deleted here
  const r = await go();
  assert.deepEqual([r.pushed, r.pulled], [[], []]);
  assert.ok(fs.existsSync(path.join(dir, "boat.json")) && lib.drawings.fish, "each side keeps its own copy");
});

test("without the key, drawings still come down and nothing is lost; offline changes nothing", async () => {
  const dir = tmp();
  write(dir, "boat", pic("Boat", "1"));
  const { lib, fetchImpl } = fakeAngelio({ fish: { ...pic("Fish", "0"), saved: "2026-11-25T00:00:00.000Z" } });
  const r = await syncArt({ force: true, dir, key: "", fetchImpl, site: "https://angelio.test" });
  assert.ok(r.needKey);
  assert.deepEqual(r.pulled, ["fish"]);
  assert.ok(!lib.drawings.boat);
  const later = await syncArt({ force: true, dir, key: "k", fetchImpl, site: "https://angelio.test" });
  assert.deepEqual(later.pushed, ["boat"], "it goes up once the key is there");
  const off = await syncArt({ force: true, dir, key: "k", fetchImpl: async () => { throw new Error("offline"); }, site: "https://angelio.test" });
  assert.ok(off.offline);
  assert.equal(hashOf(readHere(dir, "boat")), hashOf(pic("Boat", "1")));
});
