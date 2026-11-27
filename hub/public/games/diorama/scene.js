// 3D Voxel Diorama tabletop renderer (three.js r128, global THREE from /vendor/three-r128.min.js).
// Loads Shalone's MagicaVoxel (.vox) models from /api/art with crisp procedural 3D voxel builders for church &
// garden props (auto-upgrading to his custom .vox slugs whenever uploaded) plus tidy chibi stand-ins offline.

import { readVox, toScene } from "/js/vox.js";
import { GRID, BASES, pieceById, baseById } from "./catalog.js";

const CELL = 10;
const BOARD_W = GRID * CELL;

// Exact MagicaVoxel marker colors from apps/candles/public/js/looks.js so recoloring matches every game.
const MARK = {
  hair: ["#255359"],
  eyes: ["#0066ff", "#0b346e"],
  skin: ["#cccc99", "#fad689"],
  shirt: ["#ffcc99"],
  dress: ["#ff9966"],
  belt: ["#ff9999"],
  shoes: ["#ffcccc"],
  chasuble: ["#ff77a8"],
  phelonion: ["#ffcc66"],
};
const MARK_OF = new Map(Object.entries(MARK).flatMap(([part, hexes]) => hexes.map((h) => [h, part])));

export function recolorVoxel(hex, look = null, vestment = null) {
  const part = MARK_OF.get(String(hex).toLowerCase());
  if (!part) return hex;
  if (part === "chasuble" || part === "phelonion") return vestment ?? hex;
  return look?.[part] ?? hex;
}

/** Load any matching .vox models from the Studio API (/api/art); gracefully returns {} if offline. */
export async function loadModels(slugs) {
  const out = {};
  let list = {};
  try {
    const res = await fetch("/api/art");
    if (!res.ok) return out;
    list = (await res.json()).voxels ?? {};
  } catch {
    return out;
  }
  const unique = [...new Set(slugs)].filter((s) => list[s]);
  await Promise.all(unique.map(async (slug) => {
    try {
      const r = await fetch(`/api/art/vox?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(list[slug].saved)}`);
      if (r.ok) out[slug] = { vox: readVox(await r.arrayBuffer()), fps: list[slug].fps ?? 4 };
    } catch { /* fall back to procedural / stand-in */ }
  }));
  return out;
}

let sharedBox = null;
let sharedHaloTex = null;
let sharedSmokeTex = null;

const getBox = () => (sharedBox ??= new THREE.BoxGeometry(1, 1, 1));

function getHaloTex() {
  if (sharedHaloTex) return sharedHaloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,236,165,1)");
  g.addColorStop(0.4, "rgba(255,175,65,0.55)");
  g.addColorStop(1, "rgba(255,140,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sharedHaloTex = new THREE.CanvasTexture(c);
  return sharedHaloTex;
}

function getSmokeTex() {
  if (sharedSmokeTex) return sharedSmokeTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(245,245,252,0.9)");
  g.addColorStop(0.55, "rgba(225,225,238,0.42)");
  g.addColorStop(1, "rgba(220,220,235,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sharedSmokeTex = new THREE.CanvasTexture(c);
  return sharedSmokeTex;
}

function haloSprite(x, y, z, scale = 2.4) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getHaloTex(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  }));
  sp.position.set(x, y, z);
  sp.scale.set(scale, scale, 1);
  sp.userData.flameBase = scale;
  return sp;
}

function createInstancedBuilder(mats) {
  const mat = (hex, opts = null) => {
    const k = opts ? `${hex}:${JSON.stringify(opts)}` : hex;
    if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: hex, ...(opts ?? {}) }));
    return mats.get(k);
  };
  const vox = (parent, w, h, d, x, y, z, hex, opts = null) => {
    const m = new THREE.Mesh(getBox(), mat(hex, opts));
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    parent.add(m);
    return m;
  };
  return { mat, vox };
}

function meshFromVox(slug, model, piece, mats) {
  const all = model.vox.frames.flatMap((_, f) => toScene(model.vox, f));
  if (!all.length) return null;
  const minX = Math.min(...all.map((c) => c[0])), maxX = Math.max(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1])), maxY = Math.max(...all.map((c) => c[1]));
  const minZ = Math.min(...all.map((c) => c[2])), maxZ = Math.max(...all.map((c) => c[2]));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const baseY = minY - 0.5;
  const spanX = maxX - minX + 1, spanY = maxY - minY + 1, spanZ = maxZ - minZ + 1;
  const fit = Math.min(1, 8.6 / Math.max(spanX, spanZ), 15 / Math.max(1, spanY));

  const g = new THREE.Group();
  const root = new THREE.Group();
  root.scale.setScalar(fit);
  g.add(root);

  const flames = [];
  const emitters = [];
  const look = piece.look ?? null;
  const vestment = piece.vestment ?? null;
  const box = getBox();
  const o = new THREE.Object3D();
  const col = new THREE.Color();

  const frames = model.vox.frames.map((_, f) => {
    const cells = toScene(model.vox, f).map(([x, y, z, c]) => [x - cx, y - baseY, z - cz, c]);
    // Highlight bright flame tips on candle/light models and censer emitter marker (#ccffff).
    const isLightModel = /-candle|-light$/.test(slug);
    const topY = isLightModel && cells.length ? Math.max(...cells.map((c) => c[1])) : Infinity;
    const tips = isLightModel ? cells.filter((c) => c[1] >= topY - 0.6 && /#f|#e|#ff/i.test(c[3])) : [];
    const tipSet = new Set(tips);
    const body = cells.filter((c) => !tipSet.has(c));

    const fr = new THREE.Group();
    if (/cense/.test(slug)) {
      const censer = cells.find((c) => c[3].toLowerCase() === "#ccffff");
      if (censer) emitters.push({ fr, local: new THREE.Vector3(censer[0], censer[1] + 0.6, censer[2]) });
    }

    if (body.length) {
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), body.length);
      body.forEach(([x, y, z, c], i) => {
        o.position.set(x, y, z);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, col.set(recolorVoxel(c, look, vestment)));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      fr.add(im);
    }

    for (const [x, y, z, c] of tips) {
      const tipMat = mats.get(`tip:${c}`) ?? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color("#ffd25a"), 0.72) });
      mats.set(`tip:${c}`, tipMat);
      const t = new THREE.Mesh(box, tipMat);
      t.position.set(x, y, z);
      fr.add(t);
      const sp = haloSprite(x, y + 0.35, z, 2.3);
      flames.push(sp);
      fr.add(sp);
    }

    fr.visible = f === 0;
    root.add(fr);
    return fr;
  });

  g.userData.frames = frames;
  g.userData.fps = model.fps ?? 4;
  g.userData.flames = flames;
  g.userData.emitters = emitters;
  g.userData.bounds = { w: spanX * fit, h: spanY * fit, d: spanZ * fit };
  return g;
}

