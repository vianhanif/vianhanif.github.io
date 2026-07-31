---
layout: page
title: kbase — User Contracts
permalink: /specs/kbase-user-contracts/
---

## Overview
External contracts for humans and AI agents interacting with the Organizational Context Engine. Covers API authentication, sync lifecycle, query contracts, error handling, and MCP tool signatures.

## Authentication

Every request to a protected endpoint must include an API key. The key identifies the caller and enforces rate limits.

| Method | Mechanism | When |
|--------|-----------|------|
| API Key | `X-API-Key: <key>` header | All environments (local, staging, production) |
| Bearer Token | `Authorization: Bearer <token>` | Post-MVP (OAuth 2.0) |

**All environments**: A single static API key configured via `KBASE_API_KEY` env var. All callers share the same key. Per-key rate limits and audit logging come in Phase 5.

**Post-MVP**: Migrate to short-lived JWT tokens via an OAuth 2.0 flow. Each token encodes the caller identity for per-user rate limiting and audit logs.

## Sync Lifecycle

```
User                 kbase-api         go-task-orbit      kbase-flow-swiftide
 |                       |                       |                         |
 |-- POST /sources ----->|                       |                         |
 |  {type, config}       |                       |                         |
 |<-- 201 {source_id} ---|                       |                         |
 |                       |                       |                         |
 |-- POST /sources/      |                       |                         |
 |   {id}/sync --------->|-- Publish task ------->|                         |
 |                       |  {task, knowledge_key,  |                         |
 |                       |   source, source_id,    |                         |
 |                       |   version}             |                         |
 |                       |                       |-- poll Redis Streams ---->|
 |                       |                       |                         |-- enrich -> dedup
 |                       |                       |                         |-- chunk -> embed -> store
 |-- GET /sources/       |                       |                         |
 |   {id}/status ------->|                       |                         |
 |<-- 200 {status,       |                       |                         |
 |   last_run, errors} --|                       |                         |
 |                       |                       |                         |
 |-- GET /context?q=...->|--- Qdrant query ------|                         |
 |<-- 200 synthesized ---|                       |                         |
```

### Register a Source

Register a new data source with its connection config. The source is persisted but not synced automatically — trigger a sync with `POST /sources/{id}/sync`.

**What happens internally:**
1. kbase-api validates the connector type and config schema
2. Source is stored via sql-dock (SQLite for MVP, Postgres/MySQL later — switch via `KBASE_DB_DRIVER`)
3. Returns a stable `source_id` for use in subsequent calls

**Connector config** varies by type. For the MVP Metabase connector:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Connector type: `metabase` |
| `name` | string | yes | Human-readable label for this source |
| `config.api_url` | string | yes | Metabase instance base URL (e.g. `https://metabase.example.com`) |
| `config.api_key` | string | yes | Metabase API key for REST API auth |
| `config.card_ids` | array | no | Filter to specific saved question IDs (default: all discoverable) |
| `config.schedule_interval` | string | no | Cron interval for auto-sync (default: `60m`) |

Future connectors (Confluence, GitHub) will have different `config` shapes.

```http
POST /sources
Content-Type: application/json
X-API-Key: <key>

{
  "type": "metabase",
  "name": "Executive Dashboard",
  "config": {
    "api_url": "https://metabase.example.com",
    "api_key": "mb_api_key_secret",
    "card_ids": [1, 5, 12],
    "schedule_interval": "60m"
  }
}
```

```http
201 Created
Location: /sources/src_abc123

{
  "id": "src_abc123",
  "type": "metabase",
  "name": "Executive Dashboard",
  "status": "registered",
  "created_at": "2026-07-30T06:00:00Z"
}
```

### Trigger Sync

Immediately trigger a sync for a registered source. The sync runs asynchronously — poll `GET /sources/{id}/status` to track progress.

**What happens internally:**
1. kbase-api reads the source config and connector type
2. Connector reads data from the source system via its configured API
3. Data is normalized into `KnowledgeObject`s
4. A lightweight task `{task: "knowledge.sync", knowledge_key, source, source_id, version}` is published to go-task-orbit (Redis Streams transport)
5. kbase-flow-swiftide consumes the task, loads the latest KnowledgeObject from store, runs the ingestion pipeline, then upserts chunks to Qdrant

**Full vs incremental:**
- **Full sync** (MVP): Reads all records from the source. Used on first registration or on `POST /reindex`.
- **Incremental sync** (Phase 3): Reads only records where `updated_at > last_run`. Tracks state per source.

Sync is idempotent — re-running a sync for the same data produces the same result.

```http
POST /sources/src_abc123/sync

202 Accepted

{
  "sync_id": "sync_xyz456",
  "status": "in_progress",
  "message": "Sync queued. Check status at GET /sources/src_abc123/status"
}
```

