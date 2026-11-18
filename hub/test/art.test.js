import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../worker/index.js";
import { checkDrawing, CHECKLISTS, artSlug } from "../public/js/art-content.js";

function fakeR2() {
  const files = new Map(); let n = 0;
  return {
    files,
    async get(key) { const f = files.get(key); return f ? { etag: f.etag, httpEtag: `"${f.etag}"`, body: f.body, json: async () => JSON.parse(f.body) } : null; },
    async put(key, body) { const etag = `e${++n}`; files.set(key, { body: String(body), etag }); return { etag }; },
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
