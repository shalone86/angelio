// Settings and progress in this browser's localStorage. Nothing leaves the device.
// Call init(key, extraSettings) once, first thing in app.js.

const BASE_SETTINGS = {
  readAloud: true, // say every step out loud (for kids still learning to read)
  sounds: true, // sound effects
  ttsSource: "auto", // auto | server | browser
  voice: "helena", // Workers AI (Deepgram Aura-2) English voice
  browserVoice: "",
  slow: false,
  passcode: "", // only if APP_PASSCODE is set on the Worker
};

import { shareSticker } from "./stickers.js";

let KEY = "app:v1";
let DEFAULTS = { settings: { ...BASE_SETTINGS }, levels: {}, seen: {}, stickers: [], solved: 0 };
let state = structuredClone(DEFAULTS);

export function init(key, extraSettings = {}) {
  KEY = key;
  DEFAULTS = { settings: { ...BASE_SETTINGS, ...extraSettings }, levels: {}, seen: {}, stickers: [], solved: 0 };
  state = load();
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s) {
      if (s.stages && !s.levels) s.levels = s.stages; // Regroup saved its levels as "stages" before the shared kit
      if (!s.settings?.voiceV2 && s.settings?.voice === "thalia") delete s.settings.voice;
      if (s.settings) s.settings.voiceV2 = true;
      return { ...structuredClone(DEFAULTS), ...s, settings: { ...DEFAULTS.settings, ...s.settings } };
    }
  } catch { /* private mode or corrupted: start fresh */ }
  return structuredClone(DEFAULTS);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
}

export const settings = () => state.settings;
export function setSetting(k, v) { state.settings[k] = v; save(); }

export const progress = (id) => state.levels[id] ?? { plays: 0, done: 0, stars: 0 };
export const levels = () => state.levels;
export const seenQuestions = (id) => state.seen?.[id] ?? [];
export function rememberQuestions(id, keys, maxKeep = 15) {
  state.seen ??= {};
  const prev = state.seen[id] ?? [];
  state.seen[id] = [...prev, ...keys].slice(-maxKeep);
  save();
}
/** Stickers as { e, big, id }. Older saves stored plain emoji (counted as giant) or { emoji, mini }. */
export const stickers = () => state.stickers.map((s) =>
  typeof s === "string" ? { e: s, big: s !== "⭐" } : { e: s.e ?? s.emoji, big: s.big ?? !s.mini, id: s.id });
export const solved = () => state.solved;
export function solvedOne() { state.solved++; save(); }

/**
 * Record a finished level (keeps the best stars) and its sticker: one per level, giant when `big`
 * (or 3 stars), mini otherwise; pass `sticker = null` when the round did not earn one.
 * Returns { e, big, isNew, grew, first }.
 */
export function finishLevel(id, stars, sticker = null, big = stars >= 3) {
  const p = (state.levels[id] ??= { plays: 0, done: 0, stars: 0 });
  const first = !p.done;
  p.plays++;
  p.done++;
  p.stars = Math.max(p.stars, stars);
  p.at = Date.now();
  let entry = state.stickers.find((s) => s && typeof s === "object" && s.id === id);
  let isNew = false, grew = false;
  if (!entry && sticker) { entry = { e: sticker, big: !!big, id }; state.stickers.push(entry); isNew = true; }
  else if (entry && big && !entry.big) { entry.big = true; grew = true; }
  save();
  if (entry) shareSticker(KEY.split(":")[0], id, entry.e, entry.big);
  return entry ? { e: entry.e, big: entry.big, isNew, grew, first } : { e: null, big: false, isNew: false, grew: false, first };
}
export function resetProgress() { state.levels = {}; state.stickers = []; state.solved = 0; save(); }

export function dailyRecord(dateKey) {
  const cur = state.settings.daily;
  return cur?.date === dateKey ? cur : { date: dateKey, best: 0, stars: 0, plays: 0 };
}

export function saveDaily(dateKey, score, stars) {
  const prev = dailyRecord(dateKey);
  const next = { date: dateKey, best: Math.max(prev.best, score), stars: Math.max(prev.stars, stars), plays: prev.plays + 1 };
  setSetting("daily", next);
  return { ...next, newBest: score > prev.best, prevBest: prev.best };
}
