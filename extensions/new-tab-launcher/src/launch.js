// Never create an OS window or browser tab just to display the launcher.
export async function launch(api, commandTab) {
  const failures = [];
  let tab = commandTab;
  let restricted = false;
  try {
    if (!Number.isInteger(tab?.id) || tab.id < 0) {
      [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
    }
    if (!Number.isInteger(tab?.id) || tab.id < 0) throw new Error('No active tab returned by the browser');
    restricted = /^(?:chrome|dia|edge|brave|vivaldi|devtools|about|chrome-extension):/i.test(tab.url || tab.pendingUrl || '');
    if (restricted) throw new Error('Browser-owned page cannot host an overlay');
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['overlay.js'] });
    return { surface: 'overlay', failures };
  } catch (error) {
    restricted ||= /Cannot access a (?:chrome|dia|edge|about|devtools):\/\/ URL/i.test(String(error.message || error));
    failures.push({ stage: 'page-injection', message: String(error.message || error) });
  }
  // Browser-owned pages reject content scripts. An anchored extension popup is
  // the only fallback; never silently turn this into a separate app window.
  try {
    await api.action.openPopup();
    return { surface: 'toolbar-popup', failures };
  } catch (error) {
    failures.push({ stage: 'toolbar-popup', message: String(error.message || error) });
    if (restricted) return { surface:'unavailable', reason:'restricted-page', failures };
    throw new Error(`Launcher failed: ${JSON.stringify(failures)}`);
  }
}
