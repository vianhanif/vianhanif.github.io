---
title: "Two Weeks With Structured Memory: What Happened After I Replaced Flat Files With SQLite"
date: 2026-08-18
tags: [llm, memory, 9router, tooling, follow-up]
layout: post
---

Three weeks ago I [published a post about building memory into 9router](/2026/07/25/building-memory-into-9router-a-proxy-layer-experiment.html). The system worked — load, inject, extract — but I already knew it wasn't going to stay that way.

The flat files had problems. Not theoretical problems. Problems I could see in my own `MEMORY.md` after two weeks of actual use: a wall of unrelated facts, half of them from sessions I'd forgotten, no way to tell which ones still mattered.

This post is what happened next.

## The Flat File Wall

The original design was simple on purpose. `MEMORY.md` for project facts, `USER.md` for preferences. Entries separated by `§`. Character limits enforced by truncation. Jaccard dedup to avoid exact repeats.

It worked for the first week. Then the content started turning against itself.

**Problem one: noise.** Every request carried the full memory payload — all 38 entries, including the ones from three weeks ago about a Jekyll theme I'd since abandoned and a Docker configuration I'd deleted. The LLM was reading all of it. Most of it was irrelevant to whatever I was actually working on.

**Problem two: lossy truncation.** When `MEMORY.md` hit its 2200-character limit, `appendEntry()` just sliced the string at the limit. Which entries survived depended on insertion order. Important decisions got cut mid-sentence because some trivial observation happened to be written first.

**Problem three: no agency.** The LLM could store memories (via `store_memory` tool or `MEMORY_SUGGEST` markers) but couldn't read them individually, search for a specific one, update a stale one, or delete a wrong one. It got the entire file dumped into context whether it needed all of it or not. That's not memory — that's an information firehose.

**Problem four: no categories.** Everything lived at the same priority level. "User prefers concise bullet-point responses" sat next to "Updated blog post draft with reviewer feedback." Both consumed the same context budget. One of them matters for every conversation. The other matters for exactly one.

I spent a Saturday sketching the upgrade on paper before touching code.

## The Upgrade: SQLite, Categories, Confidence

The core change was replacing the flat markdown files with SQLite. Not because I wanted a database — because the queries the memory system needed weren't expressible as string slicing.

### Schema

```sql
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  pool TEXT NOT NULL,
  type TEXT NOT NULL,       -- MEMORY or USER
  category TEXT,            -- preference, person, environment, project, decision, gotcha
  content TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  created_at TEXT,
  updated_at TEXT,
  last_referenced TEXT,
  reference_count INTEGER DEFAULT 0,
  is_confirmed INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0
);
```

The schema was the easy part. The design decisions were harder.

### Two-Tier Injection

Instead of dumping everything, I split injection into two tiers:

**Tier 1** (always injected, ~400 chars): User preferences + high-confidence recently-referenced facts. This replaces the full `MEMORY.md` dump. It's curated, not comprehensive.

**Tier 2** (on-demand via tools): Five new tools the LLM can call when it needs to look something up: `memory_search`, `memory_update`, `memory_delete`, `memory_list`, `memory_refresh`. The LLM asks for what it needs instead of receiving everything whether it wants it or not.

The shift is subtle but important. Before, the LLM was a passive recipient of context. Now it's an active manager of its own knowledge base.

### The Proxy-Side Tool Execution Problem

Here's where I hit the most interesting engineering problem.

`store_memory` already worked as a side effect — the LLM called it, the proxy stored the entry, the LLM didn't need a result. But `memory_search` is different. The LLM calls it, needs to *see the results*, and then use those results in its next response.

The proxy isn't supposed to have opinions about tool execution. Its job is to forward requests and responses. But if I forwarded the `memory_search` tool call to the actual LLM API, the LLM would get a tool call with no result to process — because the proxy hadn't run the search yet.

The solution: the proxy intercepts memory tool calls, executes them locally against SQLite, formats the results as tool response messages, appends them to the conversation, and lets the LLM continue naturally. The LLM sees tool results as if they'd come from the API. The client never sees the memory tool exchange — it only sees the final response.

