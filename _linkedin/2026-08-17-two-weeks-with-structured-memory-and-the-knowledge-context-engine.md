---
title: "From Flat Files to a Knowledge Context Engine: Two Weeks of Building Organizational Memory"
date: 2026-08-17
linked_posts:
  - /posts/building-memory-into-9router-a-proxy-layer-experiment/
  - /posts/two-weeks-with-structured-memory-and-the-knowledge-context-engine/
medium_post: https://vianhanif.medium.com/2026-08-17-two-weeks-with-structured-memory-and-the-knowledge-context-engine
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

Three weeks ago I published a post about memory in 9router, but I quickly hit a wall. Flat files are great for prototyping — they're terrible for enterprise knowledge. Every request carried noise, truncation dropped data, and retrieval was effectively random.

I spent a Saturday sketching out an upgrade, but then hit a pivot: instead of just building an "agent memory," I'm building an Organizational Context Engine.

It's an infrastructure shift:
- Normalizing disparate data (Metabase, docs, APIs) into canonical Knowledge Objects.
- An orbit task bus (memory / Redis / SQS) connecting a Go API to a Rust embedding pipeline.
- Local AWS emulation with Floci.io so the whole stack runs in docker compose, no cloud needed.
- Exposing clean APIs that return "understanding" rather than raw snippets.

Memory is for the past. Context is for operations. I'm moving from patching my AI router's memory layer to building the context engine that powers it.

#AI #OpenSource #DeveloperTools #Programming #KnowledgeEngine

---

# Comment (First Comment)

Full story on Medium → https://vianhanif.medium.com/2026-08-17-two-weeks-with-structured-memory-and-the-knowledge-context-engine

---

## Notes
- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a hook
  - Comment: "Full story on Medium → https://vianhanif.medium.com/2026-08-17-two-weeks-with-structured-memory-and-the-knowledge-context-engine"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
