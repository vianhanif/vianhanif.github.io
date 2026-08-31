---
layout: page
title: "When the Dashboard Became Optional"
date: 2026-10-19
linked_posts:
  - /posts/when-the-dashboard-became-optional/
medium_post: https://viumeda.medium.com/when-the-dashboard-became-optional
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

My VPS hit 65% disk usage two weeks after moving to Tencent. The culprit wasn't my app — it was 16+GB of dangling Docker images and build caches left behind by a dev-focused CI pipeline.

I pruned the images, cleared the cache, and got 16.8GB back in 30 seconds. But the real fix was structural: I made the heavy dashboard service optional via Docker Compose profiles. The API — which embeds everything it needs at build time — stays lean and always reachable. The dashboard is now one command away when I actually need it.

Optionality in a development environment isn't just about resources. It's about questioning the default — is every service running because it must, or because you never decided it didn't have to?

#API #Docker #DevOps #9router #DeveloperTools

---

# Comment (First Comment)

Full story on Medium → https://viumeda.medium.com/when-the-dashboard-became-optional

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a hook
  - Comment: "Full story on Medium → https://viumeda.medium.com/when-the-dashboard-became-optional"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
