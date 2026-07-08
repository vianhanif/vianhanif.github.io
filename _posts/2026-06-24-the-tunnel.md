---
title: "The Tunnel"
date: 2026-06-24
tags: [cloudflare, caddy, tunnel, infrastructure]
---

I typed `http://localhost:20128` into Warp's custom provider field. Clicked Save. The field turned red.

Silent rejection. Not "connection refused" — the UI wouldn't even accept a localhost address. Curl worked fine, but Warp's Oz agents don't run on my machine. They live in an isolated context that can't see localhost.

My routing layer from the [9router fork](../2026-06-17-what-i-changed-in-9router.md) was ready. Invisible.

### A Wrong Turn

Cloudflare Quick Tunnel was too easy to skip. No account, no config:

```
cloudflared tunnel --url http://localhost:20128
```

Got a URL. Pasted it. Connected. Triumph.

Then I rebooted. Different URL. Pasted again. Rebooted again. Different again.

Quick Tunnel URLs rotate on every restart. I could update manually, but that's a loop I refused to live in.

### Two Layers, One Goal

Caddy terminates TLS with self-signed certs for picky clients. Three lines of config.

Cloudflare Tunnel creates an outbound connection from my machine to Cloudflare's edge. No inbound ports. No NAT traversal.

```
# ~/.cloudflared/config.yml
tunnel: abc123-def456
credentials-file: /Users/me/.cloudflared/abc123-def456.json
ingress:
  - hostname: api.mydomain.com
    service: http://localhost:20128
  - service: http_status:404
```

Two CLI commands. One config file. Done.

### Surviving macOS

The tunnel needs to outlast sleep, wake, reboot, coffee-shop WiFi. I used launchd:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.9router.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared.err</string>
</dict>
</plist>
```

`KeepAlive` respawns on crash. `RunAtLoad` starts at login. Load once, permanent.

### What Breaks

Sleep/wake kills the network stack. cloudflared disconnects. KeepAlive respawns it, but there's a ~15-second gap. For automated jobs, a health check handles it.

Log debugging: `tail -f /tmp/cloudflared.log`. 90% is network flakiness. 10% is auth tokens — `cloudflared tunnel login`.

### What Changed

Before the tunnel: running prompts twice. Once in the IDE, once locally. Burning API credits on iteration.

After: Warp agents hit `https://api.mydomain.com/v1`. Every request lands on my local server. The tunnel disappears.

~$3/day in API costs to ~$0 (domain is $10/year). Iteration from 3-5 seconds to under 1 second. Stopped thinking about rate limits.

Infrastructure should be boring. The tunnel is.

I wrote about how Warp uses this endpoint in [Warp Came Back Around](../2026-07-01-warp-came-back-around.md).
