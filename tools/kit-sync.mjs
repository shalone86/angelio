// The shared kit has ONE master copy: kit/ at the top of the repo. Each app gets an exact copy in
// public/js/kit/ (apps are deployed separately, so each carries its own). Change kit/, then run
//   npm run kit-sync
// and commit. `npm test` fails if any app's copy differs from kit/ (tools/kit-check.mjs --strict).
// Articulate isn't on the kit: it's an older, separate design with its own voice and recorder.
import fs from "node:fs";
export const KIT_APPS = ["template", ...fs.readdirSync("apps").filter((a) => a !== "articulate").map((a) => `apps/${a}`)];
export const KIT_FILES = fs.readdirSync("kit").filter((f) => f.endsWith(".js"));
if (process.argv[1]?.endsWith("kit-sync.mjs")) {
  let changed = 0;
  for (const d of KIT_APPS) {
    const dest = `${d}/public/js/kit`;
    fs.mkdirSync(dest, { recursive: true });
    for (const f of KIT_FILES) {
      const src = fs.readFileSync(`kit/${f}`);
      if (!fs.existsSync(`${dest}/${f}`) || !src.equals(fs.readFileSync(`${dest}/${f}`))) { fs.writeFileSync(`${dest}/${f}`, src); changed++; }
    }
  }
  console.log(changed ? `kit-sync: updated ${changed} files in ${KIT_APPS.length} apps. Bump each changed app's sw.js VERSION, test, commit.` : "kit-sync: every app already matches kit/.");
}
