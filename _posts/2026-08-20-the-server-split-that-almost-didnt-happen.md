---
title: "The Server Split That Almost Didn't Happen"
date: 2026-08-20
tags: [9router, technical, architecture]
layout: post
---

The first import was the first failure: 'ERR_MODULE_NOT_FOUND'. The code wouldn't even boot. Or so I told myself.

But back up. Three months ago I wrote about the [monorepo split](/posts/what-i-changed-in-9router/). API server, dashboard, CLI — three workspaces instead of one blob. That was the starting point.

The next step was obvious: run the API server without the dashboard. Lightweight mode. You're hitting `/v1/chat/completions`, not `/dashboard/combos`. But they're the same process. That bothered me.

I'd sketched it out. Then stalled for two months, caught between the fear of maintaining yet another fork and the pressure to ship. Every approach I sketched was a copy-and-babysit fork — and I'd just spent a week escaping exactly that.

## Why It Got Stuck

The obvious approach was copying. Take the chat handlers, paste into a new directory, wire up Express routes. I'd done that with the monorepo split.

But I'd also just spent a week merging upstream changes, discovering that every copied file becomes a future conflict. `apps/api/` and `apps/dashboard/` — both inside the repo, both drifting from upstream with every merge I pulled.

Copying the handlers would mean the same thing, again: a parallel codebase I'd have to babysit through every upstream update. One bad merge where I fixed something in the fork but not upstream, and now the two handlers do the same thing slightly differently. That's the split that would have haunted me.

I wanted a cleaner boundary. I just didn't know what "clean" looked like yet.

## The Answer That Was Already There

The answer was sitting in the monorepo structure itself.

What I needed was the inverse: a repo that *imports* from 9router, rather than a fork that *contains* it.

The architecture that finally worked:

```
9router-api/               ← my new repo
├── server.ts              # Express, ~290 lines
├── tsconfig.json          # @/ → 9router/src, open-sse/*
└── src/
    └── exports.js         # Re-exports from 9router

9router/                  ← my working copy (fork of decolua/9router)
├── src/
├── open-sse/             # SSE engine behind every provider handler
└── ...                    # Source of truth
```

The dependency works via `tsconfig.json` path aliases. The `tsconfig` maps `@/` to `../9router/src/`, so the import specifiers inside `exports.js` resolve into 9router's tree, not the API repo's own `src/`. Both repos live as siblings:

```
~/Documents/alvian/
├── 9router/              # 9router source
└── 9router-api/          # new API repo
```

No npm link, no git submodule. Just two directories and a path mapping.

## The Technical Detail That Blocked Everything

Path aliases.

9router uses `@/` to mean `src/`, everywhere. Next.js resolves this automatically. Express doesn't know what `@/` means.

I initially tried copying the handlers. Then I hit every import statement that said `from '@/lib/localDb'` and realized I'd be doing search-and-replace across a dozen files just to make it run.

The solution was `tsx`. It handles ESM natively and reads `tsconfig.json` path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["../9router/src/*"],
      "open-sse/*": ["../9router/open-sse/*"],
      "9router/*": ["../9router/*"]
    }
  }
}
```

`exports.js` becomes the contract between the two:

```javascript
export { handleChat } from '@/sse/handlers/chat.js';
export { getSettings, validateApiKey } from '@/lib/localDb.js';
export { initConsoleLogCapture, getConsoleLogs, getConsoleEmitter } from '@/lib/consoleLogBuffer.js';
```

When upstream adds a new export, I add it to `exports.js`. When upstream updates a handler, the API server gets it on restart. No copy-paste drift.

The `server.ts` mounts the handlers:

```typescript
import { handleChat, initConsoleLogCapture, getConsoleEmitter } from './src/exports.js';

initConsoleLogCapture(); // patch console.log before anything runs

app.post('/v1/chat/completions', (req, res) => wrapExpressRequest(req, res, handleChat));

