// Animated worked examples (#/watch/:id, the card before practice, and the "Watch how" card before a new kind of
// question). The scenes themselves live in scenes.js; this is the player: a small requestAnimationFrame timeline,
// a pointing finger that glides and taps, captions that are read aloud, and a loop like a GIF.
import { levelById, LEVELS } from "./measure.js";
import { levelScenes, buildScene, sceneKey, SCENE_TITLES, evalStep, endOfStep, plainTarget, tapTimes, stepAnimMs } from "./scenes.js";
import { speak, stop, isVoiceActive, whenQuiet } from "./kit/tts.js";
import { sfx } from "./kit/sound.js";
import { esc } from "./kit/ui.js";

const MIN_STEP_MS = 3000;   // every step lasts at least this long
const AFTER_SPEECH_MS = 600; // and 0.6 s after the voice finishes
const LOOP_GAP_MS = 1500;    // pause before the scene starts again

const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

/**
 * Mount the animated walkthrough of `level` into `container`: one scene for each kind of question the level asks
 * (chips "1 of 3: …" switch between them; they play one after another and loop).
 * `only` = a scene key: show just that one (the "Watch how" card). `onSceneDone(key)` fires when a scene has played to its end.
 * Returns a cleanup function.
 */
export function mountAnimatedDemo(container, level, { autoplay = true, compact = false, only = null, onSceneDone = null } = {}) {
  if (!container || !level) return () => {};
  let list = levelScenes(level);
  if (only) {
    const hit = list.find((s) => s.key === only);
    list = hit ? [hit] : list.slice(0, 1);
  }
  if (!list.length) return () => {};

  container.innerHTML = `
    <div class="demo-box${compact ? " compact" : ""}">
      ${list.length > 1 ? `<div class="demo-chips" role="tablist"></div>` : ""}
      <p class="demo-q" data-q></p>
      <div class="demo-stage" data-stage>
        <div class="demo-art" data-art></div>
        <div class="demo-hud" data-hud></div>
        <span class="demo-finger" data-finger aria-hidden="true">👆</span>
      </div>
      <p class="demo-caption" data-cap aria-live="polite"></p>
      <div class="demo-controls">
        <button type="button" class="btn small" data-pp aria-label="Pause">⏸ Pause</button>
        <button type="button" class="btn small" data-replay aria-label="Replay">↻ Replay</button>
        <span class="demo-dots" data-dots aria-hidden="true"></span>
      </div>
    </div>`;
  const $ = (s) => container.querySelector(s);
  const stageEl = $("[data-stage]"), artEl = $("[data-art]"), hudEl = $("[data-hud]"), fingerEl = $("[data-finger]");
  const capEl = $("[data-cap]"), qEl = $("[data-q]"), ppBtn = $("[data-pp]"), dotsEl = $("[data-dots]");
  const chipsEl = $(".demo-chips");

  let sceneIdx = 0, scene = null, stepIdx = 0, base = null;
  let stepT = 0, speechDoneAt = null, useVoice = false, gate = false;
  let phase = "step";          // "step" | "gap"
  let gapT = 0;
  let paused = !autoplay;
  let raf = 0, last = 0, dead = false, lastTapT = -1, token = 0;
  let lastArt = "", lastHud = "";
  let fingerPx = null;
  const reduce = reducedMotion();

  function drawChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = list.map((s, i) => `<button type="button" role="tab" class="demo-chip${i === sceneIdx ? " on" : ""}" data-scene="${i}" aria-selected="${i === sceneIdx}">${i === sceneIdx ? `${i + 1} of ${list.length}: ` : `${i + 1}. `}${esc(s.title)}</button>`).join("");
    chipsEl.querySelectorAll("[data-scene]").forEach((b) => { b.onclick = () => { stop({ count: false }); startScene(Number(b.dataset.scene)); }; });
  }
  function drawDots() {
    dotsEl.innerHTML = scene.steps.map((_, i) => `<i class="${i === stepIdx ? "on" : i < stepIdx ? "done" : ""}"></i>`).join("");
  }

  function startScene(i) {
    token++;
    sceneIdx = (i + list.length) % list.length;
    const entry = list[sceneIdx];
    scene = buildScene(entry.key, entry.q, level);
    stepIdx = -1;
    base = { state: { ...scene.state0 }, finger: null };
    lastArt = lastHud = "";
    fingerPx = null;
    fingerEl.style.opacity = "0";
    qEl.textContent = scene.prompt ? `❓ ${scene.prompt}` : "";
    drawChips();
    nextStep();
  }

  function nextStep() {
    stepIdx += 1;
    phase = "step";
    if (stepIdx >= scene.steps.length) { finishScene(); return; }
    const step = scene.steps[stepIdx];
    // the step starts from where the last one ended
    if (stepIdx === 0) base = { state: { ...scene.state0 }, finger: null };
    stepT = 0; lastTapT = -1;
    speechDoneAt = null;
    capEl.textContent = step.caption;
    drawDots();
    const myToken = token;
    useVoice = isVoiceActive();
    gate = false;
    if (useVoice && !paused) {
      gate = true; // let whatever is being said finish first, then read this caption
      Promise.race([whenQuiet(), new Promise((r) => setTimeout(r, 9000))]).then(() => {
        if (myToken !== token || dead) return;
        gate = false;
        if (paused) { speechDoneAt = stepT; return; }
        speak(step.caption).then(() => { if (myToken === token) speechDoneAt = stepT; }, () => { if (myToken === token) speechDoneAt = stepT; });
      });
    }
    if (reduce) { const end = endOfStep(base, step.acts); paint(end.state, end.finger, null); }
  }

  function stepDuration(step) {
    const anim = stepAnimMs(step.acts) + 400;
    let d = Math.max(MIN_STEP_MS, anim);
    if (useVoice && speechDoneAt != null) d = Math.max(d, speechDoneAt + AFTER_SPEECH_MS);
    return d;
  }

  function finishScene() {
    onSceneDone?.(list[sceneIdx].key);
    phase = "gap"; gapT = 0;
  }

  function resolvePx(desc, st) {
    const d = plainTarget(desc, st);
    if (!d) return null;
    const sr = stageEl.getBoundingClientRect();
    if (d.pct) return { x: d.pct[0] * sr.width, y: d.pct[1] * sr.height };
    if (d.el) {
      const el = stageEl.querySelector(d.el);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width * (d.at?.[0] ?? 0.5), y: r.top - sr.top + r.height * (d.at?.[1] ?? 0.5) };
    }
    if (d.svg) {
      const svg = artEl.querySelector("svg");
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      return { x: r.left - sr.left + (d.svg[0] / vb.width) * r.width, y: r.top - sr.top + (d.svg[1] / vb.height) * r.height };
    }
    return null;
  }

  function paint(state, finger, tapP) {
    const art = scene.render(state);
    if (art !== lastArt) { artEl.innerHTML = art; lastArt = art; }
    const hud = scene.hud ? scene.hud(state) : "";
    if (hud !== lastHud) { hudEl.innerHTML = hud; lastHud = hud; }
    // the finger
    if (!finger || finger.to === false || finger.to == null) { fingerEl.style.opacity = "0"; return; }
    const to = resolvePx(finger.to, state);
    const from = finger.from && finger.from !== finger.to ? resolvePx(finger.from, state) : to;
    if (!to) return;
    const p = reduce ? 1 : (() => { const e = finger.p; return e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2; })();
    const start = from || { x: stageEl.clientWidth * 0.9, y: stageEl.clientHeight * 1.05 };
    const x = start.x + (to.x - start.x) * p, y = start.y + (to.y - start.y) * p;
    fingerPx = { x, y };
    const press = tapP == null ? 0 : Math.sin(tapP * Math.PI);
    fingerEl.style.opacity = "1";
    fingerEl.style.transform = `translate(${x.toFixed(1)}px, ${(y + press * 6).toFixed(1)}px) scale(${(1 - press * 0.16).toFixed(3)})`;
  }

  function ripple() {
    if (reduce || !fingerPx) return;
    const r = document.createElement("span");
    r.className = "demo-ripple";
    r.style.left = `${fingerPx.x}px`; r.style.top = `${fingerPx.y}px`;
    stageEl.appendChild(r);
    setTimeout(() => r.remove(), 700);
    try { sfx.tap(); } catch { /* sound is optional */ }
  }

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (!container.isConnected) { cleanup(); return; }
    const dt = Math.min(100, now - (last || now));
    last = now;
    if (!scene) return;
    if (phase === "gap") {
      if (!paused) { gapT += dt; if (gapT >= LOOP_GAP_MS) startScene(sceneIdx + 1); }
      return;
    }
    const step = scene.steps[stepIdx];
    if (!step) return;
    if (!paused && !gate) stepT += dt;
    const ev = evalStep(base, step.acts, reduce ? Infinity : stepT);
    paint(ev.state, ev.finger, reduce ? null : ev.tapP);
    if (!reduce && !paused) {
      for (const tt of tapTimes(step.acts)) if (lastTapT < tt && tt <= stepT) ripple();
    }
    lastTapT = stepT;
    if (!paused && !gate && stepT >= stepDuration(step)) {
      base = endOfStep(base, step.acts);
      nextStep();
    }
  }

  function setPaused(p) {
    paused = p;
    ppBtn.textContent = p ? "▶ Play" : "⏸ Pause";
    ppBtn.setAttribute("aria-label", p ? "Play" : "Pause");
    if (p) { stop({ count: false }); if (speechDoneAt == null) speechDoneAt = stepT; }
  }

  ppBtn.onclick = () => setPaused(!paused);
  $("[data-replay]").onclick = () => { stop({ count: false }); setPaused(false); startScene(sceneIdx); };

  setPaused(!autoplay);
  startScene(0);
  raf = requestAnimationFrame(frame);

  function cleanup() {
    dead = true;
    token++;
    cancelAnimationFrame(raf);
    stop({ count: false });
  }
  return cleanup;
}

