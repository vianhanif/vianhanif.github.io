---
title: "The Feature That Did Nothing: My Headroom Integration Postmortem"
date: 2026-07-25
linked_posts:
  - /posts/headroom-integration-autopsy/
status: draft
---

# Medium Prep

## Content to Copy

I found Headroom on LinkedIn. A compression proxy that sits between your app and the LLM providers, strips redundant context, saves tokens. The pitch was compelling. I wanted it immediately.

I was already running a fork of 9router at this point. So I dove in. Manual install, local proxy, pointed it at localhost. Tested a few requests. Got something working — or so I thought.

Around the same time, a colleague mentioned that upstream 9router had shipped a version with Headroom built in. Even better — no need for my hacky setup. I pulled the newer version.

Then came the merge conflicts. Lots of them. My fork had drifted. Reconciling everything was the heaviest part of the whole thing. But I pushed through. Dashboard showed a shiny new Headroom toggle. Logs showed compression events. Everything looked perfect.

I closed the tab and moved on.

## The Thing About This Bug

It was invisible. That's what makes it stick with me.

Every request to the compression endpoint returned a 404. That 404 got swallowed by a common pattern — if the response wasn't okay, return null. No error. No warning. The caller saw null, assumed "no compression needed," and forwarded the full-size request upstream. No log was produced because the logging function returned null when given null.

Every. Single. Request. For weeks.

The feature was running. The toggle was on. The dashboard showed it was active. It just never actually did anything.

I had built a feature that failed silently, perfectly, every time.

## Tracing the Null

When I finally noticed something was off — the token numbers weren't budging — I started following the breadcrumbs. Request goes out. Null comes back. Over and over. I traced it back to the origin, expecting to find a bad URL, a typo, something obvious.

What I found instead was a version mismatch. The endpoint my code was calling doesn't exist in the version of Headroom I was running. It was added two hundred releases later. The upstream documentation assumed a modern version. I was running an old one. No validation caught it. The 404 fell through the floor.

And even if I had the right version, the integration only works for standard OpenAI-shaped requests. My custom backends use different API paths that Headroom doesn't understand. The feature was dead on arrival in more ways than one.

## What I Did About It

I evaluated six approaches. Fixed the URL? The endpoint doesn't exist in my version. Fork Headroom and backport it? Scope creep dressed up as engineering. Route through the proxy directly? Doesn't work with custom providers. Spin up a Python microserver with transformers? 2.5GB of ML dependencies for one feature.

I removed it. Gutted the integration code, pulled the service, deleted the routes. The only remaining sign is a toggle on the dashboard marked "inactive" with a note explaining why.

The thing that actually works — already in the codebase — is RTK compression. Inline token compression, no network calls, no proxy, no 2.5GB of dependencies. It was there the whole time. I just wasn't using it.

## What Stuck With Me

This was never a code problem. The code did exactly what it was told. The problem was a stack of assumptions I didn't verify — version compatibility, endpoint existence, fail behavior. Each one seemed reasonable on its own. Together they created a feature that looked perfect and did nothing.

I check dependency versions before trusting features now. I read the integration code instead of assuming the docs are complete. And when something's supposed to be saving me money but metrics aren't moving, I don't assume it's working just because the toggle says so.

Full postmortem with code, version history, and the complete autopsy.

→ Full story: https://vianhanif.link/posts/headroom-integration-autopsy/

## Tags for Medium
Postmortem, LLM, Compression, 9router, Developer Tools, Technical

## Publish Timing
→ Blog series: 2026-07-25
→ Medium: 2 weeks after blog publish

## Notes

- [ ] Wait 2-4 weeks after blog publish (SEO best practice)
- [ ] This is original Medium content, not a cross-post — no canonical URL needed
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall
