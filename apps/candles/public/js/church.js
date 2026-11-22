// The church on screen (three.js r128, global THREE from vendor/three-r128.min.js): it draws what game.js says.
//
// ART. His MagicaVoxel models come from angelio.org (/api/art, uploaded on the Studio's Drawings page) and are used
// as soon as they exist: the priest (priest-idle, priest-walk-fast, priest-mass-walk / priest-walk-slow), the
// people who come to pray (man-kneel, woman-kneel, child-kneel, grandparent-kneel) and the church pieces on the
// Candle Rack checklists. Until a piece is made, a plain STAND-IN of boxes takes its place (marked "stand-in"
// below). The stand-ins are not art: they only hold the place and are replaced, piece by piece, by his models.
// His marker colors (looks.js): the chasuble pink (#FF77A8) becomes the season's color (season.js); the hair, skin
// and eyes become each person's own, picked at random, so every round has its own people.
import { readVox, toScene } from "./vox.js";
import { blockedNeedy } from "./game.js";
import { randomLook, recolor } from "./looks.js";

const T = () => window.THREE;
const ART = /(^|\.)angelio\.org$/.test(location.hostname) ? "" : "https://angelio.org";

// Where things stand (1 unit = one voxel). The racks are low (a server shows above them from the chest up) and set
// apart, so a real aisle runs between them: everyone walks down the aisle, along the front lane, or behind the racks.
export const LAYOUT = {
  racks: [{ x: -13, z: -2 }, { x: 13, z: -2 }], rackW: 14,
  slotGap: 3.2, rowY: [1.8, 3.2], rowZ: [1.1, -1.1],
  lamp: { x: 5.5, y: 11, z: -10 },
  door: { x: -23, z: 6 },
  sacristy: { x: 16, z: -12.5 }, serverHome: { x: -16, z: -12.5 }, behindRacks: -6.6, frontLane: 6, aisle: { x: 0, z: 14 },
  kneelZ: 3.6, // where someone kneels in front of a rack
};
// Where everyone stands, per church: the game's defaults. He moves them on the Studio's Candle Rack page
// (angelio.org/studio/candles/), saved online; `layout` (from /api/candles/layout) is laid over these.
//   priestHome, serverHome: where they wait (and can be tapped); big: the big candle; lamp: the sanctuary lamp
//   end…: where everyone ends up at the start of Mass; priestStart (Byzantine): behind the royal doors
export const SPOTS = {
  roman: {
    priestHome: { x: 16, z: -12.5, turn: -0.5 }, serverHome: { x: -16, z: -12.5, turn: 0.4 },
    big: { x: -9.5, z: -13.2 }, lamp: { x: 5.5, y: 11, z: -10 },
    endPriest: { x: 0, z: -8.6, turn: 0 }, endCross: { x: -8.5, z: -9.2, turn: 0 },
    endCandleL: { x: -5, z: -9, turn: 0 }, endCandleR: { x: 5, z: -9, turn: 0 },
  },
  byzantine: {
    priestHome: { x: 18.5, z: -10, turn: -0.5 }, serverHome: { x: -18.5, z: -10, turn: 0.4 },
    big: { x: -6.2, z: -6.4 }, lamp: { x: 4.6, y: 9.6, z: -7.9 },
    priestStart: { x: 0, z: -10.4, turn: 0 }, endPriest: { x: 0, z: -8.4, turn: 0 },
    endCandleL: { x: -3.4, z: -8.7, turn: 0 }, endCandleR: { x: 3.4, z: -8.7, turn: 0 },
  },
};
/** The spots for a church with his saved changes laid over (only known spots, only numbers). */
export function spotsFor(rite, layout = {}) {
  const base = SPOTS[rite] ?? SPOTS.roman, mine = layout?.[rite] ?? {}, out = {};
  for (const [k, v] of Object.entries(base)) {
    out[k] = { ...v };
    for (const f of Object.keys(v)) if (Number.isFinite(mine[k]?.[f])) out[k][f] = mine[k][f];
  }
  return out;
}

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

