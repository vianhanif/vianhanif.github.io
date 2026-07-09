---
title: "Why I Stopped Trusting AI Subscriptions"
date: 2026-07-09
linked_posts:
  - /posts/why-i-left-github-copilot/
  - /posts/warp-tried-to-sell-me-ai/
  - /posts/opencode-ten-bucks/
status: draft
---

# Medium Prep

## Content to Copy

On March 25, 2026, GitHub announced that interaction data from Copilot Free, Pro, and Pro+ users would be used for AI model training starting April 24 — opt-out by default, not opt-in. The toggle lives under Settings > Copilot > Privacy. You'd have to know it exists. Just: *your code now belongs to us unless you noticed this buried in a changelog and turned it off.*

I left that afternoon. The trust broke in five minutes — and once broken, I couldn't unsee the rest. I was locked to one provider, paying a subscription, and my data was being fed back into training. That's not ownership. It's tenancy.

I went looking for alternatives. Warp had a beautiful terminal with inline AI completions — the kind of experience that feels like the future for the first hour. Then I hit the pricing page. AI features required the Build plan: $20/month for 1,500 credits, or you could bring your own API key to avoid Warp's metering entirely. Monthly. On top of everything else. Same model, different package.

I uninstalled it that evening. Not angry — tired. Tired of every AI tool becoming a platform with pricing tiers. I wrote the full breakdown of that moment here: [Warp Tried to Sell Me AI Again](https://vianhanif.link/posts/warp-tried-to-sell-me-ai/).

OpenCode came next. A $10/month TUI that worked great — fast models, responsive CLI, solid output. I forgot I was paying per month. Then I hit the cap. OpenCode Go runs on a $60/month usage budget split across three rolling windows: $12 per 5 hours, $30 per week, $60 per month. Three weeks of heavy use and I was staring at a rate-limit error. The feature I was building could wait — but the resentment didn't.

OpenCode isn't bad. It's the best appliance I've used. But it's an appliance — you pay, it works, and you own nothing inside it. I wanted a chassis: something I could swap components in and out of. The difference between using a tool and owning the stack.

You can read the full story of my time with OpenCode and the subscription wall here: [OpenCode: The $10/mo TUI](https://vianhanif.link/posts/opencode-ten-bucks/).

The pattern was everywhere: leave one locked-in tool, find another. Every AI development tool wanted a subscription. Every one was a black box. And every one made decisions about my data, my workflow, my ceiling — without asking.

That's when I realized the best AI development environment isn't the one with the best subscription. It's the one you can take apart and rebuild. Not a better deal. A different model entirely.

For the full story of why I left Copilot and what that search set in motion: [Why I Left GitHub Copilot](https://vianhanif.link/posts/why-i-left-github-copilot/).

## Tags for Medium
ai, copilot, developer-tools, subscriptions, privacy, indie-hacking

## Publish Timing
→ Blog series: all 9 posts published July 9, 2026
→ LinkedIn + Medium: Jul 9, Jul 14, Jul 20 (same-day per topic group)

## Notes

- [ ] Schedule on Fedica: LinkedIn post + comment with Medium link → then post on Medium same day
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Keep Medium-specific intro natural; the first paragraph serves as the hook
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
- **Update**: GitHub later added explicit opt-out toggle ("Allow GitHub to use my data for AI model training") — future data won't be used after opting out. Worth mentioning in comments if readers ask. Noted in the blog post addendum.

## Sources (link these inline when posting)

- GitHub Copilot data policy announcement (Mar 25, 2026): https://github.blog/news-insights/company-news/updates-to-github-copilot-interaction-data-usage-policy/
- GitHub changelog & opt-out details: https://github.blog/changelog/2026-03-25-updates-to-our-privacy-statement-and-terms-of-service-how-we-use-your-data/
- Warp pricing (Build plan $20/mo, BYOK): https://www.warp.dev/pricing
- Warp pricing announcement (Build plan intro): https://www.warp.dev/blog/warp-new-pricing-flexibility-byok
- OpenCode Go docs ($60/month usage budget): https://opencode.ai/docs/go/
