// Recording a voice line: the microphone → a trimmed (silence cut), evened-out (same loudness as the app voice)
// 24 kHz WAV. Used by the family recording page (/voice/); the same steps as the admin recorder (/admin/sounds.html).
let stream;
export async function record(ms = 2200) {
  stream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } });
  const rec = new MediaRecorder(stream);
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  const t = setTimeout(() => rec.state !== "inactive" && rec.stop(), ms);
  return { stop: () => { clearTimeout(t); if (rec.state !== "inactive") rec.stop(); }, done: done.then(() => new Blob(parts, { type: rec.mimeType })) };
}

export async function toWav(blob) {
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(await blob.arrayBuffer());
  const sr = buf.sampleRate, n = buf.length, mono = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels; }
  let peak = 0; for (const v of mono) peak = Math.max(peak, Math.abs(v));
  if (peak < 0.01) { ac.close(); throw new Error("I didn't hear anything. Is the microphone allowed?"); }
  const w = Math.round(sr * 0.01), thr = peak * 0.12;
  const loud = (i) => { let r = 0; for (let j = i; j < Math.min(n, i + w); j++) r = Math.max(r, Math.abs(mono[j])); return r > thr; };
  let a = 0, b = n;
  for (let i = 0; i < n; i += w) if (loud(i)) { a = i; break; }
  for (let i = n - w; i > 0; i -= w) if (loud(i)) { b = i + w; break; }
  a = Math.max(0, a - Math.round(sr * 0.04)); b = Math.min(n, b + Math.round(sr * 0.12));
  const src = ac.createBuffer(1, b - a, sr); src.copyToChannel(mono.subarray(a, b), 0);
  const off = new OfflineAudioContext(1, Math.ceil(((b - a) * 24000) / sr), 24000);
  const node = off.createBufferSource(); node.buffer = src; node.connect(off.destination); node.start();
  const res = (await off.startRendering()).getChannelData(0);
  ac.close();
  let pk = 0; for (const v of res) pk = Math.max(pk, Math.abs(v));
  const g = 0.93 / pk, fade = 120, pcm = new Int16Array(res.length); // same loudness as the app voice
  for (let i = 0; i < res.length; i++) {
    let v = res[i] * g;
    if (i < fade) v *= i / fade;
    if (i > res.length - fade) v *= (res.length - i) / fade;
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  }
  const head = new DataView(new ArrayBuffer(44)), str = (o, s) => [...s].forEach((ch, i) => head.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF"); head.setUint32(4, 36 + pcm.byteLength, true); str(8, "WAVEfmt "); head.setUint32(16, 16, true);
  head.setUint16(20, 1, true); head.setUint16(22, 1, true); head.setUint32(24, 24000, true); head.setUint32(28, 48000, true);
  head.setUint16(32, 2, true); head.setUint16(34, 16, true); str(36, "data"); head.setUint32(40, pcm.byteLength, true);
  return new Blob([head, pcm], { type: "audio/wav" });
}

