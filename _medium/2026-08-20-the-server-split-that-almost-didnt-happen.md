---
title: "The Server Split That Almost Didn't Happen"
date: 2026-08-20
linked_posts:
  - /posts/the-server-split-that-almost-didnt-happen/
status: draft
---

# Medium Prep

## Content to Copy

The first import was the first failure: `ERR_MODULE_NOT_FOUND`. The code wouldn't even boot.

I'd spent three months building toward this moment. Split the monorepo into `api/`, `dashboard/`, `cli/`. Then stalled for two months on the next step — running the API server without the dashboard — because every approach I sketched was a copy-and-babysit fork, and I'd just spent a week escaping exactly that.

The answer was already sitting in the structure: don't fork, *import*. A new repo (`9router-api`) that consumes the source-of-truth repo (`9router`) via `tsconfig.json` path aliases. Two directories as siblings on disk, one Express file re-exporting handlers, `tsx` to run it with ESM + path mapping intact. No submodule, no npm link, no drift.

That was the design. Getting it to actually run was another day.

### The ESM Saga

`open-sse` — 9router's SSE engine — worked fine inside Next.js because Next's bundler papered over the module boundaries. Outside it, esbuild refused to compile: "Top-level await is currently not supported with the cjs output format." One file (`cursor.js`) loaded `http2` via `await import()`. That was fine when Next handled it; not fine when esbuild treated the file as CJS — and it treated it as CJS because `open-sse` sat under a root `package.json` with no `"type": "module"`. Every `.js` file defaulted to CommonJS.

The blunt fix — adding `"type": "module"` at the root — broke the CLI and test suite, which still used `require()`. Reverted. The scoped fix: a minimal `open-sse/package.json` declaring `"type": "module"`, plus two `createRequire` swaps for named imports from CJS packages that Node's ESM loader couldn't statically resolve. I submitted the whole set upstream as PR #3069.

### The First Request Failure

The server booted. Then every chat request returned 400 "Invalid JSON body". The handlers inside 9router expected a Web API `Request` object with a `.json()` method. Express passes its own `Request` — pre-parsed body, no `.json()`. The fix was a wrapper that shims one to the other, with `express.json()` middleware pre-parsing the body so `.json()` could just return `req.body`.

Each fix was small. Finding them took the whole day.

### The Result

Two modes now: full (`~400MB` with the dashboard) or API-only (`~120MB`). Same SQLite, same combo routing, same provider fallback chains. The 9router-api repo has no history of its own — it exists to consume 9router's history.

→ Full story: https://vianhanif.link/posts/the-server-split-that-almost-didnt-happen/

## Tags for Medium

Node.js, ESM, Architecture, Developer Tools, Technical

## Publish Timing

→ Blog series: 2026-08-20
→ Medium: D-0 (same day as blog publish)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources

- 9router-api standalone server: https://github.com/vianhanif/9router-api
- 9router upstream: https://github.com/decolua/9router
- PR #3069 (ESM interop fixes): https://github.com/decolua/9router/pull/3069
- tsx (TypeScript execute engine): https://github.com/privatenumber/tsx