function buildProcedural(kind, mats) {
  const { vox } = createInstancedBuilder(mats);
  const g = new THREE.Group();
  const flames = [];
  const tip = (parent, x, y, z, s = 2.0) => {
    vox(parent, 0.45, 0.7, 0.45, x, y, z, "#ffe26a", { emissive: "#ff9d00", emissiveIntensity: 0.75 });
    const sp = haloSprite(x, y + 0.45, z, s);
    flames.push(sp);
    parent.add(sp);
  };

  if (kind === "pew") {
    vox(g, 7.6, 1.3, 2.4, 0, 0.8, 0.2, "#8c5628");
    vox(g, 6.8, 0.45, 1.8, 0, 2.05, 0.2, "#8f2731"); // burgundy cushion
    vox(g, 7.6, 2.1, 0.7, 0, 1.8, -0.8, "#774720"); // backrest
    vox(g, 0.7, 3.0, 2.8, -3.55, 0, 0.1, "#663c18");
    vox(g, 0.7, 3.0, 2.8, 3.55, 0, 0.1, "#663c18");
    vox(g, 6.4, 0.5, 0.7, 0, 0.25, 1.85, "#8f2731"); // kneeler
  } else if (kind === "altar") {
    vox(g, 8.6, 0.8, 5.4, 0, 0, 0, "#d2c4aa"); // stone step
    vox(g, 7.2, 3.4, 3.8, 0, 0.8, 0, "#f2ebd8"); // marble table
    vox(g, 4.4, 2.3, 0.25, 0, 1.3, 1.92, "#2f8a4c"); // green antependium
    vox(g, 0.5, 1.5, 0.3, 0, 1.7, 1.95, "#e8be42");
    vox(g, 1.2, 0.45, 0.3, 0, 2.4, 1.95, "#e8be42");
    vox(g, 7.6, 0.45, 4.2, 0, 4.15, 0, "#ffffff"); // altar cloth
    // Brass cross
    vox(g, 1.4, 0.35, 1.1, 0, 4.6, -0.7, "#d9a728");
    vox(g, 0.42, 3.1, 0.42, 0, 4.9, -0.7, "#eab938");
    vox(g, 1.9, 0.42, 0.42, 0, 6.8, -0.7, "#eab938");
    // Candlesticks
    for (const sx of [-2.4, 2.4]) {
      vox(g, 0.8, 0.35, 0.8, sx, 4.6, -0.4, "#d9a728");
      vox(g, 0.45, 1.3, 0.45, sx, 4.95, -0.4, "#fff6dc");
      tip(g, sx, 6.25, -0.4, 2.1);
    }
  } else if (kind === "candle-rack") {
    vox(g, 6.8, 0.5, 4.4, 0, 0, 0, "#414854");
    vox(g, 0.6, 3.0, 0.6, -2.5, 0.5, 0, "#343a44");
    vox(g, 0.6, 3.0, 0.6, 2.5, 0.5, 0, "#343a44");
    vox(g, 7.2, 0.45, 3.8, 0, 3.2, 0, "#4b5362");
    const cupColors = ["#d63c48", "#2d6ec8", "#f3f1ea", "#e4ae30", "#d63c48", "#2d6ec8"];
    [-2.2, 0, 2.2].forEach((cx, i) => {
      vox(g, 0.9, 1.0, 0.9, cx, 3.65, -0.9, cupColors[i]);
      vox(g, 0.55, 0.6, 0.55, cx, 4.65, -0.9, "#fff7df");
      tip(g, cx, 5.25, -0.9, 1.7);

      vox(g, 0.9, 1.0, 0.9, cx, 3.2, 1.0, cupColors[i + 3]);
      vox(g, 0.55, 0.6, 0.55, cx, 4.2, 1.0, "#fff7df");
      tip(g, cx, 4.8, 1.0, 1.7);
    });
  } else if (kind === "bell-tower") {
    vox(g, 8.0, 0.9, 4.2, 0, 0, 0, "#b9ad97");
    vox(g, 1.5, 6.8, 2.6, -2.6, 0.9, 0, "#d4c8b2");
    vox(g, 1.5, 6.8, 2.6, 2.6, 0.9, 0, "#d4c8b2");
    vox(g, 7.4, 1.6, 3.0, 0, 7.7, 0, "#c8bba2");
    vox(g, 5.4, 1.0, 2.6, 0, 9.3, 0, "#8f3f33");
    // Cross atop tower
    vox(g, 0.45, 1.8, 0.45, 0, 10.3, 0, "#ebc246");
    vox(g, 1.4, 0.42, 0.42, 0, 11.2, 0, "#ebc246");
    // Swinging bell pivot
    const bell = new THREE.Group();
    bell.position.set(0, 7.5, 0);
    vox(bell, 1.0, 0.4, 0.8, 0, -0.7, 0, "#66401e");
    vox(bell, 1.8, 1.6, 1.8, 0, -2.3, 0, "#eab833");
    vox(bell, 2.4, 0.55, 2.4, 0, -2.7, 0, "#d6a022");
    vox(bell, 0.5, 0.5, 0.5, 0, -3.15, 0, "#755210");
    g.add(bell);
    g.userData.bell = bell;
  } else if (kind === "monstrance") {
    vox(g, 3.6, 0.7, 3.6, 0, 0, 0, "#8c6514");
    vox(g, 2.6, 0.6, 2.6, 0, 0.7, 0, "#dba92c");
    vox(g, 0.8, 2.6, 0.8, 0, 1.3, 0, "#f2c641");
    vox(g, 1.6, 0.6, 1.6, 0, 2.5, 0, "#d49a1a");
    // Sunburst rays
    const halo = new THREE.Group();
    halo.position.set(0, 5.6, 0);
    vox(halo, 3.6, 3.6, 0.7, 0, -1.8, 0, "#ebc03d");
    vox(halo, 5.4, 0.7, 0.4, 0, -0.35, 0, "#ffd85e");
    vox(halo, 0.7, 5.4, 0.4, 0, -2.7, 0, "#ffd85e");
    vox(halo, 2.0, 2.0, 0.9, 0, -1.0, 0, "#fffdf5", { emissive: "#ffe99e", emissiveIntensity: 0.4 });
    vox(halo, 0.45, 1.6, 0.45, 0, 2.7, 0, "#ffd85e");
    vox(halo, 1.3, 0.42, 0.42, 0, 3.5, 0, "#ffd85e");
    const sp = haloSprite(0, 0, 0.5, 4.4);
    flames.push(sp);
    halo.add(sp);
    g.add(halo);
  } else if (kind === "well") {
    vox(g, 6.2, 2.4, 6.2, 0, 0, 0, "#8f9499");
    vox(g, 6.6, 0.6, 6.6, 0, 2.2, 0, "#a7acb0");
    vox(g, 4.4, 0.4, 4.4, 0, 2.55, 0, "#2d78b8"); // blue water
    vox(g, 0.7, 4.0, 0.7, -2.4, 2.6, 0, "#6d4623");
    vox(g, 0.7, 4.0, 0.7, 2.4, 2.6, 0, "#6d4623");
    vox(g, 4.8, 0.45, 0.45, 0, 4.7, 0, "#523215");
    vox(g, 6.4, 0.7, 4.8, 0, 6.5, 0, "#914132");
    vox(g, 5.2, 0.8, 3.2, 0, 7.2, 0, "#7c3326");
    vox(g, 1.1, 1.0, 1.1, 0, 3.1, 0, "#a8703b"); // bucket
  } else if (kind === "lamp") {
    vox(g, 2.4, 0.6, 2.4, 0, 0, 0, "#c89524");
    vox(g, 0.65, 7.6, 0.65, 0, 0.6, 0, "#dba72c");
    vox(g, 2.4, 0.55, 0.6, 0.9, 7.8, 0, "#dba72c");
    vox(g, 0.35, 1.6, 0.35, 1.75, 6.2, 0, "#c89524");
    vox(g, 1.7, 1.9, 1.7, 1.75, 4.4, 0, "#d42636", { emissive: "#7a0c18", emissiveIntensity: 0.45 });
    vox(g, 1.2, 0.5, 1.2, 1.75, 3.9, 0, "#eab938");
    tip(g, 1.75, 5.5, 0, 2.6);
  } else if (kind === "lantern") {
    vox(g, 2.2, 0.7, 2.2, 0, 0, 0, "#8f9499");
    vox(g, 0.75, 6.2, 0.75, 0, 0.7, 0, "#3a3d45");
    vox(g, 2.1, 0.5, 0.6, 0.7, 6.5, 0, "#3a3d45");
    vox(g, 1.6, 1.8, 1.6, 1.4, 4.7, 0, "#ffd875", { emissive: "#ffb326", emissiveIntensity: 0.55 });
    vox(g, 2.0, 0.5, 2.0, 1.4, 6.4, 0, "#2f333b");
    tip(g, 1.4, 5.2, 0, 2.8);
  } else if (kind === "pine") {
    vox(g, 1.6, 2.6, 1.6, 0, 0, 0, "#6d4526");
    vox(g, 6.4, 2.6, 6.4, 0, 2.2, 0, "#2a6e3e");
    vox(g, 4.8, 2.5, 4.8, 0, 4.5, 0, "#338348");
    vox(g, 3.2, 2.4, 3.2, 0, 6.7, 0, "#3e9b54");
    vox(g, 1.4, 1.4, 1.4, 0, 8.9, 0, "#50b364");
  } else if (kind === "apple-tree") {
    vox(g, 1.8, 4.2, 1.8, 0, 0, 0, "#6d4526");
    vox(g, 6.2, 3.6, 6.2, 0, 3.8, 0, "#3d8b41");
    vox(g, 4.6, 2.0, 4.6, 0, 7.1, 0, "#4ca34f");
    for (const [ax, ay, az] of [[-2.7, 5.2, 2.2], [2.4, 4.6, 2.6], [1.4, 6.6, -2.5], [-1.8, 5.8, -2.7], [2.8, 5.7, -0.5]]) {
      vox(g, 0.85, 0.85, 0.85, ax, ay, az, "#e0343a");
    }
  } else if (kind === "flowers") {
    vox(g, 6.6, 1.5, 4.6, 0, 0, 0, "#8f5b2e");
    vox(g, 5.6, 1.1, 3.6, 0, 0.9, 0, "#4e9442");
    for (const [fx, fz, col] of [[-1.8, -0.7, "#e64f78"], [-0.5, 0.6, "#ffcb3c"], [0.9, -0.6, "#55a3ff"], [2.0, 0.5, "#f5f5f5"], [-1.6, 0.9, "#c468eb"], [1.3, 1.0, "#ff7846"]]) {
      vox(g, 0.9, 0.9, 0.9, fx, 1.9, fz, col);
      vox(g, 0.4, 0.4, 0.4, fx, 2.7, fz, "#ffe466");
    }
  } else if (kind === "sheep") {
    vox(g, 3.4, 2.4, 4.4, 0, 1.1, -0.2, "#f3efe6");
    vox(g, 4.0, 1.6, 3.6, 0, 1.5, -0.2, "#faf7f0");
    vox(g, 1.9, 1.9, 2.0, 0, 2.1, 2.1, "#3d3834"); // dark face
    vox(g, 0.7, 0.6, 0.8, -1.2, 2.8, 1.9, "#3d3834");
    vox(g, 0.7, 0.6, 0.8, 1.2, 2.8, 1.9, "#3d3834");
    vox(g, 1.2, 0.7, 1.2, 0, 3.8, 2.0, "#faf7f0"); // wool topknot
    for (const [lx, lz] of [[-1.1, 1.1], [1.1, 1.1], [-1.1, -1.4], [1.1, -1.4]]) vox(g, 0.65, 1.2, 0.65, lx, 0, lz, "#3d3834");
  } else if (kind === "dog") {
    vox(g, 2.6, 2.1, 4.2, 0, 1.1, -0.2, "#c68b4a");
    vox(g, 2.8, 0.6, 1.4, 0, 2.3, 1.2, "#d63b3b"); // red collar
    vox(g, 2.4, 2.2, 2.2, 0, 2.6, 2.0, "#d49b57"); // head
    vox(g, 1.2, 0.9, 1.1, 0, 2.5, 3.2, "#e8be85"); // muzzle
    vox(g, 0.55, 0.45, 0.45, 0, 3.1, 3.65, "#231d19"); // nose
    vox(g, 0.65, 1.2, 0.9, -1.35, 2.8, 1.8, "#8a5624");
    vox(g, 0.65, 1.2, 0.9, 1.35, 2.8, 1.8, "#8a5624");
    for (const [lx, lz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.4], [0.85, -1.4]]) vox(g, 0.65, 1.2, 0.65, lx, 0, lz, "#b3793b");
    const tail = new THREE.Group();
    tail.position.set(0, 2.6, -2.2);
    vox(tail, 0.6, 1.8, 0.6, 0, 0, -0.3, "#d49b57");
    g.add(tail);
    g.userData.tail = tail;
  } else if (kind === "wagon") {
    vox(g, 5.4, 1.8, 6.4, 0, 1.0, 0, "#8f5b2e"); // bed
    for (const [wx, wz] of [[-3.0, 1.8], [3.0, 1.8], [-3.0, -1.8], [3.0, -1.8]]) vox(g, 0.6, 1.9, 1.9, wx, 0, wz, "#4e341c");
    vox(g, 0.5, 4.2, 0.5, -2.4, 2.8, 2.6, "#66401e");
    vox(g, 0.5, 4.2, 0.5, 2.4, 2.8, 2.6, "#66401e");
    vox(g, 0.5, 4.2, 0.5, -2.4, 2.8, -2.6, "#66401e");
    vox(g, 0.5, 4.2, 0.5, 2.4, 2.8, -2.6, "#66401e");
    // Produce inside
    vox(g, 1.8, 1.2, 1.8, -1.1, 2.7, 0.6, "#e87028"); // carrots
    vox(g, 1.6, 1.2, 1.6, 1.1, 2.7, -0.5, "#d8333a"); // apples
    vox(g, 1.4, 1.1, 1.5, 0.8, 2.7, 1.2, "#469e46"); // greens
    // Striped awning
    for (let i = -2; i <= 2; i++) vox(g, 1.15, 0.6, 6.0, i * 1.15, 6.8, 0, i % 2 === 0 ? "#d93d44" : "#fff7ea");
  }

  g.userData.flames = flames;
  return g;
}

