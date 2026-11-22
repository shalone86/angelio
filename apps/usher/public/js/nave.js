// The church on screen for Mass Usher (three.js r128, global THREE from vendor/three-r128.min.js): the nave seen from
// the back, rows of pews either side of the aisle, the altar far away, the doors close to you. It draws what usher.js
// says. His MagicaVoxel models come from angelio.org (/api/art), the same way as Candle Rack's: the usher, the people
// walking and sitting (the Mass Usher checklists on the Drawings page). Until a pose is made, his boy and girl stand
// in (bigger for grown-ups), then plain boxes. Everyone's hair, skin, eyes and clothes are their own (looks.js); a
// family wears the family's color.
import { readVox, toScene } from "./vox.js";
import { randomLook, recolor } from "./looks.js";
import { ROWS, SEATS, pewOf } from "./usher.js";

const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

// Where things stand (1 unit = one voxel; his people are 8 tall).
export const SEAT_W = 5.4, AISLE = 3.6, ROW_GAP = 7, FRONT_Z = -32, DOORS_Z = 18;
const KINDS = ["man", "woman", "grandfather", "grandmother", "child", "child-girl"];
const QUIET = ["#6b6b6b", "#7a6a58", "#5a5a66", "#8a8478", "#4f5a52", "#6a5a5a"];
const GIRLISH = new Set(["woman", "grandmother", "child-girl"]);
const SIZE = { man: 1.12, woman: 1.1, grandfather: 1.08, grandmother: 1.06, child: 0.95, "child-girl": 0.95 };

/** Every model the game asks for (whichever exist are used; his boy and girl stand in for the rest). */
export const MODELS = ["usher-idle", "usher-walk", "usher-point", "server-idle", "server-walk", "priest-idle", "priest-mass-idle",
  ...KINDS.flatMap((k) => [`${k}-walk`, `${k}-sit`, `${k}-kneel`, `${k}-idle`])];

export async function loadModels(names = MODELS) {
  const out = {};
  let list = {};
  try { list = (await (await fetch(`${ART}/api/art`)).json()).voxels ?? {}; } catch { return out; }
  await Promise.all(names.filter((n) => list[n]).map(async (n) => {
    try {
      const r = await fetch(`${ART}/api/art/vox?slug=${n}&v=${encodeURIComponent(list[n].saved)}`);
      if (r.ok) out[n] = { vox: readVox(await r.arrayBuffer()), fps: list[n].fps ?? 4 };
    } catch { /* that one stays a stand-in */ }
  }));
  return out;
}

/** Where a seat is: x across (seat 0 by the aisle), z along the nave (the front row nearest the altar). */
export function seatSpot(pew, s) {
  const { row, side } = pewOf(pew), x = AISLE + SEAT_W / 2 + s * SEAT_W;
  return { x: side === 0 ? -x : x, z: FRONT_Z + row * ROW_GAP };
}
/** Where you stand to seat a pew: in the aisle, at its end. */
export const pewEnd = (pew) => { const { row, side } = pewOf(pew); return { x: side === 0 ? -2 : 2, z: FRONT_Z + row * ROW_GAP + 1.5 }; };

