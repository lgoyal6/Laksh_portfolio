# lakshgoyal.com

Source for my personal site: **[lakshgoyal.com](https://www.lakshgoyal.com)**

A hand-built single page. No framework, no build step, no bundler. `index.html` is the
site; Vercel serves it as-is and runs the handlers in `api/` as serverless functions.

## What's on it

| Section | |
|---|---|
| Work | Where I've worked |
| Projects | Selected projects, with the full list on [`/projects.html`](https://www.lakshgoyal.com/projects.html) |
| Stack | Tools I reach for |
| Resume | The one-pager |
| Contact | An inquiry form that posts to a serverless handler rather than a mailto link |

## API handlers

Everything under `api/` is a Vercel serverless function. They exist so the page can show
live data without shipping any keys to the browser.

- `spotify.js` and `callback.js` run the Spotify OAuth refresh-token flow server-side and
  return what I am listening to.
- `letterboxd.js` parses my Letterboxd RSS feed for recent films.
- `letterboxd-poster.js` proxies poster images, allow-listing only `a.ltrbxd.com` and
  `s.ltrbxd.com` so the endpoint cannot be turned into an open image proxy.
- `inquiry.js` validates and length-caps the contact form, then sends it through Resend.

## Running it

There is no build. Open `index.html` directly, or for the API routes:

```bash
npx vercel dev
```

Spotify needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN`;
the contact form needs `RESEND_API_KEY`. Without them the page still renders, the
now-playing panel just stays empty.

## Notes on the repo

`MOTION_STACK.md` and `STRUCTURE_STACK.md` are reference notes on another site's
animation and layout approach, kept here as working material. They do not describe
this page.
