---
title: "From Flat Files to Knowledge Engine: The Plan for Organizational Context"
date: 2026-08-18
tags: [llm, memory, 9router, tooling, follow-up, architecture]
layout: post
---

Three weeks ago I [published a post about building memory into 9router](/posts/building-memory-into-9router-a-proxy-layer-experiment/). The system worked — load, inject, extract — but I already knew the flat-file approach wasn't a foundation I could build on.

Every request carried 38 entries of noise. Truncation was dropping data without me knowing. There were no categories, no search, no way for the LLM to retrieve selectively. The prototype proved the concept, but expanding it meant rethinking from scratch.

I spent a Saturday sketching the upgrade on paper: SQLite as the backbone, categories for priority, confidence decay for staleness. I was fully committed to building the structured memory system myself in Go.

Then, I hit a random LinkedIn post about Swiftide.

I started reading the docs, then the architecture, then the pipeline model. It didn't just solve my "how to index memory" problem — it provided the entire ingestion infrastructure I had spent weeks mentally designing. I realized that building a memory-injection API was small; building a knowledge ingestion pipeline was huge. I pivoted: I'd use the Rust framework for the heavy lifting and expose my own clean, LLM-agnostic API.

That shift turned a memory system into an **Organizational Context Engine**.

## The Architecture

The engine moves beyond memory into a platform that treats company data as a primary index for AI operations. Sources get connected, normalized into canonical Knowledge Objects, chunked and embedded, stored in a vector DB, and retrieved through a Context Builder that synthesizes understanding instead of returning raw snippets.

```
+-------------------+    +-------------------+    +------------------+
|   Metabase DB     |    |   Core APIs       |    |   Documents      |
+-------------------+    +-------------------+    +------------------+
          |                      |                       |
          +----------------------+-----------------------+
                                 |
                         [Connectors]
                     Discover / Read / Sync
                                 |
                         [Normalizer]
                     -> KnowledgeObject
                                 |
                     +-----------+-----------+
                     |                       |
              [Ingestion Pipeline]    [Scheduler]
              chunk -> embed -> store  cron/webhook
                     |                       |
                     +-----------+-----------+
                                 |
                    Vector DB + Metadata
                                 |
                     +-----------+-----------+
                     |                       |
              [Context Builder]     [Search API]
              rank -> merge ->      hybrid (vector
              group -> summarize    + keyword + filter)
                     |                       |
                     +-----------+-----------+
                                 |
                     +-----------+-----------+
                     |                       |
                  REST API               MCP Server
                     |                       |
              Internal Apps           AI Agents
```

### Glossary

- **Swiftide**: A Rust-based ingestion framework that handles chunking, embedding, and storing. Think LlamaIndex rewritten in Rust with better performance.
- **Qdrant**: A vector database — stores embeddings (numeric representations of meaning) and retrieves them by similarity. Unlike Postgres, Qdrant can find semantically related content even when keywords don't match.
- **KnowledgeObject**: The canonical data unit. Every source is normalized into this structure before embedding.

## Key Design Decisions

### Knowledge Objects Over Memory Entries

Instead of a monolithic `MEMORY.md`, every source is normalized into a `KnowledgeObject` with versioning, effective dates, and status — enabling time-travel queries and automatic staleness management without the manual cleanup the old system needed.

### Connectors, Not Manual Ingestion

Rather than calling `POST /memory` by hand, each source implements a formal Connector interface (Discover, Read, IncrementalSync, FullSync). The Metabase connector will be the first — it queries the DB directly via SQL, normalizes rows into KnowledgeObjects, and feeds them into the pipeline.

### Impact on 9router

9router is my AI router — it handles multi-provider LLM requests and agent orchestration. The current memory implementation is baked directly into 9router’s proxy layer, which makes sense for conversation-specific state but feels heavy for enterprise knowledge.

The Knowledge Context Engine decouples this. 9router becomes a *consumer* of this engine rather than the host. I’ll keep 9router lean, using it only to route requests, while delegating heavy knowledge retrieval and organization to this new, independent service. This clears the clutter in 9router, lets the context engine scale independently, and standardizes how agents access company knowledge across my entire stack.

## The Plan

1. **Knowledge Object schema** — define the canonical data model
2. **Normalizer** — convert Metabase SQL output and Markdown into KnowledgeObjects
3. **Metabase Connector** — full sync (MVP), incremental sync (Phase 2)
4. **Swiftide pipeline** — chunk, embed (OpenAI-compatible API), store in Qdrant
5. **Context Builder** — rank, merge, group, summarize, expose via REST API
6. **MCP server** — wrap the APIs for agent consumption

Each piece ships independently. The architecture is designed so Swiftide stays an implementation detail behind a stable API — swap it for a Go-native pipeline later if needed.

The plan is set. The work starts now.

---

### Timeline

- **May 2026:** Initial flat-file memory prototype shipped in 9router.
- **July 25:** [Published the original post](/posts/building-memory-into-9router-a-proxy-layer-experiment/) documenting the approach.
- **Mid-August:** Discovered Swiftide. Pivoted to the Knowledge Context Engine architecture.
- **August 18:** This post. The engine is planned. Work begins.

### Sources
- [Part 1: Building Memory Into 9router](/posts/building-memory-into-9router-a-proxy-layer-experiment/)
- [Swiftide framework](https://github.com/bosun-ai/swiftide)
- [Kwaak — autonomous coding agents built on Swiftide](https://github.com/bosun-ai/kwaak)
- [9router — my fork](https://github.com/vianhanif/9router)
- [Memory middleware PR #8](https://github.com/vianhanif/9router/pull/8)
