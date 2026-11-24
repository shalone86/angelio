// 3D pictures of his MagicaVoxel models for the Drawings page: a still picture for the checklist, and a big
// turning preview (drag to turn, the frames play). Uses three.js r128 (/vendor/three-r128.min.js, global THREE).
// Includes experimental Studio-only MATL rendering (Emit, Glass, Metal, Cloud) before wiring into any games.
import { toSceneWithMaterials } from "./voxmat.js";

const T = () => window.THREE;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let box = null;
const geometry = () => (box ??= new (T().BoxGeometry)(1, 1, 1));
let glowCanvas = null;
function getGlowCanvas() {
  if (!glowCanvas) {
    glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 64;
    const ctx = glowCanvas.getContext("2d");
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0.0, "rgba(255,255,255,0.95)");
    gr.addColorStop(0.38, "rgba(255,255,255,0.40)");
    gr.addColorStop(1.0, "rgba(255,255,255,0.00)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
  }
  return glowCanvas;
}

/** One frame as a Three.js Group separated by material kind (`diffuse`, `metal`, `glass`, `cloud`, `emit`). */
function frameMesh(vox, f, materials = null) {
  const Three = T();
  const group = new Three.Group();
  const disposables = [];
  group.userData.disposables = disposables;

  const cells = toSceneWithMaterials(vox, f, materials);
  const buckets = { diffuse: [], metal: [], glass: [], cloud: [], emit: [] };
  for (const cell of cells) {
    const k = cell[4]?.kind;
    (buckets[k && k in buckets ? k : "diffuse"]).push(cell);
  }

  const dummy = new Three.Object3D();
  const col = new Three.Color();
  const addBucket = (list, mat) => {
    if (!list.length) { mat.dispose?.(); return; }
    disposables.push(mat);
    const im = new Three.InstancedMesh(geometry(), mat, list.length);
    list.forEach(([x, y, z, hex], i) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, col.set(hex));
    });
    group.add(im);
  };

  if (buckets.diffuse.length) addBucket(buckets.diffuse, new Three.MeshLambertMaterial());

  if (buckets.metal.length) {
    const avgMetal = buckets.metal.reduce((s, c) => s + (c[4].metal || 0.8), 0) / buckets.metal.length;
    const avgRough = buckets.metal.reduce((s, c) => s + (c[4].rough ?? 0.2), 0) / buckets.metal.length;
    addBucket(buckets.metal, new Three.MeshStandardMaterial({
      metalness: clamp(0.55 + avgMetal * 0.4, 0.55, 0.95),
      roughness: clamp(0.14 + avgRough * 0.55, 0.14, 0.72),
    }));
  }

  if (buckets.glass.length) {
    const avgAlpha = buckets.glass.reduce((s, c) => s + (c[4].alpha ?? 0.7), 0) / buckets.glass.length;
    addBucket(buckets.glass, new Three.MeshPhongMaterial({
      transparent: true,
      opacity: clamp(1 - avgAlpha * 0.72, 0.24, 0.8),
      shininess: 110,
      specular: "#ffffff",
      depthWrite: false,
    }));
  }

  if (buckets.cloud.length) {
    const avgDensity = buckets.cloud.reduce((s, c) => s + (c[4].density ?? 0.45), 0) / buckets.cloud.length;
    addBucket(buckets.cloud, new Three.MeshLambertMaterial({
      transparent: true,
      opacity: clamp(0.26 + avgDensity * 0.48, 0.24, 0.76),
      depthWrite: false,
    }));
  }

  if (buckets.emit.length) {
    addBucket(buckets.emit, new Three.MeshBasicMaterial());
    const glowTex = new Three.CanvasTexture(getGlowCanvas());
    disposables.push(glowTex);

    const maxSprites = 24;
    const step = Math.max(1, Math.ceil(buckets.emit.length / maxSprites));
    for (let i = 0; i < buckets.emit.length; i += step) {
      const [x, y, z, hex, m] = buckets.emit[i];
      const sm = new Three.SpriteMaterial({
        map: glowTex,
        color: hex,
        blending: Three.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: clamp(0.45 + (m.emit ?? 0.8) * 0.35 + (m.flux ?? 0) * 0.08, 0.45, 0.95),
      });
      disposables.push(sm);
      const sp = new Three.Sprite(sm);
      const sz = 2.2 + (m.emit ?? 0.8) * 1.4 + (m.flux ?? 0) * 0.45;
      sp.scale.set(sz, sz, 1);
      sp.position.set(x, y, z);
      group.add(sp);
    }

    const cx = buckets.emit.reduce((s, c) => s + c[0], 0) / buckets.emit.length;
    const cy = buckets.emit.reduce((s, c) => s + c[1], 0) / buckets.emit.length;
    const cz = buckets.emit.reduce((s, c) => s + c[2], 0) / buckets.emit.length;
    const avgEmit = buckets.emit.reduce((s, c) => s + (c[4].emit ?? 0.8), 0) / buckets.emit.length;
    const avgFlux = buckets.emit.reduce((s, c) => s + (c[4].flux ?? 0), 0) / buckets.emit.length;
    const maxDim = Math.max(...(vox.frames[0]?.size ?? [8, 8, 8]));
    const pt = new Three.PointLight(
      buckets.emit[0][3],
      clamp(0.6 + avgEmit * 0.8 + avgFlux * 0.25, 0.6, 2.2),
      Math.max(10, maxDim * 2.5),
      1.6
    );
    pt.position.set(cx, cy, cz);
    group.add(pt);
  }

  return group;
}

