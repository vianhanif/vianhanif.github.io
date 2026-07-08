---
title: "What I Changed in 9router"
date: 2026-06-17
tags: [9router, monorepo, headroom, rt, tooling]
---

The `npm install` output scrolled up the terminal. I watched, braced for the usual 30-second wait. It finished in four seconds. The `node_modules` folder was 2.5MB instead of 200MB.

Then the server started. 200 milliseconds instead of fifteen seconds.

I sat there for a moment, surprised at how light it felt. I'd been bracing for a heavy dev loop and got something that felt almost empty.

This was the first thing I changed after forking 9router: the monorepo split.

The upstream was a Next.js monolith — dashboard, routing engine, CLI, all in one blob. Every change meant waiting for Next.js to recompile. The CLI `npm install` pulled in the entire dashboard dependency tree. I ripped it apart: the API server (Hono) got its own workspace, the dashboard (Next.js) another, the CLI got esbuild bundling and its own package. Now I can update the routing engine without touching the dashboard — or never install the dashboard at all.

But the split was just the starting point. Daily use taught me what a router actually needs.

**Tiered fallback** wasn't a nice-to-have. I discovered this at 1am during a production incident — primary provider hit its rate limit. The fallback chain took the next request without a pause. 9router chains providers in tiers: subscription accounts first, then cheap APIs (MiniMax at $0.20/M tokens), then free ones (Kiro, OpenCode Free, Vertex credits). When a paid provider says no, the next tier picks up. No retry spinner. No waiting.

**Multiple accounts per provider.** One account is a single point of failure. Upstream 9router already supported round-robin with sticky sessions — requests stick to one account until a configurable limit, then rotate. If an account gets model-level rate-limited, it's skipped automatically. I didn't appreciate this until I hit that lock and watched the router route around it.

**Token compression felt like finding money.** The RTK saver compresses `tool_result` content server-side — 20-40% fewer tokens per request, applied transparently. The agent never knows it's happening. The bill just shrinks.

**I rebuilt the headroom API after the split.** The compression proxy was an upstream feature, but its API was still wired into the old monolithic server. I reimplemented the status, start, and stop endpoints on the new Hono server — auth-gated with localhost detection plus a CLI token for remote control.

**OAuth tokens expire mid-session.** 9router handles proactive refresh — before every request, it checks credentials near expiry and refreshes them. This killed a recurring failure mode that had been silently wasting my time.

The real payoff was the **combo system**. Routing config lives in `~/.ai/combos.json`. Named model tiers with specific fallback strategies:

```
Cheap:   round-robin over oc/big-pickle, oc/deepseek-v4-flash-free, gemini flash lite
Premium: chain through ocg/deepseek-v4-pro, qwen3.7-max, qwen3.6-plus
Deep-Thinker: chain Architect into Premium
```

Add a model alias to a combo and it joins the rotation. No code changes. The import/export format evolved alongside the strategies — version 2 emits the full config object instead of the legacy roundRobin boolean. Export JSON, paste into any AI chat for analysis, get back a tuned config, import. No dashboard required.

The entire operational state lives in `~/.9router/`: a SQLite database with provider connections, OAuth tokens, and usage stats; a headroom proxy directory; a vendored cloudflared binary; a few config files. No external databases. No cloud services. Everything is local files and SQLite.

I didn't plan any of this. Each change came from a specific failure — rate limit at midnight, slow startup every edit, token expiry mid-request, locked account on a Friday deploy. The router became what the failures demanded.

See [how I found 9router in the first place](/posts/the-router-my-colleague-showed-me/) and [why it needed a tunnel to be useful](/posts/the-tunnel/). [Warp Came Back Around](/posts/warp-came-back-around/) is where all this finally clicked.
