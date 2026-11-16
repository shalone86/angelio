// Quiz question types, all by tapping (no typing, no talking), sharing the gentle-mistake rules of the
// other Angelio games: a wrong tap shakes and counts as a mistake; after two misses the answer is shown.
//   choice  — tap the right answer                      { q, choices, answer, why }
//   blank   — tap the word that fits in the sentence     { q: "… ____ …", words, answer, why }
//   order   — tap the steps in order                     { q, items (in the right order), why }
//   match   — tap one on the left, then its partner      { q, pairs: [[left, right], …], why }
// Each ask… function fills `box`, resolves with the number of mistakes when the question is done.

import { speak } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import * as FX from "./kit/fx.js";
import { esc } from "./kit/ui.js";

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const listed = (cs) => (cs.length === 2 ? cs.join(", or ") : `${cs.slice(0, -1).join(", ")}, or ${cs.at(-1)}`);

/** What the voice says for a question. */
export function spoken(q) {
  if (q.type === "blank") return `${q.q.replace(/_{2,}/g, "blank")} Which word fits? ${listed(q.words)}?`;
  if (q.type === "order") return `${q.q} Tap them in order.`;
  if (q.type === "match") return `${q.q} Tap one on the left, then its match on the right.`;
  return `${q.q} ${listed(q.choices)}?`;
}

/** The answer in words, for "Here's the answer". */
export function answerText(q) {
  if (q.type === "blank") return q.answer;
  if (q.type === "order") return q.items.join(", then ");
  if (q.type === "match") return q.pairs.map(([a, b]) => `${a}: ${b}`).join(". ");
  return q.choices[q.answer];
}

const wrong = (el) => { el.classList.add("wrong"); FX.shake(el); sfx.oops(); };

export function askChoice(q, box, { onMiss } = {}) {
  box.innerHTML = `<div class="choices answer-choices">${q.choices.map((c, i) => `<button class="choice-card answer" data-v="${i}">${esc(c)}</button>`).join("")}</div>`;
  return new Promise((resolve) => {
    let miss = 0;
    box.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => {
      if (b.disabled) return;
      sfx.select();
      if (+b.dataset.v === q.answer) {
        box.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; });
        b.classList.add("right"); sfx.right(); FX.confetti(15);
        return resolve(miss);
      }
      miss++; b.disabled = true; wrong(b); onMiss?.(miss);
      if (miss >= 2) {
        box.querySelectorAll("[data-v]").forEach((x) => { x.disabled = true; if (+x.dataset.v === q.answer) x.classList.add("right"); });
        resolve(miss);
      }
    });
  });
}

export function askBlank(q, box, { onMiss } = {}) {
  const [before, after] = q.q.split(/_{2,}/);
  box.innerHTML = `
    <p class="blank-sentence">${esc(before)}<span class="blank-slot" aria-label="blank">&nbsp;</span>${esc(after ?? "")}</p>
    <div class="tiles">${shuffle(q.words).map((w) => `<button class="choice-card tile-word" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
  const slot = box.querySelector(".blank-slot");
  return new Promise((resolve) => {
    let miss = 0;
    const fill = (w, ok) => { slot.textContent = w; slot.classList.toggle("filled", ok); FX.pop(slot, 1.15); };
    box.querySelectorAll("[data-w]").forEach((b) => b.onclick = () => {
      if (b.disabled) return;
      sfx.select(); speak(b.dataset.w, { force: true });
      if (b.dataset.w === q.answer) {
        fill(q.answer, true); b.classList.add("right"); box.querySelectorAll("[data-w]").forEach((x) => { x.disabled = true; });
        sfx.right(); FX.confetti(15); return resolve(miss);
      }
      miss++; b.disabled = true; wrong(b); onMiss?.(miss);
      if (miss >= 2) { fill(q.answer, true); box.querySelectorAll("[data-w]").forEach((x) => { x.disabled = true; if (x.dataset.w === q.answer) x.classList.add("right"); }); resolve(miss); }
    });
  });
}

export function askOrder(q, box, { onMiss } = {}) {
  box.innerHTML = `
    <ol class="order-slots">${q.items.map((_, i) => `<li class="order-slot" data-slot="${i}"><span class="n">${i + 1}</span><span class="t"></span></li>`).join("")}</ol>
    <div class="tiles">${shuffle(q.items).map((t) => `<button class="choice-card tile-word" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>`;
  return new Promise((resolve) => {
    let miss = 0, next = 0, missHere = 0;
    const place = (t) => {
      const slot = box.querySelector(`[data-slot="${next}"]`);
      slot.querySelector(".t").textContent = t; slot.classList.add("filled"); FX.pop(slot, 1.08);
      box.querySelector(`[data-t="${CSS.escape(t)}"]`)?.setAttribute("disabled", "");
      next++; missHere = 0;
      if (next === q.items.length) { sfx.right(); FX.confetti(18); resolve(miss); } else sfx.key?.(next);
    };
    box.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => {
      if (b.disabled) return;
      speak(b.dataset.t, { force: true });
      if (b.dataset.t === q.items[next]) return place(b.dataset.t);
      miss++; missHere++; wrong(b); setTimeout(() => b.classList.remove("wrong"), 600); onMiss?.(miss);
      if (missHere >= 2) place(q.items[next]); // show the step they're stuck on, then let them go on
    });
  });
}

export function askMatch(q, box, { onMiss } = {}) {
  const rights = shuffle(q.pairs.map(([, r]) => r));
  box.innerHTML = `
    <div class="match-cols">
      <div class="match-col">${q.pairs.map(([l], i) => `<button class="choice-card match-l" data-l="${i}">${esc(l)}</button>`).join("")}</div>
      <div class="match-col">${rights.map((r) => `<button class="choice-card match-r" data-r="${esc(r)}">${esc(r)}</button>`).join("")}</div>
    </div>`;
  const colors = ["c1", "c2", "c3", "c4", "c5", "c6"];
  return new Promise((resolve) => {
    let miss = 0, picked = null, done = 0;
    const missFor = {};
    const join = (i) => {
      const l = box.querySelector(`[data-l="${i}"]`), r = box.querySelector(`[data-r="${CSS.escape(q.pairs[i][1])}"]`);
      [l, r].forEach((x) => { x.classList.remove("picked", "wrong"); x.classList.add("matched", colors[done % colors.length]); x.disabled = true; });
      FX.pop(r, 1.08); done++; picked = null;
      if (done === q.pairs.length) { sfx.right(); FX.confetti(18); resolve(miss); } else sfx.right();
    };
    box.querySelectorAll("[data-l]").forEach((b) => b.onclick = () => {
      if (b.disabled) return;
      sfx.select(); speak(b.textContent, { force: true });
      box.querySelectorAll("[data-l]").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked"); picked = +b.dataset.l;
    });
    box.querySelectorAll("[data-r]").forEach((b) => b.onclick = () => {
      if (b.disabled) return;
      speak(b.dataset.r, { force: true });
      if (picked == null) { FX.shake(box.querySelector(".match-col")); return; } // pick a left one first
      if (q.pairs[picked][1] === b.dataset.r) return join(picked);
      miss++; missFor[picked] = (missFor[picked] ?? 0) + 1; wrong(b); setTimeout(() => b.classList.remove("wrong"), 600); onMiss?.(miss);
      if (missFor[picked] >= 2) join(picked);
    });
  });
}

export const ASK = { choice: askChoice, blank: askBlank, order: askOrder, match: askMatch };
