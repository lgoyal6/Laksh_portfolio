---
title: I got tired of losing my own resume, so I built Leaf
date: 2026-11-07
summary: I kept losing the exact resume I had sent to a company, so I built a local macOS search tool that separates filename matches from content matches and explains why each file appeared.
tags: macOS, swift, search, local-first
---

I’ve been getting a bunch of interviews recently for roles I applied to back in July and August, which is great until I need to find the resume I actually applied with.

That part has been less great.

I have a folder full of resumes, cover letters, job descriptions, recruiter notes, PDFs, and exported documents. When an interview request arrives weeks later, I know the company, the approximate date, and that I probably made a few changes for that role. I still end up searching for the file like I am trying to recover evidence from a crime scene.

Finder will happily show me a random configuration file with thousands of lines because the word I searched for appears somewhere inside it. Finding the actual PDF becomes a second problem. After enough macOS Tahoe updates, Finder should have become easier to use by now. It did not, so I built Leaf.

## The search model was the problem

Search could find plenty. The problem was that filename matches and content matches were mixed together as if they were equally useful.

A file called `Stripe_Resume.pdf` and a source file containing “Stripe” in a long comment should not compete in one undifferentiated list. If I search for a company and `pdf`, I want the document whose filename matches. If I search for a phrase from a document, I want to see the line where that phrase appears.

Leaf gives those matches separate sections. **Name** contains files whose names match. **Inside** contains files whose contents match, with the matching line and PDF page when available.

Press `⌘⇧Space`, type what you would say, and Leaf handles the rest. Search `stripe pdf` for a resume. Search `notes doc this week` for recent documents. Search `invoice in downloads` to limit the scope. Type `voltare` and Leaf can still find `Voltaire.pdf` when the typo is close enough.

There is no filter syntax to memorize. The query bar understands file types, dates, folders, and ordinary search terms together.

## A small parser and a few useful fallbacks

Some words become type filters such as `pdf`, `doc`, `slides`, `sheet`, `image`, `video`, and `code`. Phrases such as `today`, `this week`, and `last month` become date ranges. `in downloads`, `in desktop`, and `in documents` become folder scopes. Everything else stays a search term.

Leaf keeps the structured query and a plain-text version. If a filtered search returns nothing, it can retry every word as ordinary text. A parser should help the search, not turn one missing piece of metadata into a dead end.

Leaf uses the Spotlight index that macOS already maintains, so it does not run another indexing daemon. Search happens in stages. It checks fresh files in Downloads and Desktop, queries Spotlight for names and contents, widens the name search when the result pool is small, and falls back to a direct filename scan when Spotlight returns nothing.

That fallback is intentionally honest. It can recover a file by name, but it cannot pretend a direct scan has recreated Spotlight’s content index. Leaf tells you when a result came from that path.

## Results should explain themselves

Name matches are ranked in tiers. Exact matches come first, followed by prefixes, word starts, ordinary contains matches, and close typos. Leaf also considers whether the file is a document or code, whether I have opened it before, and how recently it was used or changed.

Every result carries a reason such as `name`, `name · typo`, `inside p.3`, or `pdf · last week`. For a PDF content match, Leaf shows a short line around the word and opens the preview at the matching page with the word highlighted.

It also collapses verified identical copies such as `report.pdf` and `report (1).pdf` into one row. The goal is to reduce the work after search, not just produce a longer list.

## The app stays small and local

Leaf lives in the menu bar. Press the shortcut, search, preview a file, copy its path, reveal it in Finder, or drag it into Mail, Slack, or a browser upload box. The panel is a non-activating macOS window, so the application I was already using stays in front.

<figure class="post-video">
  <video controls preload="metadata" playsinline>
    <source src="../assets/leaf-demo.mp4" type="video/mp4">
    Your browser does not support the video element.
  </video>
  <figcaption>Leaf finding a resume by company name and file type.</figcaption>
</figure>

Search queries and file contents stay on the Mac. PDFs are read by a separate sandboxed helper with no file or network access. Opening an app, script, or installer from Leaf asks for a second Return.

The current release requires macOS 14 or later and may require approving folder access on first launch. It is also not notarized, so macOS can require an Open Anyway step. The repository is still called `findr` because the bundle identifier, saved-data directory, and signed update feed already use that name. The public app is Leaf.

I built Leaf because I needed to find a resume I had already written. The operating system already had most of the pieces. The missing piece was a search experience that understood why a file matched and showed the useful match first.

That is the whole app. I know the words, the file type, and roughly when I created something. Leaf helps me find the file before the interview starts.

[Try Leaf on GitHub](https://github.com/lgoyal6/findr) · [Watch the 20-second demo](https://x.com/Lgoyal6/status/2119176978897183215)
