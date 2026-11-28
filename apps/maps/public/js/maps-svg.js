// Pure inline SVG artwork for shapes, symmetry, lines, angles, protractors,
// compass rose, Quadrant I coordinate plane, and isometric 3D unit cubes (no DOM).

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function polyPts(n, cx, cy, r, rotDeg = -90) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
const ptsAttr = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function symLine(x1, y1, x2, y2, color = "#e5484d") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3.5" stroke-dasharray="7 6" stroke-linecap="round"/>`;
}

export function namedPolygonPoints(kind) {
  switch (kind) {
    case "triangle": return polyPts(3, 90, 96, 60, -90);
    case "triangle-tilt": return polyPts(3, 90, 92, 58, -62);
    case "iso-tall": return [[90, 22], [134, 152], [46, 152]];
    case "scalene": return [[42, 34], [148, 146], [30, 146]];
    case "square": return [[38, 38], [142, 38], [142, 142], [38, 142]];
    case "diamond": return [[90, 24], [156, 90], [90, 156], [24, 90]];
    case "rectangle": return [[24, 52], [156, 52], [156, 128], [24, 128]];
    case "rect-tall": return [[54, 24], [126, 24], [126, 156], [54, 156]];
    case "trapezoid": return [[56, 46], [124, 46], [156, 134], [24, 134]];
    case "trapezoid-side": return [[44, 34], [116, 48], [116, 132], [44, 146]];
    case "rhombus": return [[90, 22], [134, 90], [90, 158], [46, 90]];
    case "parallelogram": return [[56, 48], [158, 48], [124, 132], [22, 132]];
    case "kite": return [[90, 22], [138, 68], [90, 160], [42, 68]];
    case "pentagon": return polyPts(5, 90, 92, 60, -90);
    case "pentagon-tilt": return polyPts(5, 90, 90, 58, -54);
    case "hexagon": return polyPts(6, 90, 90, 60, -90);
    case "hexagon-flat": return polyPts(6, 90, 90, 60, 0);
    case "octagon": return polyPts(8, 90, 90, 60, -67.5);
    default: return [[38, 38], [142, 38], [142, 142], [38, 142]];
  }
}

function tickMark(x1, y1, x2, y2, n = 1) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, ux = dx / len, uy = dy / len;
  return Array.from({ length: n }, (_, i) => {
    const off = (i - (n - 1) / 2) * 5.5;
    const cx = mx + ux * off, cy = my + uy * off;
    return `<line x1="${(cx - nx * 7).toFixed(1)}" y1="${(cy - ny * 7).toFixed(1)}" x2="${(cx + nx * 7).toFixed(1)}" y2="${(cy + ny * 7).toFixed(1)}" stroke="#135ea9" stroke-width="2.8" stroke-linecap="round"/>`;
  }).join("");
}

function quadDecor(kind) {
  if (kind === "square") {
    return `<polyline points="38,54 54,54 54,38" fill="none" stroke="#135ea9" stroke-width="2.5"/>`
      + tickMark(38, 38, 142, 38, 1) + tickMark(142, 38, 142, 142, 1) + tickMark(142, 142, 38, 142, 1) + tickMark(38, 142, 38, 38, 1);
  }
  if (kind === "rectangle") {
    return `<polyline points="24,68 40,68 40,52" fill="none" stroke="#135ea9" stroke-width="2.5"/>`
      + tickMark(24, 52, 156, 52, 2) + tickMark(156, 128, 24, 128, 2) + tickMark(24, 52, 24, 128, 1) + tickMark(156, 52, 156, 128, 1);
  }
  if (kind === "rhombus") {
    return tickMark(90, 22, 134, 90, 1) + tickMark(134, 90, 90, 158, 1) + tickMark(90, 158, 46, 90, 1) + tickMark(46, 90, 90, 22, 1);
  }
  if (kind === "trapezoid") {
    return `<polyline points="84,41 92,46 84,51" fill="none" stroke="#135ea9" stroke-width="2.8" stroke-linecap="round"/>`
      + `<polyline points="84,129 92,134 84,139" fill="none" stroke="#135ea9" stroke-width="2.8" stroke-linecap="round"/>`;
  }
  if (kind === "parallelogram") {
    return `<polyline points="100,43 108,48 100,53" fill="none" stroke="#135ea9" stroke-width="2.8" stroke-linecap="round"/>`
      + `<polyline points="68,127 76,132 68,137" fill="none" stroke="#135ea9" stroke-width="2.8" stroke-linecap="round"/>`
      + tickMark(56, 48, 22, 132, 2) + tickMark(158, 48, 124, 132, 2);
  }
  return "";
}

