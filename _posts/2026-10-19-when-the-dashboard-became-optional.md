---
title: "When the Dashboard Became Optional"
date: 2026-10-19
tags: [9router, docker, orchestration, ade, technical]
layout: page
---

The VPS was at 65% disk. Two weeks after I moved the 9router stack to Tencent, I ran `df -h` almost as a reflex and stared at the number. Nothing on this box should be growing. No user uploads. No production logs worth mentioning. It's a proxy for my own LLM traffic and a dashboard I check maybe once a week.

25GB used. On a 40GB disk. Something was wrong.

## What Was Actually Eating the Disk

I SSH'd in and started drilling down. `/var/lib/docker` was 19GB. That's most of it. The layout told the rest of the story:

```
Images          17 total    4 active    3.8GB    3.1GB reclaimable (81%)
Build Cache    189 entries              13.4GB   13.4GB reclaimable (100%)
```

A dozen dangling images — each ~750MB apparent, though most of their layers are shared with the current builds, so the unique reclaimable space was only ~3GB. And a 13.4GB build cache. That's what happens when you iterate on a Dockerfile in production: every `docker compose build` leaves the previous image untagged, and BuildKit's default cache garbage-collection is conservative — on a low-traffic builder, 13GB just sits there.

None of this was serving traffic. It was just... there. Deployment residue.

The cleanup was the easy part:

```bash
docker image prune -f           # drop the dangling image layers (~3GB unique)
docker builder prune --all -f   # clear the 13.4GB build cache
docker rmi decolua/9router:latest
```

Disk went from 25GB used to 8.2GB used. From 65% to 22%. I got 16.8GB back in about thirty seconds — nearly all of it the build cache and shared dangling layers. But the fact that I'd let it get that bad without noticing bothered me more than the number itself.

## The Real Question

Cleanup is a bandage. The interesting question is why I was carrying so much weight in the first place.

The 9router stack has four services running on the VPS: the Next.js dashboard, a standalone LLM API server, Caddy as a reverse proxy, and cloudflared for the tunnel. The dashboard is the heavy one — it's a full Next.js app with a build output near 750MB. The API is lighter, and — this is the important detail — it doesn't depend on the dashboard at runtime at all.

The API repo consumes the 9router codebase as a library. 9router itself is a full Next.js app, but the API wires the code in at build time — every LLM route, provider adapter, and setting is embedded in the API's bundle. The API can serve requests whether the dashboard is up or not. They share a SQLite database on a Docker volume, but neither talks to the other over HTTP.

Which means: for 95% of the time the stack is running, the dashboard is dead weight. I use it to tweak provider settings, check console logs, occasionally test a model. Then I close the tab and forget about it for a week.

## Making It Optional

Docker Compose has profiles for exactly this. You tag a service with `profiles: ["dashboard"]` and it's excluded from `docker compose up -d` unless you explicitly pass `--profile dashboard`. The rest of the stack starts as normal. The dashboard sits as a built, ready-to-run image, and you bring it up when you actually need it.

The change was a single attribute in `docker-compose.yml`:

```yaml
services:
  9router:
    build: ./src/9router
    profiles: ["dashboard"]  # not started unless --profile dashboard
    restart: unless-stopped
    ...
```

Then I had to trim the dependencies. Caddy's `depends_on` referenced the dashboard's healthcheck, which would have blocked startup when the profile was inactive. The API had no runtime dependency on the dashboard at all — that `depends_on` line was leftover from an earlier iteration when the two shared boot state. Both came out.

The CI workflow needed the same treatment. It still builds both images on every push to master (so the dashboard is always current when I decide to run it), still smoke-tests both against `/api/health` on scratch ports, but the final `docker compose up -d` no longer starts the dashboard container. When I first deployed after adding the profile, I expected `--remove-orphans` to clean up the old dashboard container. It didn't — Compose treats profile-gated services as defined-but-inactive, so `--remove-orphans` leaves their containers alone. The old container kept running as if nothing had changed. I had to stop and remove it manually the first time:

```bash
ssh tencent-cloud "cd /opt/9router && docker compose stop 9router && docker compose rm -f 9router"
```

After that, the compose state matched the config. `docker compose ps` showed three services running, the dashboard image sitting quietly on disk, and my zsh aliases now had `9r-dash-start` and `9r-dash-stop` to bring the dashboard up or take it down on demand.

## What Actually Changed

The dashboard subdomain 502s when it's not running. That's fine — Caddy returns the error, cloudflared passes it through, and I know exactly what it means. If I need the dashboard, I type `9r-dash-start` and wait 30 seconds. The image is already built. It comes up healthy.

Memory usage on the VPS dropped by roughly the footprint of a Next.js production process — a few hundred MB in my case. Not a huge number in absolute terms, but on a 2GB VPS it's the difference between "comfortable" and "swapping when a container restarts."

The bigger shift is philosophical. I'd been treating the VPS deployment like a home lab — every service running because I might need it. Optional-by-default is a different posture. It says: the API is the product. Everything else is a tool I bring up when I need it.

## Trade-offs I Noticed

Rebuilding on every deploy means the dashboard image is always current. But it also means the CI job is doing work that most deploys don't use. If I really wanted to be efficient, I'd add a path filter — only rebuild the dashboard image when files that affect its Dockerfile change. I haven't done that yet because the build cost is a couple of minutes and I'd rather keep the deploy graph simple than optimize for cases that don't hurt.

The healthcheck-driven `depends_on` in Caddy's config had referenced the dashboard's healthcheck — a real guarantee, since it meant Caddy wouldn't start serving until the dashboard was ready. With the dashboard optional, Caddy comes up immediately and 502s until the dashboard exists. That's the correct behavior for an optional service, but it's worth being explicit about the trade: you lose the "everything is ready when the stack is up" guarantee.

## The Cleanup Lesson

The disk bloat wasn't the interesting problem. The interesting problem was that I'd built a deployment that assumed every service should be running, and I hadn't questioned that assumption until the VPS started warning me. When I did question it, the answer was obvious: the dashboard is a tool, not a service. Tools don't have to be running to exist.

Docker Compose profiles are a small feature. A single attribute. But they let me express "this service is opt-in" in a way that the deployment pipeline understands, so I don't have to remember to stop it manually or rely on external orchestration.

Now the default is lean. The dashboard is one alias away when I need it. The VPS has 30GB free. And next time I run `df -h`, I probably won't have to.

## Sources

- Docker Compose profiles: [https://docs.docker.com/compose/how-tos/profiles/](https://docs.docker.com/compose/how-tos/profiles/)
- `docker builder prune` docs: [https://docs.docker.com/reference/cli/docker/builder/prune/](https://docs.docker.com/reference/cli/docker/builder/prune/)
- `docker system df` reference: [https://docs.docker.com/reference/cli/docker/system/df/](https://docs.docker.com/reference/cli/docker/system/df/)
- BuildKit cache garbage collection: [https://docs.docker.com/build/cache/garbage-collection/](https://docs.docker.com/build/cache/garbage-collection/)
- Caddy `reverse_proxy` directive: [https://caddyserver.com/docs/caddyfile/directives/reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- 9router: [https://github.com/vianhanif/9router](https://github.com/vianhanif/9router)
- 9router-api: [https://github.com/vianhanif/9router-api](https://github.com/vianhanif/9router-api)
