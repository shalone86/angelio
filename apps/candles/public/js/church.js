// The church on screen (three.js r128, global THREE from vendor/three-r128.min.js): it draws what game.js says.
//
// ART. His MagicaVoxel models come from angelio.org (/api/art, uploaded on the Studio's Drawings page) and are used
// as soon as they exist: the priest (priest-idle, priest-walk-fast, priest-mass-walk / priest-walk-slow), the
// people who come to pray (man-kneel, woman-kneel, child-kneel, grandparent-kneel) and the church pieces on the
// Candle Rack checklists. Until a piece is made, a plain STAND-IN of boxes takes its place (marked "stand-in"
// below). The stand-ins are not art: they only hold the place and are replaced, piece by piece, by his models.
// The parts of his models painted pink (#FF77A8) are recolored with the season's color (season.js).
import { readVox, toScene } from "./vox.js";

const T = () => window.THREE;
const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

// Where things stand (1 unit = one voxel). The racks are low (a server shows above them from the chest up) and set
// apart, so a real aisle runs between them: everyone walks down the aisle, along the front lane, or behind the racks.
export const LAYOUT = {
  racks: [{ x: -13, z: -2 }, { x: 13, z: -2 }], rackW: 14,
  slotGap: 3.2, rowY: [1.8, 3.2], rowZ: [1.1, -1.1],
  lamp: { x: 5.5, y: 11, z: -10 },
  door: { x: -23, z: 6 },
  sacristy: { x: 16, z: -12.5 }, serverHome: { x: -18, z: -6.6 }, behindRacks: -6.6, frontLane: 6, aisle: { x: 0, z: 14 },
  kneelZ: 3.6, // where someone kneels in front of a rack
};
// the racks' footprint (with a little room around them): nobody walks through it
const inRacks = (x, z) => z > -4.6 && z < 2.8 && Math.abs(x) > 5.2 && Math.abs(x) < 20.8;
/** The way from (ax, az) to (bx, bz) without walking through a rack: straight if it's clear, else to the nearest lane,
 * along it to the aisle, up or down the aisle, and along the other lane. */
export function route(ax, az, bx, bz) {
  const clear = (x1, z1, x2, z2) => { for (let i = 1; i <= 24; i++) { const k = i / 24; if (inRacks(x1 + (x2 - x1) * k, z1 + (z2 - z1) * k)) return false; } return true; };
  if (clear(ax, az, bx, bz)) return [[bx, bz]];
  const lane = (z) => (z > -1 ? LAYOUT.frontLane : LAYOUT.behindRacks);
  const la = lane(az), lb = lane(bz), pts = [[ax, la]];
  if (la !== lb) { const ax0 = Math.sign(ax + bx || 1) * 2; pts.push([ax0, la], [ax0, lb]); }
  pts.push([bx, lb], [bx, bz]);
  return pts.filter(([x, z], i) => i === pts.length - 1 || Math.hypot(x - (pts[i - 1]?.[0] ?? ax), z - (pts[i - 1]?.[1] ?? az)) > 0.2);
}
const pathLength = (ax, az, pts) => pts.reduce((n, [x, z], i) => { const [px, pz] = i ? pts[i - 1] : [ax, az]; return n + Math.hypot(x - px, z - pz); }, 0);

const isPink = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return r > 190 && b > 110 && r - g > 55 && b - g > 10; };

