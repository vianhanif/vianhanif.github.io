---
title: "Your MCP Server Isn't Timing Out. Your Laptop Is Asleep."
date: 2026-10-21
tags: [macos, pm2, tooling, technical]
layout: post
---

## Wrong Layer

The MCP gateway to my dev tools kept failing. Status: `failed`. Error: `Request timed out`.

My agent sessions run overnight, so I didn't see the failures live — I woke up to a pile of them in `opencode mcp list`. The obvious move was blaming the network. I didn't, at first — I could hit the same endpoint by hand and it answered instantly:

```bash
$ curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' -m 10 \
    -H "Authorization: Bearer $ROUTER9_GATEWAY_KEY" \
    https://9router.vianhanif.link/api/mcp-gateway
200 0.258
```

An authenticated request to the same endpoint, in 258 ms. Same URL my MCP server was failing to reach. If the endpoint is fine and the auth is fine, the bug is in the middle layer — so I spent an afternoon on TLS session resumption, transport type, config interpolation. All clean.

## The Log Pattern I Missed

Then I read the actual log instead of testing the endpoint:

```
~/.local/share/opencode/log/opencode.log

2026-10-17T21:16:17.503Z WARN "mcp connect failed" server=9router-gateway http.span=966929
2026-10-17T22:34:36.366Z WARN "mcp connect failed" server=9router-gateway http.span=940730
2026-10-18T01:09:33.366Z WARN "mcp connect failed" server=9router-gateway http.span=343094
2026-10-18T01:26:18.377Z WARN "mcp connect failed" server=9router-gateway http.span=1348100
2026-10-18T03:40:24.906Z WARN "mcp connect failed" server=9router-gateway http.span=1019868
2026-10-18T03:57:44.066Z WARN "mcp connect failed" server=9router-gateway http.span=2059021

2026-10-18T04:54:05.690Z INFO "mcp connected" server=9router-gateway tools=132 http.span=3070
2026-10-18T05:18:23.745Z INFO "mcp connected" server=9router-gateway tools=132 http.span=2829
```

Timestamps are UTC. Those are the six failures; the two lines at the bottom are successes, shown for contrast.

Successes in the same log are mostly 2.2–3.1 seconds — but not all of them. Seven took over a minute, and the three worst took 52 minutes, 3 hours, and 3 hours. Those crossed sleeps too; they just eventually finished instead of giving up.

So focus on the failures' `http.span`: **343094 to 2059021 milliseconds** — 5.7 minutes to 34 minutes. The slowest failure is 2059 seconds: about **670 times** the slowest fast success (3070 ms), and roughly **8,000 times** my 258 ms curl.

A 34-minute timeout is not a network problem. Something was stopping the clock.

## The Clock That Stopped

Subtract the span from the timestamp and you get when each request actually started:

| Request started (UTC) | Failure logged (UTC) | Span |
|-----------------------|----------------------|------|
| 21:00:10              | 21:16:17             | 16 min |
| 22:18:55              | 22:34:36             | 16 min |
| 01:03:50              | 01:09:33             | 6 min |
| 01:03:50              | 01:26:18             | 22 min |
| 03:23:25              | 03:40:24             | 17 min |
| 03:23:25              | 03:57:44             | 34 min |

Six failures, four distinct start times. Two connections launched at 01:03:50 and two at 03:23:25 — and each pair failed at *different* subsequent wakes. That's the tell: the request doesn't time out on its own schedule. It fails when the machine next wakes.

So I read the sleep log for the same window:

```bash
$ pmset -g log | grep -E 'DarkWake|Entering Sleep' | grep '2026-10-18'
2026-10-18 04:00:10 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/Maintenance 6 secs
2026-10-18 04:00:16 +0700 Sleep      Entering Sleep state due to 'Maintenance Sleep' 961 secs
2026-10-18 04:16:17 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 05:18:55 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 05:18:57 +0700 Sleep      Entering Sleep state due to 'Sleep Service Back to Sleep' 939 secs
2026-10-18 05:34:36 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 08:03:50 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 08:03:52 +0700 Sleep      Entering Sleep state due to 'Sleep Service Back to Sleep' 341 secs
2026-10-18 08:09:33 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/Maintenance 6 secs
2026-10-18 10:23:25 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 10:23:27 +0700 Sleep      Entering Sleep state due to 'Sleep Service Back to Sleep' 1018 secs
2026-10-18 10:40:25 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
2026-10-18 10:40:27 +0700 Sleep      Entering Sleep state due to 'Sleep Service Back to Sleep' 1037 secs
2026-10-18 10:57:44 +0700 DarkWake   DarkWake from Deep Idle [CDNP] : due to ... rtc/SleepService 2 secs
```

The spans match the sleeps to the second. Start times 21:00:10, 22:18:55, 01:03:50, 03:23:25 UTC are 04:00:10, 05:18:55, 08:03:50, 10:23:25 local — all four are DarkWake rows.

The 34-minute case is the clearest: 10:23:25 starts the request, the machine sleeps 1018 s to 10:40:25, sleeps another 1037 s to 10:57:44, and *that's* when the span gives up — 1018 + 1037 = 2055 s against a span of 2059 s.

All six failure entries map to the four DarkWake starts; two of them retried across a second sleep cycle.

The base rate, for honesty: on battery this laptop wakes roughly every 15–18 minutes (the `SleepService` cycle), occasionally sooner. Almost every wake interrupts something mid-request. The gateway failures are just the ones that happen to be connecting when the lid goes down.

## The Mechanism

The timeout wasn't the gateway. It was the sleep.

The span is wall-clock, and wall-clock keeps counting while the CPU is parked. The socket opens, the machine goes back to sleep, and the connection sits frozen until the next wake. Nothing retries — the client waits out the entire sleep and then reports the failure. The "timeout" is 34 minutes because that's how long the machine was asleep, not because anything took 34 minutes.

`caffeinate` fixes it by keeping the machine out of that sleep. But which sleep?

## `caffeinate`: What Each Flag Does

```bash
caffeinate -d    # display stays awake
caffeinate -i    # system doesn't idle-sleep
caffeinate -m    # disk doesn't sleep
caffeinate -s    # no system sleep (honored on AC only)
```

My `coffee-daemon` was running `-d`. Screen lit, machine asleep, connection frozen mid-request. Display sleep and system sleep are independent — turning one off does nothing for the other.

On battery, `-i` is the only flag that actually holds the machine awake. `-s` registers a `PreventSystemSleep` assertion that shows up in the assertion list, but macOS's battery policy overrides it. So `-dims` is the combination I landed on — it costs nothing on AC power and covers everything on battery.

You can see the four assertions live:

```bash
$ pmset -g assertions | grep caffeinate
   pid 78193(caffeinate): [0x000037ea0001889b] PreventUserIdleSystemSleep named: "caffeinate command-line tool"
   pid 78193(caffeinate): [0x000037ea0005889c] PreventUserIdleDisplaySleep named: "caffeinate command-line tool"
   pid 78193(caffeinate): [0x000037ea0007889d] PreventSystemSleep named: "caffeinate command-line tool"
   pid 78193(caffeinate): [0x000037ea000f889e] PreventDiskIdle named: "caffeinate command-line tool"
```

That's `-d`, `-i`, `-s`, `-m`, one assertion each.

## Why PM2 for One Process

Fair objection. A single `caffeinate` process doesn't obviously need a process manager. I'd write a plist and be done.

The reason I didn't: this is my third pm2 app, and the [first two](/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/) are `kubectl port-forward` tunnels to Grafana that I want resurrected and logged the same way. Adding a fourth app to an existing `ecosystem.config.js` is one block of config. A separate plist would have meant a second, differently-shaped launch mechanism for the same class of problem — exactly the thing I [already learned the hard way](/posts/pm2bar-native-macos-menu-bar-pm2-monitor/) isn't worth maintaining.

If you only run one thing, skip pm2. If you already have daemons, this keeps them in one place.

