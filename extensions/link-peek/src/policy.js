export function webUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function previewLink(event, anchor, base) {
  if (!event.isTrusted || event.defaultPrevented || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
      anchor.download || anchor.target === '_parent' || anchor.target === '_top') return null;
  const href = webUrl(anchor.href, base);
  if (!href || new URL(href).origin === new URL(base).origin) return null;
  return href;
}

export function frameRule(id, tabId, extensionId) {
  return {
    id, priority:1,
    action:{type:'modifyHeaders',responseHeaders:[{header:'x-frame-options',operation:'remove'}]},
    condition:{tabIds:[tabId],initiatorDomains:[extensionId],resourceTypes:['sub_frame']}
  };
}
