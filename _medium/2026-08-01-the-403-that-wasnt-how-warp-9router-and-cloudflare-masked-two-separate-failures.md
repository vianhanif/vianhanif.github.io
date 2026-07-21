---
title: "The 403 That Wasn't: How Warp, 9router, and Cloudflare Masked Two Separate Failures"
date: 2026-08-01
linked_posts:
  - /posts/the-403-that-wasnt-how-warp-9router-and-cloudflare-masked-two-separate-failures/
status: draft
---

# Medium Prep

## Content to Copy

My Warp agent stopped talking to 9router. Every request bounced with a 403 Forbidden. No configuration changes. Nothing obvious. Just dead.

I tested the same endpoint with curl — full response, correct completion. The server was fine. The tunnel was fine. The problem was something about the Warp requests specifically.

### Layer 1: The Dead Tunnel

I added debug middleware to log every incoming request. Then I triggered a Warp agent request.

No log appeared. The request never reached my server.

The chain was: Warp → Cloudflare edge → cloudflared tunnel → localhost → Hono server. If the server logs nothing, the break is in the tunnel or at Cloudflare's edge.

I checked what was running and found three cloudflared processes. Two running the same config-based tunnel. One running as root with a different token — likely spawned by 9router's dashboard tunnel feature at some point. A Homebrew launchd service was also loaded, running cloudflared with zero arguments, immediately crashing.

The correct launchd service existed but was never loaded. It had the right command and ingress rules. It just wasn't running.

I killed everything, unloaded the broken service, bootstrapped the correct one. Tunnel connected. `/health` returned 200.

Then I tested Warp again. Still 403.

### Layer 2: The Silent Firewall

The tunnel was healthy — curl confirmed it. The difference had to be at Cloudflare's edge.

Cloudflare's WAF inspects incoming requests and decides what to let through. Curl gets a pass. Warp's agent — with its unusual User-Agent, programmatic headers, and cloud-egress IP — triggers a block.

The fix was a Cloudflare Custom WAF Skip rule targeting LLM API traffic on my tunnel hostname. That fixed it.

### Two Bugs, One Meltdown

The first bug was infrastructure rot: a tunnel held together by luck, with three conflicting processes and a broken launchd service. This alone would have eventually killed the tunnel.

The second bug was Cloudflare's own security blocking a legitimate client. This was invisible as long as the tunnel was down — both curl and Warp failed together. It only surfaced after I fixed the tunnel, because curl worked and Warp didn't.

After the debugging session, I switched to a cleaner solution: 9router already has an API key feature built in. Toggle it on in the dashboard, generate a key, add it to Warp's LLM route config. No WAF bypass needed. The tunnel stays open to everyone, Cloudflare security stays intact, and only authenticated requests get through at the application level. The right place to do auth anyway.

The lesson: a 403 at the application layer doesn't mean your application threw it. The infrastructure between your client and your server has more authority to say "no" than your server code does.

→ Full story: https://vianhanif.link/posts/the-403-that-wasnt-how-warp-9router-and-cloudflare-masked-two-separate-failures/

## Tags for Medium
Postmortem, 9router, Cloudflare, Developer Tools, Technical, Debugging

## Publish Timing
→ Blog series: 2026-08-01
→ Medium: 2 weeks after blog publish

## Notes

- [ ] Wait 2-4 weeks after blog publish (SEO best practice)
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources

- Cloudflare WAF custom rules (Skip action): https://developers.cloudflare.com/waf/custom-rules/skip/
- cloudflared tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- 9router API key feature: https://github.com/decolua/9router (auth configuration)
