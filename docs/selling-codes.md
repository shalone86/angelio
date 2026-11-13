# Selling family codes (phase 2): wording and checklist

Drafted Nov 2026. Everything in quotes is ready to paste; change any wording you like.
**The terms, refund and privacy texts are a plain-language starting point, not legal advice.**
Because Articulate listens to children, have someone who knows US children's privacy law (COPPA) read
them once before you start selling.

---

## 1. How it will work (what gets built)

1. A parent taps **"Get a family code"** on angelio.org (Free for every family → Speech checks).
2. That opens a **Stripe Payment Link** (Stripe's own checkout page, nothing for us to host).
3. After paying, Stripe sends them back to **angelio.org/thanks**, which shows their new code right
   away, with a "Use it on this device" button. Stripe also emails them a receipt.
   *No separate email service is needed.*
4. The hub's Worker hears from Stripe (a "webhook"): it creates the code when a subscription starts,
   and turns the code off when the subscription ends. The code's monthly limit resets every month.
5. **Lost code?** You look it up at angelio.org/admin/ by the parent's email (I'll add that search),
   or they use Stripe's customer portal link in their receipt to manage or cancel.

The free 20 checks a day without a code stay, so anyone can try before paying.

---

## 2. In Stripe: the product

**Product name**

> Angelio Family Speech Checks

**Product description** (shows on the checkout page)

> Unlimited-feeling "say it out loud" practice for your whole family in Articulate and future Angelio
> reading games: up to 300 speech checks a month, on all your family's devices. Reading aloud, every
> game, and 20 free checks a day stay free for everyone. Thank you for helping keep Angelio free!

