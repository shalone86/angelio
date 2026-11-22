// Write a MagicaVoxel (.vox) file: one model, its voxels and a palette. Used by the Studio's Drawings page to hand
// the owner a game's own pieces (Mass Usher's pew) to open in MagicaVoxel beside his people. vox.js reads them back.

/** voxels: [[x, y, z, "#rrggbb"], …] (z up, y toward the back: MagicaVoxel's front is -y, the way his people face). */
export function writeVox(size, voxels) {
  const colors = [...new Set(voxels.map((v) => v[3].toLowerCase()))].slice(0, 255);
  const idx = new Map(colors.map((c, i) => [c, i + 1]));
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const chunk = (id, body) => [...[...id].map((c) => c.charCodeAt(0)), ...u32(body.length), ...u32(0), ...body];
  const sizeC = chunk("SIZE", [...u32(size[0]), ...u32(size[1]), ...u32(size[2])]);
  const xyzi = chunk("XYZI", [...u32(voxels.length), ...voxels.flatMap(([x, y, z, c]) => [x, y, z, idx.get(c.toLowerCase()) ?? 1])]);
  const rgba = [];
  for (let i = 0; i < 256; i++) { const c = colors[i]; rgba.push(...(c ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255] : [0, 0, 0, 255])); }
  const kids = [...sizeC, ...xyzi, ...chunk("RGBA", rgba)];
  const main = [..."MAIN"].map((c) => c.charCodeAt(0)).concat(u32(0), u32(kids.length), kids);
  return new Uint8Array([..."VOX ".split("").map((c) => c.charCodeAt(0)), ...u32(150), ...main]);
}

/** Mass Usher's pew, as the game draws it (apps/usher/public/js/nave.js), in his voxels: five seats, each 5 voxels wide
 * (the game's spacing beside his 8 × 8 × 8 people), a seat 2 high, a low back behind it (people's clothes show above),
 * and the carved end on the right (by the aisle, for a pew left of the aisle). A sitting person sits at height 1. */
export function pewVox() {
  const SEAT = "#8a5a2e", BACK = "#7a4c24", END = "#6a4020", L = 25, v = [];
  for (let x = 0; x < L; x++) {
    for (let y = 0; y < 3; y++) for (let z = 0; z < 2; z++) v.push([x, y, z, SEAT]);
    for (let z = 0; z < 3; z++) v.push([x, 3, z, BACK]);
  }
  for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) v.push([L, y, z, END]);
  return writeVox([L + 1, 4, 4], v);
}