```
LLM calls memory_search("9router architecture")
  ↓
Proxy detects: memory tool call
  ↓
Executes: FTS5 search against SQLite
  ↓
Formats: "Found 3 results: [id:abc] 9router uses SQLite for..."
  ↓
Appends tool result to messages
  ↓
LLM continues with search results as context
```

No second API call. No special client handling. The proxy becomes a transparent tool executor for its own tools while passing through everything else.

The implementation lives in a new `toolExecutor.js` that sits between the stream-complete hook and the extraction pipeline. It checks if the tool call is a memory tool, handles it locally, and returns a formatted result. Non-memory tools pass through untouched.

### Confidence Decay

Every memory entry has a confidence score. When the LLM uses a memory (via `memory_search` or `memory_refresh`), confidence bumps up. When it doesn't, confidence decays.

```
confidence *= 0.95 ^ days_since_last_reference
```

After enough decay, entries below 0.3 get archived — no longer injected in Tier 1, no longer returned in search results. They're still in the database for forensic purposes but invisible to the LLM.

This handles staleness without any manual cleanup. Memories that matter get reinforced by use. Memories that don't fade out.

### Auto-Categorization

Every stored entry gets classified at write time. The algorithm is simple keyword scoring:

- "prefers concise responses" → `preference` (matches "prefer", "style")
- "9router uses Express" → `project` (matches "project", "uses", "framework")
- "Docker daemon crashed on M1" → `gotcha` (matches "crashed", "bug")

If confidence is low, the entry gets stored with `category = NULL` and the LLM can classify it later via `memory_update`.

Categories feed the Tier 1 algorithm: `preference` and `person` entries are always injected. `environment` and `project` are injected if recently referenced. `decision` and `gotcha` are Tier 2 only — available on demand but not pushed into every conversation.

## Two Weeks of Real Use: What Actually Happened

I deployed the upgrade on August 4th. Used it daily across Warp, OpenCode, and a few CLI sessions through my proxy. Here's what I observed.

### Week One: The Honeymoon

The first few sessions felt like magic. The LLM knew my stack without me explaining it. It remembered I'd ruled out Prisma for the data-service project and why. It didn't repeat suggestions I'd already rejected.

Tier 1 injection was noticeably better than the old full-dump. With ~400 chars of curated context instead of ~3000 chars of everything, the LLM seemed more focused. I can't prove this rigorously — it's a feeling — but the conversations felt less like "here's everything I know, good luck filtering" and more like "here's what matters, ask if you need more."

The `store_memory` tool got heavy use. The LLM was actively storing entries with correct categories about 80% of the time. The other 20% I fixed with `memory_update` or let auto-categorization handle on re-read.

### Week Two: The Edge Cases

Then things got interesting.

**Observation one: the LLM over-searches.** In the first week, the agent called `memory_search` for almost every question, even trivial ones. "What's the user's shell?" → calls `memory_search("shell")`. That's a Tier 1 entry already in context. The search returned the same entry the LLM was already looking at.

I added a note in the Tier 1 injection message: "These facts are already in your context. Only use memory_search when you need facts NOT listed above." Over-searching dropped by maybe half.

**Observation two: confidence decay works, but too aggressively for some entries.** A `gotcha` about a Docker networking bug on macOS faded to 0.4 after 10 days of no reference. Then I hit the same bug again, searched for it, and the entry was barely above archive threshold. The fix: `decision` and `gotcha` categories decay slower (0.98 instead of 0.95). They're rare but valuable when needed.

**Observation three: consolidation is worth the complexity.** After about 15 entries, the consolidation job kicked in. It sent all entries to a cheap model (gpt-4.1-nano) with a "merge related facts, remove stale ones" prompt. The result: 15 entries became 11. Three entries about my blog workflow got merged into one. A duplicated "user prefers concise responses" entry got folded. The consolidated set was genuinely better than the raw set.

Cost of consolidation: one nano-model call per pool when entry count exceeds 20. About $0.001 per consolidation. Negligible.

