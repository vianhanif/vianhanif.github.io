# AI Usage Context

Reference for writing about my AI setup. Keeps story details consistent across posts.

## Current Setup

| Layer | Tool | Notes |
|-------|------|-------|
| Primary environment | **Warp Terminal** (Oz platform) | Agents run inline in shell. Native child-agent orchestration via `run_agents` |
| AI router | **9router** (fork of decolua/9router) | Hono API server, port 20128. OpenAI-compatible endpoint |
| Tunnel | **Cloudflare Tunnel** + Caddy | Managed as macOS `launchd` service. Public HTTPS for Warp agents |
| MCP servers | kubectl, duckdb, firecrawl, lean-ctx, metabase, serena | Shared across all agents |
| Shell | zsh (macOS) | |

## Previous Tooling

| Tool | Status | Notes |
|------|--------|-------|
| OpenCode CLI (Go) | Still used occasionally | $10/mo subscription. Full-screen TUI |
| OpenCode Zen | Previously used | Free tier |
| GitHub Copilot | Abandoned | Privacy concerns (prompt data for training) |
| `/delegate` system | Replaced by Warp Oz | Custom multi-agent DAG on OpenCode — now native in Warp |

## Routing Architecture

- **Provider model**: Multi-account, multi-provider routing via `~/.ai/combos.json`
- **Fallback tiers**: Subscription → cheap API ($0.2/1M) → free tier
- **Token compression**: RTK (Reduce Token Kitchen) / headroom proxy — 20-40% fewer tokens transparently
- **Auth**: Proactive OAuth token refresh before every request
- **Model-level rate limiting**: Per-model lock keys in SQLite

### Combo Tiers

| Combo | Cost | Strategy |
|-------|------|----------|
| Cheap | Lowest | round-robin across budget models |
| Almost-Free | Near zero | Mostly free-tier models |
| Fast-Coder | Moderate | Fast inference priority |
| Architect | Higher | Strong reasoning models |
| Premium | Highest | Best available |
| General | Adaptive | Nests Cheap → Almost-Free → Medium |

## Agent Roles

Defined in `~/.agents/`. Tool-agnostic — same skills work in OpenCode and Warp.

- **Planner** — design, architecture, research before coding
- **Coder** — implement changes in git worktrees
- **Reviewer** — review code, enforce standards
- **Tester** — write and validate tests
- **Analyzer** — debug, trace, root cause

## Directory Structure

All projects live under `~/Documents/alvian/`:

```
~/Documents/alvian/
├── .ai/
│   └── writings/        # Blog posts (_posts/), AGENTS.md, Jekyll config
├── 9router/            # AI router fork (monorepo: Hono server, Next.js dashboard, CLI)
├── local-tunnel/       # Cloudflare tunnel setup (standalone, 5 files)
├── opencode-environment-bootstrap/  # Workstation provisioning
├── opencode-session-viewer/        # Session forensics (Go)
└── opencode-tree/      # Worktree isolation experiment (not in use)
```

**Rule**: When working on any project, `cd ~/Documents/alvian/<project>` first.

## Infrastructure

- **9router runtime state**: `~/.9router/` (SQLite DB, PID files, auth tokens, logs)
- **Tunnel**: `~/Documents/alvian/local-tunnel/` — 5 files (Caddyfile, config.yml, plist, setup.sh, README)
- **Domain**: Personal domain on Cloudflare (free tier)

## Cost

- ~$10/mo opencode Go subscription
- Yearly domain registration
- Everything else free (Cloudflare tunnel, Gemini free tier, Groq free tier, etc.)
- No Warp subscription

## Key Repos

