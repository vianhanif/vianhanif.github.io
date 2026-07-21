---
title: "Your PID File Is a Lie: What Cloudflare Tunnel Taught Me About Process Supervision"
date: 2026-08-15
linked_posts:
  - /posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
status: draft
---

# Medium Prep

## Content to Copy

I have two aliases for starting the same Node.js server — 9router, my AI routing layer. `9r-start` launches the production build with `nohup` and writes a PID file. `9r-debug` runs the dev server with `--watch` and debug logging in the foreground.

One day, the tunnel started returning 502 Bad Gateway. The server logs showed four successful requests, then silence. No crash. No error. No exit message. The log just stopped.

I checked the PID file: process 9495 was running. I checked `lsof -i :20128`: port was LISTEN. Everything looked fine.

Process 9495 was dead. A completely separate process I couldn't track owned the port. The PID file recorded the first instant of a process that had already died, and the port stayed occupied by a ghost I never knew existed.

With `nohup`, every crash is silent. The terminal moves on. The log file gets nothing but the start line if the process fails quickly. The dev server with `node --watch` — which crashes just as often — restarts automatically and spits errors to the terminal. It felt more reliable. It wasn't. It was just less hidden.

I re-ran the server under pm2 — which logs every restart — and watched the crash loop unfold in real time. Kill port. Start server. It logs "listening," then crashes. Restarts. Crashes again. Over and over. The crash had always been there behind `nohup`.

I never found the actual cause of the crashes. Unhandled rejection? Environment variable mismatch? A race condition in the tunnel-backend handshake? It doesn't matter. The fix wasn't finding the root cause — the fix was visibility. pm2 turned an invisible crash into a manageable lifecycle event. No stale PID files. No orphaned servers holding ports. When a crash happens — which it will — the process restarts immediately.

The lesson: what you can't see will break in production. And checking `ps aux` won't save you — the process was running. Just the wrong one.

→ Full story: https://vianhanif.link/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/

## Tags for Medium
Postmortem, DevOps, Node.js, Cloudflare, Developer Tools, Technical, Debugging

## Publish Timing
→ Blog series: 2026-08-15
→ Medium: 2 weeks after blog publish

## Notes

- [ ] Wait 2-4 weeks after blog publish (SEO best practice)
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources

- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- nohup (man page): https://man7.org/linux/man-pages/man1/nohup.1.html
- pm2 docs: https://pm2.keymetrics.io/
- Node.js: https://nodejs.org/
- 9router: https://github.com/vianhanif/9router
