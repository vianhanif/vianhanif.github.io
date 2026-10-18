---
layout: page
title: "OpenCode V2 + 9router: 9 Traps in a Custom Provider Setup"
date: 2026-10-23
linked_posts:
  - /posts/opencode-v2-provider-traps/
  - /posts/one-click-config-wipe/
  - /posts/opencode-v2-upgrade-decision/
status: draft
---

# Medium Prep

## Content to Copy

Pointing OpenCode V2 at a provider you run yourself is not hard. It's just full of silent failures. I hit nine of them, and the first one cost me two days while the error message blamed the wrong machine.

The trap that started it: the provider package id is a hyphen, not a slash.

```
@opencode/ai/providers/openai-compatible/responses     ← wrong
@opencode/ai/providers/openai-compatible-responses     ← right
```

The slash form resolves to *a* package, just not the one that selects the Responses transport. Nothing errors at lookup. OpenCode loads something plausible, takes the chat-completions path, and sends a Responses-shaped body down it — so your server rejects the request (`property 'endpoint' is unsupported`) and the client's validator rejects the reply (`SchemaError item.namespace`). Two failures, one wrong character.

The rest of the traps, in the order you'll meet them: a V1-shaped config block being silently ignored (V2 uses `providers` + `settings`, not `provider` + `npm`); a credential living only in `env`, which works until you run from a different shell and get `Missing auth credential: apiKey`; invisible whitespace in `baseURL`; and the instinct to doubt your server first, when a thirty-second `curl` would have ruled it out entirely.

Then there are the verification traps. One error message is usually two failures — read from where the request is issued, not where the error is printed. A UI reflects intent while the artifact reflects reality, so grep what was actually written. And a preview environment seeded from prod will happily route you to a model that's been deprecated since, returning `410 ModelDeprecated` while prod returns `200`.

The last trap is the one that can cost you data: back up your config before any tool writes it. The same tool in this story had a path where a file that failed to parse was treated as empty, then written over. That's [a separate post](https://vianhanif.link/posts/one-click-config-wipe/), because it deserves one.

→ Full story: https://vianhanif.link/posts/opencode-v2-provider-traps/

## Tags for Medium
opencode, developer-tools, debugging, technical, tips

## Publish Timing
→ Blog series: October 20 → October 29, 2026
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] This post is a checklist; keep the numbered traps intact if Medium reformats

## Sources
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode providers](https://opencode.ai/docs/providers)
- [OpenCode V2 docs](https://opencode.ai/v2/docs/)
- [One Trailing Comma, One Wiped Config](https://vianhanif.link/posts/one-click-config-wipe/)
