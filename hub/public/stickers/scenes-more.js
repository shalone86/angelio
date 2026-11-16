// More Sticker World playsets: the seasons, nature and adventure, the Moon and space, and holy places.
// Each is an SVG scene (400 × 250) that unlocks with more stars (giant sticker 2, mini 1).

const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id})"/>`;
const cloud = (x, y, s = 1, c = "#fff") => `<g fill="${c}" opacity=".9" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="26" ry="11"/><circle cx="-8" cy="-8" r="11"/><circle cx="9" cy="-9" r="13"/></g>`;
const sun = (x, y, r = 24, c = "#ffd54a") => `<circle cx="${x}" cy="${y}" r="${r + 10}" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const stars = (n, seed = 3, h = 140) => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 97 + seed * 31) % 400}" cy="${(i * 53 + seed * 17) % h}" r="${0.8 + ((i * 7) % 3) * 0.5}" fill="#fff" opacity="${0.5 + ((i * 13) % 5) / 10}"/>`).join("");
const hill = (y, c, amp = 30, ph = 0) => `<path d="M0 ${y} Q${100 + ph} ${y - amp} 200 ${y - 5} T400 ${y - 10} V250 H0Z" fill="${c}"/>`;
const pine = (x, y, s = 1, c = "#2f7d4a", trunk = "#6b4423") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="0" width="6" height="12" fill="${trunk}"/><path d="M0 -46 L18 -14 H8 L22 6 H-22 L-8 -14 H-18Z" fill="${c}"/></g>`;
const snowPine = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="0" width="6" height="12" fill="#6b4423"/><path d="M0 -46 L18 -14 H8 L22 6 H-22 L-8 -14 H-18Z" fill="#2f6d5a"/><path d="M0 -46 L9 -30 H-9Z M-12 -16 H12 L8 -12 H-8Z M-16 2 H16 L12 6 H-12Z" fill="#fff"/></g>`;
const tree = (x, y, s = 1, c = "#4caf50", fruit = "") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-6" width="8" height="26" fill="#7a4e26"/><circle cx="0" cy="-20" r="20" fill="${c}"/><circle cx="-14" cy="-10" r="12" fill="${c}"/><circle cx="14" cy="-10" r="12" fill="${c}"/>${fruit ? [[-8, -22], [7, -14], [-12, -6], [10, -28], [2, -4]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3" fill="${fruit}"/>`).join("") : ""}</g>`;
const palm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q4 -30 -2 -60" stroke="#8a5a2b" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#3fae5a"><path d="M-2 -60 Q-30 -70 -46 -52 Q-26 -60 -2 -56Z"/><path d="M-2 -60 Q26 -72 44 -54 Q24 -60 -2 -56Z"/><path d="M-2 -60 Q-20 -84 -36 -82 Q-18 -72 -2 -58Z"/><path d="M-2 -60 Q16 -86 34 -84 Q16 -72 -2 -58Z"/></g></g>`;
const cactus = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#4f9d4f"><rect x="-6" y="-46" width="12" height="46" rx="6"/><path d="M-6 -24 h-10 a5 5 0 0 1 -5 -5 v-12 a5 5 0 0 1 10 0 v7 h5z"/><path d="M6 -30 h10 a5 5 0 0 0 5 -5 v-10 a5 5 0 0 0 -10 0 v5 h-5z"/></g>`;
const cypress = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-26" rx="7" ry="28" fill="#2f5d3a"/><rect x="-2" y="0" width="4" height="5" fill="#6b4423"/></g>`;
const flowers = (y, n, colors, seed = 1) => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 37 + seed * 23) % 400}" cy="${y + ((i * 17) % 40)}" r="3.2" fill="${colors[i % colors.length]}"/>`).join("");
const leaves = (n, colors, seed = 2) => Array.from({ length: n }, (_, i) => `<ellipse cx="${(i * 47 + seed * 29) % 400}" cy="${30 + ((i * 61) % 200)}" rx="4" ry="2.4" fill="${colors[i % colors.length]}" transform="rotate(${(i * 37) % 180} ${(i * 47 + seed * 29) % 400} ${30 + ((i * 61) % 200)})"/>`).join("");
const snowflakes = (n) => Array.from({ length: n }, (_, i) => `<circle cx="${(i * 53) % 400}" cy="${(i * 37) % 230}" r="${1.4 + (i % 3) * 0.6}" fill="#fff" opacity=".85"/>`).join("");
const columns = (x0, y, n, gap, h) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * gap}" y="${y}" width="${gap * 0.45}" height="${h}" fill="#f4eee2" stroke="#cbbf9f" stroke-width=".8"/>`).join("");

