---
title: "How I Stopped Committing as the Wrong Person"
date: 2026-10-17
tags: [personal, technical]
layout: post
---

## The Wrong Name in the Log

A few days ago my laptop broke — some keyboard keys stopped working — so the office swapped it for a spare. Re-setting up my workspace meant SSH keys, dotfiles, git config, the lot. Somewhere in that re-setup, git's identity fell through the cracks.

The proof showed up in the log: every commit I'd made since the swap said the same thing — my new laptop's username. Not my GitLab handle. Not my GitHub handle. Just the local account I logged into macOS with.

Nothing was broken — the commits pushed fine. But it didn't look clean, and in any shared repo, the author field is the artifact you leave behind. I keep two identities: a GitLab work account (`alvian.r.hanif` / `alvian.hanif@pasarpolis.com`) and a GitHub account (`vianhanif` / `alvian524@gmail.com`). I'd never had to think about this before — the swap forced me to rebuild my setup, and it made the problem visible.

The stakes were simple: I didn't want work commits carrying the wrong identity, and I didn't want to scrub git history later — rewriting history is a one-way door. I wanted to make the mistake impossible, not just less likely.

## Routing by Directory

My projects already lived in two groups — `~/Documents/work/` and `~/Documents/personal/` — and I could split each further by host: gitlab, github. So instead of configuring git per repository, I configured it per directory using conditional includes in my global `~/.gitconfig`.

I created two identity files, one per account:

```text
# ~/.gitconfig-gitlab
[user]
    name = alvian.r.hanif
    email = alvian.hanif@pasarpolis.com
```

```text
# ~/.gitconfig-github
[user]
    name = vianhanif
    email = alvian524@gmail.com
```

Then I wired them into the main config:

```text
[includeIf "gitdir:~/Documents/work/gitlab/"]
    path = ~/.gitconfig-gitlab

[includeIf "gitdir:~/Documents/work/github/"]
    path = ~/.gitconfig-github

[includeIf "gitdir:~/Documents/personal/github/"]
    path = ~/.gitconfig-github
```

Three directories, two files — my GitHub identity is mine everywhere; the axis that actually mattered was GitLab vs GitHub. Any repo living under one of these trees picks up the matching identity when git looks up its config.

One caveat worth knowing: a per-repo `user.name` or `user.email` in a repo's own `.git/config` overrides these includes. So the migration had a second half — making sure none of my repos carried a stale local identity. `git config user.email` shows the effective value; add `--show-origin` to see where it comes from. (A stricter option: `git config --global user.useConfigOnly true`, which makes git refuse to guess an identity when none is configured.)

## The Migration

I had 13 repositories to sort. I classified each one by its remote (`git remote get-url origin`):

- **Work (GitLab)**: five repos
- **Work (GitHub)**: five repos
- **Personal (GitHub)**: three repos

I proved the routing first: a throwaway repo in each of the three folders, `git config user.email`, the right account, delete. Then I moved the real repos into their folders and confirmed each one resolved the same way.

## Outcome: Config by Location

Now every repo I clone into those folders inherits the correct identity automatically. No per-repo config, no pre-push ritual. The fix took an afternoon — and it's the kind of thing I wish I'd done sooner. The visible result is a git history where every commit says what I actually meant it to say.

---

**Sources**
- [Git Documentation: Conditional Includes](https://git-scm.com/docs/git-config#_conditional_includes)
