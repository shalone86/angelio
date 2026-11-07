import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { APPS } from "../worker/index.js";
import { APP_LIST } from "../public/js/apps.js";
import fs from "node:fs";

const fakeApp = (name) => ({ seen: [], async fetch(req) { this.seen.push(new URL(req.url).pathname + new URL(req.url).search); return new Response(`${name}:${new URL(req.url).pathname}`); } });
const env = () => ({
  ASSETS: { fetch: async (req) => new Response(`hub:${new URL(req.url).pathname}`) },
  REGROUP: fakeApp("regroup"), SNAP: fakeApp("snap"), DOUBLES: fakeApp("doubles"), GRAMMAR: fakeApp("grammar"),
});
const get = (e, path) => worker.fetch(new Request(`https://angelio.org${path}`), e);

test("each app lives under its own path, with the prefix stripped", async () => {
  const e = env();
  assert.equal(await (await get(e, "/regroup/")).text(), "regroup:/");
  assert.equal(await (await get(e, "/regroup/css/app.css")).text(), "regroup:/css/app.css");
  await get(e, "/snap/api/tts?text=Hi&voice=helena");
  assert.deepEqual(e.SNAP.seen, ["/api/tts?text=Hi&voice=helena"]);
  assert.equal(await (await get(e, "/Grammar/js/app.js")).text(), "grammar:/js/app.js");
});

test("a path without the slash redirects so relative links work", async () => {
  const r = await get(env(), "/doubles");
  assert.equal(r.status, 301);
  assert.equal(r.headers.get("location"), "https://angelio.org/doubles/");
});

test("everything else is the hub page", async () => {
  assert.equal(await (await get(env(), "/")).text(), "hub:/");
  assert.equal(await (await get(env(), "/css/base.css")).text(), "hub:/css/base.css");
});

test("hub cards, routes and service bindings agree", () => {
  const live = APP_LIST.filter((a) => a.path);
  for (const a of live) assert.ok(APPS[a.path], `${a.name}: no route for /${a.path}/`);
  const wr = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  for (const b of Object.values(APPS)) assert.match(wr, new RegExp(`"binding": "${b}"`), `${b} binding missing in wrangler.jsonc`);
});
