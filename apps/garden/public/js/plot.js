// 3D voxel garden scene for Garden Givers (three.js r128, global THREE from vendor/three-r128.min.js):
// garden beds, fruit orchard, herb planters, Food Bank cart, player gardener, animated pests,
// and the courier monk carrying baskets to the food bank!
import { readVox, toScene } from "./vox.js";
import { randomLook, recolor } from "./looks.js";
import { cropById } from "./crops.js";

const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

export const MODELS = [
  "monk-idle", "monk-walk", "nun-idle", "nun-walk", "man-walk", "man-idle", "woman-walk", "woman-idle",
  "bug-idle", "bug-walk", "bird-idle", "bird-walk", "squirrel-idle", "squirrel-walk", "raccoon-idle", "raccoon-walk",
];

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
      const k = Math.floor(t * (g.userData.fps || 4)) % fr.length;
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
    const idleOrder = nun ? ["nun-idle", "nun-walk", "woman-idle", "woman-walk"] : ["monk-idle", "monk-walk", "man-idle", "man-walk"];
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

  // Persistent courier helpers: stationed on the path until an order sends one to the Food Bank
  const MAX_COURIERS = 2;
  const LANES = [-1.4, 0.4];
  const couriers = [];
  const pendingDeliveries = [];
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
    LANES.slice(0, MAX_COURIERS).forEach((lane) => {
      const actor = makePerson({ nun: false, robe: "#5a4030" }, 1.0);
      const basket = makeBasket();
      basket.position.set(0, 2.7, 1.5);
      actor.g.add(basket);
      const home = { x: 8.5, z: lane };
      actor.g.position.set(home.x, 0, home.z);
      actor.g.rotation.y = -Math.PI / 2;
      actor.setWalk(false);
      couriers.push({ actor, basket, crops: null, lane, home, state: "idle" });
    });
  }
  function deliver(crops) {
    const idle = couriers.find((c) => c.state === "idle");
    if (idle) startDelivery(idle, crops);
    else if (pendingDeliveries.length < 4) pendingDeliveries.push(crops);
  }

  // Garden beds, fruit trees, & herb planters
  const spotMeshes = new Map();
  const hitTargets = [];
  const registerHit = (mesh, info) => { mesh.userData = info; hitTargets.push(mesh); };

  function buildSpot(s) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    scene.add(g);
    const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false }));
    if (s.kind === "bed") {
      block(5.4, 1.0, 4.4, 0, 0, 0, mat("#7a4e28"), g);
      block(4.8, 0.3, 3.8, 0, 0.9, 0, mat("#4a2e19"), g);
      hit.scale.set(5.8, 4.5, 4.8);
      hit.position.set(0, 2.2, 0);
    } else if (s.kind === "tree") {
      block(1.6, 5.2, 1.6, 0, 0, 0, mat("#6b4423"), g);
      block(5.4, 3.4, 5.4, 0, 4.8, 0, mat(night ? "#26522e" : "#388e3c"), g);
      block(3.8, 2.0, 3.8, 0, 8.2, 0, mat(night ? "#2d5f36" : "#43a047"), g);
      hit.scale.set(5.8, 10.5, 5.8);
      hit.position.set(0, 5.2, 0);
    } else {
      block(3.8, 1.3, 3.8, 0, 0, 0, mat("#9e9480"), g);
      block(3.2, 0.3, 3.2, 0, 1.2, 0, mat("#4a2e19"), g);
      hit.scale.set(4.5, 4.5, 4.5);
      hit.position.set(0, 2.2, 0);
    }
    g.add(hit);
    registerHit(hit, { spotId: s.id });

    // Growing/ripe produce group
    const cropGroup = new THREE.Group();
    const fruitMeshes = [];
    const col = cropById(s.crop).color;
    if (s.kind === "bed") {
      for (const ox of [-1.2, 0, 1.2]) {
        block(0.8, 1.4, 0.8, ox, 1.1, 0.6, mat("#2e8b44"), cropGroup);
        fruitMeshes.push(block(0.95, 0.95, 0.95, ox, 1.0, -0.5, mat(col), cropGroup));
      }
    } else if (s.kind === "tree") {
      for (const [fx, fy, fz] of [[-1.6, 5.4, 2.4], [1.4, 6.2, 2.4], [0, 7.6, 2.2], [-0.5, 5.8, -2.2]]) {
        fruitMeshes.push(block(1.05, 1.05, 1.05, fx, fy, fz, mat(col), cropGroup));
      }
    } else {
      for (const [ox, oz] of [[-0.8, -0.7], [0.8, -0.7], [-0.8, 0.7], [0.8, 0.7]]) {
        fruitMeshes.push(block(0.9, 1.2, 0.9, ox, 1.4, oz, mat(col), cropGroup));
      }
    }
    g.add(cropGroup);
    spotMeshes.set(s.id, { spot: s, g, cropGroup, fruitMeshes, topY: s.kind === "tree" ? 9.5 : 3.4 });
  }

  // Pest sprites & shoo-off animations
  const critterVisual = (type) => {
    const model = meshFor(`${type}-walk`, randomLook()) ?? meshFor(`${type}-idle`, randomLook());
    if (model) return model;
    const g = new THREE.Group();
    if (type === "bug") {
      block(1.8, 0.9, 2.2, 0, 0.2, 0, mat("#2e5f2e"), g);
      block(0.9, 0.6, 0.8, 0, 0.3, 1.3, mat("#1b1b1b"), g);
    } else if (type === "bird") {
      block(1.6, 1.3, 2.2, 0, 0.6, 0, mat("#222530"), g);
      block(2.8, 0.4, 1.0, 0, 1.3, 0, mat("#363b4a"), g);
      block(0.7, 0.4, 0.9, 0, 1.4, 1.3, mat("#f0b62a"), g);
    } else if (type === "squirrel") {
      block(1.5, 1.4, 2.0, 0, 0.3, 0, mat("#a85b28"), g);
      block(0.9, 1.9, 1.1, 0, 0.9, -1.2, mat("#c9773a"), g);
      block(1.1, 1.0, 1.1, 0, 1.3, 1.1, mat("#a85b28"), g);
    } else {
      block(2.0, 1.5, 2.6, 0, 0.3, 0, mat("#6f747d"), g);
      block(1.6, 1.2, 1.2, 0, 1.2, 1.3, mat("#23252a"), g);
      block(0.9, 0.8, 1.8, 0, 0.8, -1.6, mat("#35373d"), g);
    }
    g.userData.frames = [];
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
    fleeing.push({ ...entry, vy: entry.type === "bird" ? 16 : 5, vx: (Math.random() < 0.5 ? -1 : 1) * 18, t: 0 });
  }

  function focusSpot(spotId) {
    const sp = spotMeshes.get(spotId);
    if (!sp) return;
    playerTarget = { x: sp.spot.x, z: sp.spot.z + 1.8 };
    playerReturnAt = time + 1.1;
  }

  // Responsive framing via view offset (same pattern as Porter & Usher)
  const KEEP = [[-22, 0, -17], [25, 0, 6], [-22, 0, 6], [25, 0, -17], [0, 11, -13]];
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
      const sc = 0.28 + s.grow * 0.72;
      m.cropGroup.scale.set(sc, sc, sc);
      m.cropGroup.position.y = s.kind === "tree" ? 0 : (1 - sc) * -0.4;
      m.fruitMeshes.forEach((fm) => { fm.visible = s.ripe || s.grow > 0.65; });
    }
    const activeIds = new Set(g.pests.map((p) => p.id));
    for (const p of g.pests) {
      if (!pestMap.has(p.id)) {
        const sp = spotMeshes.get(p.spotId);
        const visual = critterVisual(p.type);
        const gRoot = new THREE.Group();
        const baseY = sp ? (sp.spot.kind === "tree" ? 8.8 : 2.3) : 2.5;
        gRoot.position.set(p.x, baseY, p.z);
        gRoot.add(visual);
        const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false }));
        hit.scale.set(4.5, 4.5, 4.5);
        hit.position.set(0, 1, 0);
        gRoot.add(hit);
        registerHit(hit, { pestId: p.id, spotId: p.spotId });
        scene.add(gRoot);
        pestMap.set(p.id, { id: p.id, type: p.type, g: gRoot, visual, hit, baseY });
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

    // Player movement toward recent action spot, then drift back toward path center.
    const dest = (playerTarget && time < playerReturnAt) ? playerTarget : HOME_AT;
    const dx = dest.x - player.g.position.x, dz = dest.z - player.g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.35) {
      const step = Math.min(dist, 14 * dt);
      player.g.position.x += (dx / dist) * step;
      player.g.position.z += (dz / dist) * step;
      player.g.rotation.y = Math.atan2(dx, dz);
      player.setWalk(true);
    } else {
      player.setWalk(false);
    }
    player.tick(dt);

    // Persistent courier helpers carry baskets to the Food Bank wagon and return to their posts
    for (const c of couriers) {
      c.actor.tick(dt);
      if (c.state === "idle") continue;
      const goal = c.state === "to-bank" ? { x: BANK_POS.x - 4.2, z: BANK_POS.z + c.lane * 0.5 } : c.home;
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

    // Active pests bounce slightly on crops; shooed pests fly away
    for (const entry of pestMap.values()) {
      entry.g.position.y = entry.baseY + Math.abs(Math.sin(time * 7 + entry.id)) * 0.45;
      animate(entry.visual, time);
    }
    for (let i = fleeing.length - 1; i >= 0; i--) {
      const f = fleeing[i];
      f.t += dt;
      f.g.position.x += f.vx * dt;
      f.g.position.y += f.vy * dt;
      if (f.t > 0.55) {
        scene.remove(f.g);
        fleeing.splice(i, 1);
      }
    }

    R.render(scene, cam);
  }

  return {
    sync,
    shoo,
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
      const y = sp ? (sp.spot.kind === "tree" ? 10.6 : 4.2) : 4.5;
      return project(p.x, y, p.z);
    },
    dispose() {
      disposed = true;
      R.dispose();
    },
  };
}
