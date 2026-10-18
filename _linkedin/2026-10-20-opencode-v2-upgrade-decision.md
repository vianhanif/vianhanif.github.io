---
layout: page
title: "OpenCode V2: Deciding to Upgrade and the Journey There"
date: 2026-10-20
linked_posts:
  - /posts/opencode-v2-upgrade-decision/
  - /posts/saving-opencode-sessions-after-laptop-swap/
medium_post: https://medium.com/@vianhanif/[slug]
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

OpenCode shipped V2 quietly. No press release — just a banner in the docs. So I asked myself the only question that matters: *do I actually migrate, and why?*

Here's how I decided:

**The case for upgrading**
- One shared background service per user instead of a fresh start on every command
- A new session store (`session_v2` + a `project` table that tracks the worktree)
- Real session tooling — `list`, `export`, `import` as first-class commands
- Everything new lands on V2 first

**The honest part about speed**
Everyone says "it's faster." I can't prove it against V1 — I never measured a baseline. What I *can* do is measure the current binary: `time opencode --version` → ~0.12s. That's one number, not a comparison. The architectural reason it should be faster is the persistent service. That's an argument, not data.

**The migration**
Back up state and data, replace the binary (V1 and V2 can't coexist under the `opencode` command), start the service, verify with SQL, test the core workflows. Low risk if you back up first.

My session history has been the recurring pain point across two laptop setups. V2's worktree-aware schema is the thing that finally made the upgrade a yes.

#OpenCode #DeveloperTools #DevTools #TechMigration #AI

---

# Comment (First Comment)

Full story on Medium → https://medium.com/@vianhanif/[slug]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a hook
  - Comment: "Full story on Medium → https://medium.com/@vianhanif/[slug]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
