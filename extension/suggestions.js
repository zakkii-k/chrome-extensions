import { destination } from './destination.js';

export function tabSuggestions(tabs, query, senderTab) {
  const needle = query.trim().toLocaleLowerCase();
  return tabs
    .filter(tab => tab.id !== senderTab?.id && Boolean(tab.incognito) === Boolean(senderTab?.incognito))
    .filter(tab => /^https?:\/\//i.test(tab.url || ''))
    .filter(tab => !needle || `${tab.title || ''} ${tab.url}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
    .slice(0, 4)
    .map(tab => ({ kind: 'tab', id: tab.id, windowId: tab.windowId, title: tab.title || tab.url, url: tab.url }));
}

export async function suggestions(api, query, senderTab, request = fetch) {
  const text = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  const tabsPromise = api.tabs.query({}).then(tabs => tabSuggestions(tabs, text, senderTab)).catch(() => []);
  const searchPromise = (async () => {
    // Do not send URLs, credentials, or local addresses to the suggestion provider.
    if (!text || destination(text).kind === 'url' || /^[a-z][\w+.-]*:/i.test(text) || text.includes('@')) return [];
    const url = new URL('https://suggestqueries.google.com/complete/search');
    url.search = new URLSearchParams({ client: 'firefox', hl: 'ja', q: text });
    try {
      const response = await request(url.href, {
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(2000)
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data?.[1])) return [];
      return [...new Set(data[1].filter(item => typeof item === 'string' && item.trim() && item !== text))]
        .slice(0, 4).map(value => ({ kind: 'search', text: value }));
    } catch { return []; }
  })();
  const [search, tabs] = await Promise.all([searchPromise, tabsPromise]);
  return [...search, ...tabs];
}

export async function switchTab(api, id) {
  if (!Number.isInteger(id) || id < 0) throw new Error('Invalid tab');
  const tab = await api.tabs.get(id);
  await api.tabs.update(id, { active: true });
  await api.windows.update(tab.windowId, { focused: true });
}
