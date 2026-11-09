// Sticker World playsets: each is a little scene (SVG) that unlocks as kids earn stickers.
// Points: a giant sticker counts 2, a mini sticker 1.

const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id})"/>`;
const cloud = (x, y, s = 1) => `<g fill="#fff" opacity=".9" transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="26" ry="11"/><circle cx="-8" cy="-8" r="11"/><circle cx="9" cy="-9" r="13"/></g>`;
const stars = (n, seed = 3) => Array.from({ length: n }, (_, i) => {
  const x = (i * 97 + seed * 31) % 400, y = (i * 53 + seed * 17) % 120, r = 0.8 + ((i * 7) % 3) * 0.5;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.5 + ((i * 13) % 5) / 10}"/>`;
}).join("");

export const SCENES = [
  {
    id: "meadow", name: "Sunny Meadow", emoji: "🌼", need: 0, color: "#5cc46a",
    svg: `${sky("m", "#8fd3ff", "#e6f7ff")}
      <circle cx="340" cy="44" r="26" fill="#ffd54a"/><circle cx="340" cy="44" r="36" fill="#ffd54a" opacity=".25"/>
      ${cloud(80, 40)}${cloud(210, 62, .8)}
      <path d="M0 150 Q90 105 190 140 T400 125 V250 H0Z" fill="#8bd47a"/>
      <path d="M0 175 Q120 150 230 172 T400 165 V250 H0Z" fill="#6cc25e"/>
      <ellipse cx="290" cy="208" rx="62" ry="17" fill="#7cc8f0"/><ellipse cx="282" cy="204" rx="30" ry="5" fill="#bfe8ff"/>
      <path d="M60 250 Q90 210 150 196 T230 180" stroke="#e8cf98" stroke-width="16" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: "seaside", name: "Seaside", emoji: "🏖️", need: 3, color: "#3aa6e0",
    svg: `${sky("s", "#7fd0ff", "#fff3d6")}
      <circle cx="70" cy="50" r="24" fill="#ffcf4a"/>${cloud(250, 40)}${cloud(350, 70, .7)}
      <rect y="118" width="400" height="70" fill="#3aa6e0"/><rect y="118" width="400" height="10" fill="#6cc4f2"/>
      <path d="M0 150 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" stroke="#bfe8ff" stroke-width="3" fill="none"/>
      <path d="M0 185 Q120 170 230 182 T400 176 V250 H0Z" fill="#f5dc9c"/>
      <path d="M0 205 Q150 195 260 206 T400 200 V250 H0Z" fill="#efcf86"/>`,
  },
  {
    id: "castle", name: "Castle Hill", emoji: "🏰", need: 6, color: "#a06ad8",
    svg: `${sky("c", "#ffb7c9", "#ffe9d6")}
      ${cloud(60, 50)}${cloud(320, 36, .9)}
      <path d="M0 160 Q200 70 400 160 V250 H0Z" fill="#7fbf6a"/>
      <g fill="#b9b2c8" stroke="#8d86a3" stroke-width="2">
        <rect x="160" y="70" width="80" height="60"/><rect x="146" y="52" width="24" height="78"/><rect x="230" y="52" width="24" height="78"/>
        <path d="M146 52 h6 v-8 h6 v8 h6 v-8 h6 v8" /><path d="M230 52 h6 v-8 h6 v8 h6 v-8 h6 v8"/>
      </g>
      <path d="M146 52 L158 30 L170 52Z M230 52 L242 30 L254 52Z" fill="#8b46d6"/>
      <path d="M186 130 v-26 a14 14 0 0 1 28 0 v26z" fill="#6b4a2b"/>
      <path d="M0 200 Q200 185 400 200 V250 H0Z" fill="#69ad58"/>
      <path d="M90 175 Q200 150 310 175" stroke="#7cc8f0" stroke-width="12" fill="none"/>`,
  },
  {
    id: "night", name: "Starry Night", emoji: "🌙", need: 10, color: "#33408a",
    svg: `${sky("n", "#141c4d", "#3b4a8f")}${stars(60)}
      <circle cx="320" cy="50" r="22" fill="#fff6c8"/><circle cx="330" cy="44" r="20" fill="#1a2357"/>
      <path d="M0 170 Q100 130 200 165 T400 150 V250 H0Z" fill="#26386e"/>
      <path d="M0 200 Q140 175 260 198 T400 190 V250 H0Z" fill="#1f2f5c"/>`,
  },
  {
    id: "town", name: "Little Town", emoji: "⛪", need: 15, color: "#e0803a",
    svg: `${sky("t", "#9fdcff", "#f2fbff")}${cloud(100, 36)}${cloud(300, 50, .8)}
      <g transform="translate(250 58)">
        <rect x="0" y="40" width="70" height="62" fill="#fff4e3" stroke="#c9a97a" stroke-width="2"/>
        <path d="M-6 42 L35 14 L76 42Z" fill="#d9634d"/>
        <rect x="24" y="-10" width="22" height="40" fill="#fff4e3" stroke="#c9a97a" stroke-width="2"/>
        <path d="M20 -10 L35 -34 L50 -10Z" fill="#d9634d"/><path d="M35 -50 v14 M29 -45 h12" stroke="#8a6a3a" stroke-width="3"/>
        <path d="M26 102 v-24 a9 9 0 0 1 18 0 v24z" fill="#8a5a2b"/><circle cx="35" cy="56" r="7" fill="#9fd3ff" stroke="#c9a97a" stroke-width="2"/>
      </g>
      <path d="M0 160 H400 V250 H0Z" fill="#8bd47a"/>
      <path d="M0 196 H400 V226 H0Z" fill="#9aa3ad"/><path d="M10 211 H400" stroke="#fff" stroke-width="3" stroke-dasharray="16 14"/>`,
  },
  {
    id: "sea", name: "Under the Sea", emoji: "🐠", need: 21, color: "#1b8fb8",
    svg: `${sky("u", "#5fd0ef", "#0f5f99")}
      <path d="M60 0 L120 250 L170 250 L90 0Z M220 0 L250 250 L300 250 L250 0Z" fill="#fff" opacity=".08"/>
      ${Array.from({ length: 12 }, (_, i) => `<circle cx="${30 + i * 31}" cy="${40 + ((i * 37) % 120)}" r="${2 + (i % 3)}" fill="none" stroke="#e8fbff" opacity=".5"/>`).join("")}
      <path d="M0 205 Q100 190 200 205 T400 198 V250 H0Z" fill="#f2d79a"/>
      <path d="M40 210 q-10 -30 4 -60 M48 210 q12 -26 0 -50 M340 205 q-12 -34 6 -66 M350 205 q10 -24 -2 -44" stroke="#3fae5a" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  },
];

// Things kids can add as many times as they like, unlocked by points too.
export const PROPS = [
  { need: 0, items: ["🌳", "🌷", "🏠", "☁️"] },
  { need: 2, items: ["🌲", "🌻", "🪨", "🍄"] },
  { need: 4, items: ["⛲", "🛝", "🚲", "🎈"] },
  { need: 7, items: ["🚗", "🚂", "⛵", "🐚"] },
  { need: 11, items: ["🏰", "⛪", "🌈", "⭐"] },
  { need: 16, items: ["🎡", "🎠", "🌙", "🎄"] },
  { need: 22, items: ["🚀", "🛸", "🐉", "👑"] },
];
