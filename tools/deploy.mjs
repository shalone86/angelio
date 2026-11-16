// Deploy one app:  npm run deploy -- watch   (or hub, letters, …)
// Refuses when there's uncommitted work, so what's live is always in git and easy to roll back.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const name = process.argv[2];
const dir = name === "hub" ? "hub" : `apps/${name}`;
if (!name || !fs.existsSync(`${dir}/wrangler.jsonc`)) {
  console.error(`Which app? One of: hub, ${fs.readdirSync("apps").join(", ")}`);
  process.exit(1);
}
const dirty = execFileSync("git", ["status", "--porcelain", "--", dir], { encoding: "utf8" }).trim();
if (dirty) { console.error(`Not deploying: ${dir} has uncommitted changes. Commit them first:\n${dirty}`); process.exit(1); }
execFileSync(process.execPath, [path.resolve("node_modules/wrangler/bin/wrangler.js"), "deploy", ...process.argv.slice(3)], { cwd: dir, stdio: "inherit" });
