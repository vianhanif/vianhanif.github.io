---
title: "Part 2: Designing Privacy-First Analytics for a Static Blog"
date: 2026-10-10
tags: [personal, technical, analytics]
---

This is the design phase. Here's what I want to build:

**Three data points:**
1. Unique visitors per post
2. Average reading depth (as a percentage)
3. All counts visible publicly

**Constraints:**
- No cookies, no PII, no third-party services
- Must work with Jekyll's static generation
- Lightweight JS — no framework
- The numbers on each post page and post list are rendered client-side from a JSON API

**Architecture sketch:**

A small analytics service sits behind the Cloudflare tunnel I already run. It exposes two endpoints:

- `POST /a/v` — tracking beacon (invisible pixel or fetch). Receives post slug, referrer, User-Agent. Returns a session token.
- `GET /a/v/{slug}` — public stats endpoint. Returns unique count and average depth for the given slug.

The tracking uses a privacy-preserving fingerprint: a SHA-256 hash of `(IP + User-Agent + date)`. This means: no stored IPs, no cookies, and unique counts reset daily (so they're "unique visitors today" or I can aggregate for "unique all time" without ever storing raw IPs).

Reading depth is estimated by how far the visitor scrolls, sent as heartbeat events.

**Static site integration:**

A Jekyll include injects the tracking script into every page. Each post template and post list item reads from `/a/v/{slug}` on page load and renders the count inline.

Since the API is on my domain (via the tunnel), no CORS issues. The public stats endpoint doesn't need auth — that's intentional. If someone wants to scrape it, they get to see how popular my posts are. Fine by me.

Next up: building it and finding out what breaks.

---

**Sources:** [Jekyll includes docs](https://jekyllrb.com/docs/includes/) · [Plausible: How we count unique users without cookies](https://plausible.io/data-policy)
