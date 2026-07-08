---
title: "The Server That Lived in My Sight"
layout: page
---

Two ways to start the same server. One worked. The other gave me Bad Gateway. They ran the same code, listened on the same port, used the same config.

The difference was invisible.

## The Two Aliases

```
9r-start='cd .../9router && nohup npm run start -w apps/server \
  > ~/.9router/server.log 2>&1 & echo $! > server.pid && cd - > /dev/null'

9r-debug='cd .../9router && env 9ROUTER_DEBUG=1 npm run dev -w apps/server'
```

One runs production (`node src/index.js`) in the background with `nohup`. The other runs dev (`node --watch src/index.js`) in the foreground with debug logging.

When I used `9r-start`, the tunnel returned 502 Bad Gateway. When I switched to `9r-debug`, requests went through. Same server, same code, same config. Only the launch method changed.

## The Investigation

The server log showed four successful requests, then silence. No crash. No error. No exit message. The log just *stopped*.

The PID file said `9495`. That process was dead. But `lsof -i :20128` showed the port was LISTEN — held by PID 10411, a different process entirely, started separately.

Neither matched the PID file. The production server (`node src/index.js`) was running fine. The dev server (`node --watch src/index.js`) was crashing and restarting on a loop. The alias didn't know about either — it recorded the wrong PID when the original process died, and the port stayed occupied by a process it couldn't track.

When I killed everything and ran `9r-start` cleanly, the production server bound the port and served traffic — until I looked away. Then it died silently, and the stale PID file left me thinking it was still running.

The tunnel didn't care about PID files. It connected to `localhost:20128`. If nothing answered, it returned 502. Reliably.

## The Crash Loop I Couldn't See

With `nohup`, every crash is silent. `nohup` starts the process, detaches it, and the terminal moves on. If the process crashes one second later — EADDRINUSE, unhandled rejection, anything — nobody knows. The log file gets the start line from npm, maybe a few requests, and then nothing. No stack trace unless the process explicitly wrote one. The dev server with `--watch` restarts automatically and prints errors to the terminal. It survives crashes by restarting immediately. The production server with `nohup` survives nothing.

So `9r-debug` felt more reliable. It wasn't — it was just less hidden.

I confirmed this by running the server through a process manager that exposed restarts. Kill port 20128. Start the server. It logged "listening," then crashed. Restarted. Crashed again. Over and over. The crash had always been there — I just couldn't see it behind `nohup`.

## The Fix

I'd been managing the server the UNIX way: background process, PID file, shell loops. It works for long-lived daemons with stable runtimes. Node.js servers with network dependencies and concurrent port contention are not that.

```
alias 9r-start='cd .../9router && NODE_ENV=production \
  pm2 start npm --name 9router-server -- start -w apps/server && cd - > /dev/null'
alias 9r-stop='pm2 delete 9router-server'
alias 9r-logs='pm2 logs 9router-server'
alias 9r-restart='pm2 restart 9router-server'
```

`9r-start` boots via pm2 instead of `nohup`. `9r-stop` deletes the pm2-managed process. `9r-logs` streams real-time logs. `9r-restart` bounces the process without fishing for PIDs.

pm2 tracks the process itself. No stale PID files. No orphaned servers holding ports. When a crash happens — which it will — pm2 restarts immediately.

## The Lesson

What you can't see will break in production. And no, checking `ps aux` won't save you — the process was running. Just the wrong one. The wrong server lived right in my sight the whole time.
