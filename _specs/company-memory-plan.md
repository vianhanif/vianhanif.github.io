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
- **LLM**: OpenAI-compatible API only (no 9router). Swiftide's `OpenAIFuncNode` for embeddings + completions.
- **Data Source**: Metabase REST API as the primary ingestion source.
- **No MCP/UI**: Pure ingestion pipeline + context query API. Agent integration after core retrieval works.
- **Single Connector**: Metabase-only. Connector abstraction defined but only one impl.

## Core Concepts

### Knowledge Object (not "Memory")
The canonical unit. Every source is normalized into this structure before embedding:

```
KnowledgeObject {
  knowledge_key: String          // stable identity: "claim-policy", "api-rate-limits"
  id:           UUID             // unique per version
  namespace:    String           // "engineering", "finance", "legal"
  content:      String          // normalized text
  source:       String          // connector name
  source_id:    String          // original ID in source system
  type:         ObjectType      // business | technical | metrics | conversation
  metadata:     Map<String, Any> // source-specific: {month, department, version, ...}
  version:      Int
  effective:    DateTime        // when this version became active
  expires:      DateTime?       // nil = current
  status:       Status          // active | archived
  created_at:   DateTime
  updated_at:   DateTime
}

KnowledgeChunk {
  chunk_id:     UUID             // unique per chunk
  knowledge_key: String          // parent stable ident
  knowledge_id: UUID             // parent KnowledgeObject UUID
  chunk_index:  Int             // ordering within parent
  content:      String
  token_count:  Int
  // embedding stored in vector DB, not here
  namespace:    String
  source:       String
  type:         ObjectType
  version:      Int
}
```

### ObjectType Enum

| Type | Description | Example |
|------|-------------|---------|
| `business` | Policies, decisions, runbooks, org rules | API rate limiting policy, claim processing SOP |
| `technical` | Code docs, architecture, infrastructure specs | Terraform modules, service APIs, deployment runbooks |
| `metrics` | Quantitative data, reports, dashboards | Q2 claim summaries, quarterly revenue reports |
| `conversation` | Meeting notes, decisions, Slack/email threads | Sprint planning decisions, architecture review notes |

### Sample

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Q2 2026 Claim Summary: Total claims increased 18% YoY driven by a 23% rise in auto claims. Health claims remained flat.",
  "source": "metabase",
  "source_id": "question:claims-quarterly-001",
  "type": "metrics",
  "metadata": {
    "department": "underwriting",
    "period": "Q2 2026",
    "dashboard": "Executive Claims Overview"
  },
  "version": 3,
  "effective": "2026-07-01T00:00:00Z",
  "expires": "2026-10-01T00:00:00Z",
  "status": "active",
  "created_at": "2026-07-01T06:00:00Z",
  "updated_at": "2026-07-15T09:30:00Z"
}
```

```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "content": "API Rate Limiting Policy: All internal services must implement exponential backoff with jitter. Max retry: 5. Target SLA: p99 < 200ms.",
  "source": "confluence",
  "source_id": "page:api-policy-001",
  "type": "business",
  "metadata": {
    "author": "platform-team",
    "version": "2.1",
    "confluence_space": "Engineering"
  },
  "version": 2,
  "effective": "2026-03-15T00:00:00Z",
  "expires": null,
  "status": "active",
  "created_at": "2026-03-15T00:00:00Z",
  "updated_at": "2026-06-20T11:00:00Z"
}
```

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "content": "Claim Processing Runbook v1.0: Step 1: Verify policyholder ID... (superseded by v1.2)",
  "source": "confluence",
  "source_id": "page:claim-runbook-v1",
  "type": "technical",
  "metadata": {
    "author": "claims-team",
    "version": "1.0"
  },
  "version": 1,
  "effective": "2026-01-10T00:00:00Z",
  "expires": "2026-06-01T00:00:00Z",
  "status": "archived",
  "created_at": "2026-01-10T00:00:00Z",
  "updated_at": "2026-06-01T00:00:00Z"
}
```

### Connector Abstraction
Every source implements this interface:

```
Connector {
  name()         -> String
  Pull()         -> []KnowledgeObject  // full sync: fetch all entities
  Watch()        -> []Change           // incremental: entities changed since last checkpoint
  Checkpoint(ts) -> ()                 // persist last sync timestamp
  Capabilities() -> ConnectorCapabilities // what sync modes are supported
  Health()       -> HealthStatus        // connectivity check
}
```

MVP ships one connector: **Metabase Connector** (queries Metabase REST API).

Future connectors: Confluence, GitHub, Slack, S3, Postgres, REST.
## Architecture
- **Structure**: Multi-repo to maintain shared `KnowledgeObject` definitions and enable atomic commits across ingestion and API layers.
- **Repository Organization**:
```text
  /kbase-api (Go: API + Scheduler + Connectors + internal/dock)
  /kbase-flow-swiftide (Rust: Swiftide ingestion pipeline)
  /docker-compose.yml      (root-level, orchestrates all services)
  ```

```
+-------------------+    +-------------------+    +------------------+
||   Metabase API    |    |   Core APIs       |    |   Documents      |
+-------------------+    +-------------------+    +------------------+
         |                      |                       |
         +----------------------+-----------------------+
                                |
                         [Connectors] (in /connectors)
                     Discover / Read / Sync
                                |
                         [Normalizer]
                     -> KnowledgeObject
                                |
                     +-----------+-----------+
                     |                       |
              [Ingestion Pipeline]    [Scheduler]
              enrich -> dedup ->          cron/webhook
              version -> chunk ->
              embed -> store
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

## Repository Strategy
- **Polyglot Multi-repo**: `kbase-api` (Go) and `kbase-flow-swiftide` (Rust).
- **Organization**:
  - `kbase-api`: API endpoints, Scheduler, Connectors (Metabase etc), `/internal/dock` for DB abstraction (sqlite/postgres/mysql). — see [kbase-api spec](/specs/kbase-api-spec/)
  - `kbase-flow-swiftide`: Swiftide ingestion pipeline (Rust). — see [kbase-flow-swiftide spec](/specs/kbase-flow-swiftide-spec/)
- **Local Dev**: Root `docker-compose.yml` orchestrates all services (redis, qdrant, metabase, kbase-api, kbase-flow-swiftide). See [Local Dev section](#local-dev-docker-compose) below.
- **Deployment Strategy**: 
  - Uses multi-stage `Dockerfile` (builder stage + scratch runtime) — no separate `base.Dockerfile`.
  - Helm chart in `deployment/helm_chart/` for infrastructure (following `core/deployment/` conventions).
  - Environment-specific configs: `values.staging.yaml`, `values.production.yaml` for per-service overrides.
- **Secrets management**: Post-dev, integrate External Secrets Operator with AWS Secrets Manager. Secrets not stored in Helm values files.
- **Source persistence**: kbase-api uses `internal/dock` for DB-agnostic persistence. SQLite (MVP) via PVC survives pod restarts. Postgres/MySQL (later) via `KBASE_DB_DRIVER` config change.
- **Task runtime**: `go-task-orbit` for async task scheduling. InMemory transport for dev, Redis Streams for staging/prod. Enables retries, DLQ, idempotency without AWS coupling.
- **CI/CD**: Standardized GitLab CI templates for building and testing Go/Rust services.
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
    [StructuredContext] -- assemble into {Topic, Sources[], Facts[], Timeline[], Policies[]}
       |
    [Renderer]      -- StructuredContext -> LLM prompt (OpenAI, Claude, Gemini, Ollama)
       |
    [Synthesize]    -- produce human-readable "understanding"
```

The **Renderer** is provider-specific. The **Context Builder** is not.

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
knowledge_key: "claim-policy"
version: 3
effective: 2026-06-01
expires: 2026-09-01
status: active
```

Retrieval respects these:
- Queries filter by `status: active` by default
- Time-travel queries can target `effective <= query_date AND (expires IS NULL OR expires > query_date)`
- Re-indexing: new version arrives, old entry gets `expires` set + `status: archived`, new entry gets `effective` + `status: active`
- Hard delete via Qdrant API (not through KnowledgeObject status)

### Scheduling
```
Metabase Connector
  |
  [Scheduler] -- every 60m via cron (in kbase-api)
  |
  Watch(since: last_run)  -- incremental: entities changed since last checkpoint
  |
  [go-task-orbit] -- knowledge.sync task published to Redis Streams
  |
  [Worker] (in kbase-flow-swiftide)
  |
  [Pipeline] -- enrich -> dedup -> version check -> chunk -> embed -> store/update
