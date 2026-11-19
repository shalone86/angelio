// Run every part's tests (hub, apps/*, template, workshop). Exits with an error if any fail.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const dirs = ["hub", ...fs.readdirSync("apps").map((d) => `apps/${d}`), "template", "workshop"].filter((d) => fs.existsSync(`${d}/test`));
let failed = [];
for (const d of dirs) {
  const files = fs.readdirSync(`${d}/test`).filter((f) => f.endsWith(".test.js")).map((f) => `test/${f}`);
  try { execFileSync(process.execPath, ["--test", ...files], { cwd: d, stdio: "pipe" }); console.log(`✓ ${d}`); }
  catch (e) { failed.push(d); console.log(`✗ ${d}\n${String(e.stdout).split("\n").filter((l) => /not ok|Error/.test(l)).slice(0, 10).join("\n")}`); }
}
if (failed.length) { console.log(`\nFailed: ${failed.join(", ")}`); process.exit(1); }
console.log(`\nAll ${dirs.length} passed.`);
