---
title: "Stop Watching Five Tabs: A Terminal-First Approach to K8s Logs"
date: 2026-08-25
linked_posts:
  - /posts/kubectl-multi-logs/
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

A request hits five microservices. Something breaks. You open five terminal tabs — `kubectl logs -f pod/...` — and scan back and forth, trying to build a mental timeline.

It works. Barely. And it doesn't scale past two services.

When I started managing interconnected services where a single user action rippled through five different microservices, debugging felt like tab-spamming. Existing tools like Loki or K9s are great, but they're dashboards — they require config, setup, and state. 

I wanted something I could run from my laptop, zero config, zero setup. Just: here are my apps, give me all the logs.

So I wrote a Go binary that tails multiple pod logs at once. Progress bars for status, an exit summary with auto-parsed timestamps to spot timing gaps, and error filtering that saves me the `grep` step.

It isn't a replacement for Loki. It does one thing: tail multiple pod logs in one window. 

The tool that gets out of the way is the one you actually use.

#Kubernetes #DevOps #GoLang #DeveloperTools #K8s

---

# Comment (First Comment)

Full story → https://vianhanif.link/posts/kubectl-multi-logs/

---

## Notes

- [ ] Post text-only (no links in main body)
- [ ] Schedule via Fedica for D+1
- [ ] CTA: teaser ends with hook
- [ ] Comment: "Full story → https://vianhanif.link/posts/kubectl-multi-logs/"
- [ ] Schedule comment to post immediately after LinkedIn post goes live
- [ ] Wait 10-15 minutes before engaging with comments
