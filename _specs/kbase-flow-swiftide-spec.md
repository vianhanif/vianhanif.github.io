---
layout: page
title: kbase-flow-swiftide — Implementation Spec
permalink: /specs/kbase-flow-swiftide-spec/
---

## Overview
Rust service powered by Swiftide that handles the ingestion pipeline: reading normalized `KnowledgeObject`s, chunking, embedding via OpenAI API, and storing vectors in Qdrant.

## KnowledgeObject Schema

### Rust Struct
```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ObjectType {
    Business,
    Technical,
    Metrics,
    Conversation,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Active,
    Archived,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeObject {
    pub knowledge_key: String,   // stable identifier: "claim-policy"
    pub id: String,             // UUID (unique per version)
    pub namespace: String,      // "engineering", "finance", "legal"
    pub content: String,
    pub source: String,
    pub source_id: String,
    #[serde(rename = "type")]
    pub object_type: ObjectType,
    pub metadata: HashMap<String, serde_json::Value>,
    pub version: i32,
    pub effective: String,
    pub expires: Option<String>,
    pub status: Status,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KnowledgeChunk {
    pub chunk_id: String,       // UUID
    pub knowledge_key: String,  // parent stable ident
    pub knowledge_id: String,   // parent KnowledgeObject UUID
    pub chunk_index: i32,      // ordering within parent
    pub content: String,
    pub token_count: i32,
    pub namespace: String,
    pub source: String,
    #[serde(rename = "type")]
    pub object_type: ObjectType,
    pub version: i32,
}
```

### Task Payload (go-task-orbit)

```json
{
  "task": "knowledge.sync",
  "knowledge_key": "claim-policy",
  "source": "metabase",
  "source_id": "dashboard:claims-001",
  "version": 3,
  "sync_id": "sync-uuid",
  "operation": "upsert"
}
```

## Tech Stack
- **Language**: Rust (latest stable)
- **Framework**: Swiftide (primary dependency)
  - `swiftide` crate for pipeline orchestration
  - `swiftide-pipeline`: chunk → embed → store
  - `swiftide-observability`: logging, tracing
- **Vector DB Client**: Qdrant via `qdrant-client` or Swiftide's built-in Qdrant integration
- **Embedding**: OpenAI-compatible API via `openai-api` or Swiftide's `OpenAIFuncNode`. Abstract provider interface for future Claude/Gemini/Ollama support.
- **Task Runtime**: `go-task-orbit` client (Go) runs in kbase-api; this service receives tasks via Redis Streams polling.
- **go-task-orbit Consumer**: Rust-side polling via `redis-rs`. Alternatively, embed go-task-orbit as a Go library via cgo or call its HTTP wrapper.
- **Config**: `config-rs` or env-based via Swiftide's `FromEnv`

## Directory Structure
```text
/kbase-flow-swiftide
├── /src
│   ├── main.rs             # Entrypoint (go-task-orbit task consumer)
│   ├── /pipeline           # Swiftide pipeline definition
│   │   ├── mod.rs
│   │   ├── normalizer.rs  # KnowledgeObject → Chunk
│   │   ├── enricher.rs    # Enrich → Deduplicate → Version check
│   │   └── qdrant_sink.rs # Custom Qdrant sink (if needed)
│   ├── /consumer           # go-task-orbit task consumer
│   │   └── mod.rs
│   ├── /models             # Shared KnowledgeObject types (vendored or submodule)
├── /proto                  # Protobuf definitions for KnowledgeObject
├── /tests                  # Integration tests
├── /deploy
│   ├── Dockerfile                        # Multi-stage: builder + scratch
│   └── /helm_chart
│       ├── Chart.yaml
│       ├── values.yaml                   # Default values
│       ├── values.staging.yaml
│       ├── values.production.yaml
│       └── /templates
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── configmap.yaml
│           ├── secret.yaml               # References external secrets
│           ├── hpa.yaml
│           └── pdb.yaml
├── .gitlab-ci.yml
├── Cargo.toml
├── Cargo.lock
└── Makefile
```

## Components

### Ingestion Pipeline
Swiftide pipeline stages:
1. **Enrich**: Load full KnowledgeObject from store, validate schema
2. **Deduplicate**: Check `knowledge_key + version` — skip if already indexed
3. **Version Check**: Archive old version if newer version exists
4. **Chunk**: Split content into overlapping segments (configurable: fixed-size, section-based, time-windowed for metrics)
5. **Embed**: Call embedding provider via OpenAI-compatible API
6. **Store**: Upsert KnowledgeChunks into Qdrant collection `knowledge_objects`

### Triggered by go-task-orbit
- kbase-api publishes tasks to `knowledge.sync` / `connector.sync` topics via Redis Streams transport
- kbase-flow-swiftide polls Redis Streams via go-task-orbit consumer (Go library via cgo, or HTTP wrapper)
- Task payload is lightweight: `{task, knowledge_key, source, source_id, version}` — worker loads full KnowledgeObject from store
- go-task-orbit handles: retries, DLQ, idempotency, bounded concurrency
- **Local dev**: go-task-orbit InMemory transport (no Redis needed)