```

No manual `curl` in production. Local dev uses go-task-orbit InMemory transport.

## Local Dev (Docker Compose)

A root `docker-compose.yml` orchestrates all services for local development:

```yaml
# docker-compose.yml (repository root)
services:
  redis:
    image: redis:7-alpine                 # go-task-orbit Redis Streams transport
    ports: ["6379:6379"]
    volumes:
      - ./data/redis:/data

  qdrant:
    image: qdrant/qdrant:latest          # Vector DB
    ports: ["6333:6333", "6334:6334"]

  metabase:
    image: metabase/metabase:v0.52.0    # Metabase for connector testing
    ports: ["3000:3000"]
    environment:
      MB_API_KEY: mb_api_key_secret

  kbase-api:
    build: ./kbase-api
    ports: ["8080:8080"]
    volumes:
      - ./data/kbase:/data              # SQLite persistence
    environment:
      KBASE_QDRANT_HOST: qdrant
      KBASE_API_KEY: dev-api-key
      KBASE_METABASE_API_URL: http://metabase:3000
      KBASE_METABASE_API_KEY: mb_api_key_secret
      KBASE_DB_DRIVER: sqlite
      KBASE_DB_DSN: /data/kbase.db
      KBASE_ORBIT_TRANSPORT: memory
    depends_on: [redis, qdrant, metabase]

  kbase-flow-swiftide:
    build: ./kbase-flow-swiftide
    ports: ["8081:8081"]
    environment:
      FLOW_QDRANT_HOST: qdrant
      FLOW_ORBIT_TRANSPORT: memory
    depends_on: [redis, qdrant]
```

Build and run with persistent volumes:
```bash
docker compose up --build -d
# Access: curl http://localhost:8080/healthz
# SQLite DB persists at ./data/kbase/
```

Per-service configs (ports, env vars) are documented in each service spec.
This root compose ties them together.

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

See [kbase-user-contracts](/specs/kbase-user-contracts/) for full request/response schemas, error codes, rate limits, and MCP tool signatures.

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
- `Watch()` implementation (track last checkpoint per entity)
- Version tracking and stale data management
- go-task-orbit task runtime setup (InMemory for dev, Redis Streams for prod)

### Phase 4: Agent Integration
- MCP server wrapping Context + Search APIs
- `knowledge_store`, `knowledge_search`, `knowledge_context` tools

### Phase 5: Productionization
- Hybrid search (keyword + vector + reranker)
- Full Connector abstraction (Discover, Read, IncrementalSync, Metadata, Version)
- Namespaces: isolation for HR, Engineering, Finance, Legal
- Auth per source/namespace, audit log
- Rate limiting, cost tracking for LLM-based pipeline nodes

## Alternatives & Considerations
- **Polyglot Stack**: Swiftide (Rust) for the ingestion pipeline — it's the core dependency. API, scheduler, and connectors in Go. Shared `KnowledgeObject` types via protobuf or a thin interop layer.
- **Qdrant vs pgvector**: Qdrant preferred for MVP (native hybrid search, filtering,
  no schema coupling). Migrate to pgvector only if operational simplicity demands it.
- **Embedding model**: OpenAI `text-embedding-3-small`. For cost-sensitive pipelines,
  local models (BGE, E5) via an OpenAI-compatible proxy.
- **Normalizer vs raw chunking**: Normalizer adds up-front complexity but pays off
  when adding new connectors. Skip in early MVP if pressing forward fast.
- **The name**: "Memory" is scope-limited. Internally prefer "Knowledge Object" /
  "Context Entry." The product identity should be "Organizational Context Engine,"
  not "Memory Platform."