| Repo | Purpose |
|------|---------|
| [github.com/vianhanif/9router](https://github.com/vianhanif/9router) | AI router (forked + customized) |
| [github.com/vianhanif/local-tunnel](https://github.com/vianhanif/local-tunnel) | Cloudflare tunnel setup |
| [github.com/vianhanif/opencode-environment-bootstrap](https://github.com/vianhanif/opencode-environment-bootstrap) | Workstation provisioning |
| [github.com/vianhanif/opencode-session-viewer](https://github.com/vianhanif/opencode-session-viewer) | Session forensics |
| [github.com/vianhanif/opencode-tree](https://github.com/vianhanif/opencode-tree) | Worktree isolation (experiment, not in use) |

## Writing & Publishing Workflow

### File locations

| Directory | Purpose |
|-----------|---------|
| `_posts/` | Published posts (live on site) |
| `_drafted/` | Draft posts staged for future publication |
| `_linkedin/` | Short teaser post + first-comment link to Medium. 3 items, one per topic group |
| `_medium/` | Expanded story per LinkedIn topic with inline links back to blog. 3 items. Original content — no canonical URL |
| `_drafts/` | Jekyll-native drafts dir (not used — use `_drafted/` instead) |

**Draft posts go in `_drafted/`**, not `_drafts/`. The `_drafted/` directory is a custom Jekyll collection defined in `_config.yml` — it has `output: true` so drafts are previewable at `/drafted/:title/` without being indexed or on the main feed.

### Config

- `future: false` — posts dated in the future do NOT render in production. This is by design: draft posts can have their target publish date in frontmatter without going live.
- Pipeline: GitHub Actions (`workflows/pages-deploy.yml`) triggers on push to `main`/`master`. Builds with `bundle exec jekyll build`, runs htmlproofer, deploys to GitHub Pages.
- Local preview: `bundle exec jekyll serve --future` (needs `--future` flag to see posts with future dates).
- **Important**: `drafted.md` filters `site.drafted` to only posts with `date <= site.time`. Without this filter, the page generates links to future-dated drafts that Jekyll won't render, causing htmlproofer to fail with broken internal links. Keep this filter when iterating over `site.drafted`.

### Publishing flow

1. Draft written and pushed to `_drafted/YYYY-MM-DD-title.md`
2. On publish day, move file from `_drafted/` → `_posts/` (update frontmatter if needed, keep same date)
3. **AI generates**:
   - `_linkedin/` — 3 short teaser posts, one per topic group, grouped by story arc
   - `_medium/` — 3 expanded-story versions matching each LinkedIn post, with inline links to blog originals
4. Commit and push — pipeline auto-deploys
5. **Manual**: Post LinkedIn text + comment first. Then Medium post (publish timing staggered 2-4 weeks after each blog group)
   - **Medium import**: https://medium.com/p/import — paste content here, set canonical URL to your blog post, publish

### Publishing orchestration rule

Every AI-assisted writing session MUST:
1. Check if the drafted post will be published (asked or implied by user)
2. If yes, determine the topic group it belongs to (subscription story, router story, or ADE story)
3. Generate or update the corresponding `_linkedin/` and `_medium/` prep files for that topic group
4. Fill in: teaser text for LinkedIn, expanded story for Medium, inline links back to blog posts
5. Use `_linkedin/` and `_medium/` templates for structure

**Do NOT post to LinkedIn or Medium on behalf of the user. Generate prep files only — the post/comment action is manual.**

### Post conventions

- **Date in filename**: `YYYY-MM-DD-title.md` (both `_drafted/` and `_posts/`)
- **Frontmatter**: `title`, `date`, `tags` (array). Optional: `toc`, `comments`, `image`.
- **Permalinks**: Published posts at `/posts/:title/`, drafted posts at `/drafted/:title/`
- **Series**: Posts often reference each other. Use absolute paths like `[text](/posts/other-post-title/)`.
- **Tags**: Keep consistent. Existing tags: `9router`, `warp`, `oz`, `orchestration`, `agents`, `run_agents`, `ade`, `technical`, `postmortem`, `personal`, `tunnel`, `opencode`, `router`.

## Writing Style Notes

- **Names**: "Warp" (not "Warp Terminal" on second reference), "9router" (lowercase), "Oz" (Warp's orchestration platform), "MCP" (Model Context Protocol)
- **Terms**: "ADE" (Agentic Development Environment), "TUI" (terminal UI), "launchd" (not launchctl, except as the command)
- **Tone**: Technical but approachable. First-person narrative. Real problems, real solutions. "Conversational, personal story — like explaining what happened to a friend."
- **Length**: ~400-600 words per post unless the topic requires more.
|- **Avoid**: Exaggeration, marketing language, superlatives without evidence
|- **Source facts**: Any claim about a tool, company, pricing, policy, or date MUST include a source URL. Official docs preferred. Add as a **Sources** footnote at end of blog posts and a **Sources** section in Medium prep Notes.
