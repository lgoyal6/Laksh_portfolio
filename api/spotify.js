export default async function handler(req, res) {
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }).toString(),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) {
      res.status(500).json({ error: 'no access token' });
      return;
    }

    const auth = { Authorization: `Bearer ${access_token}` };

    const nowRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: auth });

    if (nowRes.status === 200) {
      const data = await nowRes.json();
      if (data && data.item) {
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
        res.status(200).json({
          playing: !!data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          album: data.item.album.name,
          image: data.item.album.images[0]?.url || null,
          url: data.item.external_urls.spotify,
          progressMs: data.progress_ms,
          durationMs: data.item.duration_ms,
        });
        return;
      }
    }

    const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: auth });
    const recent = await recentRes.json();
    const last = recent.items?.[0];
    if (!last) {
      res.status(200).json({ playing: false, empty: true });
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      playing: false,
      title: last.track.name,
      artist: last.track.artists.map(a => a.name).join(', '),
      album: last.track.album.name,
      image: last.track.album.images[0]?.url || null,
      url: last.track.external_urls.spotify,
      playedAt: last.played_at,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
