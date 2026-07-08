---
title: "The 403 That Wasn't One Problem"
layout: page
---

My Warp agent stopped talking to 9router.

The set-up: Warp has a custom LLM route pointed at my Cloudflare tunnel — `https://9router.vianhanif.link/v1/chat/completions`. It had been working. Then one day, every request bounced with:

```
POST "https://9router.vianhanif.link/v1/chat/completions": 403 Forbidden
```

No configuration changes. Nothing obvious. Just dead.

I tested the same endpoint with curl and it worked. Full response. Correct completion. The server was fine. The tunnel was fine. The problem was something about the Warp requests specifically.

## Layer 1: The Dead Tunnel

I added debug middleware to the Hono server to log every incoming request — headers, path, method, response status. Then I triggered a Warp agent request.

No log appeared.

The request never reached my server.

That narrowed the search to the infrastructure between Warp and my machine. The chain is: Warp → Cloudflare edge → cloudflared tunnel → localhost:20128 → Hono server. If the server logs nothing, the break is in the tunnel or at Cloudflare's edge.

I checked what was running:

```
22541  cloudflared tunnel --config ... run 9router-tunnel
23259  cloudflared tunnel run --token ...        (running as root)
24159  cloudflared tunnel --config ... run 9router-tunnel
```

Three cloudflared processes. Two running the same config-based tunnel. One running as root with a different token — likely spawned by 9router's dashboard tunnel feature at some point. The Homebrew launchd service was also loaded, running cloudflared with *zero arguments*, which immediately crashed with exit code 1.

The custom launchd service with the correct config existed at `~/Library/LaunchAgents/com.local-tunnel.cloudflared` but was never loaded. It had the right command and the right ingress rules mapping `9router.vianhanif.link` to `localhost:20128`. It just wasn't running.

Killed everything, unloaded the broken Homebrew service, bootstrapped the correct one. Tunnel connected. `/health` returned 200.

Then I tested Warp again. Still 403.

## Layer 2: The Silent Firewall

Debug logs still showed nothing. But now I knew the tunnel was healthy — curl confirmed it. The difference had to be at Cloudflare's edge itself.

Cloudflare's WAF and Bot Management inspect incoming requests and decide what to let through. Curl gets a pass. Warp's agent — with its unusual User-Agent, programmatic headers, and cloud-egress IP — triggers a block.

The fix was a WAF skip rule:

```
(http.host eq "9router.vianhanif.link" and starts_with(http.request.uri.path, "/v1/"))
```

Set to Skip → All Remaining Rules. This tells Cloudflare to bypass WAF, Bot Management, Security Level — everything — for LLM API traffic on my tunnel hostname.

That fixed it.

## The Cleaner Fix: API Key at the Source

After the debugging session, I switched to the cleaner solution: 9router already has an API key feature built in. In the 9router dashboard → Settings → toggle **Require API Key**. Generate a key and add it to Warp's LLM route config. No WAF bypass needed. The tunnel stays wide open to everyone — Cloudflare security layer stays intact — and only authenticated requests get through at the application level. It's the right place to do auth anyway.

## Two Bugs, One Meltdown

The first bug was infrastructure rot: a tunnel held together by luck, with three conflicting processes and a broken launchd service. This alone would have eventually killed the tunnel, and I would have blamed Cloudflare, cloudflared, or bad luck.

The second bug was Cloudflare's own security blocking a legitimate client. This was invisible as long as the tunnel was down — both curl and Warp failed together. It only surfaced after I fixed the tunnel, because curl worked and Warp didn't. If I'd stopped at "tunnel fixed, problem solved," I'd have missed half the issue.

The lesson: a 403 at the application layer doesn't mean the application threw it. The infrastructure between your client and your server has more authority to say "no" than your server code does.
