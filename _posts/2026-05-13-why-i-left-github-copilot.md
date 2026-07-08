---
title: "Why I Left GitHub Copilot"
date: 2026-05-13
tags: [copilot, privacy, ai, tooling]
---

I remember the exact moment. Scrolling through GitHub notifications on a Tuesday afternoon and there it was — an announcement buried in a changelog. GitHub Copilot would start using your prompts to train future models.

Not opt-in. Not a checkbox buried in settings. Just: *your code now belongs to us unless you noticed this and turned it off.*

I sat with that for a while. The sick feeling of realizing a tool I'd been depending on had made a decision about my work without asking, without warning, without recourse.

Copilot wasn't bad. It worked. The suggestions were decent and the latency was fine. I'd tolerated the telemetry because every AI tool collects something. But this was different. This wasn't telemetry — it was training data. And the announcement made clear: if you used Copilot, your prompts were part of the pool.

The trust broke in five minutes. And once broken, I couldn't unsee the longer list of trade-offs I'd been ignoring.

**Locked to one provider.** Copilot routes to a single model — your prompts go to Microsoft, you get completions back. You can't swap in a different model when it's faster, cheaper, or better at your specific task. The model has a bad day? You have a bad day. That's the deal.

**Opaque about data use.** When the announcement dropped, there was no clear answer for what happened to prompt history, what counts as "non-public" code, or how to verify any of it. The privacy policy was a maze. I didn't trust it before the announcement. After it, I couldn't justify the trust deficit.

**Expensive for what it offered.** The subscription cost wasn't enormous, but it was bundled with a service that rate-limited me, didn't let me use my own API keys, and now wanted my data on top. I was paying to be the product.

What stung most was the helplessness. A black box you can't look inside, can't modify, can't fork. If the provider changes the terms — and they will — your only move is to accept or walk. That's not ownership. It's tenancy.

I remember one late-night debugging session where Copilot kept suggesting the same wrong approach — some outdated pattern baked into its training. I couldn't swap the model. Couldn't see what influenced the suggestions. Couldn't turn off the completion and inject a different one without leaving the editor entirely. That was the moment I knew the problem wasn't the quality of suggestions — it was that my entire workflow depended on someone else's decisions.

I thought about staying. The convenience was real. Copilot inserted itself into VS Code seamlessly, no config files, no routing decisions, no API keys to manage. Leaving meant giving that up and building something myself. For a few days I told myself it wasn't that bad.

But the privacy change wasn't going to revert. And I knew the pattern: once a provider trains on user data, they don't un-train. The decision was locked in before I ever saw the announcement.

I started searching for alternatives. There were options — GitHub Copilot wasn't the only game in town, and the market was already shifting. But everything I found had the same DNA: proprietary, opaque, subscription-based. Better or worse at suggesting code, sure, but still a black box where you pay and they decide.

The moment I realized alternatives didn't exist in the form I wanted was also the moment I realized I'd have to build it. I needed a setup where every piece was mine to control, swap, or replace. Not a better subscription. A different model entirely.

I didn't leave Copilot because it stopped working. I left because I stopped trusting it.

The search led me to two places: a $10/month TUI, and a terminal that came back around two years later with a completely different pitch. Neither was what I expected.

See [Warp Tried to Sell Me AI Again](./2026-05-20-warp-tried-to-sell-me-ai.md) for what came next — and how I almost didn't give Warp a second chance. For the record, [OpenCode](./2026-05-27-opencode-ten-bucks.md) came before Warp did, and it taught me more about what I actually needed from an AI coding tool.
