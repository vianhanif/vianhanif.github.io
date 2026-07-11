---
title: "The 403 That Wasn't One Problem"
date: 2026-08-01
linked_posts:
  - /posts/the-403-that-wasnt-one-problem/
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

My Warp agent stopped talking to 9router. 403 Forbidden. No config changes. Nothing obvious. Just dead.

I tested with curl — worked fine. So the server was alive. The tunnel was healthy. The problem was something about the Warp requests specifically.

Turned out there were two bugs, not one. And I only found the second because I fixed the first.

First bug: I had three cloudflared processes running at once — two running the same config-based tunnel, one as root from a dashboard feature I'd long forgotten. My correct launchd service was never loaded. The broken Homebrew one was. Infrastructure held together by luck.

Fixed the tunnel. Tested Warp again. Still 403.

Second bug: Cloudflare's WAF was silently blocking Warp's agent traffic. Curl gets a pass. Warp's programmatic headers and cloud-egress IP get blocked. A WAF skip rule fixed it, and I later switched to 9router's built-in API key auth — the right place to do auth anyway.

A 403 at the application layer doesn't mean your application threw it. The infrastructure between your client and your server has more authority to say "no" than your server code does.

#Postmortem #9router #Cloudflare #DeveloperTools #Debugging

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/the-403-that-wasnt-one-problem/

---

# Notes

- [ ] Post text-only (no links in main body)
- [ ] CTA: teaser ends with a hook
- [ ] Hashtags at the bottom of post body
- [ ] Post the comment immediately after publishing post
- [ ] Wait 10-15 minutes before engaging with comments
- [ ] Publish blog post first, then LinkedIn, then schedule Medium
- [ ] Comment links to blog post, not Medium