/** Every model the game uses (his uploads on the Drawings page); whichever exist are loaded, the rest stand in. */
export const MODELS = ["priest-idle", "priest-walk-fast", "priest-mass-walk", "priest-walk-slow", "priest-mass-idle",
  "server-idle", "server-walk", "server-light", "server-cross-walk", "server-cross-idle", "server-candle-walk", "server-candle-idle",
  // the Byzantine church (east-…): whichever of these he has made are used, the rest stand in
  ...["priest-idle", "priest-walk", "priest-walk-fast", "priest-walk-slow", "priest-vested-idle", "priest-bless", "server-idle", "server-walk", "server-light",
    "server-cross-walk", "server-cross-idle", "server-candle-walk", "server-candle-idle", "server-ripidion-walk", "server-ripidion-idle"].map((n) => `east-${n}`),
  ...["man", "woman", "child", "grandparent"].flatMap((k) => [`${k}-kneel`, `${k}-idle`, `${k}-walk`])];

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

/** His saved placements (the Studio's Candle Rack page), or {} for the game's own. */
export async function loadLayout() {
  try { const r = await fetch(`${ART}/api/candles/layout`); return r.ok ? await r.json() : {}; } catch { return {}; }
}

/** The church, drawn into `canvas`. */
export function createChurch(canvas, { season, models = {}, rite = "roman", hex = season.hex, dark = false, taper = false, layout = {} }) {
  const THREE = T();
  const BYZ = rite === "byzantine";
  const SP = spotsFor(BYZ ? "byzantine" : "roman", layout);
  // the floor is at 0; the sanctuary step (x within 11, z behind -7.5) is 1 higher
  const groundY = (x, z) => (z < -7.5 && Math.abs(x) < 11 ? 1 : 0);
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

  // a soft warm glow (a sprite that always faces the camera), shared by every glowing tip
  let haloTex = null;
  function haloMat() {
    if (!haloTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,230,150,1)"); gr.addColorStop(0.35, "rgba(255,170,60,.55)"); gr.addColorStop(1, "rgba(255,140,40,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(c);
    }
    return new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  }

  // ── light ──
  // (at Pascha the church starts dark and brightens as the candles are lit)
  const hemi = new THREE.HemisphereLight("#8c86c8", "#2a1d18", 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffd9a8", 0.35); sun.position.set(-20, 30, 10); scene.add(sun);
  // the sanctuary lamp: over the altar in a Roman church; in a Byzantine church, the lampada before the icon of Christ
  const L = SP.lamp;
  const rackLights = LAYOUT.racks.map((r) => { const l = new THREE.PointLight("#ffb347", 0.6, 30, 1.6); l.position.set(r.x, 7, r.z + 3); scene.add(l); return l; });
  const lampLight = new THREE.PointLight("#ff3b30", 0.8, 18, 1.8); lampLight.position.set(L.x, L.y, L.z); scene.add(lampLight);

  // ── the room (stand-in) ──
  for (let x = -24; x < 24; x += 4) for (let z = -16; z < 16; z += 4) block(4, 0.5, 4, x + 2, -0.5, z + 2, mat(((x + z) / 4) % 2 ? "#cfc4b0" : "#b7aa94"));
  block(48, 24, 1, 0, 0, -16.5, mat("#d9cfbd"));                 // back wall
  block(1, 24, 32, -24.5, 0, 0, mat("#d3c8b5")); block(1, 24, 32, 24.5, 0, 0, mat("#d3c8b5"));
  const windowGlass = ["#3f7fd1", "#d13f4f", "#e8c24a", "#4fa36b"];
  for (const wx of [-17, -6, 6, 17]) for (let i = 0; i < 6; i++) block(1.2, 1.6, 0.3, wx - 1.8 + (i % 3) * 1.8, 11 + Math.floor(i / 3) * 2, -15.9, glow(windowGlass[(i + wx) & 3]));
  block(22, 1, 9, 0, 0, -12, mat(BYZ ? "#9c8a6c" : "#a99a82"));   // sanctuary step
  const altar = block(11, 5, 4, 0, 1, -12.5, mat("#efe7d6"));     // altar (stand-in)
  const frontal = block(8, 3, 0.3, 0, 2, -10.4, mat(hex));  // its front cloth: the season's color
  block(3, 3, 2, 0, 6, -13.2, mat("#d6a93a"));                   // tabernacle (stand-in)
  const veil = block(3.2, 2.2, 0.3, 0, 6.3, -12.15, mat(hex));
  block(0.4, 5, 0.4, 0, 9, -13.2, mat("#d6a93a")); block(2, 0.4, 0.4, 0, 12.3, -13.2, mat("#d6a93a")); // cross (stand-in)

  // the iconostasis (Byzantine, stand-in): the icon screen across the sanctuary, with the royal doors in the middle
  // (they open when the Liturgy begins) and a deacon door on each side
  const royal = [];
  if (BYZ) {
    const Z = -9.2, gold = mat("#c99a3c"), wood = mat("#6b4428");
    block(22, 1, 0.8, 0, 1, Z, gold); block(22, 1.2, 0.8, 0, 12, Z, gold);           // sill and top beam
    block(22, 1.8, 0.6, 0, 13.2, Z - 0.1, mat("#8a2c2c"));                               // the row of feasts (red band)
    for (const x of [-10.6, -5.3, -2.3, 2.3, 5.3, 10.6]) block(0.8, 11, 0.9, x, 2, Z, gold); // posts
    // icons: Christ (right of the royal doors), the Theotokos (left), Saint John the Baptist, the church's saint; deacon doors
    const icon = (x, robe, mantle) => {
      block(3.6, 6, 0.4, x, 4, Z + 0.3, mat("#d9b45a"));                 // gold ground
      block(2.2, 3.6, 0.3, x, 4.4, Z + 0.55, mat(robe));                 // the figure
      block(1.4, 1.6, 0.3, x, 6.2, Z + 0.6, mat(mantle));
      block(1.0, 1.0, 0.3, x, 7.8, Z + 0.62, mat("#e9c4a0"));            // face
      block(1.8, 1.8, 0.2, x, 7.4, Z + 0.5, mat("#f2d27a"));             // halo
    };
    icon(-3.8, "#2e4f9a", "#8a1f2f"); icon(3.8, "#8a2c2c", "#2e4f9a"); icon(-8.6, "#5e7a3a", "#7a5a2a"); icon(8.6, "#7a5a2a", "#5e7a3a");
    for (const x of [-8.6, 8.6]) { const d = block(3.4, 7, 0.3, x, 2, Z + 0.25, wood); d.position.z = Z + 0.2; }
    for (const x of [-8.6, 8.6]) { block(1.6, 3, 0.3, x, 4.4, Z + 0.45, mat("#e8e2d0")); block(1.2, 1.2, 0.3, x, 7.6, Z + 0.5, mat("#f2d27a")); } // angels on the deacon doors
    // the royal doors: two gold halves on hinges
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(side * 2.3, 1, Z + 0.1); scene.add(pivot);
      block(2.3, 7, 0.3, -side * 1.15, 1, 0, gold, pivot);
      block(1.5, 2.2, 0.3, -side * 1.15, 4.6, 0.1, mat("#2e4f9a"), pivot);   // the Annunciation, half on each door
      royal.push({ pivot, side });
    }
  }

  // the sanctuary lamp (stand-in): red glass on a chain; its flame dims with the oil
  block(0.2, 24 - L.y - 2, 0.2, L.x, L.y + 2, L.z, mat("#8a7a52"));
  if (BYZ) block(1, 0.3, 1, L.x, L.y - 0.3, L.z, mat("#c99a3c"));
  const lampGlass = block(1.6, 2.2, 1.6, L.x, L.y, L.z, new THREE.MeshLambertMaterial({ color: "#c8262f", transparent: true, opacity: 0.75, emissive: "#5a0a0a" }));
  const lampFlame = block(0.5, 0.8, 0.5, L.x, L.y + 0.7, L.z, glow("#ffcc66"));
  const lampHit = block(5, 6, 5, L.x, L.y - 1.5, L.z, new THREE.MeshBasicMaterial({ visible: false }));
  lampHit.userData = { kind: "lamp" };
  // "renew me": a red-gold glow around the lamp when its oil is low or it went out
  const lampHalo = new THREE.Sprite(haloMat()); lampHalo.position.set(L.x, L.y + 0.4, L.z + 0.6); lampHalo.scale.set(6, 6, 1); lampHalo.material.color.set("#ff6a4a"); scene.add(lampHalo);
  const lampRing = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: "#ffd75e", transparent: true, opacity: 0, depthWrite: false }));
  lampRing.scale.set(2.6, 3.2, 2.6); lampRing.position.set(L.x, L.y + 1.1, L.z); scene.add(lampRing);

  // the door the drafts come through (stand-in), hinged at its far edge
  const D = LAYOUT.door, doorPivot = new THREE.Group(); doorPivot.position.set(D.x + 0.6, 0, D.z - 3); scene.add(doorPivot);
  block(0.6, 10, 6, 0, 0, 3, mat("#6b4428"), doorPivot);

  // ── the racks and candles (stand-in) ──
  const hits = [lampHit], candles = [];
  const GLASS_HEX = ["#e0453f", "#3d7fe0", "#f2f2f2"]; // red, blue and clear glass, just for looks
  // Roman: votive candles in colored glass on wooden racks. Byzantine: thin beeswax tapers standing in sand trays.
  LAYOUT.racks.forEach((r, ri) => {
    block(LAYOUT.rackW, LAYOUT.rowY[0], 2.4, r.x, 0, r.z + LAYOUT.rowZ[0], mat(BYZ ? "#8a6a2e" : "#5a3a24"));
    block(LAYOUT.rackW, LAYOUT.rowY[1], 2.4, r.x, 0, r.z + LAYOUT.rowZ[1], mat(BYZ ? "#7a5c26" : "#4d311f"));
    if (BYZ) for (let row = 0; row < 2; row++) block(LAYOUT.rackW - 0.4, 0.25, 2.1, r.x, LAYOUT.rowY[row], r.z + LAYOUT.rowZ[row], mat("#d9c79a")); // sand
    for (let row = 0; row < 2; row++) for (let s = 0; s < 4; s++) {
      const id = ri * 8 + row * 4 + s;
      const x = r.x + (s - 1.5) * LAYOUT.slotGap, y = LAYOUT.rowY[row], z = r.z + LAYOUT.rowZ[row];
      const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
      const glass = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: GLASS_HEX[(id + row) % 3], transparent: true, opacity: 0.55 }));
      glass.scale.set(1.9, 2.2, 1.9); glass.position.y = 1.1; g.add(glass); glass.visible = !BYZ;
      const wax = new THREE.Mesh(box, mat(BYZ ? "#e6c065" : "#f6f0e2")); wax.scale.set(BYZ ? 0.45 : 1.2, 1.6, BYZ ? 0.45 : 1.2); wax.position.y = 0.8; g.add(wax);
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

  // the big candle (stages with a taper): the player lights the taper again here. Roman: a tall candle by the altar;
  // Byzantine: a big candle in a stand before the icons (at Pascha, the Paschal candle)
  const BIG = SP.big;
  const bigCandle = new THREE.Group(); bigCandle.position.set(BIG.x, groundY(BIG.x, BIG.z), BIG.z); scene.add(bigCandle);
  block(1.6, 0.6, 1.6, 0, 0, 0, mat("#c99a3c"), bigCandle); block(0.5, 3.4, 0.5, 0, 0.6, 0, mat("#c99a3c"), bigCandle);
  block(1.4, 0.4, 1.4, 0, 4, 0, mat("#c99a3c"), bigCandle);
  block(0.9, 4.2, 0.9, 0, 4.4, 0, mat("#fbf6ea"), bigCandle);
  block(0.5, 0.15, 0.95, 0, 6.6, 0, mat("#c8262f"), bigCandle); block(0.15, 0.9, 0.95, 0, 6.25, 0, mat("#c8262f"), bigCandle); // a red cross
  const bigFlame = block(0.5, 1.1, 0.5, 0, 8.6, 0, glow("#ffb02e"), bigCandle);
  const bigLight = new THREE.PointLight("#ffb347", 0.7, 14, 1.8); bigLight.position.set(0, 9.5, 1); bigCandle.add(bigLight);
  const bigRing = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: "#fff1a8", transparent: true, opacity: 0, depthWrite: false }));
  bigRing.scale.set(2.2, 6, 2.2); bigRing.position.y = 6.8; bigCandle.add(bigRing);
  const bigHit = block(4, 11, 4, 0, 0, 0, new THREE.MeshBasicMaterial({ visible: false }), bigCandle); bigHit.userData = { kind: "big" };
  hits.push(bigHit);
  bigCandle.visible = taper;

  // ── his voxel models ──
  const meshFor = (name, look = null) => {
    const m = models[name];
    if (!m) return null;
    const g = new THREE.Group();
    // stand each model on its own middle (his models sit a voxel off-center; turning around would swing him sideways)
    const all = m.vox.frames.flatMap((_, f) => toScene(m.vox, f));
    const mid = (k) => (Math.min(...all.map((c) => c[k])) + Math.max(...all.map((c) => c[k]))) / 2;
    const cx = all.length ? mid(0) : 0, cz = all.length ? mid(2) : 0;
    // a lighter or a candle in his hands: its tip glows (the top of whatever isn't in his plain idle pose)
    const base = /-(light|candle)/.test(name) && models[name.replace(/-(light|candle)(-walk|-idle)?$/, "-idle")];
    const plain = base ? new Set(base.vox.frames.flatMap((_, f) => toScene(base.vox, f).map((c) => c[3]))) : null;
    g.userData.frames = m.vox.frames.map((_, f) => {
      const cells = toScene(m.vox, f).map(([x, y, z, c]) => [x - cx, y, z - cz, c]);
      const held = plain ? cells.filter((c) => !plain.has(c[3])) : [];
      const top = held.length ? Math.max(...held.map((c) => c[1])) : Infinity;
      const tips = held.filter((c) => c[1] === top), body = cells.filter((c) => !tips.includes(c));
      const fr = new THREE.Group();
      const im = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial(), body.length);
      const o = new THREE.Object3D(), col = new THREE.Color();
      body.forEach(([x, y, z, c], i) => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(isPink(c) ? hex : recolor(c, look, hex))); });
      fr.add(im);
      for (const [x, y, z, c] of tips) {
        const t = new THREE.Mesh(box, glow("#" + new THREE.Color(c).lerp(new THREE.Color("#ffc94a"), 0.75).getHexString())); t.position.set(x, y, z); fr.add(t);
        const halo = new THREE.Sprite(haloMat()); halo.position.set(x, y + 0.4, z); halo.scale.set(2.6, 2.6, 1); halo.userData.halo = true; fr.add(halo);
      }
      fr.visible = f === 0; g.add(fr); return fr;
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
  function actor(poses, standInHex, home, look = randomLook()) {
    const a = { g: new THREE.Group(), poses: {}, walk: null, home, look };
    for (const [k, names] of Object.entries(poses)) { const m = [].concat(names).map((n) => meshFor(n, look)).find(Boolean); if (m) { a.poses[k] = m; m.visible = false; a.g.add(m); } }
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
  // Byzantine: his east-priest and east-server models (until a pose is made, the nearest one he has stands in); they
  // wait at the sides, in front of the iconostasis
  const E = (n) => (BYZ ? [`east-${n}`] : [n]);
  const PH = SP.priestHome, SH = SP.serverHome;
  const priest = actor(BYZ
    ? { idle: "east-priest-idle", walk: ["east-priest-walk-fast", "east-priest-walk"], slow: ["east-priest-walk-slow", "east-priest-walk"], vested: ["east-priest-vested-idle", "east-priest-bless", "east-priest-idle"] }
    : { idle: "priest-idle", walk: "priest-walk-fast", slow: ["priest-mass-walk", "priest-walk-slow"], vested: ["priest-mass-idle", "priest-idle"] },
    "#1d1b22", { x: PH.x, z: PH.z, turn: PH.turn });
  // the priest and the server can be tapped to help: a big invisible tap area on each, and a gold ring at their feet
  // that pulses when someone is in the way and they're free to go
  const helperRing = (a, who) => {
    const hit = block(7.5, 12, 7.5, 0, 0, 0, new THREE.MeshBasicMaterial({ visible: false }), a.g); hit.userData = { kind: "helper", who }; hits.push(hit);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 24), new THREE.MeshBasicMaterial({ color: "#ffd75e", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; a.g.add(ring); a.ring = ring;
  };
  const CANDLE = BYZ ? ["east-server-candle-walk", "east-server-ripidion-walk"] : ["server-candle-walk"];
  const CANDLE_IDLE = BYZ ? ["east-server-candle-idle", "east-server-ripidion-idle"] : ["server-candle-idle"];
  const server = actor({ idle: E("server-idle"), walk: E("server-walk"), light: E("server-light"), cross: E("server-cross-walk"), crossIdle: E("server-cross-idle"),
    candle: CANDLE, candleIdle: CANDLE_IDLE }, "#b02a2a", { x: SH.x, z: SH.z, turn: SH.turn });
  // a second server only for the procession (two candle bearers walk beside each other), hidden until then
  helperRing(priest, "priest"); helperRing(server, "server");
  const server2 = actor({ idle: CANDLE_IDLE, candle: CANDLE, candleIdle: CANDLE_IDLE }, "#b02a2a", { x: 0, z: 30, turn: 0 });
  server2.g.visible = false;
  // a third server (Roman: the second candle bearer), hidden until the procession
  const server3 = actor({ idle: CANDLE_IDLE, candle: CANDLE, candleIdle: CANDLE_IDLE }, "#b02a2a", { x: 0, z: 30, turn: 0 });
  server3.g.visible = false;
  // the Studio's marker: a ring under the spot being moved
  const marker = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 32), new THREE.MeshBasicMaterial({ color: "#3ad1ff", transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const winds = [];

  // people who come to pray: they walk up from the front, kneel in front of a rack (in the way of the candles behind
  // them), and later get up and walk off to a pew
  const people = new Map();
  const PERSON = ["man", "woman", "child", "grandparent"];
  const BODY = ["#4a6fa5", "#a5574a", "#5f8f4e", "#8a6aa8"];
  const spotOf = (p) => { const r = LAYOUT.racks[p.rack]; return { x: r.x + (p.slot - 1) * LAYOUT.slotGap, z: r.z + LAYOUT.kneelZ + 2 }; };
  function personArrive(p, walkIn = 2) {
    const k = p.id % 4, kind = PERSON[k];
    const a = actor({ idle: `${kind}-idle`, walk: `${kind}-walk`, kneel: `${kind}-kneel` }, BODY[k], { x: 0, z: 20, turn: Math.PI }, randomLook(Math.random, { older: kind === "grandparent" }));
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
  const KEEP = [[-20, 0, 2.5], [20, 0, 2.5], [-20, 9, -3], [20, 9, -3], [0, 13, -13], [L.x, L.y + 2, L.z], [-20, 0, 7], [20, 0, 7], [0, 14, -16]];
  let pad = { top: 70, bottom: 90 };
  function resize(newPad) {
    if (newPad) pad = newPad;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    R.setSize(w, h, false); cam.aspect = w / h;
    cam.clearViewOffset(); // measure without the last fit's shift (it made big screens zoom in too far)
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
  let doorOpen = 0, doorTarget = 0, doorsOpen = false;
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
      const wax = c.lit ? Math.max(0.15, c.life) : 0.5; // tapers are tall and thin, votives short
      v.wax.scale.y = BYZ ? 0.6 + 2.2 * wax : 0.4 + 1.2 * wax; v.wax.position.y = v.wax.scale.y / 2;
      v.flame.position.y = v.wax.scale.y + 0.6; v.core.position.y = v.wax.scale.y + 0.45;
    });
    LAYOUT.racks.forEach((r, ri) => { const n = g.candles.filter((c) => c.rack === ri && c.lit).length; rackLights[ri].intensity = 0.15 + n * 0.12; });
    // at Pascha the church is dark until the candles are lit
    if (dark) { const k = g.candles.filter((c) => c.active && c.lit).length / 16; hemi.intensity = 0.12 + 0.45 * k; sun.intensity = 0.05 + 0.3 * k; }
    // the big candle glows "tap me" when the taper is out or nearly
    if (taper) {
      const want = !g.over && g.taper <= 1;
      bigRing.visible = want; bigRing.material.opacity = want ? (g.taper ? 0.22 : 0.3 + 0.25 * Math.abs(Math.sin(time * 6))) : 0;
      const bf = 0.85 + 0.15 * Math.sin(time * 8); bigFlame.scale.set(0.5 * bf, 1.1 * bf, 0.5 * bf);
    }
    for (const d of royal) { d.open = d.open ?? 0; d.open += ((doorsOpen ? 1 : 0) - d.open) * Math.min(1, dt * 2.5); d.pivot.rotation.y = d.side * d.open * 1.6; }
    lampFlame.visible = !g.lampOut;
    const lf = g.lampOut ? 0 : 0.4 + 0.6 * g.lamp;
    lampFlame.scale.set(0.5 * lf, 0.8 * lf, 0.5 * lf);
    lampLight.intensity = g.lampOut ? 0 : 0.2 + g.lamp * 0.9 + (g.lamp < 0.3 ? 0.3 * Math.sin(time * 14) : 0);
    lampGlass.material.emissive.set(g.lampOut ? "#100202" : "#5a0a0a");
    const renew = !g.over && (g.lampOut || g.lamp < 0.3), pulse = Math.abs(Math.sin(time * 5));
    lampHalo.visible = lampRing.visible = renew;
    if (renew) { lampHalo.material.opacity = 0.45 + 0.45 * pulse; const k = 5 + 2 * pulse; lampHalo.scale.set(k, k, 1); lampRing.material.opacity = 0.2 + 0.25 * pulse; }
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
      if (m?.visible) m.traverse((o) => { if (o.userData.halo) { const k = 2.4 + 0.5 * Math.sin(time * 11 + o.id); o.scale.set(k, k, 1); } });
    }
    // wind streaks fly across, fading in and out
    for (const w of [...winds]) {
      w.delay -= dt; if (w.delay > 0) continue;
      w.life += dt; w.m.position.x += w.speed * dt;
      w.m.material.opacity = 0.75 * Math.sin(Math.min(1, w.life / 0.8) * Math.PI);
      if (w.life >= 0.8) { scene.remove(w.m); w.m.material.dispose(); winds.splice(winds.indexOf(w), 1); }
    }
    // the helpers' rings: gold and pulsing while someone is in the way and they're free
    const waiting = !g.over && g.people.some((p) => g.t >= p.at && blockedNeedy(g, p.id).length);
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
    // the priest and the server win whenever they're standing in their spot (their zone), even over a candle in front
    const home = all.find((u) => u.kind === "helper" && atHome(helpers[u.who]));
    return home ?? (needs && all.find((u) => u.kind === "candle" && needs(u.id))) ?? all.find((u) => u.kind === "helper") ?? all[0] ?? null;
  }
  /** Where a spot in the church is on the screen (for the prayer bubbles). */
  function screenOf(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(cam), rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }
  const personHead = (id) => { const p = people.get(id); return p ? screenOf(p.a.g.position.x, 7, p.a.g.position.z) : null; };
  const helpers = { priest, server };
  const atHome = (a) => a && !a.walk && Math.hypot(a.g.position.x - a.home.x, a.g.position.z - a.home.z) < 1;

  return {
    update, pick, resize, screenOf, personHead, personArrive, personLeave,
    candleSpot: (id) => { const v = candles[id].g.position; return { x: v.x, z: v.z }; },
    /** The server walks to a candle, lights it (his lighting pose), and goes back. `light` is called at the moment it's lit. */
    /** The priest or the server walks round behind the rack to a candle, lights it (his lighting pose), and goes back.
     * `light` is called at the moment it's lit. */
    helpCandle: async (who, id, light) => {
      const a = helpers[who], v = candles[id].g.position;
      if (!a || a.busy) return false;
      a.busy = true;
      // from behind the rack, so he never stands between the player and the candles
      await a.go(v.x, LAYOUT.behindRacks, "walk", 12);
      a.g.rotation.y = 0; a.pose("light");
      const frames = a.poses.light?.userData.frames?.length || 4, fps = a.poses.light?.userData.fps ?? 4;
      await new Promise((r) => setTimeout(r, Math.min(1600, (frames / fps) * 1000)));
      light();
      a.busy = false;
      await a.goHome();
      return true;
    },
    helperBusy: (who) => !!helpers[who]?.busy,
    /** He hurries round behind the rack (never through it, never shooing anyone), to the spot behind the person
     * praying, lights the candles there (`light` is called then), and goes back. */
    helpLight: async (who, personId, light) => {
      const p = people.get(personId), a = helpers[who];
      if (!p || !a || a.busy) return false;
      a.busy = true;
      await a.go(p.a.g.position.x, LAYOUT.behindRacks, "walk", 14);
      a.g.rotation.y = 0; a.pose("light");
      await new Promise((r) => setTimeout(r, 900));
      light();
      await new Promise((r) => setTimeout(r, 500));
      a.busy = false;
      a.goHome();
      return true;
    },
    /** The entrance: Roman, the procession up the aisle (the cross, two candles, the priest in his vestments).
     * Byzantine, the royal doors open, the servers come out with candles and the priest stands in the doors.
     * Everyone ends on his spots (SPOTS: end…). */
    procession: async () => {
      const A = LAYOUT.aisle, E = SP;
      const settle = (a, spot, pose) => () => { a.pose(pose); a.g.rotation.y = spot.turn ?? 0; };
      for (const a of [server, server2, server3, priest]) { a.walk = null; }
      server2.g.visible = true; server.busy = priest.busy = true;
      if (BYZ) {
        doorsOpen = true;
        server.place(-8.6, -10.5, 0, "candle"); server2.place(8.6, -10.5, 0, "candle"); priest.place(E.priestStart.x, E.priestStart.z, E.priestStart.turn, "slow");
        await new Promise((r) => setTimeout(r, 700));
        await Promise.all([
          server.walkTo(-8.6, E.endCandleL.z, "candle", 3).then(() => server.walkTo(E.endCandleL.x, E.endCandleL.z, "candle", 3)).then(settle(server, E.endCandleL, "candleIdle")),
          server2.walkTo(8.6, E.endCandleR.z, "candle", 3).then(() => server2.walkTo(E.endCandleR.x, E.endCandleR.z, "candle", 3)).then(settle(server2, E.endCandleR, "candleIdle")),
          new Promise((r) => setTimeout(r, 1200)).then(() => priest.walkTo(E.endPriest.x, E.endPriest.z, "slow", 2.4)).then(settle(priest, E.endPriest, "vested")),
        ]);
        return;
      }
      server3.g.visible = true;
      server.place(A.x, A.z, Math.PI, "cross");
      server2.place(A.x - 3, A.z + 5, Math.PI, "candle");
      server3.place(A.x + 3, A.z + 5, Math.PI, "candle");
      priest.place(A.x, A.z + 12, Math.PI, "slow");
      await Promise.all([
        server.walkTo(0, -8, "cross", 3.4).then(() => server.walkTo(E.endCross.x, E.endCross.z, "cross", 3.4)).then(settle(server, E.endCross, "crossIdle")),
        server2.walkTo(-3, -8, "candle", 3.2).then(() => server2.walkTo(E.endCandleL.x, E.endCandleL.z, "candle", 3.2)).then(settle(server2, E.endCandleL, "candleIdle")),
        server3.walkTo(3, -8, "candle", 3.2).then(() => server3.walkTo(E.endCandleR.x, E.endCandleR.z, "candle", 3.2)).then(settle(server3, E.endCandleR, "candleIdle")),
        priest.walkTo(E.endPriest.x, E.endPriest.z, "slow", 3.2).then(settle(priest, E.endPriest, "vested")),
      ]);
    },
    // ── for the Studio's placement page ──
    /** Everyone where they stand before Mass, or (end) where they stand at the start of Mass, at once. */
    studioView: (end) => {
      for (const a of [server, server2, server3, priest]) a.walk = null;
      doorsOpen = !!end && BYZ;
      if (!end) { server2.g.visible = server3.g.visible = false; priest.place(PH.x, PH.z, PH.turn); server.place(SH.x, SH.z, SH.turn); return; }
      const E = SP, at = (a, k, pose) => a.place(E[k].x, E[k].z, E[k].turn ?? 0, pose);
      server2.g.visible = true; server3.g.visible = !BYZ;
      at(priest, "endPriest", "vested");
      if (BYZ) { at(server, "endCandleL", "candleIdle"); at(server2, "endCandleR", "candleIdle"); }
      else { at(server, "endCross", "crossIdle"); at(server2, "endCandleL", "candleIdle"); at(server3, "endCandleR", "candleIdle"); }
    },
    /** A ring on the floor under the spot being moved (null hides it). */
    mark: (spot) => {
      marker.visible = !!spot;
      if (spot) marker.position.set(spot.x, (spot.y ?? groundY(spot.x, spot.z)) + 0.2, spot.z);
    },
    /** People kneeling at two spots, at once, to see how they look in front of the racks. */
    studioPeople: (on) => {
      for (const id of [...people.keys()]) { const p = people.get(id); scene.remove(p.a.g); actors.splice(actors.indexOf(p.a), 1); people.delete(id); }
      if (!on) return;
      for (const p of [{ id: 1, rack: 0, slot: 0 }, { id: 2, rack: 1, slot: 2 }]) { personArrive(p, 0.01); const a = people.get(p.id).a; const at = spotOf(p); a.place(at.x, at.z, Math.PI, "kneel"); }
    },
    /** Wind: streaks blowing across one row of a rack (the draft from the door). */
    gust: (rack, row) => {
      const r = LAYOUT.racks[rack], y = LAYOUT.rowY[row] + 2, z = r.z + LAYOUT.rowZ[row];
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: "#eef6ff", transparent: true, opacity: 0, depthWrite: false }));
        m.scale.set(3 + Math.random() * 3, 0.14, 0.14);
        m.position.set(r.x - 11 - Math.random() * 6, y + (Math.random() - 0.5) * 2.4, z + (Math.random() - 0.5) * 2.5);
        scene.add(m); winds.push({ m, life: 0, speed: 26 + Math.random() * 12, delay: i * 0.05 });
      }
    },
    door: (open) => { doorTarget = open ? 1 : 0; },
    hasModels: () => Object.keys(models),
    bigSpot: () => ({ x: BIG.x, y: BYZ ? 7 : 8, z: BIG.z }),
    dispose: () => { R.dispose(); R.forceContextLoss?.(); },
  };
}
