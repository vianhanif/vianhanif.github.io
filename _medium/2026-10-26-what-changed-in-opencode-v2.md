---
layout: page
title: "What Changed in OpenCode V2"
date: 2026-10-26
linked_posts:
  - /posts/what-changed-in-opencode-v2/
  - /posts/opencode-v2-upgrade-decision/
status: draft
---

# Medium Prep

## Content to Copy

Most technical writing about OpenCode V2 leads with the feature list. This is the plain-language version.

Imagine a drive-through. You order, the kitchen builds the whole meal from scratch, and you leave. Next customer: the kitchen tears down and rebuilds. V1 was like that — every `opencode` command started from zero, packing away your session.

Now imagine your own workshop. The bench still has yesterday's half-finished shelf. The tools are on the pegboard. The coffee is still warm. You walk in, pick up where you stopped, and nothing gets packed away when you leave.

V2 is the workshop. One background server runs for you automatically, and it remembers which folder you were working in — not just the path, but the git worktree. When your directory changes or you move to a new machine, the session reconnects itself rather than getting orphaned.

Sessions are portable: `opencode session export <ID> > file.json` on one machine, `opencode session import file.json` on another, and you're back where you started.

The provider system is flexible. You don't have to use Anthropic or OpenAI. Point your config at a custom endpoint or a local model, and OpenCode talks to it — no reinstall, just a JSON block with your address and credentials. For me that meant wiring it to my own [routing proxy](https://vianhanif.link/posts/what-i-changed-in-9router/). One character wrong in the config string and OpenCode silently picks the wrong backend — [I traced that bug for two days](https://vianhanif.link/posts/opencode-v2-provider-traps/).

For bigger setups: you get different agents with different permissions (read-only builders, builders who can edit), skills that load on-demand, MCP servers that talk to external systems, LSP diagnostics fed back to the agent, and the option to run it from the web or script it over HTTP. None of that breaks if you ignore it.

But the core story is this: the server stays open, your work is where you left it, and you pick the provider. Everything else is optional elaboration on that shape.

→ Full story: https://vianhanif.link/posts/what-changed-in-opencode-v2/

## Tags for Medium
opencode, developer-tools, technical, architecture, explainer

## Publish Timing
→ Blog: October 26, 2026
→ Medium: D-0 (same day as blog)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1
- [ ] This is original Medium content
- [ ] Ensure all links use full HTTPS URLs
- [ ] This post is designed to be accessible to non-OpenCode users; front-load the analogy

## Sources
- [OpenCode CLI reference](https://opencode.ai/docs/cli)
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode providers](https://opencode.ai/docs/providers)
