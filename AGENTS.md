# AI Usage & Writing Context

Reference for writing about AI-assisted development. Keeps story details consistent.

## Publishing Workflow

### Drafted vs Published

| Directory | Purpose |
|-----------|---------|
| `_posts/` | Published posts (live on site) |
| `_linkedin/` | Short teaser post + first-comment link to Medium. 3 items, one per topic group |
| `_medium/` | Expanded story per LinkedIn topic with inline links back to blog. 3 items. Original content — no canonical URL |

**State criteria**

| State | Requirements |
|-------|--------------|
| Drafted | Post has `date > site.time`. Author may not have reviewed. Placeholder claims allowed. NOT ready for syndication. |
| Published | Post has `date <= site.time`. Reviewed and confirmed by author. Every factual claim has a source link. Ready for syndication prep. |

All posts live in `_posts/`. Jekyll automatically filters future-dated posts from the home feed via custom layout overrides, while keeping them previewable at their permalink URL.

### Config

- `future: true` — future-dated posts are generated as static files. This allows access at specific URLs while they are still in "draft" status.
- Pipeline: GitHub Actions (`workflows/pages-deploy.yml`) triggers on push to `main`/`master`. Builds with `bundle exec jekyll build`, runs htmlproofer, deploys to GitHub Pages.
- Local preview: `bundle exec jekyll serve --future` (needs `--future` flag to see posts with future dates).
- **Important**: `drafted.md` filters `site.posts` to only posts with `date > site.time`. Keep this filter when iterating over `site.posts`.

### Publishing flow

1. Draft written and pushed to `_posts/YYYY-MM-DD-title.md` with a future date
2. On publish day, update `date` frontmatter to current date (or remove date frontmatter if default behavior applies)
3. **AI generates**:
   - `_linkedin/` — 3 short teaser posts, one per topic group, grouped by story arc
   - `_medium/` — 3 expanded-story versions matching each LinkedIn post, with inline links to blog originals
4. Commit and push — pipeline auto-deploys
5. **Publish Medium** (D-0, same day as blog) — use https://medium.com/p/import, paste content, set canonical URL to your blog post, publish
6. **Schedule LinkedIn via Fedica** (D+1, one day after blog/Medium) — https://fedica.com/
   - Post text-only teaser + comment with Medium link — schedule for next day

### Publishing orchestration rule

Every AI-assisted writing session MUST:
1. Check if the post will be published (asked or implied by user)
2. If yes, determine the topic group it belongs to (e.g., orchestration, ADE, technical)
3. Generate or update the corresponding `_linkedin/` and `_medium/` prep files for that topic group
4. Fill in: teaser text for LinkedIn, expanded story for Medium, inline links back to blog posts
5. Use `_linkedin/` and `_medium/` templates for structure

**Do NOT post to LinkedIn or Medium directly. Generate prep files only — scheduling and posting is through Fedica + manual Medium import.**

### Post conventions

- **Date in filename**: `YYYY-MM-DD-title.md` (all in `_posts/`)
- **Frontmatter**: `title`, `date`, `tags` (array). Optional: `toc`, `comments`, `image`.
- **Permalinks**: Published posts at `/posts/:title/` (future-dated posts also render at this permalink).
- **Series**: Posts often reference each other. Use absolute paths like `[text](/posts/other-post-title/)`.
- **Tags**: Keep consistent. Existing tags: `9router`, `warp`, `oz`, `orchestration`, `agents`, `run_agents`, `ade`, `technical`, `postmortem`, `personal`, `tunnel`, `router`.

## Writing Style Notes

- **Names**: "Warp", "9router", "Oz" (Warp's orchestration platform), "MCP" (Model Context Protocol)
- **Terms**: "ADE" (Agentic Development Environment), "TUI" (terminal UI), "launchd" (not launchctl, except as the command)
- **Tone**: Technical but approachable. First-person narrative. Real problems, real solutions. "Conversational, personal story — like explaining what happened to a friend."
- **Length**: ~400-600 words per post unless the topic requires more.
- **Avoid**: Exaggeration, marketing language, superlatives without evidence
- **Source facts**: Any claim about a tool, company, pricing, policy, or date MUST include a source URL. Official docs preferred. Add as a **Sources** footnote at end of blog posts and a **Sources** section in Medium prep Notes.
