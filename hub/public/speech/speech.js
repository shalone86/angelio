// Say the Word: the on-device speech check, tried on real phones with real kids (a test page, angelio.org/speech/).
// Whisper runs in this browser (transformers.js 4.3.2; it, the speech engine and the models all come from
// angelio.org/models/, downloaded once and kept by the browser). The voice never leaves the device; nothing is sent
// anywhere: the results stay on this page until a grown-up copies them.
import { pipeline, env } from "/models/transformers-4.3.2/transformers.min.js";
import { soundsLike } from "/js/sounds-like.js";

env.allowLocalModels = false;
env.remoteHost = `${location.origin}/models/`;
env.remotePathTemplate = "{model}/";
env.backends.onnx.wasm.wasmPaths = `${location.origin}/models/ort-1.31.0-dev.20260914/`;
if (self.crossOriginIsolated) env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* fine */ } } };

const MODELS = [["whisper-base.en", "Better (75 MB)"], ["whisper-tiny.en", "Faster (40 MB)"]];
const WHO = [["kid", "🧒 A child"], ["grown-up", "🧑 A grown-up"]];
const SETS = {
  short: ["🐱 Short words", "cat bit bot sun cup map nap pig dog bed hen fox"],
  long: ["🐰 Longer words", "rabbit picnic rainbow pumpkin turtle basket kitten robot dragon apple"],
  church: ["⛪ Church words", "Jesus Mary Amen holy grace candle angel prayer church Bible"],
  own: ["✏️ My own word", ""],
};
let model = store.get("speech:model") || MODELS[0][0], who = store.get("speech:who") || "kid", set = "short";
let list = [], at = 0, asr = null, results = store.get("speech:results") || [];

function pills(el, items, current, onPick) {
  el.innerHTML = "";
  for (const [id, label] of items) {
    const b = document.createElement("button"); b.className = "pill"; b.textContent = label; b.setAttribute("aria-pressed", String(id === current));
    b.onclick = () => onPick(id); el.append(b);
  }
}
function menus() {
  pills($("models"), MODELS, model, (m) => { if (m === model) return; model = m; store.set("speech:model", m); asr = null; $("mic").disabled = true; $("load").disabled = false; $("answer").textContent = "Get ready first (step 1)."; menus(); });
  pills($("who"), WHO, who, (w) => { who = w; store.set("speech:who", w); menus(); });
  pills($("sets"), Object.entries(SETS).map(([k, [label]]) => [k, label]), set, (s) => { set = s; $("own").hidden = s !== "own"; if (s !== "own") useList(SETS[s][1].split(" ")); menus(); });
}
function useList(words) { list = words; at = 0; show(); }
function show() {
  $("word").textContent = list[at] ?? "…";
  $("count").textContent = list.length ? `${at + 1} of ${list.length}` : "";
  $("answer").textContent = asr ? "Tap the microphone and say it." : "Get ready first (step 1).";
  $("answer").className = "answer"; $("heardRaw").textContent = "";
}
$("ownGo").onclick = () => { const w = $("ownWord").value.trim(); if (w) useList([w]); };
$("next").onclick = () => { at = (at + 1) % Math.max(1, list.length); show(); };
$("hear").onclick = () => say(list[at]);
function say(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.85; speechSynthesis.speak(u); } catch { /* no voice */ } }

// ── 1. the model: downloaded once (the browser keeps it), then ready in a few seconds ──
$("load").onclick = async () => {
  $("load").disabled = true; $("bar").hidden = false; $("loadNote").textContent = "Downloading…";
  const files = new Map();
  const t0 = performance.now();
  try {
    asr = await pipeline("automatic-speech-recognition", model, {
      dtype: "q8", device: "wasm",
      progress_callback: (p) => {
        if (p.status === "progress" && p.total) { files.set(p.file, [p.loaded, p.total]); const [l, t] = [...files.values()].reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]); $("bar").firstElementChild.style.width = `${Math.round((100 * l) / t)}%`; $("loadNote").textContent = `Downloading… ${Math.round(l / 1e6)} of ${Math.round(t / 1e6)} MB`; }
      },
    });
    await asr(new Float32Array(16000)); // warm up on a second of silence
    $("loadNote").textContent = `Ready (${((performance.now() - t0) / 1000).toFixed(1)} s)${self.crossOriginIsolated ? "" : " · one processor core"}`;
    $("mic").disabled = false; show();
    say("Ready! Tap the microphone and say the word.");
  } catch (e) {
    console.error(e); asr = null; $("load").disabled = false; $("loadNote").textContent = `That didn't work on this device: ${e.message}`;
  }
};

