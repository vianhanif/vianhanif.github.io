---
layout: page
title: Company Memory Platform — Implementation Plan
permalink: /specs/company-memory-plan/
---

## Overview
An organizational context engine: a service that continuously ingests enterprise knowledge
from heterogeneous systems, transforms it into a normalized semantic index, maintains
freshness through incremental synchronization, and exposes human-readable organizational
understanding through APIs consumable by humans and AI agents.

## MVP Boundary
- **LLM**: OpenAI-compatible API only (no 9router). Swiftide's `OpenAIFuncNode` for
  embeddings + completions.
- **Data Source**: Metabase DB (Postgres/MySQL) as the primary ingestion source.
- **No MCP/UI**: Pure ingestion pipeline + context query API. Agent integration after
  core retrieval works.
- **Single Connector**: Metabase-only. Connector abstraction defined but only one impl.

## Core Concepts

### Knowledge Object (not "Memory")
The canonical unit. Every source is normalized into this structure before embedding:

```
KnowledgeObject {
  id:         UUID
  content:    String          // normalized text
  source:     String          // connector name
  source_id:  String          // original ID in source system
  type:       ObjectType      // business | technical | metrics | conversation
  metadata:   Map<String, Any> // source-specific: {month, department, version, ...}
  version:    Int
  effective:  DateTime        // when this version became active
  expires:    DateTime?       // nil = current
  status:     Status          // active | superseded | archived
  created_at: DateTime
  updated_at: DateTime
}
```

### Connector Abstraction
Every source implements this interface:

```
Connector {
  name()            -> String
  discover()        -> []SourceEntity       // list available entities
  read(id)          -> KnowledgeObject      // fetch by ID
  incremental_sync(since: DateTime) -> []Change
  full_sync()       -> []KnowledgeObject
  metadata()        -> ConnectorMetadata
}
```

MVP ships one connector: **Metabase Connector** (queries Metabase DB directly via SQL).

Future connectors: Confluence, GitHub, Slack, S3, Postgres, REST.

## Architecture

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

## Where Vector DB Fits

### The Problem
Metabase stores structured data queried via SQL — exact matches, aggregations, filters.
It cannot answer "What drove the claim increase last quarter?" without a pre-built
dashboard. It cannot connect a Metabase report to a related runbook or meeting decision.

### The Solution
A vector DB stores **embeddings** — numerical representations of text meaning:

**Ingestion**: Data from Metabase is pulled via the Metabase Connector, normalized into
KnowledgeObjects, chunked, and each chunk converted to a vector via an embedding model
(OpenAI API). Vectors + text + metadata stored in Qdrant.

**Query**: A question is embedded to a vector. Qdrant finds semantically similar stored
vectors via cosine similarity. Matched chunks feed the Context Builder for LLM synthesis.

### Metabase DB vs Vector DB
| Aspect | Metabase DB (source) | Vector DB (index) |
|---|---|---|
| Purpose | Source of truth, transactional | Semantic index, fast retrieval |
| Query type | SQL exact match | Hybrid: vector + keyword + filter |
| Schema | Fixed tables | Flexible KnowledgeObject payload |
| Holds | Raw data | Embeddings + text + metadata |
| Used by | BI dashboards, reports | LLM context retrieval |

They are not redundant — they serve different query patterns.

## Normalizer Layer
The critical new abstraction between sources and pipelines. Converts disparate formats
into canonical KnowledgeObjects before chunking+embedding:

```
Markdown doc           \                       +-------------------+
SQL row from Metabase   --> [Normalizer] -----> | KnowledgeObject   |
PDF file               /                       +-------------------+
```

This means downstream processing (chunking, embedding, indexing) never needs to know
about source formats — everything is already structured uniformly.

## Context Builder
The explicit stage between search results and LLM synthesis. This is your IP, not
Swiftide's:

```
Raw search results (50+ chunks)
       |
    [Rank]          -- filter by relevance score, time, authority
       |
    [Merge]         -- deduplicate overlapping chunks
       |
    [Group]         -- cluster by entity, source, time period
       |
    [Truncate]      -- fit within context window (target: ~8 chunks)
       |
    [Context]       -- assemble into structured prompt context
       |
    [LLM Synthesize] -- produce human-readable "understanding"
```

