---
layout: page
title: "When the Dashboard Became Optional"
date: 2026-10-19
linked_posts:
  - /posts/when-the-dashboard-became-optional/
status: draft
---

# Medium Prep

## Content to Copy

The VPS hit 65% disk usage two weeks after moving to Tencent. It wasn't my app, it was the "invisible" bloat of a dev-focused CI pipeline. A quick look showed 16+GB of dangling Docker images and build caches from iterative deploys. I pruned the images and cleared the cache, but the bigger issue was the infrastructure itself: I was treating a production VPS like a home lab, keeping a heavy, resource-intensive dashboard running even though I rarely touch it.

The fix was a structural change: Docker Compose profiles. By marking the dashboard as an optional service (`profiles: ["dashboard"]`), I shifted from an "always-on" stack to an "API-first" default. The API stays live, lightweight, and always reachable, while the dashboard sits as a built, ready-to-run image I can bring up with one command when needed. 

Optionality in development environments isn't just about resource usage — it's about shifting the default posture of our tooling. By making tools opt-in, the API becomes the product and the dashboard is just a tool I reach for when it's time to check the state. The VPS is now lean, and I don't have to worry about disk bloat anymore.

→ Full story: https://vianhanif.link/posts/when-the-dashboard-became-optional/

## Tags for Medium
[docker], [orchestration], [9router], [developer-tools], [technical]

## Publish Timing
→ Blog post: October 19, 2026
→ Medium: D-0 (same day as blog publish)
