// Angelio hub (angelio.org): serves the hub page (public/) and puts every learning app under
// its own path, e.g. angelio.org/regroup/ → the "regroup" Worker, through a service binding.
//
// The apps don't change: they use relative links (css/app.css, api/tts, sw.js), so they work
// under a path as they are. The hub strips the prefix before passing the request on.
//
// To add an app: add it to APPS here, add a service binding in wrangler.jsonc, and add a card
// in public/js/apps.js.

export const APPS = {
  regroup: "REGROUP", // Regroup! (regroup Worker)
  snap: "SNAP", // Snap & Split (snap-split Worker)
  doubles: "DOUBLES", // Doubles (doubles Worker)
  grammar: "GRAMMAR", // Grammar (grammar Worker)
  // Articulate also keeps its own address (articulate.shalonely.com): both work, no redirect.
  articulate: "ARTICULATE", // Articulate (articulation Worker)
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, first = "", ...rest] = url.pathname.split("/");
    const binding = APPS[first.toLowerCase()];

    if (binding) {
      // /regroup → /regroup/ so the app's relative links resolve inside its folder.
      if (url.pathname === `/${first}`) return Response.redirect(`${url.origin}/${first}/${url.search}`, 301);
      const app = env[binding];
      if (!app) return new Response(`The ${first} app isn't connected to the hub yet.`, { status: 503 });
      const inner = new URL(request.url);
      inner.pathname = `/${rest.join("/")}`;
      const res = await app.fetch(new Request(inner, request));
      // Keep redirects inside the app's folder.
      const loc = res.headers.get("location");
      if (loc && loc.startsWith("/")) {
        const out = new Response(res.body, res);
        out.headers.set("location", `/${first}${loc}`);
        return out;
      }
      return res;
    }

    return env.ASSETS.fetch(request);
  },
};
