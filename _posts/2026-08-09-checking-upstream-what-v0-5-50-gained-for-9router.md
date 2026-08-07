---
title: "Checking Upstream: What v0.5.50 Gained for 9router"
date: 2026-08-09
tags: [9router, technical, workflow]
layout: post
---

I hadn't checked upstream in a while. My fork had accumulated enough custom code — combos, middleware, the memory layer — that pulling updates felt like asking for trouble. Easier to stay isolated.

That's fine for a while. Then a Headroom upgrade forced the issue. Headroom is the token-compression proxy layer that sits between the router and providers, cutting 20-40% off every request.

Upstream had shipped proper integration and an embedded dashboard proxy — everything I spent an afternoon patching in my fork. The merge would've avoided conflicts I eventually hit if I'd started from current upstream.

So I checked. After validating the branch in a separate workspace, I merged `upstream/v0.5.50` into my main development worktree.

## What Upstream Has Now

Branch `upstream/v0.5.50`. Three things jumped out.

**Combos now support capability-based routing.** My combos file — named groups of models the router falls back through — was text-only. Upstream now floats models that support the request's required modalities (vision, audio, PDF) to the front of the retry queue, so a request with images lands on a provider that can actually read them. My folder prompts were a workaround for this; now it's first-class.

**Token saver got its own panel.** In my fork, token compression was managed under `/dashboard/endpoint`. Upstream moved this into a dedicated panel under Settings, simplifying the configuration path and making the compression state visible earlier in the workflow.

**Headroom setup guide is better now.** The setup workarounds I'd been keeping — symlink tricks, path detection failures — are documented upstream now. The new dashboard panel provides a clear checklist for compression extras, letting you toggle between proxy, code-specific AST compression, and ML-model-based prose compression with one click.

## Evaluation

I checked out `upstream/v0.5.50` and spent a few hours kicking the tires. The modality routing worked on first try — the PATH issues I hit before, the CLI binary not being on `$PATH` after install, are now handled upstream. The evaluation took longer than expected. Not because of bugs. Because every new feature had sub-features, and I kept going one level deeper: "Which models qualify? What does the fallback look like?"

## What Got Set Aside

Two experiments are on hold.

**Server split.** This summer I was exploring separating the Hono API server from the Next.js dashboard into independent processes. Goal was leaner deployments, cleaner boundaries. [Monorepo split PR #7](https://github.com/vianhanif/9router/pull/7) — the split itself — merged in July, but the follow-on work stalled; the monorepo approach was working fine, and splitting further would introduce complexity for no immediate gain.

**Memory system removal.** I removed the structured memory work from the fork entirely. Knowledge ingestion and context injection in 9router are different problems — 9router doesn't need its own ingestion pipelines.

## Why Bother

Fork maintenance feels like tax. But it's also how I know what's actually stable versus what I've been patching on top of older versions. Checking upstream taught me:

- My local fixes are already upstream
- Features I built workarounds for are now first-class
- I can delete code

The fork still has custom combos and MCP integration that upstream doesn't have yet. That's where the value is — not catching up, but extending.

---

### Sources
- [9router upstream v0.5.50 — decolua/9router](https://github.com/decolua/9router/releases/tag/v0.5.50)
- [My 9router fork](https://github.com/vianhanif/9router)
