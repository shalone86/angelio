// Voxel portrait baker for Saints Match (apps/match): renders each saint's `<slug>-idle.vox`
// (or a recolored uploaded voxel person with a golden halo as a stand-in) through ONE shared
// offscreen three.js WebGLRenderer into cached PNG data URLs, keeping card flips 60 fps with zero context leaks.
import { readVox, toScene } from "./vox.js";
import { isPriest, recolor } from "./looks.js";

const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";
const catalogCache = { list: null, at: 0 };
const voxCache = new Map();
const portraitCache = new Map();

function svgFallback(saint) {
  const robe = saint.look?.shirt ?? "#2e5fa8";
  const skin = saint.look?.skin ?? "#efc6a0";
  const hair = saint.look?.hair ?? "#4a2c1a";
  const bg = saint.cardBg ?? "#fff7e2";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="18" fill="${bg}"/>
    <circle cx="60" cy="40" r="28" fill="none" stroke="#f0b62a" stroke-width="6"/>
    <path d="M28 112c0-24 14-38 32-38s32 14 32 38z" fill="${robe}"/>
    <circle cx="60" cy="44" r="19" fill="${skin}"/>
    <path d="M40 40c4-14 36-14 40 0" fill="${hair}"/>
    <circle cx="53" cy="45" r="2.5" fill="#2a1a10"/>
    <circle cx="67" cy="45" r="2.5" fill="#2a1a10"/>
    <text x="96" y="30" font-size="22" text-anchor="middle">${saint.symbol}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function getCatalog() {
  if (catalogCache.list && Date.now() - catalogCache.at < 60_000) return catalogCache.list;
  try {
    const data = await (await fetch(`${ART}/api/art`)).json();
    catalogCache.list = data?.voxels ?? {};
    catalogCache.at = Date.now();
  } catch {
    catalogCache.list = catalogCache.list ?? {};
  }
  return catalogCache.list;
}

async function fetchVox(slug, saved) {
  const key = `${slug}:${saved}`;
  if (voxCache.has(key)) return voxCache.get(key);
  try {
    const r = await fetch(`${ART}/api/art/vox?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(saved)}`);
    if (!r.ok) return null;
    const vox = readVox(await r.arrayBuffer());
    voxCache.set(key, vox);
    return vox;
  } catch {
    return null;
  }
}

export async function loadPortraits(saints) {
  const out = new Map();
  if (!saints?.length) return out;
  const catalog = await getCatalog();
  const plan = new Map(); // saintId -> { saint, slug, custom, saved }
  const toFetch = new Map(); // slug -> saved

  for (const s of saints) {
    const customSlug = `${s.slug}-idle`;
    let slug = null;
    let custom = false;
    if (catalog[customSlug]) { slug = customSlug; custom = true; }
    else slug = s.fallbacks?.find((f) => catalog[f]) ?? null;
    const saved = slug ? catalog[slug]?.saved : "standin";
    const cacheKey = `${s.id}:${slug ?? "standin"}:${saved}`;
    if (portraitCache.has(cacheKey)) {
      out.set(s.id, portraitCache.get(cacheKey));
      continue;
    }
    plan.set(s.id, { saint: s, slug, custom, saved, cacheKey });
    if (slug) toFetch.set(slug, saved);
  }

  if (!plan.size) return out;

  const models = new Map();
  await Promise.all([...toFetch.entries()].map(async ([slug, saved]) => {
    const v = await fetchVox(slug, saved);
    if (v) models.set(slug, v);
  }));

  const THREE = window.THREE;
  if (!THREE) {
    for (const [id, item] of plan) out.set(id, svgFallback(item.saint));
    return out;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  let R;
  try {
    R = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    for (const [id, item] of plan) out.set(id, svgFallback(item.saint));
    return out;
  }
  R.setPixelRatio(1);
  R.setSize(160, 160, false);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.5, 100);
  cam.position.set(4.1, 8.8, 14.2);
  cam.lookAt(0, 4.3, 0);

  scene.add(new THREE.HemisphereLight("#fff8eb", "#6a5a4a", 0.96));
  const keyLight = new THREE.DirectionalLight("#ffe6c0", 0.65);
  keyLight.position.set(8, 16, 14);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight("#d8e6ff", 0.28);
  fillLight.position.set(-8, 10, 6);
  scene.add(fillLight);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const haloGeo = new THREE.TorusGeometry(2.45, 0.34, 8, 22);
  const haloMat = new THREE.MeshLambertMaterial({ color: "#ffd45c", emissive: "#b87a00", emissiveIntensity: 0.35 });

  for (const [id, { saint, slug, custom, cacheKey }] of plan) {
    const root = new THREE.Group();
    const disposables = [];
    const model = slug ? models.get(slug) : null;

    if (model) {
      const cells = toScene(model, 0);
      const mid = (k) => (Math.min(...cells.map((c) => c[k])) + Math.max(...cells.map((c) => c[k]))) / 2;
      const cx = cells.length ? mid(0) : 0;
      const cz = cells.length ? mid(2) : 0;
      const mat = new THREE.MeshLambertMaterial();
      disposables.push(mat);
      const im = new THREE.InstancedMesh(boxGeo, mat, cells.length);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      const vestment = !custom && isPriest(slug) ? saint.vestment : null;
      const look = custom ? null : saint.look;
      cells.forEach(([x, y, z, hex], i) => {
        dummy.position.set(x - cx, y, z - cz);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(recolor(hex, look, vestment)));
      });
      root.add(im);
    } else {
      // Minimal offline voxel stand-in figure using the saint's colors
      const put = (w, h, d, x, y, z, hex) => {
        const m = new THREE.MeshLambertMaterial({ color: hex });
        disposables.push(m);
        const mesh = new THREE.Mesh(boxGeo, m);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, y + h / 2, z);
        root.add(mesh);
      };
      put(3.4, 4.4, 2.2, 0, 0.5, 0, saint.look?.shirt ?? "#2e5fa8");
      put(3.5, 0.6, 2.3, 0, 2.2, 0, saint.look?.belt ?? "#4a2c1a");
      put(3.2, 3.0, 3.0, 0, 4.9, 0, saint.look?.skin ?? "#efc6a0");
      put(3.4, 1.0, 3.2, 0, 7.2, -0.1, saint.look?.hair ?? "#4a2c1a");
    }

    if (!custom) {
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(0, 8.7, -0.5);
      halo.rotation.x = 0.35;
      root.add(halo);
    }

    scene.add(root);
    R.render(scene, cam);
    const url = canvas.toDataURL("image/png");
    scene.remove(root);
    disposables.forEach((m) => m.dispose());
    portraitCache.set(cacheKey, url);
    out.set(id, url);
  }

  boxGeo.dispose();
  haloGeo.dispose();
  haloMat.dispose();
  R.dispose();
  R.forceContextLoss?.();
  return out;
}
