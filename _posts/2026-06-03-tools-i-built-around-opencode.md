---
title: "The Tools I Built Around OpenCode"
date: 2026-06-03
tags: [opencode, tooling, automation, delegate]
---

I was three levels deep in an OpenCode session when I realized the tool wasn't going to grow with me. The agent had generated a database migration, a backend endpoint, and a React component — three tasks that needed sequential handoff. OpenCode handled each one fine in isolation. But moving results between them required me to copy, paste, and re-prompt. Every single time.

I built four tools that month. Not because I wanted to. Because I had to.

**opencode-tree** came first. It created isolated git worktrees with dedicated tmux sessions — each project got its own workspace, dependencies, and terminal layout. The theory was clean: keep projects separate so agents don't cross-contaminate. In practice, it meant naming tmux sessions, remembering window layouts, and managing panes. The isolation worked. The cognitive overhead didn't. I abandoned it after two weeks. The relief of deleting that code was immediate.

**opencode-environment-bootstrap** solved the opposite problem: starting from zero. I'm a tech lead at work with three team members. Every time someone joined or we added a new tool, I'd walk them through the same setup — install this, clone that, configure these credentials. The bootstrap script automated the entire handoff. A single `curl | bash` provisioned a complete workstation with repos cloned, dependencies installed, SSH keys generated, OpenCode pre-configured. I could send one link in Slack and they'd be ready in five minutes. Standardizing the team environment meant fewer surprises when code ran differently on different machines. This one survived the cull — it's still in my toolchain today, updated with every new tool we adopt.

The main event was **`/delegate`**.

```
/delegate
@planner design auth system migration
@result @coder implement auth changes
@coder implement billing changes
@result @reviewer review both
@result @tester run integration tests
```

Six agent types — planner, coder, reviewer, tester, analyzer, brain — with dependency chaining via `@result` and per-agent model overrides. The execution flow parsed annotations, built a dependency graph, fanned out independent tasks, collected results, injected them into downstream agents. Four explicit confirmations before any subagent launched. I was paranoid about runaway agents and I was right to be.

The first time I ran a four-agent chain and watched it complete without intervention, I felt relief I hadn't expected. The system worked. It was janky, bolt-on, and held together by annotation parsing, but it worked.

I also built a **session-viewer** — a timeline renderer for OpenCode conversations. It showed agent actions, file changes, provider switches, token consumption per step. Useful for debugging why an agent went off course. Purely diagnostic. It told me what happened after the fact. It couldn't shape the flow.

All four tools were bolt-on solutions. They worked, but they hit hard limits.

The TUI wall was the first. OpenCode's full-screen interface meant every time I wanted to delegate, I left my shell behind. Terminal. OpenCode. Terminal. A context switch with every delegation.

The sequential chain was worse. `/delegate` could fan out work, but once a subagent finished, the parent had exactly one shot to process the result. No re-iteration. No asking for clarification. The flow was emit, receive, continue. Linearity baked into the architecture.

And there was no native orchestration. The DAG execution was emulated — a graph I built and traversed inside a custom command handler. No lifecycle management. No inter-agent messaging. No shared state that survived the transaction.

I lived with these walls for months. The ecosystem proved something important: multi-agent orchestration was possible, and it was powerful. But it also proved the tool I was building on needed fundamental changes I couldn't make from the outside. I wrote more about the TUI wall and the cost tradeoffs in [OpenCode: The $10/mo TUI](/posts/opencode-ten-bucks/). The limits I hit here are exactly what [The Router My Colleague Showed Me](/posts/the-router-my-colleague-showed-me/) approached from a different angle — but that's the next story.