export const MORE_SCENES = [
  // ── Seasons ──
  {
    id: "spring", name: "Spring Garden", emoji: "🌸", need: 25, color: "#ef7fb0",
    svg: `${sky("sp", "#a8e0ff", "#f0fbff")}${sun(330, 46, 22)}${cloud(90, 44)}${cloud(220, 64, .7)}
      ${hill(160, "#a6dc8a", 34)}${hill(195, "#86cc6a", 22, 40)}
      ${tree(70, 150, 1.1, "#f7b6d2")}${tree(330, 160, .9, "#f9c9de")}
      ${flowers(190, 40, ["#ff6fa8", "#ffd54a", "#b07bff", "#fff"])}
      <path d="M190 250 Q200 210 230 196" stroke="#e8cf98" stroke-width="14" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "forest", name: "Deep Forest", emoji: "🌲", need: 28, color: "#2f7d4a",
    svg: `${sky("fo", "#bfe7c8", "#eaf8ec")}
      ${[20, 70, 120, 180, 240, 300, 350, 390].map((x, i) => pine(x, 150 + (i % 2) * 8, .9, "#6aa77a")).join("")}
      ${hill(175, "#5c9e5e", 15)}
      ${[0, 55, 110, 300, 360].map((x, i) => pine(x + 20, 205 + (i % 2) * 6, 1.3, "#2f7d4a")).join("")}
      <path d="M150 250 Q190 220 230 210 T300 200" stroke="#c8a46a" stroke-width="16" fill="none" stroke-linecap="round" opacity=".8"/>
      <ellipse cx="200" cy="246" rx="200" ry="10" fill="#3f7d3f"/>`,
  },
  {
    id: "summer", name: "Summer Lake", emoji: "☀️", need: 31, color: "#ffb02e",
    svg: `${sky("su", "#6fc8ff", "#d9f3ff")}${sun(70, 50, 28, "#ffcf3a")}${cloud(250, 40)}
      ${hill(135, "#7cc46a", 28)}
      <path d="M0 160 Q200 140 400 160 V215 Q200 230 0 215Z" fill="#3aa6e0"/><path d="M40 178 h40 M160 170 h50 M280 182 h40" stroke="#bfe8ff" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 215 Q200 230 400 215 V250 H0Z" fill="#f2d79a"/>
      <path d="M300 162 h70 v5 h-70z" fill="#a8743f"/><path d="M310 167 v14 M360 167 v14" stroke="#7a4e26" stroke-width="4"/>
      ${tree(40, 150, .9)}${tree(370, 150, .8)}`,
  },
  {
    id: "farm", name: "Family Farm", emoji: "🚜", need: 34, color: "#d9634d",
    svg: `${sky("fa", "#9fdcff", "#effaff")}${sun(340, 44, 22)}${cloud(80, 40)}
      ${hill(150, "#9bd47a", 20)}
      <g transform="translate(70 92)"><rect x="0" y="34" width="90" height="62" fill="#d9634d" stroke="#8a2f22" stroke-width="2"/><path d="M-8 36 L45 0 L98 36Z" fill="#a8402f"/><rect x="30" y="58" width="30" height="38" fill="#fff4e3"/><path d="M30 58 L60 96 M60 58 L30 96" stroke="#d9634d" stroke-width="3"/><rect x="36" y="20" width="18" height="12" fill="#fff4e3"/></g>
      <g transform="translate(190 110)"><rect x="0" y="0" width="22" height="78" rx="11" fill="#c9d1d9" stroke="#8a96a3" stroke-width="2"/><path d="M0 12 a11 11 0 0 1 22 0" fill="#8a96a3"/></g>
      <path d="M0 200 H400 V250 H0Z" fill="#c8a24c"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 48} 250 L${200} 200" stroke="#a8842e" stroke-width="2"/>`).join("")}
      <path d="M230 188 h160 M230 176 h160" stroke="#fff4e3" stroke-width="4"/>${[240, 280, 320, 360].map((x) => `<path d="M${x} 170 v26" stroke="#fff4e3" stroke-width="4"/>`).join("")}`,
  },
  {
    id: "autumn", name: "Autumn Orchard", emoji: "🍂", need: 38, color: "#e0803a",
    svg: `${sky("au", "#ffd6a5", "#fff3e0")}${sun(320, 50, 22, "#ffb347")}
      ${hill(150, "#d9a441", 26)}${hill(190, "#c98a2e", 18, 40)}
      ${tree(60, 160, 1, "#e0803a", "#c0392b")}${tree(150, 150, .9, "#f0a030", "#c0392b")}${tree(250, 162, 1.05, "#d9634d", "#ffd54a")}${tree(345, 152, .9, "#e8a33d", "#c0392b")}
      ${leaves(26, ["#e0803a", "#c0392b", "#f0a030", "#a0522d"])}
      ${[90, 200, 300].map((x) => `<g transform="translate(${x} 222)"><ellipse rx="14" ry="10" fill="#ff8a2a" stroke="#c45a10" stroke-width="2"/><path d="M0 -10 v-6" stroke="#4f7a2e" stroke-width="3"/></g>`).join("")}`,
  },
  {
    id: "winter", name: "Winter Wonderland", emoji: "⛄", need: 42, color: "#6fa8dc",
    svg: `${sky("wi", "#b9d8f2", "#eef6fc")}${cloud(90, 40, 1, "#f4f8fc")}${cloud(260, 56, .8, "#f4f8fc")}
      ${hill(150, "#f4f8fc", 30)}${hill(190, "#ffffff", 20, 40)}
      ${snowPine(40, 160, 1.1)}${snowPine(90, 170, .8)}${snowPine(330, 165, 1)}${snowPine(375, 172, .8)}
      <path d="M160 214 Q200 200 250 214" stroke="#cfe3f5" stroke-width="10" fill="none" stroke-linecap="round"/>
      ${snowflakes(60)}`,
  },
  // ── Nature and adventure ──
  {
    id: "galilee", name: "Sea of Galilee", emoji: "⛵", need: 46, color: "#2f86c8",
    svg: `${sky("ga", "#ffd9a8", "#cfeaff")}${sun(320, 80, 24, "#ffbf47")}
      <path d="M0 120 Q60 90 130 112 T260 104 T400 116 V140 H0Z" fill="#b39a6a"/>
      <path d="M0 136 H400 V250 H0Z" fill="#2f86c8"/><path d="M0 136 H400 V150 H0Z" fill="#5fb0e8" opacity=".6"/>
      ${[30, 120, 230, 330].map((x, i) => `<path d="M${x} ${170 + i * 14} q15 -6 30 0" stroke="#bfe3ff" stroke-width="3" fill="none"/>`).join("")}
      <g transform="translate(150 150)"><path d="M0 30 h90 l-14 18 h-62z" fill="#8a5a2b" stroke="#5a3a1a" stroke-width="2"/><path d="M44 30 V-30" stroke="#5a3a1a" stroke-width="3"/><path d="M46 -28 L80 22 H46Z" fill="#fff4e3" stroke="#c9b9a0" stroke-width="1.5"/></g>`,
  },
  {
    id: "jungle", name: "Jungle", emoji: "🐒", need: 50, color: "#2e9e5b",
    svg: `${sky("ju", "#8fd8a8", "#d9f5df")}
      <g fill="#2e7d4a">${[0, 60, 130, 210, 290, 360].map((x, i) => `<ellipse cx="${x}" cy="${40 + (i % 2) * 20}" rx="60" ry="40"/>`).join("")}</g>
      ${[40, 160, 260, 370].map((x, i) => `<path d="M${x} 0 Q${x + 10} 60 ${x - 5} ${110 + i * 8}" stroke="#3f8a3f" stroke-width="4" fill="none"/>`).join("")}
      ${palm(70, 220, 1.2)}${palm(330, 225, 1.1)}
      <g fill="#3fae5a">${[110, 200, 280].map((x) => `<path d="M${x} 250 Q${x - 30} 200 ${x - 40} 170 Q${x - 10} 200 ${x} 250Z M${x} 250 Q${x + 30} 200 ${x + 42} 172 Q${x + 12} 200 ${x} 250Z"/>`).join("")}</g>
      <path d="M0 236 H400 V250 H0Z" fill="#4f7a2e"/>`,
  },
  {
    id: "rome", name: "St. Peter's Square", emoji: "🏛️", need: 54, color: "#c9a25c",
    svg: `${sky("ro", "#9fd3ff", "#eaf6ff")}${cloud(70, 34, .9)}${cloud(330, 40, .7)}
      <g transform="translate(200 0)">
        <rect x="-26" y="64" width="52" height="14" fill="#e8dcc4" stroke="#b9a77f"/>
        <path d="M-36 66 A36 36 0 0 1 36 66Z" fill="#9fb8c9" stroke="#6f8a9e" stroke-width="2"/>
        <path d="M0 30 v-10 M-4 24 h8" stroke="#b9a77f" stroke-width="2.5"/><rect x="-4" y="30" width="8" height="8" fill="#e8dcc4"/>
        <rect x="-70" y="78" width="140" height="58" fill="#f1e7d2" stroke="#b9a77f" stroke-width="1.5"/>
        <path d="M-74 78 H74 L0 62Z" fill="#e8dcc4" stroke="#b9a77f"/>
        ${columns(-64, 84, 8, 17, 50)}
        <rect x="-10" y="110" width="20" height="26" fill="#8a6a46"/>
      </g>
      <path d="M0 150 Q100 120 150 136 V160 H0Z" fill="#efe6d4"/><path d="M400 150 Q300 120 250 136 V160 H400Z" fill="#efe6d4"/>
      ${columns(4, 136, 9, 16, 22)}${columns(254, 136, 9, 16, 22)}
      <path d="M0 160 H400 V250 H0Z" fill="#e6dccb"/>
      <ellipse cx="200" cy="205" rx="170" ry="34" fill="none" stroke="#d1c3a8" stroke-width="3"/>
      <path d="M200 150 V200" stroke="#cbbf9f" stroke-width="7"/><path d="M196 150 L200 136 L204 150Z" fill="#cbbf9f"/><path d="M200 128 v8 M197 131 h6" stroke="#b9a77f" stroke-width="1.5"/>
      <ellipse cx="200" cy="202" rx="10" ry="3" fill="#cbbf9f"/>`,
  },
  {
    id: "desert", name: "Desert Oasis", emoji: "🐪", need: 58, color: "#e0a94a",
    svg: `${sky("de", "#ffd38a", "#fff1d6")}${sun(320, 54, 28, "#ffb02e")}
      <path d="M0 150 Q80 120 160 150 T320 140 T400 150 V250 H0Z" fill="#f0c879"/>
      <path d="M0 190 Q120 165 230 190 T400 186 V250 H0Z" fill="#e5b45e"/>
      <ellipse cx="250" cy="200" rx="60" ry="12" fill="#5fb0e8"/>
      ${palm(215, 200, .9)}${palm(290, 198, .8)}${cactus(70, 200, 1.1)}${cactus(360, 215, .8)}`,
  },
  {
    id: "mountains", name: "Mountain Top", emoji: "🏔️", need: 62, color: "#7a8fa6",
    svg: `${sky("mo", "#8fc6f0", "#eaf5ff")}${cloud(320, 40, .8)}
      <path d="M-20 200 L80 70 L170 200Z" fill="#8a9cb0"/><path d="M80 70 L60 96 L72 92 L84 104 L96 92 L102 98Z" fill="#fff"/>
      <path d="M90 210 L230 40 L370 210Z" fill="#6f8296"/><path d="M230 40 L200 78 L216 72 L232 88 L248 72 L262 80Z" fill="#fff"/>
      <path d="M260 210 L350 100 L440 210Z" fill="#8a9cb0"/><path d="M350 100 L334 120 L346 116 L358 126 L368 116Z" fill="#fff"/>
      ${hill(205, "#6aa77a", 18)}${pine(40, 230, .8, "#2f6d4a")}${pine(380, 232, .7, "#2f6d4a")}
      <path d="M0 236 H400 V250 H0Z" fill="#5c9e5e"/>`,
  },
  {
    id: "lourdes", name: "Lourdes Grotto", emoji: "🕯️", need: 66, color: "#6f8296",
    svg: `${sky("lo", "#c8e2f5", "#f2f8fc")}
      <path d="M40 250 V120 Q60 40 200 30 Q340 40 360 120 V250Z" fill="#9aa3ad"/>
      <path d="M90 250 V150 Q110 80 200 76 Q290 80 310 150 V250Z" fill="#5f6873"/>
      <g fill="#7b858f">${[[70, 90], [110, 60], [300, 70], [330, 110], [60, 170], [340, 180]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="12"/>`).join("")}</g>
      <path d="M262 110 q-6 -18 6 -26 q12 8 6 26z" fill="#ffffff" opacity=".2"/>
      <g transform="translate(270 92)"><path d="M0 0 c-8 0 -10 8 -10 14 l-3 26 h26 l-3 -26 c0 -6 -2 -14 -10 -14z" fill="#fff" stroke="#c9d6e8" stroke-width="1.2"/><path d="M-9 26 h18" stroke="#5b9bd5" stroke-width="3"/><circle cx="0" cy="-3" r="5" fill="#f7d1b0"/><circle cx="0" cy="-3" r="8" fill="none" stroke="#ffd54a" stroke-width="1.5"/></g>
      <rect x="120" y="196" width="120" height="8" fill="#6b4423"/>${Array.from({ length: 10 }, (_, i) => `<rect x="${126 + i * 11}" y="182" width="5" height="14" fill="#fff"/><path d="M${128.5 + i * 11} 182 q-2 -5 0 -8 q2 3 0 8z" fill="#ffb02e"/>`).join("")}
      <path d="M0 230 Q200 214 400 230 V250 H0Z" fill="#5fb0e8"/>`,
  },
  {
    id: "moon", name: "On the Moon", emoji: "🌕", need: 70, color: "#5a5f7a",
    svg: `<rect width="400" height="250" fill="#0b1030"/>${stars(70, 5, 160)}
      <g transform="translate(320 60)"><circle r="30" fill="#3a8ee8"/><path d="M-18 -10 q10 -10 20 0 q6 10 -6 16 q-14 2 -14 -16z M6 10 q12 -4 16 6 q-6 10 -16 4z" fill="#4caf50"/><circle r="30" fill="none" stroke="#bfe3ff" stroke-width="2" opacity=".6"/></g>
      <path d="M0 160 Q120 140 220 158 T400 150 V250 H0Z" fill="#b9bcc7"/>
      <path d="M0 200 Q160 182 300 200 T400 196 V250 H0Z" fill="#a3a7b3"/>
      ${[[70, 175, 22], [200, 215, 30], [320, 180, 16], [130, 232, 12], [360, 226, 18]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r / 3.2}" fill="#8e929e"/><ellipse cx="${x}" cy="${y - 2}" rx="${r * .8}" ry="${r / 4.4}" fill="#9a9eaa"/>`).join("")}`,
  },
  {
    id: "dinos", name: "Dinosaur Valley", emoji: "🦕", need: 75, color: "#7a9a3a",
    svg: `${sky("di", "#ffcf9a", "#fff0d8")}${sun(70, 52, 24, "#ff9d47")}
      <path d="M260 150 L310 60 L360 150Z" fill="#8a6a5a"/><path d="M300 64 q10 -18 20 -4 q-8 -12 -20 4z" fill="#ff6a3a"/><path d="M302 62 q-6 -22 6 -36" stroke="#9a9a9a" stroke-width="8" fill="none" opacity=".5"/>
      ${hill(160, "#9cbf5a", 24)}${hill(200, "#7a9a3a", 16, 30)}
      ${palm(60, 210, 1.1)}${palm(160, 206, .8)}
      <g fill="#3f8a3f">${[220, 380].map((x) => `<path d="M${x} 250 q-10 -30 -30 -40 q20 4 30 24 q6 -24 26 -34 q-14 18 -14 46z"/>`).join("")}</g>
      <path d="M0 236 H400 V250 H0Z" fill="#6a8a2e"/>`,
  },
  {
    id: "jerusalem", name: "Jerusalem", emoji: "🫒", need: 80, color: "#c9a25c",
    svg: `${sky("je", "#ffd9a8", "#f6ecda")}${sun(330, 50, 22, "#ffcf6a")}
      ${hill(140, "#c8b07a", 20)}
      <g fill="#e9d6a8" stroke="#b99a62" stroke-width="1.5">
        <rect x="30" y="90" width="60" height="70"/><rect x="100" y="70" width="70" height="90"/><rect x="230" y="80" width="60" height="80"/><rect x="300" y="96" width="70" height="64"/>
        <path d="M170 160 V100 h60 V160z"/></g>
      <path d="M180 100 a20 20 0 0 1 40 0z" fill="#f2c230" stroke="#b8860b" stroke-width="1.5"/><path d="M118 70 a17 17 0 0 1 34 0z" fill="#e8dcc4" stroke="#b99a62" stroke-width="1.5"/>
      <g fill="#7a5a3a">${[[50, 110], [70, 110], [120, 90], [150, 90], [250, 100], [270, 100], [320, 112], [350, 112]].map(([x, y]) => `<rect x="${x}" y="${y}" width="7" height="11" rx="3"/>`).join("")}</g>
      <path d="M0 160 H400 V250 H0Z" fill="#d9c08a"/>
      <path d="M0 158 H400" stroke="#c9ab70" stroke-width="10"/>${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 20 + 4}" y="146" width="10" height="8" fill="#c9ab70"/>`).join("")}
      <path d="M185 166 v-12 a15 15 0 0 1 30 0 v12z" fill="#7a5a3a"/>
      ${tree(40, 230, .8, "#8aa05a")}${tree(360, 232, .7, "#8aa05a")}`,
  },
  {
    id: "arctic", name: "The Arctic", emoji: "🐧", need: 85, color: "#7fb2d9",
    svg: `${sky("ar", "#5a7fc8", "#cfe6f8")}
      <path d="M0 40 Q100 70 200 40 T400 50" stroke="#6fe0b0" stroke-width="16" fill="none" opacity=".45"/><path d="M0 70 Q120 100 240 70 T400 84" stroke="#b07bff" stroke-width="10" fill="none" opacity=".35"/>
      <path d="M0 150 L60 110 L110 150 L170 100 L240 150 L300 116 L400 150 V250 H0Z" fill="#eaf4fc"/>
      <path d="M0 175 H400 V210 H0Z" fill="#3a78b0"/>
      <g fill="#f4faff" stroke="#bcd6ea" stroke-width="1.5"><path d="M30 190 l40 -6 30 8 -10 10 -50 2z"/><path d="M230 186 l60 -4 20 10 -20 8 -50 0z"/></g>
      <path d="M0 210 Q200 196 400 210 V250 H0Z" fill="#f4faff"/>`,
  },
  {
    id: "assisi", name: "Assisi", emoji: "🐺", need: 90, color: "#c98a8a",
    svg: `${sky("as", "#bfe0f5", "#f4f9fc")}${sun(60, 44, 20)}${cloud(300, 40, .8)}
      <path d="M0 200 Q120 90 260 120 T400 140 V250 H0Z" fill="#a6b86a"/>
      <g fill="#f1d9cf" stroke="#c9a090" stroke-width="1.5">
        <rect x="150" y="96" width="120" height="46"/><path d="M146 98 L210 76 L274 98Z" fill="#e2b9a8"/>
        <rect x="270" y="70" width="20" height="72"/><path d="M268 72 L280 54 L292 72Z" fill="#e2b9a8"/>
        <rect x="90" y="132" width="40" height="30"/><rect x="60" y="150" width="34" height="26"/><rect x="300" y="126" width="44" height="30"/></g>
      <g fill="#7a5a4a">${[165, 185, 205, 225, 245].map((x) => `<path d="M${x} 142 v-14 a5 5 0 0 1 10 0 v14z"/>`).join("")}</g>
      <circle cx="210" cy="112" r="7" fill="#c9a090"/>
      ${cypress(40, 200)}${cypress(130, 186, .9)}${cypress(360, 170, 1.1)}
      ${hill(222, "#8faa52", 10)}`,
  },
  {
    id: "savanna", name: "Savanna", emoji: "🦒", need: 95, color: "#d9a441",
    svg: `${sky("sa", "#ffb46a", "#ffe8b8")}${sun(200, 120, 40, "#ff8a3a")}
      <path d="M0 150 H400 V250 H0Z" fill="#d9b25e"/><path d="M0 150 Q200 140 400 150 V170 H0Z" fill="#c9a24c"/>
      <g transform="translate(90 150)"><path d="M0 0 V-50" stroke="#5a3a1a" stroke-width="6"/><path d="M0 -40 L-14 -54 M0 -44 L14 -58" stroke="#5a3a1a" stroke-width="4"/><ellipse cx="0" cy="-60" rx="56" ry="12" fill="#5a7a2e"/></g>
      <g transform="translate(320 156)"><path d="M0 0 V-36" stroke="#5a3a1a" stroke-width="5"/><ellipse cx="0" cy="-42" rx="40" ry="9" fill="#5a7a2e"/></g>
      ${Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 41) % 400} ${200 + ((i * 13) % 40)} l3 -10 l3 10" stroke="#a8842e" stroke-width="2" fill="none"/>`).join("")}`,
  },
  {
    id: "cathedral", name: "Cathedral", emoji: "⛪", need: 100, color: "#7a6aa8",
    svg: `${sky("ca", "#b9d8f2", "#eef6fc")}${cloud(60, 40, .8)}${cloud(350, 54, .7)}
      <g fill="#d8d0c4" stroke="#9a8f80" stroke-width="1.5">
        <rect x="110" y="60" width="50" height="140"/><rect x="240" y="60" width="50" height="140"/><rect x="160" y="90" width="80" height="110"/></g>
      <path d="M106 62 L135 14 L164 62Z M236 62 L265 14 L294 62Z" fill="#8a7f70"/><path d="M160 92 L200 50 L240 92Z" fill="#bfb5a6" stroke="#9a8f80"/>
      <path d="M135 10 v-8 M131 6 h8 M265 10 v-8 M261 6 h8 M200 46 v-8 M196 42 h8" stroke="#6b5f50" stroke-width="2"/>
      <circle cx="200" cy="120" r="20" fill="#5b7fd5" stroke="#9a8f80" stroke-width="2"/>
      <g stroke="#f2c230" stroke-width="2">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path d="M200 120 L${(200 + 20 * Math.cos(a)).toFixed(1)} ${(120 + 20 * Math.sin(a)).toFixed(1)}"/>`; }).join("")}</g>
      <circle cx="200" cy="120" r="6" fill="#e5343f"/>
      <path d="M182 200 V168 Q200 146 218 168 V200Z" fill="#6b4423"/>
      ${[[122, 90], [252, 90], [122, 140], [252, 140]].map(([x, y]) => `<path d="M${x} ${y + 30} V${y + 10} Q${x + 13} ${y - 4} ${x + 26} ${y + 10} V${y + 30}Z" fill="#7aa6e8"/>`).join("")}
      <path d="M0 200 H400 V250 H0Z" fill="#cfc7b8"/><path d="M150 250 L180 200 H220 L250 250Z" fill="#e2dccf"/>`,
  },
  {
    id: "pirates", name: "Pirate Island", emoji: "🏴‍☠️", need: 106, color: "#2a7ab0",
    svg: `${sky("pi", "#7fd0ff", "#e8f8ff")}${sun(340, 46, 22)}${cloud(120, 40)}
      <path d="M0 130 H400 V250 H0Z" fill="#2a8fd0"/>${[40, 140, 260, 350].map((x, i) => `<path d="M${x} ${150 + i * 18} q14 -6 28 0" stroke="#bfe8ff" stroke-width="3" fill="none"/>`).join("")}
      <path d="M60 200 Q160 150 260 200Z" fill="#f2d79a"/>${palm(160, 182, 1)}
      <g transform="translate(270 110)"><path d="M0 30 h100 l-16 22 h-70z" fill="#6b4423" stroke="#3a2412" stroke-width="2"/><path d="M50 30 V-40" stroke="#3a2412" stroke-width="4"/><path d="M52 -36 h40 v44 h-40z" fill="#fffaf0" stroke="#c9b9a0"/><path d="M52 -40 h22 v12 h-22z" fill="#222"/><circle cx="62" cy="-34" r="2" fill="#fff"/></g>`,
  },
  {
    id: "mission", name: "Mission Church", emoji: "🔔", need: 112, color: "#c96a4a",
    svg: `${sky("mi", "#9fd3ff", "#fff3dc")}${sun(330, 48, 22)}
      <path d="M0 170 H400 V250 H0Z" fill="#e8cf98"/>
      <g fill="#f5ead8" stroke="#c9b089" stroke-width="2">
        <path d="M120 170 V70 h40 v-14 h80 v14 h40 V170Z"/>
        <rect x="40" y="110" width="80" height="60"/><rect x="280" y="120" width="90" height="50"/></g>
      <path d="M36 112 h88 l-6 -10 h-76z M276 122 h98 l-6 -10 h-86z" fill="#c9644a"/>
      <g fill="#7a5a3a">${[[150, 84], [186, 70], [222, 84], [168, 116], [204, 116]].map(([x, y]) => `<path d="M${x} ${y + 22} v-14 a8 8 0 0 1 16 0 v14z"/>`).join("")}</g>
      <g fill="#d9a441" stroke="#8a6a26" stroke-width="1">${[[158, 98], [194, 84], [230, 98]].map(([x, y]) => `<path d="M${x - 5} ${y} q5 -10 10 0z"/>`).join("")}</g>
      <path d="M200 52 v-12 M195 46 h10" stroke="#8a6a46" stroke-width="2.5"/>
      <path d="M186 170 v-26 a14 14 0 0 1 28 0 v26z" fill="#6b4423"/>
      ${palm(70, 236, .9)}${palm(350, 238, .8)}`,
  },
  {
    id: "space", name: "Outer Space", emoji: "🪐", need: 118, color: "#3b3f8a",
    svg: `<rect width="400" height="250" fill="#0d0b2a"/>${stars(110, 9, 250)}
      <g transform="translate(110 90)"><circle r="34" fill="#f2a65a"/><ellipse rx="56" ry="12" fill="none" stroke="#f7d9a8" stroke-width="5" transform="rotate(-18)"/><path d="M-30 -8 h60 M-32 6 h64" stroke="#d98a3a" stroke-width="4" opacity=".6"/></g>
      <circle cx="300" cy="170" r="22" fill="#5b9bd5"/><circle cx="294" cy="164" r="7" fill="#7fbcf0"/>
      <circle cx="330" cy="60" r="10" fill="#e5484d"/><circle cx="60" cy="200" r="8" fill="#9adf7a"/>
      <path d="M210 30 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff"/>`,
  },
  {
    id: "rainbow", name: "Rainbow Clouds", emoji: "🌈", need: 124, color: "#ef7fb0",
    svg: `${sky("rb", "#c9b3ff", "#ffe3f1")}
      ${["#e5484d", "#ff9d2e", "#ffd54a", "#4caf50", "#3a8ee8", "#8b46d6"].map((c, i) => `<path d="M40 210 A160 160 0 0 1 360 210" stroke="${c}" stroke-width="12" fill="none" transform="translate(0 ${i * 12})"/>`).join("")}
      ${cloud(60, 200, 2.2)}${cloud(340, 205, 2.2)}${cloud(200, 236, 2.6)}${cloud(120, 70, 1)}${cloud(300, 50, .9)}`,
  },
  {
    id: "fatima", name: "Fatima", emoji: "🐑", need: 130, color: "#5f9a5a",
    svg: `${sky("fa2", "#a8d8ff", "#f2faff")}
      <circle cx="300" cy="56" r="26" fill="#fff8d6"/><circle cx="300" cy="56" r="40" fill="#ffe58a" opacity=".3"/>
      ${hill(160, "#9cc37a", 20)}${hill(200, "#86b064", 14, 30)}
      <g transform="translate(110 168)"><rect x="-6" y="-40" width="12" height="44" fill="#6b4423"/><ellipse cx="0" cy="-56" rx="48" ry="30" fill="#4f7a3a"/><ellipse cx="-20" cy="-44" rx="24" ry="16" fill="#5f8a44"/></g>
      <g transform="translate(250 130)"><rect x="0" y="20" width="50" height="40" fill="#fff" stroke="#c9cfd8" stroke-width="2"/><path d="M-6 22 L25 0 L56 22Z" fill="#e8e8e8" stroke="#c9cfd8"/><path d="M25 -2 v-12 M20 -8 h10" stroke="#8a8f99" stroke-width="2"/><path d="M18 60 v-16 a7 7 0 0 1 14 0 v16z" fill="#8a6a46"/></g>
      ${[[200, 214], [330, 222], [60, 228]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse rx="12" ry="8" fill="#fff" stroke="#c9cfd8"/><circle cx="-12" cy="-2" r="4" fill="#5a4a3a"/></g>`).join("")}`,
  },
  {
    id: "heaven", name: "Heaven", emoji: "👼", need: 140, color: "#e0b62c",
    svg: `${sky("he", "#ffe8a8", "#fffaf0")}
      <g stroke="#fff3c4" stroke-width="10" opacity=".7">${Array.from({ length: 9 }, (_, i) => `<path d="M200 70 L${-40 + i * 60} 250"/>`).join("")}</g>
      <circle cx="200" cy="70" r="40" fill="#fff8d6"/><circle cx="200" cy="70" r="60" fill="#fff3c4" opacity=".6"/>
      <g fill="#e8c24a" stroke="#b8860b" stroke-width="2"><path d="M150 180 V120 Q150 96 175 96 V180z M250 180 V120 Q250 96 225 96 V180z"/></g>
      <g stroke="#d9a62a" stroke-width="3">${[160, 170, 180, 220, 230, 240].map((x) => `<path d="M${x} 180 V112"/>`).join("")}</g>
      ${cloud(60, 190, 2.4, "#ffffff")}${cloud(340, 196, 2.4, "#ffffff")}${cloud(200, 232, 3, "#ffffff")}${cloud(80, 90, 1.1, "#fffdf2")}${cloud(320, 100, 1, "#fffdf2")}`,
  },
];