export { sceneKey, SCENE_TITLES, levelScenes };

/** Dedicated "#/watch/:id" worked-example screen with direct "▶ Try It Myself!" jump to `#/play/:id/go`. */
export function viewWatch(app, id) {
  document.body.classList.remove("in-game");
  const level = levelById(id) || LEVELS[0];
  const lIdx = LEVELS.findIndex((x) => x.id === level.id);
  const next = LEVELS[lIdx + 1];

  app.innerHTML = `
    <section class="watch-screen">
      <div class="watch-top">
        <a class="btn small" href="#/">← Home</a>
        <span class="watch-tag">${esc(level.emoji)} ${esc(level.title)}</span>
        <a class="btn primary" href="#/play/${esc(level.id)}/go">▶ Try It Myself!</a>
      </div>
      <div class="card watch-card">
        <div class="watch-head">
          <p class="watch-rule">${level.teach}</p>
          <button class="btn small" type="button" data-read-rule>🔊 Hear rule</button>
        </div>
        <div class="watch-demo-host" data-watch-host></div>
        <div class="row center" style="margin-top:14px">
          <a class="btn big primary pulse" href="#/play/${esc(level.id)}/go">▶ Try It Myself!</a>
          ${next ? `<a class="btn small" href="#/watch/${esc(next.id)}">Next lesson: ${esc(next.emoji)} ${esc(next.title)} →</a>` : ""}
        </div>
      </div>
    </section>`;

  const stopDemo = mountAnimatedDemo(app.querySelector("[data-watch-host]"), level, { autoplay: true });
  app.querySelector("[data-read-rule]").onclick = () => speak(level.say, { force: true });

  return () => {
    stopDemo();
    stop({ count: false });
  };
}
