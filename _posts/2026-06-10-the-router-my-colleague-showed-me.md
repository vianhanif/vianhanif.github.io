---
title: "The Router My Colleague Showed Me"
date: 2026-06-10
tags: [9router, router, ai, provider]
---

I was halfway through debugging a stubborn auth issue when two colleagues dropped a link in Slack. No preamble. Just: *"you should check this out."*

It was 9router.

I clicked through the GitHub repo. Readme. Screenshots. A dashboard with 40+ providers in a dropdown. Fallback chains. Format translation. Token compression.

My first thought: this is too much.

I already had OpenCode. It worked. Sure, I'd been hitting the subscription cap three weeks into every billing cycle, watching the spinner hang while the rate-limit error loaded. But that was a subscription problem, not a tooling problem. I could live with it.

I closed the tab. Went back to the auth bug.

---

A week later, it happened again. 1am. Deploy waiting. OpenCode Go had hit its monthly cap. I was staring at a rate-limit error, thinking about how much work I still had left.

The fallback providers existed. They were right there in the account settings — a list of free tier options I'd never configured. I'd been treating them like a joke. A backup for emergencies. Something I'd get around to someday.

When you hit your paid subscription limit three weeks in, having fallback providers isn't optional — it's the difference between shipping a feature and waiting for the reset date.

That night I went back to the 9router repo. Read it again, slower. The 40+ providers stopped looking like noise. They started looking like redundancy. The format translation — converting between OpenAI, Anthropic, and whatever new provider dropped that week — started looking like the thing I'd been manually copy-pasting prompts to work around.

The overload I'd felt before wasn't complexity for its own sake. It was the thing I didn't know I needed until I needed it.

---

I forked it that weekend.

And then I couldn't stop.

The monorepo was the first thing I cracked open. Next.js monolith, routing engine and dashboard tangled together. I wanted to understand what I was actually running. Turns out, the best way to understand something is to try to take it apart.

I was supposed to be customizing. I ended up refactoring.

See [The Tools I Built Around OpenCode](/posts/tools-i-built-around-opencode/) for what led here. See [What I Changed in 9router](/posts/what-i-changed-in-9router/) for what happened next.

*Thanks to [Mahardicka Nurachman](https://github.com/m4har) and [Valerian Dwi Purnomo](https://github.com/valeriandwi) for showing me 9router.*
