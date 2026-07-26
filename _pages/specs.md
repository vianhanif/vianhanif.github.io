---
layout: page
title: Specs
permalink: /specs/
---

# PTY Service — Implementation Plan

## Overview
A PTY (pseudo-terminal) service as shared infrastructure for AI agents: a non-UI server running shell commands as session events, with a CLI client for visualization and interaction.

## Components

```
┌─────────────────┐   TCP/JSON    ┌──────────────────────┐
│  pty-cli         │ ◄─────────►  │  pty-service          │
│  (bubbletea TUI) │    events     │  (creack/pty server)  │
│  - output pane   │    + stdin    │  - session lifecycle  │
│  - input line    │              │  - shell spawning     │
│  - resize        │              │  - event streaming    │
└─────────────────┘              │  - prompt detection   │
                                  └──────────────────────┘
```

## Protocol (Newline-Delimited JSON over TCP)

### Server → Client
| type | fields | description |
|---|---|---|
| `output` | `data: string` | Raw shell output bytes |
| `prompt` | `data: string` | Shell prompt detected |
| `exit` | `code: int` | Process exited |
| `error` | `data: string` | Error message |

### Client → Server
| type | fields | description |
|---|---|---|
| `stdin` | `data: string` | Input to send to shell |
| `resize` | `cols: int, rows: int` | Terminal window resize |

### Session Lifecycle
1. Client connects → server spawns PTY + shell → session created
2. Server streams output/prompt events as shell runs
3. Client sends stdin/resize events
4. Client disconnects → session destroyed (for v1)

## Phase 1: Protocol Design (this doc)
Wire format locked. Session model defined.

## Phase 2: Server (`cmd/pty-service/`)
Go binary using `creack/pty` + `net` package.

### Core loop
```
accept connection → pty.Open → spawn shell
→ goroutine: read pty → detect prompts → write JSON to conn
→ goroutine: read JSON from conn → write to pty stdin
→ on disconnect: signal + wait for process exit
```

### Prompt Detection
- **Heuristic**: regex on output lines ending with `$ `, `% `, `# `, `> ` after last newline
- **Shell marker** (opt-in): set `PS1="__PTY_MARKER__\n$ "` for reliable detection
- Both modes emit `{"type":"prompt","data":"..."}`

### Session model (v1)
- Single session per connection
- No persistence — destroy on disconnect
- Max one shell per session

### Files
```
pty-service/
├── main.go          # TCP listener, accept loop
├── session.go       # Session struct, PTY lifecycle
├── pty.go          # PTY read/write goroutines
├── prompt.go       # Prompt detection heuristics
├── event.go        # JSON event types + marshal
├── go.mod
└── go.sum
```

## Phase 3: CLI Client (`cmd/pty-cli/`)
Go binary using `bubbletea` + `lipgloss`.

### TUI layout
```
┌─────────────────────────────────┐
│  Output Pane (scrollable)       │
│  $ git status                   │
│  On branch main                 │
│  Your branch is up to date...   │
│                                 │
│                                 │
│  $ _                            │
├─────────────────────────────────┤
│  > _command input area_        │
└─────────────────────────────────┘
```

### Behaviour
- Connect to server address on startup (arg: `pty-cli --addr localhost:9876`)
- Output pane auto-scrolls to bottom on new data, PgUp/PgDn to scroll back
- Input line: type + Enter sends `{"type":"stdin","data":"...\n"}`
- SIGWINCH: detect terminal resize, send `{"type":"resize","cols":N,"rows":M}`
- Ctrl+C / Ctrl+D handled gracefully

### Files
```
pty-cli/
├── main.go          # entrypoint, CLI flags
├── tui.go           # bubbletea model + view
├── connect.go       # TCP connection, read/write goroutines
├── event.go         # JSON event parsing
├── go.mod
└── go.sum
```

## Phase 4: Integration & Demo
- Run server: `pty-service --port 9876`
- Connect client: `pty-cli --addr localhost:9876`
- Run commands: `ls -la`, `cat file.txt`, `python3`, `sudo echo test`
- Verify prompt detection, resize, scrollback, reconnect
- Demo script: predefined command sequence showing capability

## Build & Run
```bash
# Build both
cd pty-service && go build -o ../bin/pty-service .
cd pty-cli && go build -o ../bin/pty-cli .

# Run server
./bin/pty-service --port 9876

# Run client (separate terminal)
./bin/pty-cli --addr localhost:9876
```

## Out of Scope (v1)
- Auth / encryption (localhost only)
- Session persistence to disk
- Multi-session multiplexing (one session per connection)
- Remote transport (TCP localhost only)
- Shell integration plugin system
- Replay API (client buffers locally)
- Multi-agent isolation
