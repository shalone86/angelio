import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { cleanLayout } from "../worker/studio.js";

const files = new Map();
const r2 = {
  async get(k) { const f = files.get(k); return f == null ? null : { body: f, text: async () => f, json: async () => JSON.parse(f) }; },
  async put(k, v) { files.set(k, String(v)); },
};
const env = { ADMIN_KEY: "secret", WATCH_MEDIA: r2, CODES: { get: async () => null }, ASSETS: { fetch: async () => new Response("hub") } };
const call = (path, body, key = "secret") => worker.fetch(new Request(`https://angelio.org/api/admin/studio${path}`, body === undefined ? { headers: { "x-admin-key": key } } : { method: "POST", headers: { "x-admin-key": key }, body: JSON.stringify(body) }), env);

test("placements: only known spots and numbers in range are kept", () => {
  assert.deepEqual(cleanLayout({ roman: { big: { x: 3.333, z: -99, y: "a", color: "red" }, nope: { x: 1 } }, gothic: { big: { x: 1 } } }),
    { roman: { big: { x: 3.33, z: -16 } } });
  assert.deepEqual(cleanLayout(null), {});
});

test("placements: saved with the admin key (old one kept), read by anyone", async () => {
  assert.equal((await call("/candles", { layout: {} }, "wrong")).status, 401);
  assert.deepEqual(await (await worker.fetch(new Request("https://angelio.org/api/candles/layout"), env)).json(), {});
  await call("/candles", { layout: { byzantine: { endPriest: { x: 0, z: -8, turn: 0 } } } });
  await call("/candles", { layout: { byzantine: { endPriest: { x: 1, z: -8, turn: 0 } } } });
  const pub = await worker.fetch(new Request("https://angelio.org/api/candles/layout"), env);
  assert.equal(pub.headers.get("access-control-allow-origin"), "*");
  assert.equal((await pub.json()).byzantine.endPriest.x, 1);
  assert.ok([...files.keys()].some((k) => k.startsWith("content/candles/history/")));
  assert.equal((await (await call("/candles")).json()).layout.byzantine.endPriest.x, 1);
});
