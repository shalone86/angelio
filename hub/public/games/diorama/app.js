// 3D Voxel Diorama & Prize Box controller (angelio.org/games/diorama/).
import { BOX_COST, CATEGORIES, DEFAULT_BASES, PIECES, pieceById, baseById, mergeBases } from "./catalog.js";
import {
  loadBells, saveBells, loadDiorama, saveDiorama, canOpenBox, openPrizeBox,
  placePiece, movePiece, rotatePiece, removePiece, clearBase, setBase,
} from "./store.js";
import { loadModels, createDioramaScene, renderThumbnails, createSpotlight, createBaseSpotlight } from "./scene.js";

const $ = (s, el = document) => el.querySelector(s);

let soundOn = (() => {
  try { return localStorage.getItem("angelio:world-sound") !== "off"; } catch { return true; }
})();

// ───────── Voice & Synthesized Sound Effects ─────────
let actx = null;
function blip(f, { to = null, dur = 0.14, type = "triangle", vol = 0.11, delay = 0 } = {}) {
  if (!soundOn) return;
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    const t = actx.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  } catch { /* audio blocked */ }
}

const sfx = {
  pop: () => blip(420, { to: 720, dur: 0.09, vol: 0.12 }),
  rotate: () => blip(540, { to: 680, dur: 0.07, vol: 0.09 }),
  hop: () => { blip(360, { to: 780, dur: 0.12 }); },
  remove: () => blip(480, { to: 210, dur: 0.14, type: "sine", vol: 0.11 }),
  chime: () => { blip(659, { dur: 0.3, type: "sine", vol: 0.11 }); blip(987, { dur: 0.45, type: "sine", vol: 0.08, delay: 0.07 }); },
  bell: () => {
    for (const [f, v] of [[523.25, 0.18], [1046.5, 0.06], [1568, 0.035]]) {
      blip(f, { dur: 1.3, type: "sine", vol: v });
    }
  },
  sheep: () => { blip(290, { to: 260, dur: 0.24, type: "sawtooth", vol: 0.06 }); },
  dog: () => { blip(460, { to: 320, dur: 0.09, vol: 0.11 }); blip(520, { to: 360, dur: 0.1, vol: 0.11, delay: 0.12 }); },
  fanfare: () => { [523, 659, 784, 1046].forEach((f, i) => blip(f, { dur: 0.28, vol: 0.11, delay: i * 0.09 })); },
};

