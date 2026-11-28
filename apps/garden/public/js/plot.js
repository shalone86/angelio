// 3D voxel garden scene for Garden Givers (three.js r128, global THREE from vendor/three-r128.min.js):
// garden beds, fruit orchard, herb planters, Food Bank cart, player gardener, animated pests,
// and the courier monk carrying baskets to the food bank!
import { readVox, toScene } from "./vox.js";
import { randomLook, recolor } from "./looks.js";
import { cropById } from "./crops.js";
import { variantsOf, buildCritterGroup } from "./critters.js";

const ART = typeof location !== "undefined" && /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

export const MODELS = [
  "monk-idle", "monk-walk", "nun-idle", "nun-walk",
  "man-walk", "man-idle", "woman-walk", "woman-idle",
  "bug-idle", "bug-walk", "bird-idle", "bird-walk", "squirrel-idle", "squirrel-walk", "raccoon-idle", "raccoon-walk",
];

export const TREE_COLLIDER_R = 4.4;

/** Project a target point outside every circle collider (`c.r + pad`) so characters never aim inside a tree. */
export function clearTarget(pt, colliders = [], pad = 0.3) {
  let x = pt.x, z = pt.z;
  for (let pass = 0; pass < 3; pass++) {
    for (const c of colliders) {
      const r = c.r + pad;
      const ox = x - c.x, oz = z - c.z;
      const d = Math.hypot(ox, oz);
      if (d < r) {
        const nx = d > 1e-5 ? ox / d : 0;
        const nz = d > 1e-5 ? oz / d : 1;
        x = c.x + nx * r;
        z = c.z + nz * r;
      }
    }
  }
  return { x, z };
}

/** Advance `pos` toward `dest` up to `maxStep` while pushing and sliding cleanly around circle `colliders`. */
export function stepWithCollisions(pos, dest, maxStep, colliders = []) {
  const dx = dest.x - pos.x, dz = dest.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 1e-6 || maxStep <= 0) return { x: pos.x, z: pos.z, moved: false, rot: null };
  const step = Math.min(dist, maxStep);
  const pushOut = (p) => {
    let x = p.x, z = p.z, blocker = null;
    for (let pass = 0; pass < 3; pass++) {
      for (const c of colliders) {
        const ox = x - c.x, oz = z - c.z;
        const d = Math.hypot(ox, oz);
        if (d < c.r) {
          blocker = c;
          const nx = d > 1e-5 ? ox / d : 0;
          const nz = d > 1e-5 ? oz / d : 1;
          x = c.x + nx * c.r;
          z = c.z + nz * c.r;
        }
      }
    }
    return { x, z, blocker };
  };
  let next = pushOut({ x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step });
  let movedDist = Math.hypot(next.x - pos.x, next.z - pos.z);
  if (movedDist < step * 0.25 && dist > 0.5 && next.blocker) {
    const c = next.blocker;
    const ox = pos.x - c.x, oz = pos.z - c.z;
    const od = Math.hypot(ox, oz) || 1;
    const rx = ox / od, rz = oz / od;
    const t1 = { x: -rz, z: rx }, t2 = { x: rz, z: -rx };
    const score = (t) => t.x * (dest.x - pos.x) + t.z * (dest.z - pos.z) + t.z * 0.05;
    const tan = score(t1) >= score(t2) ? t1 : t2;
    next = pushOut({ x: pos.x + tan.x * step, z: pos.z + tan.z * step });
    movedDist = Math.hypot(next.x - pos.x, next.z - pos.z);
  }
  const mdx = next.x - pos.x, mdz = next.z - pos.z;
  const moved = movedDist > 1e-4;
  return { x: next.x, z: next.z, moved, rot: moved ? Math.atan2(mdx, mdz) : null };
}

export async function loadModels(names = MODELS) {
  const out = {};
  let list = {};
  try { list = (await (await fetch(`${ART}/api/art`)).json()).voxels ?? {}; } catch { return out; }
  await Promise.all(names.filter((n) => list[n]).map(async (n) => {
    try {
      const r = await fetch(`${ART}/api/art/vox?slug=${encodeURIComponent(n)}&v=${encodeURIComponent(list[n].saved)}`);
      if (r.ok) out[n] = { vox: readVox(await r.arrayBuffer()), fps: list[n].fps ?? 4 };
    } catch { /* stand-in used */ }
  }));
  return out;
}