function buildFallbackPerson(piece, mats) {
  const { vox } = createInstancedBuilder(mats);
  const g = new THREE.Group();
  const flames = [];
  const look = piece.look ?? {};
  const shirt = piece.vestment ?? look.shirt ?? look.dress ?? "#4c72a6";
  const isChild = /boy|girl/.test(piece.id);
  const s = isChild ? 0.85 : 1.0;

  vox(g, 1.3 * s, 1.1 * s, 1.3 * s, -0.85 * s, 0, 0, look.shoes ?? "#241b15");
  vox(g, 1.3 * s, 1.1 * s, 1.3 * s, 0.85 * s, 0, 0, look.shoes ?? "#241b15");
  vox(g, 3.2 * s, 2.6 * s, 2.1 * s, 0, 1.1 * s, 0, shirt);
  if (look.belt) vox(g, 3.3 * s, 0.5 * s, 2.2 * s, 0, 2.1 * s, 0, look.belt);
  vox(g, 2.7 * s, 2.4 * s, 2.5 * s, 0, 3.7 * s, 0, look.skin ?? "#efc6a0");
  vox(g, 2.9 * s, 0.85 * s, 2.7 * s, 0, 5.65 * s, -0.1 * s, look.hair ?? "#4a2c1a");
  vox(g, 0.45 * s, 0.45 * s, 0.25 * s, -0.6 * s, 4.7 * s, 1.25 * s, look.eyes ?? "#2b2016");
  vox(g, 0.45 * s, 0.45 * s, 0.25 * s, 0.6 * s, 4.7 * s, 1.25 * s, look.eyes ?? "#2b2016");

  if (/candle|taper/.test(piece.id)) {
    vox(g, 0.45, 2.1, 0.45, 1.9 * s, 1.9 * s, 1.1 * s, "#fff7df");
    const sp = haloSprite(1.9 * s, 4.2 * s, 1.1 * s, 1.9);
    flames.push(sp);
    g.add(sp);
  } else if (/cross/.test(piece.id)) {
    vox(g, 0.35, 3.4, 0.35, 1.8 * s, 1.4 * s, 0.9 * s, "#e4b232");
    vox(g, 1.4, 0.35, 0.35, 1.8 * s, 4.0 * s, 0.9 * s, "#e4b232");
  }
  g.userData.flames = flames;
  return g;
}

