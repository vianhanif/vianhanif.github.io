---
title: "Stop Watching Five Tabs: A Terminal-First Approach to K8s Logs"
date: 2026-08-25
tags: [kubernetes, devtools, golang]
layout: page
---

## The Five-Tab Problem

You know the drill.

A request hits five microservices. Something breaks. You open five terminal tabs — `kubectl logs -f pod/foo-abc123`, `kubectl logs -f pod/foo-xyz789` — and scan back and forth, trying to build a mental timeline.

It works. Barely. And it doesn't scale past two services.

I lived that for months on a cluster of interconnected services — the kind where a single user action ripples through `agent-service` → `tez-api` → a worker → back out. Every bug report started with tab-spamming.

Existing tools (Loki, K9s, Stern) solve this differently — dashboards, configs, labels. I wanted something simpler: here are my apps, give me all the logs. From my laptop, no setup.

## From Bash Script to Real Tool

The first version was a bash script. `tail_multiple_logs.sh`. It worked — background subshells for each `kubectl logs` call, prefix each line with `[pod:container]`, dump everything to a file. Functional.

But it was messy. The UX was "spinner + scroll of text". Hard to tell when it was done. No structured output. Hard to share the results.

I rewrote it in Go — first as an experiment, then it became the main version. The rewrite gave me goroutines for real parallelism and structured types instead of string parsing. But more importantly, it gave me a reason to think harder about the experience.

## Iterating on UX

The bash version had a spinner. It spun. You didn't know much else.

The Go rewrite meant I could think about the experience. Each feature came from a real incident, not a roadmap:

**Previous-container logs (`-p`).** A pod crashed, restarted, and the evidence was in the *previous* container instance. Without `-p`, you see an empty stream and think nothing happened. Adding it changed how I debug — I now use it every time. The summary labels previous rows with `:prev`, and you can see exactly how much was lost before the restart.

**Progress bars and exit summary.** Instead of one spinner, I show three phases — finding pods, fetching containers, collecting logs. Each bar freezes when done. After streams finish, a table groups by app → pod → container with line counts and the actual `HH:MM:SS` range parsed from log timestamps, not wall-clock time. Gaps jump out.

**Error/trace filtering.** `-e` for errors, `-g` for pattern matching with `|` OR support. When hunting `ERROR` or a `trace-id`, filtering at source saves a `grep` step. Small win, frequent payoff.

## What It Looks Like Now

```bash
multilogs -s 50m -o tail-logs core-api core-worker
```

Three progress bars update live. When streams finish, a summary table:

```text
── Summary

│ core-api  2 pod(s) · 2 stream(s) · 3108 lines
│   core-api-deployment-7b54bf66c7-2f79w
│     core-api                                     ✔  1557  10:12:03 → 10:22:41
│     core-api:prev                                 ✔   892  09:45:10 → 09:48:03
│   core-api-deployment-7b54bf66c7-425mh
│     core-api                                     ✔  1551  10:12:04 → 10:22:39
│ core-worker  1 pod(s) · 1 stream(s) · 14504 lines
│   core-worker-deployment-77d5fb6445-hknxx
│     core-worker                                   ✔ 14504  10:12:01 → 10:22:58
```

The output file is clean, prefixed by `[pod:container]` — shareable, grep-able, and structured enough that when I paste it into an LLM, it can correlate errors across pods in one shot.

## The Tool That Gets Out of the Way

The guiding principle: **less friction between me and the logs**. No config files. No server to run. No labels to set up. Just apps and time range.

`-s` defines how far back to look (e.g., `50m`), while `-o` saves the output to a file — if you omit the filename, it defaults to `tail_multiple_logs_data.log`. When you want to follow live streams, just drop the `-s` flag.

`kubectl` on `$PATH` is the only dependency. The binary follows the kubectl plugin convention so `kubectl multi-logs` works too.

I use a shell wrapper: `alias multilogs=~/path/to/kubectl-multi-logs`. Now `multilogs -s 30m -e core-api` is a one-liner.

It's not a replacement for Loki — no persistent storage, no cross-namespace queries, no dashboards. It does one thing: tail multiple pod logs at once, from your laptop, zero setup. That limitation is what keeps it simple.

## What I'd Tell Past Me

The UX iterations were worth it. Each step was small, none were optional.

The hardest part of writing terminal tooling is resisting the UI impulse. No dashboards, no config files, no servers — just a binary and `kubectl` on `$PATH`. That constraint forced clarity. Every feature had to earn its place.

One morning a deployment went sideways. I ran `multilogs -s 30m -e`, watched the error timeline across five services in one window, spotted the ordering problem in 90 seconds. No tabs, no scanning. Shipped the fix and closed the incident.

The tool that gets out of the way is the one you actually use.

---

**Repo**: [vianhanif/kubectl-multi-logs](https://github.com/vianhanif/kubectl-multi-logs)