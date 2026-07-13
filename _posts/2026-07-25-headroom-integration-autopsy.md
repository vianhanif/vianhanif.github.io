---
title: "Debugging 9router Headroom: The Silent 404 That Masked a Version Mismatch"
date: 2026-07-25
tags: [9router, postmortem, technical]
layout: page
---

I found Headroom in a random LinkedIn post. It looked great — a compression proxy that sits between your app and the LLM providers, strips redundant context, saves tokens. The pitch was compelling. I wanted it.

I was already running my own [9router](https://github.com/vianhanif/9router) fork by this point. So I tried setting it up myself. Installed the proxy, pointed it at localhost:8787, tested a few requests. Got something working — or so I thought.

Around the same time, my colleague [Aries Maulana](https://github.com/ariesmaulana) mentioned that upstream 9router had shipped a version update with Headroom built in. No need for the manual setup I'd been hacking together — the upstream had already done the integration.

I pulled the newer version. Then came the merge conflicts. Lots of them. My fork had diverged, and reconciling the upstream's headroom integration with my changes was the heaviest work of the whole thing. I resolved everything, tested it, and it seemed to work. The dashboard showed the Headroom toggle. The logs showed compression events. I thought I was done.

I wasn't.

## The Silent 404

Here's the thing about this bug: it was *invisible*. Every request to `/v1/compress` returned a 404. That 404 got swallowed, returned null, formatted as null, and logged as null. No error. No warning. Just... nothing.

I had built a feature that failed silently, every single time, for weeks. The 404 loop looked like this:

```
compressWithHeadroom() → POST localhost:8787/v1/compress → 404
→ null → formatHeadroomLog(null) → no log line
```

The failure remained invisible because of a common, dangerous pattern baked into the integration:

```
if (!res.ok) return null;
```

By design, any non-2xx HTTP code was swallowed — a 404 became `null` just as easily as a 200. The caller saw `null`, assumed "no compression needed," and forwarded the raw full-size request upstream. No log was ever produced because `formatHeadroomLog(null)` returns null itself.

Every. Single. Request.

## Why No `/v1/compress`?

Turns out I made a double assumption that didn't hold — I assumed the endpoint existed, and I assumed I was running the right version.

Headroom v0.5.4 works as a transparent MITM proxy with *hard-coded routes only*:

- `/v1/chat/completions` → OpenAI
- `/v1/messages` → Anthropic
- `/v1beta/models/{model}:generateContent` → Gemini

That's it. No standalone compression. No `/v1/compress`. **In v0.5.4.**

**Here's what I found later**: The `/v1/compress` endpoint *does* exist — in Headroom v0.20.8+. A dedicated `POST /v1/compress` route was added to the proxy server, documented in the wiki, the TypeScript SDK, and the official mkdocs. It accepts an OpenAI-shaped messages array, runs it through the compression pipeline, and returns compressed messages plus token metrics. The endpoint is loopback-gated (localhost only) by design.

So the endpoint exists. I just wasn't running a version of Headroom that had it. The disconnect was a **version mismatch**: the upstream 9router README documented the integration expecting Headroom v0.20.8+, but I was running v0.5.4 where that route hadn't shipped yet.

**Note from the Autopsy**: I initially suspected my monorepo split caused these integration issues. After re-forking both the upstream 9router and the Headroom repos to trace the source, I confirmed that:
1. The `/v1/compress` endpoint is **real** in modern Headroom (v0.20.8+)
2. The upstream 9router integration was architecturally correct for a modern Headroom
3. My monorepo split didn't introduce the bug — but my outdated Headroom version made the feature dead on arrival regardless
4. Even with the correct version, the integration would only work for standard OpenAI/Anthropic/Gemini providers, missing 9router's custom backends entirely

## Six Options, One Winner

I evaluated six approaches:

| Option | Verdict |
|--------|---------|
| Keep as-is | ❌ Does nothing |
| Fix the URL | ❌ No such endpoint exists |
| Fork Headroom | ❌ Scope creep |
| Python microserver with transformers | ❌ ~2.5GB of ML deps for one feature |
| Route through headroom proxy | ❌ Only works for OpenAI/Anthropic/Gemini, not 9router's custom providers |
| **Remove it** | ✅ Done |

Option E—the proxy route—also failed because 9router's providers use custom API paths. opencode-go uses `/zen/go/v1/chat/completions`, groq uses `/openai/v1/chat/completions`. These don't match Headroom's explicit routes. Even when paths *did* match, Headroom hard-forwards to OpenAI, not to 9router's actual backend.

## What Actually Works

RTK compression was already doing the job — compressing tool message content in-line with no ML models, no network calls, zero extra latency. Headroom was meant to fold into 9router's existing token-saving toolkit as a second compression layer. But the integration never worked.

The existing RTK setup didn't need replacing. It needed augmenting — and Headroom wasn't the right tool for that.

## The Cleanup

Removed the dead code:
- `packages/core/rtk/headroom.js` — the `compressWithHeadroom` function
- `apps/server/src/services/headroom.js` — entire service
- `apps/server/src/routes/headroom.js` — entire route
- Various imports and references scattered through the codebase

The dashboard still shows the Headroom toggle, but it's marked inactive with a note explaining why. Gutting that UI is a low-priority cleanup for another day.

## The Lesson

Read the docs before integrating. Don't assume API shapes. And if something's supposed to be saving you money but isn't—maybe check if it's actually running.

## How the Integration Should Have Been Done

The upstream 9router shipped Headroom support, but the integration was never a simple "turn it on and start saving tokens" feature. Headroom is an **infrastructure sidecar** that must be provisioned, started, and maintained at the right version.

### The Three-Step Correct Approach

**1. Provision the sidecar at the right version.** Headroom moves fast — 161 releases since January 2026, with the `/v1/compress` endpoint added between v0.5.4 and v0.20.8. The upstream's `lib/headroom/detect.js` handles finding the binary and checking the Python version, but it doesn't validate the Headroom version. A version check should be part of the health probe.

**2. Start the proxy process.** The upstream's `lib/headroom/process.js` manages the full lifecycle: spawning `headroom proxy --port 8787` as a detached child, writing a PID file, tailing logs, and handling graceful shutdown with SIGTERM → SIGKILL fallback. The management routes (`/api/headroom/start`, `/stop`, `/status`) let the dashboard control this process. Compression only happens when this proxy is *running*, not just when the toggle is flipped.

**3. Use `/v1/compress` as compression middleware, not MITM proxy hop.** 9Router's architecture doesn't route the full request through Headroom. Instead, it extracts messages from the request body, sends them to Headroom's `/v1/compress` endpoint, gets compressed messages back, and splices them into the original body — then the request proceeds to the provider as normal. For Claude-shaped requests, it translates to OpenAI format first, compresses, then translates back. This is a **compression middleware** pattern, not transparent MITM proxying.

### Prerequisites Checklist

| Requirement | Details |
|---|---|
| Python >= 3.10 | Headroom's CLI requires a Python interpreter. The upstream probes multiple candidates including Homebrew, framework installs, and `.local/bin`. |
| Headroom >= v0.20.8 | The `/v1/compress` endpoint was added between v0.5.4 and v0.20.8. Running an older version means the endpoint doesn't exist. |
| `pip install headroom-ai[proxy]` | Installs the base proxy. Extras `[code]` and `[ml]` add AST and ML compression. |
| Proxy process running | The `headroom proxy` binary must be active on `localhost:8787` (default). The dashboard must call `/api/headroom/start` or the process must be started externally. |
| `headroomEnabled: true` in settings | Tells 9Router's chat handler to call `/v1/compress` before forwarding to the provider. |
| Health check passing | The upstream probes `/health` before reporting the proxy as ready, but doesn't validate the API version. |

### The Incompatibility With 9Router

Even with a modern Headroom and all prerequisites met, the integration only works for **OpenAI-shaped messages**. 9Router's custom backends — opencode-go, groq — use non-standard API paths that don't match the routes Headroom understands. The compression middleware can still compress the message body before it's sent to these providers, since it operates on the request body format (OpenAI or Claude) rather than the provider's API path. But this was never tested, because the `/v1/compress` endpoint was unreachable from the start.

### What This Means in Retrospect

The root cause was a **stack of failures**:
1. I was running Headroom v0.5.4, which predates the `/v1/compress` endpoint
2. The upstream 9router integration assumed a modern Headroom with that endpoint
3. No version validation existed in the management layer to catch the mismatch
4. The fail-open pattern swallowed the 404, making the entire feature silently dead
5. Even with everything correct, the integration was limited to OpenAI-shaped providers

If I were to do this again: I'd check the dependency version before assuming the API exists. Then read the upstream's `lib/headroom/` directory — the file names alone (`detect.js`, `process.js`) tell you this is infrastructure management, not a feature flag.

The code's committed. The feature's gone. And now you know about the weekend I built nothing.

## Sources

- [Headroom GitHub](https://github.com/headroomlabs-ai/headroom)
- [Headroom proxy `/v1/compress` endpoint](https://headroomlabs-ai.github.io/headroom/proxy/)
- [Headroom install docs](https://headroom-docs.vercel.app/docs/installation) (Python >= 3.10, pip install headroom-ai[proxy])
- [headroom-ai on PyPI](https://pypi.org/project/headroom-ai/)
- [Upstream 9router](https://github.com/decolua/9router)
- [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk)
- [OpenCode](https://github.com/opencode-ai/opencode)
- [Groq API docs](https://console.groq.com/docs)
