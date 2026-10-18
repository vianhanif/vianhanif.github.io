---
title: "OpenCode V2: Deciding to Upgrade and the Journey There"
date: 2026-10-02
tags: [opencode, tooling, migration, technical, upgrade]
layout: post
---

I noticed OpenCode quietly published their V2 release. As someone running V1 across multiple machines and workspaces for months, I found myself staring at the announcement and thinking: *Do I upgrade? What's actually new?* This post walks through that decision — the benefits that made me commit to migrating, and the steps I took to get there without losing anything.

## Why I Noticed V2

The announcement showed up on the docs homepage ([opencode.ai](https://opencode.ai/)): "NEW OpenCode v2 is now available," linking to [opencode.ai/v2](https://opencode.ai/v2). No press release, no changelog email — very much an OpenCode thing.

I was curious because V1 had been solid but had a natural ceiling around session management, especially after environment changes. I'd already written about one episode: recovering 181 sessions from SQLite after a laptop swap, which meant remapping project IDs and normalizing subpaths by hand. In V1, a session was bound to exact paths and project IDs, so any shift orphaned data.

V2's docs hinted at structural changes worth understanding before I jumped.

## What Actually Changed in V2

From the [V2 docs](https://opencode.ai/v2/docs/), the headline shifts:

**1. A shared background service.** Instead of starting fresh on every `opencode` invocation, V2 runs one background server per user account. Every local client connects to it, and the server owns sessions, configuration, permissions, and tool execution. You can inspect it directly:

```bash
opencode service status
# http://127.0.0.1:49374
```

The docs note the service is discovered or started by default, and you can opt into a private server with `--standalone` or point at a specific one with `--server <url>` ([CLI reference](https://opencode.ai/v2/docs/cli/)).

**2. A new session store.** V2 introduced a `session_v2` table alongside a `project` table that tracks the worktree. My own database tells the story: after migration, `sqlite3 ~/.local/share/opencode/opencode.db "SELECT COUNT(*) FROM session_v2;"` returned 188 rows.

**3. Real session tooling.** `opencode session` now supports `list`, `export`, `import`, and `delete` — JSON in and out. That alone would have made my laptop-swap recovery much less painful.

**4. A browser/app pairing flow.** `opencode pair` prints one-time links to connect a browser or app to the running server ([CLI reference](https://opencode.ai/v2/docs/cli/)).

## The Benefits That Made Me Commit

**Session persistence that survives environment changes.** This was my number one reason. The `project` + `session_v2` schema tracks worktrees rather than raw paths, which means fewer orphaned records when paths shift. My recovery post documents three failure modes I still had to fix by hand — so it's not magic — but the foundation is far more resilient than V1's flat path binding.

**Everything routes through one service.** Config, permissions, and tool execution live in the server, not in each invocation. That's a cleaner mental model and a cleaner debugging surface.

**First-class session import/export.** Being able to move sessions as JSON is the kind of boring, valuable capability that makes migrations sane.

**Development is V2-first.** New tooling (MCP servers, custom commands, plugins, themes) lands on V2. The V1 docs still exist but are clearly labeled the older generation.

## A Note on Startup Speed

Anecdotally, the TUI *feels* faster to open than I remember from V1 — but I don't have a clean V1 baseline to prove that with numbers, so I'm calling it a felt impression, not a measurement.

What I *can* measure is the current binary on this machine:

```bash
time opencode --version
# real 0.08s–0.10s
```

That's a single cold number, not a before/after comparison. The structural reason it should feel faster is the background service: since one server persists, subsequent clients skip the discovery-and-init work V1 did on every invocation. That's an argument from architecture, not from data. If you want a real comparison, measure `time opencode` on V1 and V2 yourself on the same machine.

## How I Migrated

Here's the path, grounded in the real V2 CLI surface. **Back up first** — that's non-negotiable.

### Step 1: Back Up State and Data

```bash
cp -r ~/.local/state/opencode ~/.local/state/opencode.v1.backup
cp -r ~/.local/share/opencode ~/.local/share/opencode.v1.backup
```

Dump a human-readable session list too, as a fallback reference:

```bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT id, project_id FROM session LIMIT 50;" > /tmp/v1_sessions.txt
```

Find where V2 thinks its data lives:

```bash
opencode debug paths db
```

### Step 2: Audit What You're Running

```bash
opencode --version
```

The docs are explicit: **OpenCode 1 and OpenCode 2 both use the `opencode` command and cannot be installed side by side under their default command** ([Intro](https://opencode.ai/docs/)). So you're choosing to replace, not run both.

Install V2 per the [V2 docs](https://opencode.ai/v2/docs/) — `curl -fsSL https://opencode.ai/v2/install | bash`, or `brew install anomalyco/tap/opencode-v2`. If you have a V1 install, remove it with the same package manager that installed it so the `opencode` command resolves to V2.

### Step 3: Start and Inspect the Background Service

```bash
opencode service status   # check if it's running
opencode service start    # start it if not
```

The service writes its metadata (pid, url, password) to `~/.local/state/opencode/service.json`. V2 also auto-starts it on first use, so you may not need to run this manually — but checking first tells you which state you're in.

### Step 4: Verify Sessions Migrated

```bash
sqlite3 ~/.local/share/opencode/opencode.db "SELECT COUNT(*) FROM session_v2;"
opencode session list
```

On my machine the V2 store already held 188 sessions, and `opencode session list` returned results scoped to the current project. That scoping matters: run it from the project directory you care about, not from `$HOME`. I learned that the same command returned 36 lines from home but only 5 from `/tmp` — it's project-scoped by design.

### Step 5: Test Core Workflows

```bash
opencode session list      # sessions for the current project
opencode                   # open the TUI
opencode pair              # browser/app pairing links
opencode session export    # JSON out, when you want a portable copy
```

### Step 6: Keep Backups, Then Clean Up

Once you're satisfied, remove the `.v1.backup` directories. I'd give it a week.

## Real Takeaways

- **Session management is materially better** — worktree-aware schema, plus `export`/`import` as first-class commands.
- **One service, many clients** — a cleaner architecture than per-invocation startup.
- **Startup speed** — feels faster, architecturally should be faster, but I'm not claiming a number I didn't measure.
- **Ecosystem momentum** — V2 gets the new tooling first.

The cost is low: back up, replace the binary, start the service, verify. And if something goes sideways, the earlier recovery post covers the failure modes I hit.

## Should You Upgrade?

- **Rely on session history / work across machines** → upgrade. This is the clear win.
- **Want current tooling** → upgrade. Development is V2-first.
- **Happy, stable V1 setup** → you can wait, but not indefinitely.

For me the migration was worth it: no data loss, a cleaner architecture underneath, and better session tooling on top.

## Sources

- [OpenCode Intro (V1 vs V2 install note)](https://opencode.ai/docs/)
- [OpenCode V2 Getting Started](https://opencode.ai/v2/docs/)
- [OpenCode V2 CLI Reference](https://opencode.ai/v2/docs/cli/)
- [Saving OpenCode Sessions After Laptop Swap](/posts/saving-opencode-sessions-after-laptop-swap/)
- [OpenCode GitHub Releases](https://github.com/anomalyco/opencode/releases)
