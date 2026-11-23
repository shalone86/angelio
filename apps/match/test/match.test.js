import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SAINTS, saintById, saintsForStage } from "../public/js/saints.js";
import { STAGES, stageById, isOpen, waveConfig } from "../public/js/stages.js";
import { HELPERS, helperById, helperOpen } from "../public/js/helpers.js";
import { newGame, tick, flip, useHint, multOf, starsFor, timeLeft, cardById, MISMATCH_TIME, CLEAR_DELAY } from "../public/js/match.js";

test("saints catalog: 6 per stage, unique slugs and symbols, M/F parity outside Apostles", () => {
  assert.equal(SAINTS.length, 36);
  assert.equal(new Set(SAINTS.map((s) => s.id)).size, 36);
  assert.equal(new Set(SAINTS.map((s) => s.slug)).size, 36);
  assert.equal(new Set(SAINTS.map((s) => s.symbol)).size, 36);

  const stageIds = ["apostles", "early", "eastern", "western", "modern", "patrons"];
  for (const id of stageIds) {
    const group = saintsForStage(id);
    assert.equal(group.length, 6, id);
    const m = group.filter((s) => s.sex === "m").length;
    const f = group.filter((s) => s.sex === "f").length;
    if (id === "apostles") assert.deepEqual([m, f], [6, 0]);
    else assert.deepEqual([m, f], [3, 3], `${id} should keep 3M / 3F parity`);
  }
  assert.equal(saintsForStage("rush").length, 36);

  const unlocked = HELPERS.filter((h) => h.opens);
  assert.equal(unlocked.length, 6);
  assert.equal(unlocked.filter((h) => h.sex === "m").length, 3);
  assert.equal(unlocked.filter((h) => h.sex === "f").length, 3);
});

test("stages & helpers unlock with 2 stars on prerequisites (including Endless after Apostles)", () => {
  const zero = () => 0;
  assert.equal(isOpen(0, zero), true);
  assert.equal(isOpen(1, zero), false);
  assert.equal(isOpen(6, zero), false); // All Saints Rush

  const apostlesTwo = (st) => (st.id === "apostles" ? 2 : 0);
  assert.equal(isOpen(1, apostlesTwo), true);
  assert.equal(isOpen(6, apostlesTwo), true); // Rush unlocks after Apostles 2★
  assert.equal(isOpen(2, apostlesTwo), false);

  assert.equal(helperOpen(helperById("starter"), () => 0), true);
  assert.equal(helperOpen(helperById("anthony"), (id) => (id === "apostles" ? 1 : 0)), false);
  assert.equal(helperOpen(helperById("anthony"), (id) => (id === "apostles" ? 2 : 0)), true);
});

test("2-second peek, matching combos, instant 3rd-card flip on mismatch, golden Feast Rush, and wave clear", () => {
  const g = newGame({ seed: 7, stage: stageById("early"), helper: helperById("starter") });
  assert.equal(g.phase, "peek");
  assert.ok(g.cards.every((c) => c.faceUp));
  // Cannot flip while peeking
  assert.equal(flip(g, g.cards[0].id).length, 0);

  const peekEvents = tick(g, 2.05);
  assert.ok(peekEvents.some((e) => e.type === "peek-end"));
  assert.equal(g.phase, "play");
  assert.ok(g.cards.every((c) => !c.faceUp));

  // Force a mismatch, then immediately tap a 3rd card before MISMATCH_TIME expires
  const first = g.cards[0];
  const wrong = g.cards.find((c) => c.pairId !== first.pairId);
  const third = g.cards.find((c) => c.pairId !== first.pairId && c.id !== wrong.id);
  flip(g, first.id);
  const miss = flip(g, wrong.id);
  assert.ok(miss.some((e) => e.type === "mismatch"));
  assert.equal(g.wrong, 1);

  const fastThird = flip(g, third.id);
  assert.ok(fastThird.some((e) => e.type === "close" && e.ids.includes(first.id) && e.ids.includes(wrong.id)));
  assert.equal(cardById(g, third.id).faceUp, true);
  // Reset cleanly via mismatch timeout by waiting MISMATCH_TIME after closing
  const nonThird = g.cards.find((c) => c.pairId !== third.pairId);
  flip(g, nonThird.id);
  const tEv = tick(g, MISMATCH_TIME + 0.05);
  assert.ok(tEv.some((e) => e.type === "close"));

  // Match all pairs on wave 1 including the Golden Halo pair
  const byPair = new Map();
  for (const c of g.cards) byPair.set(c.pairId, [...(byPair.get(c.pairId) ?? []), c]);
  const pairs = [...byPair.values()].sort((a, b) => Number(a[0].golden) - Number(b[0].golden));
  for (const [a, b] of pairs) {
    flip(g, a.id);
    const evs = flip(g, b.id);
    const m = evs.find((e) => e.type === "match");
    assert.ok(m);
    if (a.golden) assert.ok(m.golden && m.rush && g.rushLeft > 0);
  }
  assert.equal(g.phase, "clear");
  assert.equal(g.wavesCleared, 1);
  assert.ok(multOf(g) >= 3);

  // Waiting across CLEAR_DELAY deals wave 2 with symbol pairs enabled
  const deal = tick(g, CLEAR_DELAY + 0.05);
  assert.ok(deal.some((e) => e.type === "deal" && e.wave === 2));
  assert.equal(g.wave, 2);
  assert.ok(g.cards.some((c) => c.kind === "symbol"), "wave 2 on Early Church mixes Saint <-> Sign pairs");
});

