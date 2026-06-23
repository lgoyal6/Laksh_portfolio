const USER = 'spockur';
const ORIGIN = 'https://letterboxd.com';
const PROFILE = `${ORIGIN}/${USER}/`;
const FEED = `${PROFILE}rss/`;
const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0 (portfolio-fetcher)' };

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function pick(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  let v = m[1].trim();
  v = v.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  return decode(v.trim());
}

function attr(block, name) {
  const re = new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = block.match(re);
  return m ? decode(m[1] || m[2]) : null;
}

function absoluteLetterboxdUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

function posterProxy(url) {
  if (!url) return null;
  return `/api/letterboxd-poster?url=${encodeURIComponent(url)}`;
}

function stripYear(name) {
  return String(name || '').replace(/\s+\(\d{4}\)$/, '');
}

function uidPosterCandidate(uid, slug) {
  const id = String(uid || '').replace(/^film:/, '');
  if (!id || !slug) return null;
  return `https://a.ltrbxd.com/resized/film-poster/${id.split('').join('/')}/${id}-${slug}-0-230-0-345-crop.jpg`;
}

async function fetchText(url) {
  const r = await fetch(url, { headers: FETCH_HEADERS });
  if (!r.ok) throw new Error(`${url} status ${r.status}`);
  return r.text();
}

async function resolveFilmPoster(link, fallback) {
  try {
    const html = await fetchText(absoluteLetterboxdUrl(link));
    const jsonLd = html.match(/<script type="application\/ld\+json">\s*\/\* <!\[CDATA\[ \*\/([\s\S]*?)\/\* \]\]> \*\/\s*<\/script>/i);
    if (!jsonLd) return fallback;
    const image = jsonLd[1].match(/"image"\s*:\s*"([^"]+)"/i);
    return image ? decode(image[1]) : fallback;
  } catch (_) {
    return fallback;
  }
}

async function getFavorites() {
  const html = await fetchText(PROFILE);
  const favorites = [];
  const favRe = /<div class="favourite-production-poster-container"[\s\S]*?<div class="react-component"[^>]*data-component-class="LazyPoster"[^>]*>/g;
  let m;

  while ((m = favRe.exec(html)) !== null) {
    const block = m[0];
    const link = attr(block, 'data-item-link');
    const name = attr(block, 'data-item-name') || attr(block, 'data-item-full-display-name');
    const slug = attr(block, 'data-item-slug');
    const identifier = attr(block, 'data-postered-identifier') || '';
    const uid = identifier.match(/"uid":"([^"]+)"/)?.[1];
    const fallbackPoster = uidPosterCandidate(uid, slug);
    const poster = await resolveFilmPoster(link, fallbackPoster);

    favorites.push({
      title: stripYear(name),
      link: absoluteLetterboxdUrl(link),
      poster: posterProxy(poster),
    });

    if (favorites.length >= 4) break;
  }

  return favorites;
}

export default async function handler(req, res) {
  try {
    const [favorites, r] = await Promise.all([
      getFavorites().catch(() => []),
      fetch(FEED, { headers: FETCH_HEADERS }),
    ]);
    if (!r.ok) {
      res.status(500).json({ error: `feed status ${r.status}` });
      return;
    }
    const xml = await r.text();
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1];
      const title = pick(block, 'title') || '';
      const link = pick(block, 'link') || '';
      const pubDate = pick(block, 'pubDate') || '';
      const filmTitle = pick(block, 'letterboxd:filmTitle');
      const filmYear = pick(block, 'letterboxd:filmYear');
      const memberRating = pick(block, 'letterboxd:memberRating');
      const watchedDate = pick(block, 'letterboxd:watchedDate');
      const description = pick(block, 'description') || '';

      const posterMatch = description.match(/<img\s+src="([^"]+)"/i);
      const poster = posterMatch ? posterProxy(posterMatch[1]) : null;

      items.push({
        title,
        link,
        pubDate,
        film: filmTitle,
        year: filmYear,
        rating: memberRating ? parseFloat(memberRating) : null,
        watchedDate,
        poster,
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ favorites, count: items.length, items: items.slice(0, 12) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
