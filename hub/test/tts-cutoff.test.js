import { test } from "node:test";
import assert from "node:assert/strict";
import { CUTOFF_MUTE_LIMIT, createCutoffTracker } from "../../kit/tts.js";

test("createCutoffTracker auto-mutes after 5 consecutive cutoffs while protecting slow players and single programmatic stops", () => {
  assert.equal(CUTOFF_MUTE_LIMIT, 5);
  const t = createCutoffTracker({ limit: 5, minElapsedMs: 150, windowMs: 45000 });

  // Same-tick programmatic stop (< 150ms) does not increment streak
  t.onStart(1000);
  assert.deepEqual(t.onStop({ now: 1050 }), { cutoff: false, streak: 0, muted: false });
  assert.equal(t.getStreak(), 0);

  // Explicit user mute / cleanup stop({ count: false }) never counts
  t.onStart(2000);
  assert.deepEqual(t.onStop({ count: false, now: 2600 }), { cutoff: false, streak: 0, muted: false });
  assert.equal(t.getStreak(), 0);

  // 4 fast cutoffs leave voice enabled; finishing 1 line naturally resets streak
  for (let i = 0; i < 4; i++) {
    const base = 10000 + i * 1000;
    t.onStart(base);
    const res = t.onStop({ now: base + 400 });
    assert.equal(res.cutoff, true);
    assert.equal(res.muted, false);
    assert.equal(res.streak, i + 1);
  }
  t.onStart(15000);
  t.onFinish();
  assert.equal(t.getStreak(), 0);

  // 5 consecutive cutoffs within the window triggers auto-mute on the 5th interruption
  for (let i = 0; i < 4; i++) {
    const base = 20000 + i * 1000;
    t.onStart(base);
    assert.equal(t.onStop({ now: base + 400 }).muted, false);
  }
  t.onStart(25000);
  assert.deepEqual(t.onStop({ now: 25400 }), { cutoff: true, streak: 5, muted: true });
  assert.equal(t.getStreak(), 0);

  // Cutoffs separated by longer than windowMs reset before accumulating to mute
  t.onStart(30000);
  assert.equal(t.onStop({ now: 30500 }).streak, 1);
  t.onStart(90000);
  assert.equal(t.onStop({ now: 90500 }).streak, 1);
});
