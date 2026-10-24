// Only web URLs are navigable. Other input goes to the browser's search provider.
export function destination(input) {
  const text = typeof input === "string" ? input.trim() : "";
  if (!text) throw new Error("検索ワードかURLを入力してください。");
  let candidate = text;
  const explicit = /^https?:\/\//i.test(text);
  if (!explicit) {
    const hostWithPort = /^(?:localhost|[^/:]+\.[^/:]+):\d+(?:[/?#]|$)/i.test(text);
    if (/\s/.test(text) || (/^[a-z][a-z\d+.-]*:/i.test(text) && !hostWithPort)) {
      return { kind: "search", text };
    }
    candidate = `https://${text}`;
  }
  try {
    const url = new URL(candidate);
    const host = url.hostname;
    const looksLikeHost = host === "localhost" || host.includes(".") || host.startsWith("[");
    if ((!looksLikeHost && !explicit) || url.username || url.password || /\s/.test(text)) {
      return { kind: "search", text };
    }
    return { kind: "url", url: url.href };
  } catch {
    return { kind: "search", text };
  }
}

export async function openDestination(api, input, sourceTab) {
  const target = destination(input);
  if (target.kind === "search") {
    if (Number.isInteger(sourceTab?.windowId)) {
      // A dedicated input window must never receive the resulting search tab.
      const options = { url: "about:blank", windowId: sourceTab.windowId, active: true };
      if (Number.isInteger(sourceTab.id)) options.openerTabId = sourceTab.id;
      const tab = await api.tabs.create(options);
      try {
        await api.search.query({ text: target.text, tabId: tab.id });
      } catch (error) {
        // Roll back only the new empty tab created by this submission.
        await api.tabs.remove(tab.id).catch(() => {});
        throw error;
      }
    } else {
      await api.search.query({ text: target.text, disposition: "NEW_TAB" });
    }
  } else {
    const options = { url: target.url, active: true };
    if (sourceTab?.id !== undefined) options.openerTabId = sourceTab.id;
    if (sourceTab?.windowId !== undefined) options.windowId = sourceTab.windowId;
    await api.tabs.create(options);
  }
}