**Observation four: the proxy tool loop is fragile in one specific way.** If the LLM calls `memory_search`, gets results, and then calls `memory_search` again in the same turn — the proxy handles both. But if it calls `memory_search` three times in a row (sometimes it does this for different queries), the proxy executes all three. That's fine. The problem was when the LLM got stuck in a loop: search → no results → search again with slightly different terms → no results → search again. I added a guard: max 3 memory tool iterations per request. If the LLM hits the limit, the proxy returns the last result set with a note: "No more memory searches this turn. Use what you have."

**Observation five: dual-write kept me honest.** Twice in two weeks, the SQLite file got corrupted (probably from an unclean shutdown during a write). Each time, the flat file backup was intact. I wrote a quick recovery script that re-imported from the flat file. The dual-write strategy — which I'd added as a "just in case" — actually saved me.

### The Numbers

After 14 days of daily use across 3 tools:

| Metric | Before (flat files) | After (SQLite) |
|--------|---------------------|-----------------|
| Avg entries per pool | 38 (no decay) | 14 (with decay + consolidation) |
| Avg Tier 1 chars injected | ~2800 | ~380 |
| Extractions per session | 1.2 (mostly wrong) | 2.8 (categorized, deduped) |
| Stale entries (manually flagged) | 12 of 38 (32%) | 0 of 14 (archived automatically) |
| Token cost per request (memory) | ~700 tokens | ~95 tokens (Tier 1 only) |
| Tool calls per session (memory) | 0 (no tools beyond store) | 4.1 (search, refresh, update) |

The token reduction alone was worth the migration. 700 tokens → 95 tokens for the same (actually better) context coverage.

## What I'd Do Differently

Hindsight is expensive. Here's what I'd change if I were starting over:

1. **Start with SQLite.** The flat file prototype was fast to build but the migration cost more than building SQLite from the start would have. The migration script, the dual-write logic, the backwards compatibility — all unnecessary if I'd started structured.

2. **Categories from day one.** The keyword scoring isn't perfect but it's good enough. Having categories from the start would have made the Tier 1 algorithm work immediately instead of needing a restructure.

3. **Confidence decay is non-negotiable.** Without it, the memory system becomes a junk drawer. Decay is what turns storage into actual memory.

4. **The proxy-side tool execution pattern is more useful than I expected.** I built it for memory tools but the same pattern works for any proxy-internal tool. I'm already thinking about what else the proxy could handle transparently — rate limit introspection, request caching, usage analytics.

## The Honest Takeaway

Memory for LLMs isn't a solved problem. It's barely a started problem. What I've built isn't a general-purpose memory layer — it's a personal memory system that runs on my machine, for my tools, with my API keys. It's not encrypted at rest. It doesn't sync across devices. It won't scale beyond one user.

But it works. And "works" is doing a lot of heavy lifting in that sentence.

The system remembered that I use zsh on macOS. It remembered I'd tried and rejected three different approaches to the data-service database layer. It remembered that I prefer direct feedback over praise. It remembered things I'd forgotten myself — like the fact that I'd configured Warp to use a specific model for agent orchestration, and then forgotten and reconfigured it, and the memory system was the only record of the original choice.

The LLM didn't have amnesia anymore. Neither did I.

The PR for the upgrade is still in progress — I'm running it daily and finding edge cases. The flat-file system served its purpose. It proved the concept. The SQLite system is what I'll actually use.

---

### Timeline

- **July 25:** [Published the original post](/2026/07/25/building-memory-into-9router-a-proxy-layer-experiment.html) about the flat-file memory system
- **August 1-3:** Designed and implemented the SQLite upgrade (schema, tools, decay, consolidation)
- **August 4-17:** Daily use across Warp, OpenCode, and CLI sessions. This post documents what happened.
- **August 18:** This post. The system is working. Still finding edge cases. Still improving.

### Sources
- [Part 1: Building Memory Into 9router](/2026/07/25/building-memory-into-9router-a-proxy-layer-experiment.html)
- [9router — my fork](https://github.com/vianhanif/9router)
- [Hermes Agent — Nous Research](https://github.com/nousresearch/hermes-agent)
- [Memory middleware PR #8](https://github.com/vianhanif/9router/pull/8)
