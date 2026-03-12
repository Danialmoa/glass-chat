# Glass Chat

A floating, glass-effect AI chat overlay for macOS powered by [Claude Code](https://claude.ai) CLI.

![macOS](https://img.shields.io/badge/macOS-only-blue)

## Features

- **Floating glass panel** — macOS native vibrancy/blur effect
- **Double ⌘ to toggle** — appears as an overlay without switching apps
- **Chat with Claude** — uses `claude -p` under the hood, no API key needed
- **Screenshot support** — capture and attach your screen
- **Chat history** — saved to disk, browse and restore past conversations
- **Snap positioning** — move the panel to left or right edge
- **Auto-start** — launches on login via LaunchAgent
- **No Dock icon** — lives in the menu bar tray only

## Requirements

- macOS
- [Node.js](https://nodejs.org/) (v18+)
- [Claude Code CLI](https://claude.ai) installed and authenticated
- Accessibility permission (for double-Command shortcut)

## Installation

```bash
cd glass-chat
npm install
npm start
```

### Auto-start on login

A LaunchAgent is set up at `~/Library/LaunchAgents/com.glasschat.app.plist`.

To disable auto-start:
```bash
launchctl unload ~/Library/LaunchAgents/com.glasschat.app.plist
```

To re-enable:
```bash
launchctl load ~/Library/LaunchAgents/com.glasschat.app.plist
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ ⌘` | Toggle Glass Chat |
| `⌘ N` | New chat |
| `⌘ H` | Chat history |
| `⌘ ←` | Snap to left |
| `⌘ →` | Snap to right |
| `Enter` | Send message |
| `Shift Enter` | New line |
| `Esc` | Close panel |

### In History

| Shortcut | Action |
|---|---|
| `↑ ↓` | Navigate chats |
| `Enter` | Open selected |
| `Delete` | Delete selected |

## Data

Chat history is stored at `~/.glass-chat/history/` as JSON files.

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop app framework
- [uiohook-napi](https://github.com/nicholasalx/uiohook-napi) — global key listener for double-Command detection
- [Claude Code CLI](https://claude.ai) (`claude -p`) — AI backend
