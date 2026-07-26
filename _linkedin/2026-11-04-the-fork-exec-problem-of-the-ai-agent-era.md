---
title: "LinkedIn teaser — The Fork+Exec Problem of the AI Agent Era"
date: 2026-11-04
tags: [linkedin, ade]
topic_group: ade
---

Every AI coding agent reimplements PTY management: spawn shell, detect prompt, stream output. It's the `fork+exec` problem of the agent era — every app that needed process isolation reimplemented container primitives until Docker standardized it as shared infrastructure.

We need the same for terminal sessions. Not tmux (human-facing, race conditions on `send-keys`). Not expect (line-oriented, breaks on ncurses). Not yet another `node-pty` wrapper.

The concrete cost: 8 minutes lost watching an agent fail at `git rebase -i` because it couldn't participate in a TUI session.

I wrote about why a dedicated PTY service is the answer, what structured events look like, and why honest tradeoffs beat over-promising. Full post → [link]

#AI #DevTools #Agents #Terminal #Infrastructure
