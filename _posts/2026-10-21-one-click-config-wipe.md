---
title: "One Trailing Comma, One Wiped Config: A Data-Loss Bug in 9router's OpenCode Writer"
date: 2026-10-21
tags: [opencode, 9router, technical, postmortem, data-loss]
layout: post
---

I found a bug a few days ago that would have deleted my OpenCode configuration — MCP servers, plugins, custom models, all of it — after a single click on a button whose entire job is to *write* that config. Not corrupt it. Not partially update it. Replace it with an empty file and report success.

It was in `src/app/api/cli-tools/opencode-settings/route.js` — the endpoint that generates your OpenCode config from the 9router dashboard — and it's the more serious of the two bugs I found there. That one made my agent use the wrong transport. This one eats user data. The fix shipped as [PR #45](https://github.com/vianhanif/9router/pull/45), `1ce75921`.

## The Bug Is Six Lines

This is the code, and it looks reasonable:

```js
const configPath = path.join(os.homedir(), ".config/opencode/opencode.json");

let config = {};
try {
  const existing = await fs.readFile(configPath, "utf-8");
  config = JSON.parse(existing);
} catch { /* No existing config */ }
```

Read it as three separate decisions:

1. **If the file doesn't exist** → start from `{}`. Correct. That's the fresh-install case the comment names.
2. **If the file exists but fails to parse** → also start from `{}`. **That's the bug.** Two very different situations, one catch block.
3. **Then the handler mutates `config` and writes the whole object back to disk.** That's what turns a parsing problem into a deletion.

The comment is the tell. `/* No existing config */` describes the intent, and the code does something the comment never claims: it also treats "I couldn't read your config" as "you have no config."

## Why a Valid File Fails to Parse

Here's the part that makes it reachable in normal use: [OpenCode config files are JSONC](https://opencode.ai/docs/config) — comments and trailing commas are allowed.

```jsonc
{
  "providers": { /* ... */ },
  "mcp": { "jira": { "type": "remote", "url": "https://mcp.example.com" } },  // trailing comma below
}
```

That file is fine for OpenCode. It is a hard failure for `JSON.parse`. And the same endpoint already had a *read* helper that knew this — it stripped trailing commas before parsing. So the file had two parsers for one document with contradictory expectations: the reader said "JSONC is fine," the writer said "must be strict JSON or I assume it's empty."

Two parsers, one file, and the destructive one wins.

## Blast Radius, and Why Nobody Notices

The write path replaces the entire document, so the loss is proportional to how much you've configured:

| Gone | Because |
|---|---|
| `mcp` servers | Replaced by the fresh `{}` |
| `plugins` | Same |
| `providers` + custom `models` | Same |
| Permissions, agents, commands | Same |

And nothing reports it:

- The HTTP request succeeds — `200`.
- The dashboard says the config was applied.
- The JSON left on disk is *valid*. It's just empty.

That's the worst shape a data-loss bug can take: silent, plausible, and indistinguishable from success. You find out days later, when a tool your agent used to have simply stopped existing, and you assume the tool is broken rather than that your config was overwritten.

## How I Found It

Not through testing. I found it because I stopped to write the changelog for [the other fix](/posts/opencode-v2-provider-traps/), and describing the write path forced me to actually walk it line by line.

That's uncomfortable, and it's the reason this post exists. On my own machine the bug never fired, because my config has no comments in it. I had read that write path twice while fixing the first bug, shipped it to preview, and still didn't see the empty catch until I tried to describe it in prose.

## The Fix Was Deletion

The repair is to stop having two parsers:

```js
// Reuse readConfig() so a JSONC file (comments / trailing commas) parses
// instead of being silently replaced by a fresh config, which would drop
// the user's mcp/plugins/model entries.
let config = (await readConfig()) || {};
```

That required the reader to strip **comments**, which it didn't do — it only handled trailing commas. A naive strip is a trap:

```js
content.replace(/\/\/.*$/gm, "")   // don't do this
```

That eats the `//` in every URL:

```jsonc
"baseURL": "https://9router.vianhanif.link/v1"
// becomes
"baseURL": "https:
```

So the version I landed is string-aware — anything inside a quoted string is left alone, and only real comments are removed:

```js
const withoutComments = content.replace(
  /("(?:\\.|[^"\\])*")|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g,
  (match, stringLiteral) => stringLiteral ?? "",
);
```

I also made the set and delete paths symmetric — `setProviderEntry` and `deleteProviderEntry` now both read and write through the same helper, so no branch can quietly reintroduce the bare `JSON.parse`.

### The honest caveat about that regex

Replacing a comment with `""` can concatenate adjacent tokens: `1/*c*/2` becomes `12` — valid JSON, wrong value. In a config file comments sit between members, so this never fires in practice, and `" "` would only be strictly safer. I kept `""` and I'd change it the day we parse user files where a number can sit directly against a comment.

## Testing a Destructive Path

This is the part that took real thought, because preview deploys answer the question *"did the artifact change?"* and not the question *"would this have deleted my config?"*

What I did instead:

- Wrote a unit suite around read-modify-write semantics (`tests/unit/opencode-settings-v2.test.js`): existing `mcp`/`plugins`/unknown keys survive a provider update, comments survive a write, trailing commas parse, a missing file still initialises cleanly, and the delete path preserves everything else.
- Verified the sibling fix at the artifact level — grepping the compiled route inside the preview container versus prod — [described in the other post](/posts/opencode-v2-provider-traps/).

Honest caveat: I did not run the suite locally; my checkout has no `node_modules`, so that verification lives in CI. I'm not going to claim a green run I didn't see.

The lesson I keep relearning: **a destructive path needs a harness, not a look.** Clicking a button and seeing a plausible file on disk cannot distinguish "wrote the right thing" from "wrote a smaller, valid, wrong thing."

## Rules I Now Apply to Any Config Writer

1. **A parse failure is never "start fresh."** Distinguish *file missing* (`ENOENT`) from *file unreadable*. Only the first should initialise a default.
2. **Never write back a document you couldn't read.** Fail the request, tell the user, leave the file alone.
3. **Back up before overwriting**, and write atomically — temp file, then rename.
4. **Assume the user's file is JSONC** the tool accepts, or you will delete their comments.
5. **One parser per file.** If the read path and the write path disagree about what a valid file looks like, the write path eventually deletes something.

## Takeaways

- **`catch {}` around parsing user data is a data-loss bug in waiting.** It converts "I can't read this" into "there was nothing here."
- **Silent success is the dangerous failure mode.** A 200 response, an "applied" toast, and an empty-but-valid file.
- **Both bugs in this pair hid in the success path.** A wrong identifier still resolves. An unreadable file still parses — as `{}`.
- **Reading code to document it finds bugs that testing doesn't**, because tests ask the questions you already thought of.

## Sources

- [OpenCode V2 + 9router: 9 Traps in a Custom Provider Setup](/posts/opencode-v2-provider-traps/) — the sibling bug in the same file
- [9router PR #45](https://github.com/vianhanif/9router/pull/45) — the fix, merged
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode providers](https://opencode.ai/docs/providers)
- [OpenCode V2 docs](https://opencode.ai/v2/docs/)
- [`JSONC` / JSON with Comments](https://code.visualstudio.com/docs/languages/json#_json-with-comments)
