---
layout: page
title: Company Memory Platform — Implementation Plan
permalink: /specs/company-memory-plan/
---

## Overview
A Company Memory Platform as shared knowledge infrastructure: a service that continuously transforms raw company data (Metabase DB) into searchable, explainable organizational understanding for both humans and AI agents.

## MVP Boundary
- **LLM**: OpenAI-compatible API only (no 9router). Swiftide's `OpenAIFuncNode` or any OpenAI-compatible endpoint for embeddings + completions.
- **Data Source**: Metabase DB (Postgres/MySQL underneath) is the primary ingestion source. Swiftide queries it directly via SQL or feeds from exported data.
- **No MCP/UI in MVP**: Pure ingestion pipeline + context query API. Agent integration comes after core retrieval works.

## Architectural Approach
Build a knowledge context service that keeps Swiftide as an implementation detail for ingestion and retrieval.

```
                +----------------------+
                |   Existing Systems   |
                +----------------------+
                  |        |        |
      Metabase    |   Core APIs  Documents
                  |        |        |
                  +--------+--------+
                           |
                Inject Memory APIs
                           |
        +--------------------------------+
        |      Company Memory Layer      |
        |                                |
        |  Swiftide Ingestion Pipelines  |
        |                                |
        |  - Chunking                    |
        |  - Embedding                   |
        |  - Metadata                    |
        |  - Entity extraction           |
        |  - Relationships               |
        +--------------------------------+
                           |
                Vector DB + Metadata DB
                           |
        +--------------------------------+
        |      Search / Context APIs     |
        +--------------------------------+
          |            |             |
      Human UI      MCP Server     REST API
          |            |             |
     Engineers     AI Agents     Internal Apps
```

## Doability Evaluation
- **High Feasibility**: Swiftide provides mature primitives for ingestion, chunking, and embedding. Project is actively maintained by Bosun AI.
- **Tech Alignment**: Rust/Swiftide fits a high-performance core infra service. Qdrant (Rust-native vector DB) shares the same ecosystem.
- **MVP Simplification**: No 9router dependency, no external services — just Swiftide + Vector DB + OpenAI-compatible endpoint. This is a well-trodden path.
- **Primary Complexity**: Not storage or ingestion — those are solved by Swiftide + Vector DB. The hard part is **contextual retrieval** (synthesizing vector hits into human-readable "understanding") and **schema evolution** across diverse data types from Metabase.
- **Risk**: Low for MVP scope. Rust is new to the stack but Swiftide abstracts most complexity.

## Where Vector DB Fits
This is the core question: **why do you need a vector DB at all if you already have Metabase storing the data?**

### The Problem
Metabase stores structured data (tables, dashboards) and queries it with SQL — exact matches, aggregations, filters. It cannot answer "What happened with claims last month?" unless someone built that exact dashboard. It cannot discover semantic connections between a Metabase report, a runbook, and a meeting decision.

### The Vector DB Role
A vector DB stores **embeddings** — numerical representations of text meaning, not raw text. Two steps:

**Ingestion**: Data from Metabase is pulled, chunked into passages, each passage converted to a vector via an embedding model (OpenAI API), and stored in the vector DB alongside original text and metadata.

**Query**: When someone asks a question, the query is also converted to a vector. The vector DB finds the most semantically similar stored vectors (cosine similarity). Those matched chunks become context for the LLM to synthesize an answer.

### Concrete Example
```
Metabase table: "July claims +27%, vehicle insurance, Jakarta region"
        |
Swiftide pipeline: chunk -> embed -> store
        |
Vector DB: [0.12, 0.87, -0.33, ...] + "July claims +27%..." + {source:"metabase", month:"2026-07"}
        |
Query: "What drove the claim increase last quarter?" -> embed -> vector search
        |
Matched chunk fed to LLM -> "July claims increased 27% driven by vehicle insurance in Jakarta..."
```

Without a vector DB, you'd need exact keyword matches. The vector DB enables **semantic understanding** — finding relevant content even when the query uses different words than the source.

### Metabase vs Vector DB
| Aspect | Metabase DB (source) | Vector DB (index) |
|---|---|---|
| Purpose | Source of truth, transactional | Semantic index, fast retrieval |
| Query type | SQL exact match | Vector similarity search |
| Schema | Fixed tables | Flexible payload per chunk |
| Holds | Raw data | Embeddings + chunk text + metadata |
| Used by | BI dashboards, reports | LLM context retrieval |

The Metabase DB is the **authoritative source**. The vector DB is a **derived index** optimized for semantic search. They're not redundant — they serve different query patterns.

## Memory Type Model
Knowledge is partitioned into five types, each with its own chunk strategy and pipeline:

| Memory Type | Sources | Chunk Strategy | Metadata |
|---|---|---|---|
| Business | Insurance products, rules, pricing | Section-based | product, dept, version |
| Operational | Incidents, deployments, runbooks | Time-windowed | service, env, severity |
| Data | Metabase dashboards, KPI trends, reports | Table/summary | source, period, agg |
| Technical | APIs, architecture docs, ADRs | Document-section | service, domain |
| Conversation | Meeting summaries, decisions | Episode | participants, date, project |

## Implementation Details

### 1. Processing Layer (Swiftide/Rust)
- **Ingestion Pipeline**: Swiftide provides chained pipeline stages — `LoaderNode` -> `ChunkNode` -> `EmbedNode` -> `StoreNode`. Each memory type gets its own pipeline topology with custom chunking and metadata extraction.
- **Entity & Relationship Extraction**: Use an LLM call node at ingestion to extract entities, tags, and inter-document relationships. Stored alongside vectors for filtered retrieval.
- **Prompt-Based Summarization (Search)**: Retrieved chunks for a query are fed into a summarization prompt that produces the "understanding" response instead of raw text snippets.

### 2. Storage Strategy
- **Vector DB**: Qdrant (preferred — Rust-native, high throughput, built-in payload filtering) or pgvector. MVP doesn't need 9router colocation, so Qdrant standalone is simpler.
- **Metadata DB**: Qdrant payloads carry chunk text + source/date/type metadata. For MVP this is sufficient — no separate metadata DB needed.
- **Embedding Model**: OpenAI `text-embedding-3-small` or any OpenAI-compatible embedding endpoint. Swiftide's `OpenAIEmbed` node handles this natively.

### 3. API Surface

| Method | Path | Purpose |
|---|---|---|
| POST | /memory | Inject a single memory entry |
| POST | /memory/batch | Bulk injection |
| POST | /memory/file | Upload file (PDF, CSV, MD, JSON) |
| GET | /memory/search | Semantic search (raw chunks) |
| GET | /memory/context | Context query — returns "understanding" |
| GET | /memory/{id} | Retrieve specific memory |
| PUT | /memory/{id} | Update |
| DELETE | /memory/{id} | Delete |
| POST | /memory/summarize | Summarize a namespace/type |
| POST | /memory/reindex | Trigger re-ingestion |

### 4. MCP Integration
- Expose tools: `memory_store`, `memory_search`, `memory_context`, `memory_summarize`, `memory_delete`.
- Any MCP-compatible AI (Claude, etc.) can inject knowledge without database access.
- Example: Claude discovers a decision -> calls `memory_store({namespace:"conversation", content:"...", metadata:{...}})`.

### 5. Data Flow (MVP)
```
Metabase DB (Postgres/MySQL)
        |
  [Swiftide SqlLoaderNode]  -- query tables: claims_summary, kpi_trends, monthly_reports
        |
  [ChunkNode]               -- split by time period / section
        |
  [OpenAIEmbed]             -- call OpenAI-compatible embedding API
        |
  [QdrantStoreNode]         -- write vectors + text + metadata to Qdrant
        |
        v
  Qdrant Vector DB
        |
  Context API (axum/Go)     -- query -> embed -> vector search -> LLM synthesize
        |
        v
  Response: human-readable understanding
```

## Implementation Roadmap

### Phase 1: Ingestion Pipeline
- Prototype Swiftide pipelines for Markdown and JSON content.
- Implement metadata extraction from source data.
- Choose and spin up Vector DB (Qdrant preferred).

### Phase 2: Contextual Retrieval
- Build the prompt-based summarization layer that aggregates retrieval results into human-readable "understanding."
- Implement `GET /memory/context` as the primary query endpoint.

### Phase 3: Agent Integration
- Wrap the platform as an MCP server with memory management tools.
- Enable AI agents to both inject and retrieve knowledge seamlessly.

### Phase 4: Productionization
- Complete schemas for all five memory types.
- Re-indexing strategy (scheduled + webhook-triggered).
- Security: auth per namespace, audit log.
- API rate limiting, cost tracking for LLM-based pipeline nodes.

## Alternatives & Considerations
- **Go-native vs Swiftide**: You work mostly in Go (9router). A Go-native build would eliminate a language boundary but requires building chunking, embedding, and pipeline orchestration from scratch. Swiftide saves months of plumbing. The sensible compromise: Swiftide for processing, axum or a thin Go proxy for the API/MCP layer.
- **Data Freshness**: Hardest operational challenge. Metabase dashboards and operational data go stale. Need TTL-based re-indexing and explicit version tags on memory entries.
- **Embedding Cost**: LLM-based extraction at ingestion scales with data volume — make entity extraction optional per pipeline or use a cheaper local model for high-volume sources.
- **Multi-tenancy**: Namespace-based isolation at the API and Qdrant payload filter level. Simple, but verify read-permission enforcement for cross-namespace search.
- **Roll Your Own vs LangChain/LlamaIndex**: Swiftide is Rust. If you later want Python ecosystem interop, the API boundary makes it a local swap — don't couple the API to Rust types.
