---
title: "The Headroom Debacle: When Good Ideas Go Silent"
date: 2026-07-15
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

Every. Single. Request.

## Why No `/v1/compress`?

Turns out I made a fundamental assumption that didn't hold. I assumed Headroom exposed a compression endpoint like `/v1/compress`. It doesn't.

Headroom v0.5.4 works as a transparent MITM proxy with *hard-coded routes only*:

- `/v1/chat/completions` → OpenAI
- `/v1/messages` → Anthropic
- `/v1beta/models/{model}:generateContent` → Gemini

That's it. No standalone compression. No `/v1/compress`. My feature was calling an endpoint that never existed.

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

RTK compression, which was already in the codebase, actually does the job. It compresses tool message content in-line—no ML models, no network calls, zero extra latency. Works for OpenAI tool content, Claude tool results, and several other formats.

That's what I should have been using all along.

## The Cleanup

Removed the dead code:
- `packages/core/rtk/headroom.js` — the `compressWithHeadroom` function
- `apps/server/src/services/headroom.js` — entire service
- `apps/server/src/routes/headroom.js` — entire route
- Various imports and references scattered through the codebase

The dashboard still shows the Headroom toggle, but it's marked inactive with a note explaining why. Gutting that UI is a low-priority cleanup for another day.

## The Lesson

Read the docs before integrating. Don't assume API shapes. And if something's supposed to be saving you money but isn't—maybe check if it's actually running.

The code's committed. The feature's gone. And now you know about the weekend I built nothing.
