// Sticker World: place the stickers you earned in little playsets that open like a toy compact.
// Drag a sticker in (or just tap it), drag it around, tap it to make it dance, drag it back to the
// tray to put it away. More stickers open more playsets and more things to add.

import { SCENES, PROPS } from "./scenes.js";
import { loadStickers, pointsFor, loadWorld, saveWorld } from "./data.js";
import { jingleOnce, playJingle } from "../js/jingle.js";

const $ = (s, el = document) => el.querySelector(s);
// Stickers are emoji, or our own drawings saved as "art:mary" (art/mary.svg), sized like emoji.
const ART_NAMES = { mary: "Mary", "baby-jesus": "Baby Jesus", "sacred-heart": "Sacred Heart", chalice: "Chalice", monstrance: "Monstrance", bible: "Holy Bible", lily: "Lily" };
const art = (e) => (String(e).startsWith("art:") && ART_NAMES[e.slice(4)]
  ? `<img class="art-sticker" src="art/${e.slice(4)}.svg" alt="${ART_NAMES[e.slice(4)]}" draggable="false">`
  : String(e).replace(/[<>&"]/g, ""));
const stickers = loadStickers();
const points = pointsFor(stickers);
const world = loadWorld();
const sceneById = (id) => SCENES.find((s) => s.id === id);
const unlocked = (s) => points >= s.need;
if (!unlocked(sceneById(world.scene) ?? SCENES[0])) world.scene = "meadow";
let tab = stickers.length ? "mine" : "things";
let soundOn = (() => { try { return localStorage.getItem("angelio:world-sound") !== "off"; } catch { return true; } })();

// ───────── voice and sounds ─────────

let voiceAudio = null, saySeq = 0;
async function say(text) {
  const seq = ++saySeq;
  try {
    speechSynthesis.cancel();
    if (voiceAudio) {
      voiceAudio.pause();
      voiceAudio.currentTime = 0;
      voiceAudio = null;
    }
  } catch { /* ignore */ }
  if (!soundOn) return;
  try {
    // The games' read-aloud voice (same website), else the device's own voice.
    const r = await fetch(`/regroup/api/tts?voice=helena&text=${encodeURIComponent(text)}`);
    if (!r.ok) throw new Error();
    if (seq !== saySeq) return;
    const blob = await r.blob();
    if (seq !== saySeq) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    voiceAudio = audio;
    await audio.play();
  } catch {
    if (seq !== saySeq) return;
    try { const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch { /* no voice */ }
  }
}
let actx = null;
function blip(f, { to = null, dur = 0.12, type = "triangle", vol = 0.1 } = {}) {
  if (!soundOn) return;
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch { /* no audio */ }
}
const sfx = {
  pick: () => blip(520, { to: 780, dur: 0.08 }),
  drop: () => blip(300, { to: 160, dur: 0.12, type: "sine", vol: 0.14 }),
  dance: () => { blip(400, { to: 900, dur: 0.15 }); setTimeout(() => blip(900, { to: 500, dur: 0.15 }), 140); },
  away: () => blip(700, { to: 250, dur: 0.18, type: "sine" }),
  locked: () => blip(200, { dur: 0.15, type: "square", vol: 0.05 }),
};
let dragging = false, cancelDrag = null, pinching = null;
let selected = null; // index of the tapped sticker in this playset: it shows ➖ ➕ ↔
const MIN_S = 0.4, MAX_S = 2.2;
const clampS = (v) => Math.min(MAX_S, Math.max(MIN_S, v));
const DANCES = ["dance-hop", "dance-spin", "dance-wiggle"];

// ───────── screen ─────────

const app = $("#world");
let offWindow = null, wheelSave = 0, hintSaid = false;
function render() {
  offWindow?.(); offWindow = null;
  const scene = sceneById(world.scene);
  const placed = (world.placed[scene.id] ??= []);
  const usedHere = new Set(placed.filter((p) => p.k.startsWith("s:")).map((p) => p.k.slice(2)));
  const props = PROPS.filter((p) => points >= p.need).flatMap((p) => p.items);
  const nextProps = PROPS.find((p) => points < p.need);
  app.innerHTML = `
    <nav class="sets" aria-label="Playsets">
      ${SCENES.map((s) => `<button class="set${s.id === scene.id ? " on" : ""}${unlocked(s) ? "" : " locked"}" data-set="${s.id}" style="--c:${s.color}">
        <span class="em">${unlocked(s) ? s.emoji : "🔒"}</span><span>${s.name}</span>
        ${unlocked(s) ? "" : `<small>${s.need - points} more ⭐</small>`}</button>`).join("")}
    </nav>
    <div class="stage">
      <div class="scene" data-scene="${scene.id}">
        <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${scene.svg}</svg>
        <div class="items">${placed.map((p, i) => itemHtml(p, i)).join("")}</div>
        ${selected != null && placed[selected] ? `<div class="tools" style="left:clamp(84px, ${placed[selected].x}%, calc(100% - 84px));top:max(64px, calc(${placed[selected].y}% - ${(sizeOf(placed[selected]) * (placed[selected].s ?? 1) * 0.9).toFixed(1)}cqw))">
          <button data-tool="smaller" aria-label="Smaller">➖</button><button data-tool="bigger" aria-label="Bigger">➕</button><button data-tool="flip" aria-label="Turn around">↔️</button></div>` : ""}
      </div>
      <div class="tray">
        <div class="tabs" role="tablist">
          <button role="tab" class="tab${tab === "mine" ? " on" : ""}" data-tab="mine">⭐ My stickers <small>${stickers.length}</small></button>
          <button role="tab" class="tab${tab === "things" ? " on" : ""}" data-tab="things">🌳 Things</button>
        </div>
        <div class="pieces">
          ${tab === "mine"
            ? (stickers.length ? stickers.map((s) => `<button class="piece ${s.big ? "big" : "mini"}${usedHere.has(s.key) ? " used" : ""}" data-k="s:${s.key}" title="${s.big ? "Giant" : "Mini"} sticker from ${s.game}">${art(s.e)}</button>`).join("")
              : `<p class="empty">Finish a level in any <a href="/">Angelio game</a> to earn stickers. No mistakes makes a giant one!</p>`)
            : props.map((e) => `<button class="piece prop" data-k="p:${e}">${e}</button>`).join("") + (nextProps ? `<p class="next-up">🔒 ${nextProps.items.join(" ")} at ${nextProps.need} ⭐</p>` : "")}
        </div>
        <p class="tip">Drag or tap to add · tap a sticker to dance and resize (or pinch it) · drag back here to put away</p>
      </div>
    </div>`;
  wire(scene, placed);
}

/** Lower on the screen = closer = bigger, like a real playset. */
const stickerOf = (p) => (p.k.startsWith("s:") ? stickers.find((x) => x.key === p.k.slice(2)) : null);
/** Size in % of the playset's width (before the child's own resizing). */
const sizeOf = (p) => { const s = stickerOf(p); return (s ? (s.big ? 11 : 7) : 9) * (0.7 + p.y / 160); };
function itemHtml(p, i) {
  const s = stickerOf(p);
  const e = s ? s.e : p.k.slice(2);
  return `<span class="item${p.flip ? " flip" : ""}${i === selected ? " sel" : ""}" data-i="${i}" style="left:${p.x}%;top:${p.y}%;--size:${sizeOf(p).toFixed(2)};--s:${(p.s ?? 1).toFixed(2)};z-index:${Math.round(p.y)}">${art(e)}</span>`;
}

function wire(scene, placed) {
  app.querySelectorAll("[data-set]").forEach((b) => b.onclick = () => {
    const s = sceneById(b.dataset.set);
    if (!unlocked(s)) { sfx.locked(); say(`${s.name} opens when you have ${s.need} stars. Keep playing to earn stickers!`); return; }
    if (s.id === world.scene) return;
    world.scene = s.id; selected = null; saveWorld(world); render(); openLid(true);
  });
  app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { tab = b.dataset.tab; sfx.pick(); render(); });
  const sceneEl = $(".scene", app), tray = $(".tray", app);

  // Tray pieces: drag into the scene, or tap to drop one in a free-ish spot.
  app.querySelectorAll(".piece").forEach((el) => el.addEventListener("pointerdown", (e) => {
    if (el.classList.contains("used")) { sfx.locked(); say("That sticker is already in this playset."); return; }
    drag(e, el.innerHTML, (x, y, moved) => {
      if (!moved) { x = 15 + Math.random() * 70; y = 45 + Math.random() * 45; }
      else if (x == null) return;
      placed.push({ k: el.dataset.k, x, y });
      sfx.drop(); saveWorld(world); render();
      const it = app.querySelector(`.item[data-i="${placed.length - 1}"]`);
      it?.classList.add("dance-hop");
    });
  }));

  // Placed items: drag to move, tap to dance, drop on the tray to put away.
  app.querySelectorAll(".item").forEach((el) => el.addEventListener("pointerdown", (e) => {
    const i = +el.dataset.i;
    el.classList.add("lifted");
    drag(e, el.innerHTML, (x, y, moved, overTray) => {
      el.classList.remove("lifted");
      if (!moved) {
        // Tap: dance! (and show ➖ ➕ ↔ buttons if not already selected)
        const danceCls = DANCES[Math.floor(Math.random() * DANCES.length)];
        const triggerDance = (node) => {
          if (!node) return;
          node.classList.remove(...DANCES);
          void node.offsetWidth;
          node.classList.add(danceCls);
        };
        const first = selected == null;
        if (selected !== i) {
          selected = i;
          render();
          requestAnimationFrame(() => triggerDance(app.querySelector(`.item[data-i="${i}"]`)));
        } else {
          triggerDance(el);
        }
        sfx.dance();
        if (first && !hintSaid) { hintSaid = true; say("Make it bigger or smaller with the buttons. You can pinch it too!"); }
        return;
      }
      if (overTray || x == null) { placed.splice(i, 1); selected = null; sfx.away(); }
      else { selected = i; Object.assign(placed[i], { x, y, flip: x < placed[i].x ? true : x > placed[i].x ? false : placed[i].flip }); sfx.drop(); }
      saveWorld(world); render();
    }, el);
  }));

  // ➖ ➕ ↔ buttons for the tapped sticker
  app.querySelectorAll("[data-tool]").forEach((b) => b.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation(); ev.preventDefault();
    const p = placed[selected];
    if (!p) return;
    const t = b.dataset.tool;
    if (t === "flip") { p.flip = !p.flip; sfx.pick(); }
    else {
      const next = clampS((p.s ?? 1) * (t === "bigger" ? 1.25 : 0.8));
      if (next === (p.s ?? 1)) { sfx.locked(); return; }
      p.s = next; t === "bigger" ? blip(500, { to: 900, dur: 0.12 }) : blip(700, { to: 350, dur: 0.12 });
    }
    saveWorld(world); render();
  }));
  // Tap the background: put the buttons away
  sceneEl.addEventListener("pointerdown", (ev) => {
    if (selected != null && !ev.target.closest(".item, .tools") && !pinching) { selected = null; render(); }
  });

  // Pinch a sticker with two fingers to resize it
  const pts = new Map();
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  sceneEl.addEventListener("pointerdown", (ev) => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, target: ev.target });
    if (pts.size !== 2) return;
    const firstTarget = [...pts.values()][0].target.closest?.(".item");
    const i = firstTarget ? +firstTarget.dataset.i : selected;
    if (i == null || !placed[i]) return;
    cancelDrag?.();
    const el = app.querySelector(`.item[data-i="${i}"]`);
    pinching = { i, el, d0: dist(), s0: placed[i].s ?? 1, s: placed[i].s ?? 1 };
    app.querySelector(".tools")?.remove();
  }, true);
  const pinchMove = (ev) => {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, { ...pts.get(ev.pointerId), x: ev.clientX, y: ev.clientY });
    if (!pinching || pts.size < 2) return;
    pinching.s = clampS(pinching.s0 * (dist() / pinching.d0));
    pinching.el?.style.setProperty("--s", pinching.s.toFixed(2));
  };
  const pinchEnd = (ev) => {
    pts.delete(ev.pointerId);
    if (!pinching || pts.size >= 2) return;
    const { i, s } = pinching;
    pinching = null;
    if (placed[i]) { placed[i].s = s; selected = i; saveWorld(world); blip(600, { to: 800, dur: 0.1 }); }
    render();
  };
  addEventListener("pointermove", pinchMove, true);
  addEventListener("pointerup", pinchEnd, true);
  addEventListener("pointercancel", pinchEnd, true);
  offWindow = () => { removeEventListener("pointermove", pinchMove, true); removeEventListener("pointerup", pinchEnd, true); removeEventListener("pointercancel", pinchEnd, true); };

  // Mouse wheel over a sticker: bigger or smaller
  sceneEl.addEventListener("wheel", (ev) => {
    const it = ev.target.closest(".item");
    if (!it) return;
    ev.preventDefault();
    const i = +it.dataset.i, p = placed[i];
    p.s = clampS((p.s ?? 1) * (ev.deltaY < 0 ? 1.1 : 0.9));
    it.style.setProperty("--s", p.s.toFixed(2));
    clearTimeout(wheelSave); wheelSave = setTimeout(() => { selected = i; saveWorld(world); render(); }, 250);
  }, { passive: false });

  function drag(e, emoji, done, source = null) {
    e.preventDefault();
    if (dragging || pinching) return; // one drag at a time (a second finger pinches instead)
    dragging = true;
    document.querySelectorAll(".ghost").forEach((g) => g.remove());
    const start = { x: e.clientX, y: e.clientY };
    let ghost = null, moved = false;
    const pos = (ev) => {
      const r = sceneEl.getBoundingClientRect();
      const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      const t = tray.getBoundingClientRect();
      const overTray = ev.clientX >= t.left && ev.clientX <= t.right && ev.clientY >= t.top && ev.clientY <= t.bottom;
      return { x: inside ? Math.min(97, Math.max(3, ((ev.clientX - r.left) / r.width) * 100)) : null,
        y: inside ? Math.min(96, Math.max(8, ((ev.clientY - r.top) / r.height) * 100)) : null, overTray };
    };
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      if (pinching) return;
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) {
        moved = true; sfx.pick();
        ghost = document.createElement("div"); ghost.className = "ghost"; ghost.innerHTML = emoji; document.body.append(ghost);
        if (source) source.style.opacity = "0.25";
      }
      if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
    };
    const stop = () => {
      removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      ghost?.remove(); if (source) { source.style.opacity = ""; source.classList.remove("lifted"); }
      dragging = false; cancelDrag = null;
    };
    cancelDrag = stop; // a second finger turns the drag into a pinch
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      stop();
      if (ev.type === "pointercancel") { if (source) render(); return; } // interrupted: leave everything where it was
      const p = pos(ev);
      done(p.x, p.y, moved, p.overTray);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }
}

