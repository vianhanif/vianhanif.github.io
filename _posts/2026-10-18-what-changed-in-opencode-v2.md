---
title: "What Changed in OpenCode V2"
date: 2026-10-18
tags: [opencode, tooling, explainer, architecture]
layout: post
---

I already wrote about [the decision to move from OpenCode V1 to V2](/posts/opencode-v2-upgrade-decision/) and about [a config bug that bit me on the other side](/posts/opencode-v2-provider-traps/). This is the part I skipped: what actually changed. Plain language, one story, no feature table.

## The Story: A Drive-Through and a Workshop

Think about a drive-through.

You pull up, you order, the kitchen builds your whole meal from scratch, and you leave. Next customer: the kitchen builds everything again. Nothing carries over. The cook doesn't remember that you wanted no pickles last time. The station is wiped between orders because that's how a drive-through stays fast.

Now think about your own workshop.

The bench is still there with yesterday's half-finished shelf on it. The tools are on the pegboard where you left them. The coffee is still warm. You walk in, pick up exactly where you stopped, and when you leave, nothing gets packed away.

**OpenCode V1 was the drive-through. OpenCode V2 is the workshop.**

That's the whole upgrade. Everything below is the shape that one idea takes in real use.

## What the Workshop Gives You

### 1. The shop stays open (this is the big one)

V1 had a background server and a session database, but you had to manage it by hand — start it, stop it, figure out which session to connect to. And if your directory changed, V1 forgot which session went with which folder.

V2 runs one background server for you automatically, and it remembers *which folder you were in*. Every command you type just connects to the running server and knows exactly where to pick up.

```bash
opencode service status     # it's already running, and it says so
opencode service restart    # restart it without touching anything else
```

The CLI help describes the flags in terms of what they no longer have to do: `--standalone` runs "a private server **instead of the background service**", and `--server` connects you to a running one. In workshop terms: the lights stay on, and you're walking through the door rather than opening the shop.

Why this matters more than it sounds: it's the foundation for everything else on this list. You can't keep state if you throw the state away every thirty seconds.

### 2. Your work is remembered, portable, and won't get lost

V2 added a *project layer* to the database — it binds sessions to the git worktree, not just a path string. When you move a folder or swap machines, V2 reconnects the session to the right place instead of treating it as an orphan. I hit the V1 side of that the hard way: [163 sessions to remap after a laptop swap](/posts/saving-opencode-sessions-after-laptop-swap/).

The command you'll actually use:

```bash
opencode session list                    # what's in the workshop
opencode session export <sessionID> > out.json   # take it with you
opencode session import out.json         # set it down on another machine
```

Plain language: your conversation with the agent is a *file you own*, not a thing trapped inside one install. That's the difference between "I moved to a new laptop and started over" and "I moved to a new laptop and continued."

### 3. Pick your provider — and swap it without rebuilding anything

This is the part that matters most to me, because I point my agent at my own model router.

OpenCode V2 doesn't lock you into one model vendor. Your `~/.config/opencode/opencode.json` lists your providers — Anthropic, OpenAI, local models, or a custom endpoint like [my 9router](/posts/what-i-changed-in-9router/) — and each carries its address and credentials:

Inside your `~/.config/opencode/opencode.json`:

```json
{
  "providers": {
    "9router": {
      "package": "@opencode/ai/providers/openai-compatible-responses",
      "models": { "General": { "name": "General" } },
      "settings": {
        "baseURL": "https://9router.vianhanif.link/v1",
        "apiKey": "sk-..."
      }
    }
  }
}
```

Two things worth noticing:

- **You pick the address and the password.** Nothing is hardwired. Point it at a different server and the same agent talks to a different backend — no reinstall, no relearning.
- **Secrets can be pulled from your environment instead of pasted in.** Config supports `{env:VAR_NAME}` and `{file:path}` substitutions ([docs](https://opencode.ai/docs/config)), so the file can say "get the key from here" without containing the key.

Fair warning, earned the hard way: the `package` line is brittle. One wrong character and OpenCode silently picks the wrong backend — [I spent two days tracing that bug](/posts/opencode-v2-provider-traps/) before realizing it was a slash-vs-hyphen typo in the config.

### 4. Each job gets its own hand

OpenCode comes with different "agents" — same as having a builder, a planner, and a researcher in the workshop instead of one person doing all three badly.

- Some can edit files. Some are read-only by design.
- You pick one with Tab, or name one with `@`.
- The difference is enforced, not decorative: permissions live in config and OpenCode actually asks before touching anything it shouldn't ([permissions](https://opencode.ai/docs/permissions), [agents](https://opencode.ai/docs/agents)).

Plain-language version: you decide in advance what the apprentice is allowed to touch, rather than watching nervously.

### 5. You write down your house rules once

Anything you find yourself explaining to the agent repeatedly becomes a file:

```bash
.opencode/commands/release.md    # a reusable /release prompt
.opencode/skills/seo/SKILL.md    # knowledge loaded only when needed
```

Skills matter because they're **loaded on demand** — the workshop doesn't read every manual at once, it pulls the one relevant to the job sitting on the bench ([skills](https://opencode.ai/docs/skills), [commands](https://opencode.ai/docs/commands)).

### 6. The workshop doesn't have to be your terminal

MCP servers, LSP diagnostics, plugins, and HTTP APIs exist if you want them — but they're optional. For most people, `opencode run "prompt"` in the terminal is enough. For the rest: MCP lets your agent talk to external systems with OAuth handled; LSP feeds your language server's diagnostics back to the agent; the HTTP server lets you script it; editor plugins and a web interface exist if you want the workshop in VS Code or a browser. None of that breaks if you ignore it.

The point is: **the workshop stays open whether you walk in the front door or use a side entrance.** The server runs; your work is where you left it; you pick the provider. Everything else is elaboration.

## What It Won't Do

- **It doesn't make the model smarter.** Same model in, same quality out. V2 improves the *plumbing*.
- **It doesn't remove the need to read what it wrote.** Permissions and approval prompts help; they don't review your diff.
- **Configs can break.** JSONC is powerful, and the comment-stripping logic can be fragile — [I found a data-loss bug](/posts/opencode-v2-provider-traps/) where a misplaced try-catch would wipe your entire config on a syntax error.
- **It ships fast and changes it.** Commands and database schema changed between V1 and V2. Check `opencode --help` before trusting a guide, including this one.

## Where to Start (Five Commands)

```bash
opencode service status      # is the workshop open?
opencode session list        # what's on the bench?
opencode auth list           # which keys are loaded?
opencode models              # what can I cook with?
opencode run "hello"         # say something
```

If those five work, everything else on this page is a variation.

## Sources

- [OpenCode CLI reference](https://opencode.ai/docs/cli)
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode providers](https://opencode.ai/docs/providers)
- [OpenCode agents](https://opencode.ai/docs/agents)
- [OpenCode permissions](https://opencode.ai/docs/permissions)
- [OpenCode skills](https://opencode.ai/docs/skills)
- [OpenCode commands](https://opencode.ai/docs/commands)
- [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers)
- [OpenCode plugins](https://opencode.ai/docs/plugins)
- [OpenCode web / server / IDE](https://opencode.ai/docs/web)

**Earlier in this series:** [Deciding to Upgrade](/posts/opencode-v2-upgrade-decision/) · [9 Traps in a Custom Provider Setup](/posts/opencode-v2-provider-traps/) — or [deeper dives](/posts/saving-opencode-sessions-after-laptop-swap/) on session recovery if you're migrating from V1.
