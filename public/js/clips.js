// Grown-up recordings of the sounds ("tuh", "shh"), made at angelio.org/admin/sounds.html. The voice
// plays them wherever a sound is marked {{like this}}; a sound nobody recorded is read by the robot voice.
import { setClips } from "./kit/tts.js";

let index = {};
setClips((s) => (index[s] != null ? `/api/clip?id=${encodeURIComponent(s)}&v=${index[s]}` : null));
fetch("/api/clips").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.clips) index = j.clips; }).catch(() => {});
