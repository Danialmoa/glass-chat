const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  desktopCapturer,
  screen,
  Tray,
  Menu,
  nativeImage,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const HISTORY_DIR = path.join(
  process.env.HOME || "",
  ".glass-chat",
  "history"
);
// Ensure history directory exists
fs.mkdirSync(HISTORY_DIR, { recursive: true });

let mainWindow = null;
let tray = null;

function createWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 360;
  const winHeight = 640;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - 20,
    y: Math.round((screenHeight - winHeight) / 2),
    frame: false,
    transparent: true,
    vibrancy: "fullscreen-ui",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    skipTaskbar: true,
    show: false,
    hasShadow: true,
    roundedCorners: true,
    visibleOnAllWorkspaces: false,
    fullscreenable: false,
    // Panel type — floats above without stealing focus from other apps
    type: "panel",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // "floating" level = above normal windows but doesn't steal app focus
  mainWindow.setAlwaysOnTop(true, "floating");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("blur", () => {
    // Don't hide on blur — user might be copying text or interacting elsewhere
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true, "floating");
    mainWindow.setVisibleOnAllWorkspaces(false);
    // Focus the text input
    mainWindow.webContents.send("focus-input");
  }
}

function createTray() {
  // Create a simple tray icon (a small circle)
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA" +
      "mElEQVQ4T2NkoBAwUqifYdAb8D8oKOg/AwPDfwYGhv/ILmNkZPzPxMT4n4mJ6T8zM/" +
      "N/FhaW/6ysrP9ZWVn/s7Gx/Wdnz/nPwXGdgeP/tf8cHEz/OTmZ/3NxMf/n5mb+z8PD" +
      "/J+Xl/k/Hx/zf35+5v8CAsz/BQWZ/wsJMf0XFmb6LyrK+F9MjPG/uDjDfwkJBjIDAA" +
      "CbOC0RnImnQgAAAABJRU5ErkJggg=="
  );
  tray = new Tray(icon);
  tray.setToolTip("Glass Chat — Ctrl+Space to toggle");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show/Hide", click: toggleWindow },
    { label: "New Chat", click: () => mainWindow?.webContents.send("new-chat") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", toggleWindow);
}

// ── Double-Command detection using uiohook-napi ──
const { uIOhook, UiohookKey } = require("uiohook-napi");

let lastMetaUp = 0;
let metaDownWithoutOtherKey = false;
const DOUBLE_TAP_MS = 400;

function setupDoubleCmdListener() {
  const { systemPreferences, dialog } = require("electron");

  // Check if we have accessibility access (required for global key monitoring)
  const trusted = systemPreferences.isTrustedAccessibilityClient(true);

  if (trusted) {
    startUiohook();
  } else {
    // Show a message and fall back to Cmd+Shift+Space
    console.log(
      "Accessibility not granted — using Cmd+Shift+Space as shortcut"
    );
    globalShortcut.register("CommandOrControl+Shift+Space", toggleWindow);

    // Re-check every 3 seconds in case user grants permission
    const checkInterval = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        clearInterval(checkInterval);
        globalShortcut.unregister("CommandOrControl+Shift+Space");
        startUiohook();
        console.log("Accessibility granted — switched to double-Command");
      }
    }, 3000);
  }
}

function startUiohook() {
  try {
    uIOhook.on("keydown", (e) => {
      if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
        metaDownWithoutOtherKey = true;
      } else {
        metaDownWithoutOtherKey = false;
      }
    });

    uIOhook.on("keyup", (e) => {
      if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
        if (!metaDownWithoutOtherKey) return;

        const now = Date.now();
        if (now - lastMetaUp < DOUBLE_TAP_MS) {
          lastMetaUp = 0;
          toggleWindow();
        } else {
          lastMetaUp = now;
        }
      }
    });

    uIOhook.start();
  } catch (err) {
    console.error("uiohook failed, falling back to Cmd+Shift+Space:", err.message);
    globalShortcut.register("CommandOrControl+Shift+Space", toggleWindow);
  }
}