let voiceAudio = null, saySeq = 0;
async function say(text) {
  const seq = ++saySeq;
  try {
    speechSynthesis.cancel();
    if (voiceAudio) { voiceAudio.pause(); voiceAudio.currentTime = 0; voiceAudio = null; }
  } catch { /* ignore */ }
  if (!soundOn || !text) return;
  try {
    const r = await fetch(`/snap/api/tts?voice=helena&text=${encodeURIComponent(text)}`);
    if (!r.ok) throw new Error();
    if (seq !== saySeq) return;
    const url = URL.createObjectURL(await r.blob());
    if (seq !== saySeq) { URL.revokeObjectURL(url); return; }
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    voiceAudio = audio;
    await audio.play();
  } catch {
    if (seq !== saySeq) return;
    try { const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch { /* no voice */ }
  }
}

// ───────── State ─────────
let bases = mergeBases(DEFAULT_BASES, []);
let bells = loadBells();
let diorama = loadDiorama(null, bases);
let category = "all";
let placingId = null;     // unlocked piece ID armed for tapping tiles
let selectedUid = null;   // placed item UID currently selected on the board
let movingUid = null;     // selected UID currently in "move to empty tile" mode
let models = {};
let thumbs = {};
let spotlight = null;

const stageCanvas = $("#stage");
const scene = createDioramaScene(stageCanvas, {
  onTapPiece: (uid) => {
    if (placingId || movingUid) {
      setHint("That tile already has something! Tap an empty square.");
      sfx.rotate();
      return;
    }
    selectedUid = selectedUid === uid ? null : uid;
    if (selectedUid) {
      const item = currentItems().find((x) => x.uid === selectedUid);
      const p = pieceById(item?.id);
      if (p) {
        (sfx[p.sound] ?? sfx.hop)();
        scene.hop(uid);
      }
    }
    syncSelectionUi();
  },
  onTapTile: (gx, gz) => {
    if (movingUid) {
      const r = movePiece(diorama, diorama.base, movingUid, gx, gz, bases);
      if (r.ok) {
        diorama = saveDiorama(r.diorama);
        sfx.pop();
        selectedUid = movingUid;
        movingUid = null;
        renderBoard(selectedUid);
      } else {
        setHint("Pick an empty square on the board!");
      }
      return;
    }
    if (placingId) {
      const r = placePiece(diorama, diorama.base, placingId, gx, gz, 0, bases);
      if (r.ok) {
        diorama = saveDiorama(r.diorama);
        const p = pieceById(placingId);
        (sfx[p?.sound] ?? sfx.pop)();
        selectedUid = r.item.uid;
        renderBoard(r.item.uid);
        renderShelf();
      } else {
        setHint("Tap an empty square to place it!");
      }
      return;
    }
    if (selectedUid) {
      selectedUid = null;
      syncSelectionUi();
    }
  },
});

const currentItems = () => diorama.placed[diorama.base] ?? [];

function setHint(custom = null) {
  const pill = $("#hint");
  const txt = $("#hint-text");
  const cancelBtn = $("#hint-cancel");
  if (movingUid) {
    const item = currentItems().find((x) => x.uid === movingUid);
    const p = pieceById(item?.id);
    txt.textContent = custom || `Tap an empty tile to move ${p?.name ?? "figurine"}`;
    pill.classList.add("active-mode");
    cancelBtn.hidden = false;
  } else if (placingId) {
    const p = pieceById(placingId);
    txt.textContent = custom || `Tap any empty tile to place ${p?.name ?? "figurine"}`;
    pill.classList.add("active-mode");
    cancelBtn.hidden = false;
  } else {
    txt.textContent = custom || "Tap a figurine below to place · Drag to spin";
    pill.classList.remove("active-mode");
    cancelBtn.hidden = true;
  }
}

function syncSelectionUi() {
  const bar = $("#sel-bar");
  const item = selectedUid ? currentItems().find((x) => x.uid === selectedUid) : null;
  if (!item) {
    selectedUid = null;
    bar.hidden = true;
    scene.setSelection(null, null);
    setHint();
    return;
  }
  const piece = pieceById(item.id);
  $("#sel-name").textContent = piece?.name ?? "Figurine";
  bar.hidden = false;
  scene.setSelection(item.gx, item.gz, movingUid ? "move" : "select");
  setHint();
}

function renderTopBar() {
  const activeBase = baseById(diorama.base, bases) ?? bases[0];
  $("#world-label").textContent = `${activeBase.emoji} ${activeBase.short ?? activeBase.name}`;
  $("#worlds-count").textContent = `${diorama.unlockedBases.length}/${bases.length}`;

  const check = canOpenBox(bells, diorama, bases);
  $("#top-bells").textContent = `🔔 ${bells.bells}`;
  const chip = $("#prize-chip");
  const btn = $("#prize-btn");
  if (check.reason === "welcome") {
    chip.textContent = "🎁 FREE!";
    btn.classList.add("ready");
  } else if (check.ok) {
    chip.textContent = `🎁 Open (${BOX_COST})`;
    btn.classList.add("ready");
  } else if (check.reason === "complete") {
    chip.textContent = "🏆 All!";
    btn.classList.remove("ready");
  } else {
    chip.textContent = `🎁 ${bells.bells}/${BOX_COST}`;
    btn.classList.remove("ready");
  }

  $("#sound-btn").textContent = soundOn ? "🔊" : "🔇";
  $("#sound-btn").setAttribute("aria-pressed", String(soundOn));
}

function renderBoard(popUid = null) {
  const activeBase = baseById(diorama.base, bases) ?? bases[0];
  scene.setBase(activeBase, models);
  scene.syncPlaced(currentItems(), models, { popUid });
  syncSelectionUi();
}

function renderShelf() {
  $("#count-pill").textContent = `${diorama.unlocked.length} / ${PIECES.length}`;
  $("#cats").innerHTML = CATEGORIES.map((c) =>
    `<button type="button" class="cat-tab" role="tab" data-cat="${c.id}" aria-selected="${category === c.id}">${c.emoji} ${c.label}</button>`
  ).join("");

  const counts = {};
  for (const item of currentItems()) counts[item.id] = (counts[item.id] ?? 0) + 1;

  const unlockedSet = new Set(diorama.unlocked);
  const shown = PIECES.filter((p) => category === "all" || p.category === category);
  shown.sort((a, b) => Number(unlockedSet.has(b.id)) - Number(unlockedSet.has(a.id)));

  $("#shelf").innerHTML = shown.map((p) => {
    const owned = unlockedSet.has(p.id);
    if (!owned) {
      return `<button type="button" class="piece-card locked" data-locked="${p.id}" aria-label="Mystery figurine — open Prize Box to unlock">
        <span class="rarity-dot ${p.rarity}"></span>
        <div class="piece-mystery">🎁</div>
        <span class="piece-name">???</span>
      </button>`;
    }
    const armed = placingId === p.id;
    const qty = counts[p.id] ?? 0;
    const img = thumbs[p.id]
      ? `<img class="piece-thumb" src="${thumbs[p.id]}" alt="" width="64" height="64">`
      : `<div class="piece-mystery">🧱</div>`;
    return `<button type="button" class="piece-card${armed ? " armed" : ""}" data-piece="${p.id}" aria-pressed="${armed}">
      <span class="rarity-dot ${p.rarity}"></span>
      ${qty ? `<span class="piece-qty">×${qty}</span>` : ""}
      ${img}
      <span class="piece-name">${p.name}</span>
    </button>`;
  }).join("");
}

// ───────── Worlds Modal ─────────
function switchWorld(baseId) {
  const r = setBase(diorama, baseId, bases);
  if (!r.ok) return false;
  diorama = saveDiorama(r.diorama);
  selectedUid = null;
  movingUid = null;
  const info = baseById(diorama.base, bases);
  sfx.pop();
  say(info?.say);
  renderTopBar();
  renderBoard();
  renderShelf();
  return true;
}

function openWorldsModal() {
  const modal = $("#worlds-modal");
  modal.hidden = false;
  $("#worlds-modal-count").textContent = `${diorama.unlockedBases.length} / ${bases.length}`;

  const owned = new Set(diorama.unlockedBases);
  const ordered = [...bases].sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)));

  $("#worlds-grid").innerHTML = ordered.map((b) => {
    const isOwned = owned.has(b.id);
    const active = diorama.base === b.id;
    const placedCount = (diorama.placed[b.id] ?? []).length;
    const swatch = `background:linear-gradient(135deg, ${b.palette.sky} 0%, ${b.palette.tileA} 68%, ${b.palette.accent} 100%)`;
    const badge = active ? "✓ Here" : isOwned ? `${placedCount} 🧱` : "🔒 Prize Box";
    return `<button type="button" class="world-card${active ? " active" : ""}${isOwned ? "" : " locked"}" data-world="${b.id}" data-owned="${isOwned ? "1" : "0"}">
      <div class="world-swatch" style="${swatch}">
        <span>${b.emoji}</span>
        <span class="world-chip">${badge}</span>
      </div>
      <b>${b.name}</b>
      <small>${isOwned ? b.blurb : "Unlock inside the Prize Box!"}</small>
    </button>`;
  }).join("");
}

