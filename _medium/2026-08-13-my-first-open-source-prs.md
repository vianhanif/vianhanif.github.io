---
layout: page
title: "I Opened My First Open Source PRs. None of Them Are Merged Yet."
date: 2026-08-13
linked_posts:
  - /posts/my-first-open-source-prs/
status: draft
---

# Medium Prep

## Content to Copy

I've been writing software professionally for years, but somehow I had never really contributed to an open-source project. I'd used plenty of them — forked them, patched them, built things on top of them. But opening a pull request and asking the original maintainers to merge my code? That was new.

The opening came from someone else's work. A developer named bloodf had built the MCP Gateway dashboard for [9router](https://github.com/decolua/9router) — an AI gateway I run locally. He wanted it merged into upstream 9router. I offered to help make that happen.

I wasn't building the feature. I was helping someone else's work become mergeable.

That's where I learned what contribution actually costs. It's not "find issue, write code, profit." It's integration. The feature worked fine in isolation — but reconciling it with the current state of upstream is where things broke in ways that weren't obvious until you tried to fit them together.

One example: the [grant normalization fix](https://github.com/bloodf/9router/pull/2). Gateway keys carry grants — which MCP instances a key can access. The persistence layer sometimes stored grants as full objects, sometimes as string IDs, depending on which code path wrote them. Everything worked until a key saved by one path got loaded by the other. The fix normalizes grants to string IDs on both load and save. The fix was small. The days of tracing to find it were not.

While helping with that, I kept finding smaller seams in upstream itself — ESM interop issues blocking plain-Node consumers, headroom compression choking on oversized payloads, dashboard asset URLs breaking behind proxy prefixes, combos export/import missing capacity adapter support. Each one became its own upstream PR.

Right now I have four open PRs in the upstream queue, plus two supporting the MCP Gateway effort. Zero merged.

I'd like to say that's fine and I'm at peace with it. Honestly? It's mixed. Maybe the maintainer is busy. Maybe some of these PRs don't match the project's direction. Opening a PR is a proposal, not a transaction.

But I've learned more from the process — tracing compatibility gaps, re-evaluating my patches against upstream progress — than I would have from one immediately accepted.

I used to think contributing meant writing code. Now I know it starts with understanding — the project, the maintainer's direction, the existing work — and then doing the integration work to make your change fit.

That's the part I didn't understand before I tried.

[→ Full story: https://vianhanif.link/posts/my-first-open-source-prs/]

## Tags for Medium
open-source, 9router, developer-tools, mcp, technical

## Publish Timing
→ Blog: August 13, 2026
→ Medium: D-0
→ LinkedIn: D+1

## Notes
- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] Condensed adaptation of the blog post — canonical URL must point to blog
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
