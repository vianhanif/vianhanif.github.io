---
title: "How I Used AI Agents As My Editorial Pipeline"
date: 2026-09-28
tags: [agents, writing, workflow, ade]
layout: page
---

Two drafts. One tried to squeeze six months of tooling decisions into a single 3,000-word post — Copilot, OpenCode, 9router, Warp — and collapsed under the weight. The other was a flat walkthrough of a tunnel setup that never explained why anyone should care. Both had strong material buried under structural problems. I ran them through an AI editorial pipeline.

## Phase 1: The Lead Agent Review

I asked a Warp agent to read both posts. Not "is this good" — a real critique. Line-level. Structural. Places where arguments skipped steps.

The lead agent flagged the monorepo post: "Episode 3 is doing three things at once — OpenCode history, why OpenCode failed, and why Warp won. Separate these." For the tunnel post: "Narrative arc is flat. Middle is just steps."

That review gave me a map of what was wrong. Not how to fix it. Just what.

## Phase 2: Iterative Revision with Child Agents

I deployed two child agents (sub-agents spawned from the lead) to rewrite from the critique. One wrote a replacement section about 1am debugging during a production incident. Read it back. Caught itself. The story was plausible but fabricated — generated to fill a structural gap. The agent replaced it with the actual incident from the source document. This happened multiple times. The pipeline was: draft → critique → rewrite → self-review → corrected rewrite.

The revised drafts weren't just better structured. They were accurate — grounded in what actually happened, not what filled the narrative gap.

## Phase 3: Cold-Read Reviews

The anchor post about my ADE came back restructured into 10 sections instead of the 4 I'd written. The agent had split every paragraph into its own heading — technically more "structured" but completely unreadable. I discarded that version and kept the original structure, just tightening the prose. The rest was noise, but that one bad result taught me to filter suggestions instead of applying them.

The good calls came from two fresh agents I brought in to read the output without context. "The tunnel post reads like a tutorial until paragraph 4, then shifts to first person. Pick a lane." "The monorepo post promises six episodes but delivers three. Rename or add the rest."

The revisions had fixed internal logic but created new tonal inconsistencies. Back to work.

## Phase 4: Restructuring into a 9-Post Series

I ran a content map agent that mapped every section to a reading order and flagged duplicates — four paragraphs doing double duty across what should be distinct posts. Five posts had content gaps. The map flagged exactly what was missing, guiding the final write-pass.

## Phase 5: Execution

I dispatched one child agent per post, each pulling from the content map and source drafts. The lead agent integrated results, flagged overlaps, and ensured the final series sounded like it came from a single author, not nine different bots.

## The Pipeline Eats Its Own Tail

I ran this draft through the same pipeline. One cold-read scored it 95%. Another gave it 70%. The gap itself was the diagnosis — the story read clean on the surface but lacked the texture of its own failures. Three more review rounds later, I'd added the fabricated-story catch in Phase 2 and the discarded 10-section restructure in Phase 3 — concrete moments that prove the pipeline isn't magic. The agents didn't write any of those. They told me where drafts were missing. I filled the gaps.

I packaged the pipeline into a reusable skill at `~/.agents/writer/`. Next time I need to write, I type `/writer`. The same structure — research, draft, cold-read, iterate, sign-off — runs without rebuilding the process from scratch. The process became the product.

## The Insight

The AI wasn't my ghostwriter. It was my editorial team. I had the raw content — my own experience, my own stories. The AI didn't write them. It asked the right questions about them. Review → revise → review → restructure. Each phase used a different agent configuration, but I was the one making the calls — what to keep, what to cut, where the structure still needed work. I didn't use AI to write faster. I used it to write more deliberately. I swapped the "before" of my original draft (which rambled for 3,000 words about AI tooling) with the "after" of a 9-part series where each post has a single, sharp focus. 

## The Series

This post is about how I restructured two drafts into a 9-part series covering the full arc of building my custom ADE:

1. **[Why I Left GitHub Copilot](/posts/why-i-left-github-copilot/)** — The privacy problem that started everything
2. **[Warp Tried to Sell Me AI Again](/posts/warp-tried-to-sell-me-ai/)** — The subscription wall
3. **[OpenCode: The $10/mo TUI](/posts/opencode-ten-bucks/)** — Finding a tool that fit the budget
4. **[The Tools I Built Around OpenCode](/posts/tools-i-built-around-opencode/)** — Building the gaps closed
5. **[The Router My Colleague Showed Me](/posts/the-router-my-colleague-showed-me/)** — Discovering 9router
6. **[What I Changed in 9router](/posts/what-i-changed-in-9router/)** — Forking and customizing the router
7. **[The Tunnel](/posts/the-tunnel/)** — Making local AI reachable from the internet
8. **[Warp Came Back Around](/posts/warp-came-back-around/)** — The platform caught up
9. **[This Is My ADE](/posts/this-is-my-ade/)** — The anchor post

---

**Sources referenced across the series:** [OpenCode Go documentation](https://opencode.ai/docs/go/) ($10/month, $60/month usage budget) · [Warp pricing page](https://www.warp.dev/pricing) (Free plan includes BYOK) · [9router upstream README](https://github.com/decolua/9router) (RTK 20-40% token savings)