### Check Sync Status

Poll this endpoint to track sync progress. Clients should implement exponential backoff when status is `in_progress`.

**Recommended polling strategy:**
```
1. Call POST /sources/{id}/sync
2. Wait 2s, call GET /sources/{id}/status
3. If status == "in_progress" → wait 5s, repeat
4. If status == "completed" or "failed" → stop polling
5. Cap at 10 polling attempts (max ~47s wait)
```

**Status transitions:**
```
idle -> in_progress -> completed
                    \-> failed
```

`objects_synced` counts KnowledgeObjects successfully indexed in Qdrant. `objects_failed` counts records that failed normalization or embedding (e.g. due to a malformed field). Failed records do not block successful records — partial sync is allowed.

```http
GET /sources/src_abc123/status

200 OK

{
  "source_id": "src_abc123",
  "sync_id": "sync_xyz456",
  "status": "completed",
  "objects_synced": 42,
  "objects_failed": 0,
  "last_run": "2026-07-30T06:05:00Z",
  "next_run": "2026-07-30T07:05:00Z"
}
```

Status values: `idle` | `in_progress` | `completed` | `failed`

## Query Contracts

### GET /context — Synthesized Understanding

The primary consumer endpoint. Ask a natural language question and receive a synthesized answer. This is the endpoint AI agents and human users will call most often.

**How it works:**
1. The user's question (`q`) is embedded into a vector via the embedding provider
2. Qdrant searches for the top-K semantically similar chunks, filtered by `namespace`, `source`, `type` parameters and defaulting to `status: active`
3. Raw search results pass through the Context Builder: **Rank** → **Merge** → **Group** → **Truncate** → **StructuredContext**
4. The Renderer converts StructuredContext into provider-specific LLM prompts (OpenAI, Claude, Gemini, Ollama)
5. The LLM produces a coherent answer grounded in the retrieved chunks
6. Each source chunk is returned with its relevance score for transparency

**When to use this vs. `/search`:**
- Use `/context` when you want a **ready-to-read answer** (e.g. "What's our current API rate limit?")
- Use `/search` when you need **raw results** for custom processing, debugging, or when you want to inspect scores and metadata yourself

**Response fields:**

| Field | Description |
|-------|-------------|
| `query` | The original question, echoed back for verification |
| `context` | LLM-synthesized answer, grounded in the retrieved sources |
| `sources[]` | The top-K chunks that informed the answer, with relevance scores |
| `tokens_used` | Tokens consumed by the LLM synthesis call (for cost tracking) |
| `processing_time_ms` | End-to-end latency, including embedding + search + LLM |

```http
GET /context?q=What caused the claim increase last quarter?&source=metabase

200 OK

{
  "query": "What caused the claim increase last quarter?",
  "context": "Q2 2026 claims increased 18% YoY, driven primarily by a 23% rise in auto claims. Health claims remained flat. The auto increase correlates with the new fleet policy launched in April. See related: Executive Claim Overview dashboard.",
  "sources": [
    {
      "knowledge_id": "550e8400-e29b-41d4-a716-446655440000",
      "source": "metabase",
      "type": "metrics",
      "title": "Q2 2026 Claim Summary",
      "relevance": 0.92
    },
    {
      "knowledge_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "source": "confluence",
      "type": "business",
      "title": "Fleet Policy Launch Memo",
      "relevance": 0.78
    }
  ],
  "tokens_used": 512,
  "processing_time_ms": 340
}
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | yes | Natural language query |
| `namespace` | string | no | Filter by namespace (e.g. `engineering`) |
| `source` | string | no | Filter by source (e.g. `metabase`) |
| `type` | string | no | Filter by object type |
| `max_sources` | int | no | Max source count to include (default: 5) |

### GET /search — Raw Results

Returns unprocessed results directly from Qdrant, without LLM synthesis. Useful for debugging, custom UIs, or when you need to inspect relevance scores and metadata yourself.

**How it works:**
1. The query (`q`) is embedded into a vector via the embedding provider
2. Qdrant performs a vector similarity search against the `knowledge_objects` collection
3. Results are filtered by any supplied `source`/`type` parameters and default `status: active`
4. Results are returned directly — no reranking, no LLM synthesis

**When to use this vs. `/context`:**
- Use `/search` when you want to **inspect raw scores and metadata** for custom processing
- Use `/context` when you want a **ready-to-read synthesized answer**
- `/search` is also the recommended fallback if `/context` returns insufficiently grounded results (you can inspect the raw chunks to understand why)

**Response fields:**

| Field | Description |
|-------|-------------|
| `query` | The original query, echoed back |
| `results[]` | Raw Qdrant results with score, content, and metadata |
| `results[].score` | Cosine similarity score (0.0–1.0) between query and chunk |
| `results[].content` | The normalized text of the KnowledgeObject chunk |
| `results[].source` | Connector name (e.g. `metabase`, `confluence`) |
| `total` | Total matching results (not capped by `limit`) |
| `processing_time_ms` | End-to-end latency, excluding LLM |

```http
GET /search?q=claim+increase&type=metrics

