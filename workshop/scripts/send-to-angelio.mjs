// "Approve and send to Angelio" (Video & approval tab): puts an approved lesson in Watch & Sing.
//   1. checks: approved (status: reviewed), its quotations match their sources, the video is made
//   2. uploads the video and its thumbnail to Angelio's storage (in parts, like the Studio page does)
//   3. adds the lesson to the Watch & Sing library (or updates it): title, video, thumbnail, quiz, the words with
//      their sources, and its course; `replaces: <old lesson id>` in lesson.yml takes that old video's place
//      (same id, so its links and stars keep working). The library keeps every older version (Studio → History).
// Needs ANGELIO_ADMIN_KEY in .env (the Studio's admin key; he types it there, never in chat).
// Run: node scripts/send-to-angelio.mjs <course>/<lesson>
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ROOT, lessonDir, loadLesson, outDir} from './lib.mjs';
import {renderKidsThumb} from './kids-thumb.mjs';
import {watchLesson} from './watch-lesson.mjs';

const SITE = (process.env.ANGELIO_URL || 'https://angelio.org').replace(/\/$/, '');
const KEY = process.env.ANGELIO_ADMIN_KEY;
const PART = 8 * 1024 * 1024;

async function studio(p, opts = {}) {
  const r = await fetch(`${SITE}/api/admin/studio${p}`, {...opts, headers: {'x-admin-key': KEY, ...(opts.headers ?? {})}});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('Angelio said the ANGELIO_ADMIN_KEY in .env is wrong.');
  if (!r.ok) throw new Error(`Angelio said: ${j.error || r.status}${j.errors ? ' ' + j.errors.join('; ') : ''}`);
  return j;
}
async function upload(file, type) {
  const bytes = fs.readFileSync(file);
  const start = await studio('/upload/start', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name: path.basename(file), type})});
  const parts = [];
  try {
    for (let i = 0, n = 1; i < bytes.length; i += PART, n++) {
      parts.push(await studio(`/upload/part?key=${encodeURIComponent(start.key)}&uploadId=${encodeURIComponent(start.uploadId)}&n=${n}`, {method: 'PUT', body: bytes.subarray(i, i + PART)}));
    }
    await studio(`/upload/done?key=${encodeURIComponent(start.key)}&uploadId=${encodeURIComponent(start.uploadId)}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({parts})});
  } catch (e) {
    await studio(`/upload/abort?key=${encodeURIComponent(start.key)}&uploadId=${encodeURIComponent(start.uploadId)}`, {method: 'POST'}).catch(() => {});
    throw e;
  }
  return start.url;
}

const arg = process.argv[2];
if (!arg) throw new Error('usage: node scripts/send-to-angelio.mjs <course>/<lesson>');
if (!KEY) throw new Error('No ANGELIO_ADMIN_KEY in .env yet: type the Studio admin key there (ANGELIO_ADMIN_KEY=…).');
const dir = lessonDir(arg);
const info = loadLesson(dir);
if (info.lesson.status !== 'reviewed') throw new Error('Not approved yet (status: reviewed).');
const dist = outDir(info.id);
const video = path.join(dist, 'lesson.mp4');
if (!fs.existsSync(video)) throw new Error('Make the video first.');

console.log('STEP 1/4 Checking the quotations…');
try { execFileSync(process.execPath, [path.join(ROOT, 'scripts/check-quotes.mjs'), arg], {cwd: ROOT, stdio: 'pipe'}); }
catch (e) { throw new Error('Quotation check failed: ' + String(e.stdout || e.stderr || e.message).trim().split('\n').slice(-3).join(' ')); }

console.log('STEP 2/4 Making the thumbnail…');
const thumb = info.kids ? renderKidsThumb(arg) : path.join(dist, 'poster.jpg');

console.log('STEP 3/4 Uploading the video…');
const videoUrl = await upload(video, 'video/mp4');
const posterUrl = await upload(thumb, thumb.endsWith('.png') ? 'image/png' : 'image/jpeg');

console.log('STEP 4/4 Putting it in Watch & Sing…');
const cur = await studio('/watch');
const lib = cur.library;
const made = watchLesson(info, {video: videoUrl, poster: posterUrl});
const at = lib.lessons.findIndex((l) => l.id === made.id);
if (at >= 0) lib.lessons[at] = {...lib.lessons[at], ...made}; else lib.lessons.push(made);
// its course in Watch & Sing: the course's `watch:` id (else its slug), made if it isn't there yet
const courseId = info.course.watch || info.course.slug;
let course = lib.courses.find((c) => c.id === courseId);
if (!course) { course = {id: courseId, title: info.course.watchTitle || info.course.series || info.course.title, items: []}; lib.courses.push(course); }
if (!course.items.includes(made.id)) course.items.push(made.id);
const note = `Workshop: ${made.title}`.slice(0, 60);
await studio(`/watch?base=${encodeURIComponent(cur.version)}&note=${encodeURIComponent(note)}`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(lib)});
// remember where it went, so sending again updates the same lesson
const yml = path.join(dir, 'lesson.yml');
const text = fs.readFileSync(yml, 'utf8');
if (!/^watch_id:/m.test(text)) fs.writeFileSync(yml, text.replace(/\n?$/, `\nwatch_id: ${made.id}\n`));
console.log(`In Watch & Sing: ${SITE}/watch/#/lesson/${made.id}`);