// ── 2. listening: tap the microphone, say the word; it stops by itself after a short quiet (or after 5 seconds) ──
let stream = null;
async function listen() {
  stream ??= await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const ac = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
  an.fftSize = 1024; src.connect(an);
  const rec = new MediaRecorder(stream), chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  const buf = new Float32Array(an.fftSize), t0 = performance.now();
  let spoke = 0, quietSince = 0;
  await new Promise((stop) => {
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length), now = performance.now();
      $("lvl").style.opacity = String(Math.min(1, rms * 12)); $("lvl").style.transform = `scale(${1 + Math.min(0.25, rms * 3)})`;
      if (rms > 0.03) { spoke = spoke || now; quietSince = 0; } else if (spoke && !quietSince) quietSince = now;
      if ((spoke && quietSince && now - quietSince > 900) || now - t0 > 5000 || (!spoke && now - t0 > 3500)) return stop();
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); await done; $("lvl").style.opacity = "0";
  const decoded = await ac.decodeAudioData(await new Blob(chunks).arrayBuffer());
  ac.close();
  // to 16 kHz, one channel (what Whisper wants)
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const s = off.createBufferSource(); s.buffer = decoded; s.connect(off.destination); s.start();
  return (await off.startRendering()).getChannelData(0);
}
$("mic").onclick = async () => {
  if (!asr || $("mic").classList.contains("on")) return;
  const want = list[at];
  $("mic").classList.add("on"); $("answer").className = "answer"; $("answer").textContent = "Listening…"; $("heardRaw").textContent = "";
  let audio;
  try { audio = await listen(); } catch (e) { $("mic").classList.remove("on"); $("answer").textContent = `The microphone didn't start: ${e.message}`; return; }
  $("mic").classList.remove("on"); $("mic").disabled = true; $("answer").textContent = "Thinking…";
  const t = performance.now();
  const out = await asr(audio);
  const ms = Math.round(performance.now() - t), heard = out.text.trim(), yes = soundsLike(heard, want);
  $("mic").disabled = false;
  $("answer").className = `answer ${yes ? "yes" : "no"}`;
  $("answer").textContent = yes ? `✅ Yes! That was “${want}”.` : "🤔 Hmm, let's try that again.";
  $("heardRaw").textContent = `It heard: “${heard || "(nothing)"}” · ${(ms / 1000).toFixed(1)} s`;
  say(yes ? "Yes!" : "Let's try again.");
  results.push({ who, want, heard, yes, ms, model, secs: Math.round(audio.length / 1600) / 10 });
  store.set("speech:results", results); table();
};

// ── 3. the results, to copy and send ──
function table() {
  $("rows").innerHTML = results.slice().reverse().map((r) => `<tr><td>${r.who === "kid" ? "🧒" : "🧑"}</td><td>${esc(r.want)}</td><td>${esc(r.heard)}</td><td>${r.yes ? "✅" : "❌"}</td><td>${(r.ms / 1000).toFixed(1)} s</td></tr>`).join("");
  const by = (w) => results.filter((r) => r.who === w), line = (w, l) => (l.length ? `${w}: ${l.filter((r) => r.yes).length} of ${l.length} yes` : "");
  $("summary").textContent = [line("Children", by("kid")), line("Grown-ups", by("grown-up")), results.length ? `about ${(results.reduce((a, r) => a + r.ms, 0) / results.length / 1000).toFixed(1)} s each` : ""].filter(Boolean).join(" · ");
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
$("copy").onclick = async () => {
  const head = `Say the Word results · ${new Date().toLocaleDateString()} · ${navigator.userAgent.replace(/\s+/g, " ").slice(0, 160)} · cores ${navigator.hardwareConcurrency ?? "?"} · threads ${self.crossOriginIsolated ? "yes" : "no"}`;
  const text = [head, ...results.map((r) => `${r.who}\t${r.model}\t${r.want}\t${r.heard}\t${r.yes ? "yes" : "no"}\t${r.ms} ms\t${r.secs} s audio`)].join("\n");
  try { await navigator.clipboard.writeText(text); $("copy").textContent = "✅ Copied"; } catch { prompt("Copy these:", text); }
  setTimeout(() => ($("copy").textContent = "📋 Copy the results"), 2000);
};
$("clear").onclick = () => { if (confirm("Clear all the results?")) { results = []; store.set("speech:results", results); table(); } };

menus(); useList(SETS.short[1].split(" ")); table();
