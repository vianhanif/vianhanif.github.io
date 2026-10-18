---
layout: page
title: "Your MCP Server Isn't Timing Out. Your Laptop Is Asleep."
date: 2026-10-21
linked_posts:
  - /posts/your-mcp-server-isnt-timing-out-your-laptop-is-asleep/
  - /posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
  - /posts/pm2bar-native-macos-menu-bar-pm2-monitor/
status: draft
---

# Medium Prep

## Content to Copy

The MCP gateway to my dev tools kept failing. Status: `failed`. Error: `Request timed out`. My agent sessions run overnight, so I didn't see it happen — I woke up to a pile of failures.

The obvious culprit is the network, so I tested the endpoint by hand first. An authenticated request to the same URL came back in 258 milliseconds. Same endpoint, same credentials, instant answer. So I did what anyone would do when the network checks out: I spent an afternoon on TLS session resumption, transport type, and config interpolation. All clean.

Then I read the actual log instead of testing the endpoint. Six failures, and the `http.span` field on each one was the tell — 343,094 to 2,059,021 milliseconds. That's 5.7 minutes to 34 minutes. A 34-minute timeout is not a network problem. Something was stopping the clock.

Subtract the span from the timestamp and you get when each request actually started. Every start time landed on a macOS DarkWake event. Then I pulled the sleep log and the spans matched the sleeps to the second: 961s, 939s, 1018 + 1037s against spans of 967s, 941s, and 2059s. The mechanism is dumber than it looks — the span is wall-clock, and wall-clock keeps counting while the CPU is parked. The socket opens, the laptop goes back to sleep on battery, the connection sits frozen, and nothing retries on resume. The "timeout" is 34 minutes because that's how long the machine was asleep.

The fix wasn't a longer timeout. My `coffee-daemon` had been running `caffeinate -d`, which only keeps the display awake — display sleep and system sleep are independent. On battery, `-i` is the only flag that actually holds the machine awake; `-s` registers a `PreventSystemSleep` assertion that macOS's battery policy overrides. I landed on `-dims`, and then wired it into pm2 so the same process manager that keeps my Grafana tunnels alive also keeps the laptop awake.

Two things bit me on the way. First, `pm2 startup` writes its LaunchAgent owned by `root`, so `com.PM2` never lands in your GUI domain and never runs at your login — you have to `chown` the plist and `launchctl bootstrap` it yourself. Second, while trying to get past the sudo prompt from an agent context, I piped my password into `sudo -S`, which put it in `echo`'s argv and in `~/.zsh_history`. Rotating the password was the actual fix; cleaning history was cosmetic.

The bug was never in the network layer. It was in the power management.

→ Full story: https://vianhanif.link/posts/your-mcp-server-isnt-timing-out-your-laptop-is-asleep/

## Tags for Medium
[macos], [devops], [pm2], [developer-tools], [technical]

## Publish Timing
→ Blog post: October 21, 2026
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
- [ ] Sources: caffeinate(8) — https://keith.github.io/xcode-man-pages/caffeinate.8.html ; launchctl(1) — https://keith.github.io/xcode-man-pages/launchctl.1.html ; pm2 startup/resurrect — https://pm2.keymetrics.io/docs/usage/startup/
