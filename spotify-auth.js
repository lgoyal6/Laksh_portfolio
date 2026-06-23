const http = require('http');
const https = require('https');
const { URL } = require('url');

const CLIENT_ID = '0e39998644764d968cf20787eb610200';
const CLIENT_SECRET = '850c9be0ef944c30a2994dc91da68079';
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'user-read-currently-playing user-top-read user-read-recently-played';

const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;

console.log('\n=== Spotify Authorization ===\n');
console.log('Opening browser... If it doesn\'t open, visit:\n');
console.log(authUrl + '\n');

require('child_process').exec(`open "${authUrl}"`);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  if (url.pathname !== '/callback') return;

  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No code received. Check the URL.');
    return;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }).toString();

  const tokenReq = https.request('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
  }, (tokenRes) => {
    let data = '';
    tokenRes.on('data', c => data += c);
    tokenRes.on('end', () => {
      const tokens = JSON.parse(data);
      console.log('\n=== SUCCESS ===\n');
      console.log('SPOTIFY_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\nAdd this to your .env file.\n');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Done!</h1><p>Go back to your terminal — the refresh token is printed there.</p><p>You can close this tab.</p>');
      setTimeout(() => { server.close(); process.exit(0); }, 1000);
    });
  });
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(3000, () => console.log('Waiting for callback on http://localhost:3000 ...\n'));
