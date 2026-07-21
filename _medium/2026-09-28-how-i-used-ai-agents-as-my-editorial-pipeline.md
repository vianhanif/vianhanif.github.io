---
title: "How I Used AI Agents As My Editorial Pipeline"
date: 2026-09-28
linked_posts:
  - /posts/how-i-used-ai-agents-as-my-editorial-pipeline/
  - /posts/this-is-my-ade/
  - /posts/tools-i-built-around-opencode/
status: draft
---

# Medium Prep

## Content to Copy

I had two drafts with strong material and structural problems. I told the AI what I wanted to write about — my own experience, my own stories — and asked it to shape them into a proper narrative.

It couldn't.

The output was technically correct but structurally hollow. The arguments skipped steps. The narrative arc was flat. The tone shifted mid-paragraph. I had the content. The AI had the format. Neither could do the other's job.

That's when I stopped treating AI as a ghostwriter and started treating it as an editorial process.

The difference is subtle but critical. I didn't ask the AI to write. I asked it to critique, audit, map, and flag — then I filled the gaps it identified.

- A lead agent flagged where my argument skipped steps.
- Child agents rewrote from the critique, then self-audited their own output (catching a fabricated story and replacing it with the real incident).
- Fresh agents cold-read the result and caught tonal shifts I couldn't see.
- A content map agent flagged four paragraphs doing double duty across distinct posts.

No single agent produced a publishable post. The pipeline as a whole did — because each round taught me something about my own writing I wouldn't have noticed on my own.

The process became the product. I packaged the pipeline into a reusable skill invocable via `/writer` — the same structure, ready for any future draft. And it's replicable for any future writing, not just this one series.

If you want the full breakdown — the specific prompts, the failure anecdotes, the pipeline eating its own tail: [How I Used AI Agents As My Editorial Pipeline](https://vianhanif.link/posts/how-i-used-ai-agents-as-my-editorial-pipeline/).

If you're more interested in the stack behind it — the routing, the tunnel, the agent orchestration — that's the series itself: [Why I Left GitHub Copilot](https://vianhanif.link/posts/why-i-left-github-copilot/).

## Tags for Medium
ai-agents, writing, developer-tools, ai, technical-writing, automation

## Publish Timing
→ Blog: Sep 28, 2026 (D-0)
→ Medium: Sep 28, 2026 (same day, linked with canonical URL to blog)
→ LinkedIn: Sep 29, 2026 (D+1)

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for Sep 29 (D+1)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling/narrative content often performs well behind paywall

## Sources (link these inline when posting)

- OpenCode Go docs ($10/mo, $60/mo usage budget): https://opencode.ai/docs/go/
- Warp pricing (Free plan includes BYOK): https://www.warp.dev/pricing
- 9router upstream README (RTK 20-40% token savings): https://github.com/decolua/9router
