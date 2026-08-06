---
title: "From Flat Files to a Knowledge Context Engine: Two Weeks of Building Organizational Memory"
date: 2026-08-30
linked_posts:
  - /posts/building-memory-into-9router-a-proxy-layer-experiment/
  - /posts/two-weeks-with-structured-memory-and-the-knowledge-context-engine/
status: draft
---

# Medium Prep

## Content to Copy

Three weeks ago I published a post about building memory into my AI router, 9router. The system worked, but the flat-file approach I built hit its limits fast—it was noisy, prone to data loss, and lacked the structure needed for meaningful retrieval.

I decided to stop patching the flat-file system and jump straight into building something better. I spent a Saturday sketching an upgrade to SQLite, but then hit a pivot: instead of just building an "agent memory," I'm building an **Organizational Context Engine**.

This shift marks a move away from simple agent memory to building foundational infrastructure for company context. It’s no longer about what an agent remembers—it's about making organizational data natively accessible.

### From "Memory" to "Knowledge Context"

Flat files were a prototype, not a foundation. They were information firehoses that dumped irrelevant data into context windows, wasted tokens, and lacked the ability to selectively retrieve facts. My new architecture treats company data as a primary index for AI operations:

- **Connectors**: Instead of manual ingestion, formal connectors (like Metabase) discover, sync, and version raw source data.
- **Normalization**: Data is ingested and transformed into canonical **Knowledge Objects**—standardized entities with versioning, effective dates, and status.
- **Context Builder**: The core IP isn't the storage, but the retrieval pipeline that ranks, merges, groups, and truncates retrieved data chunks to synthesize "understanding" for an agent, rather than just returning raw snippets.
- **Hybrid Search**: By implementing Vector + Keyword + Metadata filtering + Reranking (powered by Qdrant), the engine can answer specific queries that pure semantic search often misses.

### The Rust Pipeline: No Swiftide

I initially integrated Swiftide's Rust pipeline directly. It worked, but it pulled in a large dependency surface for what turned out to be a narrow use case: poll orbit tasks → fetch object → embed → store. The custom Rust implementation is ~300 lines with `reqwest` for HTTP polling and `async-openai` for embeddings — no Swiftide, no cgo, no ceremony.

The **orbit task bus** is the key integration point. The Go API holds sync state in SQLite, publishes task messages to a `knowledge.sync` queue (memory / Redis Streams / SQS), and exposes internal endpoints. The Rust pipeline long-polls `GET /internal/orbit/tasks`, fetches the object at `GET /internal/orbit/objects/{sync_id}`, generates the embedding, and acks via `POST /internal/orbit/tasks/ack`.

For local development, **Floci.io** replaces AWS. It runs as a container alongside the services, emulates SQS on port 4566, and requires no AWS credentials. The full stack — Go API, Rust pipeline, Floci, Redis, Qdrant — runs via `docker compose`.

### The Impact on 9router

9router is my AI router. The current memory implementation is baked into its proxy layer, which is great for conversation state but feels heavy for enterprise knowledge.

The Knowledge Context Engine decouples this. 9router becomes a *consumer* of this engine rather than the host. I’m keeping 9router lean—using it only to route requests—while delegating heavy knowledge retrieval and organization to this new, independent service. This clears the clutter in 9router, lets the context engine scale independently, and standardizes how agents access company knowledge across my entire stack.

[→ Full story: https://vianhanif.link/posts/two-weeks-with-structured-memory-and-the-knowledge-context-engine/]

## Tags for Medium
[ai, memory, 9router, tooling, architecture, rust]

## Publish Timing
→ Blog series: July 2026 - August 2026
→ Medium: D-0
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