200 OK

{
  "query": "claim increase",
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "score": 0.92,
      "content": "Q2 2026 Claim Summary: Total claims increased 18% YoY...",
      "source": "metabase",
      "type": "metrics",
      "metadata": {
        "period": "Q2 2026",
        "department": "underwriting"
      }
    }
  ],
  "total": 1,
  "processing_time_ms": 45
}
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | yes | Natural language or keyword query |
| `namespace` | string | no | Filter by namespace |
| `source` | string | no | Filter by source |
| `type` | string | no | Filter by object type |
| `limit` | int | no | Max results (default: 10, max: 50) |
| `offset` | int | no | Pagination offset (default: 0) |

## Error Responses

### Standard Error Envelope

```json
{
  "error": {
    "code": "source_not_found",
    "message": "Source src_abc123 not found",
    "details": {
      "source_id": "src_abc123"
    }
  }
}
```

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `invalid_request` | Malformed request body |
| 401 | `unauthorized` | Missing or invalid API key |
| 404 | `source_not_found` | Source ID not registered |
| 404 | `knowledge_not_found` | KnowledgeObject ID not found |
| 409 | `sync_in_progress` | Sync already running for this source |
| 422 | `validation_error` | Invalid field values (e.g. bad DSN) |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Unexpected server error |
| 502 | `qdrant_unavailable` | Vector DB unreachable |
| 503 | `pipeline_busy` | Ingestion pipeline overloaded |

## Rate Limits

| Tier | Requests/min | Burst | Scope |
|------|-------------|-------|-------|
| Default | 300 | 30 | Per API key |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## MCP Tool Signatures (Phase 4)

```json
{
  "name": "knowledge_search",
  "description": "Search the organizational knowledge base",
  "input": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "namespace": { "type": "string", "description": "Filter by namespace" },
      "source": { "type": "string", "description": "Filter by source" },
      "type": { "type": "string", "description": "Filter by object type" },
      "max_results": { "type": "integer", "default": 10 }
    },
    "required": ["query"]
  },
  "output": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "content": { "type": "string" },
        "relevance": { "type": "number" },
        "source": { "type": "string" },
        "type": { "type": "string" }
      }
    }
  }
}
```

```json
{
  "name": "knowledge_context",
  "description": "Get synthesized understanding about a topic",
  "input": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "What to understand" },
      "namespace": { "type": "string", "description": "Optional namespace filter" },
      "source": { "type": "string", "description": "Optional source filter" }
    },
    "required": ["query"]
  },
  "output": {
    "type": "object",
    "properties": {
      "context": { "type": "string" },
      "sources": { "type": "array" }
    }
  }
}
```

```json
{
  "name": "knowledge_store",
  "description": "Store a new knowledge entry into the index",
  "input": {
    "type": "object",
    "properties": {
      "content": { "type": "string", "description": "Knowledge content" },
      "source": { "type": "string", "default": "api" },
      "type": { "type": "string", "default": "conversation" },
      "metadata": { "type": "object" }
    },
    "required": ["content"]
  },
  "output": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "status": { "type": "string" }
    }
  }
}
```

## Consumer Examples

### AI Agent Workflow

```
Agent needs to answer: "What's our current API rate limit?"

  1. Agent calls knowledge_context(q="current API rate limit")
  2. kbase-api: embed query -> Qdrant search -> Context Builder -> LLM synthesis
  3. Returns: "API rate limit is 200ms p99 SLA with exponential backoff.
     Source: API Rate Limiting Policy v2.1 (Confluence, active)"

  4. If synthesis insufficient, fall back to knowledge_search() for raw results
```

### Human CLI Workflow

```bash
# Register a source
curl -X POST http://localhost:8080/sources \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '{"type":"metabase","name":"Claims Data","config":{"api_url":"https://metabase.example.com","api_key":"mb_key_123","card_ids":[1,5],"schedule_interval":"60m"}}'

# Trigger sync
curl -X POST http://localhost:8080/sources/src_abc123/sync \
  -H "X-API-Key: <your-api-key>"

# Query context
curl -H "X-API-Key: <your-api-key>" \
  "http://localhost:8080/context?q=claim+trends+2026"

# Search raw results
curl -H "X-API-Key: <your-api-key>" \
  "http://localhost:8080/search?q=claim&source=metabase&limit=5"
```
