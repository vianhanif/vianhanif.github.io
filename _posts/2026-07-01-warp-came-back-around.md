---
title: "Warp Came Back Around"
date: 2026-07-01
tags: [warp, oz, orchestration, agents, run_agents]
---

I remember my first Warp trial ending with a shrug.

A terminal with AI features — nice inline assistant, sure, but tied to yet another subscription. I'd already walked away from Copilot for the same reason. I wasn't about to sign up for another locked-in AI tool.

I closed it and went back to OpenCode without a second thought (see [Warp Tried to Sell Me AI Again](./2026-05-20-warp-tried-to-sell-me-ai.md)). This was around the time I was building the `/delegate` system, hacking orchestration on top of a TUI. Warp wasn't on my radar.

Then the announcements started.

Warp shipped [Warp 2.0: the Agentic Development Environment](https://www.warp.dev/blog/reimagining-coding-agentic-development-environment). The messaging shifted — not just a smarter terminal, but a platform where agents are first-class citizens. Custom OpenAI-compatible providers. Child agent orchestration. MCP integration.

A few months later came [Oz, the orchestration platform](https://www.warp.dev/newsroom/2026/2/10/warp-launches-oz-the-orchestration-platform-for-cloud-coding-agents) — the `run_agents` primitive, cloud environments, audit trails.

Warp was building the exact thing I had been hacking together.

I was surprised. And a little frustrated I hadn't seen it coming. But mostly — I was curious. What had changed?

Two things pulled me back.

**Custom provider support.** Warp wasn't locked to its own AI anymore. You could point it at any OpenAI-compatible endpoint — including 9router. My custom fork with tiered fallback, token compression, and my entire cost architecture (I wrote up those changes in [What I Changed in 9router](./2026-06-17-what-i-changed-in-9router.md)). Warp would handle the orchestration. 9router would handle the routing.

**Native orchestration.** The `run_agents` primitive. Not a bolt-on protocol over a tool system, but a first-class runtime where a lead agent spawns children, messages them, collects results, re-delegates. This was what `/delegate` tried to be, without the sequential-chain limitation.

I migrated the agent system that had grown in OpenCode. The role definitions, the Delegation Gate rules, the session onboarding protocol, the worktree conventions — all survived. They live in `~/.agents/AGENTS.md`, shared between both tools. The model is tool-agnostic.

The skill files needed zero changes. Each defines role-specific behavior, and Warp auto-discovers them. The same skill instructs a planner whether it runs in OpenCode or Warp.

The first time I ran `run_agents` and saw four child agents fan out in parallel, each hitting different providers through 9router's fallback chains — that was the moment the whole stack clicked. Not a smarter chatbot. A coordinator that can parallelize.

There was one catch. Oz agents run in an isolated context — they can't reach `localhost`. To connect Warp to 9router, I needed a public HTTPS endpoint. That meant a tunnel.

The flow: Warp agent hits `https://api.mydomain.com`, Cloudflare routes through an encrypted tunnel to `cloudflared` on my machine, which forwards to the 9router server on `localhost:20128`. The agent never knows the tunnel exists.

I wrote the full tunnel story separately (see [The Tunnel](./2026-06-24-the-tunnel.md)), but the punchline matters here: before the tunnel, I was hedging — running prompts twice, burning API credits. After the tunnel, every request hits my local server. Sub-millisecond latency. Zero per-call cost.

The cost economics sealed the deal. Oz orchestration is free. My only recurring costs: $10/month for OpenCode Go plus a yearly domain invoice. Free providers handle the fallback layers through 9router. No Warp subscription. No per-seat fee.

I added MCP servers — kubectl for Kubernetes context, duckdb for inline queries, firecrawl for web research, lean-ctx for codebase search. Every child agent gets access through the shared MCP configuration.

I walked away from Warp the first time because it looked like another locked-in AI subscription. I came back because they'd built the platform I was hacking together myself.

The difference between being locked in and choosing to use something is the ability to leave. That's what custom providers gave me. And that's what made Warp worth a second look.
