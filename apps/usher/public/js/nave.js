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
export const SEAT_W = 5.4, AISLE = 5.2, ROW_GAP = 9, FRONT_Z = -28, DOORS_Z = 22;
const LANE = 3.2; // the space in front of a pew's seats (between it and the back of the pew ahead), where people walk in and out
const KINDS = ["man", "woman", "grandfather", "grandmother", "child", "child-girl"];
const QUIET = ["#6b6b6b", "#7a6a58", "#5a5a66", "#8a8478", "#4f5a52", "#6a5a5a"];
const GIRLISH = new Set(["woman", "grandmother", "child-girl"]);
const SIZE = { man: 1.12, woman: 1.1, grandfather: 1.08, grandmother: 1.06, child: 0.95, "child-girl": 0.95 };

/** Every model the game asks for (whichever exist are used; his boy and girl stand in for the rest). */
export const MODELS = ["usher-idle", "usher-walk", "usher-point", "server-idle", "server-walk", "priest-idle", "priest-mass-idle", "priest-mass-walk", "priest-kneel",
  "server-cross-walk", "server-cross-idle", "server-candle-walk", "server-candle-idle",
  "east-priest-cense", "east-priest-phelonion-idle", "east-priest-phelonion-walk", "east-server-ripidion-walk", "east-server-ripidion-idle", "east-server-candle-walk", "east-server-candle-idle", "east-server-idle",
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

export function createNave(canvas, { models = {}, rite = "roman", night = false }) {
  const BYZ = rite === "byzantine";
  const THREE = window.THREE;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(night ? "#0b0a1a" : "#2a2036");
  const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (hex) => { if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex })); return mats.get(hex); };
  const block = (w, h, d, x, y, z, m, parent = scene) => { const o = new THREE.Mesh(box, m); o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); parent.add(o); return o; };
  let time = 0;

  // ── light and the room (stand-ins until his church pieces) ──
  scene.add(new THREE.HemisphereLight("#fff4e0", "#4a3a2a", night ? 0.38 : 0.85));
  const sun = new THREE.DirectionalLight("#ffe6c0", night ? 0.12 : 0.45); sun.position.set(-30, 50, 30); scene.add(sun);
  const W = AISLE + SEAT_W * SEATS + 4, backZ = FRONT_Z + ROWS * ROW_GAP;
  block(W * 2, 0.5, DOORS_Z - FRONT_Z + 20, 0, -0.5, (DOORS_Z + FRONT_Z - 20) / 2, mat("#cdbb98"));            // floor
  block(5.2, 0.12, DOORS_Z - FRONT_Z + 14, 0, 0, (DOORS_Z + FRONT_Z - 14) / 2, mat("#a8323a"));                  // aisle carpet
  block(W * 2, 0.6, 14, 0, 0, FRONT_Z - 12, mat("#b9a886"));                                                      // sanctuary step
  block(14, 5, 5, 0, 0.6, FRONT_Z - 14, mat("#f1ead8")); block(10, 3, 0.3, 0, 1.6, FRONT_Z - 11.4, mat("#2f8a4c")); // altar and its cloth
  block(0.6, 9, 0.6, 0, 5.6, FRONT_Z - 16, mat("#c9971f")); block(4, 0.6, 0.6, 0, 12, FRONT_Z - 16, mat("#c9971f")); // cross
  // Adoration at night: the monstrance on the altar, glowing (a stand-in until his model)
  if (night) {
    const gold = mat("#e0b33e"), M = new THREE.Group(); M.position.set(0, 5.6, FRONT_Z - 14); scene.add(M);
    block(2.4, 0.5, 1.6, 0, 0, 0, gold, M); block(0.5, 2.4, 0.5, 0, 0.5, 0, gold, M);
    for (let i = 0; i < 16; i++) { const ray = new THREE.Mesh(box, gold), a = (i / 16) * Math.PI * 2, len = i % 2 ? 1.3 : 2; ray.scale.set(0.28, len, 0.25); ray.position.set(Math.sin(a) * (1.25 + len / 2), 4.5 + Math.cos(a) * (1.25 + len / 2), 0); ray.rotation.z = -a; M.add(ray); }
    const host = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24), new THREE.MeshBasicMaterial({ color: "#fffaf0" })); host.rotation.x = Math.PI / 2; host.position.set(0, 4.5, 0.1); M.add(host);
    const l = new THREE.PointLight("#ffe6a8", 1.1, 40, 1.4); l.position.set(0, 5, 3); M.add(l);
  }
  // a Byzantine church: the iconostasis across the front, its royal doors in the middle (they open when the Liturgy begins)
  const royal = [];
  if (BYZ) {
    const Z = FRONT_Z - 8, gold = mat("#c99a3c");
    block(30, 1.2, 0.8, 0, 13, Z, gold); block(30, 1, 0.8, 0, 0.6, Z, gold);
    for (const x of [-14.6, -9, -3, 3, 9, 14.6]) block(0.8, 12.4, 0.9, x, 0.6, Z, gold);
    for (const [x, robe] of [[-6, "#2e4f9a"], [6, "#8a2c2c"], [-11.8, "#5e7a3a"], [11.8, "#7a5a2a"]]) { block(4.2, 7, 0.4, x, 3, Z + 0.3, mat("#d9b45a")); block(2.4, 4, 0.3, x, 3.5, Z + 0.55, mat(robe)); block(1.2, 1.2, 0.3, x, 7.8, Z + 0.6, mat("#e9c4a0")); }
    for (const side of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(side * 3, 0.6, Z + 0.1); scene.add(pv); block(3, 9, 0.3, -side * 1.5, 0, 0, gold, pv); royal.push({ pivot: pv, side, open: 0 }); }
  }
  let doorsOpen = false;
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
    // a candle in his hands (a server's): its tip glows, like Candle Rack (the top of whatever isn't in the plain idle pose)
    const base = /-candle/.test(name) && models[name.replace(/-candle(-walk|-idle)?$/, "-idle")];
    const plain = base ? new Set(base.vox.frames.flatMap((_, f) => toScene(base.vox, f).map((c) => c[3]))) : null;
    g.userData.frames = m.vox.frames.map((_, f) => {
      const cells = toScene(m.vox, f).map(([x, y, z, c]) => [x - cx, y, z - cz, c]);
      const held = plain ? cells.filter((c) => !plain.has(c[3])) : [];
      const top = held.length ? Math.max(...held.map((c) => c[1])) : Infinity;
      const tips = held.filter((c) => c[1] === top), body = cells.filter((c) => !tips.includes(c));
      const fr = new THREE.Group();
      // a censer (his #ccffff voxel in a censing pose): incense smoke rises from it
      const censer = /cense/.test(name) ? cells.find((c) => c[3] === "#ccffff") : null;
      if (censer) fr.userData.censer = new THREE.Vector3(censer[0], censer[1] + 0.6, censer[2]);
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), body.length);
      const o = new THREE.Object3D(), col = new THREE.Color();
      body.forEach(([x, y, z, c], i) => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(recolor(c, look, null))); });
      fr.add(im);
      for (const [x, y, z, c] of tips) {
        const t = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color("#ffc94a"), 0.75) })); t.position.set(x, y, z); fr.add(t);
        const halo = new THREE.Sprite(haloMat()); halo.position.set(x, y + 0.4, z); halo.scale.set(2.6, 2.6, 1); halo.userData.halo = true; fr.add(halo);
      }
      fr.visible = f === 0; g.add(fr); return fr;
    });
    g.userData.fps = m.fps;
    return g;
  };
  // a soft warm glow (a sprite that always faces the camera), shared by every glowing candle tip
  let haloTex = null;
  function haloMat() {
    if (!haloTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,230,150,1)"); gr.addColorStop(0.35, "rgba(255,170,60,.55)"); gr.addColorStop(1, "rgba(255,140,40,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c);
    }
    return new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  }
  // incense smoke: soft gray-white puffs from a censer (Candle Rack's)
  const smoke = [];
  let smokeTex = null;
  function puff(at) {
    if (!smokeTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(245,245,250,.9)"); gr.addColorStop(0.5, "rgba(225,225,235,.45)"); gr.addColorStop(1, "rgba(220,220,230,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); smokeTex = new THREE.CanvasTexture(c);
    }
    if (smoke.length > 60) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    s.position.copy(at); scene.add(s); smoke.push({ s, life: 0, seed: Math.random() * 6 });
  }
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
  // Nobody up front while families come in; when Mass begins, the priest and servers process up the aisle (a Byzantine
  // church: out of the royal doors, the priest censing). At Adoration, the priest kneels before the altar the whole night.
  const priest = actor(BYZ ? { idle: ["east-priest-phelonion-idle", "east-priest-cense"], walk: ["east-priest-cense", "east-priest-phelonion-walk"], kneel: ["priest-kneel", "priest-idle"] }
    : { idle: ["priest-mass-idle", "priest-idle"], walk: ["priest-mass-walk", "priest-mass-idle", "priest-idle"], kneel: ["priest-kneel", "priest-idle"] }, randomLook(), 1.25, "#1d1b22");
  const servers = [0, 1, 2].map((i) => actor(BYZ ? (i === 1 ? { idle: ["east-server-candle-idle", "east-server-ripidion-idle"], walk: ["east-server-candle-walk", "east-server-ripidion-walk"] } : { idle: ["east-server-ripidion-idle"], walk: ["east-server-ripidion-walk"] })
    : i === 0 ? { idle: ["server-cross-idle", "server-idle"], walk: ["server-cross-walk", "server-walk"] } : { idle: ["server-candle-idle", "server-idle"], walk: ["server-candle-walk", "server-walk"] }, randomLook(), 1.05, "#b02a2a"));
  for (const a of [priest, ...servers]) a.g.visible = false;
  if (night) { priest.g.visible = true; priest.place(0, FRONT_Z - 9, "kneel", Math.PI); priest.g.rotation.y = Math.PI; }

  // ── camera: the whole nave fits between the top bar and the speech bubble ──
  const KEEP = [[-W, 0, backZ], [W, 0, backZ], [-W, 0, FRONT_Z - 2], [W, 0, FRONT_Z - 2], [0, 13, FRONT_Z - 16], [0, 0, DOORS_Z + 1]];
  let pad = { top: 60, bottom: 80 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h; cam.clearViewOffset();
    const top = 1 - (2 * pad.top) / h, bottom = -1 + (2 * pad.bottom) / h, look = new THREE.Vector3(0, 0, -8), v = new THREE.Vector3();
    for (let d = 20; d < 260; d += 1) {
      // looking down steeply: the rows spread out, easier to tell apart
      cam.position.set(0, d * 0.9, 4 + d * 0.42); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let ok = true, lo = Infinity, hi = -Infinity;
      for (const p of KEEP) {
        // a point behind the camera "projects" to nonsense: that view can't be the one
        if (v.set(...p).applyMatrix4(cam.matrixWorldInverse).z > -1) { ok = false; break; }
        v.set(...p).project(cam); if (Math.abs(v.x) > 0.97) ok = false; lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
      }
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
        // into the pew the way people do: up the aisle to the pew, then along the space in front of the seats (never
        // through the pews), then sit
        if (fam && walking[i]) { walking[i] = null; const lane = spot.z - LANE, ax = Math.sign(spot.x) * 2.4; a.entering = true;
          a.goTo(ax, a.g.position.z, 16).then(() => a.goTo(ax, lane, 14)).then(() => a.goTo(spot.x, lane, 12)).then(() => a.goTo(spot.x, spot.z, 10, "walk", "sit")).then(() => { a.entering = false; }); }
        else a.place(spot.x, spot.z, "sit");
        a.stay = who.stay; seated.set(who.pid, a);
      } else if (Math.abs(a.g.position.x - spot.x) > 0.1 && !a.move && !a.entering) a.goTo(spot.x, spot.z, 18, "sit", "sit"); // scooted
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
  /** Someone finished praying (Adoration): they get up, walk down the aisle and out the doors. */
  function personLeave(pid) {
    const a = seated.get(pid);
    if (!a) return;
    seated.delete(pid);
    const x = a.g.position.x, z = a.g.position.z;
    // out along the space in front of the seats to the aisle (not through the pew), then down the aisle
    const ax = x < 0 ? -1.4 : 1.4;
    a.goTo(x, z - LANE, 8).then(() => a.goTo(ax, z - LANE, 10)).then(() => a.goTo(ax, DOORS_Z + 6, 12)).then(() => { scene.remove(a.g); actors.splice(actors.indexOf(a), 1); });
  }
  /** Mass begins: you step aside, and the priest and servers process up the aisle (or out of the royal doors). */
  async function procession() {
    walking.forEach((a) => a && (a.g.visible = false));
    await usher.goTo(-5, HOME.z + 1, 20); usher.pose("idle"); usher.g.rotation.y = Math.PI / 2;
    for (const a of [priest, ...servers]) a.g.visible = true;
    const altar = FRONT_Z - 9;
    if (BYZ) {
      doorsOpen = true;
      servers[0].g.visible = false;
      servers[1].place(-6, FRONT_Z - 10, "walk", 0); servers[2].place(6, FRONT_Z - 10, "walk", 0); priest.place(0, FRONT_Z - 11, "walk", 0);
      // the priest censes the whole church: out of the royal doors, down the aisle past every pew, and back
      const back = FRONT_Z + ROWS * ROW_GAP;
      await Promise.all([servers[1].goTo(-4, altar + 1, 4, "walk", "idle"), servers[2].goTo(4, altar + 1, 4, "walk", "idle"),
        priest.goTo(0, back, 8, "walk", "walk").then(() => priest.goTo(0, altar + 1.5, 8, "walk", "walk"))]);
    } else {
      servers[0].place(0, DOORS_Z + 4, "walk"); servers[1].place(-2.2, DOORS_Z + 8, "walk"); servers[2].place(2.2, DOORS_Z + 8, "walk"); priest.place(0, DOORS_Z + 13, "walk");
      await Promise.all([servers[0].goTo(0, altar + 0.5, 6, "walk", "idle"), servers[1].goTo(-4, altar + 1, 6, "walk", "idle"), servers[2].goTo(4, altar + 1, 6, "walk", "idle"), priest.goTo(0, altar + 3, 5.5, "walk", "idle")]);
    }
    for (const a of [priest, ...servers]) a.g.rotation.y = 0;
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
      if (pm && a.g.visible) {
        const fr = pm.userData.frames?.find((f) => f.visible);
        if (fr?.userData.censer && time >= (a.nextPuff ?? 0)) { a.nextPuff = time + 0.13; puff(fr.localToWorld(fr.userData.censer.clone())); }
        fr?.children.forEach((o) => { if (o.userData.halo) { const k = 2.4 + 0.5 * Math.sin(time * 11 + o.id); o.scale.set(k, k, 1); } });
      }
    }
    // incense smoke rises, spreads and fades
    for (const sp of [...smoke]) {
      sp.life += dt;
      sp.s.position.y += dt * 2.3; sp.s.position.x += Math.sin(sp.life * 2 + sp.seed) * dt * 0.6;
      const k = (0.55 + sp.life * 0.8) * 2.2; sp.s.scale.set(k, k, 1); // bigger than Candle Rack's: the church is seen from farther away
      sp.s.material.opacity = 0.8 * Math.max(0, 1 - sp.life / 2.6);
      if (sp.life >= 2.6) { scene.remove(sp.s); sp.s.material.dispose(); smoke.splice(smoke.indexOf(sp), 1); }
    }
    pewGlow.forEach((m) => { m.material.opacity = m.userData.on ? 0.35 + 0.2 * Math.sin(time * 5) : 0; });
    for (const d of royal) { d.open += ((doorsOpen ? 1 : 0) - d.open) * Math.min(1, dt * 2.5); d.pivot.rotation.y = d.side * d.open * 1.6; }
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

  /** Where each pew's button goes on screen: just beyond its wall end, at seat height. */
  const pewButton = (pew) => { const s = seatSpot(pew, SEATS - 1); return screenOf(s.x + (s.x < 0 ? -3.6 : 3.6), 2.5, s.z); };
  return { update, resize, pick, sync, family, walkTo, walkHome, personLeave, procession, pewButton, screenOf, stayers, usherAt: () => screenOf(usher.g.position.x, 11, usher.g.position.z),
    pewScreen: (pew) => { const s = seatSpot(pew, 2); return screenOf(s.x, 6, s.z); }, hasModels: () => Object.keys(models), dispose: () => { R.dispose(); R.forceContextLoss?.(); } };
}
