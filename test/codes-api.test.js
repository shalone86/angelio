import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

const fakeKV = () => {
  const m = new Map();
  return {
    m,
    get: async (k, t) => (m.has(k) ? (t === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null),
    put: async (k, v) => { m.set(k, v); },
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  };
};
const call = (env, path, { key, body } = {}) => worker.fetch(new Request(`https://angelio.org${path}`, {
  method: body ? "POST" : "GET", headers: { ...(key ? { "x-admin-key": key } : {}), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
}), env).then(async (r) => ({ status: r.status, body: await r.json() }));

test("admin is locked until ADMIN_KEY is set, and with a wrong key", async () => {
  const env = { CODES: fakeKV() };
  assert.equal((await call(env, "/api/admin/codes")).status, 401);
  assert.equal((await call(env, "/api/admin/codes", { key: "anything" })).status, 401);
  assert.equal((await call({ ...env, ADMIN_KEY: "right" }, "/api/admin/codes", { key: "wrong" })).status, 401);
});

test("make a code, a parent checks it, turn it off", async () => {
  const env = { CODES: fakeKV(), ADMIN_KEY: "right" };
  const made = await call(env, "/api/admin/codes", { key: "right", body: { name: "Garcia family", limit: 50 } });
  assert.equal(made.status, 200);
  assert.match(made.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const typed = made.body.code.toLowerCase().replace(/-/g, " ");
  const st = await call(env, `/api/code?c=${encodeURIComponent(typed)}`);
  assert.deepEqual(st.body, { valid: true, name: "Garcia family", limit: 50, left: 50 });
  const list = await call(env, "/api/admin/codes", { key: "right" });
  assert.equal(list.body.codes.length, 1);
  await call(env, "/api/admin/codes/update", { key: "right", body: { code: made.body.code, revoked: true } });
  assert.deepEqual((await call(env, `/api/code?c=${made.body.code}`)).body, { valid: false, revoked: true });
  assert.deepEqual((await call(env, "/api/code?c=NOPE-NOPE-NOPE")).body, { valid: false, revoked: false });
});
