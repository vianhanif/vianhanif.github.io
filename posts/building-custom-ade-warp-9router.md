# LinkedIn Post: Building a Custom ADE with 9router + Warp

I've been building my own Agentic Development Environment for months — not by waiting for tools to add features, but by wiring them together myself.

It started when GitHub announced prompt data training. I wanted something I controlled end-to-end.

Here's what the stack looks like now:

**The router** — I forked 9router, split the Next.js monolith into a standalone Hono server (~2.5MB CLI, 200ms startup). It chains 40+ LLM providers with tiered fallback: paid → cheap APIs → free tiers. When one provider rate-limits, the next takes over. No interruptions.

**Token compression** — Upstream 9router ships the RTK saver that cuts 20-40% of tokens transparently server-side. The agent doesn't know, the bill just shrinks.

**Orchestration** — Warp's Oz platform lets a lead agent spawn parallel children (backend, frontend, tests) in separate git worktrees, message them bidirectionally, and integrate results. This is what I'd been hacking together with a custom `/delegate` system on OpenCode CLI — but now it's a first-class runtime, not a bolt-on.

**The tunnel** — Warp agents can't reach localhost, so I added a Cloudflare tunnel managed as a launchd service. Stable endpoint, auto-recovery on crash or sleep/wake.

The whole thing runs on $10/month for opencode Go plus a yearly domain invoice — Warp orchestration costs nothing. Open questions remain (monthly dashboard, Tailscale vs cloudflared), but that's the point: every layer is mine to change.

Full write-up with all the details, trade-offs, and failures: https://github.com/vianhanif/9router (or DM me)

#ADE #Warp #AIEngineering #DevTools #OpenSource