```javascript
// ~/.zsh/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'coffee-daemon',
      namespace: '9router',
      script: '/usr/bin/caffeinate',
      args: '-dims',
      interpreter: 'none',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

```bash
alias coffee-start='pm2 start ~/.zsh/ecosystem.config.js --only coffee-daemon'
alias coffee-stop='pm2 stop coffee-daemon'
alias coffee-status='pm2 list | grep coffee-daemon'
```

That gets the process running and restarting on crash. It does not survive a reboot.

## LaunchAgent: The Part That Actually Bites

```bash
pm2 startup
```

This only *prints* the command. It doesn't install anything:

```
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup launchd -u "$(whoami)" --hp "$HOME"
```

You need to run it with sudo. Two things happen, and the second one is a trap:

```
[PM2] Writing init configuration in /Users/pid-user/Library/LaunchAgents/pm2.PID-Alvian.plist
Warning: Expecting a LaunchDaemons path since the command was run as root. Got LaunchAgents instead.
```

That warning is real. Because the command ran as root, the plist gets written owned by `root`, and the `launchctl load` fires in root's context instead of yours. You can see the result:

```bash
$ launchctl list | grep -i pm2
540	0	application.PM2Bar.app.D6AF2613-...
$ launchctl print gui/$(id -u)/com.PM2
Bad request.
Could not find service "com.PM2" in domain for user gui: 502
```

No `com.PM2`. The agent is not in your GUI domain, so it never runs at your login — it runs as root at boot, where your pm2 socket isn't. Two commands to fix it:

```bash
sudo chown "$(whoami):staff" ~/Library/LaunchAgents/pm2.PID-Alvian.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/pm2.PID-Alvian.plist
$ launchctl list | grep -i pm2
540	0	application.PM2Bar.app.D6AF2613-...
99123	0	com.PM2
```

Don't be alarmed when `com.PM2` disappears from that list a few seconds later. The job runs `pm2 resurrect` once and exits — it's not a long-running daemon, and launchd unloads it after the run. The evidence it worked is the resurrect log:

```bash
$ head -2 /tmp/com.PM2.out
[PM2] Resurrecting
[PM2] Restoring processes located in /Users/pid-user/.pm2/dump.pm2
```

`launchctl load -w` also works, but `bootstrap` is the current API — the older form is what pm2's generated command used, and it's how I got into this mess in the first place.

The plist runs `pm2 resurrect` on login, which restores the snapshot written by `pm2 save`:

```bash
pm2 save
# Successfully saved in ~/.pm2/dump.pm2
```

Miss the save and the plist restores nothing — which is why `pm2 start` everything you want to survive a reboot *before* saving:

```bash
$ python3 -c "import json; [print(a['name'], a['args']) for a in json.load(open('$HOME/.pm2/dump.pm2'))]"
coffee-daemon ['-dims']
grafana-sandbox ['--context', 'arn:aws:eks:...', '--port-forward', 'svc/grafana', '3000:80']
grafana-prod ['--context', 'arn:aws:eks:...', '--port-forward', 'svc/grafana', '3001:80']
```

## The Interactive Password Problem

That `sudo` command needs a password. Run it in a terminal and it just prompts you — no problem. I was driving the whole thing from an agent context, which has no terminal to answer a prompt on, and `sudo -n` exits immediately with `sudo: a terminal is required to read the password`.

`sudo` has a hook for exactly this: `-A` reads the password from `$SUDO_ASKPASS` instead of stdin.

```bash
# ~/.local/bin/sudo-askpass
#!/bin/zsh
/usr/bin/osascript -e 'Tell application "System Events" to display dialog "Enter your macOS sudo password:" default answer "" with hidden answer buttons {"Cancel", "OK"} default button "OK"' -e 'text returned of result'
```

```bash
chmod +x ~/.local/bin/sudo-askpass
# ~/.zshrc
export SUDO_ASKPASS="$HOME/.local/bin/sudo-askpass"
```

Then `sudo -A env PATH="$PATH:/usr/local/bin" ...` pops a dialog. The first time I ran it I got `sudo: no askpass program specified, try setting SUDO_ASKPASS` — because the variable was set in a shell that wasn't the one invoking sudo. `export` matters; a bare assignment doesn't reach the child process.

The dialog comes up in the session that owns the GUI, so it needs to run somewhere `osascript` can talk to System Events. On a fresh machine macOS may also prompt for Automation permission the first time. If the dialog never appears, check that before you check your plist.

## What Leaked

Here's the part I'd rather skip but shouldn't. Before I found the askpass hook, I tried to get past the prompt the obvious wrong way — piping the password into `sudo -S`:

```bash
echo '<password>' | sudo -S pm2 startup launchd -u "$(whoami)" --hp "$HOME"
```

It authenticated. It also put the password in `echo`'s argument list, where anything running as you can read it — and in `~/.zsh_history` besides.

Secrets do not go on the command line. `argv` is readable by anything running as you, and your shell writes it to history. Use environment variables, an askpass helper, or a config file with `400` permissions. Not `argv`.

Remediation, in this order — running shells rewrite the history file from memory on exit:

```bash
rm ~/.zsh_history
unset HISTFILE       # in every other open shell, or it re-creates the file
kill -9 $$           # then close this one
```

`chmod 600` does nothing here; the file is already `600` by default. Rotate the password — that's the actual fix. History cleanup is cosmetic.

## Where It Landed

Two checks after a reboot:

```bash
$ head -3 /tmp/com.PM2.out     # pm2 resurrect ran at login
[PM2] Resurrecting
[PM2] Restoring processes located in /Users/pid-user/.pm2/dump.pm2
[PM2] Process /opt/homebrew/bin/kubectl restored

$ coffee-status
│ 0  │ coffee-daemon │ 9router │ 78193 │ 39m │ online │ 0 │
```

Check the resurrect log, not `launchctl list` — the LaunchAgent is a one-shot job, so it exits (and unloads) once it's done. What persists is what it started.

The MCP gateway connects reliably now. No more wake-time timeouts. It took four flags and one plist — and the flag I'd been missing was the quietest one.

## Sources

- [caffeinate(8) — macOS manual pages](https://keith.github.io/xcode-man-pages/caffeinate.8.html)
- [pm2 startup / resurrect](https://pm2.keymetrics.io/docs/usage/startup/)
- [launchctl(1) — bootstrap and bootout](https://keith.github.io/xcode-man-pages/launchctl.1.html)
- [Your PID File Is a Lie: What Cloudflare Tunnel Taught Me About Process Supervision](/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/)
- [PM2Bar: Get `pm2 list` Visibility Without the Terminal](/posts/pm2bar-native-macos-menu-bar-pm2-monitor/)

