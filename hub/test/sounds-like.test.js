import { test } from "node:test";
import assert from "node:assert/strict";
import { soundsLike, skeleton } from "../public/js/sounds-like.js";

// What Whisper (base.en, in the browser's own engine) wrote for Mom's and Dad's recordings, Nov 21, 2026
test("accepts how Whisper writes the right word", () => {
  for (const [heard, want] of [["CAN.", "can"], ["10.", "ten"], ["1", "won"], ["Sun.", "sun"], ["pick Nick.", "picnic"], ["Kit 10", "kitten"],
    ["Row, but.", "robot"], ["app pull", "apple"], ["can do", "candle"], ["One, Der, Full.", "wonderful"], ["Fan, task, tick.", "fantastic"], ["In sucked.", "insect"]]) {
    assert.ok(soundsLike(heard, want), `${heard} → ${want}`);
  }
});

test("never accepts a different short vowel or a different word", () => {
  for (const [heard, want] of [["bit", "bot"], ["set.", "stay"], ["kin", "can"], ["map", "nap"], ["Take.", "cake"], ["10.", "kin"], ["", "cup"], ["cup", ""]]) {
    assert.ok(!soundsLike(heard, want), `${heard} ≠ ${want}`);
  }
});

test("the consonant outline of a word", () => {
  assert.equal(skeleton("picnic"), "pknk");
  assert.equal(skeleton("Pick Nick."), "pknk");
  assert.equal(skeleton("apple"), "apl");
});

import worker from "../worker/index.js";
test("the speech files come from storage (cached a year); the test page may use several cores", async () => {
  const files = new Map([["models/whisper-base.en/config.json", "{}"]]);
  const env = { WATCH_MEDIA: { get: async (k) => (files.has(k) ? { body: files.get(k), httpEtag: '"e"' } : null) }, ASSETS: { fetch: async () => new Response("page") } };
  const ok = await worker.fetch(new Request("https://angelio.org/models/whisper-base.en/config.json"), env);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "application/json");
  assert.match(ok.headers.get("cache-control"), /immutable/);
  assert.equal(ok.headers.get("cross-origin-embedder-policy"), "require-corp"); // the engine's helper needs it
  assert.equal((await worker.fetch(new Request("https://angelio.org/models/bad%20name!.onnx"), env)).status, 404);
  assert.equal((await worker.fetch(new Request("https://angelio.org/models/nope.onnx"), env)).status, 404);
  const page = await worker.fetch(new Request("https://angelio.org/speech/"), env);
  assert.equal(page.headers.get("cross-origin-embedder-policy"), "require-corp");
});
