# lakshgoyal.com

Source for my personal site: **[lakshgoyal.com](https://www.lakshgoyal.com)**

Hand-built static HTML. No framework and no bundler. Vercel serves the files as-is and
runs the handlers in `api/` as serverless functions. The only build step is the blog,
and it writes HTML you commit, so the deployed site stays static either way.

Shared styling lives in `assets/site.css` and the contact form in `assets/inquiry.js`,
so `index.html`, `projects.html`, `freelance.html` and every blog page look and behave
like one site rather than four.

## What's on it

| Page or section | |
|---|---|
| Projects | Selected projects. Seventeen link to a live demo that runs the repository's own code |
| Experience | Where I've worked |
| Stack | Tools I reach for |
| Resume | The one-pager |
| [`/projects.html`](https://lakshgoyal.com/projects.html) | Every project in one list |
| [`/blog.html`](https://lakshgoyal.com/blog.html) | Writing, built from markdown |
| [`/freelance.html`](https://lakshgoyal.com/freelance.html) | What I take on as freelance work, and how it runs |
| Contact | An inquiry form that posts to a serverless handler rather than a mailto link |

## Writing a post

Posts are markdown in `blog/posts/`, one file per post, named for the URL slug you
want. The frontmatter block is small:

```markdown
---
title: The bugs that only exist after you deploy
date: 2026-08-26
summary: One or two sentences. This is what shows on the index and in a link preview.
tags: infrastructure, go, deployment
crosspost: https://example.com/same-piece   # optional
draft: true                                  # optional, keeps it out of the build
---
```

Then rebuild and commit what changes:

```bash
python3 build_blog.py
```

It writes `blog/<slug>.html` for each post and regenerates `blog.html`. The generated
HTML is committed, so nothing has to run at deploy time. `markdown` is the only
dependency and it is only needed locally.

## The share card

`assets/og.png` is the 1200x630 image link previews use. It is generated rather than
designed by hand, from the site's own palette and type, so it cannot drift from the
page. The generator lives outside this repo with the ones that build the per-project
cards.

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