**Prices** (my suggestion; it's your call)

| Price | Amount | Note |
|---|---|---|
| Monthly | **$4 / month** | After Stripe's fee (about 2.9% + 30¢) you keep about $3.58 |
| Yearly | **$36 / year** | "3 months free" compared with monthly |

A speech check costs Angelio a tiny fraction of a cent, so these prices mostly support building new
games, which is worth saying (it's in the wording above and below).

**Statement descriptor** (what shows on their bank statement, max 22 characters)

> ANGELIO.ORG

**Payment Link settings**
- Collect the customer's **email** (on by default) and **name** (optional).
- After payment: **"Don't show confirmation page" → redirect to**
  `https://angelio.org/thanks?session_id={CHECKOUT_SESSION_ID}` (type it exactly, with the braces).
- Allow promotion codes: **on** (handy for gifting free months to your friends and testers).
- Custom text above the Pay button:
  > Your family code appears on the next page and works on all your family's devices.

**Customer portal** (Settings → Billing → Customer portal): turn it on, allow **cancel** and **switch
between monthly and yearly**. Business info → support email (see the checklist).

**Receipt emails** (Settings → Customer emails): turn on "Successful payments". Custom footer:
> Lost your family code? Reply to this email and we'll find it for you. · angelio.org (our only address)

---

## 3. On angelio.org: the words families see

**Hub, "Free for every family" → Speech checks box** (replaces "Coming soon")

> **🎙️ Speech checks**
> Games that listen to your child read or speak can check every word. Everyone gets 20 free checks a
> day. For more, a family code gives up to 300 a month on all your devices: $4 a month or $36 a year,
> and it helps keep every Angelio game free.
> [ Get a family code ]  ·  Have one? [ enter it here ]

**Thank-you page (angelio.org/thanks)**

> **Thank you! 🙏**
> Your family code is **XXXX-XXXX-XXXX**
> We've put it on this device already. To use it on another device, enter it once in the speech
> checks box on angelio.org (or in Articulate's Settings). Keep this code somewhere safe, like in a
> note on your phone. Your receipt from Stripe has a link to manage or cancel anytime.
> [ 📋 Copy code ]  [ Start practicing ▶ ]

**When a code's month is used up** (the games already say this)

> "This month's speech checks for your family code are used up. You can still listen and compare!"

**Short FAQ** (for the hub's About section)

> **Is Angelio free?** Yes. Every game, the read-aloud voice, and 20 speech checks a day are free.
> **What does a family code add?** Up to 300 speech checks a month, on all your family's devices.
> **Do you keep my child's recordings?** No. A recording is sent to be turned into text, then
> discarded. We don't store it, and no one listens to it.
> **How do I cancel?** Use the link in your Stripe receipt, or email us. Cancel anytime.

---

## 4. Terms of Service (plain-language draft)

> **Angelio Terms of Service** (angelio.org)
>
> Angelio offers free learning games for children at angelio.org. Some games offer optional
> "speech checks", which a parent or guardian can extend with a paid family code.
>
> **Who can buy.** Family codes must be bought by an adult (18+), for use by their family.
>
> **What you get.** A family code gives up to 300 speech checks per calendar month, for as long as
> your subscription is active. Unused checks don't carry over. We may change the games and features,
> but if we ever reduce what a paid code includes, we'll tell you first and you can cancel for a refund
> of the unused time.
>
> **Payments.** Payments are handled by Stripe. Subscriptions renew automatically until cancelled.
> You can cancel anytime from the link in your receipt; your code keeps working until the end of the
> period you paid for.
>
> **Fair use.** One code is for one family. Please don't share it publicly or resell it. We may turn
> off a code that's being misused, and we'll refund unused time if we do.
>
> **Free features.** The free games and free daily speech checks are offered as-is and may change.
>
> **No warranty.** Speech checks are a learning aid, not a medical or speech-therapy assessment. For
> speech concerns, please talk with a qualified speech-language pathologist.
>
> **Contact.** support@angelio.org

## 5. Refund policy

> **Refunds.** If you're not happy, email us within 30 days of a payment and we'll refund it in full,
> no questions asked. After 30 days you can cancel anytime and you won't be charged again.

## 6. Privacy policy (plain-language draft; have it checked)

> **Angelio Privacy Policy** (angelio.org)
>
> **No accounts, no ads, no tracking.** Angelio doesn't ask children for names, emails or accounts,
> shows no ads, and uses no tracking or analytics cookies.
>
> **Progress stays on your device.** Stars, stickers and settings are saved in your browser's storage
> on your device. We can't see them.
>
> **The read-aloud voice.** When the natural voice reads a sentence, the text of that sentence (like
> "How many ones?") is sent to Cloudflare to be spoken. It contains no personal information.
>
> **Speech checks (voice recordings).** When your child taps the microphone, a short recording is sent
> to our server at Cloudflare to be turned into text, so the game can check the word. The recording is
> used only for that, it is not stored, and no person listens to it. It's discarded as soon as the text
> is made. We keep a count of speech checks per family code (and, without a code, per day for each
> network, using a scrambled one-way fingerprint, not the address itself) to apply the limits.
>
> **Buying a family code.** Payment is handled by Stripe; we never see card numbers. We receive the
> buyer's email and name to connect the code to the purchase and to help if a code is lost.
>
> **Parents.** Questions, or want a family code removed? Email support@angelio.org.

Why the recording paragraph matters: under the US children's privacy law (COPPA), a child's voice
recording counts as personal information. The FTC has said it won't act when a recording is used only
to stand in for typed words and is deleted right away, *with a notice like the one above*. Angelio's
speech checks are built that way (the Worker sends audio to Cloudflare Workers AI and keeps nothing),
but the rules were updated in 2025, so a quick review by someone who knows them is worth it.

---

## 7. Your checklist

**In Stripe**
- [ ] Settings → Business: public business name **Angelio**, website **https://angelio.org**,
      support email, statement descriptor **ANGELIO.ORG**.
- [ ] **Stripe Tax**: turn it on and add your home state's registration if it taxes digital
      subscriptions (many states do, some don't; Stripe Tax shows where you owe). Small sellers
      usually only owe in their own state at first.
- [ ] Create the product and the two prices (section 2).
- [ ] Create a **Payment Link** with the settings in section 2.
- [ ] Turn on the **customer portal** and **receipt emails**.
- [ ] Create a **promotion code** for friends and testers (for example, 100% off for 3 months).

**Outside Stripe**
- [ ] A **support email**: support@angelio.org forwarding to your Gmail with Cloudflare Email
      Routing (free). This needs a DNS change on angelio.org: tell me and I'll walk you through it or
      set it up after you say yes.
- [ ] Have the **terms, refund and privacy** texts read once (COPPA especially).
- [ ] Decide the **price** (section 2) and whether the yearly plan is offered.
- [ ] If you'd rather keep Angelio separate from your personal finances: a DBA ("doing business as
      Angelio") or a small LLC, and a separate bank account in Stripe. Optional, but tidy at tax time.

**What I'll need from you to build it** (never paste these in chat; I'll show you where to put them)
- [ ] The **Payment Link URL**.
- [ ] A **restricted Stripe API key** (read-only on Checkout Sessions and Subscriptions), saved as a
      Worker secret in the Cloudflare dashboard.
- [ ] The **webhook signing secret**, after I tell you the webhook address to add in Stripe.

**What I'll build** (about a day of work, then tested with Stripe's test mode before going live)
- The thank-you page, the webhook (create, renew, cancel codes), "Get a family code" on the hub,
  lost-code search by email in the admin page, and the Terms / Refunds / Privacy pages.
