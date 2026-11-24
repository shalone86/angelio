// Experimental MagicaVoxel material (MATL chunk) reader for the Studio Drawings preview only.
// Kept isolated from hub/public/js/vox.js and games while Shalone experiments with Emit, Glass, Metal & Cloud.

const clamp = (v, lo, hi, fallback = lo) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

/**
 * Parse MagicaVoxel MATL chunks from a `.vox` ArrayBuffer or Uint8Array.
 * Returns a sparse map `{ [paletteIndex]: { kind, type, rough, metal, emit, flux, alpha, density } }`
 * containing only non-default materials (`emit`, `glass`, `metal`, `cloud`).
 */
export function readVoxMaterials(input) {
  if (!input) return {};
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (u8.length < 20) return {};
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const id = (o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
  if (id(0) !== "VOX " || id(8) !== "MAIN") return {};

  const str = (o, limit) => {
    if (o + 4 > limit) return null;
    const n = dv.getUint32(o, true);
    if (o + 4 + n > limit) return null;
    let t = "";
    for (let i = 0; i < n; i++) t += String.fromCharCode(u8[o + 4 + i]);
    return [t, o + 4 + n];
  };
  const dict = (o, limit) => {
    if (o + 4 > limit) return [{}, o];
    const count = dv.getUint32(o, true);
    o += 4;
    const d = {};
    for (let i = 0; i < count; i++) {
      const k = str(o, limit);
      if (!k) break;
      const v = str(k[1], limit);
      if (!v) break;
      d[k[0]] = v[0];
      o = v[1];
    }
    return [d, o];
  };

  const out = {};
  let o = 20 + dv.getUint32(12, true);
  const end = Math.min(u8.length, o + dv.getUint32(16, true));
  while (o + 12 <= end) {
    const cid = id(o), n = dv.getUint32(o + 4, true), kids = dv.getUint32(o + 8, true), at = o + 12;
    if (at + n > u8.length) break;
    if (cid === "MATL" && n >= 8) {
      const matId = dv.getInt32(at, true);
      if (matId >= 1 && matId <= 255) {
        const [d] = dict(at + 4, at + n);
        const type = String(d._type ?? "_diffuse").replace(/^_/, "").toLowerCase();
        const rough = clamp(Number(d._rough ?? 0.1), 0, 1, 0.1);
        const metal = clamp(Number(type === "metal" ? (d._metal ?? d._weight ?? 0.8) : (d._metal ?? 0)), 0, 1, 0);
        const emit = clamp(Number(type === "emit" ? (d._emit ?? d._weight ?? 0.8) : (d._emit ?? 0)), 0, 1, 0);
        const flux = clamp(Number(d._flux ?? 0), 0, 4, 0);
        const alpha = clamp(Number(type === "glass" ? (d._alpha ?? d._weight ?? 0.7) : (d._alpha ?? 0)), 0, 1, 0);
        const density = clamp(Number(type === "media" ? (d._d ?? d._weight ?? 0.45) : 0), 0, 1, 0);

        let kind = "diffuse";
        if (type === "emit" || emit > 0.05) kind = "emit";
        else if (type === "media") kind = "cloud";
        else if (type === "glass" || alpha > 0.05) kind = "glass";
        else if (type === "metal" || metal > 0.05) kind = "metal";

        if (kind !== "diffuse") {
          out[matId] = { kind, type, rough, metal, emit, flux, alpha, density };
        }
      }
    }
    o = at + n + kids;
  }
  return out;
}

/**
 * Filter parsed materials down to only palette indices actually placed on voxels in `vox`.
 * Returns `{ totalSpecial, counts: { emit, glass, metal, cloud }, slots, summary }`.
 */
export function usedMaterials(vox, materials = {}) {
  const counts = { emit: 0, glass: 0, metal: 0, cloud: 0 };
  const slots = {};
  if (!vox?.frames?.length || !materials) {
    return { totalSpecial: 0, counts, slots, summary: "" };
  }
  const usedIds = new Set();
  for (const fr of vox.frames) {
    for (const v of fr.voxels ?? []) usedIds.add(v[3]);
  }
  for (const cid of usedIds) {
    const m = materials[cid];
    if (!m || !(m.kind in counts)) continue;
    slots[cid] = m;
    counts[m.kind]++;
  }
  const totalSpecial = counts.emit + counts.glass + counts.metal + counts.cloud;
  const summary = [
    ["emit", "Emit"],
    ["glass", "Glass"],
    ["metal", "Metal"],
    ["cloud", "Cloud"],
  ]
    .filter(([k]) => counts[k] > 0)
    .map(([k, label]) => `${label} (${counts[k]})`)
    .join(", ");
  return { totalSpecial, counts, slots, summary };
}

/**
 * Same centering as `toScene(vox, f)` in hub/public/js/vox.js, with the voxel's MATL entry appended:
 * `[x, y, z, "#rrggbb", matOrNull]`.
 */
export function toSceneWithMaterials(vox, f = 0, materials = null) {
  const frame = vox?.frames?.[f] ?? vox?.frames?.[0];
  if (!frame) return [];
  const { size, voxels } = frame;
  return voxels.map(([x, y, z, c]) => [
    x - size[0] / 2 + 0.5,
    z + 0.5,
    -(y - size[1] / 2 + 0.5),
    vox.palette[c] ?? "#ff00ff",
    materials?.[c] ?? null,
  ]);
}
