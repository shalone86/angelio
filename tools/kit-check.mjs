// The shared kit (public/js/kit/*.js) is still copied into each app. This lists where the copies differ
// from the template's, so they can be brought back together (and then shared for real).
import fs from "node:fs";
import crypto from "node:crypto";
const hash = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8);
const kitOf = (d) => [`${d}/public/js/kit`, `${d}/public/js`].find((k) => fs.existsSync(`${k}/tts.js`));
const ref = "template/public/js/kit";
const files = fs.readdirSync(ref).filter((f) => f.endsWith(".js"));
for (const d of ["hub", ...fs.readdirSync("apps").map((a) => `apps/${a}`)]) {
  const k = kitOf(d);
  if (!k) { console.log(`${d}: no kit`); continue; }
  const diff = files.filter((f) => fs.existsSync(`${k}/${f}`) && hash(`${k}/${f}`) !== hash(`${ref}/${f}`));
  const missing = files.filter((f) => !fs.existsSync(`${k}/${f}`));
  console.log(`${d}: ${diff.length ? `differs: ${diff.join(", ")}` : "same as the template"}${missing.length ? ` · not there: ${missing.join(", ")}` : ""}`);
}