export function buildPieceObject(piece, models = {}, mats = new Map()) {
  const wrap = new THREE.Group();
  let inner = null;
  for (const slug of piece.vox ?? []) {
    if (models[slug]) {
      inner = meshFromVox(slug, models[slug], piece, mats);
      if (inner) break;
    }
  }
  if (!inner && piece.procedural) inner = buildProcedural(piece.procedural, mats);
  if (!inner) inner = buildFallbackPerson(piece, mats);

  // Subtle circular contact shadow beneath each figurine.
  const shadowMat = mats.get("shadow") ?? new THREE.MeshBasicMaterial({ color: "#1c2330", transparent: true, opacity: 0.16, depthWrite: false });
  mats.set("shadow", shadowMat);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 16), shadowMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.11;
  wrap.add(disc);
  wrap.add(inner);

  wrap.userData.inner = inner;
  wrap.userData.bounds = inner.userData.bounds ?? null;
  wrap.userData.frames = inner.userData.frames ?? [];
  wrap.userData.fps = inner.userData.fps ?? 4;
  wrap.userData.flames = inner.userData.flames ?? [];
  wrap.userData.emitters = inner.userData.emitters ?? [];
  wrap.userData.bell = inner.userData.bell ?? null;
  wrap.userData.tail = inner.userData.tail ?? null;
  return wrap;
}

const tileCoord = (g) => (g - GRID / 2 + 0.5) * CELL;

/** Build an uploaded MagicaVoxel (.vox) backdrop sized 1:1 (80×12–20×24–36) or half-scale auto-fit along North rim. */
function buildBackdropVox(model) {
  const all = model.vox.frames.flatMap((_, f) => toScene(model.vox, f));
  if (!all.length) return null;
  const minX = Math.min(...all.map((c) => c[0])), maxX = Math.max(...all.map((c) => c[0]));
  const minY = Math.min(...all.map((c) => c[1]));
  const minZ = Math.min(...all.map((c) => c[2])), maxZ = Math.max(...all.map((c) => c[2]));
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, baseY = minY - 0.5;
  const spanX = maxX - minX + 1, spanZ = maxZ - minZ + 1;
  const scale = spanX >= 60 ? Math.min(1, 96 / spanX) : (BOARD_W / Math.max(1, spanX));

  const g = new THREE.Group();
  g.scale.setScalar(scale);
  g.position.set(0, 0, -BOARD_W / 2 - (spanZ * scale) / 2 - 0.6);

  const box = getBox(), o = new THREE.Object3D(), col = new THREE.Color();
  const frames = model.vox.frames.map((_, f) => {
    const cells = toScene(model.vox, f).map(([x, y, z, c]) => [x - cx, y - baseY, z - cz, c]);
    const fr = new THREE.Group();
    if (cells.length) {
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), cells.length);
      cells.forEach(([x, y, z, c], i) => {
        o.position.set(x, y, z);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, col.set(c));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      fr.add(im);
    }
    fr.visible = f === 0;
    g.add(fr);
    return fr;
  });
  g.userData.frames = frames;
  g.userData.fps = model.fps ?? 4;
  return g;
}

