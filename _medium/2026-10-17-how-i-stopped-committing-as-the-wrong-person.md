---
layout: page
title: "How I Stopped Committing as the Wrong Person"
date: 2026-10-17
linked_posts:
  - /posts/how-i-stopped-committing-as-the-wrong-person/
status: draft
---

# Medium Prep

## Content to Copy

A few days ago my laptop broke — some keyboard keys stopped working — and the office swapped it for a spare. Re-setting up my workspace meant SSH keys, dotfiles, git config, the lot. Somewhere in that re-setup, git's identity fell through the cracks: my history filled up with commits authored by the new laptop's username.

Nothing was broken, but nothing looked right either — and in any shared repo, the author field is the artifact you leave behind. I keep two real identities: a GitLab work account (`alvian.hanif@pasarpolis.com`) and a GitHub account (`alvian524@gmail.com`). I'd never had to think about this before — the swap forced me to rebuild my setup, and it made the problem visible.

The fix turned out to be structural. My repositories were already grouped by intent: work-GitLab, work-GitHub, and personal-GitHub folders. Git's [conditional includes](https://git-scm.com/docs/git-config#_conditional_includes) let me map each folder to the right identity file, so any repo inside a folder inherits the correct `user.name` and `user.email` automatically. My GitHub identity is mine everywhere — the axis that actually mattered was GitLab vs GitHub.

One trap I hit along the way: a repo-level `user.name` in its own `.git/config` overrides these includes, so I also had to make sure none of my 13 repositories carried a stale local identity. The migration took an afternoon; the result is permanent. Every repo I clone now inherits the right identity, and the wrong name never shows up in the log again.

→ Full story: https://vianhanif.link/posts/how-i-stopped-committing-as-the-wrong-person/

## Tags for Medium
[git], [productivity], [developer-tools], [technical]

## Publish Timing
→ Blog post: October 17, 2026
→ Medium: D-0 (same day as blog publish)

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources
- [Git Documentation: Conditional Includes](https://git-scm.com/docs/git-config#_conditional_includes)
