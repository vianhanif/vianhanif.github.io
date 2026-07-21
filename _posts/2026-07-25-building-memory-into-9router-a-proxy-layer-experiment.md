---
title: "Building Memory Into 9router: A Proxy-Layer Experiment"
date: 2026-07-25
tags: [llm, memory, 9router, tooling]
layout: post
---

Every coding AI I tried was great at problems, terrible at context.

I'd start a new session and describe my stack, my preferences, my ongoing projects — everything the AI needed to be useful. Next session, same thing. The agents were smart. They just had no idea who I was.

## The Clean Slate Tax

LLMs are stateless by design. Each conversation is a clean slate. For chatbots, that's fine. For daily coding partners, it's exhausting.

I managed context manually for months — pasting summaries, referencing past decisions, re-explaining my setup. The AI could solve hard problems but couldn't remember I'd already tried option A last Tuesday and ruled it out.

Other people had noticed this. [Hermes Agent](https://github.com/nousresearch/hermes-agent) — an experimental memory layer from Nous Research — used bounded files, character limits, and system prompt injection to give LLMs persistent context. Clean design, but Hermes was built for one specific editor. I wanted memory that followed me across tools, across sessions, without each tool needing to implement it separately.

That's when I noticed the layer underneath everything.

9router is a local proxy I run on my machine. Every LLM request from every tool — Warp, OpenCode, whatever I'm using — routes through it before reaching the API. If memory lived inside the proxy, none of the tools would need to change. They'd just start remembering.

## The Proxy Layer

If memory lived at the proxy layer, it would work across all of them without any tool knowing. They'd just... remember.

I opened a design doc and started sketching.

The core idea was simple:
1. Detect which tool was calling via API key prefix
2. Load that tool's memory file on every request
3. Inject it as a system message
4. Extract new memories after each response

Storage was straightforward — markdown files in `~/.9router/memory/{pool}/`. Two pools: MEMORY for project facts and decisions, USER for personal preferences and communication style. Simple. Clean.

Tool detection worked through the API key itself. Each tool was configured with a distinct API key prefix — Warp used one, OpenCode another. When a request arrived at 9router, it checked the key prefix, resolved it to the right pool, and loaded that pool's memory file. No changes needed in any tool.

I broke it into modules — pool detection, storage, injection, deduplication, extraction, tool interface — each testable in isolation.

## The Mental Shift
The difference for the LLM after memory injection is subtle but total — here's what I'm aiming for:

*   **Before:** Each session starts with a blank slate. The LLM is a talented stranger that knows the library docs but nothing about *my* specific implementation choices or past mistakes. I'm the primary context provider.
*   **After (aspirational):** Every request is pre-hydrated with `MEMORY.md` and `USER.md`. The LLM behaves like a partner who's been here the whole time — it knows my preferences, remembers past decisions, and picks up where we left off.

## When the LLM Ignored My Extraction Markers

Then came the bugs. The kind where you stare at logs and realise the LLM is silently ignoring your instructions.

**Bug one: the pipeline wasn't wired.** I'd assembled all the pieces — loader, injector, extractor — but forgot to connect injector to the request handler. The memory loaded into a variable that was never used. The entire pipeline looked operational and was doing nothing.

Once I traced the dangling reference, the fix was a single assignment. Logs confirmed load, inject, extract — all green.

**Bug two: green didn't mean working.** The logs showed extraction markers being injected, but the LLM kept responding helpfully without ever including `MEMORY_SUGGEST:` in its replies. Not defiance. The instructions weren't forceful enough for the model's default helpfulness to let extraction win.

I added a fallback: after 5 consecutive extraction failures, escalate to stronger language. "You MUST extract memories using the specified format." Extraction started succeeding after the escalation kicked in.

But why 5? Pure guess. I skimmed a few conversations, saw extraction typically failed or succeeded within that window, and picked a number. It could be 3. It could be 8. I've added a metric to track how often escalation triggers per session — once I have data, I'll tune it properly.

**Bug three: the tool-self-injection loop.** Combo-routing aggregates multiple API keys and models into a single endpoint — useful, but every request through agent-mode injected a `store_memory` tool definition. When combo-routing sent the same request through multiple models, the duplicate declarations triggered a **provider cascade** (tiered fallback from expensive to cheap models), blasting through each before failing silently. The state tracker showed 17 consecutive misses before I caught it. A dedup guard fixed the loop; an expanded state tracker now records cumulative stats, making the next failure visible before it compounds.

## The Wrong Content

The pipeline worked. 79 tests passed. Load, inject, extract — all green. The problem wasn't the plumbing. It was what the system chose to store.

When I peeked at the stored content, it was a self-referential time capsule. Documentation of the memory system itself — sitting where project context was meant to grow. Same for `USER.md`: preferences about nothing.

"the stored memory is likely from early code testing only." That was generous. The pipeline wasn't broken. It just stored the wrong things — it had only seen development traffic: test prompts, debug logs, configuration checkers. Of course it stored nothing useful about my actual projects. It had never been used for actual work.

This isn't free. Every request now carries a memory payload, which means every response consumes context window budget for memory injection. I'm tracking token usage on the memory file — currently ~500 tokens loaded per session, roughly 0.4% of a 128K context window. Negligible for now, but if it grows beyond a comfortable margin, I'll add a sliding window that keeps only the most recent and most referenced entries.


## The Path Forward

As of today, the system is in active testing. The duplicate tool declaration is fixed, the cascade is stable, and the state tracker is climbing with actual successful stores. The wrong content is being replaced with real project context, session by session.

**The tradeoff:** All memory lives on my machine in plain markdown files under `~/.9router/memory/`. No encryption at rest. No sync across machines. For my single-machine local-tools workflow, that's acceptable — the risk surface is my laptop, which is already the attack vector for everything else. For a team deployment or multi-device setup, this would need proper secrets management and remote storage. I've noted the gap but haven't solved it yet.

The wrong content isn't permanent. It's what happens when you build a memory system before you've given it real memories to store. Now I'm using it for actual work, and the entries are accumulating — session by session, real project context replacing the self-referential content. The pipeline works, the bugs are dead, and the tracker is climbing.

The most honest version of this story isn't about failure. It's about discovering that building LLM memory isn't just storing data — it's defining what counts as context. The wrong content taught me that. And it's already being replaced.

**The PR** is at [https://github.com/vianhanif/9router/pull/8](https://github.com/vianhanif/9router/pull/8) — still open while I validate the behavior in production-like use before merging.

---

### Sources
- [Hermes Agent — Nous Research](https://github.com/nousresearch/hermes-agent)
- [Warp — Agentic Development Environment](https://github.com/warpdotdev/warp)
- [OpenCode — AI Coding Agent](https://github.com/anomalyco/opencode)
- [9router — my fork](https://github.com/vianhanif/9router)
- [Memory middleware PR #8](https://github.com/vianhanif/9router/pull/8)
