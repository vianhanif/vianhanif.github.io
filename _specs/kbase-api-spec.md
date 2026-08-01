---
layout: page
title: kbase-api — Implementation Spec
permalink: /specs/kbase-api-spec/
---

## Overview
Go service that provides the external-facing API, scheduler, connector orchestration, and Context Builder for the Organizational Context Engine.

## KnowledgeObject Schema

### Go Struct
```go
type ObjectType string

const (
    ObjectTypeBusiness       ObjectType = "business"
    ObjectTypeTechnical      ObjectType = "technical"
    ObjectTypeMetrics        ObjectType = "metrics"
    ObjectTypeConversation   ObjectType = "conversation"
)

type Status string

const (
    StatusActive   Status = "active"
    StatusArchived Status = "archived"
)

type KnowledgeObject struct {
    KnowledgeKey string            `json:"knowledge_key"`     // stable identifier: "claim-policy"
    ID           string            `json:"id"`                // UUID (unique per version)
    Namespace    string            `json:"namespace"`          // "engineering", "finance", "legal"
    Content      string            `json:"content"`
    Source       string            `json:"source"`
    SourceID     string            `json:"source_id"`
    Type         ObjectType        `json:"type"`
    Metadata     map[string]any    `json:"metadata"`
    Version      int               `json:"version"`
    Effective    string            `json:"effective"`
    Expires      *string           `json:"expires,omitempty"`
    Status       Status            `json:"status"`
    CreatedAt    string            `json:"created_at"`
    UpdatedAt    string            `json:"updated_at"`
}

type KnowledgeChunk struct {
    ChunkID      string            `json:"chunk_id"`           // UUID
    KnowledgeKey string            `json:"knowledge_key"`      // parent stable ident
    KnowledgeID  string            `json:"knowledge_id"`       // parent KnowledgeObject UUID
    ChunkIndex   int               `json:"chunk_index"`        // ordering within parent
    Content      string            `json:"content"`
    TokenCount   int               `json:"token_count"`
    Embedding    []float32         `json:"embedding,omitempty"`
    Namespace    string            `json:"namespace"`
    Source       string            `json:"source"`
    Type         ObjectType        `json:"type"`
    Version      int               `json:"version"`
}
```

### Task Payload (orbit Task)

Published to the transport as JSON. `MessageReceipt` is internal-only
(not serialized). Worker fetches full object from the store via the
object endpoint.

```json
{
  "topic": "knowledge.sync",
  "sync_id": "sync-uuid",
  "source_id": "dashboard:claims-001",
  "object_type": "knowledge",
  "version": 3
}
```

## Tech Stack
- **Language**: Go 1.24+
- **HTTP Router**: chi v5
- **Qdrant Client**: `qdrant/go-client`
- **Embedding / Completion**: Abstract `EmbeddingProvider` / `CompletionProvider` interfaces. MVP via OpenAI-compatible API.
- **HTTP Client**: `net/http` (stdlib) for Metabase REST API calls
- **Task Bus**: Internal `orbit` package. Supports three transports: `memory` (in-process dev), `redis` (Redis Streams), `sqs` (Floci.io or AWS SQS).
- **Redis Client**: `redis/go-redis` v9 (for Redis Streams transport)
- **SQS Client**: `github.com/aws/aws-sdk-go-v2/service/sqs` (for SQS transport)
- **Config**: env-based via stdlib `os`
- **sql-dock**: Internal Go module at `internal/dock/`. Thin DB abstraction wrapping `database/sql` with driver switching (sqlite, postgres, mysql) and auto-migrations.

