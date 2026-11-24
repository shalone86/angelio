// Bakes crisp isometric 3D-shaded SVG stickers into hub/public/stickers/vox/<slug>.svg
// directly from Shalone's MagicaVoxel (.vox) models in art/vox/.
// Run: node tools/vox-stickers.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readVox } from "../hub/public/js/vox.js";
import { recolor } from "../apps/candles/public/js/looks.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "art", "vox");
const OUT_DIR = join(ROOT, "hub", "public", "stickers", "vox");

// Fixed character palettes using the exact looks.js markers so every sticker has distinct robes, skin and hair.
export const VOX_MANIFEST = [
  { slug: "priest-bless", src: "priest-bless", name: "Father Blessing", vestment: "#2e8b57",
    look: { hair: "#4a2c1a", skin: "#efc6a0", eyes: "#3b2414" } },
  { slug: "priest-mass-idle", src: "priest-mass-idle", name: "Father at Mass", vestment: "#f0c84b",
    look: { hair: "#6b4226", skin: "#cf9a6c", eyes: "#2f6db5" } },
  { slug: "priest-idle", src: "priest-idle", name: "Father",
    look: { hair: "#2e1d12", skin: "#b97f55", eyes: "#2a1a10" } },
  { slug: "east-priest-cense", src: "east-priest-cense", name: "Father Censing", vestment: "#c8262f",
    look: { hair: "#4a2c1a", skin: "#e2b085", eyes: "#3f7a4a" } },
  { slug: "east-priest-phelonion-idle", src: "east-priest-phelonion-idle", name: "Eastern Priest", vestment: "#6b3fa0",
    look: { hair: "#8f8f8f", skin: "#f6d7b8", eyes: "#2f6db5" } },
  { slug: "server-candle-idle", src: "server-candle-idle", name: "Candle Server",
    look: { hair: "#a8692f", skin: "#f6d7b8", eyes: "#3f7a4a" } },
  { slug: "server-cross-idle", src: "server-cross-idle", name: "Cross Server",
    look: { hair: "#1b1410", skin: "#9a6442", eyes: "#2a1a10" } },
  { slug: "server-light", src: "server-light", name: "Lighting Server",
    look: { hair: "#d9b25f", skin: "#efc6a0", eyes: "#2f6db5" } },
  { slug: "east-server-ripidion-idle", src: "east-server-ripidion-idle", name: "Ripidion Server",
    look: { hair: "#2e1d12", skin: "#cf9a6c", eyes: "#3b2414" } },
  { slug: "east-server-cross-idle", src: "east-server-cross-idle", name: "Eastern Cross Server",
    look: { hair: "#6b4226", skin: "#e2b085", eyes: "#5a3a1e" } },
  { slug: "child-walk", src: "child-walk", name: "Boy",
    look: { hair: "#8a3b1e", skin: "#f6d7b8", eyes: "#2f6db5", shirt: "#2e5fa8", belt: "#4a2c1a", shoes: "#1b1410" } },
  { slug: "child-girl-walk", src: "child-girl-walk", name: "Girl",
    look: { hair: "#2e1d12", skin: "#b97f55", eyes: "#3b2414", dress: "#e58fb3", belt: "#f4efe2", shoes: "#4a2c1a" } },
  { slug: "child-kneel", src: "child-kneel", name: "Boy Praying",
    look: { hair: "#d9b25f", skin: "#efc6a0", eyes: "#3f7a4a", shirt: "#2f8a4c", belt: "#4a2c1a", shoes: "#4a2c1a" } },
  { slug: "child-girl-kneel", src: "child-girl-kneel", name: "Girl Praying",
    look: { hair: "#4a2c1a", skin: "#e2b085", eyes: "#5a3a1e", dress: "#6b3fa0", belt: "#e3b341", shoes: "#1b1410" } },
  { slug: "man-walk", src: "man-walk", name: "Man",
    look: { hair: "#1b1410", skin: "#7a4c31", eyes: "#2a1a10", shirt: "#1f3a5f", belt: "#a8692f", shoes: "#1b1410" } },
  { slug: "woman-kneel", src: "woman-kneel", name: "Woman Praying",
    look: { hair: "#6b4226", skin: "#cf9a6c", eyes: "#3b2414", dress: "#2a8a8a", belt: "#f4efe2", shoes: "#4a2c1a" } },
  { slug: "grandfather-idle", src: "grandfather-idle", name: "Grandfather",
    look: { hair: "#ece9e2", skin: "#efc6a0", eyes: "#5f7180", shirt: "#7a5a3a", belt: "#1b1410", shoes: "#1b1410" } },
  { slug: "grandmother-idle", src: "grandmother-idle", name: "Grandmother",
    look: { hair: "#d8d4cc", skin: "#b97f55", eyes: "#3b2414", dress: "#e07a2e", belt: "#4a2c1a", shoes: "#4a2c1a" } },
];

