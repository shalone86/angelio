#!/usr/bin/env node
// The lines Mom and Dad can record (angelio.org/admin/sounds, the "Lines" tabs), one sentence each:
//   • every game's "How it works" cards: each app is opened in a browser (Playwright) and every level's card
//     is shown, and what the voice says is written down (the games call window.__angelioSaid; see kit/tts.js);
//   • the lines every game shares: praise, "try again", "let's try this one", the finish screen.
// Lines with a changing number or word ("Find 7") aren't listed: they stay with the robot voice.
// Writes hub/public/admin/lines.json. Run again after changing a game's words:  node tools/voice-lines.mjs
// Needs Playwright with Chromium (installed in the cloud container; elsewhere: npx playwright install chromium).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = new URL("..", import.meta.url).pathname;
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require(path.join(process.execPath, "../../lib/node_modules/playwright"))); }

// [app, name, module with STAGES (for an app whose home has buttons, not links)]
const APPS = [["snap", "PreK Math"], ["regroup", "Regroup!"], ["doubles", "Doubles", "js/doubles.js"], ["fractions", "Fraction Feast"],
  ["letters", "Letter Lane"], ["read", "Read Aloud"], ["spell", "Spelling"], ["grammar", "Grammar!"]];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const sentences = (t) => String(t).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => /[\p{L}]/u.test(s));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
await ctx.route("http://app.test/**", (r) => {
  const u = new URL(r.request().url());
  const [, name, ...rest] = u.pathname.split("/");
  let f = path.join(ROOT, "apps", name, "public", rest.join("/"));
  if (f.endsWith("/") || !path.extname(f)) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: "" });
  r.fulfill({ contentType: TYPES[path.extname(f)] ?? "application/octet-stream", body: fs.readFileSync(f) });
});
await ctx.route("**/api/**", (r) => r.fulfill({ status: 503, body: "{}" }));
await ctx.route("https://**", (r) => r.fulfill({ status: 404, body: "" }));

const groups = [];
for (const [app, title, levelsModule] of APPS) {
  const p = await ctx.newPage();
  const said = [];
  await p.exposeFunction("__said", (t) => said.push(t));
  await p.addInitScript(() => { window.__angelioSaid = (t) => window.__said(String(t)); });
  await p.goto(`http://app.test/${app}/`); await p.waitForTimeout(900);
  const links = [...new Set(await p.$$eval('a[href^="#/play/"], a[href^="#/sense/"]', (as) => as.map((a) => [a.getAttribute("href"), a.textContent.replace(/\s+/g, " ").replace(/★|☆/g, "").trim()])).then((x) => x.map(JSON.stringify)))].map(JSON.parse);
  if (!links.length && levelsModule) links.push(...await p.evaluate(async (m) => (await import(m)).STAGES.map((s) => [`#/play/${s.id}`, s.title]), `/${app}/${levelsModule}`));
  const lines = new Map(); // sentence → where it's said
  for (const [href, label] of links) {
    said.length = 0;
    await p.goto(`http://app.test/${app}/${href}`); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector("[data-lesson-listen]")?.click()); // the card's words, said again if they weren't yet
    await p.waitForTimeout(300);
    for (const t of said) for (const s of sentences(t)) if (!lines.has(s)) lines.set(s, label);
  }
  await p.close();
  groups.push({ name: title, lines: [...lines].map(([text, where]) => ({ text, where: `How it works: ${where}` })) });
  console.log(`${title}: ${links.length} levels, ${lines.size} sentences`);
}
await browser.close();

// The lines every game shares.
const kit = (f) => fs.readFileSync(path.join(ROOT, "apps/snap/public/js/kit", f), "utf8");
const strings = (src) => [...src.matchAll(/"((?:[^"\\]|\\.){3,})"/g)].map((m) => m[1].replace(/\\'/g, "'"));
const vary = await import(path.join(ROOT, "apps/snap/public/js/kit/vary.js"));
const finish = strings(kit("ui.js").slice(kit("ui.js").indexOf("speak(st.grew"), kit("ui.js").indexOf("speak(st.grew") + 900)).filter((s) => /[a-z]/.test(s) && !/[{}$]/.test(s));
const shared = [
  ...vary.PRAISE.map((t) => [t, "When an answer is right"]),
  ...vary.TRY_AGAIN.map((t) => [t, "When an answer is wrong"]),
  ...vary.LEAD_INS.map((t) => [t, "Before each new question"]),
  ...finish.map((t) => [t, "The finish screen"]),
];
const sharedLines = new Map();
for (const [t, where] of shared) for (const s of sentences(t)) if (!sharedLines.has(s)) sharedLines.set(s, where);
groups.unshift({ name: "Every game", lines: [...sharedLines].map(([text, where]) => ({ text, where })) });

// A sentence already in an earlier group isn't listed again.
const seen = new Set();
for (const g of groups) g.lines = g.lines.filter((l) => !seen.has(l.text) && seen.add(l.text));
const out = { note: "Made by tools/voice-lines.mjs. Each line is one sentence; {{sound}} means say that sound.", built: new Date().toISOString().slice(0, 10), groups };
fs.writeFileSync(path.join(ROOT, "hub/public/admin/lines.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`lines.json: ${groups.reduce((n, g) => n + g.lines.length, 0)} lines in ${groups.length} groups`);
