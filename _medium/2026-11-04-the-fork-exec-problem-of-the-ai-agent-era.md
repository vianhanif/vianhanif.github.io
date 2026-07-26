---
title: "Medium prep — The Fork+Exec Problem of the AI Agent Era"
date: 2026-11-04
tags: [medium, ade]
topic_group: ade
---

**Every AI Coding Agent Is Reimplementing Terminal Management. We Need Shared Infrastructure.**

Every AI coding agent today independently reimplements PTY runtime: spawn a shell session, detect the prompt, stream output, handle input. It's wasteful and blocks progress on what agents should actually do — write code, not fight with zsh prompt detection.

I call this the `fork+exec` problem of the AI agent era. Before Docker, every application that needed process isolation reimplemented container primitives. Docker provided it as shared infrastructure, and the ecosystem converged. PTY allocation and shell management is the same kind of problem for agents.

The concrete failure that drove this home: an agent running `git rebase -i HEAD~3` got confused when vim opened in the TUI, timed out, and cost me 8 minutes of context-switching to a separate terminal. Not a model intelligence problem — a runtime integration problem.

Existing tools like `tmux`, `expect`, and `script` solve adjacent problems but none provide structured, machine-readable terminal access for automated agents. `tmux send-keys` is a race condition. `expect` is line-oriented. `script` is capture-only.

Four projects — `ptyai` (TypeScript), `hty` (Zig), `PiloTY` (Python), `agent-tui` (Rust) — have converged on the same primitives independently. Claude Code has an open issue for PTY support. Codex merged streaming + TTY support in March 2026. The demand is real.

A library won't solve it — a library ties session lifecycle to agent lifecycle. A network service decouples the two: the session outlives any single agent. I'm building a minimal Go-based server (creack/pty) with structured event streaming (length-prefixed NDJSON over TCP) and a bubbletea TUI debug interface. v1 is localhost-only, one session per connection, honest about its tradeoffs.

If you're rewriting node-pty wrappers for the fifth time, let's collaborate on a shared spec. [inline link to blog post] [link to project repository]
