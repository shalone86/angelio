// Pure inline SVG artwork for Measurement, Time & Money (no DOM):
// rulers (start at 0), everyday objects, clocks, coins/bills, tilting balance scales,
// liquid pitchers, calendars, tally/picture/bar charts, fractional line plots, perimeter/area grids, and conversions.

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

function gcd(a, b) {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** Format numbers like `2.25` as `"2¼"` or `0.5` as `"½"` when exact eighths/quarters/halves. */
export function fracLabel(v) {
  const rounded = Math.round(v * 8) / 8;
  const whole = Math.floor(rounded + 1e-9);
  const num = Math.round((rounded - whole) * 8);
  if (num === 0) return String(whole);
  const d = gcd(num, 8);
  const s = `${num / d}/${8 / d}`;
  const nice = { "1/2": "½", "1/4": "¼", "3/4": "¾", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞" }[s] ?? s;
  return whole > 0 ? `${whole}${nice}` : nice;
}

/** Draw an everyday measurable object of exact pixel width `w` starting at `(x, y)` center baseline. */
export function objectArt(kind, x, y, w, h = 28) {
  const x2 = x + w;
  switch (kind) {
    case "pencil": {
      const tip = Math.min(24, w * 0.2), era = Math.min(18, w * 0.14);
      const bodyW = Math.max(12, w - tip - era);
      return `<g>
        <rect x="${x}" y="${y - h / 2}" width="${era}" height="${h}" rx="4" fill="#ff9fb0" stroke="#a5262c" stroke-width="2.2"/>
        <rect x="${x + era - 3}" y="${y - h / 2}" width="8" height="${h}" fill="#d7e6f7" stroke="#4f4668" stroke-width="1.8"/>
        <rect x="${x + era + 5}" y="${y - h / 2}" width="${bodyW}" height="${h}" fill="#ffc93c" stroke="#9e6b00" stroke-width="2.2"/>
        <line x1="${x + era + 8}" y1="${y}" x2="${x + era + bodyW}" y2="${y}" stroke="#d96a00" stroke-width="2"/>
        <polygon points="${x + era + 5 + bodyW},${y - h / 2} ${x2},${y} ${x + era + 5 + bodyW},${y + h / 2}" fill="#ffe5c4" stroke="#9e6b00" stroke-width="2.2" stroke-linejoin="round"/>
        <polygon points="${x2 - tip * 0.42},${y - h * 0.21} ${x2},${y} ${x2 - tip * 0.42},${y + h * 0.21}" fill="#2b2340"/>
      </g>`;
    }
    case "crayon": {
      const tip = Math.min(20, w * 0.18), bh = h - 2;
      const bw = Math.max(14, w - tip);
      return `<g>
        <rect x="${x}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="3" fill="#1d7fe0" stroke="#135ea9" stroke-width="2.2"/>
        <rect x="${x + bw * 0.18}" y="${y - bh / 2}" width="${bw * 0.64}" height="${bh}" fill="#5bb4ff" stroke="#135ea9" stroke-width="1.6"/>
        <polygon points="${x + bw},${y - bh / 2 + 2} ${x2},${y - 3} ${x2},${y + 3} ${x + bw},${y + bh / 2 - 2}" fill="#135ea9"/>
      </g>`;
    }
    case "ribbon": {
      const notch = Math.min(14, w * 0.16);
      return `<polygon points="${x},${y - h / 2} ${x2},${y - h / 2} ${x2 - notch},${y} ${x2},${y + h / 2} ${x},${y + h / 2}" fill="#ff6b70" stroke="#a5262c" stroke-width="2.4" stroke-linejoin="round"/>`;
    }
    case "key": {
      const bowR = h * 0.56, bx = x + bowR, sy = y;
      return `<g>
        <circle cx="${bx}" cy="${sy}" r="${bowR}" fill="#ffd45c" stroke="#9e6b00" stroke-width="2.5"/>
        <circle cx="${bx}" cy="${sy}" r="${bowR * 0.38}" fill="#fffdf7" stroke="#9e6b00" stroke-width="2"/>
        <rect x="${bx + bowR - 3}" y="${sy - 4.5}" width="${Math.max(10, w - bowR * 2 + 3)}" height="9" rx="3" fill="#ffd45c" stroke="#9e6b00" stroke-width="2.2"/>
        <rect x="${x2 - 16}" y="${sy + 3}" width="6" height="9" rx="1.5" fill="#ffd45c" stroke="#9e6b00" stroke-width="1.8"/>
        <rect x="${x2 - 7}" y="${sy + 3}" width="7" height="11" rx="1.5" fill="#ffd45c" stroke="#9e6b00" stroke-width="1.8"/>
      </g>`;
    }
    case "bookmark":
    case "leaf":
    case "feather":
    default: {
      const col = kind === "leaf" ? ["#37c977", "#137a41"] : kind === "feather" ? ["#b07bff", "#6429a6"] : ["#ff9d2e", "#b35900"];
      const cy = y;
      return `<g>
        <rect x="${x}" y="${cy - h * 0.44}" width="${w}" height="${h * 0.88}" rx="${h * 0.42}" fill="${col[0]}" stroke="${col[1]}" stroke-width="2.4"/>
        <line x1="${x + 10}" y1="${cy}" x2="${x2 - 10}" y2="${cy}" stroke="#fffdf7" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
      </g>`;
    }
  }
}

/** Side-by-side length/height comparison SVG (`vertical: false` horizontal, `true` vertical towers/candles). */
export function compareLengthSvg(a, b, { vertical = false, size = 290 } = {}) {
  if (vertical) {
    const W = 250, H = 190, baseY = 166;
    const drawTower = (it, cx) => {
      const th = Math.round(it.units * 22);
      const col = it.color ?? "#1d7fe0";
      const rim = it.stroke ?? "#135ea9";
      return `<rect x="${cx - 26}" y="${baseY - th}" width="52" height="${th}" rx="8" fill="${col}" stroke="${rim}" stroke-width="3"/>
        <line x1="${cx - 26}" y1="${baseY - th * 0.5}" x2="${cx + 26}" y2="${baseY - th * 0.5}" stroke="#fff" stroke-width="1.5" opacity=".45"/>
        <text x="${cx}" y="${baseY + 18}" text-anchor="middle" font-size="13" font-weight="800" fill="#2b2340">${esc(it.label)}</text>`;
    };
    return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
      <line x1="20" y1="${baseY}" x2="${W - 20}" y2="${baseY}" stroke="#c2d6ed" stroke-width="3" stroke-linecap="round"/>
      ${drawTower(a, 78)}${drawTower(b, 172)}
    </svg>`;
  }

  const W = 320, H = 152, leftX = 36, pxPer = 32;
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
    <line x1="${leftX}" y1="16" x2="${leftX}" y2="138" stroke="#135ea9" stroke-width="2.5" stroke-dasharray="5 4"/>
    <text x="${leftX + 4}" y="14" font-size="11" font-weight="800" fill="#135ea9">Start line</text>
    ${objectArt(a.kind, leftX, 52, a.units * pxPer, 26)}
    <text x="${leftX + a.units * pxPer + 8}" y="56" font-size="13" font-weight="800" fill="#2b2340">${esc(a.label)}</text>
    ${objectArt(b.kind, leftX, 108, b.units * pxPer, 26)}
    <text x="${leftX + b.units * pxPer + 8}" y="112" font-size="13" font-weight="800" fill="#2b2340">${esc(b.label)}</text>
  </svg>`;
}

/**
 * Interactive/static Ruler SVG with physical margin BEFORE 0!
 * `rulerOffset` shifts the ruler in half-cap steps (`rulerOffset = 0` aligns `0` with object start at `OBJ_LEFT_X`).
 * Setting `rulerOffset = 1` models lining up the wooden LEFT EDGE instead of `0`!
 */
export function rulerSvg({
  unit = "in", max = 6, quarterTicks = false, obj = null,
  rulerOffset = 0, showZeroGuide = false, showAnswer = false, size = 340,
} = {}) {
  const W = 380, H = obj ? 148 : 96;
  const OBJ_LEFT_X = 64;
  const CAP = 22; // plastic margin before the 0 line
  const maxSpan = max <= 6 ? 264 : 272;
  const stepPx = maxSpan / max;
  const zeroX = OBJ_LEFT_X + rulerOffset * CAP;
  const rX = zeroX - CAP;
  const rW = CAP + max * stepPx + 14;
  const rY = obj ? 66 : 20, rH = 54;

  let ticks = "";
  const sub = quarterTicks ? 4 : unit === "cm" ? 2 : 2;
  for (let u = 0; u <= max; u++) {
    for (let s = 0; s < (u === max ? 1 : sub); s++) {
      const val = u + s / sub;
      const x = zeroX + val * stepPx;
      const th = s === 0 ? 22 : (quarterTicks && s === 2) || !quarterTicks ? 15 : 10;
      const isZero = u === 0 && s === 0;
      ticks += `<line x1="${x.toFixed(1)}" y1="${rY}" x2="${x.toFixed(1)}" y2="${rY + th}" stroke="${isZero ? "#e5484d" : "#5a3c00"}" stroke-width="${isZero ? 3.2 : s === 0 ? 2.2 : 1.4}" stroke-linecap="round"/>`;
      if (s === 0) {
        ticks += `<text x="${x.toFixed(1)}" y="${rY + 38}" text-anchor="middle" font-size="${isZero ? 14 : 12.5}" font-weight="900" fill="${isZero ? "#e5484d" : "#2b2340"}">${u}</text>`;
      }
    }
  }

  const objW = obj ? obj.units * stepPx : 0;
  const objEnd = OBJ_LEFT_X + objW;
  const aligned = rulerOffset === 0;
  const guides = showZeroGuide && obj ? `
    <line x1="${OBJ_LEFT_X}" y1="12" x2="${OBJ_LEFT_X}" y2="${rY + 18}" stroke="${aligned ? "#16a34a" : "#e5484d"}" stroke-width="2.4" stroke-dasharray="4 3"/>
    <text x="${OBJ_LEFT_X}" y="11" text-anchor="middle" font-size="10.5" font-weight="900" fill="${aligned ? "#137a41" : "#e5484d"}">${aligned ? "0 mark ✓" : "line up 0!"}</text>` : "";
  const ansGuide = showAnswer && obj ? `
    <line x1="${objEnd.toFixed(1)}" y1="22" x2="${objEnd.toFixed(1)}" y2="${rY + 24}" stroke="#1d7fe0" stroke-width="2.4" stroke-dasharray="4 3"/>` : "";

  const unitTag = `<text x="${rX + rW - 10}" y="${rY + 42}" text-anchor="end" font-size="11.5" font-weight="900" fill="#7a5200">${esc(unit)}</text>`;

  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg ruler-svg" aria-hidden="true">
    ${obj ? objectArt(obj.kind, OBJ_LEFT_X, 34, objW, 26) : ""}
    ${guides}${ansGuide}
    <rect x="${rX}" y="${rY}" width="${rW}" height="${rH}" rx="8" fill="#ffe580" stroke="#9e6b00" stroke-width="2.8"/>
    <rect x="${rX + 1.5}" y="${rY + 1.5}" width="${Math.max(4, CAP - 2)}" height="${rH - 3}" rx="6" fill="#ffd45c" opacity=".65"/>
    ${ticks}${unitTag}
  </svg>`;
}

/** Analog clock SVG (`1–12`), proportional red hour hand & blue minute hand, optional outer 05..60 helper ring. */
export function clockSvg({ hour = 3, minute = 0, showMinuteRing = false, showHands = true, size = 195 } = {}) {
  const cx = 110, cy = 110, r = 86;
  const rad = (deg) => ((deg - 90) * Math.PI) / 180;
  const pt = (deg, rr) => [cx + rr * Math.cos(rad(deg)), cy + rr * Math.sin(rad(deg))];

  let marks = "";
  for (let m = 0; m < 60; m++) {
    const major = m % 5 === 0;
    const [x1, y1] = pt(m * 6, r - 2), [x2, y2] = pt(m * 6, r - (major ? 10 : 5));
    marks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${major ? "#135ea9" : "#9bc2ec"}" stroke-width="${major ? 2.6 : 1.3}" stroke-linecap="round"/>`;
  }
  let nums = "";
  for (let h = 1; h <= 12; h++) {
    const [nx, ny] = pt(h * 30, r - 22);
    nums += `<text x="${nx.toFixed(1)}" y="${(ny + 5.5).toFixed(1)}" text-anchor="middle" font-size="16" font-weight="900" fill="#2b2340">${h}</text>`;
    if (showMinuteRing) {
      const mVal = h === 12 ? "00" : String(h * 5).padStart(2, "0");
      const [ox, oy] = pt(h * 30, r + 15);
      nums += `<text x="${ox.toFixed(1)}" y="${(oy + 4).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#135ea9">:${mVal}</text>`;
    }
  }

  let hands = "";
  if (showHands) {
    const minDeg = minute * 6;
    const hrDeg = ((hour % 12) + minute / 60) * 30;
    const [hx, hy] = pt(hrDeg, r - 38);
    const [mx, my] = pt(minDeg, r - 18);
    hands = `<line x1="${cx}" y1="${cy}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#1d7fe0" stroke-width="5" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#e5484d" stroke-width="7.5" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="6.5" fill="#2b2340"/>`;
  }

  return `<svg ${NS} viewBox="0 0 220 220" width="${size}" height="${size}" class="geo-svg clock-svg" aria-hidden="true">
    <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="#fffdf7" stroke="#135ea9" stroke-width="5"/>
    ${marks}${nums}${hands}
  </svg>`;
}

export const MONEY_META = {
  penny: { label: "Penny", cents: 1, tag: "1¢", bill: false },
  nickel: { label: "Nickel", cents: 5, tag: "5¢", bill: false },
  dime: { label: "Dime", cents: 10, tag: "10¢", bill: false },
  quarter: { label: "Quarter", cents: 25, tag: "25¢", bill: false },
  d1: { label: "$1 Bill", cents: 100, tag: "$1", bill: true },
  d5: { label: "$5 Bill", cents: 500, tag: "$5", bill: true },
  d10: { label: "$10 Bill", cents: 1000, tag: "$10", bill: true },
  d20: { label: "$20 Bill", cents: 2000, tag: "$20", bill: true },
};

function drawCurrencyShape(kind, cx, cy, s = 1) {
  const m = MONEY_META[kind];
  if (!m) return "";
  if (m.bill) {
    const bw = 66 * s, bh = 34 * s;
    return `<g>
      <rect x="${cx - bw / 2}" y="${cy - bh / 2}" width="${bw}" height="${bh}" rx="6" fill="#dcf6e6" stroke="#137a41" stroke-width="2.5"/>
      <rect x="${cx - bw / 2 + 4}" y="${cy - bh / 2 + 4}" width="${bw - 8}" height="${bh - 8}" rx="3" fill="none" stroke="#1ea55b" stroke-width="1.3" stroke-dasharray="3 2"/>
      <text x="${cx}" y="${cy + 5.5 * s}" text-anchor="middle" font-size="${14 * s}" font-weight="900" fill="#0f5f32">${m.tag}</text>
    </g>`;
  }
  const spec = {
    penny: { r: 19, fill: "#df8857", rim: "#944017", ink: "#4a1b04" },
    nickel: { r: 22, fill: "#e1e7ef", rim: "#68778c", ink: "#243247" },
    dime: { r: 17, fill: "#edf2f7", rim: "#5b6c82", ink: "#1f2e42" },
    quarter: { r: 26, fill: "#dbe4ee", rim: "#495970", ink: "#1b2738" },
  }[kind];
  const r = spec.r * s;
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${spec.fill}" stroke="${spec.rim}" stroke-width="2.6"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 4 * s}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".65"/>
    <text x="${cx}" y="${cy + 4.5 * s}" text-anchor="middle" font-size="${12.5 * s}" font-weight="900" fill="${spec.ink}">${m.tag}</text>
  </g>`;
}

/** Single US coin or bill SVG. */
export function coinSvg(kind, { size = 64 } = {}) {
  const bill = MONEY_META[kind]?.bill;
  const W = bill ? 86 : 66, H = bill ? 50 : 66;
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${bill ? Math.round(size * 1.25) : size}" height="${bill ? Math.round(size * 0.72) : size}" class="geo-svg coin-svg" aria-hidden="true">
    ${drawCurrencyShape(kind, W / 2, H / 2, 1)}
  </svg>`;
}

/** Light-paper tray holding US coins and/or bills (`counts` = `{ quarter: 1, dime: 2, ... }`). */
export function moneyTraySvg(counts, { size = 320 } = {}) {
  const order = ["d20", "d10", "d5", "d1", "quarter", "dime", "nickel", "penny"];
  const items = [];
  for (const k of order) for (let i = 0; i < (counts?.[k] || 0); i++) items.push(k);
  const cols = Math.max(1, Math.min(5, items.length || 1));
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const cellW = 70, cellH = 56, pad = 16;
  const W = Math.max(200, cols * cellW + pad * 2);
  const H = Math.max(82, rows * cellH + pad * 2);
  const drawn = items.map((k, idx) => {
    const r = Math.floor(idx / cols), c = idx % cols;
    const x = pad + c * cellW + cellW / 2;
    const y = pad + r * cellH + cellH / 2;
    return drawCurrencyShape(k, x, y, 0.88);
  }).join("");
  const empty = !items.length ? `<text x="${W / 2}" y="${H / 2 + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="#6d6680">Tap coins/bills below to add them here</text>` : "";
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
    <rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="18" fill="#fffdf7" stroke="#d9c6a5" stroke-width="2.5" stroke-dasharray="6 5"/>
    ${drawn}${empty}
  </svg>`;
}

/** Two-pan balance scale SVG (`tilt`: -1 = left heavier/lower, 0 = equal, +1 = right heavier/lower). */
export function scaleSvg({ left = { e: "🍎", label: "Apple" }, right = { e: "🪶", label: "Feather" }, tilt = 0, size = 265 } = {}) {
  const ang = tilt * 10;
  const rad = (ang * Math.PI) / 180;
  const bx = 140, by = 68, arm = 82;
  const lx = bx - arm * Math.cos(rad), ly = by - arm * Math.sin(rad);
  const rx = bx + arm * Math.cos(rad), ry = by + arm * Math.sin(rad);
  const pan = (px, py, it) => `
    <line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px - 18).toFixed(1)}" y2="${(py + 34).toFixed(1)}" stroke="#6d6680" stroke-width="2.2"/>
    <line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${(px + 18).toFixed(1)}" y2="${(py + 34).toFixed(1)}" stroke="#6d6680" stroke-width="2.2"/>
    <path d="M ${(px - 28).toFixed(1)} ${(py + 34).toFixed(1)} Q ${px.toFixed(1)} ${(py + 48).toFixed(1)} ${(px + 28).toFixed(1)} ${(py + 34).toFixed(1)} Z" fill="#ffd45c" stroke="#9e6b00" stroke-width="2.4"/>
    <text x="${px.toFixed(1)}" y="${(py + 29).toFixed(1)}" text-anchor="middle" font-size="25">${esc(it.e ?? "")}</text>
    <rect x="${(px - 38).toFixed(1)}" y="${(py + 52).toFixed(1)}" width="76" height="22" rx="9" fill="#e3f0ff" stroke="#9bc2ec" stroke-width="1.6"/>
    <text x="${px.toFixed(1)}" y="${(py + 67).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#0f4f91">${esc(it.label ?? "")}</text>`;

  return `<svg ${NS} viewBox="0 0 280 185" width="${size}" height="${Math.round(size * (185 / 280))}" class="geo-svg" aria-hidden="true">
    <polygon points="104,174 176,174 150,152 130,152" fill="#9bc2ec" stroke="#135ea9" stroke-width="2.5"/>
    <line x1="${bx}" y1="152" x2="${bx}" y2="${by}" stroke="#135ea9" stroke-width="6" stroke-linecap="round"/>
    <line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#2b2340" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="${bx}" cy="${by}" r="7" fill="#ff8a00" stroke="#2b2340" stroke-width="2.2"/>
    ${pan(lx, ly, left)}${pan(rx, ry, right)}
  </svg>`;
}

/** Graduated liquid measuring pitcher SVG (`target` optional dashed guide line). */
export function pitcherSvg({ capacity = 4, fill = 2, unit = "cups", label = "", target = null, size = 165 } = {}) {
  const ratio = Math.max(0, Math.min(1, fill / capacity));
  const jX = 46, jY = 26, jW = 86, jH = 118, r = 10;
  const waterH = jH * ratio;
  const waterY = jY + jH - waterH;
  const tickStep = capacity <= 6 ? 1 : capacity <= 12 ? 2 : capacity / 4;
  let ticks = "";
  for (let v = tickStep; v <= capacity + 1e-6; v += tickStep) {
    const ty = jY + jH - (v / capacity) * jH;
    ticks += `<line x1="${jX + jW - 18}" y1="${ty.toFixed(1)}" x2="${jX + jW}" y2="${ty.toFixed(1)}" stroke="#135ea9" stroke-width="2"/>
      <text x="${jX + jW - 22}" y="${(ty + 4).toFixed(1)}" text-anchor="end" font-size="11" font-weight="800" fill="#135ea9">${Math.round(v)}</text>`;
  }
  const targY = target != null ? jY + jH - (target / capacity) * jH : null;
  const targetGuide = targY != null ? `<line x1="${jX - 6}" y1="${targY.toFixed(1)}" x2="${jX + jW + 6}" y2="${targY.toFixed(1)}" stroke="#e5484d" stroke-width="2.8" stroke-dasharray="5 4"/>
    <text x="${jX - 9}" y="${(targY + 4).toFixed(1)}" text-anchor="end" font-size="10.5" font-weight="900" fill="#e5484d">Goal</text>` : "";

  const water = waterH <= 0 ? "" : waterH >= jH - 2
    ? `<rect x="${jX + 2}" y="${jY + 2}" width="${jW - 4}" height="${jH - 4}" rx="${r}" fill="#5bb4ff" fill-opacity=".82"/>`
    : `<path d="M ${jX + 2} ${waterY.toFixed(1)} L ${jX + jW - 2} ${waterY.toFixed(1)} L ${jX + jW - 2} ${jY + jH - r - 2} Q ${jX + jW - 2} ${jY + jH - 2} ${jX + jW - r - 2} ${jY + jH - 2} L ${jX + r + 2} ${jY + jH - 2} Q ${jX + 2} ${jY + jH - 2} ${jX + 2} ${jY + jH - r - 2} Z" fill="#5bb4ff" fill-opacity=".82"/>`;

  return `<svg ${NS} viewBox="0 0 185 182" width="${size}" height="${Math.round(size * (182 / 185))}" class="geo-svg" aria-hidden="true">
    <path d="M ${jX + jW} ${jY + 18} C ${jX + jW + 26} ${jY + 18}, ${jX + jW + 26} ${jY + 84}, ${jX + jW} ${jY + 84}" fill="none" stroke="#135ea9" stroke-width="6" stroke-linecap="round"/>
    <rect x="${jX}" y="${jY}" width="${jW}" height="${jH}" rx="${r + 2}" fill="#f3f8ff" stroke="#135ea9" stroke-width="3.5"/>
    ${water}
    ${ticks}${targetGuide}
    <text x="${jX + jW / 2}" y="164" text-anchor="middle" font-size="12.5" font-weight="900" fill="#2b2340">${esc(label || `${fill} ${unit}`)}</text>
  </svg>`;
}

/** Tally, picture, bar charts, and fractional line plots. */
export function chartSvg({
  kind = "bar", title = "", rows = [], scale = 1, icon = "⭐", unit = "",
  points = [], range = [0, 4], step = 0.25, interactive = false, size = 320,
} = {}) {
  if (kind === "tally") {
    const W = 310, H = 44 + rows.length * 38 + 12;
    const drawTally = (x0, y0, n) => {
      let s = "";
      for (let i = 0; i < n; i++) {
        const g = Math.floor(i / 5), k = i % 5;
        const gx = x0 + g * 34;
        if (k < 4) s += `<line x1="${gx + k * 6}" y1="${y0 - 9}" x2="${gx + k * 6}" y2="${y0 + 9}" stroke="#135ea9" stroke-width="2.6" stroke-linecap="round"/>`;
        else s += `<line x1="${gx - 3}" y1="${y0 + 7}" x2="${gx + 21}" y2="${y0 - 7}" stroke="#e5484d" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      return s;
    };
    const body = rows.map((r, i) => {
      const y = 52 + i * 38;
      return `<rect x="12" y="${y - 16}" width="${W - 24}" height="32" rx="10" fill="${i % 2 ? "#f4f8ff" : "#fffdf7"}" stroke="#d7e6f7"/>
        <text x="24" y="${y + 5}" font-size="13.5" font-weight="800" fill="#2b2340">${esc(r.label)}</text>
        ${drawTally(134, y, r.count ?? r.value ?? 0)}`;
    }).join("");
    return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
      <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#fffdf7" stroke="#d7e6f7" stroke-width="2"/>
      <text x="${W / 2}" y="25" text-anchor="middle" font-size="14" font-weight="900" fill="#135ea9">${esc(title)}</text>
      ${body}
    </svg>`;
  }

  if (kind === "picture") {
    const W = 320, H = 42 + rows.length * 38 + 34;
    const body = rows.map((r, i) => {
      const y = 52 + i * 38;
      const icons = Math.max(1, Math.round((r.value ?? r.count ?? 0) / scale));
      const em = Array.from({ length: icons }, () => icon).join(" ");
      return `<rect x="12" y="${y - 15}" width="${W - 24}" height="32" rx="10" fill="${i % 2 ? "#f4f8ff" : "#fffdf7"}" stroke="#d7e6f7"/>
        <text x="22" y="${y + 5}" font-size="13" font-weight="800" fill="#2b2340">${esc(r.label)}</text>
        <text x="116" y="${y + 6}" font-size="17">${em}</text>`;
    }).join("");
    return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
      <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#fffdf7" stroke="#d7e6f7" stroke-width="2"/>
      <text x="${W / 2}" y="24" text-anchor="middle" font-size="14" font-weight="900" fill="#135ea9">${esc(title)}</text>
      ${body}
      <text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="#d96a00">Key: 1 ${icon} = ${scale} ${esc(unit || "items")}</text>
    </svg>`;
  }

  if (kind === "bar") {
    const W = 320, H = 195, padL = 42, padB = 34, padT = 32, padR = 16;
    const rowVal = (r) => r.value ?? r.count ?? 0;
    const maxVal = Math.max(4, ...rows.map(rowVal));
    const rawStep = Math.max(1, scale || 1);
    const tickStep = Math.ceil(maxVal / rawStep) > 6 ? rawStep * 2 : rawStep;
    const ceilVal = Math.ceil(maxVal / tickStep) * tickStep;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const colors = ["#1d7fe0", "#1ea55b", "#ff8a00", "#8b46d6"];
    let grid = "";
    const steps = Math.max(2, Math.round(ceilVal / tickStep));
    for (let i = 0; i <= steps; i++) {
      const val = i * tickStep;
      const gy = padT + plotH - (val / ceilVal) * plotH;
      grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" stroke="${i === 0 ? "#135ea9" : "#d7e6f7"}" stroke-width="${i === 0 ? 2.4 : 1.3}"/>
        <text x="${padL - 8}" y="${(gy + 4).toFixed(1)}" text-anchor="end" font-size="11.5" font-weight="800" fill="#4f4668">${val}</text>`;
    }
    const barSlot = plotW / Math.max(1, rows.length), bw = Math.min(46, barSlot * 0.62);
    const bars = rows.map((r, i) => {
      const bh = (rowVal(r) / ceilVal) * plotH;
      const bx = padL + i * barSlot + (barSlot - bw) / 2;
      const by = padT + plotH - bh;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" fill="${colors[i % colors.length]}"/>
        <text x="${(bx + bw / 2).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="#2b2340">${esc(r.label)}</text>`;
    }).join("");
    return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
      <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#fffdf7" stroke="#d7e6f7" stroke-width="2"/>
      <text x="${W / 2}" y="21" text-anchor="middle" font-size="13.5" font-weight="900" fill="#135ea9">${esc(title)}</text>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#135ea9" stroke-width="2.4"/>
      ${grid}${bars}
    </svg>`;
  }

  // kind === "lineplot"
  const [rMin, rMax] = range;
  const ticksCount = Math.round((rMax - rMin) / step);
  const counts = {};
  for (const p of points) {
    const key = (Math.round(p * 8) / 8).toFixed(3);
    counts[key] = (counts[key] || 0) + 1;
  }
  const maxStack = Math.max(2, ...Object.values(counts));
  const W = 350, H = 76 + maxStack * 20;
  const baseY = H - 38, xL = 28, xR = W - 28;
  const px = (v) => xL + ((v - rMin) / Math.max(0.25, rMax - rMin)) * (xR - xL);

  let marks = "", xs = "", hits = "";
  for (let i = 0; i <= ticksCount; i++) {
    const val = Math.round((rMin + i * step) * 8) / 8;
    const x = px(val);
    const whole = Math.abs(val - Math.round(val)) < 1e-6;
    const showLbl = whole || step >= 0.25 || i % 2 === 0;
    marks += `<line x1="${x.toFixed(1)}" y1="${baseY - (whole ? 8 : 5)}" x2="${x.toFixed(1)}" y2="${baseY + (whole ? 8 : 5)}" stroke="#135ea9" stroke-width="${whole ? 2.4 : 1.5}"/>`;
    if (showLbl) {
      marks += `<text x="${x.toFixed(1)}" y="${baseY + 23}" text-anchor="middle" font-size="${whole ? 12.5 : 10.5}" font-weight="${whole ? 900 : 700}" fill="${whole ? "#2b2340" : "#4f4668"}">${fracLabel(val)}</text>`;
    }
    const c = counts[val.toFixed(3)] || 0;
    for (let k = 0; k < c; k++) {
      const xy = baseY - 17 - k * 19;
      xs += `<text x="${x.toFixed(1)}" y="${xy}" text-anchor="middle" font-size="16" font-weight="900" fill="#e5484d">✕</text>`;
    }
    if (interactive) {
      hits += `<g class="plot-hit" data-val="${val}" role="button" tabindex="0" aria-label="Plot X at ${fracLabel(val)}">
        <rect x="${(x - 13).toFixed(1)}" y="${baseY - 46}" width="26" height="60" rx="8" fill="transparent"/>
        <circle class="hit-ring" cx="${x.toFixed(1)}" cy="${baseY - 18}" r="7" fill="#ff8a00" fill-opacity=".22"/>
      </g>`;
    }
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg">
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#fffdf7" stroke="#d7e6f7" stroke-width="2"/>
    <text x="${W / 2}" y="20" text-anchor="middle" font-size="13" font-weight="900" fill="#135ea9">${esc(title)}${unit ? ` (${esc(unit)})` : ""}</text>
    <line x1="${xL}" y1="${baseY}" x2="${xR}" y2="${baseY}" stroke="#135ea9" stroke-width="3" stroke-linecap="round"/>
    ${marks}${xs}${hits}
  </svg>`;
}

/** 7-column calendar month SVG (`startDow`: 0=Sun..6=Sat). */
export function calendarSvg({ month = "October", startDow = 2, days = 31, highlightDay = null, markDays = [], size = 268 } = {}) {
  const cols = 7, rows = Math.ceil((startDow + days) / 7);
  const cw = 36, ch = 28, padX = 12, topH = 48;
  const W = padX * 2 + cols * cw, H = topH + rows * ch + 10;
  const dows = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const heads = dows.map((d, c) => `<text x="${padX + c * cw + cw / 2}" y="42" text-anchor="middle" font-size="11" font-weight="800" fill="#135ea9">${d}</text>`).join("");
  const markMap = Object.fromEntries(markDays.map((m) => [m.day, m.emoji]));
  let cells = "";
  for (let d = 1; d <= days; d++) {
    const slot = startDow + d - 1;
    const r = Math.floor(slot / 7), c = slot % 7;
    const x = padX + c * cw, y = topH + r * ch;
    const isHi = d === highlightDay;
    const em = markMap[d];
    cells += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="6" fill="${isHi ? "#fff4cc" : em ? "#dcf6e6" : "#fff"}" stroke="${isHi ? "#ff8a00" : "#e3f0ff"}" stroke-width="${isHi ? 2.2 : 1.2}"/>
      <text x="${x + cw / 2}" y="${y + (em ? 12 : 18)}" text-anchor="middle" font-size="${em ? 9.5 : 12}" font-weight="800" fill="#2b2340">${d}</text>
      ${em ? `<text x="${x + cw / 2}" y="${y + 23}" text-anchor="middle" font-size="11">${em}</text>` : ""}`;
  }
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="#fffdf7" stroke="#135ea9" stroke-width="2.4"/>
    <rect x="2" y="2" width="${W - 4}" height="24" rx="14" fill="#ff8a00"/>
    <text x="${W / 2}" y="19" text-anchor="middle" font-size="13.5" font-weight="900" fill="#fff">${esc(month)}</text>
    ${heads}${cells}
  </svg>`;
}

/** Unit-square rectangle showing Perimeter (orange outline) and/or Area (blue interior squares). */
export function rectGridSvg({ rows = 3, cols = 4, unit = "ft", mode = "both", showDims = true, size = 215 } = {}) {
  const step = 30, padL = 36, padT = 26, padR = 24, padB = 30;
  const W = padL + cols * step + padR, H = padT + rows * step + padB;
  let sq = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      sq += `<rect x="${padL + c * step}" y="${padT + r * step}" width="${step}" height="${step}" fill="${mode === "perimeter" ? "#fffdf7" : "#bfe3ff"}" stroke="#7cb6ee" stroke-width="1.4"/>`;
    }
  }
  const outline = `<rect x="${padL}" y="${padT}" width="${cols * step}" height="${rows * step}" fill="none" stroke="${mode === "area" ? "#135ea9" : "#e56b00"}" stroke-width="${mode === "area" ? 3 : 4.5}" stroke-linejoin="round"/>`;
  const dims = showDims ? `
    <text x="${padL + (cols * step) / 2}" y="${padT - 8}" text-anchor="middle" font-size="13.5" font-weight="900" fill="#2b2340">${cols} ${esc(unit)}</text>
    <text x="${padL - 8}" y="${padT + (rows * step) / 2 + 4}" text-anchor="end" font-size="13.5" font-weight="900" fill="#2b2340">${rows} ${esc(unit)}</text>` : "";
  return `<svg ${NS} viewBox="0 0 ${W} ${H}" width="${size}" height="${Math.round(size * (H / W))}" class="geo-svg" aria-hidden="true">${sq}${outline}${dims}</svg>`;
}