function closeWorldsModal() {
  $("#worlds-modal").hidden = true;
}

// ───────── Crossy Road Prize Box Modal ─────────
function cleanupSpotlight() {
  spotlight?.dispose();
  spotlight = null;
}

function openPrizeModal(forceReveal = null) {
  cleanupSpotlight();
  const modal = $("#prize-modal");
  modal.hidden = false;
  $("#modal-count").textContent = `${diorama.unlocked.length}/${PIECES.length} 🧱 · ${diorama.unlockedBases.length}/${bases.length} 🌍`;
  $("#modal-bells").textContent = `🔔 ${bells.bells}`;

  const body = $("#prize-body");
  if (forceReveal) {
    const nextCheck = canOpenBox(bells, diorama, bases);
    if (forceReveal.kind === "base") {
      const b = forceReveal.base;
      body.innerHTML = `
        <div class="reveal-stage"><canvas id="prize-canvas" class="world-spot" width="360" height="220"></canvas></div>
        <span class="rarity-tag rare">🌍 NEW WORLD UNLOCKED!</span>
        <h2 id="prize-heading">${b.emoji} ${b.name}</h2>
        <p>${b.blurb}</p>
        <button type="button" class="prize-cta teal" id="visit-won">🌍 Visit ${b.short ?? b.name}!</button>
        ${nextCheck.ok ? `<button type="button" class="prize-cta secondary" id="open-another">🎁 Open Another (${nextCheck.cost} 🔔)</button>` : ""}
      `;
      spotlight = createBaseSpotlight($("#prize-canvas"), b, models);
      $("#visit-won").onclick = () => {
        closePrizeModal();
        switchWorld(b.id);
      };
      const another = $("#open-another");
      if (another) another.onclick = () => triggerUnbox();
      return;
    }

    const p = forceReveal.piece ?? forceReveal;
    const rarityLabel = p.rarity === "rare" ? "🌟 FEAST RARE!" : p.rarity === "special" ? "💙 SPECIAL!" : "✨ NEW FIGURINE!";
    body.innerHTML = `
      <div class="reveal-stage"><canvas id="prize-canvas" width="240" height="220"></canvas></div>
      <span class="rarity-tag ${p.rarity}">${rarityLabel}</span>
      <h2 id="prize-heading">${p.name}</h2>
      <p>${p.blurb}</p>
      <button type="button" class="prize-cta teal" id="place-won">🧱 Place in Diorama!</button>
      ${nextCheck.ok ? `<button type="button" class="prize-cta secondary" id="open-another">🎁 Open Another (${nextCheck.cost} 🔔)</button>` : ""}
    `;
    spotlight = createSpotlight($("#prize-canvas"), p, models);
    $("#place-won").onclick = () => {
      closePrizeModal();
      placingId = p.id;
      movingUid = null;
      selectedUid = null;
      renderShelf();
      syncSelectionUi();
    };
    const another = $("#open-another");
    if (another) another.onclick = () => triggerUnbox();
    return;
  }

  const check = canOpenBox(bells, diorama, bases);
  if (check.reason === "complete") {
    body.innerHTML = `
      <div class="gift-stage"><div class="sunburst"></div><div style="position:relative;font-size:4.2rem">🏆</div></div>
      <h2 id="prize-heading">Complete Collection!</h2>
      <p>You unlocked all ${PIECES.length} figurines and all ${bases.length} Voxel Diorama worlds!</p>
      <button type="button" class="prize-cta teal" id="done-prize">🧱 Build in Diorama</button>
    `;
    $("#done-prize").onclick = closePrizeModal;
    return;
  }

  if (check.ok) {
    body.innerHTML = `
      <div class="gift-stage">
        <div class="sunburst"></div>
        <button type="button" class="gift-crate" id="crate-tap" aria-label="Tap to open Prize Box"><span class="gift-bow">🎀</span></button>
      </div>
      <h2 id="prize-heading">${check.free ? "Free Welcome Prize Box!" : "Parish Prize Box"}</h2>
      <p>${check.free ? "Welcome! Tap the gift crate to unlock your first extra figurine or world." : `Spend ${BOX_COST} Parish Bells to unlock a new figurine or diorama world (${check.remaining} left).`}</p>
      <button type="button" class="prize-cta" id="open-now">🎁 ${check.free ? "Open FREE Box!" : `Open Box (${BOX_COST} 🔔)`}</button>
    `;
    $("#crate-tap").onclick = triggerUnbox;
    $("#open-now").onclick = triggerUnbox;
    return;
  }

  const pct = Math.min(100, Math.round((bells.bells / BOX_COST) * 100));
  body.innerHTML = `
    <div class="gift-stage"><div style="font-size:4rem;opacity:.85">🎁</div></div>
    <h2 id="prize-heading">Need ${check.need} More Bells!</h2>
    <p>Play Candle Rack, Mass Usher, Monastery Porter, Saints Match, or Garden Givers to earn Parish Bells.</p>
    <div class="bell-bar"><i style="width:${pct}%"></i></div>
    <a class="prize-cta" href="/games/">🎮 Play a Game</a>
  `;
}