/** More things to add, unlocking with the new playsets. */
export const MORE_PROPS = [
  { need: 26, items: ["🌸", "🦋", "🐝", "🐞"] },
  { need: 30, items: ["🦌", "🦉", "🐿️", "🍁"] },
  { need: 36, items: ["🐄", "🐖", "🐔", "🌾"] },
  { need: 40, items: ["🍂", "🎃", "🍎", "🧺"] },
  { need: 44, items: ["⛄", "❄️", "🛷", "🧣"] },
  { need: 48, items: ["🐟", "🛶", "🍞", "🕊️"] },
  { need: 52, items: ["🦜", "🐒", "🐍", "🌴"] },
  { need: 56, items: ["📿", "🙏", "⛲", "🏛️"] },
  { need: 64, items: ["🐪", "🌵", "🦂", "🏜️"] },
  { need: 72, items: ["🧑‍🚀", "🛰️", "🌍", "🌕"] },
  { need: 78, items: ["🦕", "🦖", "🌋", "🥚"] },
  { need: 88, items: ["🐧", "🐻‍❄️", "🦭", "🧊"] },
  { need: 98, items: ["🦒", "🦓", "🐘", "🦁"] },
  { need: 108, items: ["🏴‍☠️", "💰", "🗺️", "⚓"] },
  { need: 126, items: ["🌈", "☁️", "✨", "🎶"] },
];
