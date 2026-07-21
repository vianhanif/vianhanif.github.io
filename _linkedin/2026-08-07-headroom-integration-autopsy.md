---
title: "Debugging 9router Headroom: The Silent 404 That Masked a Version Mismatch"
date: 2026-07-25
linked_posts:
  - /posts/headroom-integration-autopsy/
medium_post: https://medium.com/@vianhanif/headroom-integration-autopsy
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

I found a compression proxy on LinkedIn that looked perfect — sit between your app and the LLM providers, strip redundant context, save tokens. I wanted it immediately.

I spent a weekend getting it running. Dashboard toggle. Compression logs. Everything looked good. I closed the tab and moved on.

The feature was running for weeks. It just never actually did anything.

Every request hit an endpoint that didn't exist in the version I was running. The 404 got swallowed — no error, no alert, no trace. Just null, silently, every time. The token numbers weren't moving because nothing was being compressed.

Tracing it back, I found a version mismatch, a fail-open pattern that hid the error, and a provider gap that would've limited the feature anyway even if everything else was right. I ended up gutting the whole integration.

The thing that actually worked? Already running in 9router — RTK was doing token compression just fine. Headroom was meant to augment it, not replace it.

Full postmortem with the complete autopsy.

#Postmortem #LLM #Compression #9router #DeveloperTools

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/headroom-integration-autopsy/

---

# Notes

- [ ] Post text-only (no links in main body)
- [ ] CTA: teaser ends with a hook
- [ ] Hashtags at the bottom of post body
- [ ] Post the comment immediately after publishing post
- [ ] Wait 10-15 minutes before engaging with comments
- [ ] Publish blog post first, then LinkedIn, then schedule Medium
- [ ] Comment links to blog post, not Medium
