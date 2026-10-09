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

Swapped laptops and my OpenCode sessions vanished. 163 of them. The database still had every row — they were just invisible, scoped to my old home directory path.

If you're moving OpenCode (or any local tool that stores state in SQLite) to a new machine, here's the checklist that saved me:

1. Before wiping the old laptop, copy the whole data folder — not just the DB.
   → `~/.local/share/opencode/` (includes `opencode.db` plus its `-wal` and `-shm` files)

2. On the new machine, put it back at the same path.
   → `~/.local/share/opencode/`

3. Open OpenCode. If your history is empty, don't panic. Restore worked — the sessions are scoped by the directory you launch from.

4. Confirm the data is actually there:
   → `opencode db path` then `sqlite3 <path> ".tables"` and count rows in `session`.

5. Check what path the old sessions are filed under vs your new home.
   → If the OS username changed (e.g. `/Users/old` → `/Users/new`), that mismatch is the whole problem.

6. Back up the DB, then remap with one statement:
   → `UPDATE session SET directory='/Users/NEW', path='NEW' WHERE directory='/Users/OLD';`

7. Verify:
   → `opencode session list` — the full history is back.

Skip `opencode export`/`import` for this. It runs one session at a time, drops child (subagent) sessions, and duplicates rows already in the DB.

Back up the folder. Check the path. One SQL update. That's it.

#OpenCode #DeveloperTools #SQLite #TechTips #Productivity

---

# Comment (First Comment)

Full walkthrough on Medium → https://medium.com/@vianhanif/[slug]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - Format: tip-sharing, step-by-step checklist
  - Comment: "Full walkthrough on Medium → [URL]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
