// The phonics lessons from the Angelio Studio (angelio.org/studio/reading.html), shared by Letter Lane and Read Aloud.
// phonics.js keeps a built-in copy; this swaps in the Studio's saved lessons before the levels are built:
//   1. the copy saved on this device last time (instant, works offline), else
//   2. the hub's /api/content/reading, waited for briefly on a first visit.
// A fresher copy found later is saved for next time, and onFresh() can redraw the home page with it.
// A lesson that doesn't look right is skipped, so one bad entry can't break the app.
import { PATTERNS } from "./phonics.js";

const STORE = "angelio:reading-content";
const BUILT_IN = PATTERNS.slice();
const looksRight = (p) => p && typeof p.id === "string" && Number.isInteger(p.grade) && Number.isInteger(p.level) && typeof p.title === "string"
  && Array.isArray(p.pictures) && p.pictures.length >= 3 && Array.isArray(p.words) && Array.isArray(p.sentences) && p.sentences.length && Array.isArray(p.focus ?? []);

/** Use these lessons (from the Studio), or the built-in ones if none look right. Returns true if anything changed. */
export function applyPatterns(list) {
  const ok = Array.isArray(list) ? list.filter(looksRight).map((p) => ({ focus: [], ...p })) : [];
  const next = ok.length ? ok : BUILT_IN;
  const changed = JSON.stringify(next) !== JSON.stringify(PATTERNS);
  PATTERNS.splice(0, PATTERNS.length, ...next);
  return changed;
}

const inBrowser = typeof location !== "undefined" && typeof fetch !== "undefined";
const STUDIO = inBrowser && new URLSearchParams(location.search).has("studio");
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch { /* no storage */ }
if (saved?.patterns) applyPatterns(saved.patterns);

let freshHandler = null;
/** Called once if a newer copy of the lessons arrives after the app started. */
export const onFresh = (fn) => { freshHandler = fn; };
const fetchFresh = async (ms) => {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch("/api/content/reading", { signal: ctrl.signal, cache: "no-cache" });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j?.patterns)) return null;
    try { localStorage.setItem(STORE, JSON.stringify(j)); } catch { /* full or blocked */ }
    return j;
  } catch { return null; } finally { clearTimeout(t); }
};
if (inBrowser && !STUDIO) {
  if (saved?.patterns) fetchFresh(8000).then((j) => { if (j && applyPatterns(j.patterns)) freshHandler?.(); });
  else { const j = await fetchFresh(2500); if (j) applyPatterns(j.patterns); }
}