/** Visual Unit Conversion Card SVG for Grade 4–5 Montessori Intro. */
export function conversionCardSvg({ leftText, rightText, sub = "", color = "#e3f0ff", stroke = "#135ea9", size = 215 } = {}) {
  return `<svg ${NS} viewBox="0 0 240 124" width="${size}" height="${Math.round(size * (124 / 240))}" class="geo-svg" aria-hidden="true">
    <rect x="6" y="10" width="228" height="104" rx="18" fill="#fffdf7" stroke="${stroke}" stroke-width="2.6"/>
    <rect x="16" y="26" width="90" height="44" rx="12" fill="${color}" stroke="${stroke}" stroke-width="2"/>
    <text x="61" y="53" text-anchor="middle" font-size="15" font-weight="900" fill="#2b2340">${esc(leftText)}</text>
    <text x="120" y="54" text-anchor="middle" font-size="20" font-weight="900" fill="#d96a00">=</text>
    <rect x="134" y="26" width="90" height="44" rx="12" fill="#fff4cc" stroke="#d96a00" stroke-width="2"/>
    <text x="179" y="53" text-anchor="middle" font-size="15" font-weight="900" fill="#2b2340">${esc(rightText)}</text>
    <text x="120" y="96" text-anchor="middle" font-size="12" font-weight="800" fill="#4f4668">${esc(sub)}</text>
  </svg>`;
}
