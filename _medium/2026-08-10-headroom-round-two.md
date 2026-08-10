---
layout: page
title: "Headroom, Round Two: Four Walls Between Me and a Working Token Saver"
date: 2026-08-10
linked_posts:
  - /posts/headroom-integration-autopsy/
  - /posts/headroom-round-two/
status: draft
---

# Medium Prep

## Content to Copy

Three days after publishing an [autopsy of a failed Headroom integration](https://vianhanif.link/posts/headroom-integration-autopsy/), I tried again. This time I used upstream 9router's built-in support — the integration that should have been there all along. Infrastructure management, not a feature flag.

Four walls later, it actually worked.

**Wall 1: The Invisible Install.** I had installed Headroom via pipx. The dashboard insisted it wasn't installed. pipx isolates packages into their own venv, so every Python interpreter the dashboard probed couldn't see it. The install was real. It was just invisible.

**Wall 2: The PEP 668 Wall.** macOS Homebrew Python won't let you pip install into it — PEP 668 marks the environment externally managed. The dashboard's one-click install button hit this wall immediately. The fix was `--break-system-packages`, used with eyes open.

**Wall 3: The Binary Nobody Could Find.** Headroom installed, but its binary landed in `~/Library/Python/3.12/bin`, which wasn't on the dashboard's PATH. A `status` check confirmed the error; a symlink closed the loop.

**Wall 4: The Broken Dashboard.** The embedded dashboard rendered as unstyled text soup. The proxy rewrote fetch() calls but not root-relative script tags. A regex fix in the proxy, plus an allowlist entry for the settings page, and everything rendered.

Not a single version mismatch this time. Every failure lived in the seams between tools doing their job correctly in isolation — pipx isolation, PEP 668 packaging policy, PATH assumptions, URL rewriting. The hard part of shipping a sidecar isn't the sidecar. It's the environment detection around it.

The dashboard now shows 992 requests compressed, 2.1M tokens saved. The volume isn't massive — we cap the token-input limit to keep the proxy fast — but it's measured and per-request visible.

→ Full story: https://vianhanif.link/posts/headroom-round-two/

## Tags for Medium

`headroom`, `9router`, `developer-tools`, `technical`, `postmortem`

## Publish Timing

→ Blog series: 2026-08-07 (autopsy) to 2026-08-10 (this post)
→ Medium: D+0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