### Qdrant Collection
- Collection name: `knowledge_objects`
- Points indexed by `chunk_id` (UUID per chunk)
- Payload schema mirrors `KnowledgeChunk` struct
- Indexed on: `source`, `type`, `status`, `namespace`, `knowledge_key`, `version`, `effective`, `expires`

### Chunking Strategy
- **Metrics data**: Time-windowed chunks (e.g., monthly buckets)
- **Document data**: Section-based (headers, paragraphs)
- **Configurable**: `CHUNK_SIZE`, `CHUNK_OVERLAP` env vars

## Configuration
| Env Var | Default | Purpose |
|---------|---------|---------|
| FLOW_PORT | 8081 | Internal HTTP/gRPC port |
| FLOW_QDRANT_HOST | localhost | Qdrant host |
| FLOW_QDRANT_PORT | 6334 | Qdrant port |
| FLOW_EMBEDDING_PROVIDER | openai | Embedding provider: `openai` (MVP), `ollama` |
| FLOW_EMBEDDING_API_KEY | — | API key for embedding provider |
| FLOW_EMBEDDING_MODEL | text-embedding-3-small | Embedding model |
| FLOW_EMBEDDING_BASE_URL | — | Override endpoint (e.g. https://api.openai.com/v1) |
| FLOW_CHUNK_SIZE | 512 | Tokens per chunk |
| FLOW_CHUNK_OVERLAP | 128 | Overlap between chunks |
| FLOW_ORBIT_TRANSPORT | memory | Transport: `memory` (dev), `redisstreams` (staging/prod) |
| FLOW_ORBIT_REDIS_URL | localhost:6379 | Redis URL for Redis Streams |
| FLOW_ORBIT_TOPICS | knowledge.sync,connector.sync | Comma-separated topics to subscribe |

## Normalizer Layer
- Converts raw `KnowledgeObject` JSON (from go-task-orbit task payload) into structured text suitable for chunking
- Prepares metadata tags (source, type, version) for Qdrant payload
- Strategy: extract `content` field, enrich with `source` + `type` prefix for semantic context
- Example: `"[Metabase] [metrics] Q2 claims increased 18%..."`

## Local Dev Setup

Root `docker-compose.yml` in the repository root orchestrates all services.
See [company-memory-plan](/specs/company-memory-plan/) for the full compose file.

Key env vars for this service:
```
FLOW_QDRANT_HOST=qdrant
FLOW_ORBIT_TRANSPORT=memory
FLOW_EMBEDDING_PROVIDER=openai
FLOW_EMBEDDING_API_KEY=sk-dev-key
```

Run: `docker compose up --build -d`

## Deployment (AWS)

### Helm Chart Structure

```yaml
# values.yaml — defaults
replicaCount: 1

image:
  repository: registry.example.com/kbase-flow-swiftide
  tag: latest
  pullPolicy: IfNotPresent

env:
  FLOW_PORT: "8081"
  FLOW_QDRANT_HOST: "qdrant"
  FLOW_QDRANT_PORT: "6334"
  FLOW_EMBEDDING_PROVIDER: "openai"
  FLOW_EMBEDDING_MODEL: "text-embedding-3-small"
  FLOW_CHUNK_SIZE: "512"
  FLOW_CHUNK_OVERLAP: "128"
  FLOW_ORBIT_TRANSPORT: "redisstreams"
  FLOW_ORBIT_REDIS_URL: "redis-master:6379"
  FLOW_ORBIT_TOPICS: "knowledge.sync,connector.sync"

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

```yaml
# values.staging.yaml
replicaCount: 1
image:
  tag: staging-latest
resources:
  requests:
    cpu: 250m
    memory: 512Mi
```

```yaml
# values.production.yaml
replicaCount: 1
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 2Gi
```

### Secrets (External — Post-Dev)
Secrets managed via External Secrets Operator + AWS Secrets Manager, same pattern as kbase-api.

### Health Probes
```yaml
# templates/deployment.yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8081
  initialDelaySeconds: 15
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /readyz
    port: 8081
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Deployment Commands
```bash
# Staging
helm upgrade --install kbase-flow-swiftide ./deploy/helm_chart \
  -f ./deploy/helm_chart/values.yaml \
  -f ./deploy/helm_chart/values.staging.yaml \
  --namespace kbase-staging \
  --set image.tag=$(git rev-parse --short HEAD)

# Production
helm upgrade --install kbase-flow-swiftide ./deploy/helm_chart \
  -f ./deploy/helm_chart/values.yaml \
  -f ./deploy/helm_chart/values.production.yaml \
  --namespace kbase-production \
  --set image.tag=$(git rev-parse --short HEAD)
```

## Cross-Repo Contract
- **KnowledgeObject schema**: Vendored protobuf definitions from `kbase-api/proto/`
- **Qdrant**: Shared `knowledge_objects` collection — kbase-flow-swiftide writes, kbase-api reads
- **go-task-orbit topics**: kbase-api publishes to `knowledge.sync` / `connector.sync`. kbase-flow-swiftide consumes via Redis Streams.
- **Task payload**: Lightweight `{task, knowledge_key, source, source_id, version}` — worker loads full state.
- **go-task-orbit guarantees**: retries, DLQ, idempotency, bounded concurrency.
