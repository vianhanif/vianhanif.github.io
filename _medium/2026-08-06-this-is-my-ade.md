---
title: "This Is My ADE"
date: 2026-08-06
linked_posts:
  - /posts/the-tunnel/
  - /posts/warp-came-back-around/
  - /posts/this-is-my-ade/
status: draft
---

# Medium Prep

## Content to Copy

I hit send on a prompt. Watched the spinner. Started calculating — was I past the cap yet?

The spinner stopped. Code appeared. No error.

The request had routed through my 9router fork's fallback chain — paid sub, cheap API, free provider. Compressed by the headroom proxy. Under a second. I didn't notice the provider swap. The router handled it silently.

That's when I realized the stack had become invisible.

Six months earlier I'd been staring at a rate-limit error at 1am, frustrated that a subscription model controlled when I could work. I didn't set out to build an Agentic Development Environment. I just kept hitting walls and kept building ladders. Somewhere along the way, the ladders became infrastructure.

I rebuilt the router from a 200MB Next.js monolith to a 2.5MB CLI — the full story of what changed and why: [What I Changed in 9router](https://vianhanif.github.io/posts/what-i-changed-in-9router/).

Then came the tunnel. Warp's Oz agents run in an isolated context — they can't reach localhost. My routing layer was ready but invisible to the agents that needed it. So I built a tunnel: Cloudflare + Caddy + launchd, routing `https://api.mydomain.com` to `localhost:20128`. The agents hit the public URL; the request lands on my local server. Sub-millisecond latency. Zero per-call cost. The tunnel has been up for weeks without a manual restart.

The full tunnel story — the wrong turns with local-tunnel and Cloudflare Quick Tunnel, the two-layer architecture, surviving macOS sleep: [The Tunnel](https://vianhanif.github.io/posts/the-tunnel/).

The last piece was Warp itself. I'd walked away the first time — the Build plan was $20/month for 1,500 credits, another AI subscription. But by the time I came back, Warp had transformed. Custom provider support meant I could point it at my 9router endpoint with my own API keys — no Warp AI credits needed. The Free plan covered everything else. Native orchestration with `run_agents` meant I could finally do what my bolt-on `/delegate` system had tried to do — but with lifecycle management, inter-agent messaging, and parallel fan-out instead of sequential chains.

The full story of coming back to Warp, migrating the agent system, and why custom providers made all the difference: [Warp Came Back Around](https://vianhanif.github.io/posts/warp-came-back-around/).

Each layer was built because the previous one had a wall I couldn't go through. The tunnel connected the router to the agents. The agents gave the orchestration a reason to exist. The orchestration made the whole stack more than the sum of its parts.

OpenCode is an appliance. This is a chassis. One works out of the box. The other lets you swap every component. I can swap 9router for Ollama tomorrow. Replace Warp with Cursor next week. None of the other layers care. That's the property that makes the setup cost worth paying.

The best AI development environment is the one you can take apart and rebuild. That was the thesis of the first post in this series. Six posts later, I mean it more than I did then.

For the final post in the series — the full ADE story from start to finish: [This Is My ADE](https://vianhanif.github.io/posts/this-is-my-ade/).

## Tags for Medium
ade, developer-tools, ai, infrastructure, orchestration, devops

## Publish Timing
→ Blog series: all 9 posts published July 9, 2026
→ Medium: 2026-08-06 (3 weeks after second Medium post)

## Notes

- [ ] Wait 2-4 weeks after blog publish (SEO best practice) — blogs went live July 9
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: this is the capstone story, may perform well behind paywall

## Sources (link these inline when posting)

- Warp pricing (Free plan includes BYOK, Build plan optional): https://www.warp.dev/pricing
- Warp pricing announcement: https://www.warp.dev/blog/warp-new-pricing-flexibility-byok