## Directory Structure
```text
/kbase-api
├── /cmd
│   └── /server            # Main binary
├── /internal
│   ├── /api               # HTTP handlers, middleware, routes
│   │   ├── /handler       # Request handlers
│   │   │   ├── context.go      # GET /context, GET /search
│   │   │   ├── health.go       # GET /healthz, GET /readyz
│   │   │   ├── orbit.go       # Orbit task endpoints (internal)
│   │   │   ├── orbit_object.go # Orbit object endpoint (internal)
│   │   │   ├── search.go       # GET /search (raw Qdrant results)
│   │   │   └── sources.go      # POST/GET /sources, POST /sources/{id}/sync
│   │   ├── /middleware    # Auth (X-API-Key + Bearer), logging
│   │   └── /router        # Route definitions
│   ├── /connectors        # Source implementations
│   │   ├── connector.go   # Interface: Pull, Watch, Capabilities, Health
│   │   └── metabase.go    # Metabase Connector (REST API)
│   ├── /contextbuilder    # Rank → Merge → Group → Truncate → StructuredContext
│   ├── /renderer          # StructuredContext → LLM synthesis
│   ├── /pipeline          # Ingestion: marshal KnowledgeObject, store payload, publish task
│   ├── /orbit             # Task bus — memory / Redis Streams / SQS transport
│   │   ├── bus.go         # TasksProvider interface, InMemoryBus, RedisStreamsBus, SQSBus
│   │   └── sqs.go         # SQSBus: Publish, ReceiveTasks, AckTask, CreateQueue
│   ├── /scheduler         # Cron-based sync triggers
│   ├── /qdrant            # Qdrant gRPC client wrapper
│   ├── /models            # KnowledgeObject, KnowledgeChunk, DTOs, Task
│   ├── /embeddings        # EmbeddingProvider interface + OpenAI impl
│   ├── /config            # Env parsing, config struct
│   ├── /dock              # DB abstraction: driver switching, auto-migrations
│   │   └── /migrations    # 001_init.sql, 002_add_payload.sql
│   └── /store             # Typed store impl (Source, SyncState repos)
├── /deploy
│   ├── Dockerfile         # Multi-stage: golang builder + alpine runtime
│   └── Dockerfile         # (legacy /helm_chart removed)
├── .gitlab-ci.yml
├── go.mod
├── go.sum
└── Makefile
```

## Components

### REST API
- **Sources**: Register, list, trigger sync, check status
- **Context**: GET /context?q=... — synthesized understanding via Context Builder
- **Search**: GET /search?q=... — raw Qdrant results (debugging)
- **Knowledge**: GET/DELETE /knowledge/{id}, POST /reindex

### Connectors
- Connector interface defined in `internal/connectors/connector.go` (ETL-style: Pull, Watch, Checkpoint, Capabilities, Health)
- MVP: Metabase Connector queries Metabase REST API (API key auth)
- `Pull()` for full sync; `Watch()` for incremental later

### Context Builder + Renderer
- Context Builder (provider-agnostic): Rank → Merge → Group → Truncate → StructuredContext
- StructuredContext: {Topic, Sources[], Timeline[], Facts[], Policies[], Metrics[]}
- Renderer (provider-specific): StructuredContext → LLM prompt → synthesis
- Renderer supports OpenAI first; interfaces enable Claude, Gemini, Ollama later
- Queries Qdrant via gRPC, feeds results through stages

### Scheduler & Task Runtime
- Cron-based (embedded cron)
- Every interval triggers `Watch()` on registered connectors
- Publishes sync tasks to the orbit task bus (configurable transport)
- Task payload stored as JSON in `sync_state.payload` for worker retrieval
- Transport modes:
  - `memory` (default): in-process ring buffer — no external deps
  - `redis`: Redis Streams — durable across restarts
  - `sqs`: Floci.io or AWS SQS — for AWS deployment target
- Sync status and source registrations stored in SQLite

### Internal Orbit Endpoints
Used by kbase-flow-swiftide to consume tasks from the bus:

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /internal/orbit/tasks | Poll pending tasks (returns list + receipt handles) |
| POST   | /internal/orbit/tasks/ack | Acknowledge tasks (delete from SQS) |
| POST   | /internal/orbit/queues | Create a named queue |
| GET    | /internal/orbit/objects/{sync_id} | Fetch stored KnowledgeObject JSON |

## Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST   | /sources | Register a connector |
| GET    | /sources | List sources |
| POST   | /sources/{id}/sync | Trigger sync |
| GET    | /sources/{id}/status | Sync status |
| GET    | /context?q=...&namespace=... | Synthesized context |
| GET    | /search?q=...&namespace=... | Raw search results |
| GET    | /knowledge/{id} | Retrieve KnowledgeObject |
| DELETE | /knowledge/{id} | Delete |
| POST   | /reindex | Full re-index |
| GET    | /healthz | Liveness probe |
| GET    | /readyz  | Readiness probe |

