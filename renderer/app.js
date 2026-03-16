const chatContainer = document.getElementById("chat-container");
const messageInput = document.getElementById("message-input");
const btnSend = document.getElementById("btn-send");
const btnStop = document.getElementById("btn-stop");
const btnScreenshot = document.getElementById("btn-screenshot");
const btnHelp = document.getElementById("btn-help");
const helpPanel = document.getElementById("help-panel");
const btnCloseHelp = document.getElementById("btn-close-help");
const btnMinimize = document.getElementById("btn-minimize");
const btnClose = document.getElementById("btn-close");
const welcome = document.getElementById("welcome");
const screenshotPreview = document.getElementById("screenshot-preview");
const screenshotImg = document.getElementById("screenshot-img");
const btnRemoveScreenshot = document.getElementById("btn-remove-screenshot");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const btnCloseHistory = document.getElementById("btn-close-history");

let isStreaming = false;
let currentResponseEl = null;
let currentScreenshot = null;
let firstChunk = false;
let currentRawText = "";

// ── Configure marked ──
marked.setOptions({
  breaks: true,
  gfm: true,
});

// ── Chat state ──
let currentChatId = generateId();
let chatMessages = []; // [{role: "user"|"ai", text: "..."}]
let historyOpen = false;
let historySelectedIndex = -1;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Auto-resize textarea ──
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
});

// ── Send on Enter (Shift+Enter for newline) ──
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Keyboard shortcuts ──
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "n") {
    e.preventDefault();
    newChat();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "h") {
    e.preventDefault();
    toggleHistory();
  }
  if (e.key === "Escape" && historyOpen) {
    e.preventDefault();
    toggleHistory();
  }
  if (e.key === "Escape" && helpOpen) {
    e.preventDefault();
    toggleHelp();
  }
  // Cmd+Left / Cmd+Right to snap window position
  if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft" && !historyOpen) {
    e.preventDefault();
    window.glassChat.snapLeft();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight" && !historyOpen) {
    e.preventDefault();
    window.glassChat.snapRight();
  }
  // Arrow keys + Enter + Delete in history panel
  if (historyOpen) {
    const items = historyList.querySelectorAll(".history-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      historySelectedIndex = Math.min(historySelectedIndex + 1, items.length - 1);
      updateHistorySelection(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      historySelectedIndex = Math.max(historySelectedIndex - 1, 0);
      updateHistorySelection(items);
    } else if (e.key === "Enter" && historySelectedIndex >= 0) {
      e.preventDefault();
      items[historySelectedIndex].querySelector(".history-item-info").click();
    } else if ((e.key === "Backspace" || e.key === "Delete") && historySelectedIndex >= 0) {
      e.preventDefault();
      items[historySelectedIndex].querySelector(".btn-delete").click();
    }
  }
});

btnSend.addEventListener("click", sendMessage);
btnStop.addEventListener("click", stopResponse);
btnScreenshot.addEventListener("click", takeScreenshot);
btnHelp.addEventListener("click", toggleHelp);
btnCloseHelp.addEventListener("click", toggleHelp);
btnMinimize.addEventListener("click", () => window.glassChat.minimizeWindow());
btnClose.addEventListener("click", () => window.glassChat.closeWindow());
btnRemoveScreenshot.addEventListener("click", removeScreenshot);
btnCloseHistory.addEventListener("click", toggleHistory);

// ── Listen for streaming responses ──
window.glassChat.onResponseChunk((chunk) => {
  if (currentResponseEl) {
    const content = currentResponseEl.querySelector(".content");
    if (firstChunk) {
      content.innerHTML = "";
      currentRawText = "";
      firstChunk = false;
    }
    currentRawText += chunk;
    content.innerHTML = marked.parse(currentRawText);
    scrollToBottom();
  }
});

window.glassChat.onResponseDone(() => {
  // Save AI response to chat messages (raw text for history)
  if (currentResponseEl) {
    chatMessages.push({ role: "ai", text: currentRawText });
    saveCurrentChat();
  }
  finishStreaming();
});

