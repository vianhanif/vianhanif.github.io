---
title: "Medium First or LinkedIn First: An SEO Question"
date: 2026-09-15
tags: [writing, seo, syndication, medium, linkedin]
layout: page
---

I spent a few minutes thinking through the publishing order for this blog's syndication strategy. Not because it's a hard problem — it isn't — but because I wanted to understand *why* the order doesn't matter for SEO.

Here's the chain:

```
Blog (canonical) → Medium (with canonical tag) → LinkedIn (social only)
```

## The Short Answer

Publish Medium first. Not for SEO — it doesn't matter — but because LinkedIn's comment needs a URL that exists.

The real reason: LinkedIn's first comment will contain a link to the Medium post. You can't schedule that comment until Medium has a real URL. So Medium goes first. It's a workflow constraint, not an SEO constraint.

## The SEO Breakdown

**Blog is the canonical source.** It's live on `vianhanif.link` before any syndication happens. Push to `main` → GitHub Pages deploys. Googlebot can crawl and index it immediately.

**Medium gets a canonical tag.** When I import a post to Medium, I set the canonical URL pointing back to the blog. This tells Google: "this is syndicated content, the original lives here." Google treats it as a copy and attributes authority to the source. No duplicate content penalty.

**LinkedIn is social, not SEO.** LinkedIn links are `rel="nofollow"` by default. No link equity flows from LinkedIn to the blog or vice versa. LinkedIn posts are for reaching people in their feed — not for search rankings.

## Does Order Matter at All?

There's one edge case worth knowing: if Medium has stronger domain authority and gets indexed by Google *before* the blog finishes deploying, Medium might briefly outrank the blog in search results. The canonical tag resolves this on the next crawl cycle, but there's a window where the wrong URL shows up.

This window is short — typically hours, not days. And it only matters if someone searches for your post title *during* that window. For a personal blog with modest traffic, this is not a real concern.

## Sources

- [Google on syndicated content and canonical tags](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [LinkedIn nofollow links policy](https://www.linkedin.com/help/linkedin/answer/a243427)