export async function loadModels(names) {
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

/** The church, drawn into `canvas`. */
export function createChurch(canvas, { season, models = {} }) {
  const THREE = T();
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a1430");
  const cam = new THREE.PerspectiveCamera(38, 1, 0.5, 300);
  const box = new THREE.BoxGeometry(1, 1, 1);
  let time = 0; // seconds since the church appeared (the actors and flames use it)
  const mats = new Map();
  const mat = (hex, extra = {}) => { const k = hex + JSON.stringify(extra); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: hex, ...extra })); return mats.get(k); };
  const glow = (hex) => { const k = "glow" + hex; if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: hex })); return mats.get(k); };
  const block = (w, h, d, x, y, z, m, parent = scene) => { const o = new THREE.Mesh(box, m); o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); parent.add(o); return o; };

  // ── light ──
  scene.add(new THREE.HemisphereLight("#8c86c8", "#2a1d18", 0.55));
  const sun = new THREE.DirectionalLight("#ffd9a8", 0.35); sun.position.set(-20, 30, 10); scene.add(sun);
  const rackLights = LAYOUT.racks.map((r) => { const l = new THREE.PointLight("#ffb347", 0.6, 30, 1.6); l.position.set(r.x, 7, r.z + 3); scene.add(l); return l; });
  const lampLight = new THREE.PointLight("#ff3b30", 0.8, 18, 1.8); lampLight.position.set(LAYOUT.lamp.x, LAYOUT.lamp.y, LAYOUT.lamp.z); scene.add(lampLight);

  // ── the room (stand-in) ──
  for (let x = -24; x < 24; x += 4) for (let z = -16; z < 16; z += 4) block(4, 0.5, 4, x + 2, -0.5, z + 2, mat(((x + z) / 4) % 2 ? "#cfc4b0" : "#b7aa94"));
  block(48, 24, 1, 0, 0, -16.5, mat("#d9cfbd"));                 // back wall
  block(1, 24, 32, -24.5, 0, 0, mat("#d3c8b5")); block(1, 24, 32, 24.5, 0, 0, mat("#d3c8b5"));
  const windowGlass = ["#3f7fd1", "#d13f4f", "#e8c24a", "#4fa36b"];
  for (const wx of [-17, -6, 6, 17]) for (let i = 0; i < 6; i++) block(1.2, 1.6, 0.3, wx - 1.8 + (i % 3) * 1.8, 11 + Math.floor(i / 3) * 2, -15.9, glow(windowGlass[(i + wx) & 3]));
  block(22, 1, 9, 0, 0, -12, mat("#a99a82"));                   // sanctuary step
  const altar = block(11, 5, 4, 0, 1, -12.5, mat("#efe7d6"));     // altar (stand-in)
  const frontal = block(8, 3, 0.3, 0, 2, -10.4, mat(season.hex));  // its front cloth: the season's color
  block(3, 3, 2, 0, 6, -13.2, mat("#d6a93a"));                   // tabernacle (stand-in)
  const veil = block(3.2, 2.2, 0.3, 0, 6.3, -12.15, mat(season.hex));
  block(0.4, 5, 0.4, 0, 9, -13.2, mat("#d6a93a")); block(2, 0.4, 0.4, 0, 12.3, -13.2, mat("#d6a93a")); // cross (stand-in)

  // the sanctuary lamp (stand-in): red glass on a chain; its flame dims with the oil
  const L = LAYOUT.lamp;
  block(0.2, 24 - L.y - 2, 0.2, L.x, L.y + 2, L.z, mat("#8a7a52"));
  const lampGlass = block(1.6, 2.2, 1.6, L.x, L.y, L.z, new THREE.MeshLambertMaterial({ color: "#c8262f", transparent: true, opacity: 0.75, emissive: "#5a0a0a" }));
  const lampFlame = block(0.5, 0.8, 0.5, L.x, L.y + 0.7, L.z, glow("#ffcc66"));
  const lampHit = block(5, 6, 5, L.x, L.y - 1.5, L.z, new THREE.MeshBasicMaterial({ visible: false }));
  lampHit.userData = { kind: "lamp" };

  // the door the drafts come through (stand-in), hinged at its far edge
  const D = LAYOUT.door, doorPivot = new THREE.Group(); doorPivot.position.set(D.x + 0.6, 0, D.z - 3); scene.add(doorPivot);
  block(0.6, 10, 6, 0, 0, 3, mat("#6b4428"), doorPivot);

  // ── the racks and candles (stand-in) ──
  const hits = [lampHit], candles = [];
  const GLASS_HEX = ["#e0453f", "#3d7fe0", "#f2f2f2"]; // red, blue and clear glass, just for looks
  LAYOUT.racks.forEach((r, ri) => {
    block(LAYOUT.rackW, LAYOUT.rowY[0], 2.4, r.x, 0, r.z + LAYOUT.rowZ[0], mat("#5a3a24"));
    block(LAYOUT.rackW, LAYOUT.rowY[1], 2.4, r.x, 0, r.z + LAYOUT.rowZ[1], mat("#4d311f"));
    for (let row = 0; row < 2; row++) for (let s = 0; s < 4; s++) {
      const id = ri * 8 + row * 4 + s;
      const x = r.x + (s - 1.5) * LAYOUT.slotGap, y = LAYOUT.rowY[row], z = r.z + LAYOUT.rowZ[row];
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      const glass = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: GLASS_HEX[(id + row) % 3], transparent: true, opacity: 0.55 }));
      glass.scale.set(1.9, 2.2, 1.9); glass.position.y = 1.1; g.add(glass);
      const wax = new THREE.Mesh(box, mat("#f6f0e2")); wax.scale.set(1.2, 1.6, 1.2); wax.position.y = 0.8; g.add(wax);
      const flame = new THREE.Mesh(box, glow("#ffb02e")); flame.scale.set(0.5, 0.95, 0.5); flame.position.y = 2.2; g.add(flame);
      const core = new THREE.Mesh(box, glow("#fff3b0")); core.scale.set(0.25, 0.5, 0.25); core.position.y = 2; g.add(core);
      // "tap me": a soft glow around a candle that's out (steady) or flickering (fast, orange); none when it's fine
      const ring = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0, depthWrite: false }));
      ring.scale.set(2.7, 3, 2.7); ring.position.y = 1.4; ring.renderOrder = 2; g.add(ring);
      // a big tap area: the whole spot, a little taller than the candle (little fingers)
      const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false })); hit.scale.set(3.2, 5, 2.2); hit.position.y = 2; g.add(hit);
      hit.userData = { kind: "candle", id };
      hits.push(hit); candles.push({ g, glass, wax, flame, core, ring, phase: Math.random() * 6 });
    }
  });

  // ── his voxel models ──
  const meshFor = (name, recolor = true) => {
    const m = models[name];
    if (!m) return null;
    const g = new THREE.Group();
    g.userData.frames = m.vox.frames.map((_, f) => {
      const cells = toScene(m.vox, f);
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), cells.length);
      const o = new THREE.Object3D(), col = new THREE.Color();
      cells.forEach(([x, y, z, c], i) => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(recolor && isPink(c) ? season.hex : c)); });
      im.visible = f === 0; g.add(im); return im;
    });
    g.userData.fps = m.fps;
    return g;
  };
  // a stand-in person: plain boxes, a body color and a head, kneeling or standing (until his models exist)
  const standIn = (bodyHex, kneel) => {
    const g = new THREE.Group();
    block(3, kneel ? 3 : 5, 2, 0, 0, 0, mat(bodyHex), g);
    block(2.4, 2.4, 2.2, 0, kneel ? 3 : 5, 0, mat("#e9c4a0"), g);
    g.userData.frames = [];
    return g;
  };
  const animate = (g, t) => { const fr = g.userData.frames; if (fr?.length > 1) { const k = Math.floor(t * g.userData.fps) % fr.length; fr.forEach((m, i) => { m.visible = i === k; }); } };

  // Actors: someone who stands and walks with his poses (each pose one of his models; a stand-in if none is made).
  // The priest waits by the sacristy; the altar server lights candles that went out and carries the cross or a candle
  // in the procession when the bells ring.
  const actors = [];
  // the floor is at 0; the sanctuary step (x within 11, z behind -7.5) is 1 higher
  const groundY = (x, z) => (z < -7.5 && Math.abs(x) < 11 ? 1 : 0);
  function actor(poses, standInHex, home) {
    const a = { g: new THREE.Group(), poses: {}, walk: null, home };
    for (const [k, names] of Object.entries(poses)) { const m = [].concat(names).map((n) => meshFor(n)).find(Boolean); if (m) { a.poses[k] = m; m.visible = false; a.g.add(m); } }
    if (!a.poses.idle) { const st = standIn(standInHex, false); a.poses.idle = st; a.g.add(st); }
    a.pose = (k) => { const show = a.poses[k] ? k : a.poses.walk && /walk|hurry|slow/.test(k) ? "walk" : "idle"; for (const [n, m] of Object.entries(a.poses)) m.visible = n === show; a.now = show; a.t0 = time; };
    a.walkTo = (x, z, pose = "walk", speed = 8) => new Promise((done) => { a.pose(pose); a.walk = { x, z, speed, done }; });
    // walk there the long way round if a rack is in the way (one leg at a time)
    a.go = async (x, z, pose = "walk", speed = 8) => { for (const [px, pz] of route(a.g.position.x, a.g.position.z, x, z)) await a.walkTo(px, pz, pose, speed); };
    a.timeTo = (x, z, speed = 8) => pathLength(a.g.position.x, a.g.position.z, route(a.g.position.x, a.g.position.z, x, z)) / speed;
    a.place = (x, z, turn = 0, pose = "idle") => { a.g.position.set(x, groundY(x, z), z); a.g.rotation.y = turn; a.pose(pose); };
    a.goHome = () => a.go(a.home.x, a.home.z, "walk").then(() => { a.pose("idle"); a.g.rotation.y = a.home.turn; });
    a.place(home.x, home.z, home.turn);
    scene.add(a.g); actors.push(a);
    return a;
  }
  const priest = actor({ idle: "priest-idle", walk: "priest-walk-fast", slow: ["priest-mass-walk", "priest-walk-slow"], vested: ["priest-mass-idle", "priest-idle"] },
    "#1d1b22", { x: LAYOUT.sacristy.x, z: LAYOUT.sacristy.z, turn: -0.5 });
  // the priest and the server can be tapped to help: a big invisible tap area on each, and a gold ring at their feet
  // that pulses when someone is in the way and they're free to go
  const helperRing = (a, who) => {
    const hit = block(6, 11, 6, 0, 0, 0, new THREE.MeshBasicMaterial({ visible: false }), a.g); hit.userData = { kind: "helper", who }; hits.push(hit);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 24), new THREE.MeshBasicMaterial({ color: "#ffd75e", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; a.g.add(ring); a.ring = ring;
  };
  const server = actor({ idle: "server-idle", walk: "server-walk", light: "server-light", cross: "server-cross-walk", crossIdle: "server-cross-idle",
    candle: "server-candle-walk", candleIdle: "server-candle-idle" }, "#b02a2a", { ...LAYOUT.serverHome, turn: 0.4 });
  // a second server only for the procession (two candle bearers walk beside each other), hidden until then
  helperRing(priest, "priest"); helperRing(server, "server");
  const server2 = actor({ idle: "server-candle-idle", candle: "server-candle-walk", candleIdle: "server-candle-idle" }, "#b02a2a", { x: 0, z: 30, turn: 0 });
  server2.g.visible = false;

  // people who come to pray: they walk up from the front, kneel in front of a rack (in the way of the candles behind
  // them), and later get up and walk off to a pew
  const people = new Map();
  const PERSON = ["man", "woman", "child", "grandparent"];
  const BODY = ["#4a6fa5", "#a5574a", "#5f8f4e", "#8a6aa8"];
  const spotOf = (p) => { const r = LAYOUT.racks[p.rack]; return { x: r.x + (p.slot - 1) * LAYOUT.slotGap, z: r.z + LAYOUT.kneelZ + 2 }; };
  function personArrive(p, walkIn = 2) {
    const k = p.id % 4, kind = PERSON[k];
    const a = actor({ idle: `${kind}-idle`, walk: `${kind}-walk`, kneel: `${kind}-kneel` }, BODY[k], { x: 0, z: 20, turn: Math.PI });
    if (!a.poses.kneel) { const st = standIn(BODY[k], true); st.visible = false; a.poses.kneel = st; a.g.add(st); }
    const at = spotOf(p), from = { x: at.x + (at.x < 0 ? -4 : 4), z: 17 };
    a.place(from.x, from.z, Math.PI, "walk");
    const speed = Math.hypot(at.x - from.x, at.z - from.z) / walkIn;
    a.walkTo(at.x, at.z, "walk", speed).then(() => { if (people.has(p.id)) { a.pose("kneel"); a.g.rotation.y = Math.PI; } });
    people.set(p.id, { a, rack: p.rack });
  }
  /** They get up and walk off to the pews (toward the front, out of sight), then they're gone. */
  function personLeave(id) {
    const p = people.get(id);
    if (!p) return;
    people.delete(id);
    const x = p.a.g.position.x;
    p.a.walkTo(x + (x < 0 ? -3 : 3), 22, "walk", 7).then(() => { scene.remove(p.a.g); actors.splice(actors.indexOf(p.a), 1); });
  }

  // ── camera: the whole church fits, whatever the screen's shape ──
  // The camera comes as close as it can while the racks, the altar and the lamp all fit between the clock at the top
  // and the speech bubble at the bottom (pad: pixels kept clear), whatever the screen's shape.
  const KEEP = [[-20, 0, 2.5], [20, 0, 2.5], [-20, 9, -3], [20, 9, -3], [0, 13, -13], [LAYOUT.lamp.x, LAYOUT.lamp.y + 2, LAYOUT.lamp.z], [-20, 0, 6], [20, 0, 6]];
  let pad = { top: 70, bottom: 90 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h;
    const top = 1 - (2 * pad.top) / h, bottom = -1 + (2 * pad.bottom) / h, look = new THREE.Vector3(0, 3, -4), v = new THREE.Vector3();
    for (let d = 18; d < 160; d += 1) {
      cam.position.set(0, d * 0.62, d * 0.78 - 4); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let ok = true, lo = Infinity, hi = -Infinity;
      for (const p of KEEP) { v.set(...p).project(cam); if (Math.abs(v.x) > 0.96) ok = false; lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); }
      // shift the view up or down so the scene sits in the clear band, then check it fits
      const shift = (top + bottom) / 2 - (hi + lo) / 2;
      if (ok && hi - lo <= top - bottom) { cam.setViewOffset(w, h, 0, (shift * h) / 2, w, h); cam.updateProjectionMatrix(); return; }
    }
    cam.clearViewOffset(); cam.updateProjectionMatrix();
  }
  resize();

  // ── each frame: draw the game's state ──
  let doorOpen = 0, doorTarget = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function update(g, dt) {
    time += dt;
    g.candles.forEach((c, i) => {
      const v = candles[i];
      v.g.visible = c.active;
      const low = c.lit && c.life < 0.25;
      const blocked = g.people.some((p) => g.t >= p.at && p.rack === c.rack && (c.slot === p.slot || c.slot === p.slot + 1));
      const want = !g.over && c.active && !blocked && (!c.lit || low);
      v.ring.material.color.set(low ? "#ff9a2e" : "#fff1a8");
      v.ring.material.opacity = want ? (low ? 0.28 + 0.22 * Math.abs(Math.sin(time * 7)) : 0.2 + 0.12 * Math.sin(time * 3 + v.phase)) : 0;
      v.ring.visible = want;
      const f = c.lit ? (low ? 0.45 + 0.35 * Math.abs(Math.sin(time * 18 + v.phase)) : 0.85 + 0.15 * Math.sin(time * 9 + v.phase)) : 0;
      v.flame.visible = v.core.visible = c.lit;
      v.flame.scale.set(0.5 * f + 0.07, 0.95 * f + 0.12, 0.5 * f + 0.07);
      v.wax.scale.y = 0.4 + 1.2 * (c.lit ? Math.max(0.15, c.life) : 0.5); v.wax.position.y = v.wax.scale.y / 2;
      v.flame.position.y = v.wax.scale.y + 0.6; v.core.position.y = v.wax.scale.y + 0.45;
    });
    LAYOUT.racks.forEach((r, ri) => { const n = g.candles.filter((c) => c.rack === ri && c.lit).length; rackLights[ri].intensity = 0.15 + n * 0.12; });
    lampFlame.visible = !g.lampOut;
    const lf = g.lampOut ? 0 : 0.4 + 0.6 * g.lamp;
    lampFlame.scale.set(0.5 * lf, 0.8 * lf, 0.5 * lf);
    lampLight.intensity = g.lampOut ? 0 : 0.2 + g.lamp * 0.9 + (g.lamp < 0.3 ? 0.3 * Math.sin(time * 14) : 0);
    lampGlass.material.emissive.set(g.lampOut ? "#100202" : "#5a0a0a");
    doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 4); doorPivot.rotation.y = -doorOpen * 1.1;
    // everyone walking
    for (const a of actors) {
      if (a.walk) {
        const dx = a.walk.x - a.g.position.x, dz = a.walk.z - a.g.position.z, d = Math.hypot(dx, dz);
        a.g.rotation.y = Math.atan2(dx, dz);
        if (d < 0.3) { const done = a.walk.done; a.walk = null; done(); }
        else { const st = Math.min(d, a.walk.speed * dt); a.g.position.x += (dx / d) * st; a.g.position.z += (dz / d) * st; a.g.position.y = groundY(a.g.position.x, a.g.position.z); }
      }
      const m = a.poses[a.now];
      if (m) animate(m, time - (a.t0 ?? 0));
    }
    // the helpers' rings: gold and pulsing while someone is in the way and they're free
    const waiting = !g.over && g.people.some((p) => g.t >= p.at && !p.helped);
    for (const a of [priest, server]) { a.ring.material.opacity = waiting && !a.busy ? 0.45 + 0.35 * Math.sin(time * 6) : 0; a.ring.visible = waiting && !a.busy; }
    R.render(scene, cam);
  }

  /** What's under a point on the screen (pixels in the canvas): {kind: 'candle', id} | {kind: 'lamp'} | null. */
  function pick(px, py, needs) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const all = ray.intersectObjects(hits.filter((h) => h.parent?.visible !== false), false).map((x) => x.object.userData);
    // tap areas overlap (they're big on purpose): a candle that can be lit, then the priest or server, then the nearest
    return (needs && all.find((u) => u.kind === "candle" && needs(u.id))) ?? all.find((u) => u.kind === "helper") ?? all[0] ?? null;
  }
  /** Where a spot in the church is on the screen (for the prayer bubbles). */
  function screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(cam), rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }
  const personHead = (id) => { const p = people.get(id); return p ? screenOf(p.a.g.position.x, 7, p.a.g.position.z) : null; };
  const helpers = { priest, server };

  return {
    update, pick, resize, screenOf, personHead, personArrive, personLeave,
    candleSpot: (id) => { const v = candles[id].g.position; return { x: v.x, z: v.z }; },
    /** The server walks to a candle, lights it (his lighting pose), and goes back. `light` is called at the moment it's lit. */
    serverLights: async (id, light) => {
      const v = candles[id].g.position;
      server.busy = true;
      // from behind the rack, so he never stands between the player and the candles
      await server.go(v.x, LAYOUT.behindRacks, "walk");
      server.g.rotation.y = 0; server.pose("light");
      const frames = server.poses.light?.userData.frames.length ?? 6, fps = server.poses.light?.userData.fps ?? 4;
      await new Promise((r) => setTimeout(r, Math.min(3200, (frames / fps) * 1000)));
      light();
      server.busy = false;
      await server.goHome();
    },
    helperBusy: (who) => !!helpers[who]?.busy,
    /** How long the priest or the server takes to reach someone kneeling (seconds), to tell the rules when they leave. */
    helpTime: (who, personId) => { const p = people.get(personId), a = helpers[who]; if (!p || !a) return 0; const at = p.a.g.position; return a.timeTo(at.x, at.z + 3, 14); },
    /** He hurries over (around the racks), stands by the person while they get up, and goes back. */
    helpPerson: async (who, personId) => {
      const p = people.get(personId), a = helpers[who];
      if (!p || !a || a.busy) return false;
      a.busy = true;
      const at = p.a.g.position;
      await a.go(at.x, at.z + 3, "walk", 14);
      a.g.rotation.y = Math.PI; a.pose("idle");
      await new Promise((r) => setTimeout(r, 700));
      a.busy = false;
      a.goHome();
      return true;
    },
    /** The entrance procession: the cross, two candles, then the priest in his vestments, up the aisle to the altar. */
    procession: async () => {
      const A = LAYOUT.aisle;
      server.walk = null; priest.walk = null; server2.g.visible = true; server.busy = priest.busy = true;
      server.place(A.x, A.z, Math.PI, "cross");
      server2.place(A.x - 3, A.z + 5, Math.PI, "candle");
      priest.place(A.x, A.z + 12, Math.PI, "slow");
      const third = actor({ idle: "server-candle-idle", candle: "server-candle-walk", candleIdle: "server-candle-idle" }, "#b02a2a", { x: A.x + 3, z: A.z + 5, turn: Math.PI });
      third.pose("candle");
      await Promise.all([
        server.walkTo(0, -8.5, "cross", 3.4).then(() => server.walkTo(-8.5, -9.5, "cross", 3.4)).then(() => { server.pose("crossIdle"); server.g.rotation.y = 0; }),
        server2.walkTo(-3, -8.5, "candle", 3.2).then(() => server2.walkTo(-5, -9, "candle", 3.2)).then(() => { server2.pose("candleIdle"); server2.g.rotation.y = 0; }),
        third.walkTo(3, -8.5, "candle", 3.2).then(() => third.walkTo(5, -9, "candle", 3.2)).then(() => { third.pose("candleIdle"); third.g.rotation.y = 0; }),
        priest.walkTo(0, -8.6, "slow", 3.2).then(() => { priest.pose("vested"); priest.g.rotation.y = 0; }),
      ]);
    },
    door: (open) => { doorTarget = open ? 1 : 0; },
    hasModels: () => Object.keys(models),
    dispose: () => { R.dispose(); },
  };
}
