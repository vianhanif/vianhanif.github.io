---
title: "The Fork+Exec Problem of the AI Agent Era"
date: 2026-11-04
tags: [ade, technical, personal, pty, orchestration]
---

Every AI coding agent is currently repeating the same mistake. They all independently reimplement PTY runtime — process lifecycle, prompt detection, session persistence.

I call it the `fork+exec` problem of the AI agent era. Before containers, every application that needed process isolation either reimplemented container primitives or went without. Docker provided it as shared infrastructure so apps no longer managed their own sandboxing. The parallel is exact: PTY allocation and shell management is the `fork+exec` of agent infrastructure. We need an equivalent standard.

Some will say: just use `tmux` or `expect` or `script`. Those tools solve different problems. `tmux` is a terminal multiplexer built for humans — its `send-keys` is a race condition when an agent needs output-driven coordination. `expect` is line-oriented and breaks on full-screen ncurses apps. `script` captures output but offers no input injection or session persistence. These tools are complementary and sufficient for many workflows — the gap appears when an automated agent needs structured, machine-readable access to the same terminal session.

### The concrete failure

Last month I watched an agent try to run `git rebase -i HEAD~3`. It emitted the rebase file, waited for the editor to open, got confused when vim took over the terminal, and timed out. I alt-tabbed to a separate terminal, completed the rebase manually, and pasted the result. Total time lost: 8 minutes of context-switching plus re-running commands the agent had already executed. The agent had no awareness of what happened in the interactive session — it couldn't detect or participate in a full-screen TUI.

This isn't a model intelligence problem — it's a runtime integration problem. A PTY service could expose events the agent reacts to without parsing ANSI escape sequences by hand.

### The ecosystem evidence

The ecosystem is already building toward this, though without coordination. A handful of early projects — `ptyai` (TypeScript), `hty` (Zig), `PiloTY` (Python), `agent-tui` (Rust) — have independently converged on the same primitives: spawn a session, write input, read output, resize, kill. Each came from a different team with a different stack, yet the tools they expose are nearly identical. That convergence is a signal worth watching.

But these are early projects (under 50 stars each as of October 2026), and their API surfaces diverge meaningfully. `hty` uses wait-for-text/regex primitives; `PiloTY` infers terminal state ("running", "ready", "password"); `agent-tui` builds a screen DOM with stable refs. The convergence is directional, not settled — exactly why a protocol discussion is timely.

Claude Code has an open issue requesting PTY support for interactive shells. Codex merged streaming and TTY support in March 2026. The demand is real and growing.

### Why a PTY service and not a library?

A library still ties session lifecycle to agent lifecycle. If the agent crashes, the pty dies with it. A network service decouples the two: the session outlives any single agent, and a replacement agent can re-attach. It also enables shared access — multiple agents watching the same session for live pair debugging or audit. A library is the right answer for single-process embedding; a service is the right answer for agent infrastructure.

### Structured events

I use "structured events" loosely — not full CQRS/ES, but more structured than raw byte firehose. The PTY service streams discrete events. Here's what the rebase scenario would look like:

```json
{"type": "output", "data": "\u001b[?1049h"}
{"type": "app_entered_alternate_screen"}
{"type": "output", "data": "pick abc1234 fix login bug\npick def5678 add tests\n"}
{"type": "editor_opened", "data": "vim"}
{"type": "prompt", "data": "$ ", "detected_by": "server_heuristic"}
{"type": "exit", "code": 0}
```

Prompt detection is server-side and heuristics-based — the server infers terminal state from output patterns. For v1, an opt-in shell marker will improve reliability. The key: agents consume typed, structured events instead of fighting with character streams and regex.

The transport is initially NDJSON over TCP with length-prefixed frames to handle TCP fragmentation — every streaming protocol has this problem, and NDJSON is no exception. WebSocket and stdio transports are planned.

### The challenge, honestly

I won't pretend this is straightforward. Prompt detection at PTY boundaries is genuinely hard — shell prompts vary across shells, users, and configurations; ANSI escape sequences overlap with data; partial output chunks can split at any byte boundary. Security is a real concern: a network-accessible PTY service is a shell injection vector by design. Cross-platform support across macOS (`forkpty`), Linux (`/dev/ptmx`), and Windows (ConPTY) adds significant surface area.

For v1 I'm sidestepping most of these: localhost-only (no auth), a single session per connection, heuristic prompt detection with an opt-in shell marker for reliability. The tradeoffs are explicit — this is an infrastructure experiment, not a production service.

### The vision: PTY as shared infrastructure

What if AI agents didn't need to know how to allocate a pseudo-terminal? What if they could just ask a dedicated, agent-agnostic PTY service to manage the shell runtime for them?

**Agent-agnostic** — doesn't care if it's serving Claude Code, a Codex agent, or an OpenCode runner.
**Session survivability** — if the agent crashes, the session keeps running. Reconnect a new agent where you left off.
**Audit trails** — verifiable logs of every command run, with full output and timing data.
**Protocol standardization** — a shared wire format so every agent doesn't reimplement its own.

### The demo

I'm starting with a minimal, demo-able version. A Go-based server (using `creack/pty`) manages a shell session and streams events to TCP clients. The companion is a TUI debugging interface (using `bubbletea`) — a human-facing tool for visualizing the event stream, not the agent-facing client. v1 runs locally, handles one session at a time, and is immediately useful in my local ADE.

The goal isn't to replace the agent, but to provide a reliable "neuromuscular system" so it can focus on planning and coding — not on fighting with zsh prompt detection.

If you're building agent runtime infrastructure or find yourself rewriting `node-pty` wrappers for the fifth time, I'd like to collaborate on a shared spec. The architecture plan and ongoing work are documented in the [project repository](https://github.com/vianhanif/pty-service). Contributions, critique, and use-case input are all welcome.

***

**Sources:**
- [creack/pty](https://github.com/creack/pty)
- [Bubbletea TUI](https://github.com/charmbracelet/bubbletea)
- [ptyai — PTY MCP server](https://github.com/xdrr/ptyai)
- [PiloTY — Python PTY MCP server](https://github.com/yiwenlu66/PiloTY)
- [hty — Headless terminal in Zig](https://github.com/LatentEvals/hty)
- [agent-tui — Structured terminal access for agents](https://www.c1.ai/engineering/agent-tui-structured-terminal-access-for-ai-agents)
- [Claude Code issue #9881 — PTY feature request](https://github.com/anthropics/claude-code/issues/9881) (open, interactive shell support)
- [Codex PR #13640 — streaming + TTY support](https://github.com/openai/codex/pull/13640) (merged March 2026)
