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

---

*Update (August 2026): The engine is built. Swiftide was ultimately replaced with a custom Rust pipeline — more on that below.*

## The Architecture

The engine moves beyond memory into a platform that treats company data as a primary index for AI operations. Sources get connected, normalized into canonical Knowledge Objects, chunked and embedded, stored in a vector DB, and retrieved through a Context Builder that synthesizes understanding instead of returning raw snippets.

The implementation splits into two services:

- **kbase-api** (Go/chi v5) — REST API, sync state management, orbit task bus (publish/subscribe), Qdrant vector operations.
- **kbase-flow-swiftide** (Rust) — polls orbit tasks, fetches sync objects, generates embeddings, stores in Qdrant.

```
+-------------------+    +-------------------+    +------------------+
||   Metabase DB     |    |   Core APIs       |    |   Documents      |
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
                   +-------------+-------------+
                   |                           |
           [kbase-api]              [Orbit Task Bus]
           Go / chi v5             memory / redis / sqs
           SQLite sync state       (Floci.io local)
           REST API
           Qdrant vector ops       |
                   |               |
                   +---------------+---------------+
                                 |
                         [kbase-flow-swiftide]
                              Rust (custom)
                         orbit poll -> embed -> store
                                 |
                    Vector DB + Metadata
                                 |
                         +---------+----------+
                         |                    |
                  [Context Builder]   [Search API]
                  rank -> merge ->    hybrid (vector
                  group -> summarize  + keyword + filter)
                         |                    |
                         +---------+----------+
                                   |
                         +---------+----------+
                         |                    |
                      REST API          MCP Server
                         |                    |
                  Internal Apps      AI Agents
```

### Glossary

- **Orbit Task Bus**: Internal pub/sub layer for signaling new sync events. Three transport modes: `memory` (in-process), `redis` (Redis Streams), `sqs` (Floci.io local or AWS). Go side publishes tasks; Rust side polls and acks.
- **Floci.io**: Local AWS emulator that runs SQS-compatible queues without AWS credentials. Enables full local development and testing of the orbit bus.
- **Qdrant**: A vector database — stores embeddings (numeric representations of meaning) and retrieves them by similarity. Unlike Postgres, Qdrant can find semantically related content even when keywords don't match.
- **KnowledgeObject**: The canonical data unit. Every source is normalized into this structure before embedding.

## Key Design Decisions

### Knowledge Objects Over Memory Entries

Instead of a monolithic `MEMORY.md`, every source is normalized into a `KnowledgeObject` with versioning, effective dates, and status — enabling time-travel queries and automatic staleness management without the manual cleanup the old system needed.

### Connectors, Not Manual Ingestion

Rather than calling `POST /memory` by hand, each source implements a formal Connector interface (Discover, Read, IncrementalSync, FullSync). The connector normalizes source data into KnowledgeObjects and publishes them via the orbit task bus — the Rust pipeline picks them up asynchronously.

The task bus uses the **orbit pattern**: Go side holds sync state in SQLite, exposes internal endpoints (`GET/POST /internal/orbit/tasks`, `GET /internal/orbit/objects/{sync_id}`), and publishes task messages. Rust side polls those endpoints, fetches the full object payload, generates embeddings, and stores them in Qdrant.

### Impact on 9router

9router is my AI router — it handles multi-provider LLM requests and agent orchestration. The current memory implementation is baked directly into 9router’s proxy layer, which makes sense for conversation-specific state but feels heavy for enterprise knowledge.

The Knowledge Context Engine decouples this. 9router becomes a *consumer* of this engine rather than the host. I’ll keep 9router lean, using it only to route requests, while delegating heavy knowledge retrieval and organization to this new, independent service. This clears the clutter in 9router, lets the context engine scale independently, and standardizes how agents access company knowledge across my entire stack.

## The Plan

1. **Knowledge Object schema** — define the canonical data model
2. **Normalizer** — convert Metabase SQL output and Markdown into KnowledgeObjects
3. **Orbit task bus** — internal pub/sub for sync events (Go publishes, Rust polls)
4. **kbase-api** — Go/chi v5: sync state in SQLite, orbit endpoints, Qdrant vector ops
5. **kbase-flow-swiftide** — Rust: custom pipeline, reqwest HTTP polling, async-openai embeddings
6. **Context Builder** — rank, merge, group, summarize, expose via REST API
7. **MCP server** — wrap the APIs for agent consumption

Each piece ships independently. The architecture is designed so the Rust embedding pipeline stays behind a stable orbit bus API — swap the Rust side for a Go-native pipeline later if needed.

---

## What Actually Shipped

The plan held up well. The biggest deviation: **Swiftide was removed entirely**.

Early on, I integrated Swiftide's Rust pipeline directly. It worked, but it pulled in a large dependency surface for what turned out to be a narrow use case: poll tasks → fetch object → embed → store. The custom Rust implementation is ~300 lines with `reqwest` for HTTP and `async-openai` for embeddings — no Swiftide, no cgo, no extra ceremony.

The orbit task bus is the key integration point. The Go side creates a `knowledge.sync` queue (memory / Redis Streams / SQS), publishes task messages with `{topic, sync_id, source_id, object_type, version}`, and exposes internal endpoints. The Rust side long-polls `GET /internal/orbit/tasks`, fetches the object at `GET /internal/orbit/objects/{sync_id}`, generates the embedding, and acks via `POST /internal/orbit/tasks/ack`.

For local development, **Floci.io** replaces AWS. It runs as a container alongside the services, emulates SQS on port 4566, and requires no AWS credentials. The full stack — Go API, Rust pipeline, Floci, Redis, Qdrant — runs via `docker compose`.

---

### Timeline

- **May 2026:** Initial flat-file memory prototype shipped in 9router.
- **July 25:** [Published the original post](/posts/building-memory-into-9router-a-proxy-layer-experiment/) documenting the approach.
- **Mid-August:** Discovered Swiftide. Pivoted to the Knowledge Context Engine architecture.
- **August 18:** This post. The engine is planned. Work begins.
- **August 2026:** Engine built and verified. Floci.io SQS integration, orbit task bus, Go + Rust split, custom Rust pipeline (Swiftide removed).

### Sources
- [Part 1: Building Memory Into 9router](/posts/building-memory-into-9router-a-proxy-layer-experiment/)
- [9router — my fork](https://github.com/vianhanif/9router)
- [Memory middleware PR #8](https://github.com/vianhanif/9router/pull/8)
- [Floci.io — local AWS emulator](https://floci.io)
- [Qdrant vector database](https://qdrant.tech)
- [kbase-platform repo](https://github.com/vianhanif/kbase-platform)
