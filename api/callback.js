export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    res.status(400).send('No code received');
    return;
  }

  const host = req.headers.host;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `https://${host}/api/callback`,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const tokens = await tokenRes.json();

  res.setHeader('Content-Type', 'text/html');

  if (tokens.error) {
    res.status(400).send(`<h1>Error</h1><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
    return;
  }

  res.status(200).send(`
    <html><body style="background:#0a0a0a;color:#f0f0f0;font-family:monospace;padding:40px;">
      <h1 style="color:#1DB954;">Success!</h1>
      <p>Copy this refresh token and paste it back in your terminal:</p>
      <pre style="background:#1a1a1a;padding:16px;border-radius:8px;word-break:break-all;color:#1DB954;">
${tokens.refresh_token}</pre>
      <p style="color:#666;margin-top:20px;">You can close this tab now.</p>
    </body></html>
  `);
}
