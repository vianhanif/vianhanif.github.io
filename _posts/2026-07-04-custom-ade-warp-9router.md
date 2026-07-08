---
title: "Building a Custom ADE: The Story of 9router + Warp Terminal"
date: 2026-07-04
tags: [9router, warp, ade, terminal, tooling]
---

## How It Started

It began with a privacy notice 🔒. I'd been using GitHub Copilot in VS Code — it worked fine, autocomplete was helpful. Then GitHub announced they'd start using user prompt data for model training. That didn't sit right with me 😬. I started looking for alternatives and realized most AI coding tools had the same trade-offs: locked to one provider, opaque about data use, and expensive when you wanted more.

The tools I was using were black boxes. They connected to one provider, had one pricing model, and if something broke, I was stuck waiting.

I wanted the opposite: a setup where every piece was mine to control, swap, or replace. This is the log of building that.

For a while I bounced between opencode Zen (free tier) and opencode Go (paid subscription). Neither was bad — Zen cost nothing, Go was fast. But I kept hitting the monthly subscription cap before the month ended.

Then a colleague shared 9router with me. At first it looked like overkill — a whole AI routing layer with 40+ providers, format translation, fallback chains. I didn't see why I'd need it. I was wrong. When you hit your paid subscription limit within three weeks, having fallback providers isn't optional — it's the difference between shipping a feature and waiting for the reset date.

So I forked it. And then I couldn't stop 🏃‍♂️.

## Phase 1: Forking 9router

