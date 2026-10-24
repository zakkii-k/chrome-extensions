import { openDestination } from "./destination.js";
import { launch, submissionSource } from "./launch.js";

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "open-launcher") return;
  try {
    const result = await launch(chrome, tab);
    console.info("Launcher display", result);
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "New Tab Launcher" });
  } catch (error) {
    console.error("Launcher could not open", error);
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setTitle({ title: "検索バーを開けませんでした。拡張機能のエラー詳細を確認してください。" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "launcher:submit") return;
  submissionSource(chrome, sender)
    .then((tab) => openDestination(chrome, message.text, tab))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Could not open a new tab", error);
      sendResponse({ ok: false, error: "新しいタブを開けませんでした。もう一度お試しください。" });
    });
  return true;
});