test("wind swaps move two face-down cards and Sharp Eye awards bonus points", () => {
  const g = newGame({ seed: 11, stage: stageById("patrons"), helper: helperById("starter") });
  tick(g, 2.1); // enter play
  const cfg = waveConfig(g.stage, 1);
  assert.ok(cfg.swapEvery > 0);

  let swappedIds = null;
  for (let i = 0; i < 200; i++) {
    const evs = tick(g, 0.1);
    const sw = evs.find((e) => e.type === "wind-swap");
    if (sw) { swappedIds = sw.ids; break; }
  }
  assert.ok(swappedIds && swappedIds.length === 2, "wind swap should trigger during play");
  const swCard = cardById(g, swappedIds[0]);
  const mate = g.cards.find((c) => c.pairId === swCard.pairId && c.id !== swCard.id);
  flip(g, swCard.id);
  const evs = flip(g, mate.id);
  const m = evs.find((e) => e.type === "match");
  assert.equal(m.sharpEye, true);
  assert.equal(g.sharpEyes, 1);
});

test("patron helpers apply their distinct skills and trade-offs", () => {
  // St. Anthony: hint marks a pair once per wave
  const ant = newGame({ seed: 3, stage: stageById("apostles"), helper: helperById("anthony") });
  tick(ant, 2.1);
  const hEv = useHint(ant);
  assert.equal(hEv.length, 1);
  assert.equal(hEv[0].ids.filter((id) => cardById(ant, id).hinted).length, 2);
  assert.equal(useHint(ant).length, 0, "hint usable only once per wave");

  // St. Clare: forgives first mismatch per wave without breaking streak
  const clare = newGame({ seed: 4, stage: stageById("western"), helper: helperById("clare") });
  tick(clare, 2.1);
  const p = clare.cards.filter((c) => c.pairId === clare.cards[0].pairId);
  flip(clare, p[0].id);
  flip(clare, p[1].id);
  assert.equal(clare.streak, 1);
  const wrongA = clare.cards.find((c) => !c.matched);
  const wrongB = clare.cards.find((c) => !c.matched && c.pairId !== wrongA.pairId);
  flip(clare, wrongA.id);
  const miss1 = flip(clare, wrongB.id).find((e) => e.type === "mismatch");
  assert.equal(miss1.forgiven, true);
  assert.equal(clare.streak, 1);
  assert.equal(clare.wrong, 0);

  // St. Cecilia: suppresses wind swaps even on Patron Saints
  const cec = newGame({ seed: 5, stage: stageById("patrons"), helper: helperById("cecilia") });
  tick(cec, 2.1);
  assert.equal(cec.swapInterval, 0);

  // St. Carlo: climbs to x6 on fast chains
  const carlo = newGame({ seed: 6, stage: stageById("modern"), helper: helperById("carlo") });
  tick(carlo, 2.5);
  assert.equal(carlo.maxMult, 6);
  assert.equal(carlo.comboStep, 1);
});