The Context Builder makes the difference between "here are some docs" and
"here is what you need to know."

## Hybrid Search
Pure vector search misses exact matches (IDs, policy numbers, service names).

MVP starts with vector-only but plans for:

```
Query
  |
  +-- Vector similarity (semantic meaning)
  +-- Keyword BM25      (exact terms)
  +-- Metadata filter   (source, type, date range, status)
  |
[Reranker] -- cross-encoder or LLM-based scoring
  |
  Final ranked results
```

Qdrant supports this natively via payload filters + sparse vectors.

## Versioning & Freshness
KnowledgeObjects carry version metadata. Critical for business rules, policies, pricing:

```
version: 3
effective: 2026-06-01
expires: 2026-09-01
status: active
```

Retrieval respects these:
- Queries filter by `status: active` by default
- Time-travel queries can target `effective <= query_date AND (expires IS NULL OR expires > query_date)`
- Re-indexing updates version numbers, old entries marked `superseded`

### Scheduling
```
Metabase Connector
  |
  [Scheduler] -- every 60m via cron
  |
  incremental_sync(since: last_run)
  |
  [Pipeline] -- normalize -> chunk -> embed -> store/update
```

No manual `curl` in production.

## API Surface

### Sources (new primary abstraction)
| Method | Path | Purpose |
|---|---|---|
| POST | /sources | Register a connector with config |
| GET | /sources | List registered sources |
| POST | /sources/{id}/sync | Trigger sync (full or incremental) |
| GET | /sources/{id}/status | Sync status, last run, error count |

### Context & Search
| Method | Path | Purpose |
|---|---|---|
| GET | /context?q=... | "Understanding" response via Context Builder |
| GET | /search?q=... | Raw search results (for debugging/custom use) |
| GET | /knowledge/{id} | Retrieve specific KnowledgeObject |
| DELETE | /knowledge/{id} | Delete |
| POST | /reindex | Full re-index all sources |

## Implementation Roadmap

### Phase 1: Ingestion Pipeline
- KnowledgeObject schema defined
- Normalizer for Markdown + SQL-based content
- Metabase Connector (MVP: full sync, no incremental)
- Swiftide pipeline: chunk -> embed -> Qdrant store
- Chunking strategy (time-windowed for metrics, section-based for docs)

### Phase 2: Context Builder
- Rank -> Merge -> Group -> Truncate -> LLM pipeline
- `/context` endpoint returning synthesized understanding
- Metadata filtering on search

### Phase 3: Scheduler & Incremental Sync
- Cron-based scheduler for Metabase Connector
- `incremental_sync` implementation (track last_updated per entity)
- Version tracking and stale data management

### Phase 4: Agent Integration
- MCP server wrapping Context + Search APIs
- `knowledge_store`, `knowledge_search`, `knowledge_context` tools

### Phase 5: Productionization
- Hybrid search (keyword + vector + reranker)
- Full Connector abstraction (Discover, Read, IncrementalSync, Metadata, Version)
- Auth per source/namespace, audit log
- Rate limiting, cost tracking for LLM-based pipeline nodes

## Alternatives & Considerations
- **Rust vs Go**: Swiftide saves pipeline dev time. Keep API layer language-agnostic;
  a thin Go proxy is viable if the Rust boundary becomes friction.
- **Qdrant vs pgvector**: Qdrant preferred for MVP (native hybrid search, filtering,
  no schema coupling). Migrate to pgvector only if operational simplicity demands it.
- **Embedding model**: OpenAI `text-embedding-3-small`. For cost-sensitive pipelines,
  local models (BGE, E5) via an OpenAI-compatible proxy.
- **Normalizer vs raw chunking**: Normalizer adds up-front complexity but pays off
  when adding new connectors. Skip in early MVP if pressing forward fast.
- **The name**: "Memory" is scope-limited. Internally prefer "Knowledge Object" /
  "Context Entry." The product identity should be "Organizational Context Engine,"
  not "Memory Platform."