/** Populate a tabletop boardGroup for `baseObj`, preferring custom uploaded `.vox` backdrop with 14 procedural worlds. */
function populateBoardGroup(boardGroup, baseObj, models, mats) {
  while (boardGroup.children.length) boardGroup.remove(boardGroup.children[0]);
  boardGroup.userData.backdropFrames = [];
  boardGroup.userData.backdropFps = 4;

  const base = baseObj ?? BASES[0];
  const pal = base.palette ?? BASES[0].palette;
  const { vox } = createInstancedBuilder(mats);
  const BZ = -BOARD_W / 2 - 1.3;

  // Tabletop plinth (distinct non-overlapping Y layers so WebGL never z-fights)
  vox(boardGroup, BOARD_W + 6, 4.0, BOARD_W + 6, 0, -4.6, 0, pal.slab);
  vox(boardGroup, BOARD_W + 4.4, 0.45, BOARD_W + 4.4, 0, -0.6, 0, pal.rim);

  // 8×8 checkerboard grid tiles sitting flush at y = 0
  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const col = (gx + gz) % 2 === 0 ? pal.tileA : pal.tileB;
      vox(boardGroup, CELL - 0.35, 0.15, CELL - 0.35, tileCoord(gx), -0.15, tileCoord(gz), col);
    }
  }

  // Flat floor accents always belong to the scene (e.g. chapel aisle carpet / stepping stones / clouds puff rim)
  const style = base.style ?? "plain";
  if (style === "chapel") {
    for (let gz = 1; gz < GRID; gz++) vox(boardGroup, 5.2, 0.08, CELL - 0.5, 0, 0.02, tileCoord(gz), pal.accent || "#b2323b");
  } else if (style === "garden") {
    for (let gx = 0; gx < GRID; gx++) if (gx % 2 === 0) vox(boardGroup, 4.6, 0.08, 4.6, tileCoord(gx), 0.02, tileCoord(3), pal.accent || "#c7c0b0");
  } else if (style === "byzantine") {
    for (let gz = 1; gz < GRID; gz++) {
      vox(boardGroup, 6.2, 0.05, CELL - 0.4, 0, 0.01, tileCoord(gz), "#e4b23c");
      vox(boardGroup, 4.6, 0.08, CELL - 0.5, 0, 0.02, tileCoord(gz), pal.accent || "#c8262f");
    }
  } else if (style === "moon") {
    for (const [cx, cz] of [[-35, -35], [35, 35], [-35, 35]]) {
      vox(boardGroup, 7.2, 0.4, 1.2, cx, 0.01, cz - 3.2, "#8c94a8");
      vox(boardGroup, 7.2, 0.4, 1.2, cx, 0.01, cz + 3.2, "#8c94a8");
      vox(boardGroup, 1.2, 0.4, 5.2, cx - 3.0, 0.01, cz, "#8c94a8");
      vox(boardGroup, 1.2, 0.4, 5.2, cx + 3.0, 0.01, cz, "#8c94a8");
    }
  } else if (style === "clouds") {
    for (const [px, pz, pw] of [[-41, -18, 8], [41, -12, 8], [-39, 18, 9], [40, 22, 8]]) {
      vox(boardGroup, pw, 2.2, 10, px, -0.4, pz, "#ffffff");
      vox(boardGroup, pw - 2, 1.6, 7, px, 1.8, pz, "#f2f8ff");
    }
  } else if (style === "suburb") {
    vox(boardGroup, BOARD_W + 4, 0.12, 4.2, 0, 0.01, BOARD_W / 2 - 2.2, "#cfd6de");
  }

  // Custom Studio/Checklist `.vox` backdrop overrides the procedural north wall when uploaded!
  const customModel = base.backdropSlug ? models?.[base.backdropSlug] : null;
  if (customModel) {
    const built = buildBackdropVox(customModel);
    if (built) {
      boardGroup.add(built);
      boardGroup.userData.backdropFrames = built.userData.frames;
      boardGroup.userData.backdropFps = built.userData.fps;
      return;
    }
  }

  if (style === "chapel") {
    vox(boardGroup, BOARD_W + 2, 11, 1.8, 0, 0, BZ, "#e4d8be");
    [-24, 0, 24].forEach((gx, i) => {
      const col = ["#4b8be0", "#e65b65", "#f0c846"][i];
      vox(boardGroup, 7.6, 6.2, 2.0, gx, 2.6, BZ, col, { emissive: col, emissiveIntensity: 0.25 });
    });
  } else if (style === "garden") {
    vox(boardGroup, BOARD_W + 2, 2.4, 1.6, 0, 0, BZ, "#8c968b");
    for (const sx of [-BOARD_W / 2 - 1.2, BOARD_W / 2 + 1.2]) vox(boardGroup, 1.6, 2.2, 26, sx, 0, -26, "#8c968b");
    for (const [fx, fcol] of [[-32, "#e85d7c"], [-16, "#ffcb3c"], [16, "#55a3ff"], [32, "#e85d7c"]]) {
      vox(boardGroup, 2.4, 1.2, 2.0, fx, 2.4, BZ, "#4e9442");
      vox(boardGroup, 1.1, 0.9, 1.1, fx, 3.5, BZ, fcol);
    }
  } else if (style === "courtyard") {
    vox(boardGroup, BOARD_W + 2, 2.0, 1.6, 0, 0, BZ, "#b8ae9f");
    for (const px of [-36, -12, 12, 36]) {
      vox(boardGroup, 2.6, 8.2, 2.6, px, 2.0, BZ, "#d8cebe");
      vox(boardGroup, 3.2, 1.0, 3.2, px, 10.2, BZ, "#c6bba8");
    }
  } else if (style === "byzantine") {
    vox(boardGroup, BOARD_W + 2, 14, 2.0, 0, 0, BZ, "#d4a438");
    vox(boardGroup, BOARD_W + 4, 1.6, 2.4, 0, 14, BZ, "#b8841c");
    vox(boardGroup, 9.2, 11.2, 2.2, 0, 0.4, BZ, "#783c1c");
    vox(boardGroup, 0.7, 3.4, 0.7, 0, 15.6, BZ, "#ffd85e");
    vox(boardGroup, 2.6, 0.65, 0.65, 0, 17.5, BZ, "#ffd85e");
    [[-30, "#2e4f9a"], [-16, "#9a2b2b"], [16, "#4d7a3a"], [30, "#6f3b96"]].forEach(([ix, icol]) => {
      vox(boardGroup, 7.6, 8.6, 2.2, ix, 3.0, BZ, icol, { emissive: icol, emissiveIntensity: 0.14 });
    });
  } else if (style === "meadow") {
    vox(boardGroup, BOARD_W + 2, 1.4, 5.2, 0, 0, BZ - 1.5, pal.accent || "#429ae0");
    vox(boardGroup, 18, 0.4, 1.4, -14, 1.3, BZ - 1.4, "#c9ebff");
    vox(boardGroup, 22, 0.4, 1.4, 18, 1.3, BZ - 1.6, "#c9ebff");
    for (let x = -36; x <= 36; x += 12) vox(boardGroup, 1.4, 4.6, 1.4, x, 0, BZ + 0.8, "#8c5c2e");
    vox(boardGroup, BOARD_W, 0.9, 0.8, 0, 3.1, BZ + 0.8, "#a6703b");
    vox(boardGroup, BOARD_W, 0.9, 0.8, 0, 1.6, BZ + 0.8, "#a6703b");
  } else if (style === "hall") {
    vox(boardGroup, BOARD_W + 2, 13, 2.0, 0, 0, BZ, "#9e483c");
    // Stone hearth + glowing fire in center
    vox(boardGroup, 14, 9.5, 2.6, 0, 0, BZ + 0.2, "#8f8980");
    vox(boardGroup, 7.6, 5.2, 2.8, 0, 0.6, BZ + 0.3, "#2a1d1a");
    vox(boardGroup, 5.2, 2.4, 1.4, 0, 0.8, BZ + 1.0, "#ff781f", { emissive: "#ff5500", emissiveIntensity: 0.8 });
    vox(boardGroup, 2.6, 1.6, 1.4, 0, 2.8, BZ + 1.0, "#ffe46a", { emissive: "#ffb326", emissiveIntensity: 0.7 });
    const flagCols = ["#e05252", "#4e8fe0", "#f2c641", "#3ea666"];
    for (let i = -5; i <= 5; i++) vox(boardGroup, 4.2, 2.4, 0.6, i * 6.8, 10.6 - (Math.abs(i) % 2), BZ + 1.2, flagCols[Math.abs(i) % 4]);
  } else if (style === "snow") {
    // Twinkling star cubes + snow-roofed chapel + bright Christmas star
    for (const [sx, sy] of [[-32, 21], [-18, 26], [22, 25], [34, 19], [-8, 28], [14, 29]]) {
      vox(boardGroup, 1.1, 1.1, 1.1, sx, sy, BZ - 2, "#fff5c0", { emissive: "#ffd24c", emissiveIntensity: 0.8 });
    }
    vox(boardGroup, 36, 12, 3.0, 0, 0, BZ - 0.6, "#d2dfee");
    vox(boardGroup, 40, 2.4, 4.0, 0, 12, BZ - 0.6, "#ffffff"); // snow roof
    vox(boardGroup, 14, 17, 3.0, 0, 0, BZ - 0.6, "#dce8f5"); // steeple
    vox(boardGroup, 16, 2.6, 3.6, 0, 17, BZ - 0.6, "#ffffff");
    for (const wx of [-12, 12]) vox(boardGroup, 4.2, 5.6, 3.2, wx, 4.2, BZ - 0.6, "#ffcb47", { emissive: "#ffaa1c", emissiveIntensity: 0.75 });
    // Christmas star above steeple
    vox(boardGroup, 2.2, 6.2, 1.2, 0, 22, BZ, "#ffd84d", { emissive: "#ffb300", emissiveIntensity: 0.85 });
    vox(boardGroup, 6.2, 2.2, 1.2, 0, 24, BZ, "#ffd84d", { emissive: "#ffb300", emissiveIntensity: 0.85 });
    for (const px of [-29, 29]) {
      vox(boardGroup, 2.2, 3.0, 2.2, px, 0, BZ, "#5e3d22");
      vox(boardGroup, 8.6, 4.0, 6.0, px, 2.8, BZ, "#2d6e46");
      vox(boardGroup, 6.4, 3.2, 4.6, px, 6.8, BZ, "#ffffff");
    }
  } else if (style === "hilltop") {
    vox(boardGroup, BOARD_W + 2, 3.6, 3.0, 0, 0, BZ - 0.4, "#8a8278");
    vox(boardGroup, 24, 12, 3.6, 0, 3.6, BZ - 0.4, "#9e968c");
    vox(boardGroup, 12, 8.6, 2.2, 0, 4.2, BZ + 0.6, "#5a9fe0", { emissive: "#2f6db5", emissiveIntensity: 0.25 });
    vox(boardGroup, 1.2, 2.2, 1.2, -3.5, 4.4, BZ + 1.8, "#ffe26a", { emissive: "#ff9d00", emissiveIntensity: 0.75 });
    vox(boardGroup, 1.2, 2.2, 1.2, 3.5, 4.4, BZ + 1.8, "#ffe26a", { emissive: "#ff9d00", emissiveIntensity: 0.75 });
    for (const cx of [-28, 28]) {
      vox(boardGroup, 16, 4.2, 4.2, cx, 11, BZ - 1, "#ffffff");
      vox(boardGroup, 10, 3.0, 3.0, cx + (cx < 0 ? 3 : -3), 15.2, BZ - 1, "#f2f8ff");
    }
  } else if (style === "moon") {
    // Jagged lunar ridge + glowing planet Earth in the cosmos
    [[-34, 7], [-22, 11], [-10, 6], [8, 9], [24, 12], [35, 8]].forEach(([rx, rh]) => {
      vox(boardGroup, 14, rh, 4.0, rx, 0, BZ - 0.8, "#6a7284");
    });
    // Voxel Earth floating high behind the Moon
    vox(boardGroup, 14, 14, 10, 0, 15, BZ - 4, "#2d7ce6", { emissive: "#16489c", emissiveIntensity: 0.28 });
    vox(boardGroup, 6, 5, 10.6, -2.5, 20, BZ - 4, "#4cb85b", { emissive: "#2c7a38", emissiveIntensity: 0.22 });
    vox(boardGroup, 5, 4, 10.6, 3.0, 17, BZ - 4, "#4cb85b", { emissive: "#2c7a38", emissiveIntensity: 0.22 });
    vox(boardGroup, 8, 2.2, 10.8, 1.0, 25.5, BZ - 4, "#ffffff");
    vox(boardGroup, 6, 1.8, 10.8, -3.5, 16.5, BZ - 4, "#ffffff");
  } else if (style === "clouds") {
    // Seven-band voxel rainbow arch + fluffy cloud banks
    const rainbow = ["#ff5a65", "#ff9a3c", "#ffd93c", "#54c86a", "#4da6ff", "#6e6be8", "#c46ce8"];
    rainbow.forEach((col, band) => {
      const r = 34 - band * 2.2;
      for (let step = -7; step <= 7; step++) {
        const a = (step / 7) * 1.25;
        vox(boardGroup, 4.2, 2.4, 2.4, Math.sin(a) * r, Math.cos(a) * r - 4, BZ - 1.2, col, { emissive: col, emissiveIntensity: 0.22 });
      }
    });
    for (const cx of [-30, 30]) {
      vox(boardGroup, 18, 5.2, 6.2, cx, 0, BZ, "#ffffff");
      vox(boardGroup, 11, 4.2, 4.6, cx, 5.2, BZ, "#eff6ff");
    }
  } else if (style === "cabin") {
    // Sparkling stream + cozy log cabin + pines
    vox(boardGroup, BOARD_W + 2, 0.8, 4.8, 0, 0, BZ - 1.0, "#3b95d9");
    vox(boardGroup, 26, 11, 5.0, -4, 0.8, BZ - 2.2, "#85522d");
    vox(boardGroup, 30, 3.6, 6.0, -4, 11.8, BZ - 2.2, "#5c3518"); // gable base
    vox(boardGroup, 18, 3.4, 5.0, -4, 15.4, BZ - 2.2, "#4b2b12");
    vox(boardGroup, 3.2, 7.6, 3.2, 6, 12.2, BZ - 2.2, "#8c877f"); // chimney
    vox(boardGroup, 6.2, 5.2, 5.2, -9, 4.2, BZ - 2.2, "#ffd95e", { emissive: "#ffad1c", emissiveIntensity: 0.6 });
    vox(boardGroup, 4.2, 7.8, 5.2, 1.5, 0.8, BZ - 2.2, "#4f2c14"); // cabin door
    for (const px of [24, 34, -30]) {
      vox(boardGroup, 2.2, 3.2, 2.2, px, 0, BZ - 1, "#5c381c");
      vox(boardGroup, 9.2, 4.8, 6.0, px, 3.2, BZ - 1, "#2d6d3f");
      vox(boardGroup, 6.4, 4.6, 4.4, px, 8.0, BZ - 1, "#37854b");
    }
  } else if (style === "suburb") {
    // Crisp white picket fence + 3 colorful houses
    vox(boardGroup, BOARD_W + 2, 1.0, 0.8, 0, 1.2, BZ + 1.2, "#ffffff");
    for (let x = -38; x <= 38; x += 4) vox(boardGroup, 1.4, 3.2, 1.0, x, 0, BZ + 1.2, "#ffffff");
    [[-26, "#f4e3c3", "#d84c44"], [0, "#dbeeff", "#3c6cb0"], [26, "#ffe4d9", "#d98b26"]].forEach(([hx, wall, roof]) => {
      vox(boardGroup, 15, 9.2, 5.0, hx, 0, BZ - 2.4, wall);
      vox(boardGroup, 17, 3.4, 6.0, hx, 9.2, BZ - 2.4, roof);
      vox(boardGroup, 10, 2.8, 4.6, hx, 12.6, BZ - 2.4, roof);
      vox(boardGroup, 3.4, 3.4, 5.2, hx - 3.6, 3.8, BZ - 2.4, "#fff29e", { emissive: "#ffbe3b", emissiveIntensity: 0.4 });
      vox(boardGroup, 2.8, 5.0, 5.2, hx + 3.2, 0, BZ - 2.4, "#6d4224");
    });
  } else if (style === "fuji") {
    // Crimson Torii gate centered + cherry blossom corner trees + grand snow-capped Mount Fuji
    vox(boardGroup, 58, 10, 4.0, 0, 0, BZ - 4.0, "#4b6b9e");
    vox(boardGroup, 42, 8.2, 4.0, 0, 10, BZ - 4.0, "#597bb0");
    vox(boardGroup, 26, 6.6, 4.0, 0, 18.2, BZ - 4.0, "#ffffff");
    vox(boardGroup, 14, 3.4, 4.0, 0, 24.8, BZ - 4.0, "#ffffff");
    // Crimson Torii Gate in foreground of north border
    for (const tx of [-7.5, 7.5]) vox(boardGroup, 2.2, 12, 2.2, tx, 0, BZ + 0.6, "#d93535");
    vox(boardGroup, 21, 1.6, 2.2, 0, 9.2, BZ + 0.6, "#d93535");
    vox(boardGroup, 25, 2.0, 2.8, 0, 12.0, BZ + 0.6, "#2a2424");
    for (const sx of [-31, 31]) {
      vox(boardGroup, 2.2, 5.4, 2.2, sx, 0, BZ, "#664228");
      vox(boardGroup, 10, 5.2, 5.6, sx, 5.2, BZ, "#ff9ec7");
      vox(boardGroup, 6.8, 3.2, 4.2, sx, 10.4, BZ, "#ffc9df");
    }
  } else if (style === "islands") {
    // Turquoise ocean surf strip + twin curved palms + distant lush green volcano island
    vox(boardGroup, BOARD_W + 4, 1.0, 6.2, 0, -0.2, BZ - 1.8, "#26b7d4");
    vox(boardGroup, 36, 0.4, 1.4, -14, 0.8, BZ - 0.6, "#bdf7ff");
    vox(boardGroup, 28, 0.4, 1.4, 20, 0.8, BZ - 1.2, "#bdf7ff");
    vox(boardGroup, 26, 6.5, 4.0, 0, 0.8, BZ - 4.4, "#3ea354");
    vox(boardGroup, 14, 5.5, 4.0, 0, 7.3, BZ - 4.4, "#54b868");
    for (const px of [-31, 31]) {
      const lean = px < 0 ? 1 : -1;
      vox(boardGroup, 1.8, 4.2, 1.8, px, 0, BZ, "#7a542e");
      vox(boardGroup, 1.7, 4.4, 1.7, px + lean * 1.2, 4.2, BZ, "#875f37");
      vox(boardGroup, 1.6, 3.6, 1.6, px + lean * 2.2, 8.6, BZ, "#91683d");
      vox(boardGroup, 10.4, 1.6, 4.0, px + lean * 2.4, 12.2, BZ, "#4ca64a");
      vox(boardGroup, 4.0, 1.6, 10.4, px + lean * 2.4, 12.2, BZ, "#5ab858");
      vox(boardGroup, 1.2, 1.2, 1.2, px + lean * 1.2, 11.0, BZ, "#5a3918");
    }
  }
}

