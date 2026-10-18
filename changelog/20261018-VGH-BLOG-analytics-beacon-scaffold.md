# 20261018-VGH-BLOG-Analytics Beacon Scaffold

**Ticket:** none (assumed `VGH-BLOG`)
**Branch:** `feature/analytics-beacon`
**Status:** WIP / scaffold only — disabled by default, not wired into any layout

## Scope

Add the client-side scaffolding for a privacy-first, self-hosted analytics beacon. Nothing is active after this change.

## What's in this PR

| File | Purpose |
|---|---|
| `_includes/analytics-tracker.html` | Beacon sender. Gated on `site.analytics_beacon.enabled` (false). Skips syndication collections and future-dated posts. |
| `_includes/analytics-stats.html` | Optional per-post count renderer, same gates. |
| `_config.yml` | `analytics_beacon` block, `enabled: false`. Deliberately **not** named `analytics:` to avoid colliding with Chirpy's provider config. |
| `_pages/privacy.md` | Disclosure stub matching the intended data model. |

## Deliberately NOT in this PR

- **No layout injection.** `_layouts/post.html` is not in this repo — it comes from the `jekyll-theme-chirpy` gem. Injecting requires either verifying Chirpy 7.6's `metadata-hook.html` include or overriding the gem's `post.html`. Both are deferred to Phase 0. As a result this PR renders **zero** additional bytes.
- **No backend.** The Go service (`POST /a/v`, `GET /a/v/{slug}`, `GET /a/v/health`) lands in a separate PR.
- **No scroll-depth code.** Deferred until the beacon is proven.

## Testing

- `bundle exec jekyll build` → no new output (includes are not referenced by any layout).
- `analytics_beacon.enabled: false` → both includes emit nothing even when wired in.
- htmlproofer unaffected: no new internal links except `/privacy/` and `/about/`, both resolvable (`_pages/privacy.md`, `_tabs/about.md`).

## Risks / limitations

- Turning `enabled: true` alone does nothing until an include is wired into a layout — intentional fail-safe.
- The `page.date > site.time` guard depends on `future: true` (`_config.yml:76`) semantics; pre-publish pages are exempted by design.
- Backend contract is not yet implemented; `endpoint` is empty by default, so the tracker cannot fire even if enabled.

## Plan

Full evaluation, stack decision, and the mandatory HMAC redesign (the original archived spec's unsalted `SHA-256(IP+UA)` is reversible and must not ship):

- `~/Documents/personal/notes/projects/vianhanif-blog/20261018-VGH-BLOG-analytics-implementation-plan.md`
- `~/Documents/personal/notes/projects/vianhanif-blog/stack-decisions.md` (ADR-0008)
