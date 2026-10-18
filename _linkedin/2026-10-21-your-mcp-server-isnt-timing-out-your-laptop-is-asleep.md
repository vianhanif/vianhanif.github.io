---
layout: page
title: "Your MCP Server Isn't Timing Out. Your Laptop Is Asleep."
date: 2026-10-21
linked_posts:
  - /posts/your-mcp-server-isnt-timing-out-your-laptop-is-asleep/
medium_post: https://viumeda.medium.com/your-mcp-server-isnt-timing-out-your-laptop-is-asleep
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

My MCP gateway kept failing with `Request timed out`. I spent an afternoon on TLS session resumption, transport type, and config interpolation before I checked *when* the failures happened.

The log told me: the timeouts weren't 10 seconds. They were 6 minutes to 34 minutes. Subtract the span from the timestamp and every one of them started exactly on a macOS DarkWake event — the request opens a socket, the laptop goes back to sleep on battery, the connection freezes, and the client doesn't retry on resume.

`pmset -g log` matched the spans to the second: sleep durations of 961s, 939s, 1018+1037s against spans of 967s, 941s, 2059s.

The fix wasn't a timeout bump. My `coffee-daemon` was running `caffeinate -d` — display only. On battery, only `-i` actually holds the machine awake. `-dims` plus a LaunchAgent for resurrection, and I'd leaked my own sudo password into shell history along the way.

The bug was never in the network layer. It was in the power management.

#macOS #DevOps #MCP #DeveloperTools #Debugging

---

# Comment (First Comment)

Full story on Medium → https://viumeda.medium.com/your-mcp-server-isnt-timing-out-your-laptop-is-asleep

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a hook
  - Comment: "Full story on Medium → https://viumeda.medium.com/your-mcp-server-isnt-timing-out-your-laptop-is-asleep"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
