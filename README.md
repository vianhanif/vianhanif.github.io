# vian's notes

Personal blog — [vianhanif.link](https://vianhanif.link). Built with Jekyll + Chirpy, hosted on GitHub Pages.

## Writing Workflow

### 1. Draft → Publish

```
_drafted/2026-08-01-title.md   # Write here first
         ↓
_posts/2026-08-01-title.md      # Move here on publish day
```

`_drafted/` is a custom Jekyll collection — drafts are previewable at `/drafted/:title/` but excluded from the main feed and sitemap. Move the file to `_posts/` when it's live.

### 2. Syndication Prep

After publishing a post (or a batch), the AI generates prep files for two channels:

```
_linkedin/    # Short teaser hook + first-comment link to Medium
_medium/      # Expanded story version with inline links back to blog
```

These are **prep files** — structured notes with copy-ready content and publishing checklists. Posting is manual.

**Scheduling**: [Fedica](https://fedica.com/) — schedule LinkedIn posts and comments in advance.

LinkedIn + Medium publish **same day** per topic group (dates match).

### Content Flow

```
LinkedIn (short teaser, no external links in body)
  └─ comment → Medium (expanded story, links to blog)
                     └─ canonical → Blog (full breakdown)
```

3 LinkedIn posts → 3 Medium posts (one set per topic group, same-day per group).

## Directory Layout

| Path | Purpose |
|------|---------|
| `_posts/` | Published blog posts |
| `_drafted/` | Drafts, previewable offline, excluded from sitemap |
| `_linkedin/` | LinkedIn post text + comment link templates |
| `_medium/` | Medium syndication prep with inline link strategy |
| `_tabs/` | About, Archives, Categories, Tags pages |
| `_data/` | YAML config for contact, social sharing |
| `AGENTS.md` | Context file for AI-assisted writing sessions |
| `notes/` | Publishing strategy docs |
| `.github/workflows/` | GitHub Actions deploy pipeline |

## Deploy

Push to `main` → GitHub Actions builds with `jekyll build` → deploys to Pages.

## Infrastructure

The blog is a static site. No CMS, no database. Git is the source of truth.