export function createNave(canvas, { models = {} }) {
  const THREE = window.THREE;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#2a2036");
  const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (hex) => { if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex })); return mats.get(hex); };
  const block = (w, h, d, x, y, z, m, parent = scene) => { const o = new THREE.Mesh(box, m); o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); parent.add(o); return o; };
  let time = 0;

  // ── light and the room (stand-ins until his church pieces) ──
  scene.add(new THREE.HemisphereLight("#fff4e0", "#4a3a2a", 0.85));
  const sun = new THREE.DirectionalLight("#ffe6c0", 0.45); sun.position.set(-30, 50, 30); scene.add(sun);
  const W = AISLE + SEAT_W * SEATS + 4, backZ = FRONT_Z + ROWS * ROW_GAP;
  block(W * 2, 0.5, DOORS_Z - FRONT_Z + 20, 0, -0.5, (DOORS_Z + FRONT_Z - 20) / 2, mat("#cdbb98"));            // floor
  block(5.2, 0.12, DOORS_Z - FRONT_Z + 14, 0, 0, (DOORS_Z + FRONT_Z - 14) / 2, mat("#a8323a"));                  // aisle carpet
  block(W * 2, 0.6, 14, 0, 0, FRONT_Z - 12, mat("#b9a886"));                                                      // sanctuary step
  block(14, 5, 5, 0, 0.6, FRONT_Z - 14, mat("#f1ead8")); block(10, 3, 0.3, 0, 1.6, FRONT_Z - 11.4, mat("#2f8a4c")); // altar and its cloth
  block(0.6, 9, 0.6, 0, 5.6, FRONT_Z - 16, mat("#c9971f")); block(4, 0.6, 0.6, 0, 12, FRONT_Z - 16, mat("#c9971f")); // cross
  block(W * 2, 30, 1, 0, 0, FRONT_Z - 19, mat("#e6dcc6"));                                                        // back wall
  for (const sx of [-1, 1]) block(1, 30, DOORS_Z - FRONT_Z + 20, sx * W, 0, (DOORS_Z + FRONT_Z - 20) / 2, mat("#ded3bd"));
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) block(0.4, 8, 3, sx * (W - 0.6), 8, FRONT_Z + 4 + i * 12, mat(["#3f7fd1", "#d13f4f", "#e8c24a", "#4fa36b"][(i + (sx > 0 ? 2 : 0)) % 4]));
  // the doors, behind the last row (closest to you)
  block(14, 0.3, 6, 0, 0, DOORS_Z + 1, mat("#7a5a3a"));

  // ── pews: a seat and a low back (people's heads and shoulders show above it), one tap area each ──
  const pewHits = [], pewGlow = [];
  for (let id = 0; id < ROWS * 2; id++) {
    const { side } = pewOf(id), first = seatSpot(id, 0), last = seatSpot(id, SEATS - 1), cx = (first.x + last.x) / 2, len = SEATS * SEAT_W;
    block(len, 2, 3, cx, 0, first.z, mat("#8a5a2e"));
    block(len, 1.1, 0.6, cx, 2, first.z + 1.8, mat("#7a4c24")); // a low back: the family's clothes show above it
    block(0.6, 3.6, 3.6, side === 0 ? -AISLE - 0.1 : AISLE + 0.1, 0, first.z + 0.3, mat("#6a4020")); // the end by the aisle
    const hit = block(len + 1.5, 9, ROW_GAP - 0.4, cx, 0, first.z + 0.4, new THREE.MeshBasicMaterial({ visible: false })); hit.userData.pew = id; pewHits.push(hit);
    const glow = block(len + 0.6, 0.3, 4, cx, 4.3, first.z + 0.4, new THREE.MeshBasicMaterial({ color: "#ffd75e", transparent: true, opacity: 0, depthWrite: false })); pewGlow.push(glow);
  }

  // ── his models, each person in their own colors ──
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
      const o = new THREE.Object3D(), col = new THREE.Color();
      cells.forEach(([x, y, z, c], i) => { o.position.set(x - cx, y, z - cz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(recolor(c, look, null))); });
      im.visible = f === 0; g.add(im); return im;
    });
    g.userData.fps = m.fps;
    return g;
  };
  const standIn = (hex, sit) => { const g = new THREE.Group(); block(3, sit ? 3.5 : 5, 2, 0, 0, 0, mat(hex), g); block(2.4, 2.4, 2.2, 0, sit ? 3.5 : 5, 0, mat("#e9c4a0"), g); g.userData.frames = []; return g; };
  const animate = (g, t) => { const fr = g.userData.frames; if (fr?.length > 1) { const k = Math.floor(t * g.userData.fps) % fr.length; fr.forEach((m, i) => { m.visible = i === k; }); } };

  // An actor: a person with a few poses (each the first of his models that exists), who walks, sits and scoots.
  const actors = [];
  function actor(poses, look, scale = 1, hex = "#5f7f9e") {
    const a = { g: new THREE.Group(), poses: {}, move: null, look };
    for (const [k, names] of Object.entries(poses)) { const m = names.map((n) => meshFor(n, look)).find(Boolean); if (m) { m.visible = false; a.poses[k] = m; a.g.add(m); } }
    for (const k of Object.keys(poses)) if (!a.poses[k]) { const st = standIn(hex, k === "sit"); st.visible = false; a.poses[k] = st; a.g.add(st); }
    a.g.scale.setScalar(scale);
    a.pose = (k) => { for (const [n, m] of Object.entries(a.poses)) m.visible = n === k; a.now = k; };
    a.place = (x, z, pose, turn = Math.PI) => { a.g.position.set(x, pose === "sit" ? 1.2 : 0, z); a.g.rotation.y = turn; a.pose(pose); };
    /** Walk (or slide, when seated) to x, z; resolves on arrival. */
    a.goTo = (x, z, speed = 16, pose = "walk", end = pose) => new Promise((done) => {
      const from = a.g.position.clone(), to = new THREE.Vector3(x, end === "sit" ? 1.2 : 0, z), dur = Math.max(0.12, from.distanceTo(to) / speed);
      a.pose(pose); a.move = { from, to, t: 0, dur, done, end };
      if (pose === "walk") { const dx = x - from.x, dz = z - from.z; if (Math.hypot(dx, dz) > 0.1) a.g.rotation.y = Math.atan2(dx, dz); }
    });
    scene.add(a.g); actors.push(a);
    return a;
  }
  const personPoses = (kind) => {
    const kid = GIRLISH.has(kind) ? "child-girl" : "child";
    return { walk: [`${kind}-walk`, `${kid}-walk`], sit: [`${kind}-sit`, `${kid}-sit`, `${kind}-kneel`, `${kid}-kneel`], idle: [`${kind}-idle`, `${kind}-walk`, `${kid}-idle`, `${kid}-walk`] };
  };
  const person = (kind, color, older) => {
    const look = randomLook(Math.random, { older, clothes: true });
    // a family wears its bright color; everyone else, quiet Sunday colors, so families stand out
    const quiet = QUIET[Math.floor(Math.random() * QUIET.length)];
    look.shirt = color ?? quiet; look.dress = color ?? quiet;
    const a = actor(personPoses(kind), look, SIZE[kind] ?? 1, color ?? "#7d8a96");
    // a family's color on their backs, so you can see who's together from behind (until his sitting poses show it)
    if (color) block(2.6, 1.8, 0.4, 0, 2.4, -1.6, mat(color), a.g);
    return a;
  };

  // you: the usher (his server stands in until the usher's poses are made)
  const usher = actor({ idle: ["usher-idle", "server-idle"], walk: ["usher-walk", "server-walk"], point: ["usher-point", "usher-idle", "server-idle"] }, randomLook(), 1.25, "#2a3a5a");
  const HOME = { x: 0, z: DOORS_Z - 3 };
  usher.place(HOME.x, HOME.z, "idle");
  // the priest waits by the altar
  const priest = actor({ idle: ["priest-mass-idle", "priest-idle"] }, randomLook(), 1.25, "#1d1b22"); priest.place(-9, FRONT_Z - 12, "idle", 0);

  // ── camera: the whole nave fits between the top bar and the speech bubble ──
  const KEEP = [[-W, 0, backZ + 2], [W, 0, backZ + 2], [-W, 0, FRONT_Z - 2], [W, 0, FRONT_Z - 2], [0, 13, FRONT_Z - 16], [0, 0, DOORS_Z + 2]];
  let pad = { top: 60, bottom: 80 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h; cam.clearViewOffset();
    const top = 1 - (2 * pad.top) / h, bottom = -1 + (2 * pad.bottom) / h, look = new THREE.Vector3(0, 0, -8), v = new THREE.Vector3();
    for (let d = 20; d < 260; d += 1) {
      cam.position.set(0, d * 0.78, 6 + d * 0.62); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let ok = true, lo = Infinity, hi = -Infinity;
      for (const p of KEEP) { v.set(...p).project(cam); if (Math.abs(v.x) > 0.97) ok = false; lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
      const shift = (top + bottom) / 2 - (hi + lo) / 2;
      if (ok && hi - lo <= top - bottom) { cam.setViewOffset(w, h, 0, (shift * h) / 2, w, h); cam.updateProjectionMatrix(); return; }
    }
  }
  resize();

  // ── people: everyone seated (by their id), and the family walking with you ──
  const seated = new Map(); // pid → actor
  let walking = []; // the family with you: their actors, by place in the family
  /** Bring the screen up to date with the rules: new people appear, anyone whose seat changed slides there. */
  function sync(g) {
    for (const p of g.pews) p.seats.forEach((who, s) => {
      if (!who) return;
      const spot = seatSpot(p.id, s);
      let a = seated.get(who.pid);
      if (!a) {
        const fam = who.family ? g.families[who.family] : null, i = fam ? fam.pids.indexOf(who.pid) : -1;
        a = fam && walking[i] ? walking[i] : person(who.kind, fam?.color, /^grand/.test(who.kind));
        if (fam && walking[i]) { walking[i] = null; a.goTo(spot.x, spot.z, 14, "walk", "sit"); } // into the pew
        else a.place(spot.x, spot.z, "sit");
        a.stay = who.stay; seated.set(who.pid, a);
      } else if (Math.abs(a.g.position.x - spot.x) > 0.1 && !a.move) a.goTo(spot.x, spot.z, 18, "sit", "sit"); // scooted
    });
    pewGlow.forEach((m, id) => { m.userData.on = g.at === id; });
  }
  /** The family at the front of the line comes in with you (shown standing beside you at the doors). */
  function family(fam) {
    for (const a of walking) if (a) { scene.remove(a.g); actors.splice(actors.indexOf(a), 1); }
    walking = fam ? fam.kinds.map((k, i) => (i < fam.seated ? null : person(k, fam.color, /^grand/.test(k)))) : [];
    walking.forEach((a, i) => a?.place(usher.g.position.x + 3 + (i % 3) * 3, usher.g.position.z + 2 + Math.floor(i / 3) * 3, "idle", Math.PI));
  }
  /** Walk to a pew's end (up the aisle), the family close behind. */
  async function walkTo(pew) {
    const end = pewEnd(pew);
    const legs = [[0, usher.g.position.z], [0, end.z + 2], [end.x, end.z + 2]];
    for (const [x, z] of legs) {
      const goes = [usher.goTo(x, z, 20)];
      walking.forEach((a, i) => { if (a) goes.push(a.goTo(x + (i % 2 ? 1.6 : -1.6), z + 3 + i * 2.2, 20)); });
      await Promise.all(goes);
    }
    usher.pose("point"); usher.g.rotation.y = end.x < 0 ? -Math.PI / 2 : Math.PI / 2;
    walking.forEach((a) => a?.pose("idle"));
  }
  async function walkHome() { await usher.goTo(0, usher.g.position.z, 20); await usher.goTo(HOME.x, HOME.z, 20); usher.pose("idle"); usher.g.rotation.y = Math.PI; }

  // ── each frame ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function update(dt) {
    time += dt;
    for (const a of actors) {
      if (a.move) {
        const m = a.move; m.t = Math.min(1, m.t + dt / m.dur);
        a.g.position.lerpVectors(m.from, m.to, m.t);
        if (m.t >= 1) { a.move = null; a.pose(m.end); if (m.end === "sit") a.g.rotation.y = Math.PI; m.done(); }
      }
      const pm = a.poses[a.now]; if (pm) animate(pm, time);
    }
    pewGlow.forEach((m) => { m.material.opacity = m.userData.on ? 0.35 + 0.2 * Math.sin(time * 5) : 0; });
    R.render(scene, cam);
  }
  /** Which pew is under a point on the screen, or null. */
  function pick(px, py) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(pewHits, false)[0];
    return hit ? hit.object.userData.pew : null;
  }
  /** Where a spot is on the screen (pixels). */
  function screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(cam), rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }
  /** The people who won't scoot, and where their heads are on screen (for their 📌). */
  const stayers = () => [...seated.entries()].filter(([, a]) => a.stay).map(([pid, a]) => ({ pid, ...screenOf(a.g.position.x, 8 * a.g.scale.y, a.g.position.z) }));

  return { update, resize, pick, sync, family, walkTo, walkHome, screenOf, stayers, usherAt: () => screenOf(usher.g.position.x, 11, usher.g.position.z),
    pewScreen: (pew) => { const s = seatSpot(pew, 2); return screenOf(s.x, 6, s.z); }, hasModels: () => Object.keys(models), dispose: () => { R.dispose(); R.forceContextLoss?.(); } };
}
