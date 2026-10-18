---
layout: page
title: "One Trailing Comma, One Wiped Config: A Data-Loss Bug in 9router's OpenCode Writer"
date: 2026-10-11
linked_posts:
  - /posts/one-click-config-wipe/
  - /posts/opencode-v2-provider-traps/
medium_post: https://medium.com/@vianhanif/[slug]
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

I found a bug that would have deleted my entire OpenCode configuration — MCP servers, plugins, custom models — after one click on a button whose whole job is to write that config.

It was six lines:

- Read the config file.
- Parse it.
- If parsing fails, carry on with an empty object.
- Write that object back.

If the file is missing, starting fresh is correct. If the file exists but won't parse, starting fresh means you just deleted it.

The trigger is mundane: OpenCode configs allow comments and trailing commas, so a perfectly valid config can be a hard failure for `JSON.parse`. The same file already had a read helper that handled that. Two parsers, contradictory expectations, and the destructive one won.

Field notes:
- `catch {}` around parsing user data is a data-loss bug in waiting. It converts "I can't read this" into "there was nothing here."
- The worst failure mode is silent success: 200 response, "applied" message, valid-but-empty JSON on disk.
- I found it by writing a changelog, not by testing. My own config had no comments, so the bug never fired for me.
- A destructive path needs a harness, not a look. Clicking a button and seeing a plausible file proves nothing.

Never write back a document you couldn't read.

#OpenCode #DeveloperTools #Debugging #DataLoss #TechNotes

---

# Comment (First Comment)

Full story on Medium → https://medium.com/@vianhanif/[slug]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: teaser ends with a rule, not a question
  - Comment: "Full story on Medium → https://medium.com/@vianhanif/[slug]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
