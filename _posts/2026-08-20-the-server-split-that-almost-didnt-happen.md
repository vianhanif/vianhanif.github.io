---
title: "The Server Split That Almost Didn't Happen"
date: 2026-08-20
tags: [9router, technical, architecture]
layout: post
---

Three months ago I wrote about the [monorepo split](/posts/what-i-changed-in-9router/). API server, dashboard, CLI — three workspaces instead of one blob. That was the starting point.

The next step was obvious: run the API server without the dashboard. Lightweight mode. You're hitting `/v1/chat/completions`, not `/dashboard/combos`. But they're the same process. That bothered me.

I'd sketched it out. Then stalled for two months.

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
├── server.ts              # Express, ~120 lines
├── tsconfig.json          # @/ → 9router/src, open-sse/*
└── src/
    └── exports.js         # Re-exports from 9router

9router/                  ← upstream (decolua/9router)
├── src/
├── open-sse/
└── ...                    # Source of truth
```

The dependency works via `tsconfig.json` path aliases. Inside `exports.js`, `@/` points at `9router/src/`, not the API repo's own `src/`. Both repos live as siblings:

```
~/Documents/alvian/
├── 9router/              # 9router source
└── 9router-api/          # new API repo
```

No npm link, no git submodule. Just two directories and a path mapping.

## The Technical Detail That Almost Blocked Everything

Path aliases.

9router uses `@/` to mean `src/`, everywhere. Next.js resolves this automatically. Express doesn't know what `@/` means.

I initially tried copying the handlers. Then I hit every import statement that said `from '@/lib/localDb'` and realized I'd be doing search-and-replace across a dozen files just to make it run.

The solution was `tsx`. It handles ESM natively and reads `tsconfig.json` path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["../9router/src/*"],
      "open-sse/*": ["../9router/open-sse/*"]
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
import { handleChat, initConsoleLogCapture, getConsoleEmitter, getConsoleLogs } from './src/exports.js';

app.post('/v1/chat/completions', handleChat);

app.get('/api/translator/console-logs/stream', (req, res) => {
  const emitter = getConsoleEmitter();
  res.setHeader('Content-Type', 'text/event-stream');
  emitter.on('line', (line) => {
    res.write(`data: ${JSON.stringify({ type: 'line', line })}\n\n`);
  });
  req.on('close', () => emitter.off('line', onLine));
});
```

## The Console Log Problem

One feature almost stopped the whole thing.

The dashboard's live console log page streams via SSE — `/api/translator/console-logs/stream`. When I run the API server without the dashboard, that stream disappears. The console log page would point at nothing.

The original implementation kept console logs in-process via `consoleLogBuffer.js` — an EventEmitter that patches `console.log` and fans out to SSE subscribers. It was tightly coupled to the Next.js process.

The fix: export the same EventEmitter from `exports.js`. The API server exposes the same SSE endpoint. The dashboard's console log page works the same way, whether the API runs standalone or inside Next.js. No redesign — just an export.

## Two Modes

| Mode | Command | Memory |
|------|---------|--------|
| Full | `9r-up` | ~400MB |
| API only | `9r-api-only` | ~120MB |

Same SQLite. Same combo routing. Same provider fallback chains. The difference is what doesn't load: React, Monaco editor, Recharts, all the UI scaffolding. Memory measured via PM2 RSS.

## What This Actually Changed

The API server isn't a fork. It's a separate repo that imports from upstream.

- Upstream adds vision combos? Restart, get them.
- Upstream fixes a token refresh bug? Restart, fixed.
- I add a custom combo in my fork? Same database, same combos file. It gets the combo automatically.

The boundary is cleaner than a fork-within-a-fork. The 9router-api repo has no history of its own — it exists to consume 9router's history.

## What Didn't Change

The dashboard still runs full Next.js. When I'm at my desk, I want the UI — console log page, combo editor, provider management. All of it works in full mode.

The split is optional. That's the point.

---

### Sources
- [9router-api — standalone API server](https://github.com/vianhanif/9router-api)
- [9router upstream](https://github.com/decolua/9router)
- [My 9router fork](https://github.com/vianhanif/9router)
- [tsx — TypeScript execute engine](https://github.com/privatenumber/tsx)
- [The monorepo split](/posts/what-i-changed-in-9router/)
- [Checking upstream v0.5.50](/posts/checking-upstream-what-v0-5-50-brought-back-to-9router/)
