const ALLOWED_HOSTS = new Set(['a.ltrbxd.com', 's.ltrbxd.com']);

function isAllowed(url) {
  return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
}

export default async function handler(req, res) {
  try {
    const raw = req.query?.url;
    if (!raw || Array.isArray(raw)) {
      res.status(400).json({ error: 'missing url' });
      return;
    }

    const url = new URL(raw);
    if (!isAllowed(url)) {
      res.status(400).json({ error: 'unsupported poster host' });
      return;
    }

    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (portfolio-fetcher)' },
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `poster status ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      res.status(502).json({ error: 'upstream did not return an image' });
      return;
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(bytes);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