app.get('/api/translator/console-logs/stream', (req, res) => {
  const emitter = getConsoleEmitter();
  res.setHeader('Content-Type', 'text/event-stream');

  const onLine = (line) => res.write(`data: ${JSON.stringify({ type: 'line', line })}\n\n`);
  emitter.on('line', onLine);

  req.on('close', () => emitter.off('line', onLine));
});
```

## The Console Log Problem

One feature almost stopped the whole thing.

The dashboard's live console log page streams via SSE — `/api/translator/console-logs/stream`. When I run the API server without the dashboard, that stream disappears. The console log page would point at nothing.

The original implementation kept console logs in-process via `consoleLogBuffer.js` — an EventEmitter that patches `console.log` and fans out to SSE subscribers. It was tightly coupled to the Next.js process.

The fix: export the same EventEmitter from `exports.js`. The API server exposes the same SSE endpoint. The dashboard's console log page works the same way, whether the API runs standalone or inside Next.js. No redesign — just an export.

## The ESM Saga

The split worked in the bundler and died outside it.

The first failure was a bare import I'd forgotten to map: `import '9router/open-sse/index.js'` — `ERR_MODULE_NOT_FOUND`. That's why the tsconfig has that third `9router/*` entry.

Then esbuild refused to compile: "Top-level await is currently not supported with the cjs output format." `cursor.js` loads `http2` with a top-level `await import()`. Fine in Next's bundler. Not fine when esbuild decides the file is CJS — and it decides that because `open-sse` sits under a root `package.json` with no `"type": "module"` field, so every `.js` file defaults to CommonJS.

I tried the blunt fix first: add `"type": "module"` at the 9router root. It worked — and it broke the CLI and test suite, which still use `require()`. Reverted. The scoped fix: a minimal `open-sse/package.json` declaring `"type": "module"` (which makes top-level await legal in esbuild's ESM output), plus two `createRequire` swaps where Node's ESM loader couldn't statically resolve named exports from CJS packages — one for `http2` in cursor.js (kills the TLA error) and one for `node-machine-id` in machineId.js.

I submitted the whole set upstream as [PR #3069](https://github.com/decolua/9router/pull/3069) — it's still open at the time of writing, but the standalone server runs on the fixed branch.

## The First Request Failure

The code booted, but every chat request returned 400 "Invalid JSON body". 

The handlers inside `9router` expect a Web API `Request` object (with `.json()`), but Express passes its own `Request` object (pre-parsed body). My first `server.ts` was passing the Express object directly.

The fix: a wrapper that shims the Express request into the Web API standard, with express.json() middleware pre-parsing the body.

```typescript
const wrapExpressRequest = async (req, res, handler) => {
  const webRequest = {
    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    headers: { get: (name) => req.get(name) },
    json: async () => req.body, // Express parsed the body already
  };
  const response = await handler(webRequest);
  // ... then convert the Web Response back to Express res
};

app.post('/v1/chat/completions', (req, res) => wrapExpressRequest(req, res, handleChat));
```

It was the final "almost didn't happen" hurdle.

## Two Modes

| Mode | Command | Memory |
|------|---------|--------|
| Full | `9r-up` | ~400MB |
| API only | `9r-api-only` | ~120MB |

Same SQLite. Same combo routing. Same provider fallback chains. The difference is what doesn't load: React, Monaco editor, Recharts, all the UI scaffolding. Memory measured via PM2 RSS.

## What This Actually Changed

The API server isn't a fork; it's a separate repo that imports from upstream 9router. Updates propagate via restart, no more porting drift. The module boundary is clean, the request mapping (Web API vs. Express) is transport-agnostic, and the server is fully Node-compatible. It has no history of its own — it exists to consume 9router's history.

## What Didn't Change

The dashboard still runs full Next.js. When I'm at my desk, I want the UI — console log page, combo editor, provider management. All of it works in full mode.

The split is optional. That's the point. The 9router-api repo has no history of its own — it exists to consume 9router's history.

---

### Sources
- [9router-api — standalone API server](https://github.com/vianhanif/9router-api)
- [9router upstream](https://github.com/decolua/9router)
- [My 9router fork](https://github.com/vianhanif/9router)
- [tsx — TypeScript execute engine](https://github.com/privatenumber/tsx)
- [PR #3069 — ESM interop fixes for open-sse](https://github.com/decolua/9router/pull/3069)
- [The monorepo split](/posts/what-i-changed-in-9router/)
- [Checking upstream v0.5.50](/posts/checking-upstream-what-v0-5-50-brought-back-to-9router/)
