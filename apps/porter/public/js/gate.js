// The monastery gate on screen for Monastery Porter (three.js r128, global THREE from vendor/three-r128.min.js): a stone
// wall with a gate and a wooden door, the path outside where visitors line up, the courtyard and the chapel inside, seen
// from above and behind you (you're the porter, standing just inside). It draws what porter.js says. His MagicaVoxel
// models come from angelio.org (/api/art) the way Mass Usher's do: his people for the visitors (his boy and girl stand in
// for the ones not made yet), a robe painted on for the monk and the porter, a goat of boxes until he makes one.
import { readVox, toScene } from "./vox.js";
import { randomLook, recolor } from "./looks.js";
import { ANIMALS, VISITORS } from "./visitors.js";
import { stepAgents } from "./steer.js";

const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

// Where things stand (1 unit = one voxel; his people are 8 tall). The gate is at z = 0, outside is -z, you look toward -z.
export const DOOR = { x: 0, z: -10 };       // where the visitor at the door stands (just outside)
const SPAWN_Z = -75;                        // far down the path, off the top of the screen
const LEAVE_X = 4.2;                        // the right-hand side of the path: people sent away walk down it, past the line
const spotInLine = (i) => ({ x: -1.8 + (((i * 7) % 3) - 1) * 0.6, z: DOOR.z - 7 * (i + 1) }); // the left of the path, one behind the other
const PORTER_AT = { x: -8, z: 6 };
const CHAPEL_DOOR = { x: 11.5, z: 17 };
const KINDS = ["man", "woman", "grandfather", "grandmother", "child", "child-girl"];
const GIRLISH = new Set(["woman", "grandmother", "child-girl"]);
const SIZE = { man: 1.12, woman: 1.1, grandfather: 1.08, grandmother: 1.06, child: 0.95, "child-girl": 0.95 };
const ROBES = { monk: "#5a4030" };

/** Every model the game asks for (whichever exist are used; his boy and girl stand in for the rest). */
export const MODELS = ["porter-idle", "porter-walk", "monk-idle", "monk-walk", ...ANIMALS.flatMap((a) => [`${a}-idle`, `${a}-walk`]),
  ...KINDS.flatMap((k) => [`${k}-walk`, `${k}-idle`]),
  ...VISITORS.filter((v) => !ANIMALS.includes(v.kind)).flatMap((v) => [`${v.id}-idle`, `${v.id}-walk`])]; // (any visitor can have a character of their own: bishop-walk…)

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