app.whenReady().then(() => {
  // Hide from Dock — app lives only in tray + floating panel
  app.dock.hide();

  createWindow();
  createTray();
  setupDoubleCmdListener();

  app.on("activate", () => {
    if (!mainWindow) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", (e) => {
  // Keep app running in tray
  e.preventDefault?.();
});

// ── IPC Handlers ──

let activeProcess = null;

ipcMain.handle("send-message", async (event, message, imageBase64) => {
  // Kill any existing process
  if (activeProcess) {
    activeProcess.kill();
    activeProcess = null;
  }

  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text"];

    // Find claude binary
    const claudePath = findClaude();

    // Build the prompt
    let prompt = message;
    if (imageBase64) {
      // Save screenshot to temp file and reference it
      const tmpPath = path.join(app.getPath("temp"), "glass-chat-screenshot.png");
      const fs = require("fs");
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(tmpPath, Buffer.from(base64Data, "base64"));
      prompt = `[Screenshot attached at ${tmpPath}]\n\n${message}`;
    }

    const env = { ...process.env };
    // Remove CLAUDECODE env var so claude doesn't think it's nested
    delete env.CLAUDECODE;

    activeProcess = spawn(claudePath, args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    activeProcess.stdout.on("data", (data) => {
      let chunk = data.toString();
      // Trim leading whitespace from very first chunk
      if (output === "") {
        chunk = chunk.trimStart();
      }
      output += chunk;
      if (chunk) {
        event.sender.send("response-chunk", chunk);
      }
    });

    activeProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    activeProcess.on("close", (code) => {
      activeProcess = null;
      if (code === 0) {
        event.sender.send("response-done");
        resolve(output);
      } else {
        const errMsg = error || `claude exited with code ${code}`;
        event.sender.send("response-error", errMsg);
        reject(new Error(errMsg));
      }
    });

    activeProcess.on("error", (err) => {
      activeProcess = null;
      event.sender.send("response-error", err.message);
      reject(err);
    });

    // Send prompt to stdin
    activeProcess.stdin.write(prompt);
    activeProcess.stdin.end();
  });
});

ipcMain.handle("stop-response", () => {
  if (activeProcess) {
    activeProcess.kill();
    activeProcess = null;
  }
});

ipcMain.handle("take-screenshot", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 },
  });
  if (sources.length > 0) {
    return sources[0].thumbnail.toDataURL();
  }
  return null;
});

ipcMain.handle("close-window", () => {
  mainWindow?.hide();
});

ipcMain.handle("minimize-window", () => {
  mainWindow?.hide();
});

// When user clicks on the panel, give it keyboard focus so they can type
ipcMain.handle("focus-window", () => {
  if (mainWindow) {
    mainWindow.focus();
  }
});

// ── History IPC handlers ──

ipcMain.handle("save-chat", (event, chatData) => {
  // chatData = { id, title, messages: [{role, text}], updatedAt }
  const filePath = path.join(HISTORY_DIR, `${chatData.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2));
});

ipcMain.handle("load-history", () => {
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith(".json"));
  const chats = [];
  for (const file of files) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(HISTORY_DIR, file), "utf-8")
      );
      chats.push({
        id: data.id,
        title: data.title,
        updatedAt: data.updatedAt,
        messageCount: data.messages?.length || 0,
      });
    } catch {}
  }
  // Sort by most recent first
  chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return chats;
});

ipcMain.handle("load-chat", (event, chatId) => {
  const filePath = path.join(HISTORY_DIR, `${chatId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
});

ipcMain.handle("delete-chat", (event, chatId) => {
  const filePath = path.join(HISTORY_DIR, `${chatId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

function findClaude() {
  const { execSync } = require("child_process");
  try {
    const result = execSync("which claude", {
      env: { ...process.env, CLAUDECODE: undefined },
    })
      .toString()
      .trim();
    if (result) return result;
  } catch {}

  // Common paths
  const paths = [
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
    path.join(process.env.HOME || "", ".claude", "bin", "claude"),
    path.join(process.env.HOME || "", ".npm-global", "bin", "claude"),
  ];

  const fs = require("fs");
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }

  return "claude"; // fallback, hope it's in PATH
}