function triggerUnbox() {
  const res = openPrizeBox(bells, diorama, Math.random, bases);
  if (!res.ok) {
    openPrizeModal();
    return;
  }
  bells = saveBells(res.bells);
  diorama = saveDiorama(res.diorama);
  sfx.fanfare();
  if (res.kind === "base") {
    say(`You unlocked a new diorama world: ${res.base.name}! ${res.base.blurb}`);
  } else {
    say(`You unlocked ${res.piece.name}! ${res.piece.blurb}`);
  }
  renderTopBar();
  renderShelf();
  openPrizeModal(res.kind === "base" ? { kind: "base", base: res.base } : { kind: "piece", piece: res.piece });
}

function closePrizeModal() {
  cleanupSpotlight();
  $("#prize-modal").hidden = true;
}

// ───────── Wire Events ─────────
$("#worlds-btn").onclick = openWorldsModal;
$("#worlds-close").onclick = closeWorldsModal;
$("#worlds-backdrop").onclick = closeWorldsModal;
$("#worlds-grid").addEventListener("click", (e) => {
  const card = e.target.closest("[data-world]");
  if (!card) return;
  if (card.dataset.owned === "1") {
    closeWorldsModal();
    switchWorld(card.dataset.world);
  } else {
    closeWorldsModal();
    sfx.rotate();
    openPrizeModal();
  }
});

