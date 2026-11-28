// A scratchpad for math: a see-through drawing layer over the question area, so a child can write
// numbers and sums with a finger, pen or mouse. Nothing is saved anywhere; it clears on the next question.
//
//   const pad = mountScratchpad({ host: stageWrap, button: scratchBtn });
//   pad.reset();          // next question: wipe the drawing and close
//   pad.setEnabled(false) // hide the button for questions with no numbers
//   pad.destroy();        // leaving the screen
//
// host: a container for the layer (it becomes position:relative; the layer covers all of it, so keep the
//       question's own elements INSIDE host but never replace host.innerHTML while the pad is mounted;
//       put the content in a child element). button: the ✏️ toggle in the game's top bar.
// While closed the layer is `hidden`, so it can never catch a tap meant for the game.
import { speak } from "./tts.js";
import { vary } from "./vary.js";

export const SCRATCH_LINES = [
  "Scratchpad: write your math here.",
  "Scratchpad is open. Write your math here!",
  "Scratchpad: write your numbers right on the screen.",
];
export const SCRATCH_COLORS = [
  { c: "#2b2340", label: "Dark pencil" },
  { c: "#1d7fe0", label: "Blue pen" },
  { c: "#e5484d", label: "Red pen" },
];
const PEN_W = 4.5, ERASE_W = 30;

const CSS = `
.kit-scratch { position: absolute; inset: 0; z-index: 20; border-radius: 16px; touch-action: none;
  background: rgb(255 249 219 / .55); box-shadow: inset 0 0 0 3px rgb(217 106 0 / .35); }
.kit-scratch[hidden] { display: none; }
.kit-scratch-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
.kit-scratch-bar { position: absolute; bottom: 6px; right: 6px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;
  padding: 4px; border-radius: 16px; background: var(--surface, #fff); border: 2px solid var(--border, #f1e0c6); box-shadow: 0 3px 0 var(--border, #f1e0c6); max-width: calc(100% - 12px); }
.kit-scratch-bar button { width: 48px; height: 48px; min-width: 48px; border-radius: 14px; border: 2px solid var(--border, #f1e0c6); background: var(--surface-2, #fff1d9);
  display: inline-grid; place-items: center; font-size: 1.35rem; cursor: pointer; color: var(--text, #2b2340); padding: 0; }
.kit-scratch-bar button[aria-pressed="true"] { border-color: var(--accent, #ff8a00); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #ff8a00) 30%, transparent); }
.kit-scratch-bar button:active { transform: translateY(2px); }
.kit-scratch-bar .kit-dot { width: 26px; height: 26px; border-radius: 50%; display: block; border: 2px solid rgb(0 0 0 / .25); }
[data-scratch-open] { min-height: 260px; }
@media (prefers-reduced-motion: reduce) { .kit-scratch-bar button:active { transform: none; } }
`;