const YAW = 0.48;   // ~27.5 deg around +Y so the front (+Z) and left (-X) faces read together
const PITCH = 0.39; // ~22.3 deg downward tilt
const CY = Math.cos(YAW), SY = Math.sin(YAW);
const CP = Math.cos(PITCH), SP = Math.sin(PITCH);

// Camera basis in scene coords (camX < 0, camY > 0, camZ > 0):
// Only -X, +Y, +Z faces point toward the camera; painter's depth order along camDir has zero cycles.
const CAM = { x: -SY * CP, y: SP, z: CY * CP };

const FACES = [
  {
    // Top (+Y in scene = +1 mvZ)
    dMv: [0, 0, 1],
    light: 1.07,
    corners: [[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]],
  },
  {
    // Front (+Z in scene = -1 mvY)
    dMv: [0, -1, 0],
    light: 0.96,
    corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]],
  },
  {
    // Left (-X in scene = -1 mvX)
    dMv: [-1, 0, 0],
    light: 0.78,
    corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]],
  },
];

function shadeHex(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * mul))).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

function project(x, y, z) {
  const rx = x * CY + z * SY;
  const rz = -x * SY + z * CY;
  return [rx, -(y * CP - rz * SP)]; // [screenX, svgY]
}

export function renderVoxSvg(voxBytes, { name, look, vestment }) {
  const vox = readVox(voxBytes);
  const { size: [sx, sy], voxels } = vox.frames[0];
  const filled = new Set(voxels.map(([x, y, z]) => `${x},${y},${z}`));

  const cubes = voxels.map(([mvx, mvy, mvz, c]) => {
    const x = mvx - sx / 2 + 0.5;
    const y = mvz + 0.5;
    const z = -(mvy - sy / 2 + 0.5);
    const baseHex = recolor(vox.palette[c] ?? "#ff00ff", look, vestment);
    const depth = x * CAM.x + y * CAM.y + z * CAM.z;
    return { mvx, mvy, mvz, x, y, z, baseHex, depth };
  }).sort((a, b) => a.depth - b.depth);

  // Collect projected polygons and measure exact bounds in projection space.
  const polys = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of cubes) {
    for (const f of FACES) {
      if (filled.has(`${v.mvx + f.dMv[0]},${v.mvy + f.dMv[1]},${v.mvz + f.dMv[2]}`)) continue;
      const pts = f.corners.map(([dx, dy, dz]) => {
        const p = project(v.x + dx, v.y + dy, v.z + dz);
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
        return p;
      });
      polys.push({ fill: shadeHex(v.baseHex, f.light), pts });
    }
  }

  const w = Math.max(1e-3, maxX - minX);
  const h = Math.max(1e-3, maxY - minY);
  const targetW = 50, targetH = 51;
  const scale = Math.min(targetW / w, targetH / h);
  const ox = 32 - ((minX + maxX) / 2) * scale;
  const oy = 31 - ((minY + maxY) / 2) * scale;
  const fmt = (n) => Number(n.toFixed(2));

  const body = polys.map(({ fill, pts }) => {
    const d = pts.map(([px, py]) => `${fmt(px * scale + ox)},${fmt(py * scale + oy)}`).join(" ");
    return `<polygon points="${d}" fill="${fill}" stroke="${fill}" stroke-width="0.22" stroke-linejoin="round"/>`;
  }).join("");

  const footY = fmt(maxY * scale + oy);
  const shadowRx = fmt(Math.min(20, Math.max(10, (w * scale) * 0.44)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>${name}</title><ellipse cx="32" cy="${footY}" rx="${shadowRx}" ry="3.2" fill="#0f172a" opacity="0.16"/>${body}</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const item of VOX_MANIFEST) {
    const bytes = readFileSync(join(SRC_DIR, `${item.src}.vox`));
    const svg = renderVoxSvg(bytes, item);
    writeFileSync(join(OUT_DIR, `${item.slug}.svg`), svg, "utf8");
  }
  console.log(`Generated ${VOX_MANIFEST.length} voxel stickers in ${OUT_DIR}`);
}
