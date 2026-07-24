---
title: "PM2Bar: Get `pm2 list` Visibility Without the Terminal"
date: 2026-09-05
linked_posts:
  - /posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
  - /posts/pm2bar-native-macos-menu-bar-pm2-monitor/
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

I fixed my process supervision problem with pm2. Then I created a new one: I checked `pm2 list` constantly.

Before pm2, I assumed everything was broken. After pm2, I knew everything was handled — but I checked anyway. Terminal open. `pm2 list`. Three processes, all green. Close terminal. Repeat twenty minutes later.

The fix wasn't a monitoring dashboard. It was a menu bar icon.

I built PM2Bar — a native macOS status bar app (~20MB RAM, pure AppKit, no Electron) that polls pm2 every 2 seconds and shows process status at a glance. Red triangle = something errored. Green terminal = everything fine.

The hardest part wasn't the UI. It was the 22-line subprocess lifecycle — PATH resolution through a login shell, main-thread blocking, pipe deadlocks, timer overlap guards. Every macOS developer who's launched a subprocess from a GUI app knows this pain.

Code is MIT on GitHub.

#ProcessSupervision #macOS #Swift #DevTools #PM2

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/pm2bar-native-macos-menu-bar-pm2-monitor/

---

## Notes

- [ ] Post text-only (no links in main body)
- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
- [ ] CTA: teaser ends with a hook
- [ ] Comment: "Full story → https://vianhanif.link/posts/pm2bar-native-macos-menu-bar-pm2-monitor/"
- [ ] Schedule comment to post immediately after LinkedIn post goes live
- [ ] Wait 10-15 minutes before engaging with comments
