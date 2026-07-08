---
title: "I Built My Own AI Routing Layer"
date: 2026-07-29
linked_posts:
  - /posts/tools-i-built-around-opencode/
  - /posts/the-router-my-colleague-showed-me/
  - /posts/what-i-changed-in-9router/
status: draft
---

# Medium Prep

## Content to Copy

I'd spotted it a few weeks earlier. Colleagues had a dashboard open — more providers than I'd seen anywhere, fallback chains, format translation. Filed it away as interesting. Didn't ask right away.

Then the subscription cap hit again.

A week later: 1am. Deploy waiting. OpenCode Go had hit its $60 monthly cap. The rate-limit error stared back at me. The fallback providers existed — I'd been treating them like a joke. A backup for emergencies. Something I'd get around to someday.

When you hit your paid limit three weeks in, having fallback providers isn't optional. It's the difference between shipping and waiting for the reset date.

That night I went back to the repo. Read it again, slower. The 40+ providers stopped looking like noise. They started looking like redundancy. The format translation — converting between OpenAI, Anthropic, and whatever new provider dropped that week — was the thing I'd been manually copy-pasting to work around.

I forked it that weekend. And then I couldn't stop.

The monorepo was the first thing I tackled — a Next.js monolith with the routing engine and dashboard tangled together. I split it apart: the API server (Hono) got its own workspace, the dashboard (Next.js) another, the CLI got esbuild bundling. `npm install` went from 30 seconds to 4. Server startup from 15 seconds to 200ms.

But the split was just the starting point. Daily use taught me what a router actually needs: tiered fallback so the next provider picks up when one hits its limit, multiple accounts per provider in round-robin so a single rate-limit error doesn't block everything, token compression that cuts 20-40% off every request transparently.

You can read the full breakdown of every change I made to the router — the combo system, the headroom proxy rebuild, the OAuth refresh that killed a recurring failure mode — here: [What I Changed in 9router](https://vianhanif.link/posts/what-i-changed-in-9router/).

Before 9router, I'd also built a set of tools to paper over OpenCode's limits: a worktree isolation system, an environment bootstrap script, a custom `/delegate` command that let me chain agents together with dependency tracking. They worked. But every one of them was a bolt-on solution held together by annotation parsing and hope.

The whole story of what I built around OpenCode and why I eventually hit a ceiling I couldn't raise from the outside: [The Tools I Built Around OpenCode](https://vianhanif.link/posts/tools-i-built-around-opencode/).

The router became what the failures demanded. Every change — the split, the fallback tiers, the combo system — came from a specific problem I hit at 1am on a deadline. Rate limits. Token expiry. Locked accounts. Each failure told me where to reinforce.

For how I discovered 9router in the first place and the moment I knew I had to fork it: [The Router My Colleague Showed Me](https://vianhanif.link/posts/the-router-my-colleague-showed-me/).

## Tags for Medium
ai, open-source, developer-tools, devops, router, programming

## Publish Timing
→ Blog series: all 9 posts published July 9, 2026
→ LinkedIn: Jul 9, Jul 14, Jul 20 (5-day stagger)
→ Medium: Jul 24, Jul 29, Aug 3 (same cadence, day after each LinkedIn post)

## Notes

- [ ] Schedule Medium: Jul 29 (day after second LinkedIn post Jul 14)
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: technical deep-dives often perform well behind paywall

## Sources (link these inline when posting)

- OpenCode Go docs ($60/month usage budget, $12/5h, $30/week): https://opencode.ai/docs/go/
- Warp pricing (Free plan, BYOK, Build plan): https://www.warp.dev/pricing
