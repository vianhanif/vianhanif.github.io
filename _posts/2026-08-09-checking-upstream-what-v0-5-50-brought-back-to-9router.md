---
title: "Checking Upstream: What v0.5.50 Brought Back to 9router"
date: 2026-08-09
tags: [9router, technical, workflow]
layout: post
---

I hadn't checked upstream in a while. My fork had accumulated enough custom code — combos, middleware, the memory layer — that pulling updates felt like asking for trouble. Easier to stay isolated.

That's fine for a while. Then [Headroom round two](/posts/headroom-round-two/) happened.

Upstream had shipped proper integration, PEP 668 handling, embedded dashboard proxy — everything I spent an afternoon patching in my fork. The merge would've avoided conflicts I eventually hit if I'd started from current upstream.

So I checked.

## What Upstream Now

Branch `upstream/v0.5.50`. Three things jumped out.

**Combos now support vision and audio.** My combos file was text-only. Upstream now has `vision` and `audio` fields on model configs, plus an auto-switch mechanism — if a request includes images, it routes to the provider that handles them, without the client needing to know. That's the LLM API learning to read what you send it. My folder prompts were a workaround for this; now it's first-class.

**Token saver got its own panel.** In my fork, token compression was a sub-menu under `/dashboard/endpoint`. Click endpoint → find compression settings nested inside. Upstream extracted it into a dedicated panel under Settings. Cleaner separation. When I was debugging Headroom, I was poking around in the wrong place because I didn't realize it had moved.

**Headroom setup guide is better now.** [Round two](/posts/headroom-round-two/) was my attempt to document PEP 668 workarounds, symlink tricks, and path detection failures. Upstream's guide covers the same ground, more completely, with clearer screenshots. My post is now mostly redundant.

## Evaluation

I checked out `upstream/v0.5.50` and spent a few hours kicking the tires. The vision/audio combo thing worked on first try — the same PATH issues I hit before are now upstream. The evaluation took longer than expected. Not because of bugs. Because every new feature had sub-features, and I kept going one level deeper: "Oh, it auto-switches providers? What does the fallback look like?"

## What Got Stalled

Two experiments from earlier posts are on hold.

**Server split.** Earlier this year I was exploring separating the Hono API server from the Next.js dashboard into independent processes. Goal was leaner deployments, cleaner boundaries. [Monorepo split PR #7](https://github.com/vianhanif/9router/pull/7) shipped in July 2026, but that work stalled — the monorepo approach was working fine, and splitting would introduce its own complexity for no immediate gain.

**Memory system removal.** The structured memory work I wrote about in late August — [two weeks with the Knowledge Context Engine](/posts/two-weeks-with-structured-memory-and-the-knowledge-context-engine/) — got removed from the fork. Not abandoned. Moved into its own platform, `beacon-platform`, a separate service. The ingestion pipeline (Swiftide → custom Rust) and context injection in 9router are different problems. 9router doesn't need its own knowledge ingestion pipelines; it just routes requests to the context API now.

There's a new experiment in progress — more on that when it takes shape.

## Why Bother

Fork maintenance feels like tax. But it's also how I know what's actually stable versus what I've been patching on top of older versions. Checking upstream taught me:

- My local fixes are already upstream
- Features I built workarounds for are now first-class
- I can delete code

The fork still has custom combos and MCP integration that upstream doesn't have yet. That's where the value is — not catching up, but extending.

---

### Sources
- [9router upstream — decolua/9router](https://github.com/decolua/9router)
- [My 9router fork](https://github.com/vianhanif/9router)
- [Headroom round two](/posts/headroom-round-two/)
- [Knowledge Context Engine](/posts/two-weeks-with-structured-memory-and-the-knowledge-context-engine/)
- [Beacon platform](https://github.com/vianhanif/beacon-platform)
