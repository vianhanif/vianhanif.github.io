---
layout: page
title: "Headroom, Round Two: Four Walls Between Me and a Working Token Saver"
date: 2026-08-10
linked_posts:
  - /posts/headroom-integration-autopsy/
  - /posts/headroom-round-two/
medium_post: https://medium.com/p/[import-id]
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

Three days after writing an autopsy about ripping out a broken Headroom integration, I tried again — this time using upstream's built-in support.

Four walls later, it actually worked.

The first wall was the most humbling: I had installed Headroom via pipx, which isolates it into its own venv. Every Python interpreter the dashboard probed couldn't see it. The install was real. It was just invisible.

Then came PEP 668 — macOS Homebrew Python won't let you pip install into it without a flag. Then PATH assumptions. Then broken CSS because the embedded dashboard used root-relative URLs that 404'd against the reverse proxy.

Not a single version mismatch this time. Every failure lived in the seams between tools doing their job correctly in isolation.

The token saver is on. The dashboard renders. 992 requests compressed, 2.1M tokens saved. Not massive — we cap the token-input limit to keep the proxy fast — but it's measured and per-request visible.

#AI #OpenSource #DeveloperTools #Python #DevOps

# Comment (First Comment)

Full story on Medium → https://medium.com/p/[import-id]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a hook
  - Comment: "Full story on Medium → https://medium.com/p/[import-id]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
