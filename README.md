# Glass Chat

A floating, glass-effect AI chat overlay for macOS — like Spotlight, but for Claude. Toggle it with double ⌘, ask anything, close it. No API key needed — powered by [Claude Code](https://claude.ai) CLI.

![macOS](https://img.shields.io/badge/platform-macOS-blue)
![Electron](https://img.shields.io/badge/electron-41-blue)
![License](https://img.shields.io/badge/license-ISC-green)

<!-- Add a screenshot or GIF here for better engagement -->
<!-- ![Glass Chat Demo](assets/demo.gif) -->

## Why?

Sometimes you just need a quick answer without leaving what you're doing. Glass Chat floats on top of everything as a transparent overlay — toggle it, ask Claude, get an answer with proper markdown formatting, and move on. No app switching, no browser tabs.

## Features

- **Floating glass panel** — macOS native vibrancy/blur, stays on top of all windows
- **Double ⌘ to toggle** — appears instantly as an overlay without switching apps
- **Powered by Claude** — uses `claude -p` under the hood, no API key required
- **Markdown rendering** — responses with bold, headings, tables, code blocks, and lists
- **Screenshot selection** — draw a bounding box to capture any area of your screen
- **Chat history** — saved to disk, browse and restore past conversations
- **Conversation memory** — Claude remembers previous messages in the chat
- **Snap positioning** — snap the panel to the left or right edge of your screen
- **Keyboard-first** — full keyboard navigation for history, shortcuts for everything
- **Menu bar only** — no Dock icon, lives quietly in your tray

## Requirements

- macOS (Apple Silicon)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated (`claude` command available in terminal)
- Accessibility permission (for double-Command shortcut)

## Installation

### Option 1: DMG (recommended)

1. Download `Glass Chat-1.0.0-arm64.dmg` from [Releases](https://github.com/Danialmoa/glass-chat/releases)
2. Open the DMG and drag **Glass Chat** to Applications
3. Open Terminal and run:
   ```bash
   xattr -cr /Applications/Glass\ Chat.app
   ```
4. Open **Glass Chat** from Applications

> The `xattr` step is required once because the app is unsigned. macOS quarantines unsigned apps by default.

### Option 2: Build from source

```bash
git clone https://github.com/Danialmoa/glass-chat.git
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
- [marked](https://github.com/markedjs/marked) — markdown rendering
- [uiohook-napi](https://github.com/nicholasalx/uiohook-napi) — global key listener for double-Command detection
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude -p`) — AI backend

## Contributing

Pull requests welcome. For major changes, please open an issue first.

## License

ISC
