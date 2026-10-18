---
title: "OpenCode V2 + 9router: 9 Traps in a Custom Provider Setup"
date: 2026-10-15
tags: [opencode, 9router, technical, tips, guide]
layout: post
---

If you're pointing OpenCode V2 at a provider you run yourself — your own router, a proxy, a local model server — this is the list of things that will quietly waste your time.

I hit all nine. Trap #1 cost me two days, and the error message blamed the wrong machine for the entire time. They're ordered roughly the way you'll hit them.

## The Short Version

| Trap | What you'll see |
|---|---|
| 1. Wrong provider id | Wrong protocol used, no error at startup |
| 2. V1 config shape | Your config block is ignored entirely |
| 3. Credential only in `env` | `Missing auth credential: apiKey` |
| 4. Whitespace in `baseURL` | Requests fail or land nowhere |
| 5. Assuming your server broke | An error that names your server |
| 6. Reading the error top-down | You debug the last layer, not the first |
| 7. Trusting the UI | You verify the wrong thing |
| 8. Trusting preview data | A regression that isn't one |
| 9. Letting a tool write your config | Silent data loss |

## Do This Before You Start

Whatever else you do, take a copy. Every other trap is an hour of your life; trap #9 is your config.

```bash
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak
```

## The Shape You're Aiming For

So you're not debugging against a fragment. This is a complete, working V2 custom provider, trimmed to one entry:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "providers": {
    "my-router": {
      "name": "My Router",
      "package": "@opencode/ai/providers/openai-compatible-responses",
      "settings": {
        "baseURL": "https://my-router.example/v1",
        "apiKey": "sk-..."
      },
      "models": {
        "General": { "modelID": "General", "name": "General" }
      }
    }
  }
}
```

Four things to note. The provider sits under `providers`, keyed by whatever name you'll want to type later. `package` is a hyphenated id. The endpoint and key live in `settings`. And every model needs both a `modelID` and a display `name`. Hold your file next to this and most of the traps below explain themselves.

## 1. The provider id uses a hyphen, not a slash

This is the one that cost me two days.

```json
"package": "@opencode/ai/providers/openai-compatible/responses"    // wrong
"package": "@opencode/ai/providers/openai-compatible-responses"    // right
```

The slash form isn't invalid — it resolves to *a* package. Just not the one that selects the Responses transport. So OpenCode loads something plausible, takes the chat-completions path, and sends a Responses-shaped body down it.

There is no "unknown provider package" warning, because nothing failed at the lookup. If you're generating this id from a template, a copy-paste, or a tool's config writer, verify the exact string before you debug anything else.

**Check it with:** `grep -c 'openai-compatible/responses' ~/.config/opencode/opencode.json` — should be `0`. If it prints `1`, stop reading and fix that first.

## 2. A V1-shaped config block is silently ignored

V1 selected providers with `provider`, `npm: "@ai-sdk/openai-compatible"`, and `options`. V2 uses `providers` and `settings`. A tool that still emits the V1 shape doesn't error — V2 just doesn't see it.

If you migrated and your provider "looks configured" but OpenCode behaves as if it isn't, this is why.

**Check it with:** `grep -c '"npm"' ~/.config/opencode/opencode.json` — should be `0` in a V2 config.

## 3. Put the credential in `settings.apiKey`, not just `env`

This block looks complete and isn't:

```json
"env": ["ROUTER9_API_KEY"]
```

It works exactly as long as that variable is set in the shell you happen to be using. Run it from a different shell, a CI job, an editor plugin, or a preview container and you get:

```
Error: Missing auth credential: apiKey
```

The durable form carries the credential:

```json
"settings": {
  "baseURL": "https://9router.vianhanif.link/v1",
  "apiKey": "sk-..."
}
```

**Rule:** a config that *depends on* an env var is not the same as a config that *carries* the credential. If a machine is allowed to differ, this will differ.

## 4. Whitespace in `baseURL`

Mine had a leading space. It survived editing, looked fine, and produced a URL that didn't resolve the way I expected. In a JSON file, `"baseURL": " https://…"` is a valid string with a junk character at the front.

**Check it with:** `grep baseURL ~/.config/opencode/opencode.json | cat -et` — on macOS `cat -et` marks line ends with `$`, which makes a stray leading space obvious. (`cat -A` is GNU-only; a Mac answers `illegal option -- A`.)

## 5. Rule out your server before you doubt your client

When an error names your server, don't trust the name — test the server by hand:

```bash
curl -s -X POST https://your-router.example/v1/responses \
  -H "Authorization: Bearer $YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"General","input":"reply OK","stream":false}'