/** The playset lid swings open, like opening a toy compact. Only when a playset opens: after that
 * the lid is gone, so redrawing the scene (adding or moving stickers) never covers it again. */
function openLid(withSound) {
  const sceneEl = $(".scene", app), scene = sceneById(world.scene);
  if (!sceneEl) return;
  const lid = document.createElement("div");
  lid.className = "lid";
  lid.style.setProperty("--c", scene.color);
  lid.innerHTML = `<span>${scene.emoji}</span><b>${scene.name}</b>`;
  sceneEl.append(lid);
  if (withSound) playJingle("stickers");
  requestAnimationFrame(() => setTimeout(() => lid.classList.add("open"), 120));
  setTimeout(() => lid.remove(), 1200);
}

// Sound toggle and "how to play"
$("[data-sound]").textContent = soundOn ? "🔊" : "🔇";
$("[data-sound]").onclick = (e) => {
  soundOn = !soundOn;
  e.currentTarget.textContent = soundOn ? "🔊" : "🔇";
  try { localStorage.setItem("angelio:world-sound", soundOn ? "on" : "off"); } catch { /* ignore */ }
};
const HOW = "Welcome to Sticker World! Drag your stickers into the playset, or just tap one. Tap a sticker to make it dance, and use the plus and minus buttons to make it bigger or smaller. Drag it back down to put it away. The more stickers you earn, the more playsets open up!";
$("[data-how]").onclick = () => say(HOW);
$("[data-count]").innerHTML = `${points} <span aria-hidden="true">⭐</span>`;

render();
openLid(false);
// First tap of the visit: the opening chime, then (once ever) the instructions.
jingleOnce("stickers", () => soundOn);
addEventListener("pointerdown", () => {
  const newly = SCENES.filter((s) => s.need > world.seenPoints && s.need <= points && s.need > 0);
  if (newly.length) { setTimeout(() => say(`New playset open: ${newly.map((s) => s.name).join(" and ")}!`), 900); }
  else { try { if (!localStorage.getItem("angelio:world-intro")) { localStorage.setItem("angelio:world-intro", "1"); setTimeout(() => say(HOW), 900); } } catch { /* ignore */ } }
  world.seenPoints = points; saveWorld(world);
}, { once: true, capture: true });