function stage(vox, { dark = false } = {}) {
  const Three = T();
  const scene = new Three.Scene();
  if (dark) scene.background = new Three.Color("#12182b");
  scene.add(new Three.HemisphereLight(dark ? "#7b88c4" : "#ffffff", dark ? "#1b1d30" : "#5a5f80", dark ? 0.32 : 0.9));
  const sun = new Three.DirectionalLight(dark ? "#ffe6c0" : "#fff3e0", dark ? 0.22 : 0.75);
  sun.position.set(6, 12, 9);
  scene.add(sun);
  const rim = new Three.DirectionalLight("#cfe2ff", dark ? 0.16 : 0.42);
  rim.position.set(-8, 8, -9);
  scene.add(rim);
  const [sx, sy, sz] = vox.frames[0].size;
  const r = Math.max(sx, sy, sz);
  const cam = new Three.PerspectiveCamera(30, 1, 0.1, r * 20);
  return { scene, cam, r, height: sz };
}

const place = (cam, ang, r, height) => {
  const d = r * 4.2;
  cam.position.set(Math.sin(ang) * d, height * 0.8 + r * 0.6, Math.cos(ang) * d);
  cam.lookAt(0, height * 0.45, 0);
};

let still = null;
/** A small still picture (data URL), seen from a little to the right, like his 3/4 drawings. */
export function voxThumb(vox, px = 128, materials = null) {
  if (!T()) return null;
  still ??= new (T().WebGLRenderer)({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  still.setSize(px, px, false);
  const { scene, cam, r, height } = stage(vox);
  const mesh = frameMesh(vox, 0, materials);
  scene.add(mesh);
  place(cam, 0.5, r, height);
  still.render(scene, cam);
  scene.remove(mesh);
  mesh.userData.disposables?.forEach((d) => d.dispose?.());
  return still.domElement.toDataURL("image/png");
}

/** A turning preview in `el` (a sized box). Returns `{ setFps, stop }`. */
export function voxViewer(el, vox, { fps = 4, materials = null, dark = false } = {}) {
  const Three = T();
  if (!Three) { el.textContent = "The 3D preview couldn't start on this device."; return { setFps() {}, stop() {} }; }
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
  el.replaceChildren(canvas);
  const R = new Three.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const { scene, cam, r, height } = stage(vox, { dark });
  const floorGeo = new Three.CircleGeometry(r * 0.7, 40);
  const floorMat = new Three.MeshLambertMaterial({ color: dark ? "#2b314a" : "#9c927d" });
  const floor = new Three.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);
  const meshes = vox.frames.map((_, f) => {
    const m = frameMesh(vox, f, materials);
    m.visible = f === 0;
    scene.add(m);
    return m;
  });
  let clock = 0, ang = 0.5, drag = null, spin = !matchMedia("(prefers-reduced-motion: reduce)").matches, raf = 0, last = 0, alive = true;
  canvas.addEventListener("pointerdown", (e) => { drag = e.clientX; spin = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (drag != null) { ang += (e.clientX - drag) * 0.012; drag = e.clientX; } });
  canvas.addEventListener("pointerup", () => { drag = null; });
  const size = () => {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  };
  size();
  addEventListener("resize", size);
  const loop = (ts) => {
    if (!alive) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (spin) ang += dt * 0.5;
    clock += dt * fps;
    const f = Math.floor(clock) % meshes.length;
    meshes.forEach((m, i) => { m.visible = i === f; });
    place(cam, ang, r, height);
    R.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return {
    setFps(v) { fps = v; },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
      floorGeo.dispose();
      floorMat.dispose();
      meshes.forEach((m) => m.userData.disposables?.forEach((d) => d.dispose?.()));
      R.dispose();
    },
  };
}
