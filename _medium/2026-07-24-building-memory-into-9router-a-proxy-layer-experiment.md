---
title: "Building Memory Into 9router: A Proxy-Layer Experiment"
date: 2026-07-24
linked_posts:
  - /posts/building-memory-into-9router-a-proxy-layer-experiment/
status: draft
---

# Medium Prep

## Content to Copy

Every coding AI I tried was great at problems, terrible at context. I'd start a new session and describe my stack, my preferences, my ongoing projects — everything the AI needed to be useful. Next session, same thing. The agents were smart. They just had no idea who I was. 

LLMs are stateless by design, and for a daily coding partner, that's exhausting. I'd been managing context manually — pasting summaries, referencing past decisions, re-explaining my setup. The AI could solve hard problems but couldn't remember I'd already tried option A last Tuesday and ruled it out. I wanted memory that followed me across tools, across sessions, without each tool needing to implement it separately.

That's when I noticed the layer underneath everything: a local proxy. 9router sits between my tools and the LLM APIs, handling every request. If memory lived at the proxy layer, none of my tools would need to change — they'd just start remembering.

I built it: key-prefix detection for each tool, two memory pools (MEMORY for project facts, USER for preferences), markdown file storage, and a clean injection/extraction cycle. The plumbing was solid.

But the first thing my system chose to store was itself. A self-referential time capsule of how the memory system worked, sitting where real project context was meant to grow. The pipeline wasn't broken. It just hadn't seen real work yet.

The real challenge was closing the feedback loop — getting the LLM to reliably write back its own memories. Extraction markers, escalation fallbacks, dedup guards, a state tracker to catch silent failures. Each bug taught me something.

Today the pipeline works, the bugs are fixed, and the wrong content is being replaced session by session. The most honest version of this story is that building LLM memory isn't just storing data — it's defining what counts as context. The wrong content taught me that. And it's already being replaced.

[→ Full story: https://vianhanif.link/posts/building-memory-into-9router-a-proxy-layer-experiment/]

## Tags for Medium
llm, memory, 9router, developer-tools, technical

## Publish Timing
→ Blog: July 21, 2026
→ Medium: D-0
→ LinkedIn: D+1

## Notes
- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
