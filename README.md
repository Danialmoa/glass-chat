# Glass Chat

A floating, glass-effect AI chat overlay for macOS powered by [Claude Code](https://claude.ai) CLI.

![macOS](https://img.shields.io/badge/macOS-only-blue)

## Features

- **Floating glass panel** — macOS native vibrancy/blur effect
- **Double ⌘ to toggle** — appears as an overlay without switching apps
- **Chat with Claude** — uses `claude -p` under the hood, no API key needed
- **Screenshot selection** — draw a bounding box to capture any area of your screen
- **Chat history** — saved to disk, browse and restore past conversations
- **Conversation memory** — Claude remembers previous messages in the chat
- **Snap positioning** — move the panel to left or right edge
- **No Dock icon** — lives in the menu bar tray only

## Requirements

- macOS (Apple Silicon)
- [Claude Code CLI](https://claude.ai) installed and authenticated (`claude` command available in terminal)
- Accessibility permission (for double-Command shortcut)

## Installation

### Option 1: DMG (recommended)

1. Download `Glass Chat-1.0.0-arm64.dmg` from Releases
2. Open the DMG and drag **Glass Chat** to Applications
3. Open Terminal and run:
   ```bash
   xattr -cr /Applications/Glass\ Chat.app
   ```
4. Open **Glass Chat** from Applications

> The `xattr` step is required once because the app is unsigned. macOS quarantines unsigned apps by default.

### Option 2: Build from source

```bash
git clone <repo-url>
cd glass-chat
npm install
npm run build
```

The DMG will be in `dist/`. To run directly without building:

```bash
npm start
```

### Option 3: Terminal alias

Add to your `~/.zshrc`:

```bash
glass() { (cd /path/to/glass-chat && npx electron . </dev/null &>/dev/null &) }
```

## First Launch

1. macOS will ask for **Accessibility** permission — grant it for double-Command detection
2. If using the screenshot feature, grant **Screen Recording** permission when prompted
3. Double-tap ⌘ to toggle the chat window

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