export function createPlot(canvas, { models = {}, stage, gardener }) {
  const THREE = window.THREE;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const night = !!stage.night;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(night ? "#233630" : "#70b258");
  const cam = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (hex) => {
    if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex }));
    return mats.get(hex);
  };
  const basicMats = new Map();
  const basicMat = (hex) => {
    if (!basicMats.has(hex)) basicMats.set(hex, new THREE.MeshBasicMaterial({ color: hex }));
    return basicMats.get(hex);
  };
  const block = (w, h, d, x, y, z, m, parent = scene) => {
    const o = new THREE.Mesh(box, m);
    o.scale.set(w, h, d);
    o.position.set(x, y + h / 2, z);
    parent.add(o);
    return o;
  };
  let time = 0, disposed = false;

  // Lighting & ground
  scene.add(new THREE.HemisphereLight(night ? "#95a8db" : "#fff7e2", night ? "#192420" : "#4b6935", night ? 0.85 : 0.96));
  const sun = new THREE.DirectionalLight(night ? "#9cb2e8" : "#ffe6c0", night ? 0.42 : 0.56);
  sun.position.set(-25, 55, 32);
  scene.add(sun);

  block(360, 0.5, 280, 0, -0.5, -20, mat(night ? "#233630" : "#70b258")); // meadow
  block(46, 0.12, 5.2, 2, 0, -0.5, mat(night ? "#5c5342" : "#ccb184"));   // central dirt path
  block(12, 0.12, 22, 14, 0, -2, mat(night ? "#5c5342" : "#ccb184"));    // lane toward food bank

  // Back monastery stone wall + garden lanterns
  const STONE = night ? "#68665e" : "#b8ad94";
  const STONE_DK = night ? "#525049" : "#9c9178";
  block(66, 6, 2.2, 1, 0, -18.5, mat(STONE));
  block(67, 1, 2.6, 1, 6, -18.5, mat(STONE_DK));
  for (const lx of [-18, -6, 6, 18]) {
    block(1.4, 2, 1.4, lx, 7, -18.5, mat("#2e2a24"));
    block(0.9, 1.2, 0.9, lx, 7.4, -18.5, new THREE.MeshBasicMaterial({ color: night ? "#ffd87a" : "#ffeab0" }));
    if (night) {
      const pl = new THREE.PointLight("#ffcf80", 1.1, 26, 1.4);
      pl.position.set(lx, 8.5, -14);
      scene.add(pl);
    }
  }

  // Food Bank cart & awning on the right (where courier monks deliver baskets)
  const BANK_POS = { x: 20, z: -2.5 };
  const bankGroup = new THREE.Group();
  bankGroup.position.set(BANK_POS.x, 0, BANK_POS.z);
  scene.add(bankGroup);
  block(9, 0.4, 7, 0, 0, 0, mat(STONE_DK), bankGroup);             // cobblestone apron
  block(7.2, 2.8, 4.4, 0, 1.1, 0, mat("#8b5a2b"), bankGroup);      // wagon bed
  for (const wx of [-2.4, 2.4]) for (const wz of [-2.2, 2.2]) block(1.6, 1.6, 0.5, wx, 0, wz, mat("#3a2614"), bankGroup);
  for (const sx of [-3.2, 3.2]) for (const sz of [-1.8, 1.8]) block(0.5, 4.4, 0.5, sx, 3.9, sz, mat("#5c3a1e"), bankGroup);
  for (let i = 0; i < 6; i++) block(1.3, 0.6, 5.2, -3.2 + i * 1.3, 8.2, 0, mat(i % 2 ? "#f4efe2" : "#c8262f"), bankGroup);
  const deliverPile = new THREE.Group();
  deliverPile.position.set(-1.6, 3.9, 0.4);
  bankGroup.add(deliverPile);

  // Voxel actor builder (uses Shalone's models if uploaded, falls back cleanly to recolored monk/nun/man/woman)
  const meshFor = (name, look) => {
    const m = models[name];
    if (!m) return null;
    const g = new THREE.Group();
    const all = m.vox.frames.flatMap((_, f) => toScene(m.vox, f));
    const mid = (k) => (Math.min(...all.map((c) => c[k])) + Math.max(...all.map((c) => c[k]))) / 2;
    const cx = all.length ? mid(0) : 0, cz = all.length ? mid(2) : 0;
    g.userData.frames = m.vox.frames.map((_, f) => {
      const cells = toScene(m.vox, f);
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), cells.length);
      im.frustumCulled = false;
      const o = new THREE.Object3D(), col = new THREE.Color();
      cells.forEach(([x, y, z, c], i) => {
        o.position.set(x - cx, y, z - cz);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, col.set(recolor(c, look, null)));
      });
      im.visible = f === 0;
      g.add(im);
      return im;
    });
    g.userData.fps = m.fps;
    return g;
  };
  const animate = (g, t) => {
    const fr = g.userData?.frames;
    if (fr?.length > 1) {
      const k = Math.floor(t * (g.userData.fps || 2)) % fr.length;
      fr.forEach((m, i) => { m.visible = i === k; });
    }
  };
  const standPerson = (robe, hair) => {
    const g = new THREE.Group();
    block(2.8, 4.6, 2.0, 0, 0, 0, mat(robe), g);
    block(2.9, 0.5, 2.1, 0, 2.0, 0, mat("#e8dcc0"), g);
    block(2.4, 2.3, 2.3, 0, 4.7, 0, mat("#efc6a0"), g);
    block(2.6, 1.0, 2.5, 0, 6.4, -0.1, mat(hair), g);
    g.userData.frames = [];
    return g;
  };
  const makePerson = ({ nun = false, robe = "#5a4030" }, scale = 1.0) => {
    const look = { ...randomLook(), shirt: robe, dress: robe, belt: "#e8dcc0", shoes: "#2a1a10", hair: nun ? robe : "#3b2818" };
    const order = nun ? ["nun-walk", "woman-walk", "nun-idle", "woman-idle"] : ["monk-walk", "man-walk", "monk-idle", "man-idle"];
    const idleOrder = nun ? ["nun-idle", "woman-idle", "nun-walk", "woman-walk"] : ["monk-idle", "man-idle", "monk-walk", "man-walk"];
    const g = new THREE.Group();
    const walkMesh = order.map((n) => meshFor(n, look)).find(Boolean) ?? standPerson(robe, look.hair);
    let idleName = null, idleMesh = null;
    for (const n of idleOrder) {
      const m = meshFor(n, look);
      if (m) { idleName = n; idleMesh = m; break; }
    }
    idleMesh ??= standPerson(robe, look.hair);
    const idleHasAnim = Boolean(idleName?.endsWith("-idle"));
    walkMesh.visible = false;
    g.add(idleMesh, walkMesh);
    g.scale.setScalar(scale);
    scene.add(g);
    let walking = false;
    return {
      g,
      setWalk(w) { walking = !!w; idleMesh.visible = !walking; walkMesh.visible = walking; },
      tick(dt) {
        if (walking) animate(walkMesh, time);
        else if (idleHasAnim) animate(idleMesh, time);
        void dt;
      },
    };
  };

  // Player gardener (tends spots & shoos pests)
  const HOME_AT = { x: -3, z: -0.5 };
  const player = makePerson(gardener, 1.08);
  player.g.position.set(HOME_AT.x, 0, HOME_AT.z);
  let playerTarget = null, playerReturnAt = 0;

  // Persistent courier helpers: widely separated posts + round-robin dispatch so neither helper overlaps or sits unused
  const MAX_COURIERS = 2;
  const HELPER_POSTS = [
    { home: { x: 9.0, z: -4.2 }, bank: { x: BANK_POS.x - 4.5, z: -3.6 } },
    { home: { x: 9.0, z: 2.2 }, bank: { x: BANK_POS.x - 4.5, z: -0.4 } },
  ];
  const couriers = [];
  const pendingDeliveries = [];
  let nextCourier = 0;
  function makeBasket() {
    const b = new THREE.Group();
    block(2.4, 1.3, 1.8, 0, 0, 0, mat("#c99449"), b);
    b.userData.cubes = Array.from({ length: 3 }, (_, i) =>
      block(0.8, 0.8, 0.8, -0.7 + i * 0.7, 1.2, 0, mat("#ff7a22"), b));
    b.visible = false;
    return b;
  }
  function setBasketCrops(basket, crops) {
    (basket.userData.cubes ?? []).forEach((cube, i) => {
      const cid = crops[i];
      cube.visible = Boolean(cid);
      if (cid) cube.material = mat(cropById(cid).color);
    });
  }
  function startDelivery(c, crops) {
    setBasketCrops(c.basket, crops);
    c.crops = crops;
    c.basket.visible = true;
    c.state = "to-bank";
    c.actor.setWalk(true);
  }
  if (!stage.vigil) {
    HELPER_POSTS.slice(0, MAX_COURIERS).forEach((post) => {
      const actor = makePerson({ nun: false, robe: "#5a4030" }, 1.0);
      const basket = makeBasket();
      basket.position.set(0, 2.7, 1.5);
      actor.g.add(basket);
      actor.g.position.set(post.home.x, 0, post.home.z);
      actor.g.rotation.y = -Math.PI / 2;
      actor.setWalk(false);
      couriers.push({ actor, basket, crops: null, home: post.home, bank: post.bank, state: "idle" });
    });
  }
  function deliver(crops) {
    for (let i = 0; i < couriers.length; i++) {
      const idx = (nextCourier + i) % couriers.length;
      if (couriers[idx].state === "idle") {
        nextCourier = (idx + 1) % couriers.length;
        startDelivery(couriers[idx], crops);
        return;
      }
    }
    if (pendingDeliveries.length < 4) pendingDeliveries.push(crops);
  }

  // Garden beds, fruit trees, & herb planters
  const spotMeshes = new Map();
  const hitTargets = [];
  const treeColliders = [];
  const registerHit = (mesh, info) => { mesh.userData = info; hitTargets.push(mesh); };

  function buildSpot(s) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    scene.add(g);
    const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false }));
    const cropGroup = new THREE.Group();
    const fruitMeshes = [];
    let topY = 3.8, pestBaseY = 2.9, pestTopY = 5.0, cropBaseY = 0;

    if (s.kind === "tree") {
      if (s.crop === "apple") {
        block(2.2, 0.9, 2.2, 0, 0, 0, mat("#5c391b"), g);
        block(1.5, 4.8, 1.5, 0, 0.5, 0, mat("#6e4624"), g);
        block(0.6, 0.8, 1.6, -1.0, 4.4, 0, mat("#6e4624"), g);
        block(0.6, 0.8, 1.6, 1.0, 4.6, 0, mat("#6e4624"), g);
        const leaves = night ? ["#214c2a", "#2b5e35", "#387243"] : ["#2f7d38", "#3d9646", "#50b058"];
        block(6.0, 2.6, 6.0, 0, 4.6, 0, mat(leaves[0]), g);
        block(5.0, 2.4, 5.0, 0, 6.8, 0, mat(leaves[1]), g);
        block(3.2, 1.5, 3.2, 0, 8.8, 0, mat(leaves[2]), g);
        hit.scale.set(6.0, 11.2, 6.0);
        hit.position.set(0, 5.6, 0);
        for (const [fx, fy, fz] of [[-2.0, 5.0, 2.75], [1.8, 6.0, 2.6], [-0.2, 7.6, 2.3], [2.4, 5.3, -1.7], [-2.5, 6.2, -1.5]]) {
          const fg = new THREE.Group();
          fg.position.set(fx, fy, fz);
          block(1.1, 1.05, 1.1, 0, 0, 0, mat("#df2935"), fg);
          block(0.28, 0.35, 0.28, 0, 1.0, 0, mat("#543216"), fg);
          block(0.45, 0.22, 0.35, 0.2, 1.08, 0, mat("#73cf58"), fg);
          cropGroup.add(fg);
          fruitMeshes.push(fg);
        }
        topY = 10.8; pestBaseY = 10.2; pestTopY = 12.8;
      } else {
        block(2.0, 0.8, 2.0, 0, 0, 0, mat("#5c3a1d"), g);
        block(1.4, 5.0, 1.4, 0, 0.4, 0, mat("#754c28"), g);
        const leaves = night ? ["#234d30", "#2f613d", "#3c754b"] : ["#367d47", "#469658", "#58ad68"];
        block(5.4, 2.4, 5.4, 0, 4.5, 0, mat(leaves[0]), g);
        block(4.6, 2.6, 4.6, 0, 6.6, 0, mat(leaves[1]), g);
        block(3.0, 2.0, 3.0, 0, 8.9, 0, mat(leaves[2]), g);
        hit.scale.set(5.8, 11.6, 5.8);
        hit.position.set(0, 5.8, 0);
        for (const [fx, fy, fz] of [[-1.8, 4.8, 2.55], [1.6, 6.1, 2.4], [-0.1, 7.7, 2.05], [2.1, 5.1, -1.7]]) {
          const fg = new THREE.Group();
          fg.position.set(fx, fy, fz);
          block(1.05, 0.85, 1.05, 0, 0, 0, mat("#cadb3b"), fg);
          block(0.68, 0.65, 0.68, 0, 0.78, 0, mat("#b5c72e"), fg);
          block(0.24, 0.32, 0.24, 0, 1.38, 0, mat("#543216"), fg);
          cropGroup.add(fg);
          fruitMeshes.push(fg);
        }
        topY = 11.4; pestBaseY = 10.8; pestTopY = 13.4;
      }
      treeColliders.push({ x: s.x, z: s.z, r: TREE_COLLIDER_R });
    } else if (s.kind === "bed") {
      hit.scale.set(5.8, 4.5, 4.8);
      hit.position.set(0, 2.2, 0);
      if (s.crop === "carrot") {
        cropBaseY = 1.25;
        block(5.6, 1.0, 4.4, 0, 0, 0, mat("#7d4f27"), g);
        block(4.8, 0.35, 3.6, 0, 0.9, 0, mat("#3d2412"), g);
        for (const ox of [-1.5, 0, 1.5]) {
          block(1.2, 0.35, 2.6, ox, 1.15, 0, mat("#5c381f"), g);
          block(0.5, 1.7, 0.5, ox, 0.25, 0.25, mat("#329648"), cropGroup);
          block(0.95, 0.55, 0.4, ox - 0.2, 1.7, 0.25, mat("#4dc260"), cropGroup);
          block(0.8, 0.45, 0.75, ox + 0.2, 1.6, 0.15, mat("#287a3b"), cropGroup);
          fruitMeshes.push(block(0.92, 0.8, 0.92, ox, 0.2, 0.25, mat("#ff7218"), cropGroup));
        }
      } else if (s.crop === "tomato") {
        cropBaseY = 1.15;
        block(5.6, 1.0, 4.4, 0, 0, 0, mat("#8a572c"), g);
        block(4.8, 0.35, 3.6, 0, 0.9, 0, mat("#422714"), g);
        for (const ox of [-1.45, 0, 1.45]) {
          block(1.25, 1.65, 1.35, ox, 0, 0, mat("#2d8740"), cropGroup);
          block(0.95, 0.75, 0.95, ox, 1.6, 0, mat("#3ea652"), cropGroup);
          fruitMeshes.push(
            block(0.9, 0.85, 0.9, ox, 0.7, 0.68, mat("#e6322e"), cropGroup),
            block(0.32, 0.24, 0.32, ox, 1.53, 0.68, mat("#5cd16a"), cropGroup),
            block(0.85, 0.8, 0.85, ox, 0.95, -0.68, mat("#e6322e"), cropGroup),
            block(0.3, 0.22, 0.3, ox, 1.73, -0.68, mat("#5cd16a"), cropGroup),
          );
        }
      } else {
        cropBaseY = 1.15;
        block(5.6, 1.0, 4.4, 0, 0, 0, mat("#7a4e28"), g);
        block(4.8, 0.35, 3.6, 0, 0.9, 0, mat("#3d2412"), g);
        for (const ox of [-1.45, 0, 1.45]) {
          block(1.05, 0.55, 1.05, ox, 0, 0, mat("#e2f5bd"), cropGroup);
          block(0.38, 1.25, 0.75, ox - 0.32, 0.5, 0, mat("#8ed156"), cropGroup);
          block(0.38, 1.45, 0.75, ox + 0.32, 0.5, 0, mat("#7ec449"), cropGroup);
          block(0.38, 1.6, 0.75, ox, 0.5, 0.25, mat("#9ce063"), cropGroup);
          fruitMeshes.push(block(1.3, 0.75, 1.2, ox, 1.7, 0, mat("#388f41"), cropGroup));
        }
      }
    } else {
      hit.scale.set(4.5, 4.5, 4.5);
      hit.position.set(0, 2.2, 0);
      topY = 3.6; pestBaseY = 2.8; pestTopY = 4.9;
      if (s.crop === "basil") {
        cropBaseY = 1.4;
        block(3.8, 1.3, 3.8, 0, 0, 0, mat("#8f8776"), g);
        block(4.1, 0.35, 4.1, 0, 1.15, 0, mat("#b4aa96"), g);
        block(3.1, 0.3, 3.1, 0, 1.25, 0, mat("#4a2e19"), g);
        for (const [ox, oz] of [[-0.8, -0.7], [0.8, 0.7]]) {
          block(0.3, 1.0, 0.3, ox, 0, oz, mat("#205c34"), cropGroup);
          fruitMeshes.push(block(1.25, 0.6, 1.25, ox, 0.95, oz, mat("#2f9450"), cropGroup));
        }
        for (const [ox, oz] of [[0.8, -0.7], [-0.8, 0.7]]) {
          block(0.3, 1.1, 0.3, ox, 0, oz, mat("#5c2444"), cropGroup);
          fruitMeshes.push(block(1.15, 0.6, 1.15, ox, 1.05, oz, mat("#7a305b"), cropGroup));
        }
      } else {
        cropBaseY = 1.35;
        block(3.8, 1.3, 3.8, 0, 0, 0, mat("#9e9480"), g);
        block(4.1, 0.35, 4.1, 0, 1.15, 0, mat("#b4aa96"), g);
        block(3.1, 0.3, 3.1, 0, 1.25, 0, mat("#4a2e19"), g);
        for (const [ox, oz, h] of [[-0.75, -0.65, 1.0], [0.75, -0.65, 1.35], [-0.75, 0.65, 1.25], [0.75, 0.65, 0.95]]) {
          block(0.28, h, 0.28, ox, 0, oz, mat("#2b8a58"), cropGroup);
          block(1.2, 0.35, 0.75, ox, h, oz, mat("#45cc84"), cropGroup);
          fruitMeshes.push(block(0.75, 0.35, 1.2, ox, h + 0.2, oz, mat("#68e6a2"), cropGroup));
        }
      }
    }

    g.add(hit);
    registerHit(hit, { spotId: s.id });
    cropGroup.position.y = cropBaseY;
    g.add(cropGroup);
    spotMeshes.set(s.id, { spot: s, g, cropGroup, fruitMeshes, topY, pestBaseY, pestTopY, cropBaseY });
  }

  // Pest sprites & shoo-off animations (prefers Shalone's uploaded .vox models, else cycles approved sculpted variants)
  const critterBags = new Map();
  const pickCritterVariant = (type) => {
    const pool = variantsOf(type);
    let bag = critterBags.get(type);
    if (!bag?.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      critterBags.set(type, bag);
    }
    return bag.pop();
  };
  const critterVisual = (type) => {
    const model = meshFor(`${type}-walk`, randomLook()) ?? meshFor(`${type}-idle`, randomLook());
    if (model) return model;
    const g = buildCritterGroup(THREE, pickCritterVariant(type), { box, mat, basicMat });
    if (type === "bug") g.scale.setScalar(0.6); // bugs are small next to the vegetables
    return g;
  };
  const pestMap = new Map();
  const fleeing = [];

  function shoo(pestId) {
    const entry = pestMap.get(pestId);
    if (!entry) return;
    pestMap.delete(pestId);
    const idx = hitTargets.indexOf(entry.hit);
    if (idx >= 0) hitTargets.splice(idx, 1);
    // birds fly up and away; land animals turn and run off along the ground
    const land = entry.type !== "bird", side = Math.random() < 0.5 ? -1 : 1;
    const vx = side * (land ? 15 : 18), vz = land ? (Math.random() - 0.5) * 10 : 0;
    if (land) entry.g.rotation.y = Math.atan2(vx, vz);
    fleeing.push({ ...entry, land, vy: land ? 0 : 16, vx, vz, t: 0 });
  }

  function nudgePest(pestId) {
    const entry = pestMap.get(pestId);
    if (entry) entry.nudgeT = 0.28;
  }

  function focusSpot(spotId) {
    const sp = spotMeshes.get(spotId);
    if (!sp) return;
    const off = sp.spot.kind === "tree"
      ? { x: 0, z: TREE_COLLIDER_R + 0.4 }
      : sp.spot.kind === "herb"
      ? (sp.spot.z <= -10 ? { x: 0, z: 3.4 } : { x: 2.8, z: 0 })
      : { x: 0, z: 2.8 };
    playerTarget = clearTarget({ x: sp.spot.x + off.x, z: sp.spot.z + off.z }, treeColliders, 0.3);
    playerReturnAt = time + 1.1;
  }

  // Responsive framing via view offset (same pattern as Porter & Usher)
  const KEEP = [[-22, 0, -17], [25, 0, 6], [-22, 0, 6], [25, 0, -17], [0, 13.5, -13]];
  let pad = { top: 105, bottom: 70 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.clearViewOffset();
    const top = 1 - (2 * pad.top) / h, bottom = -1 + (2 * pad.bottom) / h, look = new THREE.Vector3(1.5, 0, -5), v = new THREE.Vector3();
    for (let d = 22; d < 280; d += 1) {
      cam.position.set(1.5, d * 0.86, 14 + d * 0.52);
      cam.lookAt(look);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      let ok = true, lo = Infinity, hi = -Infinity;
      for (const p of KEEP) {
        if (v.set(...p).applyMatrix4(cam.matrixWorldInverse).z > -1) { ok = false; break; }
        v.set(...p).project(cam);
        if (Math.abs(v.x) > 0.96) ok = false;
        lo = Math.min(lo, v.y);
        hi = Math.max(hi, v.y);
      }
      const shift = (top + bottom) / 2 - (hi + lo) / 2;
      if (ok && hi - lo <= top - bottom) {
        cam.setViewOffset(w, h, 0, (shift * h) / 2, w, h);
        cam.updateProjectionMatrix();
        return;
      }
    }
  }

  // Projection & hit-testing helpers for pins and canvas taps
  const tmpV = new THREE.Vector3();
  const project = (x, y, z) => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    tmpV.set(x, y, z).project(cam);
    return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h };
  };
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickAt = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    const hits = raycaster.intersectObjects(hitTargets, false);
    const firstPest = hits.find((h) => h.object.userData?.pestId);
    if (firstPest) return firstPest.object.userData;
    return hits[0]?.object?.userData ?? null;
  };

  let initialized = false;
  function sync(g) {
    if (!initialized) {
      g.spots.forEach(buildSpot);
      initialized = true;
      resize();
    }
    for (const s of g.spots) {
      const m = spotMeshes.get(s.id);
      if (!m) continue;
      if (s.kind === "tree") {
        m.cropGroup.scale.set(1, 1, 1);
        m.cropGroup.position.y = 0;
        const showFruit = s.ripe || s.grow > 0.65;
        const fsc = s.ripe ? 1 : 0.62 + ((s.grow - 0.65) / 0.35) * 0.38;
        m.fruitMeshes.forEach((fm) => {
          fm.visible = showFruit;
          if (showFruit) fm.scale.set(fsc, fsc, fsc);
        });
      } else {
        const sc = 0.28 + s.grow * 0.72;
        m.cropGroup.scale.set(sc, sc, sc);
        m.cropGroup.position.y = m.cropBaseY;
        const showFruit = s.ripe || s.grow > 0.65;
        m.fruitMeshes.forEach((fm) => { fm.visible = showFruit; });
      }
    }
    const activeIds = new Set(g.pests.map((p) => p.id));
    for (const p of g.pests) {
      if (!pestMap.has(p.id)) {
        const sp = spotMeshes.get(p.spotId);
        const visual = critterVisual(p.type);
        const gRoot = new THREE.Group();
        const baseY = sp ? sp.pestBaseY : 2.9;
        gRoot.position.set(p.x, baseY, p.z);
        gRoot.rotation.y = (p.id % 2 ? 1 : -1) * 0.42;
        gRoot.add(visual);
        const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false }));
        hit.scale.set(4.5, 4.5, 4.5);
        hit.position.set(0, 1, 0);
        gRoot.add(hit);
        registerHit(hit, { pestId: p.id, spotId: p.spotId });
        scene.add(gRoot);
        pestMap.set(p.id, { id: p.id, type: p.type, g: gRoot, visual, hit, baseY, nudgeT: 0 });
      }
    }
    for (const [id, entry] of pestMap) {
      if (!activeIds.has(id)) {
        scene.remove(entry.g);
        const i = hitTargets.indexOf(entry.hit);
        if (i >= 0) hitTargets.splice(i, 1);
        pestMap.delete(id);
      }
    }
  }

  function update(dt) {
    if (disposed) return;
    time += dt;

    // Player movement toward recent action spot (sliding around trees), then return to HOME_AT.
    const dest = (playerTarget && time < playerReturnAt) ? playerTarget : HOME_AT;
    const dist = Math.hypot(dest.x - player.g.position.x, dest.z - player.g.position.z);
    if (dist > 0.35) {
      const step = stepWithCollisions(player.g.position, dest, 14 * dt, treeColliders);
      player.g.position.x = step.x;
      player.g.position.z = step.z;
      if (step.rot != null) player.g.rotation.y = step.rot;
      player.setWalk(step.moved);
    } else {
      player.setWalk(false);
    }
    player.tick(dt);

    // Persistent courier helpers carry baskets to the Food Bank wagon and return to their posts
    for (const c of couriers) {
      c.actor.tick(dt);
      if (c.state === "idle") continue;
      const goal = c.state === "to-bank" ? c.bank : c.home;
      const cdx = goal.x - c.actor.g.position.x, cdz = goal.z - c.actor.g.position.z;
      const cdist = Math.hypot(cdx, cdz);
      if (cdist > 0.4) {
        const s = Math.min(cdist, 11 * dt);
        c.actor.g.position.x += (cdx / cdist) * s;
        c.actor.g.position.z += (cdz / cdist) * s;
        c.actor.g.rotation.y = Math.atan2(cdx, cdz);
      } else if (c.state === "to-bank") {
        c.state = "back";
        c.basket.visible = false;
        if (deliverPile.children.length < 18 && c.crops?.length) {
          const n = deliverPile.children.length;
          block(0.9, 0.9, 0.9, (n % 4) * 1.1, Math.floor(n / 4) * 0.9, ((n >> 1) % 2) * 0.9, mat(cropById(c.crops[0]).color), deliverPile);
        }
      } else if (pendingDeliveries.length > 0) {
        startDelivery(c, pendingDeliveries.shift());
      } else {
        c.actor.g.position.set(c.home.x, 0, c.home.z);
        c.actor.g.rotation.y = -Math.PI / 2;
        c.state = "idle";
        c.actor.setWalk(false);
      }
    }

    // Active pests bounce slightly on crops (plus recoil on 2-tap hits); shooed pests fly away
    for (const entry of pestMap.values()) {
      let jump = Math.abs(Math.sin(time * 7 + entry.id)) * 0.45;
      if (entry.nudgeT > 0) {
        entry.nudgeT = Math.max(0, entry.nudgeT - dt);
        jump += Math.sin((entry.nudgeT / 0.28) * Math.PI) * 1.4;
      }
      entry.g.position.y = entry.baseY + jump;
      animate(entry.visual, time);
    }
    for (let i = fleeing.length - 1; i >= 0; i--) {
      const f = fleeing[i];
      f.t += dt;
      f.g.position.x += f.vx * dt;
      f.g.position.z += (f.vz ?? 0) * dt;
      if (f.land) f.g.position.y = f.baseY + Math.abs(Math.sin(f.t * 20)) * 0.5; // scampering hops
      else f.g.position.y += f.vy * dt;
      if (f.t > (f.land ? 0.9 : 0.55)) {
        scene.remove(f.g);
        fleeing.splice(i, 1);
      }
    }

    R.render(scene, cam);
  }

  return {
    sync,
    shoo,
    nudgePest,
    deliver,
    focusSpot,
    pickAt,
    resize,
    update,
    screenOf: project,
    spotTop(id) {
      const sp = spotMeshes.get(id);
      return sp ? project(sp.spot.x, sp.topY, sp.spot.z) : null;
    },
    pestTop(p) {
      const sp = spotMeshes.get(p.spotId);
      const y = sp ? sp.pestTopY : 5.0;
      return project(p.x, y, p.z);
    },
    dispose() {
      disposed = true;
      R.dispose();
    },
  };
}
