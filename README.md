# Angelio

The hub for our kids' learning apps: **https://angelio.org**

- `public/`: the hub page (`js/apps.js` lists the apps, live and coming soon).
- `worker/index.js`: forwards `angelio.org/<app>/…` to each app's own Worker through a service binding, stripping the prefix. The apps use relative links, so they work under a path unchanged.
- `ROADMAP.md`: what's next.

## Add an app

1. Build it from `shalone86/app-template` and deploy it as its own Worker (no custom domain needed).
2. Add it to `APPS` in `worker/index.js`, add a service binding in `wrangler.jsonc`, and add a card in `public/js/apps.js`. `npm test` checks the three agree.
3. In the app, give `public/sw.js` its own `APP` name, and make `S.init("<app>:v1")` unique: all apps share angelio.org.
4. `npx wrangler deploy` here.

Moving an app that had its own domain: set `HOME_URL` and `STORE_KEY` in its `wrangler.jsonc` vars; the old address then sends visitors to the hub with their saved progress.

## Develop

```bash
npm install
npm test
npx wrangler deploy
```
