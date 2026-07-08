---
title: "This Is My ADE"
date: 2026-07-08
tags: [ade, warp, 9router, orchestration, personal]
---

I hit send on a prompt. Watched the spinner. Started calculating — was I past the cap yet? Three weeks into the billing cycle, OpenCode Go had hit its limit. I'd been conditioned to expect the error.

The spinner stopped. Code appeared. No error.

The request had routed through [9router](https://github.com/vianhanif/9router)'s fallback chain — from my paid subscription, through a cheap API, to a free provider. Compressed by the headroom proxy. Delivered in under a second. I didn't notice the provider swap. The router handled it silently.

That's when I realized the stack had become invisible.

I hadn't planned for that moment. Six months earlier I'd been staring at a rate-limit error, frustrated that a subscription model controlled when I could work. I didn't set out to build an ADE. I just kept hitting walls and kept building ladders.

Somewhere along the way, the ladders became infrastructure.

It took six months to get here. The Hono server starts in 200ms. Routing config lives in `~/.ai/combos.json` — model tiers with fallback strategies, token compression, multiple accounts per provider in round-robin. The tunnel at `https://api.mydomain.com` routes through Cloudflare to cloudflared on my machine, forwarding to localhost:20128. The Hono server manages the tunnel lifecycle, headroom proxy, provider connections. Everything runs from a SQLite database in `~/.9router/`. No external databases. No cloud services.

The entire runtime footprint fits in one directory.

[I rebuilt the router from a 200MB Next.js monolith to a 2.5MB CLI](/posts/what-i-changed-in-9router/). [I built a tunnel when I discovered Warp's Oz agents couldn't reach localhost](/posts/the-tunnel/). [I migrated the agent system from OpenCode's bolt-on delegate to Warp's native orchestration](/posts/warp-came-back-around/). Each layer was built because the previous one had a wall I couldn't go through.

Things broke. OAuth tokens expired mid-request. cloudflared crashed after macOS sleep. Model-level rate limits hit shared accounts. Each failure taught me where to reinforce: proactive refresh, launchd KeepAlive, per-model lock keys in the database.

Things that held: the Hono server has never crashed. Format translation between providers works silently — I forget it's happening. The tunnel stays up for weeks. Orchestration with parallel child agents has been stable. The biggest risk is forgetting to give each child its own git worktree.

The reliability of the whole stack is determined by the weakest recovery path. I learned that at 1am more than once.

But the real win isn't reliability. It's interchangeability. I can swap 9router for Ollama tomorrow. Replace Warp with Cursor next week. Run a different tunnel. None of the other layers care. That's the property that makes the setup cost worth paying.

If you're starting today: fix routing before infrastructure. Tiered fallback changes your cost structure immediately. Add the tunnel only when you need remote access. Everything else follows from those two decisions.

I've probably spent 40 hours on this stack. Some people would pay $20/month for ChatGPT Plus and never think about it again. That's a valid choice — the subscription is cheaper than their time. But every hour I spent on infrastructure unlocked capabilities the subscription model can't offer: zero-cost fallback, transparent token compression, parallel agent orchestration, complete provider interchangeability.

---

**Sources:** [ChatGPT Plus pricing](https://openai.com/ChatGPT/pricing) ($20/month) · [9router upstream README](https://github.com/decolua/9router) (RTK 20-40% token savings)

OpenCode is an appliance. This is a chassis. One works out of the box. The other lets you swap every component.

What started with a rate-limit error and a refusal to accept that a subscription should control when I can code became something larger. Six posts, four infrastructure layers, two tool migrations, zero subscriptions that lock me in. Every layer is mine to own, swap, or replace.

**The best AI development environment is the one you can take apart and rebuild.** That was the thesis of [Why I Left GitHub Copilot](/posts/why-i-left-github-copilot/). Six posts later, I mean it more than I did then.

And if I decide tomorrow that Warp isn't the right shell, or 9router isn't the right router, or I want to switch from OpenAI-compatible to Anthropic-native — nothing else breaks.

That's the ceiling a custom ADE buys you. Not a better subscription. A better ceiling.
---

## The Series

This post is the end of a six-month story. Here's how to read it:

1. **[Why I Left GitHub Copilot](/posts/why-i-left-github-copilot/)** — The privacy problem that started everything
2. **[Warp Tried to Sell Me AI Again](/posts/warp-tried-to-sell-me-ai/)** — The subscription wall
3. **[OpenCode: The $10/mo TUI](/posts/opencode-ten-bucks/)** — Finding a tool that fit the budget
4. **[The Tools I Built Around OpenCode](/posts/tools-i-built-around-opencode/)** — Building the gaps closed
5. **[The Router My Colleague Showed Me](/posts/the-router-my-colleague-showed-me/)** — Discovering 9router
6. **[What I Changed in 9router](/posts/what-i-changed-in-9router/)** — Forking and customizing the router
7. **[The Tunnel](/posts/the-tunnel/)** — Making local AI reachable from the internet
8. **[Warp Came Back Around](/posts/warp-came-back-around/)** — The platform caught up
9. **[This Is My ADE](/posts/this-is-my-ade/)** — You are here

Start from Post 1 for the full arc, or jump to any post that interests you — each one has enough context to stand alone.

---


