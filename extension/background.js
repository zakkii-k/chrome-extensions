import { openDestination } from "./destination.js";

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "open-launcher") return;
  try {
    if (!tab?.id) throw new Error("No active page");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["launcher.js"]
    });
  } catch {
    // Browser pages, the Web Store and the built-in PDF viewer reject injection.
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.error("Launcher popup could not open", error);
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setTitle({ title: "検索バーを開けませんでした。拡張機能アイコンをクリックしてください。" });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "launcher:submit") return;
  openDestination(chrome, message.text, sender.tab)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Could not open a new tab", error);
      sendResponse({ ok: false, error: "新しいタブを開けませんでした。もう一度お試しください。" });
    });
  return true;
});