export function createGate(canvas, { models = {}, night = false, porter: who = { id: "porter", robe: "#2b2830", model: "porter" } }) {
  const THREE = window.THREE;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(night ? "#34503a" : "#7fa860");
  const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map();
  const mat = (hex) => { if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex })); return mats.get(hex); };
  const block = (w, h, d, x, y, z, m, parent = scene) => { const o = new THREE.Mesh(box, m); o.scale.set(w, h, d); o.position.set(x, y + h / 2, z); parent.add(o); return o; };
  let time = 0, disposed = false;

  // a soft warm glow (a sprite that always faces the camera), for the lanterns
  let haloTex = null;
  const haloMat = () => {
    if (!haloTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,230,150,1)"); gr.addColorStop(0.35, "rgba(255,170,60,.55)"); gr.addColorStop(1, "rgba(255,140,40,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c);
    }
    return new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  };
  // the same glow in red: the door's alarm (a draft, or someone let in who doesn't belong)
  let redTex = null;
  const redHaloMat = () => {
    if (!redTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,120,110,1)"); gr.addColorStop(0.4, "rgba(224,69,63,.6)"); gr.addColorStop(1, "rgba(224,69,63,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); redTex = new THREE.CanvasTexture(c);
    }
    return new THREE.SpriteMaterial({ map: redTex, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }); // normal blending: additive red turns white on the pale ground
  };

  // ── light and the world (stand-ins until his own pieces) ──
  scene.add(new THREE.HemisphereLight(night ? "#8fa0d0" : "#fff4e0", night ? "#1a1a2a" : "#6a5a3a", night ? 0.85 : 0.95));
  const sun = new THREE.DirectionalLight(night ? "#9fb0e0" : "#ffe6c0", night ? 0.4 : 0.5); sun.position.set(-30, 60, 30); scene.add(sun);
  block(900, 0.5, 400, 0, -0.5, -200, mat(night ? "#34503a" : "#7fa860"));         // grass outside (far past the edges of the screen)
  block(11, 0.1, 300, 0, 0, -150, mat(night ? "#6b5a45" : "#c8a878"));              // the path
  block(900, 0.5, 400, 0, -0.5, 200, mat(night ? "#5a5a60" : "#c9bda0"));          // the courtyard (flagstones)
  const STONE = night ? "#7a766c" : "#b8ad94", STONE_DK = night ? "#625e56" : "#a09578";
  for (const sx of [-1, 1]) { block(30, 6, 3, sx * 25, 0, 0, mat(STONE)); block(30, 1, 3.6, sx * 25, 6, 0, mat(STONE_DK)); } // the wall, both sides of the gate
  for (const sx of [-1, 1]) block(4.4, 12, 4.4, sx * 8, 0, 0, mat(STONE));            // the two gateposts
  block(21, 2.6, 4.4, 0, 9.4, 0, mat(STONE)); block(21, 1, 5, 0, 12, 0, mat(STONE_DK)); // the lintel over the door
  block(1, 5, 1, 0, 13, 0, mat("#c9971f")); block(4, 1, 1, 0, 16, 0, mat("#c9971f")); // a cross on top
  // the door: two leaves hinged on the gateposts, swinging inward (toward you) when it opens
  const doorWood = new THREE.MeshLambertMaterial({ color: "#7a4c24" }), WOOD = new THREE.Color("#7a4c24"), ALARM_RED = new THREE.Color("#e0453f");
  const leaves = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * 6, 0, 0); scene.add(pivot);
    block(6, 9.4, 0.9, -s * 3, 0, 0, doorWood, pivot);
    block(5, 0.6, 1.1, -s * 3, 2, 0, mat("#4a3018"), pivot); block(5, 0.6, 1.1, -s * 3, 6.6, 0, mat("#4a3018"), pivot); // iron bands
    block(0.7, 1.4, 1.2, -s * 0.8, 4.2, 0, mat("#c9971f"), pivot);                                                    // a handle
    return { pivot, s };
  });
  const alarmGlow = new THREE.Sprite(redHaloMat()); alarmGlow.position.set(0, 5, 2); alarmGlow.scale.set(26, 20, 1); alarmGlow.renderOrder = 5; scene.add(alarmGlow);
  let doorTarget = 0, doorOpen = 0, draft = false, alarmUntil = 0, alarmLevel = 0;
  // lanterns on the gateposts
  const lanterns = [];
  for (const sx of [-1, 1]) {
    block(1.8, 2, 1.8, sx * 8, 13, 0, mat("#2a2a2a"));
    const flame = block(1.1, 1.2, 1.1, sx * 8, 13.4, 0, new THREE.MeshBasicMaterial({ color: "#ffd27a" }));
    const halo = new THREE.Sprite(haloMat()); halo.position.set(sx * 8, 14.4, 0); halo.scale.set(night ? 9 : 5, night ? 9 : 5, 1); scene.add(halo);
    if (night) { const l = new THREE.PointLight("#ffcf86", 1.3, 70, 1.3); l.position.set(sx * 8, 15, -4); scene.add(l); }
    lanterns.push({ flame, halo });
  }
  // inside: a well, some bushes, and the chapel (where welcomed visitors go)
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; block(1.8, 3, 1.8, -12 + Math.cos(a) * 3.5, 0, 14 + Math.sin(a) * 3.5, mat("#8d8678")); }
  block(2, 2, 2, -12, 3, 14, mat("#6a5030")); block(7, 0.5, 7, -12, 0, 14, mat("#3a5a7a"));
  for (const [x, z] of [[-20, 6], [-20, 22], [-4, 22], [5, 24]]) { block(5, 4, 5, x, 0, z, mat(night ? "#2a4a30" : "#4a8a48")); block(3, 3, 3, x + 0.5, 4, z, mat(night ? "#2a4a30" : "#5a9a58")); }
  block(12, 12, 16, 17, 0, 17, mat(night ? "#8a8070" : "#e6dcc4"));               // the chapel
  block(13, 3, 17, 17, 12, 17, mat("#9a5a3a"));                                    // its roof
  block(1, 8, 1, 17, 15, 17, mat("#c9971f")); block(4, 1, 1, 17, 20, 17, mat("#c9971f"));
  block(0.4, 8, 5, 10.9, 0, CHAPEL_DOOR.z, mat("#3a2a1e"));                       // its doorway, on the side facing the gate
  const chapelLight = block(0.3, 7, 4, 10.7, 0.5, CHAPEL_DOOR.z, new THREE.MeshBasicMaterial({ color: night ? "#ffcf86" : "#6a4a30" }));
  // stars in a night sky are out of the camera's reach; a few stand-in lamps on the wall instead
  void chapelLight;

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
  const standIn = (hex) => { const g = new THREE.Group(); block(3, 5, 2, 0, 0, 0, mat(hex), g); block(2.4, 2.4, 2.2, 0, 5, 0, mat("#e9c4a0"), g); g.userData.frames = []; return g; };
  // an animal of boxes (faces +z) until he draws it: a table of how each one is put together
  const CRITTERS = {
    goat: { body: [3, 3, 5.5], color: "#f1ece0", legs: "#8a8478", horns: "#8a8478", beard: true },
    sheep: { body: [4.2, 3.6, 5.5], color: "#f4f1ea", legs: "#3a3a3a", head: "#3a3a3a", ears: "#3a3a3a" },
    cow: { body: [4.6, 4.6, 8], color: "#f4f4f4", spots: "#232323", legs: "#d9d2c4", horns: "#e8e0d0", ears: "#232323", leg: 2.4, scale: 1.15 },
    pig: { body: [3.8, 3.2, 5.5], color: "#f2a8b8", legs: "#e58fa3", snout: "#e58fa3", ears: "#e58fa3", leg: 1.2 },
    dog: { body: [2.4, 2.8, 5], color: "#a8692f", legs: "#8a5522", ears: "#6b4226", tail: "#a8692f" },
    cat: { body: [2, 2.2, 4], color: "#e07a2e", legs: "#c9651e", pointEars: "#e07a2e", tail: "#e07a2e", leg: 1.2 },
    chicken: { body: [2.4, 2.6, 3], color: "#f4efe2", legs: "#e3b341", comb: "#c8262f", beak: "#e3b341", leg: 1.4 },
    duck: { body: [2.4, 2, 3.6], color: "#f4efe2", legs: "#e07a2e", head: "#2f8a4c", beak: "#e3b341", leg: 1.0 },
    rabbit: { body: [2.4, 2.4, 3.6], color: "#cfc7b8", legs: "#b3ab9c", longEars: "#cfc7b8", tail: "#ffffff", leg: 1.0 },
    horse: { body: [3.4, 4.6, 8.5], color: "#8a5a2e", legs: "#6a4020", neck: true, mane: "#2e1d12", ears: "#6a4020", tail: "#2e1d12", leg: 3.4, scale: 1.2 },
  };
  const critter = (kind) => {
    const c = CRITTERS[kind] ?? CRITTERS.goat, g = new THREE.Group(), [w, h, l] = c.body, lh = c.leg ?? 1.8, col = mat(c.color), head = mat(c.head ?? c.color);
    block(w, h, l, 0, lh, 0, col, g);
    if (c.spots) { block(w + 0.1, h * 0.5, l * 0.3, 0, lh + h * 0.3, -l * 0.15, mat(c.spots), g); block(w + 0.1, h * 0.35, l * 0.2, 0, lh + h * 0.4, l * 0.2, mat(c.spots), g); }
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) block(0.7, lh, 0.7, x * (w / 2 - 0.5), 0, z * (l / 2 - 0.7), mat(c.legs), g);
    const hy = lh + h * 0.55 + (c.neck ? h * 0.7 : 0), hz = l / 2 + 0.6;
    if (c.neck) block(1.5, h * 0.9, 1.5, 0, lh + h * 0.55, l / 2 - 0.3, col, g);
    if (c.mane) block(0.5, h * 0.9, 1.8, 0, lh + h * 0.7, l / 2 - 0.9, mat(c.mane), g);
    block(Math.max(1.4, w * 0.7), h * 0.7, 2, 0, hy, hz, head, g);                 // head
    for (const sx of [-1, 1]) {
      if (c.horns) block(0.5, 1.4, 0.5, sx * 0.8, hy + h * 0.7, hz, mat(c.horns), g);
      if (c.ears) block(0.4, 1.1, 1, sx * (w * 0.4), hy + h * 0.3, hz - 0.6, mat(c.ears), g);
      if (c.pointEars) block(0.5, 1, 0.5, sx * 0.7, hy + h * 0.7, hz - 0.3, mat(c.pointEars), g);
      if (c.longEars) block(0.5, 2.4, 0.6, sx * 0.6, hy + h * 0.7, hz - 0.4, mat(c.longEars), g);
    }
    if (c.snout) block(1.4, 0.9, 0.8, 0, hy + 0.1, hz + 1.2, mat(c.snout), g);
    if (c.beard) block(0.6, 1.4, 0.6, 0, hy - 1.2, hz + 0.8, mat("#8a8478"), g);
    if (c.comb) block(0.5, 0.9, 1.2, 0, hy + h * 0.7, hz - 0.2, mat(c.comb), g);
    if (c.beak) block(0.9, 0.5, 0.9, 0, hy + 0.2, hz + 1.1, mat(c.beak), g);
    if (c.tail) block(0.7, 0.9, 1.4, 0, lh + h * 0.8, -l / 2 - 0.6, mat(c.tail), g);
    g.userData.frames = []; g.userData.scale = c.scale ?? 1; return g;
  };
  const animate = (g, t) => { const fr = g.userData.frames; if (fr?.length > 1) { const k = Math.floor(t * g.userData.fps) % fr.length; fr.forEach((m, i) => { m.visible = i === k; }); } };

  // An actor: a person with a few poses (each the first of his models that exists), who walks and stands.
  const actors = [];
  let agentIds = 0;
  function actor(poses, look, scale = 1, hex = "#5f7f9e", fallback = null) {
    const a = { g: new THREE.Group(), poses: {}, nav: null, look, agent: { id: ++agentIds, x: 0, z: 0, r: 1.3 * scale, goal: null, speed: 14 } };
    a.agent.actor = a;
    for (const [k, names] of Object.entries(poses)) { const m = names.map((n) => meshFor(n, look)).find(Boolean); if (m) { m.visible = false; a.poses[k] = m; a.g.add(m); } }
    for (const k of Object.keys(poses)) if (!a.poses[k]) { const st = fallback ? fallback() : standIn(hex); st.visible = false; a.poses[k] = st; a.g.add(st); }
    a.g.scale.setScalar(scale); a.agent.r = 1.3 * scale;
    a.pose = (k) => { for (const [n, m] of Object.entries(a.poses)) m.visible = n === k; a.now = k; };
    a.place = (x, z, pose, turn = 0) => { a.g.position.set(x, 0, z); a.g.rotation.y = turn; a.pose(pose); a.agent.x = x; a.agent.z = z; a.agent.goal = null; a.nav = null; };
    /** Walk to x, z (around whoever is in the way: steer.js); resolves on arrival. */
    a.goTo = (x, z, speed = 14, pose = "walk", end = "idle") => new Promise((done) => {
      a.pose(pose); a.nav = { end, done }; Object.assign(a.agent, { goal: { x, z }, speed, bestDist: null, stuckT: 0, ghost: 0 });
    });
    scene.add(a.g); actors.push(a);
    return a;
  }
  const remove = (a) => { scene.remove(a.g); const i = actors.indexOf(a); if (i >= 0) actors.splice(i, 1); };
  const kidOf = (kind) => (GIRLISH.has(kind) ? "child-girl" : "child");
  const peoplePoses = (kind, extra = []) => ({ walk: [...extra.map((n) => `${n}-walk`), `${kind}-walk`, `${kidOf(kind)}-walk`], idle: [...extra.map((n) => `${n}-idle`), `${kind}-idle`, `${kind}-walk`, `${kidOf(kind)}-idle`, `${kidOf(kind)}-walk`] });
  const robed = (robe) => ({ ...randomLook(Math.random, { older: Math.random() < 0.3 }), shirt: robe, dress: robe, belt: "#e8dcc0", shoes: "#2a1a10" });

  // you: the porter, just inside the gate, watching the door
  // (the six unlockable porters, porters.js: a nun is a woman in a habit and veil of her color; the old brother has gray hair)
  const nun = /^(sister|bell|respected)$/.test(who.id);
  const porter = actor(peoplePoses(nun ? "woman" : "man", [who.model ?? "porter"]), { ...robed(who.robe), hair: nun ? who.robe : who.id === "old" ? "#d8d4cc" : "#2e1d12" }, 1.2, who.robe);
  porter.place(PORTER_AT.x, PORTER_AT.z, "idle", Math.PI);
  // Brother with the Dog: his big dog sits beside him, and runs to the gate when an animal comes
  const dogHome = { x: PORTER_AT.x + 5, z: PORTER_AT.z + 3 };
  const dog = who.dog ? actor({ walk: ["dog-walk"], idle: ["dog-idle", "dog-walk"] }, randomLook(), 1.3, "#a8692f", () => critter("dog")) : null;
  dog?.place(dogHome.x, dogHome.z, "idle", Math.PI);
  if (dog) dog.g.scale.setScalar(1.3 * (dog.poses.idle.userData.scale ?? 1));
  async function dogChase() {
    if (!dog) return;
    await dog.goTo(2.5, -6, 30); if (disposed) return;
    await dog.goTo(dogHome.x, dogHome.z, 20, "walk", "idle"); if (disposed) return;
    dog.g.rotation.y = Math.PI;
  }

  // ── camera: the gate, the path and the chapel fit between the top bar and the bubble ──
  const KEEP = [[-24, 0, 26], [24, 0, 26], [-24, 0, -52], [24, 0, -52], [0, 17, -4]];
  let pad = { top: 60, bottom: 80 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h; cam.clearViewOffset();
    const top = 1 - (2 * pad.top) / h, bottom = -1 + (2 * pad.bottom) / h, look = new THREE.Vector3(0, 0, -8), v = new THREE.Vector3();
    for (let d = 20; d < 300; d += 1) {
      cam.position.set(0, d * 0.95, 12 + d * 0.32); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let ok = true, lo = Infinity, hi = -Infinity;
      for (const p of KEEP) {
        if (v.set(...p).applyMatrix4(cam.matrixWorldInverse).z > -1) { ok = false; break; } // behind the camera: can't be the one
        v.set(...p).project(cam); if (Math.abs(v.x) > 0.97) ok = false; lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
      }
      const shift = (top + bottom) / 2 - (hi + lo) / 2;
      if (ok && hi - lo <= top - bottom) { cam.setViewOffset(w, h, 0, (shift * h) / 2, w, h); cam.updateProjectionMatrix(); return; }
    }
  }
  resize();

  // ── the visitors: each has a person on the path, who walks where the rules say ──
  const folk = new Map(); // visitor id → {a, at (where they were last sent), mode}
  function makeVisitor(v) {
    const animal = ANIMALS.includes(v.kind);
    const a = animal ? actor({ walk: [`${v.kind}-walk`], idle: [`${v.kind}-idle`, `${v.kind}-walk`] }, randomLook(), 1.05, "#f1ece0", () => critter(v.kind))
      : actor(peoplePoses(v.kind, [v.def, ...(v.robe ? ["monk"] : [])]), v.robe ? robed(v.robe) : randomLook(Math.random, { older: /grand/.test(v.kind), clothes: true }), SIZE[v.kind] ?? 1, "#7d8a96");
    if (animal) a.g.scale.setScalar(1.05 * (a.poses.walk.userData.scale ?? 1));
    if (who.glow && v.answer === "greet") { const halo = new THREE.Sprite(haloMat()); halo.position.set(0, 6, 0); halo.scale.set(9, 9, 1); halo.userData.glow = true; a.g.add(halo); } // Sister Portress sees who is special
    a.place(-1.8 - Math.random() * 1.5, SPAWN_Z, "walk", 0);
    const f = { a, at: null, mode: "line" }; folk.set(v.id, f); return f;
  }
  /** Bring the screen up to date with the rules: new visitors appear far down the path, and everyone in line steps forward. */
  function sync(g) {
    const here = [...g.queue, g.front].filter((v) => v && (v.state === "line" || v.state === "arriving" || v.state === "waiting"));
    here.forEach((v) => {
      const f = folk.get(v.id) ?? makeVisitor(v);
      if (f.mode !== "line") return;
      const spot = v === g.front ? DOOR : spotInLine(g.queue.indexOf(v)), key = `${spot.x},${spot.z}`;
      if (f.at !== key) { f.at = key; f.a.goTo(spot.x, spot.z, v === g.front ? 20 : 24, "walk", "idle").then(() => { if (f.mode === "line") f.a.g.rotation.y = 0; }); }
    });
  }
  const later = (s) => new Promise((r) => setTimeout(r, s * 1000));
  let wanted = false, flashUntil = 0;
  /** The door the player holds open (🚪) or shut. */
  const setDoor = (open) => { wanted = open; };
  /** The door swings open for a moment (a greeting at a closed door). */
  const flash = (seconds = 1.3) => { flashUntil = time + seconds; };
  /** The door glows red for a moment (someone who doesn't belong walked in). */
  const alarm = (seconds = 1.5) => { alarmUntil = time + seconds; };
  /** They walk in through the door and across the courtyard to the chapel. */
  async function enter(id) {
    const f = folk.get(id); if (!f) return; f.mode = "in"; const a = f.a;
    if (!wanted) flash(1.1);
    await a.goTo(0, 4, 22); if (disposed) return;
    await a.goTo(CHAPEL_DOOR.x - 4, CHAPEL_DOOR.z, 18); await a.goTo(CHAPEL_DOOR.x, CHAPEL_DOOR.z, 14);
    if (disposed) return; remove(a); folk.delete(id);
  }
  /** Come back later: they turn and walk back down the path. */
  async function sendOn(id) {
    const f = folk.get(id); if (!f) return; f.mode = "away";
    await f.a.goTo(LEAVE_X, f.a.g.position.z - 4, 18); if (disposed) return;       // step out to the right, then down the path past the line
    await f.a.goTo(LEAVE_X, SPAWN_Z, 18); if (disposed) return; remove(f.a); folk.delete(id);
  }
  const giveUp = sendOn;

  // ── each frame ──
  function update(dt) {
    time += dt;
    // everyone walks toward their goal, around each other (steer.js), and turns the way they're going
    for (const a of actors) { a.agent.x = a.g.position.x; a.agent.z = a.g.position.z; a.agent.fixed = !a.agent.goal; }
    const arrived = stepAgents(actors.map((a) => a.agent), dt);
    for (const a of actors) {
      const ag = a.agent;
      if (ag.goal || arrived.includes(ag)) { a.g.position.x = ag.x; a.g.position.z = ag.z; }
      if (Math.hypot(ag.vx ?? 0, ag.vz ?? 0) > 0.8) {
        const want = Math.atan2(ag.vx, ag.vz); let d = want - a.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.g.rotation.y += d * Math.min(1, dt * 14);
      }
      if (arrived.includes(ag) && a.nav) { const n = a.nav; a.nav = null; a.pose(n.end); n.done(); }
      const pm = a.poses[a.now]; if (pm) animate(pm, time);
      for (const c of a.g.children) if (c.userData.glow) { const k = 8 + 2 * Math.sin(time * 6); c.scale.set(k, k, 1); }
    }
    doorTarget = wanted || time < flashUntil ? 1 : 0;
    doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 7);
    for (const l of leaves) l.pivot.rotation.y = -l.s * doorOpen * 1.45;
    lanterns.forEach((l, i) => { const k = 1 + (draft ? 0.4 : 0.12) * Math.sin(time * (draft ? 22 : 9) + i * 2); l.halo.scale.setScalar((night ? 9 : 5) * k); });
    // the alarm: the door pulses red (a draft, or alarm())
    const alarmOn = draft || time < alarmUntil;
    alarmLevel += ((alarmOn ? 1 : 0) - alarmLevel) * Math.min(1, dt * 10);
    const pulse = 0.65 + 0.35 * Math.sin(time * 9);
    doorWood.color.copy(WOOD).lerp(ALARM_RED, alarmLevel * (0.55 + 0.45 * pulse));
    alarmGlow.material.opacity = alarmLevel * (0.5 + 0.35 * pulse);
    for (const l of lanterns) l.flame.material.color.set(alarmLevel > 0.5 ? "#ff5a4f" : "#ffd27a");
    R.render(scene, cam);
  }
  const screenOf = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam), rect = canvas.getBoundingClientRect(); return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height }; };
  /** Where a visitor's head is on screen (for the picture over it and its patience bar), or null. */
  const headOf = (id) => { const f = folk.get(id); if (!f) return null; const p = f.a.g.position; return screenOf(p.x, 10.5 * f.a.g.scale.y, p.z); };
  /** The draft: the lanterns flicker while the door has been open too long. */
  const setDraft = (on) => { draft = on; };
  return { update, resize, sync, enter, setDoor, flash, alarm, setDraft, sendOn, giveUp, dogChase, headOf, positions: () => actors.map((a) => ({ x: a.agent.x, z: a.agent.z, r: a.agent.r, moving: !!a.agent.goal })), screenOf, hasModels: () => Object.keys(models),
    dispose: () => { disposed = true; R.dispose(); R.forceContextLoss?.(); } };
}
