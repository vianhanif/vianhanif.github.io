---
layout: page
title: Privacy
permalink: /privacy/
---

# Privacy

## Analytics

This site uses a self-hosted, privacy-first analytics service. When enabled:

- **No cookies** and no persistent identifiers are used.
- **No personal data is stored.** Visitor fingerprints are computed with `HMAC-SHA256` using a random key that is generated per day and **deleted at the end of that day**. Once the key is gone, the fingerprint cannot be reversed.
- Only **daily aggregate counters** are stored per post: unique visitor count and scroll-depth milestones. No user-agent strings, referrers, or session records are retained.
- **IP addresses are never stored.** They exist only in memory for the duration of the request.
- Aggregated counts are **public by design** at `/a/v/{slug}`.

No data is sent to Google, Meta, or any third-party ad network.

## Contact

Questions or deletion requests: see [About](/about/).
