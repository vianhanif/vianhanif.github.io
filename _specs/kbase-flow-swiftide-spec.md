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
- **Custom pipeline** — no Swiftide dependency. Core pipeline stages: Normalizer → Enricher → Embedder → QdrantSink.
- **Vector DB Client**: `qdrant-client` via REST
- **Embedding**: `async-openai` + custom `reqwest` HTTP client. `Embedder` trait supports OpenAI and mock implementations.
- **Task Consumer**: Polls kbase-api via `reqwest` HTTP client. No Redis Streams dependency.
- **Config**: env-based via `std::env`

## Directory Structure
```text
/kbase-flow-swiftide
├── /src
│   ├── main.rs             # Entrypoint: health server, dispatch by FLOW_ORBIT_TRANSPORT
│   ├── /pipeline           # Custom pipeline (no Swiftide)
│   │   ├── mod.rs         # Pipeline runner
│   │   ├── normalizer.rs  # KnowledgeObject → Chunk (chunking, overlap)
│   │   ├── enricher.rs    # Schema validation, deduplication, version checks
│   │   └── qdrant_sink.rs # Upsert chunks to Qdrant collection
│   ├── /consumer           # Task consumer
│   │   ├── mod.rs         # Transport-agnostic consumer trait
│   │   └── sqs.rs         # SQSConsumer: poll /internal/orbit/tasks, ack via receipt handle
│   ├── embeddings.rs       # Embedder trait + OpenAIEmbedder / MockEmbedder impl
│   └── models.rs          # KnowledgeObject, KnowledgeChunk, OrbitTask, Version types
├── /deploy
│   └── Dockerfile          # Multi-stage: Rust builder + debian-slim runtime
├── .env.example
├── Cargo.toml
└── Makefile
```

## Components

### Ingestion Pipeline
Custom Rust pipeline stages (no Swiftide dependency):
1. **Fetch**: Worker polls `GET /internal/orbit/tasks` from kbase-api, fetches full object via `GET /internal/orbit/objects/{sync_id}`
2. **Normalize**: Parse JSON into `KnowledgeObject`, split content into overlapping `KnowledgeChunk`s
3. **Enrich**: Validate schema, check `knowledge_key + version` for dedup, version-reconcile
4. **Embed**: Call embedding provider via `OpenAIEmbedder` (or `MockEmbedder`)
5. **Store**: Upsert `KnowledgeChunk`s into Qdrant collection `knowledge_objects`
6. **Ack**: Send `POST /internal/orbit/tasks/ack` with receipt handle (deletes from SQS)

### Triggered by orbit task bus
- kbase-api stores KnowledgeObject JSON in `sync_state.payload`, publishes task to the configured transport
- kbase-flow-swiftide polls `GET /internal/orbit/tasks` (HTTP) — no direct Redis or SQS dependency
- Task payload: `{topic, sync_id, source_id, object_type, version}` — worker fetches full object from orbit object endpoint
- Worker processes, then acks via `POST /internal/orbit/tasks/ack` with receipt handle

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
| FLOW_PORT | 8081 | HTTP health server port |
| FLOW_QDRANT_HOST | localhost | Qdrant REST API host |
| FLOW_QDRANT_PORT | 6333 | Qdrant REST API port |
| FLOW_EMBEDDING_PROVIDER | openai | Embedding provider: `openai` |
| FLOW_EMBEDDING_API_KEY | — | API key for embedding provider |
| FLOW_EMBEDDING_MODEL | text-embedding-3-small | Embedding model |
| FLOW_EMBEDDING_BASE_URL | — | Override endpoint (e.g. https://api.openai.com/v1) |
| FLOW_CHUNK_SIZE | 512 | Characters per chunk |
| FLOW_CHUNK_OVERLAP | 128 | Overlap between chunks |
| FLOW_ORBIT_TRANSPORT | memory | Transport: `memory`, `sqs` |
| KBASE_API_URL | http://kbase-api:8080 | kbase-api base URL for orbit polling |
| FLOW_ORBIT_TOPICS | knowledge.sync,connector.sync | Comma-separated topics (informational) |

## Normalizer Layer
- Parses `KnowledgeObject` JSON from orbit object endpoint into typed Rust structs
- Splits `content` into overlapping text chunks
- Embeds chunks via `OpenAIEmbedder` (or `MockEmbedder`)
- Prepares metadata tags (source, type, version) for Qdrant payload
- Example: `"[Metabase] [metrics] Q2 claims increased 18%..."`

## Local Dev Setup

Root `docker-compose.yml` in the repository root orchestrates all services.
Set `KBASE_API_URL=http://kbase-api:8080` so Rust can poll orbit endpoints.

Key env vars for this service:
```
FLOW_QDRANT_HOST=qdrant
FLOW_QDRANT_PORT=6333
FLOW_ORBIT_TRANSPORT=memory   # or sqs
KBASE_API_URL=http://kbase-api:8080
FLOW_EMBEDDING_PROVIDER=openai
FLOW_EMBEDDING_API_KEY=sk-...
FLOW_EMBEDDING_BASE_URL=https://9router.vianhanif.link/v1
FLOW_EMBEDDING_MODEL=jina-ai/jina-embeddings-v3
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
  FLOW_QDRANT_PORT: "6333"
  FLOW_EMBEDDING_PROVIDER: "openai"
  FLOW_EMBEDDING_MODEL: "text-embedding-3-small"
  FLOW_CHUNK_SIZE: "512"
  FLOW_CHUNK_OVERLAP: "128"
  FLOW_ORBIT_TRANSPORT: "sqs"
  KBASE_API_URL: "http://kbase-api:8080"
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
- **KnowledgeObject schema**: Mirrors Go structs from `kbase-api/internal/models/types.go` with compatible JSON field tags (`object_type`, `Version` enum accepting int or string).
- **Qdrant**: Shared `knowledge_objects` collection — kbase-flow-swiftide writes via REST, kbase-api reads.
- **Orbit internal API**: kbase-flow-swiftide polls `GET /internal/orbit/tasks`, fetches objects via `GET /internal/orbit/objects/{sync_id}`, acks via `POST /internal/orbit/tasks/ack`.
- **Task payload**: `{topic, sync_id, source_id, object_type, version}` — worker fetches full object from orbit object endpoint.
- **Transport**: kbase-api owns the bus (memory / redis / sqs). kbase-flow-swiftide only talks HTTP to kbase-api.
