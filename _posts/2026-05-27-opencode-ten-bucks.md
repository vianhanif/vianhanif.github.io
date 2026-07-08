---
title: "OpenCode: The $10/mo TUI"
date: 2026-05-27
tags: [opencode, tui, ai, tooling]
---

Three weeks into the billing cycle, I watched the spinner stop. Rate limit exceeded. The feature I was building could wait — but the resentment didn't.

I'd been bouncing between OpenCode Zen (free) and OpenCode Go ($10/mo) for months. Neither was bad. Both had the same flaw: I'd hit the subscription cap before the month ended. Three weeks in, every time, like clockwork.

When Go worked, it was great. Fast models, responsive CLI, solid output. I forgot I was paying per month. Then the cap hit and I was either squeezing by on the free tier or debating an upgrade I didn't need. The subscription model made sure I never got too comfortable.

OpenCode CLI was my daily driver, running on top of 9router, which handled fallback chains and format translation. When Go capped out, 9router routed through free providers — Kiro, OpenCode Free, Vertex credits. The code kept shipping. But the experience degraded in ways that had nothing to do with model quality.

The TUI wall was the worst part.

OpenCode CLI is a full-screen terminal UI. Menus, panels, focus modes, editor integrations — all rendered in that immersive layer. It looks great in demos. But every time I tabbed into OpenCode, I left my shell environment behind. Tmux sessions, running servers, terminal history — all invisible from inside the TUI. I'd need the model to check a log file and suddenly I was context-switching between two UI paradigms. The TUI wrapped the AI but walled off everything else.

I remember one specific moment: debugging a production issue, had four tmux panes open with logs, metrics, and the codebase. I needed the model's help to trace a code path. Tabbed into OpenCode, and everything else disappeared. The logs, the metrics, the context I'd built up — gone. I had to describe what I could see in the panes I'd just closed. The model couldn't see the running processes right next to it.

I felt trapped. The best coding AI I'd used required me to step out of my environment to reach it. That's when I started looking more seriously at alternatives.

I built tools to paper over the gaps. Git worktree isolation scripts, environment bootstrap from a single curl command, even a custom [`/delegate`](https://github.com/vianhanif/opencode-environment-bootstrap) system for multi-agent orchestration. (Full story in [The Tools I Built Around OpenCode](/posts/tools-i-built-around-opencode/).) They worked. But every tool was a bolt-on. The architecture had a ceiling I couldn't raise from the outside.

A colleague put it to me this way: OpenCode is an appliance. It works out of the box. You pay, you use, it delivers. But you own nothing inside it. I was trying to turn an appliance into a chassis — something I could swap components in and out of. The chassis analogy stuck. OpenCode was the best appliance I'd used. But I could feel the difference between using a tool and owning the stack.

I know people who would just pay $20/month for ChatGPT Pro and call it done. For them that's the right call — the subscription is cheaper than their time. By this point I'd spent 40+ hours on router infrastructure, tooling, and tuning. But every hour I spent on infrastructure unlocked capabilities the subscription model can't offer: zero-cost fallback providers, transparent token compression, complete provider interchangeability.

The cost was otherwise hard to argue with. $10/mo for the Go tier, free providers as fallback through 9router, no Warp subscription yet. Compared to $20/mo for ChatGPT Pro or $30/mo for Copilot, OpenCode was the bargain. The issue wasn't price. I kept wanting the tool to be something it wasn't designed to be.

I didn't want a smarter chatbot. I wanted an environment where agents were native — not something I tabbed into, but something that lived in the same context as my terminal, my files, my running processes. Where the AI didn't take over the screen but operated alongside everything else.

That's not what OpenCode was built for. I knew it. But the TUI wall was a clue I couldn't ignore: the architecture of the tool was constraining how I could work. The ceiling wasn't the model quality. It was the interface itself.

That realization sent me back to reconsider tools I'd dismissed — including the one I talk about in [Warp Tried to Sell Me AI Again](/posts/warp-tried-to-sell-me-ai/). [The Tools I Built Around OpenCode](/posts/tools-i-built-around-opencode/) covers everything I bolted onto OpenCode while trying to make it into what I needed.

> *Thanks to [Aries Maulana](https://github.com/ariesmaulana) for sharing OpenCode Go with me.*
