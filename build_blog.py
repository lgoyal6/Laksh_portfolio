#!/usr/bin/env python3
"""Render blog/posts/*.md into static pages and rebuild blog.html.

Posts are markdown with a small frontmatter block. Run this after writing one:

    python3 build_blog.py

and commit what it changes. The output is plain HTML, so the site stays static
and the host needs nothing installed. Requires `markdown` locally only.

Frontmatter keys:
    title      required
    date       required, YYYY-MM-DD
    summary    required, one or two sentences for the index
    tags       optional, comma separated
    crosspost  optional, URL where the piece is also published
    draft      optional, `true` keeps it out of the build
"""
import html
import pathlib
import re
import sys

try:
    import markdown
except ImportError:
    sys.exit("pip install markdown")

ROOT = pathlib.Path(__file__).parent
POSTS = ROOT / "blog" / "posts"
OUT = ROOT / "blog"
SITE = "https://lakshgoyal.com"

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{url}">
<meta property="og:type" content="{ogtype}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
{extra}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}assets/site.css">
</head>
<body class="subpage">

<div id="backdrop" aria-hidden="true"></div>

<div class="wrap">
  <nav>
    <div class="nav-roles"><a href="{base}index.html" style="text-decoration:none">LAKSH GOYAL</a> · BLOG</div>
    <div class="nav-links">
      <a href="{base}index.html#about">About</a>
      <a href="{base}index.html#work">Projects</a>
      <a href="{base}index.html#experience">Experience</a>
      <a href="{base}index.html#resume">Resume</a>
      <a href="{base}blog.html" style="color:var(--accent)">Blog</a>
      <a href="{base}freelance.html">Freelance</a>
      <a href="{base}index.html#contact">Contact</a>
    </div>
  </nav>
</div>
"""

FOOT = """
<div class="copyright">© 2026 Laksh Goyal</div>
</body>
</html>
"""


def parse(path):
    raw = path.read_text()
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    if not m:
        sys.exit(f"{path.name}: needs a --- frontmatter block")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    for required in ("title", "date", "summary"):
        if required not in meta:
            sys.exit(f"{path.name}: frontmatter is missing `{required}`")
    meta["slug"] = path.stem
    meta["body"] = m.group(2)
    return meta


def pretty(date):
    y, m, d = date.split("-")
    months = ("January February March April May June July "
              "August September October November December").split()
    return f"{int(d)} {months[int(m) - 1]} {y}"


def render_post(meta):
    body = markdown.markdown(
        meta["body"], extensions=["fenced_code", "tables", "smarty"])
    tags = meta.get("tags", "")
    tagline = f' · {html.escape(tags)}' if tags else ""
    cross = ""
    if meta.get("crosspost"):
        cross = (f'<a href="{html.escape(meta["crosspost"])}" target="_blank" '
                 f'rel="noopener">Also published here ↗</a>')
    head = HEAD.format(
        title=html.escape(meta["title"]) + " · Laksh Goyal",
        desc=html.escape(meta["summary"]),
        ogtype="article",
        url=f"{SITE}/blog/{meta['slug']}.html",
        site=SITE, base="../", extra="")
    return head + f"""
<div class="wrap">
  <article class="post">
    <div class="when">{pretty(meta['date'])}{tagline}</div>
    <h1>{html.escape(meta['title'])}</h1>
    <p class="standfirst">{html.escape(meta['summary'])}</p>
{body}
    <div class="post-foot">
      <a href="../blog.html">← All posts</a>
      <span>{cross}</span>
    </div>
  </article>
</div>
""" + FOOT


def render_index(posts):
    if posts:
        rows = "\n".join(f"""    <a class="post-row" href="blog/{p['slug']}.html">
      <div class="when">{pretty(p['date'])}</div>
      <div>
        <h3>{html.escape(p['title'])}</h3>
        <p>{html.escape(p['summary'])}</p>
        <div class="meta">{html.escape(p.get('tags', 'writing'))}</div>
      </div>
    </a>""" for p in posts)
        listing = f'  <div class="post-list">\n{rows}\n  </div>'
    else:
        listing = ('  <div class="empty-note">No posts yet. The first one is being '
                   'written.</div>')

    head = HEAD.format(
        title="Blog · Laksh Goyal",
        desc=("Writing about applied ML systems and the infrastructure under them: "
              "evals that tell the truth, inference cost, and what building the "
              "thing taught me that reading about it did not."),
        ogtype="website", url=f"{SITE}/blog.html", site=SITE, base="", extra="")
    return head + f"""
<div class="wrap blog-col">
<div class="page-head">
  <div class="sec-label">Writing</div>
  <h1>Notes from building<br>and measuring.</h1>
  <p class="lede">Most of what I learn comes from the gap between what a system was supposed to do and what it
  measurably did. These are the ones worth writing down: an eval that said the opposite of the received wisdom,
  a bug that only appeared once the thing was deployed, a number that turned out to be measuring the wrong clock.</p>
</div>

<div class="page-body">
{listing}
  <div class="blog-foot">
    Written as I go, so the cadence is irregular by design: I write one when something surprised me.<br>
    Elsewhere &rarr; <a href="https://github.com/lgoyal6">github</a> &middot;
    <a href="https://linkedin.com/in/lakshgoyal">linkedin</a> &middot;
    <a href="https://x.com/Lgoyal6">x</a>
  </div>
</div>
</div>
""" + FOOT


def main():
    posts = [parse(f) for f in sorted(POSTS.glob("*.md"))]
    posts = [p for p in posts if p.get("draft", "").lower() != "true"]
    posts.sort(key=lambda p: p["date"], reverse=True)
    for p in posts:
        (OUT / f"{p['slug']}.html").write_text(render_post(p))
        print(f"  blog/{p['slug']}.html")
    (ROOT / "blog.html").write_text(render_index(posts))
    print(f"  blog.html ({len(posts)} post{'' if len(posts) == 1 else 's'})")


if __name__ == "__main__":
    main()
