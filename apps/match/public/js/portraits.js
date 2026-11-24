// Animated voxel portrait baker for Saints Match (apps/match): renders each saint's
// `<slug>-idle.vox` (or recolored stand-in) with a warm 3D golden glow halo anchored behind the
// head/hair region via ONE shared offscreen three.js WebGLRenderer.
import { readVox, toScene } from "./vox.js";
import { isPriest, recolor } from "./looks.js";

const ART = typeof location !== "undefined" && /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";
const BASE_CAM = { x: 4.0, y: 9.8, z: 17.6 };
const catalogCache = { list: null, at: 0 };
const voxCache = new Map();
const portraitCache = new Map();
const mid = (vals) => (Math.min(...vals) + Math.max(...vals)) / 2;

/**
 * Compute world placement & diameter for a camera-facing golden glow halo behind the head/hair
 * region so the head occludes the center and the aura radiates evenly from any camera angle.
 */
export function headHaloSpot(cells, camPos = BASE_CAM) {
  if (!cells?.length) return { x: 0, y: 6.1, z: -2.2, size: 10.6, headTop: 8.2, backZ: -1.5 };
  const ys = cells.map((c) => c[1]);
  const minY = Math.min(...ys), maxY = Math.max(...ys), height = Math.max(1, maxY - minY);
  const cutY = maxY - Math.max(3.2, height * 0.45);
  const region = cells.filter((c) => c[1] >= cutY);
  const head = region.length ? region : cells;

  const hxs = head.map((c) => c[0]), hys = head.map((c) => c[1]), hzs = head.map((c) => c[2]);
  const hx = mid(hxs), hy = mid(hys) + 0.15, hz = mid(hzs);
  const backZ = Math.min(...hzs);
  const spanX = Math.max(...hxs) - Math.min(...hxs) + 1;
  const spanY = Math.max(...hys) - Math.min(...hys) + 1;
  const span = Math.max(spanX, spanY, 3.6);

  const vx = hx - camPos.x, vy = hy - camPos.y, vz = hz - camPos.z;
  const targetZ = backZ - 0.85;
  const t = vz < -0.1 ? Math.max(0.05, Math.min(0.45, (targetZ - hz) / vz)) : 0.12;
  return {
    x: hx + vx * t,
    y: hy + vy * t,
    z: hz + vz * t,
    size: (span * 1.48 + 3.0) * (1 + t),
    headTop: maxY + 0.5,
    backZ,
  };
}

function makeHaloTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0.0, "rgba(255, 250, 214, 0.98)");
  gr.addColorStop(0.38, "rgba(255, 224, 102, 0.95)");
  gr.addColorStop(0.54, "rgba(255, 192, 42, 0.85)");
  gr.addColorStop(0.68, "rgba(255, 176, 28, 0.40)");
  gr.addColorStop(0.85, "rgba(255, 165, 20, 0.11)");
  gr.addColorStop(1.0, "rgba(255, 165, 20, 0.00)");
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function svgFallback(saint) {
  const robe = saint.look?.shirt ?? "#2e5fa8";
  const skin = saint.look?.skin ?? "#efc6a0";
  const hair = saint.look?.hair ?? "#4a2c1a";
  const bg = saint.cardBg ?? "#fff7e2";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs><radialGradient id="hg" cx="50%" cy="50%" r="50%"><stop offset="38%" stop-color="#ffe066" stop-opacity=".95"/><stop offset="68%" stop-color="#ffb01c" stop-opacity=".42"/><stop offset="100%" stop-color="#ffa514" stop-opacity="0"/></radialGradient></defs>
    <rect width="120" height="120" rx="18" fill="${bg}"/>
    <circle cx="60" cy="43" r="40" fill="url(#hg)"/>
    <path d="M28 112c0-24 14-38 32-38s32 14 32 38z" fill="${robe}"/>
    <circle cx="60" cy="44" r="19" fill="${skin}"/>
    <path d="M40 40c4-14 36-14 40 0" fill="${hair}"/>
    <circle cx="53" cy="45" r="2.5" fill="#2a1a10"/>
    <circle cx="67" cy="45" r="2.5" fill="#2a1a10"/>
    <text x="96" y="30" font-size="22" text-anchor="middle">${saint.symbol}</text>
  </svg>`;
  return { frames: [`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`], fps: 1 };
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
  const plan = new Map();
  const toFetch = new Map();

  for (const s of saints) {
    const customSlug = `${s.slug}-idle`;
    let slug = null;
    let custom = false;
    if (catalog[customSlug]) { slug = customSlug; custom = true; }
    else slug = s.fallbacks?.find((f) => catalog[f]) ?? null;
    const meta = slug ? catalog[slug] : null;
    const saved = meta ? meta.saved : "standin";
    const cacheKey = `${s.id}:${slug ?? "standin"}:${saved}:head-glow-v1`;
    if (portraitCache.has(cacheKey)) {
      out.set(s.id, portraitCache.get(cacheKey));
      continue;
    }
    plan.set(s.id, { saint: s, slug, custom, meta, cacheKey });
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
  const lookY = 5.1;
  const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 100);
  cam.position.set(BASE_CAM.x, BASE_CAM.y, BASE_CAM.z);
  cam.lookAt(0, lookY, 0);

  scene.add(new THREE.HemisphereLight("#fff8eb", "#6a5a4a", 0.96));
  const keyLight = new THREE.DirectionalLight("#ffe6c0", 0.65);
  keyLight.position.set(8, 16, 14);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight("#d8e6ff", 0.28);
  fillLight.position.set(-8, 10, 6);
  scene.add(fillLight);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const haloTex = makeHaloTexture(THREE);

  for (const [id, { saint, slug, custom, meta, cacheKey }] of plan) {
    const model = slug ? models.get(slug) : null;
    const bodyFrames = model ? model.frames.length : 1;
    const count = Math.min(12, Math.max(bodyFrames, 2));
    const rawFps = meta?.fps ?? 2;
    const isWalk = !!slug && /-walk$/.test(slug);
    const fps = isWalk ? Math.min(rawFps, 2.2) : rawFps;

    const frames = [];
    for (let f = 0; f < count; f++) {
      const root = new THREE.Group();
      const disposables = [];
      let haloCells;

      if (model) {
        const cells = toScene(model, f % bodyFrames);
        const cx = cells.length ? mid(cells.map((c) => c[0])) : 0;
        const cz = cells.length ? mid(cells.map((c) => c[2])) : 0;
        haloCells = cells.map(([x, y, z, hex]) => [x - cx, y, z - cz, hex]);
        const mat = new THREE.MeshLambertMaterial();
        disposables.push(mat);
        const im = new THREE.InstancedMesh(boxGeo, mat, haloCells.length);
        const dummy = new THREE.Object3D();
        const col = new THREE.Color();
        const vestment = !custom && isPriest(slug) ? saint.vestment : null;
        const look = custom ? null : saint.look;
        haloCells.forEach(([x, y, z, hex], i) => {
          dummy.position.set(x, y, z);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
          im.setColorAt(i, col.set(recolor(hex, look, vestment)));
        });
        root.add(im);
      } else {
        const bob = f % 2 === 1 ? 0.25 : 0;
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
        put(3.2, 3.0, 3.0, 0, 4.9 + bob, 0, saint.look?.skin ?? "#efc6a0");
        put(3.4, 1.0, 3.2, 0, 7.2 + bob, -0.1, saint.look?.hair ?? "#4a2c1a");
        haloCells = [
          [-1.6, 0.5, -1.1], [1.6, 0.5, 1.1],
          [-1.6, 4.9 + bob, -1.6], [1.6, 8.2 + bob, 1.5],
        ];
      }

      // Soft golden head-region glow sprite anchored behind the back-most head tiles
      const halo = headHaloSpot(haloCells, BASE_CAM);
      const topEdge = halo.y + halo.size * 0.48;
      const k = topEdge > 11.3 ? Math.max(1, topEdge / 11.3) : 1;
      cam.position.set(BASE_CAM.x * k, lookY + (BASE_CAM.y - lookY) * k, BASE_CAM.z * k);
      cam.lookAt(0, lookY, 0);

      const phase = (f / count) * Math.PI * 2;
      const spriteMat = new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        opacity: 0.93 + 0.07 * Math.cos(phase),
      });
      disposables.push(spriteMat);
      const haloSprite = new THREE.Sprite(spriteMat);
      const glowSize = halo.size * (1 + 0.035 * Math.sin(phase));
      haloSprite.scale.set(glowSize, glowSize, 1);
      haloSprite.position.set(halo.x, halo.y, halo.z);
      root.add(haloSprite);

      scene.add(root);
      R.render(scene, cam);
      frames.push(canvas.toDataURL("image/png"));
      scene.remove(root);
      disposables.forEach((m) => m.dispose());
    }

    const portrait = { frames, fps };
    portraitCache.set(cacheKey, portrait);
    out.set(id, portrait);
  }

  boxGeo.dispose();
  haloTex.dispose();
  R.dispose();
  R.forceContextLoss?.();
  return out;
}
