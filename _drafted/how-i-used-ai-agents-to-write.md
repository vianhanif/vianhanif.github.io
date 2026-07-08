---
title: "How I Used AI Agents to Write These Blog Posts"
---

Two drafts. Both had good material buried under structural problems. One was too long — six episodes in 3,000 words. The other needed to stand alone. I ran them through an AI editorial pipeline.

## Phase 1: The Lead Agent Review

I asked a Warp agent to read both posts. Not "is this good" — a real critique. Line-level. Structural. Places where arguments skipped steps.

The lead agent flagged the monorepo post: "Episode 3 is doing three things at once — OpenCode history, why OpenCode failed, and why Warp won. Separate these." For the tunnel post: "Narrative arc is flat. Middle is just steps."

That review gave me a map of what was wrong. Not how to fix it. Just what.

## Phase 2: Iterative Revision with Child Agents

Two child agents rewrote from the critique. One wrote a replacement section about 1am debugging during a production incident. Read it back. Caught itself. The story was plausible but fabricated — generated to fill a structural gap. The agent replaced it with the actual incident from the source document. This happened multiple times. The pipeline was: draft → critique → rewrite → self-review → corrected rewrite.

The revised drafts weren't just better structured. They were honest.

## Phase 3: Cold-Read Reviews

Two fresh agents read the output without context. "The tunnel post reads like a tutorial until paragraph 4, then shifts to first person. Pick a lane." "The monorepo post promises six episodes but delivers three. Rename or add the rest."

The revisions had fixed internal logic but created new tonal inconsistencies. Back to work.

## Phase 4: Restructuring into a 9-Post Series

A content map agent mapped every section to a reading order and flagged duplicates — four paragraphs doing double duty across what should be distinct posts. The result:

1. Why I Left GitHub Copilot
2. Warp Tried to Sell Me AI Again
3. OpenCode: The $10/mo TUI
4. The Tools I Built Around OpenCode
5. The Router My Colleague Showed Me
6. What I Changed in 9router
7. The Tunnel
8. Warp Came Back Around
9. This Is My ADE

Five posts had content gaps. The map flagged exactly what was missing.

## Phase 5: Parallel Execution

One child agent per post, each pulling from the content map and source drafts. The lead agent integrated results and flagged overlaps.

## The Insight

The AI wasn't a writing assistant. It was an editorial pipeline. Review → revise → review → restructure. Each phase used a different agent configuration. I didn't use AI to write faster. I used it to think more carefully about what I was saying.

## The Meta Twist

This post was written by an AI agent documenting its own process. The tool that helped me restructure my writing helped me describe how it helped me restructure my writing. I don't find this recursive. I find it useful.

---
