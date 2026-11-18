// Read-aloud: the server voice (Workers AI / Deepgram Aura-2 English) when it's there,
// otherwise the browser's own English voice. Young kids hear every step instead of reading it.
//
// Reliability fixes carried over from the articulation app:
// - Chrome's speechSynthesis can get stuck: speak() right after cancel() is dropped, or onend
//   never fires. We keep a reference to the utterance, wait a beat after cancel(), and time out.
// - One <audio> element is reused, and every playback promise settles (ended, paused, error or
//   timeout), so a failed clip can never block the game.

import { settings } from "./store.js";
import { health, serverTts } from "./api.js";

const cache = new Map(); // `${voice}|${text}` → Promise<object URL>
const player = typeof Audio !== "undefined" ? new Audio() : null;
let playId = 0;
let utterance; // Chrome drops events for garbage-collected utterances

export function browserVoices() {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("en"));
}

function pickVoice() {
  const voices = browserVoices();
  return voices.find((v) => v.name === settings().browserVoice)
    ?? voices.find((v) => /en[-_]US/i.test(v.lang) && /natural|neural|enhanced|premium|google|samantha/i.test(v.name))
    ?? voices.find((v) => /en[-_]US/i.test(v.lang)) ?? voices[0] ?? null;
}

// When the Cloudflare voice fails (for example the free daily allowance is used up), use the
// device voice for a while instead of trying (and waiting for) the server before every sentence.
const RETRY_SERVER_MS = 10 * 60 * 1000;
let serverFailedAt = 0;

async function useServer() {
  const src = settings().ttsSource;
  if (src === "browser") return false;
  if (Date.now() - serverFailedAt < RETRY_SERVER_MS) return false;
  if (src === "server") return true;
  return !!(await health()).tts;
}

function serverUrl(text, voice) {
  const key = `${voice}|${text}`;
  if (!cache.has(key)) {
    const p = serverTts(text, voice).then((blob) => URL.createObjectURL(blob));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key);
}

export function stop() {
  playId++;
  if (player && !player.paused) player.pause();
  if (typeof speechSynthesis !== "undefined" && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function playThrough(url, rate) {
  return new Promise((resolve, reject) => {
    const done = () => { player.onended = player.onpause = player.onerror = null; clearTimeout(timer); resolve(); };
    player.onended = player.onpause = done;
    player.onerror = () => { done(); reject(new Error("Audio could not be played.")); };
    const timer = setTimeout(done, 20000);
    player.src = url;
    player.preservesPitch = true;
    player.playbackRate = rate;
    player.play().catch((e) => { done(); reject(e); });
  });
}

async function speakBrowser(text, rate, id) {
  if (typeof speechSynthesis === "undefined") return;
  const synth = speechSynthesis;
  if (synth.speaking || synth.pending) { synth.cancel(); await sleep(80); }
  if (id !== playId) return;
  synth.resume();
  await new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    utterance = u;
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-US";
    u.rate = rate;
    u.pitch = 1.1;
    let started = false;
    const finish = () => { clearTimeout(t1); clearTimeout(t2); resolve(); };
    u.onstart = () => { started = true; };
    u.onend = u.onerror = finish;
    const t1 = setTimeout(() => !started && finish(), 1500);
    const t2 = setTimeout(finish, 2500 + text.length * 110 / rate);
    synth.speak(u);
  });
}

// Long lines start sooner: they're split into sentences that are all fetched at once and played in
// order, so the voice starts as soon as the first short sentence is ready (a whole lesson card took
// several seconds to make). Text in {{double braces}} is a sound that may have a grown-up's recording
// (see setClips); without one it's read like the rest of the text.
let clipFor = () => null;

// Whole lines a grown-up recorded (angelio.org/admin/sounds, the "Lines" tabs), found by their exact words:
// a whole thing to say, or one sentence of it ("Great job!"). Mom's or Dad's voice, whichever is picked, else
// the other one, else the robot. The list of recordings comes from the hub (/api/clips).
let lineIndex = null;
/** The id of a line: "line-" + a short hash of its words (the recorder uses the same one). */
export function lineId(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text).replace(/\s+/g, " ").trim()) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return `line-${h.toString(36)}`;
}
const voicePick = () => { try { return (settings().soundVoice ?? localStorage.getItem("angelio:voice")) === "m" ? "m" : "f"; } catch { return "f"; } };
function lineClip(text) {
  if (!lineIndex) return null;
  const id = lineId(text), want = voicePick();
  for (const set of [want, want === "m" ? "f" : "m"]) { const v = lineIndex[set]?.[id]; if (v != null) return `/api/clip?set=${set}&id=${id}&v=${v}`; }
  return null;
}
if (typeof fetch !== "undefined" && typeof location !== "undefined" && location.protocol === "https:")
  fetch("/api/clips").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.clips) lineIndex = j.clips; }).catch(() => {});
