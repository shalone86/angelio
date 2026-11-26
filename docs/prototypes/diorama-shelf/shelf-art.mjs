import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readVox } from "../../../hub/public/js/vox.js";
import { recolor } from "../../../apps/candles/public/js/looks.js";

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
  const vox = voxBytes;
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

  const image = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>${name}</title>${body}</svg>`;
  const lights = {
    day: [.39, -.16, "#1e2b18", .29],
    gold: [-.83, -.32, "#44251c", .32],
    moon: [.18, -.17, "#080b14", .23],
    rose: [.58, .38, "#382038", .28],
  };
  const shadows = Object.fromEntries(Object.entries(lights).map(([key, [dx, dz, color, opacity]]) => {
    const silhouette = cubes.map(({x,y,z}) => {
      const points = [-.5,.5].flatMap(a => [-.5,.5].flatMap(b => [-.5,.5].map(c => {
        const height = y + b;
        const [px, py] = project(x+a+height*dx, 0, z+c+height*dz);
        return [px*scale+ox,py*scale+oy];
      })));
      return `<polygon points="${hull(points).map(point => point.map(fmt).join(",")).join(" ")}"/>`;
    }).join("");
    return [key, `<svg class="cast-shadow" viewBox="0 0 64 64" aria-hidden="true"><g fill="${color}" opacity="${opacity}">${silhouette}</g></svg>`];
  }));
  return {image,shadows};
}


function hull(points) {
  const sorted = points.sort(([ax,ay],[bx,by]) => ax-bx || ay-by);
  const cross = ([ax,ay],[bx,by],[cx,cy]) => (bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
  function half(sequence) {
    const edge = [];
    for(const point of sequence) {
      while(edge.length > 1 && cross(edge.at(-2),edge.at(-1),point) <= 0) edge.pop();
      edge.push(point);
    }
    return edge.slice(0,-1);
  }
  return [...half(sorted),...half([...sorted].reverse())];
}

const props = {
 Tree: [[8,8,0,2,2,11,0],[5,5,7,8,8,6,1],[6,6,13,6,6,3,2]],
 Pew: [[3,8,0,2,5,4,0],[13,8,0,2,5,4,0],[3,8,4,12,5,1,3],[3,12,5,12,1,4,0]],
 "Garden box": [[4,6,0,11,8,3,0],[5,7,3,9,6,1,4],[6,8,4,2,2,2,1],[10,10,4,2,2,3,2]],
 Bell: [[5,5,1,8,8,2,5],[6,6,3,6,6,3,5],[7,7,6,4,4,2,5],[8,8,8,2,2,1,5],[8,8,0,2,2,1,0]]
};
const catalog = [];
function add(name, vox, options = {}) {
 const frame = vox.frames[0];
 let [w,d] = frame.size;
 let cells = frame.voxels;
 const views = [];
 const shadows = [];
 for(let turn=0;turn<4;turn++){
  const {image, shadows: cast} = renderVoxSvg({...vox,frames:[{size:[w,d],voxels:cells}]},{...options,name});
  views.push("data:image/svg+xml;base64,"+Buffer.from(image).toString("base64"));
  shadows.push(cast);
  cells = cells.map(([x,y,z,c])=>[d-1-y,x,z,c]);
  [w,d]=[d,w];
 }
 catalog.push({name,views,shadows});
}
for (const [slug,name] of [["server-cross-idle","Cross bearer"],["server-candle-idle","Candle bearer"],["priest-bless","Priest"],["child-kneel","Kneeling child"],["grandmother-idle","Grandmother"],["man-walk","Walking man"]]) {
 const item=VOX_MANIFEST.find(item=>item.slug===slug);
 add(name,readVox(readFileSync(join("art/vox",slug+".vox"))),item);
}
for(const [name,boxes] of Object.entries(props)){
 const cells=new Map();
 for(const [x,y,z,w,d,h,c] of boxes)
  for(let i=x;i<x+w;i++)for(let j=y;j<y+d;j++)for(let k=z;k<z+h;k++)cells.set([i,j,k].join(),[i,j,k,c]);
 add(name,{frames:[{size:[18,18],voxels:[...cells.values()]}],palette:["#875036","#3d8546","#71a650","#c2834b","#573e2b","#eeb840"]});
}
const page = new URL("./index.html", import.meta.url);
const html = readFileSync(page, "utf8");
const start = html.indexOf("const figures = ");
const end = html.indexOf(";\nconst storageKey", start);
writeFileSync(page, html.slice(0, start) + "const figures = " + JSON.stringify(catalog) + html.slice(end));
