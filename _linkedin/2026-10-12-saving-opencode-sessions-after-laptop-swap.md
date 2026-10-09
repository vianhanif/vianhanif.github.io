---
layout: page
title: "Saving OpenCode Sessions After Laptop Swap"
date: 2026-10-12
linked_posts:
  - /posts/saving-opencode-sessions-after-laptop-swap/
medium_post: https://medium.com/@vianhanif/[slug]
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

Restored my OpenCode sessions from backup after a laptop swap. The TUI showed one session. The database showed 163. The data was never gone — just invisible because the session list filters by home directory, and the old path `/Users/pid-alvian` doesn't exist anymore.

The fix: one SQL `UPDATE`. Remapped `directory` and `path` columns, and all 163 sessions appeared. Real quick win: before trusting an export/import detour that would have duplicated everything, I checked what the data actually was.

Sometimes the smallest change is the right one.

#OpenCode #DatabaseDebugging #TechTroubleshooting #DataIntegrity #SoftwareTools

---

# Comment (First Comment)

Full story on Medium → https://medium.com/@vianhanif/[slug]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with curiosity hook
  - Comment: "Full story on Medium → [URL]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
