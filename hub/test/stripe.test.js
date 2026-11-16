import { test } from "node:test";
import assert from "node:assert/strict";
import { stripeApi, signatureOk, codeFor } from "../worker/stripe.js";
import { codeStatus } from "../worker/codes.js";

const fakeKV = () => {
  const m = new Map();
  return { m, get: async (k, t) => (m.has(k) ? (t === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => { m.set(k, v); } };
};
const SECRET = "whsec_test_secret";
const env = () => ({ CODES: fakeKV(), STRIPE_KEY: "rk_test_x", STRIPE_WEBHOOK_SECRET: SECRET });
const session = { id: "cs_test_abc123", status: "complete", payment_status: "paid", subscription: "sub_1", livemode: false,
  customer_details: { name: "Garcia family", email: "parent@example.com" } };
const fakeStripe = (s) => async (url, opts) => {
  assert.match(url, /checkout\/sessions\/cs_test_abc123$/);
  assert.equal(opts.headers.authorization, "Bearer rk_test_x");
  return new Response(JSON.stringify(s), { status: s ? 200 : 404 });
};
const enc = new TextEncoder();
async function sign(body, t = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`))), (x) => x.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${sig}`;
}
const get = (e, path, fetcher) => stripeApi(new Request(`https://angelio.org${path}`), new URL(`https://angelio.org${path}`), e, fetcher).then(async (r) => ({ status: r.status, body: await r.json() }));
const hook = async (e, event, header) => {
  const body = JSON.stringify(event);
  const r = await stripeApi(new Request("https://angelio.org/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": header ?? (await sign(body)) } }),
    new URL("https://angelio.org/api/stripe/webhook"), e);
  return r.status;
};

test("not set up yet: a clear answer, nothing made", async () => {
  const r = await get({ CODES: fakeKV() }, "/api/stripe/code?session_id=cs_test_abc123");
  assert.equal(r.status, 503);
});

test("after paying, the thank-you page gets a family code that works", async () => {
  const e = env();
  const r = await get(e, "/api/stripe/code?session_id=cs_test_abc123", fakeStripe(session));
  assert.equal(r.status, 200);
  assert.match(r.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(r.body.limit, 300);
  const st = await codeStatus(e, r.body.code);
  assert.equal(st.valid, true);
  // Asking again (a refresh) gives the same code, not a second one.
  assert.equal((await get(e, "/api/stripe/code?session_id=cs_test_abc123", fakeStripe(session))).body.code, r.body.code);
  assert.equal([...e.CODES.m.keys()].filter((k) => k.startsWith("code:")).length, 1);
});

test("unpaid, unknown or odd-looking checkouts get no code", async () => {
  const e = env();
  assert.equal((await get(e, "/api/stripe/code?session_id=cs_test_abc123", fakeStripe({ ...session, status: "open", payment_status: "unpaid" }))).status, 409);
  assert.equal((await get(e, "/api/stripe/code?session_id=cs_test_abc123", fakeStripe(null))).status, 404);
  assert.equal((await get(e, "/api/stripe/code?session_id=../admin", fakeStripe(session))).status, 400);
  assert.equal([...e.CODES.m.keys()].filter((k) => k.startsWith("code:")).length, 0);
});

test("the webhook makes the same code as the thank-you page (never two)", async () => {
  const e = env();
  assert.equal(await hook(e, { type: "checkout.session.completed", data: { object: session } }), 200);
  const page = await get(e, "/api/stripe/code?session_id=cs_test_abc123", fakeStripe(session));
  assert.equal(page.body.code, await codeFor(e, session.id));
  assert.equal([...e.CODES.m.keys()].filter((k) => k.startsWith("code:")).length, 1);
  const rec = JSON.parse(e.CODES.m.get(`code:${page.body.code}`));
  assert.equal(rec.email, "parent@example.com");
  assert.equal(rec.source, "stripe");
});

test("a webhook without Stripe's signature is refused", async () => {
  const e = env();
  assert.equal(await hook(e, { type: "checkout.session.completed", data: { object: session } }, "t=1,v1=deadbeef"), 400);
  const old = await sign("{}", Math.floor(Date.now() / 1000) - 3600);
  assert.equal(await signatureOk(SECRET, old, "{}"), false);
  assert.equal([...e.CODES.m.keys()].length, 0);
});

test("cancelling turns the code off; subscribing again turns it back on", async () => {
  const e = env();
  await hook(e, { type: "checkout.session.completed", data: { object: session } });
  const code = await codeFor(e, session.id);
  await hook(e, { type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } });
  assert.equal((await codeStatus(e, code)).valid, false);
  await hook(e, { type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active" } } });
  assert.equal((await codeStatus(e, code)).valid, true);
  // Past due (Stripe still retrying the card) keeps it working.
  await hook(e, { type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "past_due" } } });
  assert.equal((await codeStatus(e, code)).valid, true);
});
