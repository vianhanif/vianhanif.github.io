---
title: "Your PID File Is a Lie: What Cloudflare Tunnel Taught Me About Process Supervision"
date: 2026-08-15
linked_posts:
  - /posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

Two ways to start the same server. Same code. Same config. Same port. One worked. The other returned 502 Bad Gateway through my Cloudflare Tunnel.

The difference was invisible.

I had two aliases for starting the same 9router process. `9r-start` launched production behind `nohup` with a PID file. `9r-debug` ran the dev server with `--watch` in the foreground. The production server kept dying silently. The dev server — crash-looping visibly — *felt* more reliable because it logged what was wrong.

The PID file said process 9495 was running. The port was LISTEN. Everything looked fine. Except process 9495 was dead, and a different process I didn't know about owned the port.

I'd been checking `ps aux` for a server that wasn't there and trusting a PID file that lied.

The fix wasn't finding the crash root cause — I never did. The fix was switching from nohup+PID to a proper process manager (pm2). No more stale state. No more invisible deaths.

The wrong server lived right in my sight the whole time, and the difference between up and down was not the process list, but the observability.

#Postmortem #DevOps #NodeJS #Cloudflare #DeveloperTools

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/

---

## Notes

- [ ] Post text-only (no links in main body)
- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
- [ ] CTA: teaser ends with a hook
- [ ] Comment: "Full story → https://vianhanif.link/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/"
- [ ] Schedule comment to post immediately after LinkedIn post goes live
- [ ] Wait 10-15 minutes before engaging with comments