export function createDioramaScene(canvas, { onTapTile, onTapPiece } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 1, 500);
  const mats = new Map();

  scene.add(new THREE.HemisphereLight("#fff8eb", "#566378", 0.96));
  const sun = new THREE.DirectionalLight("#ffe8be", 0.58);
  sun.position.set(42, 76, 48);
  scene.add(sun);

  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  const piecesGroup = new THREE.Group();
  scene.add(piecesGroup);

  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_W, BOARD_W),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitPlane.rotation.x = -Math.PI / 2;
  hitPlane.position.y = 0.05;
  scene.add(hitPlane);

  // Selection ring (golden when selecting, sky-teal when in place/move mode)
  const ringGroup = new THREE.Group();
  ringGroup.visible = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: "#ffc93c" });
  const bar = (w, d, x, z) => {
    const m = new THREE.Mesh(getBox(), ringMat);
    m.scale.set(w, 0.35, d);
    m.position.set(x, 0.25, z);
    ringGroup.add(m);
  };
  bar(9.2, 0.65, 0, -4.3);
  bar(9.2, 0.65, 0, 4.3);
  bar(0.65, 8.6, -4.3, 0);
  bar(0.65, 8.6, 4.3, 0);
  scene.add(ringGroup);

  const placedMap = new Map();
  const puffs = [];
  let currentSig = null;
  let time = 0;

  // Orbit camera state
  const target = { theta: 0.64, phi: 0.72, dist: 140 };
  const camState = { theta: 0.64, phi: 0.72, dist: 140 };
  const updateCamera = () => {
    const r = camState.dist;
    const sinPhi = Math.sin(camState.phi);
    camera.position.set(
      Math.sin(camState.theta) * sinPhi * r,
      Math.cos(camState.phi) * r,
      Math.cos(camState.theta) * sinPhi * r
    );
    camera.lookAt(0, 6, -3);
  };

  function setBase(baseOrId, models = {}) {
    const baseObj = typeof baseOrId === "string" ? (baseById(baseOrId) ?? BASES[0]) : (baseOrId ?? BASES[0]);
    const hasCustom = !!(baseObj.backdropSlug && models?.[baseObj.backdropSlug]);
    const sig = `${baseObj.id}:${baseObj.style}:${baseObj.backdropSlug}:${hasCustom ? "vox" : "proc"}:${JSON.stringify(baseObj.palette)}`;
    if (currentSig === sig) return;
    currentSig = sig;
    scene.background = new THREE.Color(baseObj.palette?.sky ?? "#dbeeff");
    populateBoardGroup(boardGroup, baseObj, models, mats);
  }

  function syncPlaced(items, models, { popUid = null } = {}) {
    const keep = new Set(items.map((x) => x.uid));
    for (const [uid, rec] of placedMap.entries()) {
      if (!keep.has(uid)) {
        piecesGroup.remove(rec.group);
        placedMap.delete(uid);
      }
    }
    for (const item of items) {
      const piece = pieceById(item.id);
      if (!piece) continue;
      const sig = piece.vox?.find((slug) => models[slug]) ?? "fallback";
      let rec = placedMap.get(item.uid);
      if (!rec || rec.id !== item.id || rec.sig !== sig) {
        const prevPop = rec?.pop ?? 0, prevHop = rec?.hop ?? 0;
        if (rec) piecesGroup.remove(rec.group);
        const group = buildPieceObject(piece, models, mats);
        group.userData.uid = item.uid;
        group.traverse((o) => { o.userData.uid = item.uid; });
        piecesGroup.add(group);
        rec = { group, id: item.id, sig, gx: item.gx, gz: item.gz, rot: item.rot, pop: item.uid === popUid ? 1 : prevPop, hop: prevHop, ring: 0 };
        placedMap.set(item.uid, rec);
      }
      rec.gx = item.gx;
      rec.gz = item.gz;
      rec.rot = item.rot;
      rec.group.position.set(tileCoord(item.gx), 0, tileCoord(item.gz));
      rec.group.rotation.y = (item.rot * Math.PI) / 2;
      rec.group.traverse((o) => { o.userData.gx = item.gx; o.userData.gz = item.gz; });
    }
  }

  function setSelection(gx, gz, mode = "select") {
    if (gx == null || gz == null) {
      ringGroup.visible = false;
      return;
    }
    ringGroup.visible = true;
    ringGroup.position.set(tileCoord(gx), 0, tileCoord(gz));
    ringMat.color.set(mode === "place" || mode === "move" ? "#16c79a" : "#ffc93c");
  }

  function hop(uid) {
    const rec = placedMap.get(uid);
    if (!rec) return;
    rec.hop = 1;
    if (rec.group.userData.bell) rec.ring = 1;
  }

  // Pointer orbit / pinch / tap handling
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const activePointers = new Map();
  let dragStart = null;
  let lastSingle = null;
  let lastPinchDist = null;
  let moved = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY };
      lastSingle = { x: e.clientX, y: e.clientY };
      moved = 0;
      lastPinchDist = null;
    } else if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      lastSingle = null;
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1 && lastSingle) {
      const dx = e.clientX - lastSingle.x;
      const dy = e.clientY - lastSingle.y;
      lastSingle = { x: e.clientX, y: e.clientY };
      moved = Math.max(moved, Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y));
      target.theta -= dx * 0.009;
      target.phi = Math.max(0.42, Math.min(1.22, target.phi - dy * 0.007));
    } else if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist) {
        target.dist = Math.max(76, Math.min(176, target.dist - (d - lastPinchDist) * 0.25));
      }
      lastPinchDist = d;
      moved = 99;
    }
  });

  const endPointer = (e) => {
    const wasSingle = activePointers.size === 1 && dragStart && moved <= 9;
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastPinchDist = null;
    if (activePointers.size === 1) {
      const [rem] = activePointers.values();
      lastSingle = { ...rem };
    }
    if (!wasSingle) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);

    const pieceHits = ray.intersectObjects(piecesGroup.children, true);
    if (pieceHits.length) {
      const uid = pieceHits[0].object.userData.uid;
      const rec = placedMap.get(uid);
      if (rec) {
        onTapPiece?.(uid, rec.gx, rec.gz);
        return;
      }
    }
    const tileHits = ray.intersectObject(hitPlane, false);
    if (tileHits.length) {
      const pt = tileHits[0].point;
      const gx = Math.floor(pt.x / CELL + GRID / 2);
      const gz = Math.floor(pt.z / CELL + GRID / 2);
      if (gx >= 0 && gx < GRID && gz >= 0 && gz < GRID) onTapTile?.(gx, gz);
    }
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    target.dist = Math.max(76, Math.min(176, target.dist + e.deltaY * 0.08));
  }, { passive: false });

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1.1 ? Math.min(52, 38 / Math.max(0.72, camera.aspect)) : 38;
    camera.updateProjectionMatrix();
  }

  let raf = 0, last = performance.now();
  const loop = (now) => {
    const dt = document.hidden ? 0 : Math.min(0.08, (now - last) / 1000);
    last = now;
    time += dt;

    camState.theta += (target.theta - camState.theta) * Math.min(1, dt * 14);
    camState.phi += (target.phi - camState.phi) * Math.min(1, dt * 14);
    camState.dist += (target.dist - camState.dist) * Math.min(1, dt * 14);
    updateCamera();

    if (ringGroup.visible) {
      const pulse = 1 + 0.03 * Math.sin(time * 6);
      ringGroup.scale.set(pulse, 1, pulse);
    }

    const bgFrames = boardGroup.userData.backdropFrames;
    if (bgFrames?.length > 1) {
      const k = Math.floor(time * (boardGroup.userData.backdropFps ?? 4)) % bgFrames.length;
      bgFrames.forEach((f, i) => { f.visible = i === k; });
    }

    for (const rec of placedMap.values()) {
      const ud = rec.group.userData;
      const frames = ud.frames;
      if (frames?.length > 1) {
        const k = Math.floor(time * (ud.fps ?? 4)) % frames.length;
        frames.forEach((f, i) => { f.visible = i === k; });
      }
      for (const sp of ud.flames ?? []) {
        const b = sp.userData.flameBase ?? 2.0;
        const k = b * (0.9 + 0.2 * Math.sin(time * 11 + sp.id));
        sp.scale.set(k, k, 1);
      }
      if (ud.tail) ud.tail.rotation.z = Math.sin(time * 9) * 0.45;
      if (ud.bell) {
        if (rec.ring > 0) {
          rec.ring = Math.max(0, rec.ring - dt * 0.7);
          ud.bell.rotation.z = Math.sin(time * 18) * 0.42 * rec.ring;
        } else {
          ud.bell.rotation.z *= Math.max(0, 1 - dt * 6);
        }
      }
      for (const em of ud.emitters ?? []) {
        if (em.fr.visible && time >= (rec.nextPuff ?? 0) && puffs.length < 24) {
          rec.nextPuff = time + 0.22;
          const worldAt = em.local.clone();
          em.fr.localToWorld(worldAt);
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getSmokeTex(), transparent: true, depthWrite: false, opacity: 0.7 }));
          sp.position.copy(worldAt);
          scene.add(sp);
          puffs.push({ sp, life: 0, seed: Math.random() * 6 });
        }
      }
      if (rec.pop > 0) {
        rec.pop = Math.max(0, rec.pop - dt * 3.2);
        const s = 1 + Math.sin(rec.pop * Math.PI) * 0.35;
        rec.group.scale.set(s, 1 / Math.sqrt(s), s);
      } else if (rec.hop > 0) {
        rec.hop = Math.max(0, rec.hop - dt * 2.2);
        rec.group.position.y = Math.sin((1 - rec.hop) * Math.PI) * 3.6;
        const s = 1 + Math.sin((1 - rec.hop) * Math.PI) * 0.14;
        rec.group.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
      } else {
        rec.group.position.y = 0;
        rec.group.scale.set(1, 1, 1);
      }
    }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.life += dt;
      p.sp.position.y += dt * 2.1;
      p.sp.position.x += Math.sin(p.life * 2.5 + p.seed) * dt * 0.5;
      const k = 1.6 + p.life * 1.4;
      p.sp.scale.set(k, k, 1);
      p.sp.material.opacity = 0.72 * Math.max(0, 1 - p.life / 2.2);
      if (p.life >= 2.2) {
        scene.remove(p.sp);
        p.sp.material.dispose();
        puffs.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  resize();
  raf = requestAnimationFrame(loop);

  return {
    setBase,
    syncPlaced,
    setSelection,
    hop,
    zoomBy: (delta) => { target.dist = Math.max(76, Math.min(186, target.dist + delta)); },
    resetCamera: () => { target.theta = 0.64; target.phi = 0.72; target.dist = 140; },
    resize,
    dispose: () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}

/** Bake crisp PNG data URL thumbnails for shelf cards using one temporary offscreen WebGL context. */
export function renderThumbnails(pieces, models) {
  const out = {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(128, 128, false);
  } catch {
    return out;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#ffffff", "#5a6880", 1.05));
  const sun = new THREE.DirectionalLight("#ffe8be", 0.55);
  sun.position.set(14, 24, 18);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 100);
  const mats = new Map();
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  for (const piece of pieces) {
    const obj = buildPieceObject(piece, models, mats);
    scene.add(obj);
    let maxDim, cy;
    const b = obj.userData.bounds;
    if (b) {
      maxDim = Math.max(5.2, b.w, b.h, b.d);
      cy = b.h * 0.5;
    } else {
      box.setFromObject(obj);
      box.getSize(size);
      box.getCenter(center);
      maxDim = Math.max(5.2, size.x, size.y, size.z);
      cy = center.y;
    }
    const dist = maxDim * 2.35;
    cam.position.set(dist * 0.55, cy + dist * 0.42, dist * 0.78);
    cam.lookAt(0, cy, 0);
    renderer.render(scene, cam);
    try {
      out[piece.id] = renderer.domElement.toDataURL("image/png");
    } catch { /* ignore */ }
    scene.remove(obj);
  }

  renderer.dispose();
  renderer.forceContextLoss?.();
  return out;
}

/** Turntable 3D spotlight renderer inside the Prize Box modal. */
export function createSpotlight(canvas, piece, models) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const w = canvas.clientWidth || 240, h = canvas.clientHeight || 220;
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#fff9ec", "#566378", 1.05));
  const sun = new THREE.DirectionalLight("#ffdf9e", 0.65);
  sun.position.set(12, 24, 16);
  scene.add(sun);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.9, 1.4, 8),
    new THREE.MeshLambertMaterial({ color: "#efc246" })
  );
  ped.position.y = -0.7;
  scene.add(ped);

  const obj = buildPieceObject(piece, models);
  scene.add(obj);

  const b = obj.userData.bounds;
  let maxDim, cy;
  if (b) {
    maxDim = Math.max(5.5, b.w, b.h, b.d);
    cy = b.h * 0.5;
  } else {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    maxDim = Math.max(5.5, size.x, size.y, size.z);
    cy = center.y;
  }
  const cam = new THREE.PerspectiveCamera(34, w / h, 0.5, 100);
  const dist = maxDim * 2.35;
  cam.position.set(0, cy + dist * 0.36, dist * 0.92);
  cam.lookAt(0, cy, 0);

  let raf = 0, last = performance.now(), angle = 0;
  const tick = (now) => {
    const dt = Math.min(0.08, (now - last) / 1000);
    last = now;
    angle += dt * 1.35;
    obj.rotation.y = angle;
    const ud = obj.userData;
    if (ud.frames?.length > 1) {
      const k = Math.floor((now / 1000) * (ud.fps ?? 4)) % ud.frames.length;
      ud.frames.forEach((f, i) => { f.visible = i === k; });
    }
    if (ud.tail) ud.tail.rotation.z = Math.sin(angle * 4) * 0.45;
    if (ud.bell) ud.bell.rotation.z = Math.sin(angle * 3) * 0.25;
    for (const sp of ud.flames ?? []) {
      const b = sp.userData.flameBase ?? 2.0;
      const s = b * (0.9 + 0.2 * Math.sin(angle * 8 + sp.id));
      sp.scale.set(s, s, 1);
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}

/** Rotating miniature 3D tabletop preview of an unlocked diorama world inside the Prize Box modal. */
export function createBaseSpotlight(canvas, baseObj, models = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const w = canvas.clientWidth || 240, h = canvas.clientHeight || 220;
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(baseObj?.palette?.sky ?? "#dbeeff");
  scene.add(new THREE.HemisphereLight("#fff8eb", "#566378", 0.98));
  const sun = new THREE.DirectionalLight("#ffe8be", 0.6);
  sun.position.set(36, 70, 42);
  scene.add(sun);

  const boardGroup = new THREE.Group();
  const mats = new Map();
  populateBoardGroup(boardGroup, baseObj, models, mats);
  scene.add(boardGroup);

  const cam = new THREE.PerspectiveCamera(36, w / h, 1, 500);
  cam.position.set(0, 88, 122);
  cam.lookAt(0, 5, -6);

  let raf = 0, last = performance.now(), angle = 0.45;
  const tick = (now) => {
    const dt = Math.min(0.08, (now - last) / 1000);
    last = now;
    angle += dt * 0.65;
    boardGroup.rotation.y = angle;
    const bgFrames = boardGroup.userData.backdropFrames;
    if (bgFrames?.length > 1) {
      const k = Math.floor((now / 1000) * (boardGroup.userData.backdropFps ?? 4)) % bgFrames.length;
      bgFrames.forEach((f, i) => { f.visible = i === k; });
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
