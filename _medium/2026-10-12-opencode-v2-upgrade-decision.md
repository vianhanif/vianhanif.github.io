---
layout: page
title: "OpenCode V2: Deciding to Upgrade and the Journey There"
date: 2026-10-12
linked_posts:
  - /posts/opencode-v2-upgrade-decision/
  - /posts/saving-opencode-sessions-after-laptop-swap/
status: draft
---

# Medium Prep

## Content to Copy

OpenCode published V2 with almost no fanfare — a single banner on their docs homepage. As someone who's been running V1 across multiple machines and workspaces for months, I didn't just upgrade on impulse. I asked the question worth asking first: *what actually changes, and is it worth the migration?*

The biggest structural shift is that V2 runs one shared background service per user account. In V1, every `opencode` invocation started fresh — discovering config, scanning the project, initializing state. In V2, that server persists, and every client connects to it. Sessions, configuration, permissions, and tool execution all live in one place. You can see it with `opencode service status`, which prints the local URL it's listening on.

The second change is the session store. V2 adds a `session_v2` table next to a new `project` table that tracks the worktree. That matters because session management has been my recurring pain point. I've written twice now about recovering sessions after environment changes — first after a laptop swap, then chasing three more failure modes when V2's schema shifted underneath me. V1 bound sessions to exact paths and project IDs, so any change orphaned data. V2's worktree-aware model is far more resilient, and session `list`/`export`/`import` are now first-class commands rather than afterthoughts.

→ Full story: https://vianhanif.link/posts/opencode-v2-upgrade-decision/

On speed, I want to be careful. The TUI feels faster to open than I remember, but I never measured a V1 baseline, so I won't claim a number I can't back up. What I can measure is the current binary: `time opencode --version` returns around 0.08 seconds. That's a single cold figure, not a comparison. The reason it *should* be faster is architectural — a persistent service means later clients skip the discovery-and-init work V1 repeated on every start.

The migration itself is unglamorous and low-risk if you respect one rule: back up first. Snapshot `~/.local/state/opencode` and `~/.local/share/opencode`, dump a session list for reference, then confirm what you're running with `opencode --version`. The docs are blunt that V1 and V2 can't coexist under the `opencode` command, so you're replacing, not running both. Install V2, start the service, verify your sessions landed in `session_v2`, and test the core workflows. If anything is off, the earlier recovery posts cover the failure modes I hit.

The verdict: if you rely on session history or work across machines, V2 is a clear win. If your V1 setup is happy and stable, you can wait — but the ecosystem momentum is V2-first now, so not forever.

## Tags for Medium
opencode, developer-tools, sqlite, technical, migration

## Publish Timing
→ Blog series: October 12 → October 21, 2026
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources
- [OpenCode Intro](https://opencode.ai/docs/)
- [OpenCode V2 Getting Started](https://opencode.ai/v2/docs/)
- [OpenCode V2 CLI Reference](https://opencode.ai/v2/docs/cli/)
- [SQLite `SELECT` statement](https://www.sqlite.org/lang_select.html)
