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

// Where things stand (1 unit = one voxel).
export const LAYOUT = {
  racks: [{ x: -10.5, z: -2 }, { x: 10.5, z: -2 }],
  slotGap: 4, rowY: [3, 5.6], rowZ: [1.3, -1.3],
  lamp: { x: 5.5, y: 11, z: -10 },
  door: { x: -23, z: 6 },
  sacristy: { x: 16, z: -12.5 }, serverHome: { x: -18, z: -6.6 }, behindRacks: -6.6, aisle: { x: 0, z: 14 },
};

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
  const rackLights = LAYOUT.racks.map((r) => { const l = new THREE.PointLight("#ffb347", 0.6, 30, 1.6); l.position.set(r.x, 9, r.z + 3); scene.add(l); return l; });
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
  LAYOUT.racks.forEach((r, ri) => {
    block(17, 3, 2.8, r.x, 0, r.z + 1.3, mat("#5a3a24")); block(17, 5.6, 2.6, r.x, 0, r.z - 1.3, mat("#4d311f"));
    for (let row = 0; row < 2; row++) for (let s = 0; s < 4; s++) {
      const id = ri * 8 + row * 4 + s;
      const x = r.x + (s - 1.5) * LAYOUT.slotGap, y = LAYOUT.rowY[row], z = r.z + LAYOUT.rowZ[row];
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      const glass = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: "#ffffff", transparent: true, opacity: 0.55 }));
      glass.scale.set(2.2, 2.6, 2.2); glass.position.y = 1.3; g.add(glass);
      const wax = new THREE.Mesh(box, mat("#f6f0e2")); wax.scale.set(1.4, 1.9, 1.4); wax.position.y = 0.95; g.add(wax);
      const flame = new THREE.Mesh(box, glow("#ffb02e")); flame.scale.set(0.6, 1.1, 0.6); flame.position.y = 2.5; g.add(flame);
      const core = new THREE.Mesh(box, glow("#fff3b0")); core.scale.set(0.3, 0.55, 0.3); core.position.y = 2.3; g.add(core);
      // a big tap area: the whole spot, a little taller than the candle (little fingers)
      const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ visible: false })); hit.scale.set(4, 6, 2.6); hit.position.y = 2.4; g.add(hit);
      hit.userData = { kind: "candle", id };
      hits.push(hit); candles.push({ g, glass, wax, flame, core, phase: Math.random() * 6 });
    }
  });
  const GLASS_HEX = { red: "#e0453f", blue: "#3d7fe0", white: "#f2f2f2" };

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
    a.place = (x, z, turn = 0, pose = "idle") => { a.g.position.set(x, groundY(x, z), z); a.g.rotation.y = turn; a.pose(pose); };
    a.goHome = () => a.walkTo(a.home.x, a.home.z, "walk").then(() => { a.pose("idle"); a.g.rotation.y = a.home.turn; });
    a.place(home.x, home.z, home.turn);
    scene.add(a.g); actors.push(a);
    return a;
  }
  const priest = actor({ idle: "priest-idle", walk: "priest-walk-fast", slow: ["priest-mass-walk", "priest-walk-slow"], vested: ["priest-mass-idle", "priest-idle"] },
    "#1d1b22", { x: LAYOUT.sacristy.x, z: LAYOUT.sacristy.z, turn: -0.5 });
  const server = actor({ idle: "server-idle", walk: "server-walk", light: "server-light", cross: "server-cross-walk", crossIdle: "server-cross-idle",
    candle: "server-candle-walk", candleIdle: "server-candle-idle" }, "#b02a2a", { ...LAYOUT.serverHome, turn: 0.4 });
  // a second server only for the procession (two candle bearers walk beside each other), hidden until then
  const server2 = actor({ idle: "server-candle-idle", candle: "server-candle-walk", candleIdle: "server-candle-idle" }, "#b02a2a", { x: 0, z: 30, turn: 0 });
  server2.g.visible = false;

  // people who came to pray
  const people = new Map();
  const PERSON = ["man", "woman", "child", "grandparent"];
  const BODY = ["#4a6fa5", "#a5574a", "#5f8f4e", "#8a6aa8"];
  function personArrive(p) {
    const k = p.id % 4, model = meshFor(`${PERSON[k]}-kneel`);
    const g = model ?? standIn(BODY[k], true);
    const r = LAYOUT.racks[p.rack], slot = [...people.values()].filter((x) => x.rack === p.rack).length;
    g.position.set(r.x + (slot - 0.5) * 4.5, 0.25, r.z + 6.5); g.rotation.y = Math.PI;
    scene.add(g); people.set(p.id, { g, rack: p.rack });
  }
  function personLeave(id) { const p = people.get(id); if (p) { scene.remove(p.g); people.delete(id); } }

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
      v.glass.material.color.set(GLASS_HEX[c.glass]);
      const low = c.lit && c.life < 0.25;
      const f = c.lit ? (low ? 0.45 + 0.35 * Math.abs(Math.sin(time * 18 + v.phase)) : 0.85 + 0.15 * Math.sin(time * 9 + v.phase)) : 0;
      v.flame.visible = v.core.visible = c.lit;
      v.flame.scale.set(0.6 * f + 0.08, 1.1 * f + 0.15, 0.6 * f + 0.08);
      v.wax.scale.y = 0.5 + 1.4 * (c.lit ? Math.max(0.15, c.life) : 0.5); v.wax.position.y = v.wax.scale.y / 2;
      v.flame.position.y = v.wax.scale.y + 0.7; v.core.position.y = v.wax.scale.y + 0.55;
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
    for (const p of people.values()) animate(p.g, time);
    R.render(scene, cam);
  }

  /** What's under a point on the screen (pixels in the canvas): {kind: 'candle', id} | {kind: 'lamp'} | null. */
  function pick(px, py, needs) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const all = ray.intersectObjects(hits.filter((h) => h.parent?.visible !== false), false).map((x) => x.object.userData);
    // tap areas overlap (they're big on purpose): prefer a candle that needs lighting, then the nearest
    return (needs && all.find((u) => u.kind === "candle" && needs(u.id))) ?? all[0] ?? null;
  }
  /** Where a spot in the church is on the screen (for the prayer bubbles). */
  function screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(cam), rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }
  const personHead = (id) => { const p = people.get(id); return p ? screenOf(p.g.position.x, 7, p.g.position.z) : null; };

  return {
    update, pick, resize, screenOf, personHead, personArrive, personLeave,
    candleSpot: (id) => { const v = candles[id].g.position; return { x: v.x, z: v.z }; },
    /** The server walks to a candle, lights it (his lighting pose), and goes back. `light` is called at the moment it's lit. */
    serverLights: async (id, light) => {
      const v = candles[id].g.position;
      // from behind the rack, so he never stands between the player and the candles
      await server.walkTo(v.x, LAYOUT.behindRacks, "walk");
      server.g.rotation.y = 0; server.pose("light");
      const frames = server.poses.light?.userData.frames.length ?? 6, fps = server.poses.light?.userData.fps ?? 4;
      await new Promise((r) => setTimeout(r, Math.min(3200, (frames / fps) * 1000)));
      light();
      await server.goHome();
    },
    /** The entrance procession: the cross, two candles, then the priest in his vestments, up the aisle to the altar. */
    procession: async () => {
      const A = LAYOUT.aisle;
      server.walk = null; priest.walk = null; server2.g.visible = true;
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