9router (based on [decolua/9router](https://github.com/decolua/9router)) was already a smart AI router — it sat between your coding tools and LLM providers, handling format translation and fallback. But it was built as a Next.js monolith. The dashboard and the routing engine were one big blob.

First thing I did: split the monorepo. The API server (Hono, ~65KB) got its own workspace. The dashboard (Next.js, ~300MB with deps) got another. The CLI got its own package with esbuild bundling.

```text
Before:  one big Next.js app
After:   apps/server/   (Hono, port 20128)
         apps/dashboard/ (Next.js, port 3000)
         cli/            (standalone npm package with bundled server)
         packages/core/, packages/db/, packages/shared/
```

Why this mattered: the CLI `npm install` went from ~200MB to ~2.5MB. The server starts in 200ms instead of 15s. And I could update the routing engine without touching the dashboard — or never install the dashboard at all.

## Phase 2: Learning What a Router Really Needs

Running 9router daily taught me what matters in practice:

**Tiered fallback isn't optional.** When opencode Go hits a rate limit, I need to keep working — not stare at a "retry in 30s" message. 9router chains providers in tiers: subscription accounts first, then cheap APIs (MiniMax at $0.2/1M), then free ones (Kiro, OpenCode Free, Vertex credits). If a paid provider rate-limits, a fallback takes the next request. No interruption.

**Multiple accounts per provider.** One provider account is a single point of failure. Upstream 9router already supports multiple accounts per provider with round-robin and sticky sessions — requests stick to one account until a configurable limit, then rotate. If an account gets locked (model-level rate limiting), it's skipped automatically.

**Token compression is free money 💰.** Upstream 9router includes the RTK (Reduce Token Kitchen) saver — it compresses `tool_result` content server-side. 20-40% fewer tokens per request, applied transparently. The agent doesn't know it's happening. The bill just shrinks.

**I rebuilt the headroom API routes for the separated server.** The headroom compression proxy (port 8787) is an upstream feature, but the original API was still wired into the monolithic Next.js server. After the monorepo split, I reimplemented `/api/headroom/status`, `/api/headroom/start`, and `/api/headroom/stop` on the new Hono server — auth-gated with localhost detection plus a CLI token for remote control. The service auto-detects the binary (headroom CLI or Python 3.10+), manages a PID file under `~/.9router/headroom/`, and probes health with configurable timeout. Once the tunnel was in place I could check compression status from anywhere.

**OAuth tokens expire.** 9router handles proactive token refresh — before every request, it checks if any credentials are near expiry and refreshes them. This stopped a recurring failure mode where my provider OAuth tokens would expire mid-session.

**The combo system — cost architecture in practice.** The actual routing config lives in `~/.ai/combos.json`. It defines named model tiers with specific fallback strategies:

| Combo | Strategy | Models |
|---|---|---|
| Cheap | round-robin | oc/big-pickle, oc/deepseek-v4-flash-free, gemini/gemini-3.1-flash-lite-preview |
| Almost-Free | round-robin | gemini flash lite, groq llama, opencode free |
| Balanced | round-robin | groq gpt-oss-120b, ocg/deepseek-v4-flash, gemini flash |
| Fast-Coder | round-robin | ocg/deepseek-v4-flash first, then balanced extras |
| Architect | round-robin | ocg/qwen3.6-plus, minimax-m2.7, ocg/deepseek-v4-pro |
| Premium | round-robin | ocg/deepseek-v4-pro, qwen3.7-max, qwen3.6-plus |
| General | round-robin | nests into Cheap → Almost-Free → Medium (combo hierarchy) |

`Deep-Thinker` chains Architect → Premium.

The import/export format evolved alongside the strategies. I bumped the export to version 2 so it emits the full strategy config object (`fallbackStrategy` + optional `judgeModel`) instead of the legacy `roundRobin` boolean. The import path does backward-compat detection — old exports still work. The round-trip is how I tune routing: export JSON, paste into any AI chat for analysis, get back a tuned config, import. No dashboard required.

`all-Free-LLMs` and `all-Paid-LLMs` aren't combos I use directly — they're utility collections I added so when I export and ask an AI helper to assess my routing strategy, it can see the full inventory of available models without me listing them manually.

The routing is data-driven — add a model alias to a combo and it joins the rotation. No code changes.

**The runtime footprint.** 9router's runtime state lives in `~/.9router/`:
- `db/data.sqlite` — SQLite database with provider connections, OAuth tokens, settings, usage stats; `backups/` holds pre-upgrade snapshots
- `headroom/` — The token-optimization proxy (port 8787) with its own PID and log
- `bin/cloudflared` — The Cloudflare tunnel binary vendored locally
- `runtime/node_modules/` — Native dependencies (better-sqlite3, sql.js) installed lazily to avoid Windows build issues
- `auth/cli-secret` — CLI authentication token for local API access
- `server.log` + `server.pid` — Live server state
- `machine-id` + `jwt-secret` — Identity and signing keys
- `mitm/` — MITM proxy state (aliases.json)

This directory is the entire operational state. 9router doesn't depend on external databases or cloud services — everything is local files and SQLite.

## Phase 3: Pre-Warp — The OpenCode Ecosystem

Before Warp had agents, OpenCode CLI was my daily driver. It ran on top of 9router, and for single-turn coding tasks it was fine. But as I pushed it further, I kept running into edges that each warranted their own tool.

### opencode-tree — Attempt at Environment Isolation (Failed)

OpenCode runs one session at a time in one directory. Context-switching between tasks meant stashing changes, switching branches, hoping not to lose my place. I tried building [opencode-tree](https://github.com/vianhanif/opencode-tree) — a tool that creates isolated git worktrees with a tmux session, one window for OpenCode and another for shell, with auto-cleanup.

It didn't stick. The tmux overhead felt heavy, and the isolation added ceremony to every task start/stop. The idea was right (worktree isolation), but the execution didn't fit my flow. Warp's tab configs with worktree templates might achieve the same isolation with less ceremony — I haven't explored that path yet.

### opencode-environment-bootstrap — Reproducible Setup

Every new machine meant reinstalling OpenCode, reconfiguring MCP servers, re-setting up shell aliases, re-downloading skills 🥱. I built [opencode-environment-bootstrap](https://github.com/vianhanif/opencode-environment-bootstrap) — a single curl-to-bash command that provisions an entire workstation: OpenCode config, Zsh setup, dev tools (Zed, Ghostty, Bruno), MCP runtimes (duckdb, firecrawl, metabase, serena), and a full custom agent system.

### The `/delegate` System — Multi-Agent Orchestration

The bootstrap included my most ambitious OpenCode hack: the `/delegate` command. A custom OpenCode command that orchestrates multi-agent workflows via annotated task delegation.

```text
/delegate
@planner design auth system migration for PROJ-1237
@result @coder implement auth changes
@coder implement billing changes
@result @reviewer review both
@result @tester run integration tests
```

It supported six agents (planner, coder, reviewer, tester, analyzer, brain), dependency chaining via `@result`, per-agent model overrides via environment variables, and shared context injection (git repo, target branch, worktree path). The execution flow was: validate → parse annotations → build DAG → execute roots → collect results → inject into dependents → report.

It even had a pre-delegation validation step that enforced 4 explicit confirmations before any subagent launched — git repository, remote origin, target branch, ticket ID.

### opencode-session-viewer — Session Forensics

OpenCode's built-in `opencode session list` shows only 3 fields: session ID, title, and update time. There's no detail command. I built [opencode-session-viewer](https://github.com/vianhanif/opencode-session-viewer) in Go to fill this gap — it queries the OpenCode SQLite DB directly and surfaces agent used, model used, message count, todo progress, recent message content, diff stats, and subagent hierarchy. A forensic tool for understanding what happened across sessions.

### Why I Eventually Hit a Wall

All of these were bolt-on solutions. They worked — up to a point. The hard limits were architectural:

**1. OpenCode CLI is a TUI.** Full-screen terminal UI with menus, panels, focus modes. Powerful, but it doesn't feel native when you live in a shell. I want to type commands, pipe output, use my own prompt, my own aliases. A TUI is a layer between me and the terminal that I can't bypass. Every time I tabbed into OpenCode, I left my shell environment behind.

**2. The agent execution model is sequential 🔗.** The `/delegate` system could fan out — but once a subagent finished, the parent had exactly one shot to process the result. No re-iteration. No follow-up. No "that doesn't look right, try again." The flow was delegate → subagent completes → parent continues. No feedback cycle. OpenCode's session model doesn't support a parent resuming a subagent with new context after receiving results.

**3. No native orchestration.** Everything I built with `/delegate` was a custom protocol on top of OpenCode's tool system. There was no runtime managing lifecycle, no message passing between agents, no shared state. The DAG execution was emulated, not native.

I lived with these limitations for months. The opencode ecosystem was a proof of concept — it showed me multi-agent orchestration was possible and valuable, but it also showed me the tool itself needed fundamental changes I couldn't make from the outside.

### The Warp ADE Announcement — Why I Came Back

I had actually tried Warp a while back, before OpenCode. Back then I understood it as a terminal with AI features — a nice inline assistant, but tethered to Warp's own subscription model. I didn't look deeper. The orchestration capability wasn't on my radar.

Then Warp announced [Warp 2.0: the Agentic Development Environment](https://www.warp.dev/blog/reimagining-coding-agentic-development-environment). The messaging shifted: not just a smarter terminal, but a platform where agents are first-class citizens. Custom OpenAI-compatible providers. Child agent orchestration. MCP integration. Tab configs with worktree templates. A few months later came [Oz, the orchestration platform for cloud coding agents](https://www.warp.dev/newsroom/2026/2/10/warp-launches-oz-the-orchestration-platform-for-cloud-coding-agents) — the `run_agents` primitive, cloud environments, audit trails. The announcements made it clear Warp was building toward exactly the thing I had been hacking together with `/delegate`.

Two things pulled me back:

1. **Custom provider support** — Warp wasn't locked to its own AI anymore. I could route through 9router. That meant multi-provider fallback, token compression, my entire cost architecture — available inside Warp agents.

2. **Native orchestration** — The `run_agents` primitive. Not a bolt-on protocol over a tool system, but a first-class runtime where a lead agent spawns children, messages them, collects results, re-delegates. This was what `/delegate` tried to be, but without the sequential-chain limitation.

### The Agent System That Survived the Transition

Not everything was left behind. The agent role definitions (planner, coder, reviewer, tester, analyzer), the Delegation Gate rules, the session onboarding protocol, the worktree conventions, and the 15-point enforcement checklist — all of that migrated. It lives in `~/.agents/AGENTS.md`, which serves as the universal agent model for both OpenCode and Warp. The same file says "Warp Oz" in one section and "OpenCode CLI" in another. The model is tool-agnostic.

When I moved to Warp, I only had to rewrite one thing: the delegate mechanism. The OpenCode version used `task(subagent_type: "coder")` — a function built into OpenCode's tool system. The Warp version (`~/.agents/skills/delegate/SKILL.md`) uses `run_agents` — Warp's native orchestration API. The interface is the same annotation syntax (`@planner`, `@coder`, `@result`), but the execution backend changed from emulated DAG to real parallel child agents with bidirectional messaging.

The skill files themselves (`~/.agents/skills/planner/SKILL.md`, `coder-role/`, `reviewer-rule/`, `tester/`, `analyzer/`) needed zero changes. Each defines role-specific behavior — planning gates, coding constraints, review checklists — and Warp auto-discovers them. The same skill instructs a planner whether it runs in OpenCode or Warp.

## Phase 4: Warp as the Agent Environment

Then Warp added agents. And more importantly, it added orchestration.

The Oz platform in Warp lets a lead agent spawn parallel child agents, each working on independent subtasks. The lead agent coordinates them via messaging, collects results, and integrates. This is exactly what my `/delegate` function tried to do — but without the limitations.

Child agents can be messaged. The lead agent can send follow-up instructions, ask for revisions, or re-delegate after reviewing results.

A task that would normally be a serial sequence becomes a fan-out:

```text
Lead agent (plans, coordinates)
  ├── child: research the API surface and write findings
  ├── child: implement the backend changes on a worktree
  ├── child: implement the frontend changes on a separate worktree
  └── child: write and validate tests
```

Each child runs independently, in its own git worktree, possibly on different providers routed through 9router. The lead agent resolves merge conflicts, validates the whole, and produces a single coherent result.

And critically: Oz agents run in the terminal itself — no TUI layer. I'm in my shell, with my config, my keybindings, my MCP tools. The agent is part of the terminal, not a separate program I tab into.

Warp also supports custom OpenAI-compatible providers. I pointed it at a 9router endpoint and suddenly every agent session was routing through 9router — multi-provider, compressed tokens, automatic fallback, all invisible. But there was a catch: Warp's Oz agent infrastructure runs in an isolated context. It can't reach `localhost` ports. To connect Warp to 9router, I needed a public HTTPS endpoint.

That's where the tunnel came in 🕳️.

**The cost economics are worth calling out.** Oz orchestration syncs to Warp's cloud by default — conversation history, agent runs, artifacts — and it's free. My only recurring costs are $10/month for opencode Go (paid tier) plus a yearly domain invoice for the tunnel endpoint, with free providers (Gemini free tier, OpenCode Free, Groq free tier) as fallback layers through 9router. There's no Warp subscription, no per-seat fee, no hidden infra cost. The router handles the cost optimization; Warp provides the orchestration runtime at zero marginal cost.

I added MCP servers to supplement the orchestration: kubectl for Kubernetes context, duckdb for inline data queries, firecrawl for web research, lean-ctx for fast codebase search. Each child agent has access to these through the shared MCP configuration.

## Phase 5: The Tunnel Problem

I couldn't point Warp agents at `localhost:20128`. Warp's Oz infrastructure runs isolated — it needs a public HTTPS endpoint. This forced the tunnel question.

Cloudflare offers a free "Quick Tunnel" — run `cloudflared tunnel --url http://localhost:20128` and you get a public URL like `https://random-words-1234.trycloudflare.com`. It works instantly, no account required.

But it changes every time you restart. You can't configure that in Warp and expect it to last a day.

To get a stable endpoint, I needed:
- A domain I own
- A named tunnel (not quick tunnel) bound to that domain
- A persistent process that keeps the tunnel alive

The result is `local-tunnel`: Cloudflare tunnel + Caddy (optional), managed as a macOS `launchd` service.

```xml
<!-- ~/Library/LaunchAgents/com.9router.tunnel.plist -->
<key>KeepAlive</key>
<true/>
<key>RunAtLoad</key>
<true/>
```

**The flow:**

```text
Warp agent (needs HTTPS endpoint)
  ↓
https://my-subdomain.example.com/v1
  ↓
Cloudflare DNS (CNAME → tunnel ID)
  ↓
Cloudflare edge → encrypted tunnel
  ↓
cloudflared on my machine
  ↓
http://localhost:20128
  ↓
9router Hono server
```

`cloudflared tunnel create` registers a permanent tunnel. `cloudflared tunnel route dns` creates a CNAME from my subdomain to the tunnel endpoint. The DNS record is static — configure it in Warp once, never touch it again. On the local side, `launchd` ensures the tunnel respawns on crash or reboot.

The Caddy part is optional — Cloudflare handles TLS termination at the edge, so the tunnel can connect to plain HTTP on localhost. Only needed if the local service insists on HTTPS.

I also built tunnel management into 9router's Hono server — API endpoints to start/stop/check Cloudflare tunnels and Tailscale funnels, with a watchdog for auto-reconnect. The `local-tunnel` repo is the standalone version for when I want the tunnel managed separately.

## Phase 6: What Broke (and What Didn't)

Things that failed more than once 💥:

- **OAuth token expiry mid-request** — fixed by proactive refresh
- **cloudflared crash after macOS sleep/wake** — fixed by launchd KeepAlive
- **Model-level rate limits on shared accounts** — fixed by per-model lock keys in the database

Things that held up 🛡️:

- The Hono server has never crashed on me
- Format translation (between provider formats) works silently — I forget it's happening
- The tunnel stays up across weeks of uptime
- Orchestration with parallel child agents has been remarkably stable — the biggest risk is forgetting to give each child its own git worktree

## Comparing Approaches: Warp ADE vs OpenCode Go

At this point opencode Go was my daily driver. Coming from this setup, the limitations become visible:

| Dimension | Warp ADE | OpenCode Go |
|---|---|---|
| **Interface** | Shell-native — agents run inline in terminal | Full-screen TUI — separate from shell |
| **Execution model** | Parallel child agents via native orchestration | Single agent, sequential |
| **Connectivity** | Needs public HTTPS tunnel for remote agent access | Connects to localhost directly |
| **Setup** | Multiple layers (router + tunnel + agent config) | Install and run |
| **Isolation** | Built-in git worktree support per child agent | Manual git management |

Put differently: OpenCode is an appliance. This is a chassis. One works out of the box. The other lets you swap every component.

Both are valid. I've used both. But this setup has changed my default.

## What I'd Tell Someone Starting Today

1. **Start with the router, not the tunnel.** 9router gives you the most leverage for effort — tiered fallback and token compression change your cost structure immediately. Add the tunnel only when you need remote access.

2. **The Hono server decoupling was worth every refactoring hour.** Keeping the routing engine separate from the dashboard means I iterate on routing logic in ~200ms server restarts instead of waiting for Next.js to recompile. If you fork or build a router, fight for fast startup.

3. **Orchestration changes how you tackle complexity.** Being able to fan out to parallel child agents means a task that used to be a long serial conversation becomes a coordinated team. The lead agent plans, delegates, and integrates. Each child stays focused on one thing. It's a different mental model for how an AI assistant works — not just a smarter chatbot, but a coordinator that can parallelize.

4. **Not everything needs to be in one codebase.** local-tunnel is a separate repo with 5 files. It doesn't need to be part of 9router. The tunnel survives regardless of what happens to the router.

5. **Account for failure modes explicitly.** Model-level rate locks, expired OAuth tokens, tunnel disconnects, sleep/wake cycles — test each one. The reliability of the whole stack is determined by the weakest recovery path.

6. **The real win is interchangeability.** I can swap 9router for Ollama tomorrow, replace Warp with Cursor next week, or run multiple tunnels for different services. None of the other layers care. That's the property that makes the setup cost worth paying.

## The Shell Aliases That Tie It Together

The day-to-day interface to this stack is a handful of zsh aliases across `~/.zshrc` and `~/.zsh/aliases/9router.zsh`:

**Server management:**
- `9r-start` — launches the Hono server via `npm run start -w apps/server`, daemonized with `nohup`, PID written to `~/.9router/server.pid`
- `9r-stop` — kills the server by PID and cleans up the PID file
- `9r-logs` — `tail -f ~/.9router/server.log`
- `9r` — `cd` into the 9router project root

**Headroom proxy control (direct):**
- `headroom-start` — launches headroom proxy on port 8787 as a background process
- `headroom-stop` — kills the headroom proxy by `~/.9router/headroom/proxy.pid`

**Headroom API (via tunnel):**
- `hr-start` — POSTs to `/api/headroom/start` on the Hono server
- `hr-stop` — POSTs to `/api/headroom/stop`
- `hr-status` — GETs `/api/headroom/status` to check compression proxy health

**Other:**
- `9r-tui` — launches the live ANSI terminal dashboard (`9router --tui`)
- `9r-kill` — force-kills whatever is holding port 20128

The split is intentional: `headroom-start/stop` talk directly to the headroom binary, `hr-start/stop/status` route through the Hono server API (accessible remotely via the tunnel). Same proxy, two control paths.

## Still In Progress 🚧

This isn't a finished product. It's a running experiment. Current open questions:

- Monthly usage dashboard — optimize 9router usage dashboard with monthly usage overview.
- Can I replace cloudflared with a Tailscale funnel for lower latency on direct connections?
- How does Headroom proxy (port 8787) affect the RTK compression ratio in practice?
- What's the right sticky round-robin limit for shared accounts across multiple users?
- Should the tunnel lifecycle live in 9router's API or stay separate as it is now?

The nice thing about owning every layer: I can answer these by trying, not by filing a feature request.