## Configuration
| Env Var | Default | Purpose |
|---------|---------|---------|
| KBASE_PORT | 8080 | HTTP listen port |
| KBASE_QDRANT_HOST | localhost | Qdrant gRPC host |
| KBASE_QDRANT_PORT | 6334 | Qdrant gRPC port |
| KBASE_EMBEDDING_PROVIDER | openai | Embedding provider: `openai` |
| KBASE_EMBEDDING_API_KEY | — | API key for embedding provider |
| KBASE_EMBEDDING_MODEL | text-embedding-3-small | Embedding model |
| KBASE_EMBEDDING_BASE_URL | — | Override endpoint (e.g. https://api.openai.com/v1) |
| KBASE_COMPLETION_PROVIDER | openai | Completion provider: `openai` |
| KBASE_COMPLETION_API_KEY | — | API key for completion provider |
| KBASE_COMPLETION_MODEL | gpt-4o-mini | Model for context synthesis |
| KBASE_COMPLETION_BASE_URL | — | Override endpoint |
| KBASE_METABASE_API_URL | — | Metabase instance base URL |
| KBASE_METABASE_USERNAME | — | Metabase login username |
| KBASE_METABASE_PASSWORD | — | Metabase login password |
| KBASE_METABASE_API_KEY | — | Metabase API key |
| KBASE_SCHEDULE_INTERVAL | 60m | Sync interval |
| KBASE_ORBIT_TRANSPORT | memory | Transport: `memory`, `redis`, `sqs` |
| KBASE_ORBIT_REDIS_URL | redis:6379 | Redis URL for Redis Streams transport |
| KBASE_ORBIT_SQS_ENDPOINT | http://floci:4566 | SQS endpoint (Floci or AWS) |
| KBASE_ORBIT_SQS_SOURCE_URL | — | Pre-created SQS queue URL (omit to auto-create) |
| KBASE_ORBIT_SQS_SOURCE_REGION | us-east-1 | AWS region |
| KBASE_ORBIT_SQS_SOURCE_KEY | — | AWS access key |
| KBASE_ORBIT_SQS_SOURCE_SECRET | — | AWS secret key |
| KBASE_ORBIT_BUFFER_SIZE | 1024 | Ring buffer size |
| KBASE_ORBIT_CONCURRENCY | 10 | Worker pool size |
| KBASE_DB_DRIVER | sqlite | DB backend: `sqlite`, `postgres`, `mysql` |
| KBASE_DB_DSN | /data/kbase.db | Connection string or file path |
| KBASE_API_KEY | — | API key for auth (X-API-Key / Bearer) |

## Hybrid Search
- **MVP**: Pure vector search via Qdrant cosine similarity
- **Post-MVP**: Add keyword (BM25) and metadata filters (`source`, `type`, `status`, `effective` range)
- **Reranker**: Cross-encoder or LLM-based scoring for result refinement
- Qdrant supports all three natively via payload filters + sparse vectors

## sql-dock (`internal/dock`)
```go
package dock

// DB wraps *sql.DB with driver switching + auto-migrations.
type DB struct {
    db *sql.DB
    driver string
}

func New(driver, dsn string) (*DB, error)  // Opens connection, runs migrations
func (db *DB) Exec(ctx context.Context, query string, args ...any) (sql.Result, error)
func (db *DB) Query(ctx context.Context, query string, args ...any) (*sql.Rows, error)
func (db *DB) QueryRow(ctx context.Context, query string, args ...any) *sql.Row
func (db *DB) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error)
func (db *DB) Driver() string
func (db *DB) Close() error
```

Drivers: `sqlite` (modernc.org/sqlite, no CGO), `postgres`, `mysql`.

Migrations live in `internal/dock/migrations/*.sql`, auto-run on startup.
Portable SQL patterns live in `internal/store/` — see that package for
per-driver upsert logic.

## Local Dev Setup

Root `docker-compose.yml` in the repository root orchestrates all services.
Floci.io emulates SQS locally — set `KBASE_ORBIT_TRANSPORT=sqs` to use it.

Key env vars for this service:
```
KBASE_DB_DRIVER=sqlite
KBASE_DB_DSN=/data/kbase.db
KBASE_QDRANT_HOST=qdrant
KBASE_ORBIT_TRANSPORT=memory   # or sqs (Floci/AWS)
KBASE_ORBIT_SQS_ENDPOINT=http://floci:4566
KBASE_API_KEY=dev-api-key
KBASE_METABASE_API_URL=https://reporting-testing.tapinsure.io
KBASE_METABASE_USERNAME=...
KBASE_METABASE_PASSWORD=...
KBASE_EMBEDDING_PROVIDER=openai
KBASE_EMBEDDING_API_KEY=sk-...
KBASE_EMBEDDING_BASE_URL=https://9router.vianhanif.link/v1
KBASE_EMBEDDING_MODEL=jina-ai/jina-embeddings-v3
KBASE_COMPLETION_PROVIDER=openai
KBASE_COMPLETION_API_KEY=sk-...
KBASE_COMPLETION_MODEL=General
KBASE_COMPLETION_BASE_URL=https://9router.vianhanif.link/v1
```

Run: `docker compose up --build -d`

## Deployment (AWS)

### Helm Chart Structure

```yaml
# values.yaml — defaults (safe to commit)
replicaCount: 1

image:
  repository: registry.example.com/kbase-api
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

env:
  KBASE_PORT: "8080"
  KBASE_QDRANT_HOST: "qdrant"
  KBASE_QDRANT_PORT: "6334"
  KBASE_EMBEDDING_PROVIDER: "openai"
  KBASE_EMBEDDING_MODEL: "text-embedding-3-small"
  KBASE_COMPLETION_PROVIDER: "openai"
  KBASE_COMPLETION_MODEL: "gpt-4o-mini"
  KBASE_SCHEDULE_INTERVAL: "60m"
  KBASE_ORBIT_TRANSPORT: "redis"
  KBASE_ORBIT_REDIS_URL: "redis-master:6379"
  KBASE_ORBIT_BUFFER_SIZE: "1024"
  KBASE_ORBIT_CONCURRENCY: "10"
```

```yaml
# values.staging.yaml — staging overrides
replicaCount: 1
image:
  tag: staging-latest
resources:
  requests:
    cpu: 250m
    memory: 512Mi
env:
  KBASE_ORBIT_TRANSPORT: "redisstreams"
  KBASE_ORBIT_REDIS_URL: "redis-staging:6379"

persistence:
  enabled: true
  size: 1Gi
```

```yaml
# values.production.yaml — production overrides
replicaCount: 1
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi

persistence:
  enabled: true
  size: 5Gi
```

### Secrets (External — AWS Secrets Manager)

Secrets are NOT stored in values files. Post-dev, use External Secrets Operator:

```yaml
# helm_chart/templates/secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: kbase-api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: kbase-api-secrets
    creationPolicy: Owner
  data:
    - secretKey: KBASE_API_KEY
      remoteRef:
        key: kbase-api/production
        property: api_key
    - secretKey: KBASE_EMBEDDING_API_KEY
      remoteRef:
        key: kbase-api/production
        property: embedding_api_key
    - secretKey: KBASE_COMPLETION_API_KEY
      remoteRef:
        key: kbase-api/production
        property: completion_api_key
    - secretKey: KBASE_METABASE_API_KEY
      remoteRef:
        key: metabase/production
        property: api_key
```

### Kubernetes Manifests

```yaml
# templates/deployment.yaml — health probes, resource limits, SQLite volume
spec:
  containers:
    - name: kbase-api
      volumeMounts:
        - name: data
          mountPath: /data
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 15
      readinessProbe:
        httpGet:
          path: /readyz
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: kbase-api-data
```

```yaml
# templates/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kbase-api-data
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: {{ .Values.persistence.size | default "1Gi" }}

### Deployment Commands
```bash
# Staging
helm upgrade --install kbase-api ./deploy/helm_chart \
  -f ./deploy/helm_chart/values.yaml \
  -f ./deploy/helm_chart/values.staging.yaml \
  --namespace kbase-staging \
  --set image.tag=$(git rev-parse --short HEAD)

# Production
helm upgrade --install kbase-api ./deploy/helm_chart \
  -f ./deploy/helm_chart/values.yaml \
  -f ./deploy/helm_chart/values.production.yaml \
  --namespace kbase-production \
  --set image.tag=$(git rev-parse --short HEAD)
```

## Cross-Repo Contract
- **KnowledgeObject schema**: Defined as Go structs in `kbase-api/internal/models/types.go`. kbase-flow-swiftide mirrors the same types in `kbase-flow-swiftide/src/models/mod.rs` with compatible JSON field tags.
- **Qdrant collection**: `knowledge_objects` — points indexed by `chunk_id`. kbase-api reads; kbase-flow-swiftide writes.
- **Orbit task bus**: kbase-api publishes to `knowledge.sync` / `connector.sync` queues. kbase-flow-swiftide polls via HTTP endpoints.
- **Orbit internal API** (kbase-api → kbase-flow-swiftide):
  - kbase-api stores KnowledgeObject JSON in `sync_state.payload` during sync
  - kbase-flow-swiftide polls `GET /internal/orbit/tasks` for pending tasks
  - kbase-flow-swiftide fetches full object via `GET /internal/orbit/objects/{sync_id}`
  - kbase-flow-swiftide acks via `POST /internal/orbit/tasks/ack` (receipt handle from poll)
- **Task payload**: `{topic, sync_id, source_id, object_type, version}` — worker fetches full object from orbit object endpoint.
- **Transport modes**: `memory` (dev, no deps), `redis` (Redis Streams, durable), `sqs` (Floci.io or AWS, for AWS deployment).
