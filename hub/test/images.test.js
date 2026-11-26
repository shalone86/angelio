import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import worker from "../worker/index.js";

const env = () => ({ ADMIN_KEY: "secret", CODES: { get: async () => null, put: async () => {}, list: async () => ({ keys: [], list_complete: true }) }, WATCH_MEDIA: { get: async () => null }, ASSETS: { fetch: async () => new Response("hub") } });
const call = (e, path, key = "secret") => worker.fetch(new Request(`https://angelio.org/api/admin/studio${path}`, { headers: { "x-admin-key": key } }), e);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

function fakeWeb(fetched) {
  const asJson = (d) => new Response(JSON.stringify(d), { headers: { "content-type": "application/json" } });
  return async (input) => {
    const u = new URL(typeof input === "string" ? input : input.url ?? String(input));
    fetched.push(u.href);
    if (u.host === "commons.wikimedia.org") return asJson({ query: { pages: { 1: { pageid: 1, title: "File:Hagia Sophia.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/t/480px-Hagia.jpg", url: "https://upload.wikimedia.org/Hagia.jpg", extmetadata: {} }] } } } });
    if (u.host === "sdcason.com" && u.pathname === "/") return new Response('<script data-key="0123456789abcdef0123456789"></script>');
    if (u.host === "sdcason.com") return asJson({ posts: [{ id: "p1", title: "Saint Michael", url: "https://sdcason.com/m/", feature_image: "https://sdcason.com/content/images/m.jpg" }] });
    if (u.host === "api.artic.edu") return new Response("down", { status: 503 });
    if (u.host === "openaccess-api.clevelandart.org") return asJson({ data: [{ id: 7, title: "Icon", images: { web: { url: "http://insecure.example.org/x.jpg" } } }] });
    if (u.host === "pictures.example.org" && u.pathname === "/a.png") return new Response(png);
    if (u.host === "pictures.example.org" && u.pathname === "/hop") return new Response(null, { status: 302, headers: { location: "https://pictures.example.org/a.png" } });
    if (u.host === "pictures.example.org" && u.pathname === "/sneaky") return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } });
    if (u.host === "pictures.example.org" && u.pathname === "/page") return new Response("<html>hi</html>", { headers: { "content-type": "text/html" } });
    if (u.host === "pictures.example.org" && u.pathname === "/drawing.svg") return new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', { headers: { "content-type": "image/svg+xml" } });
    if (u.host === "pictures.example.org" && u.pathname === "/huge.jpg") return new Response(new Uint8Array(16 * 1024 * 1024).fill(0xff), { headers: { "content-type": "image/jpeg" } });
    return new Response("not found", { status: 404 });
  };
}

test("reference picture search and its pass-through work only with the admin key, and only for pictures", async () => {
  const e = env();
  const fetched = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeWeb(fetched);
  try {
    for (const p of ["/images/search?q=fish", "/fetch-image?url=https%3A%2F%2Fpictures.example.org%2Fa.png"]) assert.equal((await call(e, p, "nope")).status, 401, p);
    assert.equal(fetched.length, 0, "nothing was fetched without the key");

    // Search: every source at once; one that fails is named and doesn't hide the others; only https pictures are listed.
    let r = await call(e, "/images/search?q=Hagia%20Sophia");
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.deepEqual(d.results.map((x) => x.source).sort(), ["sdcason", "wikimedia"]);
    assert.match(d.errors.join(" "), /Art Institute of Chicago: api\.artic\.edu answered 503/);
    assert.equal((await call(e, "/images/search?q=%20")).status, 400);

    // Pass-through: a real picture comes through, also after a redirect, as the type its bytes show...
    r = await call(e, "/fetch-image?url=" + encodeURIComponent("https://pictures.example.org/a.png"));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), "image/png");
    assert.deepEqual(new Uint8Array(await r.arrayBuffer()), png);
    assert.equal((await call(e, "/fetch-image?url=" + encodeURIComponent("https://pictures.example.org/hop"))).status, 200);
    // ...and nothing else.
    for (const bad of ["http://pictures.example.org/a.png", "https://localhost/a.png", "https://127.0.0.1/a.png", "https://[::1]/a.png", "https://10.0.0.5/a.png",
      "https://nas.local/a.png", "https://user:pw@pictures.example.org/a.png", "https://pictures.example.org:8443/a.png", "file:///etc/passwd", "not a link",
      "https://pictures.example.org/sneaky", "https://pictures.example.org/page", "https://pictures.example.org/drawing.svg", "https://pictures.example.org/huge.jpg"]) {
      r = await call(e, "/fetch-image?url=" + encodeURIComponent(bad));
      assert.equal(r.status, 400, bad);
      assert.ok((await r.json()).error, bad);
    }
    assert.ok(!fetched.some((u) => /localhost|127\.0\.0\.1|169\.254|10\.0\.0\.5|\.local\b/.test(u)), "no private address was ever fetched");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the reference panel sends search and pictures through the Studio routes, and never crashes on an odd answer", () => {
  const ref = fs.readFileSync(new URL("../public/studio/draw/reference.js", import.meta.url), "utf8");
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(ref, ctx);
  const { readSearch } = ctx.window.DrawReference;
  assert.ok(readSearch(404, { error: "not found" }).error);
  assert.equal(readSearch(401, { error: "wrong key" }).error, "wrong key");
  assert.ok(readSearch(200, null).error);
  assert.ok(readSearch(200, {}).error, "an answer without results is a message, not a crash");
  assert.equal(readSearch(200, { results: [{ id: 1 }], errors: [] }).results.length, 1);
  assert.doesNotMatch(ref, /src: r\.thumb/, "thumbnails come through angelio.org");
  assert.doesNotMatch(ref, /await fetch\('\/api\//, "search and link pasting go through useWeb");
  const draw = fs.readFileSync(new URL("../public/studio/draw/draw.js", import.meta.url), "utf8");
  assert.match(draw, /DrawReference\.useWeb\(\(address\) => fetch\(address\.replace\(\/\^\\\/api\\\/\/, "\/api\/admin\/studio\/"\), \{ headers: \{ "x-admin-key": key \} \}\)\)/);
});