function addCss() {
  if (document.getElementById("kit-scratch-css")) return;
  const s = document.createElement("style");
  s.id = "kit-scratch-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const pressureW = (base, p) => base * (0.55 + 1.3 * (p > 0 && p < 1 ? p : 0.5));

/** Draw the smooth piece of a stroke centred on point i (from the midpoint before it to the midpoint after it). */
function drawPiece(ctx, s, i) {
  const pts = s.pts, n = pts.length, p = pts[i];
  const a = i === 0 ? p : mid(pts[i - 1], p);
  const b = i === n - 1 ? p : mid(p, pts[i + 1]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (a.x === b.x && a.y === b.y) ctx.lineTo(b.x + 0.01, b.y); // a dot
  else ctx.quadraticCurveTo(p.x, p.y, b.x, b.y);
  ctx.lineWidth = s.erase ? ERASE_W : s.pen ? pressureW(PEN_W, p.p) : PEN_W;
  ctx.stroke();
}

function setupStroke(ctx, s) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.erase ? "#000" : s.color;
}

export function mountScratchpad({ host, button = null, onOpen, onClose } = {}) {
  if (!host) throw new Error("mountScratchpad needs a host element");
  addCss();
  if (getComputedStyle(host).position === "static") host.style.position = "relative";

  const layer = document.createElement("div");
  layer.className = "kit-scratch";
  layer.hidden = true;
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", "Scratchpad");
  layer.innerHTML = `
    <canvas class="kit-scratch-canvas"></canvas>
    <div class="kit-scratch-bar" role="toolbar" aria-label="Scratchpad tools">
      ${SCRATCH_COLORS.map((c, i) => `<button type="button" data-color="${i}" aria-label="${c.label}" aria-pressed="${i === 0}"><span class="kit-dot" style="background:${c.c}"></span></button>`).join("")}
      <button type="button" data-eraser aria-label="Eraser" aria-pressed="false">🧽</button>
      <button type="button" data-clear aria-label="Clear the scratchpad">🗑</button>
      <button type="button" data-close aria-label="Close the scratchpad">✕</button>
    </div>`;
  host.appendChild(layer);

  const canvas = layer.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const colorBtns = [...layer.querySelectorAll("[data-color]")];
  const eraserBtn = layer.querySelector("[data-eraser]");
  let strokes = [];
  let cur = null;
  let colorIdx = 0;
  let erasing = false;
  let open = false;
  let enabled = true;
  let cssW = 0, cssH = 0;

  function fit() {
    const r = host.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h || (w === cssW && h === cssH)) return;
    cssW = w; cssH = h;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    redraw();
  }

  function redraw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of strokes) {
      setupStroke(ctx, s);
      for (let i = 0; i < s.pts.length; i++) drawPiece(ctx, s, i);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (open) fit(); }) : null;
  ro?.observe(host);

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pointerType === "pen" || e.pointerType === "touch" ? e.pressure : 0.5 };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!open || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    cur = { color: SCRATCH_COLORS[colorIdx].c, erase: erasing, pen: e.pointerType === "pen", pts: [pos(e)], id: e.pointerId };
    strokes.push(cur);
    setupStroke(ctx, cur);
    drawPiece(ctx, cur, 0);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      const last = cur.pts[cur.pts.length - 1];
      const p = pos(ev);
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) continue;
      cur.pts.push(p);
      setupStroke(ctx, cur);
      drawPiece(ctx, cur, cur.pts.length - 2);
    }
  });
  const end = (e) => {
    if (!cur || (e && e.pointerId !== cur.id)) return;
    if (cur.pts.length > 1) { setupStroke(ctx, cur); drawPiece(ctx, cur, cur.pts.length - 1); }
    ctx.globalCompositeOperation = "source-over";
    cur = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  function chooseColor(i) {
    colorIdx = i; erasing = false;
    colorBtns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    eraserBtn.setAttribute("aria-pressed", "false");
  }
  colorBtns.forEach((b, i) => { b.onclick = () => chooseColor(i); });
  eraserBtn.onclick = () => {
    erasing = true;
    colorBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
    eraserBtn.setAttribute("aria-pressed", "true");
  };

  function clear() {
    strokes = [];
    cur = null;
    redraw();
  }
  layer.querySelector("[data-clear]").onclick = clear;

  function openPad() {
    if (open || !enabled) return;
    open = true;
    layer.hidden = false;
    host.setAttribute("data-scratch-open", "");
    button?.setAttribute("aria-pressed", "true");
    button?.setAttribute("aria-expanded", "true");
    cssW = cssH = 0;
    fit();
    speak(vary("scratch-open", SCRATCH_LINES));
    onOpen?.();
  }
  function closePad() {
    if (!open) return;
    open = false;
    cur = null;
    layer.hidden = true;
    host.removeAttribute("data-scratch-open");
    button?.setAttribute("aria-pressed", "false");
    button?.setAttribute("aria-expanded", "false");
    onClose?.();
  }
  layer.querySelector("[data-close]").onclick = closePad;
  const toggle = () => (open ? closePad() : openPad());
  if (button) {
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-expanded", "false");
    button.onclick = toggle;
  }
  const onKey = (e) => { if (e.key === "Escape" && open) closePad(); };
  document.addEventListener("keydown", onKey);

  return {
    open: openPad,
    close: closePad,
    toggle,
    clear,
    /** Next question: wipe the drawing and close the pad. */
    reset() { clear(); closePad(); },
    /** Show or hide the ✏️ button (a question with no numbers has no use for it). */
    setEnabled(on) {
      enabled = !!on;
      if (button) button.hidden = !enabled;
      if (!enabled) closePad();
    },
    isOpen: () => open,
    hasInk: () => strokes.some((s) => !s.erase),
    destroy() {
      document.removeEventListener("keydown", onKey);
      ro?.disconnect();
      layer.remove();
      host.removeAttribute("data-scratch-open");
    },
  };
}
