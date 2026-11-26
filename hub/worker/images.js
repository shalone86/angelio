/**
 * Reference picture search for the Studio's Drawings page (public/studio/draw/reference.js): the same free sources
 * as the Lesson Studio on the Mac (workshop/studio/images.mjs): his gallery (sdcason.com), Wikimedia Commons, the
 * Art Institute of Chicago and the Cleveland Museum of Art. None needs a secret key (the gallery's is the read-only
 * search key sdcason.com already publishes on its home page). Pico Parish has the same file (worker/images.js).
 *
 * Both routes are Studio routes, so only the admin key can use them (worker/index.js checks it):
 *   GET /api/admin/studio/images/search?q=…&page=…  → { results, errors }
 *   GET /api/admin/studio/fetch-image?url=…          → the picture itself, passed through angelio.org
 * The pass-through is what lets the page show the thumbnails and trace a picture without other sites' pictures
 * spoiling the canvas. So it can't be used to fetch anything else, it takes only https addresses on public host
 * names (no IP addresses, localhost or .local), checks every redirect the same way, and passes on only real
 * pictures (JPEG, PNG, GIF, WebP or AVIF, checked by their first bytes, so never SVG or HTML) of at most 15 MB.
 */
const UA = 'angelio-studio/1.0 (+https://angelio.org)';
const MAX_PICTURE = 15 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const PER_PAGE = 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const getJson = async (address) => {
  const res = await fetch(address, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${new URL(address).host} answered ${res.status}`);
  return res.json();
};
const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
let sdcasonKey = null; // found once per Worker instance

export const SOURCES = {
  wikimedia: {
    label: 'Wikimedia Commons',
    async search(q, page) {
      const d = await getJson('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
        action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrsearch: `${q} filetype:bitmap`,
        gsrlimit: String(PER_PAGE), gsroffset: String(page * PER_PAGE), prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '480', origin: '*',
      }));
      return Object.values(d.query?.pages ?? {}).map((p) => {
        const i = p.imageinfo?.[0] ?? {};
        const m = i.extmetadata ?? {};
        return { source: 'wikimedia', id: String(p.pageid), title: strip(m.ObjectName?.value) || String(p.title ?? '').replace(/^File:|\.\w+$/g, ''),
          creator: strip(m.Artist?.value) || 'Unknown', license: strip(m.LicenseShortName?.value) || 'See page', page: i.descriptionurl, thumb: i.thumburl, full: i.url };
      }).filter((x) => x.thumb && /\.(jpe?g|png|webp|tiff?)(\?|$)/i.test(x.full || ''));
    },
  },
  sdcason: {
    label: 'The Free Catholic Gallery (sdcason.com)',
    async search(q, page) {
      sdcasonKey ??= (async () => {
        const html = await (await fetch('https://sdcason.com/', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(15000) })).text();
        const k = /data-key="([0-9a-f]{20,})"/.exec(html)?.[1];
        if (!k) throw new Error("couldn't find the gallery's search key");
        return k;
      })().catch((e) => { sdcasonKey = null; throw e; });
      const key = await sdcasonKey;
      const safe = q.replace(/['"\\]/g, ' ').trim();
      const filter = `feature_image:-null+(title:~'${safe}',tag:~'${safe}',custom_excerpt:~'${safe}')`;
      const d = await getJson(`https://sdcason.com/ghost/api/content/posts/?key=${key}&limit=${PER_PAGE}&page=${page + 1}&fields=id,title,url,feature_image&filter=${encodeURIComponent(filter)}`);
      return (d.posts ?? []).filter((p) => p.feature_image).map((p) => ({ source: 'sdcason', id: p.id, title: p.title, creator: 'The Free Catholic Gallery',
        license: 'Public domain (per the gallery)', page: p.url, thumb: p.feature_image.replace('/content/images/', '/content/images/size/w600/'), full: p.feature_image }));
    },
  },
  artic: {
    label: 'Art Institute of Chicago',
    async search(q, page) {
      const d = await getJson(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&fields=id,title,artist_display,image_id&limit=${PER_PAGE}&page=${page + 1}`);
      const base = d.config?.iiif_url ?? 'https://www.artic.edu/iiif/2';
      return (d.data ?? []).filter((a) => a.image_id).map((a) => ({ source: 'artic', id: String(a.id), title: a.title, creator: strip(a.artist_display).split('\n')[0] || 'Unknown',
        license: 'Public domain (CC0)', page: `https://www.artic.edu/artworks/${a.id}`, thumb: `${base}/${a.image_id}/full/400,/0/default.jpg`, full: `${base}/${a.image_id}/full/1686,/0/default.jpg` }));
    },
  },
  cleveland: {
    label: 'Cleveland Museum of Art',
    async search(q, page) {
      const d = await getJson(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&has_image=1&cc0=1&limit=${PER_PAGE}&skip=${page * PER_PAGE}`);
      return (d.data ?? []).filter((a) => a.images?.web?.url).map((a) => ({ source: 'cleveland', id: String(a.id), title: a.title, creator: a.creators?.[0]?.description || a.culture?.[0] || 'Unknown',
        license: 'Public domain (CC0)', page: a.url, thumb: a.images.web.url, full: a.images.print?.url ?? a.images.web.url }));
    },
  },
};

/** Every source at once; one that fails is named in `errors` and doesn't hide the others. Only https pictures are listed. */
export async function searchImages(q, page = 0) {
  const out = await Promise.all(Object.entries(SOURCES).map(async ([id, s]) => {
    try { return { results: await s.search(q, page) }; } catch (e) { return { error: `${s.label}: ${e?.message || e}` }; }
  }));
  const https = (u) => { try { return new URL(u).protocol === 'https:'; } catch { return false; } };
  return {
    results: out.flatMap((o) => o.results ?? []).filter((r) => https(r.thumb) && (!r.full || https(r.full))),
    errors: out.filter((o) => o.error).map((o) => o.error),
  };
}

/** An address the pass-through may fetch: https on a public host name. Returns the URL, or throws why not. */
export function pictureAddress(address) {
  let u;
  try { u = new URL(address); } catch { throw new Error("That isn't a web address."); }
  if (u.protocol !== 'https:') throw new Error('Only https pictures.');
  if (u.username || u.password) throw new Error('Only plain web addresses.');
  if (u.port && u.port !== '443') throw new Error('Only plain web addresses.');
  const host = u.hostname.toLowerCase();
  const ipLiteral = /^\d+(\.\d+){0,3}$/.test(host) || host.startsWith('[') || /^0x[0-9a-f]+$/.test(host);
  if (ipLiteral || !host.includes('.') || /(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(host)) throw new Error('Only pictures on public websites.');
  return u;
}

/** What kind of picture these bytes are (by their first bytes), or null. Never SVG or HTML. */
export function pictureType(b) {
  const ascii = (start, len) => String.fromCharCode(...b.subarray(start, start + len));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'image/png';
  if (b.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return 'image/gif';
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && ascii(4, 4) === 'ftyp' && /^avi[fs]$/.test(ascii(8, 4))) return 'image/avif';
  return null;
}

async function readCapped(res, max) {
  const told = Number(res.headers.get('content-length'));
  if (told > max) throw new Error('That picture is too big (15 MB at most).');
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => {}); throw new Error('That picture is too big (15 MB at most).'); }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.byteLength; }
  return out;
}

/** Fetch one picture for the page, following at most 3 redirects, each checked like the first address. */
export async function fetchPicture(address) {
  let u = pictureAddress(address);
  for (let hop = 0; ; hop++) {
    const res = await fetch(u, { headers: { 'user-agent': UA, accept: 'image/*' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (hop >= MAX_REDIRECTS) throw new Error('That address sends you around too many times.');
      u = pictureAddress(new URL(res.headers.get('location'), u).href);
      continue;
    }
    if (!res.ok) throw new Error(`That site answered ${res.status}.`);
    const bytes = await readCapped(res, MAX_PICTURE);
    const type = pictureType(bytes);
    if (!type) throw new Error("That link isn't a picture (try Copy Image Address on the picture itself).");
    return { bytes, type };
  }
}

/** The two routes; anything else is for the rest of the Studio API (returns null). */
export async function imagesApi(route, url) {
  if (route === 'GET /images/search') {
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 120);
    if (!q) return json({ error: 'Type something to search for.' }, 400);
    const page = Math.max(0, Math.min(40, Number(url.searchParams.get('page')) || 0));
    return json(await searchImages(q, page));
  }
  if (route === 'GET /fetch-image') {
    try {
      const { bytes, type } = await fetchPicture(url.searchParams.get('url') ?? '');
      return new Response(bytes, { headers: { 'content-type': type, 'content-length': String(bytes.byteLength), 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' } });
    } catch (e) {
      return json({ error: e?.name === 'TimeoutError' ? 'That site took too long to answer.' : String(e?.message || e) }, 400);
    }
  }
  return null;
}