$("#cats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  category = b.dataset.cat;
  sfx.rotate();
  renderShelf();
});

$("#shelf").addEventListener("click", (e) => {
  const card = e.target.closest("[data-piece]");
  if (card) {
    const id = card.dataset.piece;
    placingId = placingId === id ? null : id;
    movingUid = null;
    selectedUid = null;
    sfx.pop();
    renderShelf();
    syncSelectionUi();
    return;
  }
  if (e.target.closest("[data-locked]")) {
    sfx.rotate();
    openPrizeModal();
  }
});

$("#sel-bar").addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act || !selectedUid) return;
  if (act === "rotate") {
    const r = rotatePiece(diorama, diorama.base, selectedUid, 1, bases);
    if (r.ok) {
      diorama = saveDiorama(r.diorama);
      sfx.rotate();
      renderBoard();
    }
  } else if (act === "hop") {
    const item = currentItems().find((x) => x.uid === selectedUid);
    const p = pieceById(item?.id);
    (sfx[p?.sound] ?? sfx.hop)();
    scene.hop(selectedUid);
  } else if (act === "move") {
    movingUid = movingUid === selectedUid ? null : selectedUid;
    placingId = null;
    sfx.pop();
    syncSelectionUi();
  } else if (act === "remove") {
    const r = removePiece(diorama, diorama.base, selectedUid, bases);
    if (r.ok) {
      diorama = saveDiorama(r.diorama);
      selectedUid = null;
      movingUid = null;
      sfx.remove();
      renderBoard();
      renderShelf();
    }
  }
});

$("#hint-cancel").onclick = () => {
  placingId = null;
  movingUid = null;
  sfx.rotate();
  renderShelf();
  syncSelectionUi();
};

$("#clear-btn").onclick = () => {
  if (!currentItems().length) return;
  const info = baseById(diorama.base, bases);
  if (!confirm(`Clear all figurines from ${info?.name ?? "this scene"}? Your unlocked collection stays saved.`)) return;
  const r = clearBase(diorama, diorama.base, bases);
  if (r.ok) {
    diorama = saveDiorama(r.diorama);
    selectedUid = null;
    movingUid = null;
    sfx.remove();
    renderBoard();
    renderShelf();
  }
};

$("#cam-in").onclick = () => { scene.zoomBy(-18); sfx.rotate(); };
$("#cam-out").onclick = () => { scene.zoomBy(18); sfx.rotate(); };
$("#cam-reset").onclick = () => { scene.resetCamera(); sfx.rotate(); };

$("#sound-btn").onclick = () => {
  soundOn = !soundOn;
  try { localStorage.setItem("angelio:world-sound", soundOn ? "on" : "off"); } catch { /* ignore */ }
  if (!soundOn) try { speechSynthesis.cancel(); voiceAudio?.pause(); } catch { /* ignore */ }
  renderTopBar();
};

$("#prize-btn").onclick = () => openPrizeModal();
$("#prize-close").onclick = closePrizeModal;
$("#prize-backdrop").onclick = closePrizeModal;

addEventListener("resize", () => scene.resize());
addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("#prize-modal").hidden) closePrizeModal();
    if (!$("#worlds-modal").hidden) closeWorldsModal();
  }
});

// ───────── Boot ─────────
renderTopBar();
renderBoard();
thumbs = renderThumbnails(PIECES, models);
renderShelf();

if (location.hash === "#box") openPrizeModal();
else if (location.hash === "#worlds") openWorldsModal();

async function loadStudioScenes() {
  try {
    const r = await fetch("/api/diorama/scenes");
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.scenes) ? j.scenes : [];
  } catch {
    return [];
  }
}

loadStudioScenes().then(async (custom) => {
  if (custom.length) {
    bases = mergeBases(DEFAULT_BASES, custom);
    diorama = loadDiorama(null, bases);
    renderTopBar();
    renderBoard();
  }
  const allSlugs = [
    ...PIECES.flatMap((p) => p.vox ?? []),
    ...bases.map((b) => b.backdropSlug).filter(Boolean),
  ];
  const loaded = await loadModels(allSlugs);
  if (!Object.keys(loaded).length) return;
  models = loaded;
  thumbs = renderThumbnails(PIECES, models);
  renderBoard();
  renderShelf();
});

window.__diorama = {
  getState: () => ({ bells, diorama, bases: bases.length, models: Object.keys(models).length }),
  openBox: () => openPrizeModal(),
  openWorlds: () => openWorldsModal(),
  switchWorld: (id) => switchWorld(id),
};

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("/games/sw.js", { scope: "/games/" }).catch(() => {});
}
