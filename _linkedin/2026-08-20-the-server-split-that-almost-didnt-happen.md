---
layout: page
title: "The Server Split That Almost Didn't Happen"
date: 2026-08-20
linked_posts:
  - /posts/the-server-split-that-almost-didnt-happen/
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

I split a monorepo API server into its own standalone process. It was supposed to be simple — point the imports, wire up Express, done.

Three things almost killed it:

- A bare import that Node refused to resolve — ERR_MODULE_NOT_FOUND on the first boot
- An ESM/CJS module boundary that worked inside Next.js but died under plain Node (top-level await, UMD interop, scoped package.json fixes)
- Express Request vs Web API Request — every chat request returned 400 "Invalid JSON body" because the handler expected `.json()` on the request object

Each fix was small. Finding them took the whole day. The ESM fixes went upstream as a PR.

Result: ~96MB → ~23MB memory. Same routing, same provider chains, same keys — config ported over, not shared live. Just without React, Monaco, and the dashboard UI.

The repo has no history of its own — it exists to consume another repo's history.

#NodeJS #ESM #Architecture #OpenSource #DeveloperTools

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/the-server-split-that-almost-didnt-happen/

---

# Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
- [ ] Post text-only (no links in main body)
- [ ] CTA: teaser ends with a hook
- [ ] Hashtags at the bottom of post body
- [ ] Post the comment immediately after publishing post
- [ ] Wait 10-15 minutes before engaging with comments
- [ ] Publish blog post first, then Medium, then LinkedIn D+1
- [ ] Comment links to blog post, not Medium
