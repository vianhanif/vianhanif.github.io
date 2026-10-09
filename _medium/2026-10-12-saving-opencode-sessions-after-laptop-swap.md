---
layout: page
title: "Saving OpenCode Sessions After Laptop Swap"
date: 2026-10-12
linked_posts:
  - /posts/saving-opencode-sessions-after-laptop-swap/
status: draft
---

# Medium Prep

## Content to Copy

A few days ago my laptop got swapped. First thing I did on the new machine: restore `~/.local/share/opencode` from my backup, open OpenCode, and expect my history. The session list showed exactly one session — the one I'd just started. For a second I thought I'd lost months of work.

I didn't lose anything. The `opencode.db` file, 289 MB of SQLite, still held 163 sessions — titles, timestamps, everything. They just weren't showing up. Every old session was filed under my old laptop's account name (`/Users/pid-alvian`), and OpenCode's session list is scoped to the directory you start it in. The sessions weren't gone; they were filed under a path that didn't exist anymore.

My first instinct was OpenCode's own `export` and `import` commands, but that path would have recreated sessions — silently doubling all 163 rows — and it only handles one session at a time, missing picked child sessions. So I backed up the database and ran a single `UPDATE` to rewrite `directory` and `path` from the old home to the new one. All 163 sessions came back instantly.

Piece of advice: before you assume your data is lost, look at the raw data first. The smallest fix wins.

→ Full story: https://vianhanif.link/posts/saving-opencode-sessions-after-laptop-swap/

## Tags for Medium
[opencode], [database], [sqlite], [developer-tools], [technical]

## Publish Timing
→ Blog post: October 12, 2026
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1 (October 13)

## Notes

- [ ] Post Medium same day as blog publish — use canonical URL pointing to blog post
- [ ] Thumbnail: `/assets/img/opencode-sessions-recovery.png` (also at https://vianhanif.link/assets/img/opencode-sessions-recovery.png)
  - Generated at 2400×1260; Medium scales to ~1500×750 header — best crop is the center band
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources
- [OpenCode documentation](https://opencode.ai/docs/)
- [SQLite `UPDATE` statement](https://www.sqlite.org/lang_update.html)