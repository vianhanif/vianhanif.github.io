---
title: "Stop Watching Five Tabs: A Terminal-First Approach to K8s Logs"
date: 2026-08-25
linked_posts:
  - /posts/kubectl-multi-logs/
status: draft
---

# Medium Prep

## Content to Copy

If you've ever had to debug a distributed system — a handful of microservices where a single request touches five pods before it's done — you know the drill. You open five terminal tabs, run `kubectl logs -f` in each, and scan back and forth trying to build a mental timeline of what happened where and in what order.

It works. Barely. And it doesn't scale past two services.

I lived that for months maintaining a cluster of interconnected services. When a bug report came in, the first thing I did was open tabs. Every incident started with the same tedious manual process — and the same hope that I wouldn't miss the critical error while looking at the wrong tab.

Existing solutions (Loki, K9s, Stern) solve this problem well — if you want a dashboard or a config-based approach. I wanted something I could run from my laptop with zero setup. Just: here are my apps, give me all the logs.

The first version was a bash script — background subshells per `kubectl logs`, `[pod:container]` prefix on each line, dump to a file. Functional but frustrating: a spinner and scroll of text with no way to tell when it finished or if a stream had failed silently.

I rewrote it in Go. The real improvement wasn't parallelism (though goroutines helped) — it was thinking harder about the experience. Each feature came from a specific debugging pain:

- A pod crashed and the evidence was in the previous container instance. The `-p` flag pulls previous container logs, and the summary labels them with `:prev` — so you can see exactly how much context was lost before the restart.
- Instead of one spinning indicator, three progress bars show which phase you're in — finding pods, fetching containers, collecting logs. Each freezes when done, so you always know your position.
- When streams finish, the summary table groups by app → pod → container with line counts and actual `HH:MM:SS` ranges parsed from log timestamps (not wall-clock time). Gaps in the timeline jump out immediately.

The result is a single binary that depends only on `kubectl` being on `$PATH`. No config files, no server, no dashboards. It follows the kubectl plugin convention, so `kubectl multi-logs` works too. And because the output is clean and structured, I can paste it into an LLM and get cross-pod error correlation in one shot.

It isn't a replacement for Loki. No persistent storage, no cross-namespace queries, no dashboards. It does one thing: tail multiple pod logs at once, from your laptop, zero setup. That limitation is what keeps it simple.

One morning a deployment went sideways. I ran it with `-s 30m -e`, watched the error timeline across five services in one window, spotted the ordering problem in 90 seconds. No tabs, no scanning. Shipped the fix and closed the incident.

The tool that gets out of the way is the one you actually use.

→ Full story: https://vianhanif.link/posts/kubectl-multi-logs/

## Tags for Medium
Kubernetes, DevOps, Go, Developer Tools, K8s, CLI, Technical, Debugging

## Publish Timing
→ Blog series: 2026-08-25
→ Medium: 2 weeks after blog publish

## Notes

- [ ] Wait 2-4 weeks after blog publish
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: how-to content sometimes performs well behind paywall

## Sources

- kubectl-multi-logs repo: https://github.com/vianhanif/kubectl-multi-logs
- go-pretty: https://github.com/jedib0t/go-pretty
- Stern: https://github.com/stern/stern
- K9s: https://k9scli.io/
- Loki: https://grafana.com/oss/loki/
