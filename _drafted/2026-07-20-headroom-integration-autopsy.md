---
title: "The Headroom Debacle: When Good Ideas Go Silent"
layout: page
---

So, I spent a weekend building a feature that did absolutely nothing.

Let me back up. 9Router routes LLM requests to various providers—opencode-go, groq, cerebras, the usual suspects. Tokens add up, costs add up, and I figured, *what if we could compress the messages before sending them?*

Enter Headroom. It's this nifty proxy that sits between your app and the LLM providers and compresses the conversation context. The pitch is compelling: less tokens, less money, same output quality. Sign me up.

I integrated it into 9Router's routing pipeline. The code path looked clean: chat.js → chatCore.js → rtk/headroom.js → HTTP POST localhost:8787/v1/compress. I wrote the integration, tested it locally, shipped it.

And then... nothing happened. Costs stayed the same. Token counts didn't budge.

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
| Route through headroom proxy | ❌ Only works for OpenAI/Anthropic/Gemini, not 9Router's custom providers |
| **Remove it** | ✅ Done |

Option E—the proxy route—also failed because 9Router's providers use custom API paths. opencode-go uses `/zen/go/v1/chat/completions`, groq uses `/openai/v1/chat/completions`. These don't match Headroom's explicit routes. Even when paths *did* match, Headroom hard-forwards to OpenAI, not to 9Router's actual backend.

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