window.glassChat.onResponseError((error) => {
  if (currentResponseEl) {
    const content = currentResponseEl.querySelector(".content");
    if (!content.textContent) {
      currentResponseEl.remove();
    }
  }
  // Don't show error for manual stops (SIGTERM = code 143)
  if (!error.includes("code 143") && !error.includes("SIGTERM")) {
    addMessage("error", error);
  }
  finishStreaming();
});

window.glassChat.onNewChat(() => {
  newChat();
});

// ── Functions ──

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && !currentScreenshot) return;
  if (isStreaming) return;

  // Hide welcome
  const wel = document.getElementById("welcome");
  if (wel) wel.style.display = "none";

  // Show screenshot in chat if attached
  if (currentScreenshot) {
    addScreenshotMessage(currentScreenshot);
  }

  // Show user message & save to history
  if (text) {
    addMessage("user", text);
    chatMessages.push({ role: "user", text });
  }

  // Clear input
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Start streaming
  startStreaming();

  // Create AI response placeholder with typing indicator
  currentResponseEl = createMessageEl("ai", "");
  currentResponseEl.querySelector(".content").innerHTML =
    '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  chatContainer.appendChild(currentResponseEl);
  scrollToBottom();

  // Mark that next chunk should clear the typing indicator
  firstChunk = true;

  // Send to Claude
  const screenshot = currentScreenshot;
  removeScreenshot();

  // Pass conversation history so Claude has context
  const historyForContext = [...chatMessages];
  window.glassChat.sendMessage(text, screenshot, historyForContext).catch(() => {
    // Error handled via onResponseError
  });
}

function startStreaming() {
  isStreaming = true;
  btnSend.style.display = "none";
  btnStop.style.display = "flex";
}

function finishStreaming() {
  isStreaming = false;
  btnSend.style.display = "flex";
  btnStop.style.display = "none";
  messageInput.focus();
  currentResponseEl = null;
}

function stopResponse() {
  // Remove the typing indicator bubble if no real content yet
  if (currentResponseEl) {
    const content = currentResponseEl.querySelector(".content");
    if (!content.textContent.trim()) {
      currentResponseEl.remove();
    }
  }
  window.glassChat.stopResponse();
  finishStreaming();
}

function newChat() {
  // Save current chat if it has messages
  if (chatMessages.length > 0) {
    saveCurrentChat();
  }

  // Reset state
  currentChatId = generateId();
  chatMessages = [];

  chatContainer.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">
        <svg width="48" height="52" viewBox="0 0 48 52" fill="none">
          <rect x="2" y="2" width="44" height="34" rx="8" fill="rgba(255,255,255,0.12)"/>
          <polygon points="8,34 8,46 18,34" fill="rgba(255,255,255,0.12)"/>
          <rect x="15" y="9" width="4" height="3" rx="1" fill="#C8836A"/>
          <rect x="29" y="9" width="4" height="3" rx="1" fill="#C8836A"/>
          <rect x="14" y="11" width="20" height="8" rx="3" fill="#C8836A"/>
          <rect x="18" y="14" width="3" height="3" rx="1" fill="#3D2820"/>
          <rect x="27" y="14" width="3" height="3" rx="1" fill="#3D2820"/>
          <rect x="16" y="20" width="16" height="8" rx="2" fill="#C8836A"/>
          <rect x="18" y="28" width="2" height="4" rx="0.5" fill="#C8836A"/>
          <rect x="22" y="28" width="2" height="4" rx="0.5" fill="#C8836A"/>
          <rect x="26" y="28" width="2" height="4" rx="0.5" fill="#C8836A"/>
          <rect x="30" y="28" width="2" height="4" rx="0.5" fill="#C8836A"/>
        </svg>
      </div>
      <p>Ask Claude anything</p>
      <span class="shortcut-hint">Double ⌘ to toggle</span>
    </div>
  `;
  removeScreenshot();

  if (historyOpen) toggleHistory();
  messageInput.focus();
}

function saveCurrentChat() {
  if (chatMessages.length === 0) return;
  const firstUserMsg = chatMessages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.text.slice(0, 60)
    : "Untitled chat";

  window.glassChat.saveChat({
    id: currentChatId,
    title,
    messages: chatMessages,
    updatedAt: Date.now(),
  });
}

// ── History ──

async function toggleHistory() {
  historyOpen = !historyOpen;
  if (historyOpen) {
    historySelectedIndex = -1;
    historyPanel.style.display = "flex";
    await renderHistory();
  } else {
    historyPanel.style.display = "none";
    messageInput.focus();
  }
}

function updateHistorySelection(items) {
  items.forEach((item, i) => {
    item.classList.toggle("history-item-selected", i === historySelectedIndex);
  });
  // Scroll selected item into view
  if (historySelectedIndex >= 0 && items[historySelectedIndex]) {
    items[historySelectedIndex].scrollIntoView({ block: "nearest" });
  }
}

async function renderHistory() {
  const chats = await window.glassChat.loadHistory();
  historyList.innerHTML = "";

  if (chats.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No chat history</div>';
    return;
  }

  for (const chat of chats) {
    const item = document.createElement("div");
    item.className = "history-item";

    const timeAgo = formatTimeAgo(chat.updatedAt);

    item.innerHTML = `
      <div class="history-item-info">
        <div class="history-item-title">${escapeHtml(chat.title)}</div>
        <div class="history-item-meta">${timeAgo} · ${chat.messageCount} messages</div>
      </div>
      <button class="btn-delete" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    // Click to load chat
    item.querySelector(".history-item-info").addEventListener("click", () => {
      loadChatFromHistory(chat.id);
    });

    // Delete button
    item.querySelector(".btn-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      await window.glassChat.deleteChat(chat.id);
      await renderHistory();
    });

    historyList.appendChild(item);
  }
}

