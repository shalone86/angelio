// Selling family codes with Stripe (docs/selling-codes.md).
//
// 1. A parent pays through the Stripe Payment Link (hub/public/js/hub.js has its address).
// 2. Stripe sends them to angelio.org/thanks?session_id=…; that page asks GET /api/stripe/code, which looks
//    the checkout up at Stripe and returns the family code (made the first time it's asked for).
// 3. Stripe also tells us itself (POST /api/stripe/webhook, signed): a finished checkout makes the code
//    too, in case the parent closed the page; a subscription that ends turns the code off, and one that
//    becomes active again turns it back on.
// The code is calculated from the checkout's id (an HMAC with STRIPE_WEBHOOK_SECRET), so the page and the
// webhook always arrive at the same code, never two.
//
// Secrets (set by the owner in the Cloudflare dashboard, never in this file or in chat):
//   STRIPE_KEY             a restricted key with "Checkout Sessions: Read"
//   STRIPE_WEBHOOK_SECRET  the webhook's signing secret (whsec_…)
import { newCode } from "./codes.js";

export const MONTHLY_CHECKS = 300;
const API = "https://api.stripe.com/v1";
const enc = new TextEncoder();

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** The family code for a checkout: always the same one for the same checkout. */
export async function codeFor(env, sessionId) {
  const b = await hmac(env.STRIPE_WEBHOOK_SECRET, `angelio-family-code:${sessionId}`);
  return newCode(() => b.slice(0, 12));
}

/** Is this Stripe-Signature header right for this body? (t=…,v1=…; within 5 minutes) */
export async function signatureOk(secret, header, body, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")).filter((p) => p.length === 2));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const want = hex(await hmac(secret, `${t}.${body}`));
  const got = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return got.some((g) => g.length === want.length && [...g].reduce((d, c, i) => d | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0);
}

const paid = (s) => s?.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");

/** Make (or find) the family code for a finished checkout. Returns null if it isn't paid. */
export async function codeForSession(env, s) {
  if (!paid(s)) return null;
  const code = await codeFor(env, s.id);
  const kv = env.CODES;
  const had = await kv.get(`code:${code}`, "json");
  if (had) return { code, ...had };
  const rec = {
    name: s.customer_details?.name || "Family", limit: MONTHLY_CHECKS, created: Date.now(),
    email: s.customer_details?.email ?? null, source: "stripe", sub: s.subscription ?? null, live: !!s.livemode,
  };
  await kv.put(`code:${code}`, JSON.stringify(rec));
  if (rec.sub) await kv.put(`stripe:sub:${rec.sub}`, code);
  return { code, ...rec };
}

async function getSession(env, id, fetcher = fetch) {
  const r = await fetcher(`${API}/checkout/sessions/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${env.STRIPE_KEY}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Stripe said ${r.status}`);
  return r.json();
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Routes under /api/stripe/. `fetcher` is for tests. */
export async function stripeApi(request, url, env, fetcher = fetch) {
  if (!env.STRIPE_KEY || !env.STRIPE_WEBHOOK_SECRET) return json({ error: "Stripe isn't set up yet." }, 503);
  const route = `${request.method} ${url.pathname}`;

  if (route === "GET /api/stripe/code") {
    const id = url.searchParams.get("session_id") ?? "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "That link doesn't look right." }, 400);
    const s = await getSession(env, id, fetcher);
    if (!s) return json({ error: "We couldn't find that payment." }, 404);
    const c = await codeForSession(env, s);
    if (!c) return json({ error: "The payment isn't finished yet. Try again in a minute." }, 409);
    return json({ code: c.code, name: c.name, limit: c.limit });
  }

  if (route === "POST /api/stripe/webhook") {
    const body = await request.text();
    if (!(await signatureOk(env.STRIPE_WEBHOOK_SECRET, request.headers.get("stripe-signature"), body))) return json({ error: "bad signature" }, 400);
    const ev = JSON.parse(body), obj = ev.data?.object ?? {};
    if (ev.type === "checkout.session.completed") await codeForSession(env, obj);
    if (ev.type === "customer.subscription.deleted" || ev.type === "customer.subscription.updated") {
      const code = await env.CODES.get(`stripe:sub:${obj.id}`);
      const rec = code && (await env.CODES.get(`code:${code}`, "json"));
      if (rec) {
        // Active (or a trial) = on. Ended, unpaid or never finished = off. Past due keeps working while Stripe retries.
        const off = ev.type === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(obj.status);
        const on = ["active", "trialing"].includes(obj.status);
        if (off || on) { rec.revoked = off; rec.ended = off ? Date.now() : undefined; await env.CODES.put(`code:${code}`, JSON.stringify(rec)); }
      }
    }
    return json({ received: true });
  }
  return json({ error: "not found" }, 404);
}
