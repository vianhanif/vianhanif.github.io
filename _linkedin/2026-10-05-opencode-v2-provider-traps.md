---
layout: page
title: "OpenCode V2 + 9router: 9 Traps in a Custom Provider Setup"
date: 2026-10-05
linked_posts:
  - /posts/opencode-v2-provider-traps/
  - /posts/one-click-config-wipe/
  - /posts/opencode-v2-upgrade-decision/
medium_post: https://medium.com/@vianhanif/[slug]
status: draft
---

# LinkedIn Post (Text-Only, Teaser)

Pointing OpenCode V2 at a provider you run yourself isn't hard. It's just full of silent failures. I hit nine, and trap #1 cost me two days while the error blamed the wrong machine.

Trap #1: the provider id is a hyphen, not a slash.

`openai-compatible/responses` → wrong
`openai-compatible-responses` → right

The wrong one still resolves. It just selects a different transport, so OpenCode sends a Responses-shaped body down the chat-completions path. Nothing errors at the lookup. You find out three layers later.

Field notes from the rest of the list:
- A V1-shaped config block is silently ignored by V2. Different key names, no warning.
- A credential in `env` only works in the shell that has it. `Missing auth credential: apiKey` is the symptom.
- `baseURL` with a leading space is a valid JSON string and an invalid URL. Use `cat -et` on macOS.
- Doubt the client before the server. A 30-second `curl` ruled out my server entirely.
- One error message is usually two failures. Read from where the request is issued, not where the error is printed.
- A UI reflects intent; the artifact reflects reality. Grep what was actually written.
- Preview data isn't prod data. `410 ModelDeprecated` in preview, `200` in prod, same code.
- Back up your config before any tool writes it. That one can cost data, not just time.

#OpenCode #DeveloperTools #Debugging #TechNotes #AI

---

# Comment (First Comment)

Full story on Medium → https://medium.com/@vianhanif/[slug]

---

## Notes

- [ ] Schedule via Fedica for D+1 (blog/Medium publish day + 1)
  - Post text-only (no links in main body)
  - CTA: list format performs well for saves/shares
  - Comment: "Full story on Medium → https://medium.com/@vianhanif/[slug]"
  - Schedule comment to post immediately after LinkedIn post goes live
  - Wait 10-15 minutes before engaging with comments
