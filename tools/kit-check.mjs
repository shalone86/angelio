// Does every app's copy of the shared kit match the master (kit/)? With --strict (npm test), any difference
// is an error: change kit/ and run `npm run kit-sync` instead of editing an app's copy.
import fs from "node:fs";
import { KIT_APPS, KIT_FILES } from "./kit-sync.mjs";
const bad = [];
for (const d of KIT_APPS) {
  const dest = `${d}/public/js/kit`;
  const diff = KIT_FILES.filter((f) => !fs.existsSync(`${dest}/${f}`) || !fs.readFileSync(`kit/${f}`).equals(fs.readFileSync(`${dest}/${f}`)));
  if (diff.length) bad.push(`${d}: ${diff.join(", ")}`);
}
if (bad.length) {
  console.log(`The shared kit differs from kit/ in:\n  ${bad.join("\n  ")}\nChange kit/ (the master), then run: npm run kit-sync`);
  if (process.argv.includes("--strict")) process.exit(1);
} else console.log(`kit: all ${KIT_APPS.length} apps match kit/ (${KIT_FILES.length} files).`);
