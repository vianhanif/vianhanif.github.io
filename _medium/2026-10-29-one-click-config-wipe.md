---
layout: page
title: "One Trailing Comma, One Wiped Config: A Data-Loss Bug in 9router's OpenCode Writer"
date: 2026-10-29
linked_posts:
  - /posts/one-click-config-wipe/
  - /posts/opencode-v2-provider-traps/
status: draft
---

# Medium Prep

## Content to Copy

A six-line block of code once stood between me and a deleted OpenCode configuration — MCP servers, plugins, custom models, all of it.

The code read the existing config file, parsed it, and on failure carried on with an empty object. That last part is the bug. If the file was missing, starting fresh is correct. If the file existed but failed to parse, starting fresh means the handler then writes a fresh config back over the user's real one. Two very different situations, one catch block.

The trigger is mundane, which is what makes it bad. [OpenCode config files are JSONC](https://opencode.ai/docs/config) — comments and trailing commas are allowed. A file with a trailing comma is perfectly valid for the tool and a hard failure for `JSON.parse`. The same endpoint already had a read helper that stripped trailing commas, so the file had two parsers with contradictory expectations, and the destructive one won.

The damage is proportional to how much you've configured, and it's silent: the request returns 200, the dashboard says applied, and the JSON left on disk is valid — just empty. You find out days later when a tool your agent used to have stopped existing, and you blame the tool.

I found it while writing a changelog entry for [an unrelated fix in the same file](https://vianhanif.link/posts/opencode-v2-provider-traps/). Describing the write path made me read it line by line, which no amount of testing had made me do — my own config has no comments, so the bug never fired on my machine.

The fix was deletion: stop having two parsers, route the write path through the JSONC-aware reader. That required the reader to strip comments too, with a string-aware regex, because a naive `//` strip eats the `//` in `https://` and turns your `baseURL` into `"https:`. Then I made the set and delete paths symmetric so no branch can reintroduce the bare parse.

Testing a destructive path was the interesting part. A preview deploy answers "did the artifact change?" — not "would this have deleted your config?" So I wrote a unit suite around read-modify-write semantics: existing keys survive an update, comments survive a write, trailing commas parse, a missing file still initialises. A destructive path needs a harness, not a look.

Rules I now apply to any config writer: a parse failure is never "start fresh"; never write back a document you couldn't read; back up and write atomically; assume the file is JSONC; and keep exactly one parser per file.

→ Full story: https://vianhanif.link/posts/one-click-config-wipe/

## Tags for Medium
opencode, developer-tools, debugging, technical, postmortem, data-loss

## Publish Timing
→ Blog series: October 20 → October 29, 2026
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] This post pairs with the misdiagnosis post; publish both in the same week

## Sources
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode V2 docs](https://opencode.ai/v2/docs/)
- [`JSONC` — JSON with Comments](https://code.visualstudio.com/docs/languages/json#_json-with-comments)
- [OpenCode V2 + 9router: 9 Traps in a Custom Provider Setup](https://vianhanif.link/posts/opencode-v2-provider-traps/)