test("pretend players balance: every stage finishes cleanly and separates 1 / 2 / 3 stars", () => {
  function runBot(stage, helper, skill, seed) {
    const g = newGame({ seed, stage, helper });
    const mem = new Map();
    const rem = (c) => {
      mem.delete(c.id);
      mem.set(c.id, c.pairId);
      while (mem.size > skill.mem) mem.delete(mem.keys().next().value);
    };
    let actIn = 0.4, lastWave = g.wave;
    while (!g.over && g.t < 400) {
      const evs = tick(g, 0.05);
      for (const ev of evs) if (ev.type === "wind-swap") for (const id of ev.ids) mem.delete(id);
      if (g.wave !== lastWave) { mem.clear(); lastWave = g.wave; }
      if (g.phase === "peek" && g.peekLeft > 1.8) for (const c of g.cards) if ((seed + c.slot) % 10 < skill.peekTen) rem(c);
      for (const c of g.cards) if (c.faceUp && !c.matched) rem(c);
      if (g.phase === "play") {
        actIn -= 0.05;
        if (actIn <= 0) {
          actIn = skill.pause;
          if (g.open.length === 1) {
            const o = cardById(g, g.open[0]);
            const mate = g.cards.find((c) => c.pairId === o.pairId && c.id !== o.id);
            const knows = mem.has(mate.id) && (Math.floor(g.t * 10) % 10) < skill.accTen;
            const others = g.cards.filter((c) => !c.matched && c.id !== o.id);
            flip(g, (knows ? mate : others[Math.floor(g.r() * others.length)]).id);
          } else {
            const byPair = new Map();
            for (const [id, pid] of mem) {
              const card = cardById(g, id);
              if (card && !card.matched && !card.faceUp) {
                if (!byPair.has(pid)) byPair.set(pid, []);
                byPair.get(pid).push(id);
              }
            }
            const known = [...byPair.values()].find((ids) => ids.length === 2);
            if (known) { flip(g, known[0]); actIn = skill.pause * 0.55; }
            else {
              const pool = g.cards.filter((c) => !c.matched && !c.faceUp && !mem.has(c.id));
              const fallback = pool.length ? pool : g.cards.filter((c) => !c.matched && !c.faceUp);
              if (fallback.length) flip(g, fallback[Math.floor(g.r() * fallback.length)].id);
            }
          }
        }
      }
    }
    return g;
  }

  for (const st of STAGES) {
    const kid = runBot(st, HELPERS[0], { pause: 1.4, mem: 4, peekTen: 4, accTen: 7 }, 11);
    const pro = runBot(st, HELPERS[0], { pause: 0.52, mem: 14, peekTen: 9, accTen: 10 }, 22);
    assert.equal(kid.over, true, `${st.id} kid run finishes`);
    assert.equal(pro.over, true, `${st.id} pro run finishes`);
    assert.ok(starsFor(pro) === 3, `${st.id} pro earns 3★ (got ${pro.score} vs ${st.star3})`);
    if (!st.endless) {
      assert.ok(starsFor(kid) >= 2, `${st.id} steady kid earns at least 2★ (got ${kid.score} vs ${st.star2})`);
    }
    assert.ok(pro.score > kid.score, `${st.id} pro outscores kid`);
  }

  // Endless Rush terminates even with St. Carlo on a fast bot
  const carloRush = runBot(stageById("rush"), helperById("carlo"), { pause: 0.5, mem: 14, peekTen: 9, accTen: 10 }, 99);
  assert.equal(carloRush.over, true);
  assert.ok(carloRush.wavesCleared >= 8);
});

test("round end transition: clock hits 0 and app.js finish() is in viewPlay scope above handle()", () => {
  const g = newGame({ seed: 1, stage: stageById("apostles"), helper: helperById("starter") });
  tick(g, 89.95);
  assert.equal(g.over, false);
  assert.equal(Math.ceil(timeLeft(g)), 1);
  const endEvs = tick(g, 0.1);
  assert.ok(endEvs.some((e) => e.type === "end"));
  assert.equal(g.over, true);
  assert.equal(timeLeft(g), 0);

  const src = fs.readFileSync(new URL("../public/js/app.js", import.meta.url), "utf8");
  const finishPos = src.indexOf("function finish()");
  const handlePos = src.indexOf("function handle(");
  const asyncPos = src.indexOf("(async () => {");
  assert.ok(finishPos > 0 && handlePos > finishPos && asyncPos > handlePos,
    "finish() and handle() must share viewPlay scope before the async game loop starts");
});

