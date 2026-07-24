---
title: "PM2Bar: Get `pm2 list` Visibility Without the Terminal"
date: 2026-09-05
linked_posts:
  - /posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
  - /posts/pm2bar-native-macos-menu-bar-pm2-monitor/
status: draft
---

# Medium Prep

## Content to Copy

In [my last post](/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/), I wrote about a production issue where I was debugging a Bad Gateway through my Cloudflare tunnel. The cause? A PID file that said a process was running when it had been dead for hours. A completely different, orphaned process had taken over the port. The fix was switching from `nohup` + manual PID tracking to pm2 — a process manager that handles restarts, logging, and lifecycle without lying to me.

That worked. My servers stayed up. Crashes got restarted automatically. Everything was handled.

**But now I had a new problem: I checked `pm2 list` constantly.**

Before pm2, I assumed everything was broken. After pm2, I knew everything was handled — but I checked anyway. Terminal open. `pm2 list`. Three processes, all green. Close terminal. Twenty minutes later: repeat. The habit wasn't distrust. It was a visibility problem that pm2 solved at the server level but not at the human level.

I didn't need a monitoring dashboard. I needed a menu bar icon.

## The Project

I built [PM2Bar](https://github.com/vianhanif/PM2Bar) — a native macOS status bar application that mirrors `pm2 list` output in the menu bar. Pure AppKit, no SwiftUI, no Electron. Uses ~20MB RAM. Spawns one `pm2 list --no-color` subprocess every 2 seconds through a login shell, parses the box-drawing table output, and renders each process as a named row with a color-coded status dot.

If any process is `errored`, the menu bar icon turns red and switches to a warning triangle. Green icon = everything fine. No terminal, no SSH, no context switch.

## The 22 Lines That Took the Most Work

The menu rendering is straightforward `NSAttributedString` rows. The clock cycle logic is a `Timer` and a `Process()`. But getting those 22 lines right required solving:

### PATH Hell
A macOS GUI app doesn't inherit the user's shell PATH. `/usr/bin:/bin:/usr/sbin:/sbin` — that's it. No `/usr/local/bin`, no `/opt/homebrew/bin`, no `~/.asdf/shims/pm2`. The app probes known pm2 locations as a search list, then executes through `zsh -l` (login shell) to load the user's `.zshrc` and restore the real PATH. Without this, even finding `pm2` fails, let alone Node.js through nvm/volta shims.

### Blocking the Main Thread
`Timer.scheduledTimer` fires on the main run loop. `Process.run()` + `Process.waitUntilExit()` are synchronous and blocking. Every two seconds, the main thread blocked for ~50ms waiting for `pm2 list` output — fine for a menu bar app, but if `pm2` ever hung, the entire app would freeze. The fix: dispatch `fetch()` to a background queue. A simple `isFetching` guard prevents overlapping timer fires from stacking up processes.

### Pipe Deadlock
`Process` communicates output through `Pipe`. The tricky part: `readDataToEndOfFile()` blocks until the subprocess closes its write-end of the pipe. The correct sequence is `run()` → `waitUntilExit()` → `readDataToEndOfFile()`. If you reverse those — read before wait — and the process spits out more than the 64KB kernel pipe buffer before exiting, you get a classic deadlock: parent waiting for process, process waiting for parent to drain the pipe, nobody moves.

The code gets this right. But it's the kind of bug that works in testing and breaks at 3AM when `pm2 list` suddenly has 20MB to flush.

### Column Drift in the Parser
The hardest part wasn't the Process lifecycle — it was parsing the table output. pm2's box-drawing table shifts column positions when uptime values differ in width ("2h" vs "2 months, 3 days"). My first approach used column indices and broke immediately. The fix: anchor parsing by locating the status keyword (`online`/`errored`/`stopped`/`paused`) in each row, then reading neighboring cells by relative offset. The anchor moves with the data, not the column position.

## The Result

I now have a persistent menu bar icon that tells me, at a glance, whether my AI routing daemons are healthy. No terminal. No `pm2 list`. No context switch. The code is open-source (MIT), and it's a direct follow-up to that original PID file investigation.

Visibility isn't just about logs. It's about knowing you don't need to check.

→ Full story: https://vianhanif.link/posts/pm2bar-native-macos-menu-bar-pm2-monitor/

## Tags for Medium
PM2, macOS, Swift, AppKit, Developer Tools, Technical, Debugging

## Publish Timing
→ Blog series: 2026-09-05
→ Medium: D-0 (same day as blog)
→ LinkedIn: D+1

## Notes

- [ ] Post Medium same day as blog — use canonical URL pointing to blog post
- [ ] Schedule LinkedIn via Fedica for D+1 (next day)
- [ ] This is original Medium content, not a cross-post
- [ ] Ensure all links use full HTTPS URLs (Medium strips relative paths)
- [ ] Consider paywall: storytelling content often performs well behind paywall

## Sources

- PM2Bar repository: https://github.com/vianhanif/PM2Bar
- pm2 docs: https://pm2.keymetrics.io/
- SMAppService documentation: https://developer.apple.com/documentation/servicemanagement/smappservice
- Previous post: Your PID File Is a Lie: https://vianhanif.link/posts/your-pid-file-is-a-lie-what-cloudflare-tunnel-taught-me-about-process-supervision/