async function loadChatFromHistory(chatId) {
  const chat = await window.glassChat.loadChat(chatId);
  if (!chat) return;

  // Save current chat first
  if (chatMessages.length > 0) {
    saveCurrentChat();
  }

  // Load the selected chat
  currentChatId = chat.id;
  chatMessages = chat.messages || [];

  // Render messages
  chatContainer.innerHTML = "";
  for (const msg of chatMessages) {
    addMessage(msg.role, msg.text);
  }

  toggleHistory();
  scrollToBottom();
  messageInput.focus();
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── Help ──

let helpOpen = false;

function toggleHelp() {
  helpOpen = !helpOpen;
  helpPanel.style.display = helpOpen ? "flex" : "none";
  if (!helpOpen) messageInput.focus();
}

// ── Screenshot ──

async function takeScreenshot() {
  const dataUrl = await window.glassChat.takeScreenshot();
  if (dataUrl) {
    currentScreenshot = dataUrl;
    screenshotImg.src = dataUrl;
    screenshotPreview.style.display = "block";
  }
}

function removeScreenshot() {
  currentScreenshot = null;
  screenshotPreview.style.display = "none";
  screenshotImg.src = "";
}

// ── DOM helpers ──

function addMessage(type, text) {
  const el = createMessageEl(type, text);
  chatContainer.appendChild(el);
  scrollToBottom();
  return el;
}

function addScreenshotMessage(dataUrl) {
  const el = document.createElement("div");
  el.className = "message message-user message-screenshot";
  el.innerHTML = `<img src="${dataUrl}" />`;
  chatContainer.appendChild(el);
  scrollToBottom();
}

function createMessageEl(type, text) {
  const el = document.createElement("div");
  el.className = `message message-${type}`;
  if (type === "error") {
    el.classList.add("message-error");
  }
  if (type === "ai" && text) {
    el.innerHTML = `<div class="content">${marked.parse(text)}</div>`;
  } else {
    el.innerHTML = `<div class="content">${escapeHtml(text)}</div>`;
  }
  return el;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// When user clicks anywhere on the panel, grab keyboard focus so they can type
document.addEventListener("mousedown", () => {
  window.glassChat.focusWindow();
  setTimeout(() => messageInput.focus(), 50);
});

// When toggled open via double-Cmd, auto-focus the input
window.glassChat.onFocusInput(() => {
  messageInput.focus();
});

// Focus input on load
messageInput.focus();
