const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("glassChat", {
  sendMessage: (message, imageBase64) =>
    ipcRenderer.invoke("send-message", message, imageBase64),
  stopResponse: () => ipcRenderer.invoke("stop-response"),
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  focusWindow: () => ipcRenderer.invoke("focus-window"),
  snapLeft: () => ipcRenderer.invoke("snap-left"),
  snapRight: () => ipcRenderer.invoke("snap-right"),

  onResponseChunk: (callback) => {
    ipcRenderer.on("response-chunk", (_, chunk) => callback(chunk));
  },
  onResponseDone: (callback) => {
    ipcRenderer.on("response-done", () => callback());
  },
  onResponseError: (callback) => {
    ipcRenderer.on("response-error", (_, error) => callback(error));
  },
  onNewChat: (callback) => {
    ipcRenderer.on("new-chat", () => callback());
  },
  onFocusInput: (callback) => {
    ipcRenderer.on("focus-input", () => callback());
  },
  saveChat: (chatData) => ipcRenderer.invoke("save-chat", chatData),
  loadHistory: () => ipcRenderer.invoke("load-history"),
  loadChat: (chatId) => ipcRenderer.invoke("load-chat", chatId),
  deleteChat: (chatId) => ipcRenderer.invoke("delete-chat", chatId),

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("response-chunk");
    ipcRenderer.removeAllListeners("response-done");
    ipcRenderer.removeAllListeners("response-error");
    ipcRenderer.removeAllListeners("new-chat");
  },
});
