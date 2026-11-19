// 3D pictures of her MagicaVoxel models for the Drawings page: a still picture for the checklist, and a big
// turning preview (drag to turn, the frames play). Uses three.js r128 (/vendor/three-r128.min.js, global THREE).
import { toScene } from "/js/vox.js";

const T = () => window.THREE;
let box = null;
const geometry = () => (box ??= new (T().BoxGeometry)(1, 1, 1));

/** One frame as an instanced mesh (one draw for the whole model). */
function frameMesh(vox, f) {
  const cells = toScene(vox, f);
  const m = new (T().InstancedMesh)(geometry(), new (T().MeshLambertMaterial)(), cells.length);
  const o = new (T().Object3D)(), col = new (T().Color)();
  cells.forEach(([x, y, z, c], i) => { o.position.set(x, y, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(c)); });
  return m;
}
function stage(vox) {
  const scene = new (T().Scene)();
  scene.add(new (T().HemisphereLight)("#ffffff", "#5a5f80", 0.9));
  const sun = new (T().DirectionalLight)("#fff3e0", 0.7); sun.position.set(6, 12, 9); scene.add(sun);
  const [sx, sy, sz] = vox.frames[0].size;
  const r = Math.max(sx, sy, sz);
  const cam = new (T().PerspectiveCamera)(30, 1, 0.1, r * 20);
  return { scene, cam, r, height: sz };
}
const place = (cam, ang, r, height) => { const d = r * 4.2; cam.position.set(Math.sin(ang) * d, height * 0.8 + r * 0.6, Math.cos(ang) * d); cam.lookAt(0, height * 0.45, 0); };

let still = null;
/** A small still picture (data URL), seen from a little to the right, like her 3/4 drawings. */
export function voxThumb(vox, px = 128) {
  if (!T()) return null;
  still ??= new (T().WebGLRenderer)({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  still.setSize(px, px, false);
  const { scene, cam, r, height } = stage(vox);
  scene.add(frameMesh(vox, 0));
  place(cam, 0.5, r, height);
  still.render(scene, cam);
  return still.domElement.toDataURL("image/png");
}

/** A turning preview in `el` (a sized box). Returns {stop}. */
export function voxViewer(el, vox, { fps = 4 } = {}) {
  if (!T()) { el.textContent = "The 3D preview couldn't start on this device."; return { stop() {} }; }
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
  el.replaceChildren(canvas);
  const R = new (T().WebGLRenderer)({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const { scene, cam, r, height } = stage(vox);
  const floor = new (T().Mesh)(new (T().CircleGeometry)(r * 0.7, 40), new (T().MeshLambertMaterial)({ color: "#9c927d" }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.01; scene.add(floor);
  const meshes = vox.frames.map((_, f) => { const m = frameMesh(vox, f); m.visible = f === 0; scene.add(m); return m; });
  let clock = 0, ang = 0.5, drag = null, spin = !matchMedia("(prefers-reduced-motion: reduce)").matches, raf = 0, last = 0, alive = true;
  canvas.addEventListener("pointerdown", (e) => { drag = e.clientX; spin = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (drag != null) { ang += (e.clientX - drag) * 0.012; drag = e.clientX; } });
  canvas.addEventListener("pointerup", () => { drag = null; });
  const size = () => { const w = el.clientWidth, h = el.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  size(); addEventListener("resize", size);
  const loop = (ts) => {
    if (!alive) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (spin) ang += dt * 0.5;
    // (frames advance by time at the chosen speed)
    clock += dt * fps;
    const f = Math.floor(clock) % meshes.length;
    meshes.forEach((m, i) => { m.visible = i === f; });
    place(cam, ang, r, height);
    R.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { setFps(v) { fps = v; }, stop() { alive = false; cancelAnimationFrame(raf); removeEventListener("resize", size); R.dispose(); } };
}
