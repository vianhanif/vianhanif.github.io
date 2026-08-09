---
title: "I Opened My First Open Source PRs. None of Them Are Merged Yet."
date: 2026-08-13
tags: [9router, open-source, workflow, agents]
layout: post
---

I've been writing software professionally for years, but somehow I had never really contributed to an open-source project.

I've used plenty of them. Forked them. Patched them. Built things on top of them. But opening a pull request and asking the original maintainers to merge my code? That was new.

## It Wasn't My Feature

I didn't start with a groundbreaking feature. I started as a [9router](https://github.com/decolua/9router) user, then a tinkerer — I've written about [what I changed in my fork](/posts/what-i-changed-in-9router/). Eventually I found myself watching the upstream repository, wondering what it would take to actually contribute.

The opening came from someone else's work. [bloodf](https://github.com/bloodf) had built the [MCP Gateway dashboard](https://github.com/decolua/9router/pull/2234) — a UI for managing MCP server instances and gateway keys, building on the earlier upstream MCP Gateway work in PR #1938. He wanted it merged upstream. I offered to help make that happen.

I wasn't building the feature. I was helping someone else's work become mergeable.

That's where I learned what contribution actually costs. It's not "find issue, write code, profit." It's integration. The feature worked fine in isolation. But reconciling it with the current state of upstream — that's where things broke in ways that weren't obvious until you tried to fit them together.

Concrete example: the [grant normalization fix](https://github.com/bloodf/9router/pull/2). Gateway keys carry grants — which MCP instances a key can access. The persistence layer sometimes stored grants as full objects, sometimes as string IDs, depending on which code path wrote them. Everything worked until a key saved by one path got loaded by the other. The fix normalizes grants to string IDs on both load and save. Small diff, days of tracing to find it. That's what integration work actually looks like.

While helping with that, I kept finding smaller seams in upstream itself — things that got in the way of my own daily use. The messiest part was making 9router work for Node.js developers who use modern JavaScript module imports. To untangle that, we had to split the API server into its own standalone process. That story deserves its own post.

Seams found:
- [ESM interop issues](https://github.com/decolua/9router/pull/3069) blocking plain-Node consumers
- [Headroom compression](https://github.com/decolua/9router/pull/3066) choking on oversized payloads
- [Dashboard asset URLs](https://github.com/decolua/9router/pull/3065) breaking behind proxy prefixes
- [Combos export/import](https://github.com/decolua/9router/pull/3062) missing capacity adapter support

Each one became its own upstream PR. None of them were features I set out to build. They were gaps between what existed and what worked.

## The Reality of the Queue

Right now, I have four open PRs sitting in the upstream queue, plus two on bloodf's fork supporting the MCP Gateway effort.

Zero merged.

I'd like to say that's fine and I'm at peace with it. Honestly? It's mixed. Maybe the maintainer is busy. Maybe some of these PRs don't match the project's direction and will sit there or get closed. That's a real possibility I have to accept — opening a PR is a proposal, not a transaction.

But I've learned more from the process of getting these PRs ready — tracing compatibility gaps, re-evaluating my patches against upstream progress, writing descriptions a maintainer can actually review — than I would have from having one immediately accepted.

## The Point Isn't The Merge

Maybe by the time you read this, one of them will be merged. If not, there's probably another lesson waiting in the review queue.

I used to think contributing meant writing code. Now I know it starts with understanding — the project, the maintainer's direction, the existing work — and then doing the integration work to make your change fit.

That's the part I didn't understand before I tried.

---

*This is my first real experience contributing upstream. The code is ready — the PRs are open. And I'm still learning what it means to participate in a project beyond my own fork.*

---

### Sources
- [MCP Gateway dashboard PR #2234 by bloodf](https://github.com/decolua/9router/pull/2234)
- [Grant normalization fix — bloodf/9router PR #2](https://github.com/bloodf/9router/pull/2)
- [Upstream merge v0.5.50 — bloodf/9router PR #1](https://github.com/bloodf/9router/pull/1)
- [fix(open-sse) PR #3069](https://github.com/decolua/9router/pull/3069) · [fix(headroom) PR #3066](https://github.com/decolua/9router/pull/3066) · [fix(headroom) PR #3065](https://github.com/decolua/9router/pull/3065) · [feat(combos) PR #3062](https://github.com/decolua/9router/pull/3062)
