// Keep browser-specific command and popup behavior out of the search UI.
export async function launch(api, commandTab) {
  const failures = [];
  let tab = commandTab;
  try {
    if (!Number.isInteger(tab?.id) || tab.id < 0) {
      [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
    }
    if (!Number.isInteger(tab?.id) || tab.id < 0) throw new Error("No active tab returned by the browser");
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ["launcher.js"] });
    return { surface: "overlay", failures };
  } catch (error) {
    failures.push({ stage: "page-injection", message: String(error.message || error) });
  }
  try {
    await api.action.openPopup();
    return { surface: "toolbar-popup", failures };
  } catch (error) {
    failures.push({ stage: "toolbar-popup", message: String(error.message || error) });
  }
  try {
    // Preserve the source window across service-worker restarts using the URL.
    if (!Number.isInteger(tab?.windowId) || tab.windowId < 0) {
      const sourceWindow = await api.windows.getLastFocused({ windowTypes: ["normal"] });
      [tab] = await api.tabs.query({ active: true, windowId: sourceWindow.id });
    }
    if (!Number.isInteger(tab?.windowId) || tab.windowId < 0) throw new Error("No source browser window");
    const url = new URL(api.runtime.getURL("window.html"));
    url.searchParams.set("sourceWindow", tab.windowId);
    if (Number.isInteger(tab.id) && tab.id >= 0) url.searchParams.set("sourceTab", tab.id);
    const options = { url: url.href, type: "popup", width: 660, height: 290, focused: true };
    try {
      const bounds = await api.windows.get(tab.windowId);
      options.left = Math.max(0, Math.round(bounds.left + (bounds.width - options.width) / 2));
      options.top = Math.max(0, Math.round(bounds.top + (bounds.height - options.height) / 3));
    } catch { /* Default placement remains usable if a browser omits bounds. */ }
    await api.windows.create(options);
    return { surface: "input-window", failures };
  } catch (error) {
    failures.push({ stage: "input-window", message: String(error.message || error) });
    throw new Error(`Launcher failed: ${JSON.stringify(failures)}`);
  }
}

// Only our dedicated input window can select a separate destination window.
export async function submissionSource(api, sender) {
  const senderUrl = new URL(sender.url || api.runtime.getURL("popup.html"));
  if (senderUrl.href.split("?")[0] !== api.runtime.getURL("window.html")) return sender.tab;
  const windowValue = senderUrl.searchParams.get("sourceWindow");
  const windowId = windowValue === null ? NaN : Number(windowValue);
  if (!Number.isInteger(windowId) || windowId < 0) throw new Error("Missing source window");
  const sourceWindow = await api.windows.get(windowId);
  if (sourceWindow.type !== "normal") throw new Error("The source browser window is no longer available");
  const tabValue = senderUrl.searchParams.get("sourceTab");
  const tabId = tabValue === null ? NaN : Number(tabValue);
  if (Number.isInteger(tabId) && tabId >= 0) {
    try {
      const tab = await api.tabs.get(tabId);
      if (tab.windowId === windowId) return tab;
    } catch { /* The source tab may have closed. Keep using its window. */ }
  }
  return { windowId };
}
