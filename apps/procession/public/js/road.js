// 3D voxel road & procession renderer (three.js r128, global THREE from vendor/three-r128.min.js).
// Loads Shalone's .vox models from /api/art with crisp procedural 3D stand-ins for road hazards & helpers.
import { readVox, toScene } from "./vox.js";
import { randomLook, recolor } from "./looks.js";
import { LANE_X, FRONT_Z, SPAWN_Z, ROAD_HALF, stretchOf, isNight } from "./procession.js";

const ART = typeof location !== "undefined" && /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

export const MODELS = [
  "server-cross-walk", "server-candle-walk", "server-candle-idle",
  "priest-mass-walk", "priest-idle", "priest-walk-fast",
  "east-priest-phelonion-walk",
  "server-idle", "server-walk",
  "man-walk", "man-idle", "man-beard-walk", "man-beard-idle",
  "woman-walk", "woman-idle", "child-walk", "child-girl-walk",
  "grandfather-walk", "grandmother-walk",
  "dog-idle", "dog-walk",
  "procession-pothole", "procession-lamp", "procession-car", "procession-truck",
  "procession-bridge", "procession-band", "procession-angel",
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

const SEASON_VESTMENT = "#2f8a4c";
const CAR_COLORS = ["#d9403a", "#2b6cb0", "#e39c1e", "#2d9354", "#7b5ca8"];
const BAND_ROBES = ["#c8262f", "#e3b341", "#2e5fa8", "#e3b341", "#c8262f"];
const FOLK_SLUGS = ["child-walk", "child-girl-walk", "man-walk", "woman-walk", "grandfather-walk", "grandmother-walk"];

export function createRoad(canvas, { models = {}, crewInfo }) {
  const THREE = window.THREE;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const skyDay = new THREE.Color("#7ac8ff");
  const skyNight = new THREE.Color("#141e38");
  const skyMarket = new THREE.Color("#bce4b8");
  const skyRiver = new THREE.Color("#8fd8f8");
  const skyWind = new THREE.Color("#b8cee0");
  scene.background = skyDay.clone();
  scene.fog = new THREE.Fog(skyDay.clone(), 135, 225);

  const cam = new THREE.PerspectiveCamera(42, 1, 1, 420);
  const hemi = new THREE.HemisphereLight("#fff7e2", "#4b6935", 0.96);
  const sun = new THREE.DirectionalLight("#ffe6c0", 0.58);
  sun.position.set(-28, 68, 44);
  scene.add(hemi, sun);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (hex, extra = null) => {
    const k = extra ? `${hex}:${JSON.stringify(extra)}` : hex;
    if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: hex, ...(extra ?? {}) }));
    return mats.get(k);
  };
  const block = (w, h, d, x, y, z, m, parent = scene) => {
    const o = new THREE.Mesh(box, m);
    o.scale.set(w, h, d);
    o.position.set(x, y + h / 2, z);
    parent.add(o);
    return o;
  };

  let haloTex = null;
  function getHaloTex() {
    if (haloTex) return haloTex;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255, 224, 120, 0.92)");
    g.addColorStop(0.5, "rgba(255, 195, 70, 0.35)");
    g.addColorStop(1, "rgba(255, 180, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    haloTex = new THREE.CanvasTexture(c);
    return haloTex;
  }

  // Static terrain: green grass fields, raised curbs/sidewalks, dark slate asphalt road
  const grassMat = new THREE.MeshLambertMaterial({ color: "#68ac52" });
  const roadMat = new THREE.MeshLambertMaterial({ color: "#4e5766" });
  const walkMat = new THREE.MeshLambertMaterial({ color: "#cfc6b4" });
  block(360, 1.0, 320, 0, -1.0, -30, grassMat);
  block(86, 0.36, 260, 0, -0.30, -24, walkMat);
  block(ROAD_HALF * 2, 0.18, 260, 0, 0, -24, roadMat);

  // Scrolling road lane dashes & roadside trees/houses
  const DASH_STEP = 18;
  const dashes = [];
  const dashMat = new THREE.MeshBasicMaterial({ color: "#ffe169" });
  for (let z = -112; z <= 64; z += DASH_STEP) {
    const row = new THREE.Group();
    row.position.z = z;
    block(1.2, 0.08, 7.5, -10, 0.19, 0, dashMat, row);
    block(1.2, 0.08, 7.5, 10, 0.19, 0, dashMat, row);
    scene.add(row);
    dashes.push(row);
  }

  const sceneries = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const g = new THREE.Group();
    g.position.set(side * (47 + (i % 3) * 4), 0, -110 + i * 22);
    if (i % 3 === 0) {
      // Little voxel house
      block(10, 7.5, 9, 0, 0, 0, mat("#f0e6d2"), g);
      block(11, 2.5, 10, 0, 7.5, 0, mat("#b5433b"), g);
      block(2.2, 2.2, 0.4, -side * 2, 3.2, 4.6, mat("#f8d774"), g);
    } else {
      // Pine / leaf tree
      block(2.2, 4.5, 2.2, 0, 0, 0, mat("#6b4426"), g);
      block(7.5, 5.0, 7.5, 0, 4.2, 0, mat("#3d8742"), g);
      block(5.2, 3.8, 5.2, 0, 8.8, 0, mat("#4c9c50"), g);
    }
    scene.add(g);
    sceneries.push(g);
  }

  // .vox helper
  const meshFor = (name, look, vestment = null) => {
    const m = models[name];
    if (!m) return null;
    const g = new THREE.Group();
    const all = m.vox.frames.flatMap((_, f) => toScene(m.vox, f));
    if (!all.length) return null;
    const mid = (k) => (Math.min(...all.map((c) => c[k])) + Math.max(...all.map((c) => c[k]))) / 2;
    const cx = mid(0), cz = mid(2);
    g.userData.frames = m.vox.frames.map((_, f) => {
      const cells = toScene(m.vox, f);
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), cells.length);
      im.frustumCulled = false;
      const o = new THREE.Object3D(), col = new THREE.Color();
      cells.forEach(([x, y, z, c], i) => {
        o.position.set(x - cx, y, z - cz);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
        im.setColorAt(i, col.set(recolor(c, look, vestment)));
      });
      im.visible = f === 0;
      g.add(im);
      return im;
    });
    g.userData.fps = m.fps;
    return g;
  };
  const animFrames = (g, t) => {
    const fr = g?.userData?.frames;
    if (fr?.length > 1) {
      const k = Math.floor(t * (g.userData.fps || 3)) % fr.length;
      fr.forEach((m, i) => { m.visible = i === k; });
    }
  };
  const standPerson = (robe, hair = "#3b2818") => {
    const g = new THREE.Group();
    block(2.8, 4.4, 2.0, 0, 0, 0, mat(robe), g);
    block(2.9, 0.5, 2.1, 0, 1.9, 0, mat("#f4efe2"), g);
    block(2.4, 2.3, 2.3, 0, 4.5, 0, mat("#efc6a0"), g);
    block(2.6, 1.0, 2.5, 0, 6.2, -0.1, mat(hair), g);
    g.userData.frames = [];
    return g;
  };
  const makePerson = (slugs, look, scale = 1.0, vestment = null) => {
    const g = new THREE.Group();
    const walkSlug = slugs.find((n) => models[n]) ?? null;
    const idleSlug = slugs.slice().reverse().find((n) => models[n]) ?? walkSlug;
    const walkMesh = (walkSlug && meshFor(walkSlug, look, vestment)) || standPerson(look.shirt || "#2e5fa8", look.hair);
    const idleMesh = (idleSlug && meshFor(idleSlug, look, vestment)) || standPerson(look.shirt || "#2e5fa8", look.hair);
    walkMesh.visible = true;
    idleMesh.visible = false;
    g.add(walkMesh, idleMesh);
    g.scale.setScalar(scale);
    return {
      g,
      walkMesh,
      idleMesh,
      setWalk(w) { walkMesh.visible = !!w; idleMesh.visible = !w; },
    };
  };

  // Procession column (steerable left/center/right along LANE_X)
  const procGroup = new THREE.Group();
  procGroup.position.set(0, 0, FRONT_Z);
  scene.add(procGroup);

  // Subtle glowing lane guide directly under the procession front (above road y=0.18)
  const laneGuide = new THREE.Mesh(
    new THREE.PlaneGeometry(17.5, 18),
    new THREE.MeshBasicMaterial({ color: "#ffd85c", transparent: true, opacity: 0.28, depthWrite: false })
  );
  laneGuide.rotation.x = -Math.PI / 2;
  laneGuide.position.set(0, 0.22, 6.0);
  procGroup.add(laneGuide);

  const procMembers = [];
  const addProc = (slugs, ox, oz, look, vestment = null) => {
    const p = makePerson(slugs, look, 0.96, vestment);
    p.g.position.set(ox, 0, oz);
    p.g.rotation.y = Math.PI; // face forward (-Z) up the road
    procGroup.add(p.g);
    procMembers.push(p);
  };
  const procLook0 = randomLook();
  addProc(["server-cross-walk", "server-idle"], 0, 0, { ...procLook0, shirt: "#c8262f" });
  addProc(["server-candle-walk", "server-candle-idle"], -5.2, 2.2, { ...randomLook(), shirt: "#c8262f" });
  addProc(["server-candle-walk", "server-candle-idle"], 5.2, 2.2, { ...randomLook(), shirt: "#c8262f" });
  addProc(["priest-mass-walk", "priest-idle"], 0, 7.0, randomLook(), SEASON_VESTMENT);
  addProc(["man-walk", "man-idle"], -5.5, 7.6, randomLook(Math.random, { clothes: true }));
  addProc(["woman-walk", "woman-idle"], 5.5, 7.6, randomLook(Math.random, { clothes: true }));
  addProc(["child-walk", "child-idle"], -4.5, 13.0, randomLook(Math.random, { clothes: true }));
  addProc(["child-girl-walk", "child-girl-idle"], 0, 13.2, randomLook(Math.random, { clothes: true }));
  addProc(["grandfather-walk", "man-beard-walk"], 4.5, 13.0, randomLook(Math.random, { older: true, clothes: true }));

  // Player Advance Crew actor — starts facing away (-Z, Math.PI) up the road
  const crewLook = { ...randomLook(), shirt: "#2e5fa8", dress: "#c8262f", belt: "#f4efe2" };
  const crewActor = makePerson([crewInfo.voxWalk, crewInfo.voxIdle], crewLook, 1.12, SEASON_VESTMENT);
  crewActor.g.rotation.y = Math.PI;
  scene.add(crewActor.g);

  // Subtle reach ring around advance crew
  const reachRing = new THREE.Mesh(
    new THREE.RingGeometry(8.5, 9.2, 32),
    new THREE.MeshBasicMaterial({ color: "#fff1a8", side: THREE.DoubleSide, transparent: true, opacity: 0.45, depthWrite: false })
  );
  reachRing.rotation.x = -Math.PI / 2;
  reachRing.position.y = 0.25;
  scene.add(reachRing);

  const obMeshes = new Map();
  let bellFxTimer = 0;

  // Church bell gold beam flash
  const bellBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 2.8, 30, 12),
    new THREE.MeshBasicMaterial({ color: "#ffe170", transparent: true, opacity: 0.55, depthWrite: false })
  );
  bellBeam.visible = false;
  scene.add(bellBeam);

  function buildObstacleMesh(o) {
    const g = new THREE.Group();
    if (o.kind === "pothole") {
      const hole = block(12, 0.24, 8.6, 0, 0.18, 0, mat("#272b34"), g);
      block(8.5, 0.26, 5.5, -0.5, 0.20, 0.3, mat("#161920"), g);
      const patch = block(12.2, 0.28, 8.8, 0, 0.20, 0, mat("#c9b38c"), g);
      patch.visible = false;
      g.userData = { hole, patch };
    } else if (o.kind === "lamp") {
      block(2.4, 1.0, 2.4, 0, 0, 0, mat("#3a404d"), g);
      block(1.1, 11, 1.1, 0, 1.0, 0, mat("#2e333f"), g);
      block(3.2, 0.8, 3.2, 0, 11.8, 0, mat("#2e333f"), g);
      const bulb = block(2.2, 2.4, 2.2, 0, 12.6, 0, new THREE.MeshBasicMaterial({ color: "#4d5669" }), g);
      block(3.6, 0.7, 3.6, 0, 15.0, 0, mat("#2e333f"), g);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: getHaloTex(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      halo.position.set(0, 13.5, 0);
      halo.scale.set(16, 16, 1);
      halo.visible = false;
      g.add(halo);
      g.userData = { bulb, halo };
    } else if (o.kind === "person") {
      const slug = FOLK_SLUGS[o.tintIdx % FOLK_SLUGS.length];
      const p = makePerson([slug, "man-idle"], randomLook(Math.random, { clothes: true }), 1.0);
      g.add(p.g);
      g.userData = { actor: p };
    } else if (o.kind === "car") {
      const bodyCol = CAR_COLORS[o.tintIdx % CAR_COLORS.length];
      block(13.5, 3.2, 8.2, 0, 1.2, 0, mat(bodyCol), g);
      block(7.5, 2.8, 6.8, -0.5, 4.4, 0, mat("#dceeff"), g);
      block(7.7, 0.8, 7.0, -0.5, 6.5, 0, mat(bodyCol), g);
      for (const wx of [-4.2, 4.2]) for (const wz of [-4.0, 4.0]) block(2.8, 2.4, 1.0, wx, 0, wz, mat("#1e2028"), g);
      g.userData = {};
    } else if (o.kind === "truck") {
      block(15.6, 4.6, 8.8, -1.0, 1.5, 0, mat("#f5f5f8"), g);
      block(15.6, 1.2, 9.0, -1.0, 4.6, 0, mat("#3874c4"), g);
      block(5.4, 5.2, 8.4, 6.2, 1.5, 0, mat("#d9403a"), g);
      block(2.6, 2.2, 7.6, 7.4, 4.0, 0, mat("#bfe3ff"), g);
      for (const wx of [-5.2, 0.5, 6.4]) for (const wz of [-4.3, 4.3]) block(3.0, 2.8, 1.1, wx, 0, wz, mat("#1c1f24"), g);
      g.userData = {};
    } else if (o.kind === "dog") {
      if (models["dog-walk"] || models["dog-idle"]) {
        const d = makePerson(["dog-walk", "dog-idle"], {}, 0.95);
        g.add(d.g);
        g.userData = { actor: d };
      } else {
        const pup = new THREE.Group();
        block(4.8, 2.4, 2.8, 0, 0.8, 0, mat("#b57335"), pup);
        block(2.6, 2.4, 2.6, 2.2, 2.2, 0, mat("#c98743"), pup);
        block(1.0, 1.6, 0.9, -2.5, 2.4, 0, mat("#7a4a1e"), pup);
        block(0.8, 1.0, 0.8, 2.0, 4.3, 0.9, mat("#6b3f16"), pup);
        block(0.8, 1.0, 0.8, 2.0, 4.3, -0.9, mat("#6b3f16"), pup);
        g.add(pup);
        g.userData = { pup };
      }
    } else if (o.kind === "puddle") {
      const water = block(12.4, 0.18, 10.5, 0, 0.18, 0, mat("#3a98ee"), g);
      const gleam = block(7.5, 0.20, 4.5, -1, 0.20, -0.5, mat("#a8dcff"), g);
      g.userData = { water, gleam };
    } else if (o.kind === "brokenBridge") {
      block(18.5, 0.24, 12.0, 0, 0.19, 0, mat("#2a88c8"), g);
      const planks = [];
      for (let i = 0; i < 4; i++) {
        const pl = block(4.0, 0.45, 11.4, -6.8 + i * 4.5, 0.43, 0, mat("#a8703b"), g);
        pl.visible = false;
        planks.push(pl);
      }
      g.userData = { planks };
    } else if (o.kind === "bossBridge") {
      block(ROAD_HALF * 2 + 4, 0.26, 15.0, 0, 0.19, 0, mat("#2782bf"), g);
      const planks = [];
      for (let i = 0; i < 10; i++) {
        const pl = block(5.4, 0.55, 14.2, -27 + i * 6.0, 0.45, 0, mat("#b5783f"), g);
        pl.visible = false;
        planks.push(pl);
      }
      g.userData = { planks };
    } else if (o.kind === "bossBand") {
      const members = [];
      for (let i = 0; i < 5; i++) {
        const m = standPerson(BAND_ROBES[i], "#2b1d0e");
        block(1.2, 2.0, 1.2, 1.6, 2.6, 1.2, mat("#ffd45c"), m); // brass instrument
        m.position.set(-14 + i * 7, 0, (i % 2) * 1.6);
        m.scale.setScalar(1.0);
        g.add(m);
        members.push(m);
      }
      g.userData = { members };
    }
    return g;
  }

  let time = 0, disposed = false;

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    if (!w || !h) return;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    // Frame all 3 lanes + entire procession column clearly above the bottom controls on phones & desktop
    const narrow = Math.max(0, 1 - cam.aspect);
    cam.position.set(0, 82 + narrow * 46, 114 + narrow * 44);
    cam.lookAt(0, 0, 2 + narrow * 6);
    cam.updateProjectionMatrix();
  }
  resize();

  // Road plane raycasting for tap / drag controls
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const roadPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPt = new THREE.Vector3();

  function pickRoadPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    ndc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    raycaster.setFromCamera(ndc, cam);
    if (!raycaster.ray.intersectPlane(roadPlane, hitPt)) return null;
    return { x: hitPt.x, z: hitPt.z };
  }

  const tmpVec = new THREE.Vector3();
  function project(x, y, z) {
    tmpVec.set(x, y, z).project(cam);
    return {
      x: (tmpVec.x * 0.5 + 0.5) * (canvas.clientWidth || innerWidth),
      y: (-tmpVec.y * 0.5 + 0.5) * (canvas.clientHeight || innerHeight),
    };
  }

  let lastDt = performance.now();
  function sync(g) {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.08, (now - lastDt) / 1000);
    lastDt = now;
    time += dt;

    // Sky & lighting shift by stretch / night
    const night = isNight(g);
    const stId = stretchOf(g);
    const targetSky = night ? skyNight : stId === "market" ? skyMarket : stId === "river" ? skyRiver : stId === "wind" ? skyWind : skyDay;
    scene.background.lerp(targetSky, 0.08);
    scene.fog.color.copy(scene.background);
    hemi.intensity = night ? 0.42 : 0.96;
    sun.intensity = night ? 0.25 : 0.58;
    grassMat.color.setHex(night ? 0x22362a : stId === "wind" ? 0x5c8b4e : 0x68ac52);
    roadMat.color.setHex(night ? 0x2d3544 : 0x4e5766);

    // Scroll lane dashes & roadside trees smoothly
    const dashSpan = dashes.length * DASH_STEP;
    const offset = g.dist % dashSpan;
    for (let i = 0; i < dashes.length; i++) {
      let z = -112 + i * DASH_STEP + offset;
      while (z > 56) z -= dashSpan;
      dashes[i].position.z = z;
    }
    const scSpan = sceneries.length * 22;
    const scOff = g.dist % scSpan;
    for (let i = 0; i < sceneries.length; i++) {
      let z = -110 + i * 22 + scOff;
      while (z > 66) z -= scSpan;
      sceneries[i].position.z = z;
    }

    // Update procession column + steering bank + stumble wobble
    procGroup.position.x = g.procX;
    const lean = (LANE_X[g.procLane] - g.procX) * 0.014;
    procGroup.rotation.z = g.wobble > 0 ? Math.sin(time * 28) * 0.08 : -lean;
    const walkingProc = !g.over;
    for (const pm of procMembers) {
      pm.setWalk(walkingProc);
      if (walkingProc) animFrames(pm.walkMesh, time);
    }

    // Crew position, smooth facing rotation, & reach ring
    crewActor.g.position.set(g.crew.x, 0, g.crew.z);
    const diff = Math.atan2(Math.sin(g.crew.dir - crewActor.g.rotation.y), Math.cos(g.crew.dir - crewActor.g.rotation.y));
    crewActor.g.rotation.y += diff * Math.min(1, dt * 18);
    crewActor.setWalk(g.crew.moving);
    animFrames(g.crew.moving ? crewActor.walkMesh : crewActor.idleMesh, time);

    reachRing.position.set(g.crew.x, 0.25, g.crew.z);
    reachRing.material.opacity = g.crew.fixingId ? 0.55 : 0.24;

    if (bellFxTimer > 0) {
      bellFxTimer -= dt;
      bellBeam.visible = true;
      bellBeam.material.opacity = Math.max(0, bellFxTimer * 1.2);
    } else bellBeam.visible = false;

    // Obstacles sync
    const liveObs = new Set(g.obs.map((o) => o.id));
    for (const [id, mesh] of obMeshes) {
      if (!liveObs.has(id)) { scene.remove(mesh); obMeshes.delete(id); }
    }
    for (const o of g.obs) {
      let mesh = obMeshes.get(o.id);
      if (!mesh) {
        mesh = buildObstacleMesh(o);
        scene.add(mesh);
        obMeshes.set(o.id, mesh);
      }
      mesh.position.set(o.x, 0, o.z);
      const frac = Math.min(1, o.pr / Math.max(0.01, o.need));

      if (o.kind === "pothole") {
        mesh.userData.hole.visible = !o.done;
        mesh.userData.patch.visible = !!o.done;
      } else if (o.kind === "lamp") {
        const lit = o.done && !o.miss;
        mesh.userData.bulb.material.color.setHex(lit ? 0xffe46b : 0x4d5669);
        mesh.userData.halo.visible = lit;
      } else if (o.kind === "puddle") {
        const sx = o.halfW / 6.2;
        mesh.scale.set(sx, o.done ? 0.2 : 1, 1);
        mesh.visible = !o.done;
      } else if (o.kind === "brokenBridge" || o.kind === "bossBridge") {
        const planks = mesh.userData.planks;
        const shown = o.done ? planks.length : Math.floor(frac * planks.length);
        planks.forEach((p, i) => { p.visible = i < shown; });
      } else if (o.kind === "person" || o.kind === "dog") {
        const a = mesh.userData.actor;
        const pup = mesh.userData.pup;
        const facing = o.vx !== 0 ? (o.vx > 0 ? Math.PI / 2 : -Math.PI / 2) : o.targetX != null ? Math.sign(o.targetX - o.x) * (Math.PI / 2) : 0;
        if (a) {
          a.g.rotation.y = facing;
          a.setWalk(!o.done || Math.abs(o.vx) > 0);
          animFrames(a.walkMesh, time);
        } else if (pup) {
          pup.rotation.y = o.vx < 0 ? Math.PI : 0;
          pup.position.y = Math.abs(Math.sin(time * 14)) * 0.45;
        }
      } else if (o.kind === "bossBand") {
        const w = Math.sin(time * 12) * 0.14;
        mesh.userData.members?.forEach((m, i) => { m.position.y = Math.abs(Math.sin(time * 10 + i)) * 0.6; m.rotation.z = w; });
      } else if (o.kind === "car" || o.kind === "truck") {
        mesh.rotation.y = o.done ? (o.vx >= 0 ? 0.15 : -0.15) : 0;
      }
    }

    R.render(scene, cam);
  }

  function flashBellAt(x, z) {
    bellBeam.position.set(x, 15, z);
    bellFxTimer = 0.65;
  }

  return {
    sync,
    resize,
    pickRoadPoint,
    project,
    flashBellAt,
    dispose() {
      disposed = true;
      R.dispose();
    },
  };
}