/** Crisp SVG shapes, polygons, and symmetry drawings. */
export function shapeSvg(spec, { size = 160, showSym = false, showDecor = false, fold = null, highlightSides = 0, highlightCorners = 0 } = {}) {
  const { kind, fill = "#bae6fd", stroke = "#135ea9" } = typeof spec === "string" ? { kind: spec } : spec;
  let body = "";
  let symOverlay = "";
  let countMarks = "";

  if (kind === "circle") {
    body = `<circle cx="90" cy="90" r="58" fill="${fill}" stroke="${stroke}" stroke-width="5"/>`;
    symOverlay = symLine(90, 18, 90, 162) + symLine(18, 90, 162, 90);
  } else if (kind === "sym-butterfly") {
    body = `<path d="M 90 62 C 58 24, 18 42, 34 86 C 18 106, 36 154, 90 118 C 144 154, 162 106, 146 86 C 162 42, 122 24, 90 62 Z" fill="#ffd45c" stroke="#d96a00" stroke-width="4.5" stroke-linejoin="round"/>
      <ellipse cx="90" cy="92" rx="7" ry="42" fill="#2b2340"/>
      <circle cx="58" cy="70" r="10" fill="#ff8a00"/><circle cx="122" cy="70" r="10" fill="#ff8a00"/>`;
    symOverlay = symLine(90, 18, 90, 164);
  } else if (kind === "sym-heart") {
    body = `<path d="M 90 150 C 90 150 24 110 24 64 C 24 40 44 26 64 26 C 78 26 86 36 90 44 C 94 36 102 26 116 26 C 136 26 156 40 156 64 C 156 110 90 150 90 150 Z" fill="#ffb3b3" stroke="#e5484d" stroke-width="5" stroke-linejoin="round"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "sym-house") {
    body = `<polygon points="90,26 150,78 150,152 30,152 30,78" fill="#ffe3b3" stroke="#d96a00" stroke-width="5" stroke-linejoin="round"/>
      <rect x="74" y="106" width="32" height="46" rx="4" fill="#1d7fe0" stroke="#135ea9" stroke-width="3.5"/>
      <circle cx="90" cy="64" r="10" fill="#e3f0ff" stroke="#135ea9" stroke-width="3"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "sym-chalice") {
    body = `<path d="M 48 34 L 132 34 C 132 76 112 96 90 98 C 68 96 48 76 48 34 Z" fill="#ffd45c" stroke="#d96a00" stroke-width="4.5" stroke-linejoin="round"/>
      <rect x="83" y="98" width="14" height="36" fill="#ffd45c" stroke="#d96a00" stroke-width="4"/>
      <polygon points="56,152 124,152 110,134 70,134" fill="#ffd45c" stroke="#d96a00" stroke-width="4.5" stroke-linejoin="round"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "sym-bell") {
    body = `<path d="M 90 26 C 60 26 48 56 46 98 L 32 126 L 148 126 L 134 98 C 132 56 120 26 90 26 Z" fill="#ffc93c" stroke="#b37b00" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="90" cy="138" r="11" fill="#d96a00"/>`;
    symOverlay = symLine(90, 14, 90, 164);
  } else if (kind === "sym-bow") {
    body = `<polygon points="32,44 90,90 32,136" fill="#d7beff" stroke="#6429a6" stroke-width="4.5" stroke-linejoin="round"/>
      <polygon points="148,44 90,90 148,136" fill="#d7beff" stroke="#6429a6" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="90" cy="90" r="14" fill="#8b46d6" stroke="#6429a6" stroke-width="4"/>`;
    symOverlay = symLine(18, 90, 162, 90);
  } else if (kind === "asym-L") {
    body = `<polygon points="48,30 82,30 82,118 144,118 144,150 48,150" fill="#bae6fd" stroke="#135ea9" stroke-width="5" stroke-linejoin="round"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "asym-flag") {
    body = `<rect x="46" y="28" width="10" height="126" rx="4" fill="#6d6680"/>
      <polygon points="56,32 146,56 56,82" fill="#ff6b70" stroke="#b02d33" stroke-width="4" stroke-linejoin="round"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "asym-mug") {
    body = `<rect x="46" y="48" width="66" height="94" rx="10" fill="#dcf6e6" stroke="#137a41" stroke-width="5"/>
      <path d="M 112 64 C 146 64 146 116 112 116" fill="none" stroke="#137a41" stroke-width="9" stroke-linecap="round"/>`;
    symOverlay = symLine(90, 18, 90, 164);
  } else if (kind === "asym-F") {
    body = `<polygon points="52,30 132,30 132,58 84,58 84,80 120,80 120,106 84,106 84,150 52,150" fill="#ffe08a" stroke="#b37b00" stroke-width="4.5" stroke-linejoin="round"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else if (kind === "asym-boat") {
    body = `<polygon points="28,116 152,116 132,148 48,148" fill="#d96a00" stroke="#7a3a00" stroke-width="4" stroke-linejoin="round"/>
      <line x1="88" y1="30" x2="88" y2="116" stroke="#2b2340" stroke-width="5"/>
      <polygon points="92,34 146,106 92,106" fill="#e3f0ff" stroke="#135ea9" stroke-width="3.5"/>`;
    symOverlay = symLine(90, 16, 90, 164);
  } else {
    const pts = namedPolygonPoints(kind);
    body = `<polygon points="${ptsAttr(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>`;
    if (showDecor) body += quadDecor(kind);
    if (highlightSides > 0) {
      const k = Math.min(highlightSides, pts.length);
      countMarks += Array.from({ length: k }, (_, i) => {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        return `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#ff8a00" stroke-width="7" stroke-linecap="round"/>`
          + `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10.5" fill="#ff8a00" stroke="#fff" stroke-width="2"/>`
          + `<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#fff">${i + 1}</text>`;
      }).join("");
    }
    if (highlightCorners > 0) {
      const k = Math.min(highlightCorners, pts.length);
      countMarks += pts.slice(0, k).map(([px, py], i) =>
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="11" fill="#16a34a" stroke="#fff" stroke-width="2.2"/>`
        + `<text x="${px.toFixed(1)}" y="${(py + 4).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#fff">${i + 1}</text>`
      ).join("");
    }
    if (kind === "square") {
      symOverlay = symLine(90, 18, 90, 162) + symLine(18, 90, 162, 90) + symLine(26, 26, 154, 154) + symLine(154, 26, 26, 154);
    } else if (kind === "diamond") {
      symOverlay = symLine(90, 14, 90, 166) + symLine(14, 90, 166, 90) + symLine(44, 44, 136, 136) + symLine(136, 44, 44, 136);
    } else if (kind === "rectangle") {
      symOverlay = symLine(90, 26, 90, 154) + symLine(12, 90, 168, 90);
    } else if (kind === "triangle") {
      const p = namedPolygonPoints("triangle");
      symOverlay = [0, 1, 2].map((i) => {
        const mx = (p[(i + 1) % 3][0] + p[(i + 2) % 3][0]) / 2;
        const my = (p[(i + 1) % 3][1] + p[(i + 2) % 3][1]) / 2;
        return symLine(p[i][0].toFixed(1), p[i][1].toFixed(1), mx.toFixed(1), my.toFixed(1));
      }).join("");
    } else if (kind === "iso-tall" || kind === "kite" || kind === "trapezoid") {
      symOverlay = symLine(90, 14, 90, 166);
    } else if (kind === "rhombus") {
      symOverlay = symLine(90, 12, 90, 168) + symLine(32, 90, 148, 90);
    } else if (kind === "pentagon") {
      const p = namedPolygonPoints("pentagon");
      symOverlay = p.map((_, i) => {
        const mx = (p[(i + 2) % 5][0] + p[(i + 3) % 5][0]) / 2;
        const my = (p[(i + 2) % 5][1] + p[(i + 3) % 5][1]) / 2;
        return symLine(p[i][0].toFixed(1), p[i][1].toFixed(1), mx.toFixed(1), my.toFixed(1));
      }).join("");
    } else if (kind === "hexagon") {
      const p = namedPolygonPoints("hexagon");
      symOverlay = [0, 1, 2].map((i) => symLine(p[i][0].toFixed(1), p[i][1].toFixed(1), p[i + 3][0].toFixed(1), p[i + 3][1].toFixed(1))).join("")
        + [0, 1, 2].map((i) => {
          const mx1 = (p[i][0] + p[i + 1][0]) / 2, my1 = (p[i][1] + p[i + 1][1]) / 2;
          const mx2 = (p[i + 3][0] + p[(i + 4) % 6][0]) / 2, my2 = (p[i + 3][1] + p[(i + 4) % 6][1]) / 2;
          return symLine(mx1.toFixed(1), my1.toFixed(1), mx2.toFixed(1), my2.toFixed(1));
        }).join("");
    }
  }

  let customFold = "";
  if (fold === "v") customFold = symLine(90, 14, 90, 166);
  else if (fold === "h") customFold = symLine(14, 90, 166, 90);
  else if (fold === "diag") customFold = symLine(24, 24, 156, 156);
  else if (fold === "bad-v") customFold = symLine(64, 14, 64, 166);
  else if (fold === "bad-h") customFold = symLine(14, 62, 166, 62);

  return `<svg ${NS} viewBox="0 0 180 180" width="${size}" height="${size}" class="geo-svg" aria-hidden="true">${body}${showSym ? symOverlay : ""}${customFold}${countMarks}</svg>`;
}

/** Points, segments, rays, lines, parallel, intersecting, and perpendicular lines. */
export function linesSvg(kind, { size = 180 } = {}) {
  const arrow = (x1, y1, x2, y2, id) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 12, spread = 0.48;
    const ax1 = x2 - L * Math.cos(a - spread), ay1 = y2 - L * Math.sin(a - spread);
    const ax2 = x2 - L * Math.cos(a + spread), ay2 = y2 - L * Math.sin(a + spread);
    return `<polygon points="${x2},${y2} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="${id}"/>`;
  };
  const stroke = "#1d7fe0", accent = "#d96a00";
  let body = "";
  if (kind === "point") {
    body = `<circle cx="95" cy="90" r="11" fill="${accent}" stroke="#fff" stroke-width="3"/><text x="95" y="64" text-anchor="middle" font-size="22" font-weight="800" fill="#2b2340">P</text>`;
  } else if (kind === "segment") {
    body = `<line x1="34" y1="110" x2="156" y2="70" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="34" cy="110" r="8" fill="${accent}"/><circle cx="156" cy="70" r="8" fill="${accent}"/>`;
  } else if (kind === "ray") {
    body = `<line x1="34" y1="108" x2="156" y2="66" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="34" cy="108" r="8.5" fill="${accent}"/>${arrow(34, 108, 166, 62.5, stroke)}`;
  } else if (kind === "line") {
    body = `<line x1="28" y1="90" x2="162" y2="90" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>
      ${arrow(162, 90, 18, 90, stroke)}${arrow(28, 90, 172, 90, stroke)}
      <circle cx="62" cy="90" r="5.5" fill="${accent}"/><circle cx="128" cy="90" r="5.5" fill="${accent}"/>`;
  } else if (kind === "parallel") {
    body = `<line x1="30" y1="62" x2="160" y2="62" stroke="${stroke}" stroke-width="5.5"/>
      <line x1="30" y1="118" x2="160" y2="118" stroke="#1ea55b" stroke-width="5.5"/>
      ${arrow(160, 62, 20, 62, stroke)}${arrow(30, 62, 170, 62, stroke)}
      ${arrow(160, 118, 20, 118, "#1ea55b")}${arrow(30, 118, 170, 118, "#1ea55b")}`;
  } else if (kind === "intersecting") {
    body = `<line x1="34" y1="138" x2="156" y2="42" stroke="${stroke}" stroke-width="5.5"/>
      <line x1="34" y1="54" x2="156" y2="130" stroke="#8b46d6" stroke-width="5.5"/>
      ${arrow(156, 42, 26, 144, stroke)}${arrow(34, 138, 164, 36, stroke)}
      ${arrow(156, 130, 26, 49, "#8b46d6")}${arrow(34, 54, 164, 135, "#8b46d6")}
      <circle cx="95" cy="91" r="6" fill="${accent}"/>`;
  } else if (kind === "perpendicular") {
    body = `<line x1="28" y1="92" x2="162" y2="92" stroke="${stroke}" stroke-width="5.5"/>
      <line x1="95" y1="24" x2="95" y2="158" stroke="#1ea55b" stroke-width="5.5"/>
      ${arrow(162, 92, 18, 92, stroke)}${arrow(28, 92, 172, 92, stroke)}
      ${arrow(95, 158, 95, 14, "#1ea55b")}${arrow(95, 24, 95, 168, "#1ea55b")}
      <polyline points="95,74 113,74 113,92" fill="none" stroke="${accent}" stroke-width="3.2"/>`;
  }
  return `<svg ${NS} viewBox="0 0 190 180" width="${size}" height="${Math.round(size * 0.95)}" class="geo-svg" aria-hidden="true">${body}</svg>`;
}

/** Acute / right / obtuse / straight angle (with optional Corner Tester), protractor, or split missing angle. */
export function angleSvg({ deg = 45, baseDeg = 0, showCornerTest = false, revealRight = false, protractor = false, highlightArc = false, split = null, size = 210 } = {}) {
  if (protractor) {
    const cx = 130, cy = 148, r = 98;
    const rad = (d) => (d * Math.PI) / 180;
    const pt = (d, rr) => [cx + rr * Math.cos(rad(d)), cy - rr * Math.sin(rad(d))];
    let ticks = "";
    for (let d = 0; d <= 180; d += 5) {
      const len = d % 30 === 0 ? 14 : d % 10 === 0 ? 10 : 5;
      const [x1, y1] = pt(d, r), [x2, y2] = pt(d, r - len);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#135ea9" stroke-width="${d % 10 === 0 ? 2 : 1.1}"/>`;
      if (d % 30 === 0) {
        const [lx, ly] = pt(d, r - 24);
        ticks += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#135ea9">${d}°</text>`;
      }
    }
    const [rx, ry] = pt(deg, r + 10);
    let wedge = "";
    if (highlightArc && deg > 0) {
      const [ax, ay] = pt(deg, r - 14);
      const [bx, by] = pt(0, r - 14);
      const [lx, ly] = pt(deg / 2, r - 48);
      wedge = `<path d="M ${cx} ${cy} L ${bx.toFixed(1)} ${by.toFixed(1)} A ${r - 14} ${r - 14} 0 0 0 ${ax.toFixed(1)} ${ay.toFixed(1)} Z" fill="#ff8a00" fill-opacity=".22"/>`
        + `<rect x="${(lx - 21).toFixed(1)}" y="${(ly - 12).toFixed(1)}" width="42" height="22" rx="8" fill="#fffdf7" stroke="#d96a00" stroke-width="2"/>`
        + `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="900" fill="#d96a00">${deg}°</text>`;
    } else if (highlightArc && deg === 0) {
      const [zx, zy] = pt(0, r);
      wedge = `<circle cx="${zx.toFixed(1)}" cy="${zy.toFixed(1)}" r="10" fill="#ff8a00" fill-opacity=".35" stroke="#d96a00" stroke-width="2.5"/>`
        + `<rect x="${(zx - 46).toFixed(1)}" y="${(cy - 38).toFixed(1)}" width="40" height="22" rx="8" fill="#fffdf7" stroke="#d96a00" stroke-width="2"/>`
        + `<text x="${(zx - 26).toFixed(1)}" y="${(cy - 23).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="900" fill="#d96a00">0°</text>`;
    }
    return `<svg ${NS} viewBox="0 0 260 175" width="${size + 40}" height="${Math.round((size + 40) * 0.67)}" class="geo-svg" aria-hidden="true">
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="#e3f0ff" fill-opacity=".65" stroke="#135ea9" stroke-width="2.5"/>
      ${wedge}
      <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#135ea9" stroke-width="2"/>
      ${ticks}
      <line x1="${cx}" y1="${cy}" x2="${cx + r + 8}" y2="${cy}" stroke="#1d7fe0" stroke-width="4.5" stroke-linecap="round"/>
      ${deg > 0 ? `<line x1="${cx}" y1="${cy}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#e5484d" stroke-width="4.5" stroke-linecap="round"/>` : ""}
      <circle cx="${cx}" cy="${cy}" r="5.5" fill="#2b2340"/>
    </svg>`;
  }

  if (split) {
    // Complementary (total=90) or supplementary (total=180) split angle with ?° or solved angle.
    const { total, known, showAnswer = false } = split;
    const miss = total - known;
    const cx = total === 90 ? 64 : 120, cy = 140, len = 88;
    const rad = (d) => (d * Math.PI) / 180;
    const midX = cx + len * Math.cos(rad(known)), midY = cy - len * Math.sin(rad(known));
    const endX = total === 90 ? cx : cx - len, endY = total === 90 ? cy - len : cy;
    const [a1x, a1y] = [cx + 34 * Math.cos(rad(known / 2)), cy - 34 * Math.sin(rad(known / 2))];
    const midA = known + (total - known) / 2;
    const [a2x, a2y] = [cx + 42 * Math.cos(rad(midA)), cy - 42 * Math.sin(rad(midA))];
    return `<svg ${NS} viewBox="0 0 240 168" width="${size + 25}" height="${Math.round((size + 25) * 0.7)}" class="geo-svg" aria-hidden="true">
      ${total === 90
        ? `<polyline points="${cx},${cy - 18} ${cx + 18},${cy - 18} ${cx + 18},${cy}" fill="none" stroke="#135ea9" stroke-width="2.5"/>`
        : `<path d="M ${cx - 26} ${cy} A 26 26 0 0 1 ${cx + 26} ${cy}" fill="none" stroke="#135ea9" stroke-width="2" stroke-dasharray="4 3"/>`}
      <line x1="${cx}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="#1d7fe0" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${endX}" y2="${endY}" stroke="#1d7fe0" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${midX.toFixed(1)}" y2="${midY.toFixed(1)}" stroke="#e5484d" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="#2b2340"/>
      <text x="${(a1x + 12).toFixed(1)}" y="${(a1y + 4).toFixed(1)}" font-size="14" font-weight="800" fill="#135ea9">${known}°</text>
      <text x="${a2x.toFixed(1)}" y="${(a2y - 4).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="900" fill="${showAnswer ? "#137a41" : "#d96a00"}">${showAnswer ? `${miss}°` : "?°"}</text>
    </svg>`;
  }

  const cx = 100, cy = 108, len = 72;
  const r1 = (baseDeg * Math.PI) / 180;
  const r2 = ((baseDeg + deg) * Math.PI) / 180;
  const x1 = cx + len * Math.cos(r1), y1 = cy - len * Math.sin(r1);
  const x2 = cx + len * Math.cos(r2), y2 = cy - len * Math.sin(r2);
  const ar = 24;
  const ax1 = cx + ar * Math.cos(r1), ay1 = cy - ar * Math.sin(r1);
  const ax2 = cx + ar * Math.cos(r2), ay2 = cy - ar * Math.sin(r2);
  const cornerSq = (showCornerTest || (revealRight && deg === 90))
    ? (() => {
        const s = 34, ux = Math.cos(r1), uy = -Math.sin(r1), vx = Math.cos(r1 + Math.PI / 2), vy = -Math.sin(r1 + Math.PI / 2);
        const p1 = `${(cx + s * ux).toFixed(1)},${(cy + s * uy).toFixed(1)}`;
        const p2 = `${(cx + s * ux + s * vx).toFixed(1)},${(cy + s * uy + s * vy).toFixed(1)}`;
        const p3 = `${(cx + s * vx).toFixed(1)},${(cy + s * vy).toFixed(1)}`;
        return `<polygon points="${cx},${cy} ${p1} ${p2} ${p3}" fill="#ffc93c" fill-opacity=".42" stroke="#d96a00" stroke-width="2.5" stroke-dasharray="4 3"/>`;
      })()
    : "";

  return `<svg ${NS} viewBox="0 0 200 180" width="${size}" height="${Math.round(size * 0.9)}" class="geo-svg" aria-hidden="true">
    ${cornerSq}
    <path d="M ${ax1.toFixed(1)} ${ay1.toFixed(1)} A ${ar} ${ar} 0 ${deg > 180 ? 1 : 0} 0 ${ax2.toFixed(1)} ${ay2.toFixed(1)}" fill="none" stroke="#e5484d" stroke-width="3.2"/>
    <line x1="${cx}" y1="${cy}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#1d7fe0" stroke-width="5.5" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1d7fe0" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="#d96a00"/>
  </svg>`;
}

/** N / S / E / W compass rose SVG. */
export function compassSvg({ size = 84 } = {}) {
  return `<svg ${NS} viewBox="0 0 100 100" width="${size}" height="${size}" class="compass-svg" aria-label="Compass rose showing North up, South down, East right, West left">
    <circle cx="50" cy="50" r="34" fill="#fffdf7" stroke="#135ea9" stroke-width="3"/>
    <polygon points="50,18 57,46 50,41 43,46" fill="#e5484d"/>
    <polygon points="50,82 57,54 50,59 43,54" fill="#1d7fe0"/>
    <polygon points="18,50 46,43 41,50 46,57" fill="#9bc2ec"/>
    <polygon points="82,50 54,43 59,50 54,57" fill="#9bc2ec"/>
    <circle cx="50" cy="50" r="4" fill="#2b2340"/>
    <text x="50" y="13" text-anchor="middle" font-size="13" font-weight="900" fill="#e5484d">N</text>
    <text x="50" y="96" text-anchor="middle" font-size="12" font-weight="800" fill="#135ea9">S</text>
    <text x="92" y="54" text-anchor="middle" font-size="12" font-weight="800" fill="#135ea9">E</text>
    <text x="8" y="54" text-anchor="middle" font-size="12" font-weight="800" fill="#135ea9">W</text>
  </svg>`;
}

/** Interactive Quadrant I (0..6 × 0..6) coordinate plane SVG. */
export function coordPlaneSvg({
  points = [], interactive = false, selected = null, wrong = null, showDrops = null, size = 290,
} = {}) {
  const max = 6, padL = 42, padR = 22, padT = 20, padB = 40, step = 36;
  const W = padL + max * step + padR, H = padT + max * step + padB;
  const px = (x) => padL + x * step;
  const py = (y) => padT + (max - y) * step;

  let grid = "";
  for (let i = 0; i <= max; i++) {
    const gx = px(i), gy = py(i);
    grid += `<line x1="${gx}" y1="${padT}" x2="${gx}" y2="${py(0)}" stroke="${i === 0 ? "#135ea9" : "#cde1f9"}" stroke-width="${i === 0 ? 3 : 1.5}"/>`;
    grid += `<line x1="${padL}" y1="${gy}" x2="${px(max)}" y2="${gy}" stroke="${i === 0 ? "#135ea9" : "#cde1f9"}" stroke-width="${i === 0 ? 3 : 1.5}"/>`;
    grid += `<text x="${gx}" y="${py(0) + 18}" text-anchor="middle" font-size="13" font-weight="800" fill="#2b2340">${i}</text>`;
    if (i > 0) grid += `<text x="${padL - 12}" y="${gy + 4}" text-anchor="end" font-size="13" font-weight="800" fill="#2b2340">${i}</text>`;
  }
  grid += `<text x="${px(3)}" y="${H - 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#135ea9">x (across) →</text>`;
  grid += `<text x="14" y="${py(3)}" text-anchor="middle" font-size="12" font-weight="800" fill="#135ea9" transform="rotate(-90 14 ${py(3)})">y (up) →</text>`;

  const drops = showDrops ? (() => {
    const [dx, dy] = showDrops;
    return `<line x1="${px(dx)}" y1="${py(dy)}" x2="${px(dx)}" y2="${py(0)}" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="5 4"/>
      <line x1="${px(dx)}" y1="${py(dy)}" x2="${px(0)}" y2="${py(dy)}" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="5 4"/>`;
  })() : "";

  const hits = interactive ? Array.from({ length: max + 1 }, (_, x) =>
    Array.from({ length: max + 1 }, (_, y) =>
      `<g class="coord-hit" data-x="${x}" data-y="${y}" role="button" tabindex="0" aria-label="Plot (${x}, ${y})">
        <circle cx="${px(x)}" cy="${py(y)}" r="15" fill="transparent"/>
        <circle class="hit-dot" cx="${px(x)}" cy="${py(y)}" r="4.5" fill="#1d7fe0" fill-opacity=".22"/>
      </g>`).join("")).join("") : "";

  const pins = points.map((p) => {
    const col = p.color ?? "#e5484d";
    const lbl = p.label ? `<text x="${px(p.x) + 10}" y="${py(p.y) - 10}" font-size="13" font-weight="900" fill="${col}">${esc(p.label)}</text>` : "";
    return `<circle cx="${px(p.x)}" cy="${py(p.y)}" r="8.5" fill="${col}" stroke="#fff" stroke-width="2.5"/>${lbl}`;
  }).join("");

  const selPin = selected ? `<circle cx="${px(selected[0])}" cy="${py(selected[1])}" r="9.5" fill="#1ea55b" stroke="#fff" stroke-width="3"/>` : "";
  const wrongPin = wrong ? `<circle cx="${px(wrong[0])}" cy="${py(wrong[1])}" r="9" fill="#e5484d" stroke="#fff" stroke-width="2.5" opacity=".7"/>` : "";

  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="coord-svg">${grid}${drops}${hits}${pins}${wrongPin}${selPin}</svg>`;
}

/** Painter's-order isometric 3D unit-cube stack SVG (heights[row][col]). */
export function volumeSvg(heights, { dims = null, size = 220 } = {}) {
  const rows = heights.length, cols = heights[0]?.length ?? 0;
  const dx = 22, dy = 11, dz = 24;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const cubes = [];

  for (let s = 0; s <= rows + cols - 2; s++) {
    for (let y = 0; y < rows; y++) {
      const x = s - y;
      if (x < 0 || x >= cols) continue;
      const h = heights[y][x];
      for (let z = 0; z < h; z++) {
        const cx = (x - y) * dx;
        const cy = (x + y) * dy - z * dz;
        minX = Math.min(minX, cx - dx); maxX = Math.max(maxX, cx + dx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy + 2 * dy + dz);
        cubes.push({ cx, cy });
      }
    }
  }
  if (!cubes.length) { minX = -30; maxX = 30; minY = -20; maxY = 40; }
  const pad = dims ? 28 : 14;
  const vx = Math.floor(minX - pad), vy = Math.floor(minY - pad);
  const vw = Math.ceil(maxX - minX + pad * 2), vh = Math.ceil(maxY - minY + pad * 2);

  const faces = cubes.map(({ cx, cy }) => {
    const T = [cx, cy], R = [cx + dx, cy + dy], B = [cx, cy + 2 * dy], L = [cx - dx, cy + dy];
    const Lb = [cx - dx, cy + dy + dz], Bb = [cx, cy + 2 * dy + dz], Rb = [cx + dx, cy + dy + dz];
    return `<g stroke="#135ea9" stroke-width="1.6" stroke-linejoin="round">
      <polygon points="${ptsAttr([T, R, B, L])}" fill="#bfe3ff"/>
      <polygon points="${ptsAttr([L, B, Bb, Lb])}" fill="#5bb4ff"/>
      <polygon points="${ptsAttr([B, R, Rb, Bb])}" fill="#1d7fe0"/>
    </g>`;
  }).join("");

  let labels = "";
  if (dims) {
    const { l, w, h } = dims;
    const fx = (cols - 1) * dx, fy = (cols - 1) * dy;
    const lx = (cols / 2 - rows) * dx - 14, ly = (cols / 2 + rows) * dy + dz + 16;
    const wx = (cols - rows / 2) * dx + 14, wy = (cols + rows / 2) * dy + dz + 16;
    const hx = fx + dx + 12, hy = fy + dy - ((h - 2) * dz) / 2;
    const halo = `paint-order="stroke" stroke="#fffdf7" stroke-width="4" stroke-linejoin="round"`;
    labels = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="900" fill="#2b2340" ${halo}>${l}</text>
      <text x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="900" fill="#2b2340" ${halo}>${w}</text>
      <text x="${hx.toFixed(1)}" y="${hy.toFixed(1)}" text-anchor="start" font-size="14" font-weight="900" fill="#d96a00" ${halo}>${h}</text>`;
  }

  return `<svg ${NS} viewBox="${vx} ${vy} ${vw} ${vh}" width="${size}" height="${Math.round(size * (vh / vw))}" class="vol-svg" aria-hidden="true">${faces}${labels}</svg>`;
}

/**
 * Dashed grid path overlay starting cleanly past the starting square edge so kids never count start as block 1.
 * Pass `stepLimit` to animate step-by-step or `showNumbers` to badge each entered square 1..N.
 */
export function pathOverlaySvg({ rows, cols, pathLine }, { showNumbers = false, stepLimit = Infinity } = {}) {
  if (!pathLine || pathLine.length < 2) return "";
  const limit = Math.max(0, Math.min(pathLine.length - 1, stepLimit));
  if (limit === 0) return "";
  const w = cols * 100, h = rows * 100;
  const cx = (c) => c * 100 + 50, cy = (r) => r * 100 + 50;
  const [r0, c0] = pathLine[0], [r1, c1] = pathLine[1];
  const sx = cx(c0) + Math.sign(c1 - c0) * 60;
  const sy = cy(r0) + Math.sign(r1 - r0) * 60;
  const pts = [[sx, sy], ...pathLine.slice(1, limit + 1).map(([r, c]) => [cx(c), cy(r)])];
  const ptsStr = pts.map(([x, y]) => `${x},${y}`).join(" ");

  const [prevX, prevY] = pts[pts.length - 2];
  const [endX, endY] = pts[pts.length - 1];
  const ang = Math.atan2(endY - prevY, endX - prevX);
  const L = 16, sp = 0.52;
  const ax1 = endX - L * Math.cos(ang - sp), ay1 = endY - L * Math.sin(ang - sp);
  const ax2 = endX - L * Math.cos(ang + sp), ay2 = endY - L * Math.sin(ang + sp);

  const badges = pathLine.slice(1, limit + 1).map(([r, c], idx) => {
    const x = cx(c), y = cy(r), stepNum = idx + 1;
    if (!showNumbers && idx === limit - 1) return "";
    if (!showNumbers) {
      return `<circle cx="${x}" cy="${y}" r="8" fill="#16a34a" stroke="#fff" stroke-width="2.5"/>`;
    }
    return `<circle cx="${x}" cy="${y}" r="16" fill="#16a34a" stroke="#fff" stroke-width="3"/>`
      + `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${stepNum}</text>`;
  }).join("");

  const arrow = showNumbers
    ? ""
    : `<polygon points="${endX},${endY} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="#16a34a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;

  return `<svg ${NS} class="grid-path-svg" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <polyline points="${ptsStr}" fill="none" stroke="#16a34a" stroke-width="11" stroke-dasharray="14 11" stroke-linecap="round" stroke-linejoin="round"/>
    ${badges}${arrow}
  </svg>`;
}