/** fn(sound) → URL of a recording of that sound, or null. */
export function setClips(fn) { clipFor = fn; }
const MARK = /\{\{([^}]+)\}\}/g;
/** The text without {{ }} marks, for showing on screen. */
/** Fetch these sounds now (recordings, or the voice for ones nobody recorded), so they play straight away later. */
export function preloadSounds(sounds) {
  if (typeof fetch === "undefined") return;
  for (const s of sounds) {
    if (!s) continue;
    const url = clipFor(s);
    if (url) fetch(url).catch(() => {});
  }
}
export const unmark = (t) => String(t ?? "").replace(MARK, "$1");

/** Sentence by sentence: a sentence someone recorded (marks and all) plays as it is; the rest as before. */
function pieces(text) {
  const out = [];
  for (const sentence of String(text).split(/(?<=[.!?])\s+/)) {
    if (!sentence.trim()) continue;
    const rec = lineClip(sentence);
    if (rec) out.push({ clip: rec, text: unmark(sentence) }); else out.push(...piecesOf(sentence));
  }
  return out;
}
function piecesOf(text) {
  const out = [];
  let buf = "", last = 0;
  const flush = () => {
    const t = buf.replace(/^[\s,;:]+/, "").trim();
    buf = "";
    if (!t || !/[\p{L}\p{N}]/u.test(t)) return; // nothing to say (a lone "." between two sounds)
    // One clip per sentence, so stock lines ("Great job!") are made once and reused.
    for (const s of t.split(/(?<=[.!?])\s+/)) if (s) out.push({ text: s });
  };
  for (const m of text.matchAll(MARK)) {
    buf += text.slice(last, m.index);
    last = m.index + m[0].length;
    const clip = clipFor(m[1]);
    if (clip) { flush(); out.push({ clip, text: m[1] }); } else buf += m[1];
  }
  buf += text.slice(last);
  flush();
  return out;
}

async function playPieces(text, rate, id, server) {
  const list = pieces(text);
  const whole = player && lineClip(text); // the whole thing, recorded in one go
  if (whole) { try { await playThrough(whole, rate); return; } catch { /* fall back to the pieces */ } }
  const voice = settings().voice;
  const urls = list.map((p) => (p.clip || !server ? null : serverUrl(p.text, voice)));
  urls.forEach((u) => u?.catch(() => {}));
  for (let i = 0; i < list.length; i++) {
    if (id !== playId) return;
    const p = list[i];
    if (p.clip && player) {
      try { await playThrough(p.clip, rate); continue; } catch { if (server) urls[i] = serverUrl(p.text, voice); }
    }
    if (!server) { await speakBrowser(p.text, rate * 0.95, id); continue; }
    let url;
    try { url = await urls[i]; } catch (e) {
      // The server voice stopped answering: the device voice says the rest (recordings still play).
      serverFailedAt = Date.now();
      server = false;
      console.warn("Server voice failed, using the device voice", e);
      i--;
      continue;
    }
    if (id !== playId) return;
    await playThrough(url, rate);
  }
}

// What's being said now, so a game can wait until the voice is quiet (see whenQuiet).
let lastSpeech = Promise.resolve();
/** Say text aloud (if read-aloud is on, or force). rate: 0.65 for slowly. Resolves when done. Never throws. */
export function speak(text, opts) {
  if (typeof window !== "undefined") window.__angelioSaid?.(text); // tools/voice-lines.mjs lists the lines to record
  const p = speakNow(text, opts);
  lastSpeech = p;
  return p;
}
/** Resolves when the voice has finished, including anything said while waiting. */
export async function whenQuiet() {
  let p;
  do { p = lastSpeech; await p.catch(() => {}); } while (p !== lastSpeech);
}

async function speakNow(text, { force = false, rate: speed = 1 } = {}) {
  if (!text || (!settings().readAloud && !force)) return;
  stop();
  let clean = String(text ?? "")
    .replace(/[▲●◡▬♠⎵]/g, "")
    .replace(/_{2,}/g, "blank")
    .replace(/\bpronouns\b/gi, "pro-nouns")
    .replace(/\bpronoun\b/gi, "pro-noun")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return;
  // Capitalize single isolated word so TTS gives it warm sentence-start + sentence-end prosody
  if (!/\s/.test(clean) && /^[a-z]/.test(clean)) {
    clean = clean[0].toUpperCase() + clean.slice(1);
  }
  if (!/[.!?]$/.test(clean)) clean += ".";
  const id = playId;
  const rate = (settings().slow ? 0.8 : 1) * speed;
  try {
    if (player && (await useServer())) {
      try {
        return await playPieces(clean, rate, id, true);
      } catch (e) {
        if (!/play/i.test(String(e?.message))) serverFailedAt = Date.now();
        if (id !== playId) return;
        console.warn("Server voice failed, using the device voice", e);
      }
    }
    await playPieces(clean, rate, id, false);
  } catch (e) { console.warn(e); }
}

if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
