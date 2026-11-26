// Keeps this studio's pixel drawings (sprites/<slug>.json) the same as the drawings library that the Angelio Studio
// (angelio.org/studio/draw/) and the Pico Parish Studio (picoparish.com/studio/draw/) share, both ways:
//   - a drawing saved here goes up right away (POST angelio.org/api/admin/studio/art/save, ANGELIO_ADMIN_KEY in .env,
//     the same key "Send to Angelio" uses);
//   - one saved there comes down when the Pixel art tab lists drawings (GET angelio.org/api/art, at most every 20 s).
// Only pixel drawings: sketches stay here, and 3D models (voxels) are never sent or changed (syncVoxels copies them down).
// sprites/.cloud.json remembers what both sides had at the last sync: {slug: {saved, hash}}. When both changed since,
// the newer one wins and the other is kept (here in sprites/.replaced/, there in the library's history).
// Deleting doesn't spread: a drawing deleted on one side isn't copied back to it, and the other side keeps its copy.
// Run by hand: node scripts/art-sync.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FIELDS = ['name', 'width', 'height', 'fps', 'palette', 'frames', 'layers', 'kind', 'comic', 'words'];
const slugOk = (s) => /^[a-z0-9][a-z0-9-]{0,59}$/.test(String(s ?? ''));
const slugOf = (name) => String(name ?? '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Just the drawing (no saved time, no "from"), in one order, so the same picture always gives the same hash. */
export function clean(d) {
  const out = {};
  for (const k of FIELDS) if (d?.[k] !== undefined) out[k] = d[k];
  return out;
}
export const hashOf = (d) => crypto.createHash('sha1').update(JSON.stringify(clean(d))).digest('hex');
const pixelOk = (d) => d && d.kind !== 'sketch' && Number.isInteger(d.width) && Number.isInteger(d.height)
  && Array.isArray(d.palette) && Array.isArray(d.frames) && d.frames.length > 0;

function readLocal(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    const slug = f.slice(0, -5);
    if (!slugOk(slug)) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (pixelOk(d)) out[slug] = {d, mtime: fs.statSync(path.join(dir, f)).mtimeMs};
    } catch { /* a file that can't be read stays as it is */ }
  }
  return out;
}

let last = 0, running = null, again = false;

/**
 * One sync. Returns {pushed, pulled, offline, needKey, errors}. At most once every 20 seconds unless `force`;
 * a forced one asked for while another runs happens right after it, so no save is missed.
 * Options are for tests: dir (sprites/), site, key, fetchImpl.
 */
export function syncArt(opts = {}) {
  if (running) { if (opts.force) again = true; return running; }
  if (!opts.force && Date.now() - last < 20000) return Promise.resolve({pushed: [], pulled: [], skipped: true});
  running = runSync(opts).finally(() => {
    running = null;
    last = Date.now();
    if (again) { again = false; syncArt({...opts, force: true}); }
  });
  return running;
}

async function runSync({dir = path.join(ROOT, 'sprites'), site = process.env.ANGELIO_URL || 'https://angelio.org',
  key = process.env.ANGELIO_ADMIN_KEY, fetchImpl = fetch} = {}) {
  site = site.replace(/\/$/, '');
  const out = {pushed: [], pulled: [], offline: false, needKey: false, errors: []};
  let cloud;
  try {
    const r = await fetchImpl(`${site}/api/art`, {signal: AbortSignal.timeout(10000)});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cloud = (await r.json()).drawings ?? {};
  } catch { out.offline = true; return out; }

  const stateFile = path.join(dir, '.cloud.json');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) ?? {}; } catch { state = {}; }
  const local = readLocal(dir);

  const push = async (slug, d) => {
    if (!key) { out.needKey = true; return; }
    if (slugOf(d.name) !== slug) { out.errors.push(`${slug}: its name (${d.name}) doesn't match its file name, so it stays here`); return; }
    try {
      const r = await fetchImpl(`${site}/api/admin/studio/art/save`, {
        method: 'POST', headers: {'x-admin-key': key, 'content-type': 'application/json'},
        body: JSON.stringify(clean(d)), signal: AbortSignal.timeout(20000),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { out.needKey = true; out.errors.push('Angelio said the ANGELIO_ADMIN_KEY in .env is wrong.'); return; }
      if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
      const saved = j.art?.drawings?.[j.slug ?? slug]?.saved ?? null;
      state[slug] = {saved, hash: hashOf(d)};
      out.pushed.push(slug);
    } catch (e) { out.errors.push(`${slug}: ${e.message}`); }
  };
  const pull = (slug, c) => {
    if (!pixelOk(c)) return;
    const file = path.join(dir, `${slug}.json`);
    if (fs.existsSync(file)) { // keep what was here
      const bin = path.join(dir, '.replaced');
      fs.mkdirSync(bin, {recursive: true});
      fs.copyFileSync(file, path.join(bin, `${slug}-${stamp()}.json`));
    }
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(file, JSON.stringify(clean(c), null, 1) + '\n');
    state[slug] = {saved: c.saved ?? null, hash: hashOf(c)};
    out.pulled.push(slug);
  };

  for (const slug of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    if (!slugOk(slug)) continue;
    const L = local[slug], C = cloud[slug], S = state[slug];
    const hL = L && hashOf(L.d);
    const localChanged = !!L && (!S || S.hash !== hL);
    const cloudChanged = !!C && (!S || S.saved !== C.saved);
    if (L && C) {
      if (hL === hashOf(C)) { state[slug] = {saved: C.saved ?? null, hash: hL}; continue; }
      if (localChanged && !cloudChanged) await push(slug, L.d);
      else if (cloudChanged && !localChanged) pull(slug, C);
      else if (L.mtime > (Date.parse(C.saved) || 0)) await push(slug, L.d); // both changed: the newer wins
      else pull(slug, C);
    } else if (L) {
      if (localChanged) await push(slug, L.d); // new here (or changed here after it was deleted there)
    } else if (C) {
      if (cloudChanged) pull(slug, C); // new there (or changed there after it was deleted here)
    }
  }
  try { fs.writeFileSync(stateFile, JSON.stringify(state, null, 1) + '\n'); } catch (e) { out.errors.push(e.message); }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (fs.existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));
  const r = await syncArt({force: true});
  if (r.offline) console.log("Couldn't reach Angelio, so nothing changed.");
  else console.log(`Sent ${r.pushed.length} drawing(s) up, brought ${r.pulled.length} down.${r.needKey ? ' Add ANGELIO_ADMIN_KEY to .env to send drawings up.' : ''}`);
  for (const e of r.errors ?? []) console.log('  ' + e);
}