```

`General` is 9router's model id — substitute whatever your own router accepts. What matters here is the status code, not the model.

Mine answered `200` the entire time the agent was failing. Thirty seconds of `curl` eliminated the entire server side of the problem and told me the difference had to be in the *request the client was sending*.

## 6. One error message usually means two failures

Mine was a chain, and the visible error was the last link:

1. OpenCode sent the request to the wrong route.
2. Your server correctly rejected it — `property 'endpoint' is unsupported`.
3. The client's response validator rejected the reply — `SchemaError item.namespace`.

Read that from the bottom and you'll debug the validator. Read it from the top and you'll find the transport. **Start where the request is issued, not where the error is printed.**

## 7. Verify what the tool wrote, not what the UI says

If a dashboard, wizard, or config generator wrote your file, don't confirm it by looking at the dashboard. Look at the artifact:

```bash
# what did the tool actually put on disk?
grep -c "openai-compatible-responses" ~/.config/opencode/opencode.json
```

In my case the same check inside the built container was the only thing that proved the fix had shipped — the UI happily rendered the new format while the deployed build still emitted the old one. A UI reflects intent. The artifact reflects reality.

## 8. Preview data isn't prod data

A preview environment seeded from prod will happily route you to a model that has since been deprecated upstream. Mine returned:

```
410 ModelDeprecated
```

…while prod returned `200` for the same request. **Check it with:** send the same request to both hosts and compare status codes.

```bash
for h in preview.example prod.example; do
  curl -s -o /dev/null -w "$h %{http_code}\n" -X POST "https://$h/v1/responses" \
    -H "Authorization: Bearer $YOUR_KEY" -H "Content-Type: application/json" \
    -d '{"model":"General","input":"ping","stream":false}'
done
# prod.example 200
# preview.example 410   <- same code, different data
```

Nothing was wrong with the code. Before you treat a preview-only failure as a regression, confirm the preview's *data* matches what you're comparing against.

## 9. Back up your config before any tool writes it

Every trap above is recoverable. This one isn't always.

```bash
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.bak
```

The reason is in [the other half of this story](/posts/one-click-config-wipe/): the same tool that writes your config had a path where a file that failed to parse was treated as an empty config, then written over. I only found that one because writing up trap #1 forced me to read this exact write path line by line. Backup is cheap insurance against a code path you haven't read.

## Triage Table

| Symptom | Most likely trap |
|---|---|
| Wrong protocol used, no startup error | 1 |
| Provider configured but ignored | 2 |
| `Missing auth credential: apiKey` | 3 |
| Request fails to reach the server at all | 4 |
| Error names your server | 5, 6 |
| Works locally, fails in another environment | 3 |
| "It's fixed" but behaviour didn't change | 7 |
| Fails only in preview | 8 |
| Config looks smaller than you left it | 9 |

## Sources

- [One Trailing Comma, One Wiped Config](/posts/one-click-config-wipe/) — trap #9, in full
- [OpenCode configuration](https://opencode.ai/docs/config)
- [OpenCode providers](https://opencode.ai/docs/providers)
- [OpenCode V2 docs](https://opencode.ai/v2/docs/)

**Elsewhere in this series:** [Deciding to Upgrade](/posts/opencode-v2-upgrade-decision/) · [Saving Sessions After Laptop Swap](/posts/saving-opencode-sessions-after-laptop-swap/) · [What Changed in OpenCode V2](/posts/what-changed-in-opencode-v2/)
