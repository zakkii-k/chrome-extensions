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

export function shortLinkTarget(html, base) {
  const decode = text => text.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const name=entity.slice(1,-1).toLowerCase();
    const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
    if (named[name]) return named[name];
    const point=name.startsWith('#x')?parseInt(name.slice(2),16):parseInt(name.slice(1),10);
    return point>0 && point<=0x10ffff ? String.fromCodePoint(point) : '';
  });
  for (const tag of html.slice(0,65536).match(/<meta\b[^>]*>/gi) || []) {
    const attributes={};
    for (const match of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes[match[1].toLowerCase()]=match[2]??match[3]??match[4];
    }
    if (attributes['http-equiv']?.toLowerCase() !== 'refresh') continue;
    const target=attributes.content?.match(/^\s*[\d.]+\s*;\s*url\s*=\s*(.*?)\s*$/i)?.[1];
    const url=target && webUrl(decode(target).replace(/^['"]|['"]$/g,''),base);
    if (url) return url;
  }
  // Parse a JSON string literal only. Never execute the redirect script.
  const literal=html.slice(0,65536).match(/(?:window\.)?location\.replace\s*\(\s*("(?:[^"\\]|\\.)*")\s*\)/)?.[1];
  try { return literal ? webUrl(JSON.parse(literal),base) : null; } catch { return null; }
}

// Resolve t.co's HTTP or HTML redirect before creating the frame, so the
// extension remains initiator. Never execute downloaded JavaScript.
const destinationCaches = new WeakMap();
const destinationTtl = 5 * 60 * 1000;
const destinationLimit = 64;

export async function previewDestination(value, request = fetch, now = Date.now) {
  const original = webUrl(value);
  if (!original || new URL(original).hostname !== 't.co') return original;
  let cache=destinationCaches.get(request);
  if (!cache) {cache=new Map();destinationCaches.set(request,cache);}
  const time=now();
  for (const [url,entry] of cache) if (entry.expires <= time) cache.delete(url);
  const cached=cache.get(original);
  if (cached) return cached.promise;
  while (cache.size >= destinationLimit) cache.delete(cache.keys().next().value);
  const entry={promise:resolveDestination(original,request),expires:time+destinationTtl};
  cache.set(original,entry);
  const destination=await entry.promise;
  if (destination === original && cache.get(original) === entry) cache.delete(original);
  return destination;
}

async function resolveDestination(original, request) {
  try {
    const response = await request(original, {
      method:'GET', redirect:'follow', credentials:'omit', cache:'no-store',
      referrerPolicy:'no-referrer', signal:AbortSignal.timeout(7000)
    });
    const resolved=webUrl(response.url);
    if (resolved && new URL(resolved).hostname !== 't.co') {
      await response.body?.cancel();
      return resolved;
    }
    return shortLinkTarget(await response.text(),original) || original;
  } catch { return original; }
}
