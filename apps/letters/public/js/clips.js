// Grown-up recordings of the sounds ("tuh", "shh"), made at angelio.org/admin/sounds: Mom's set (f) and
// Dad's set (m). The voice plays them wherever a sound is marked {{like this}}: the chosen set first, then
// the other one; a sound nobody recorded is read by the robot voice.
import { setClips } from "./kit/tts.js";
import * as S from "./kit/store.js";

let index = { f: {}, m: {} };
setClips((s) => {
  const want = S.settings().soundVoice === "m" ? "m" : "f";
  for (const set of [want, want === "m" ? "f" : "m"]) {
    const v = index[set]?.[s];
    if (v != null) return `/api/clip?set=${set}&id=${encodeURIComponent(s)}&v=${v}`;
  }
  return null;
});
fetch("/api/clips").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.clips) index = { f: {}, m: {}, ...j.clips }; }).catch(() => {});

/** Count of recorded sounds in each set, for the grown-ups page. */
export const recordedCounts = () => ({ f: Object.keys(index.f ?? {}).length, m: Object.keys(index.m ?? {}).length });

/** Adds "Letter sounds: Mom's / Dad's voice" to the grown-ups page. */
export function addSoundVoiceSetting(app) {
  const card = app.querySelector(".card");
  if (!card) return;
  const n = recordedCounts();
  const row = document.createElement("label");
  row.className = "set";
  row.innerHTML = `<span><b>Letter sounds</b><br><span class="muted small">Recorded by a real person, because the robot voice can't say lone sounds well.
    ${n.f + n.m ? `Mom recorded ${n.f}, Dad ${n.m}.` : "None recorded yet."}</span></span>
    <select data-k="soundVoice"><option value="f">👩 Mom's voice</option><option value="m">👨 Dad's voice</option></select>`;
  card.insertBefore(row, card.querySelector(".set:nth-of-type(4)") ?? null);
  const sel = row.querySelector("select");
  sel.value = S.settings().soundVoice === "m" ? "m" : "f";
  sel.onchange = () => { S.setSetting("soundVoice", sel.value); };
}

/** Home-page picker: "Who says the sounds? 👩 Mom · 👨 Dad". Tapping one picks it and plays a sample in that voice. */
export function voicePickerHtml() {
  const v = S.settings().soundVoice === "m" ? "m" : "f";
  return `<div class="voice-pick" role="group" aria-label="Who says the sounds?">
      <span class="vp-label">Who says the sounds?</span>
      <button type="button" class="vp${v === "f" ? " on" : ""}" data-voice-pick="f" aria-pressed="${v === "f"}"><span aria-hidden="true">👩</span> Mom</button>
      <button type="button" class="vp${v === "m" ? " on" : ""}" data-voice-pick="m" aria-pressed="${v === "m"}"><span aria-hidden="true">👨</span> Dad</button>
    </div>`;
}
export function wireVoicePicker(root, speak) {
  root.querySelectorAll("[data-voice-pick]").forEach((b) => b.onclick = () => {
    S.setSetting("soundVoice", b.dataset.voicePick);
    root.querySelectorAll("[data-voice-pick]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    speak(`{{sss}}, {{ah}}, {{tuh}}.`, { force: true }); // three sounds in the chosen voice
  });
}
