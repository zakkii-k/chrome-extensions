import { webUrl, frameRule, previewDestination } from './policy.js';
const key = tabId => `peek:${tabId}`;
const queues = new Map();
function queued(tabId, operation) {
  const previous = queues.get(tabId) || Promise.resolve();
  const result = previous.catch(() => {}).then(operation);
  queues.set(tabId, result);
  result.finally(() => { if (queues.get(tabId) === result) queues.delete(tabId); }).catch(() => {});
  return result;
}
async function record(tabId) { return (await chrome.storage.session.get(key(tabId)))[key(tabId)]; }
async function save(tabId, value) { await chrome.storage.session.set({ [key(tabId)]: value }); }
let ruleQueue = Promise.resolve();
function updateRules(operation) {
  const result = ruleQueue.catch(() => {}).then(operation);
  ruleQueue = result;
  return result;
}
async function release(tabId) {
  const value = await record(tabId);
  if (value?.ruleId) await updateRules(() => chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[value.ruleId]}));
  await chrome.storage.session.remove(key(tabId));
}
async function grantFrame(tabId) {
  return updateRules(async () => {
    const used = new Set((await chrome.declarativeNetRequest.getSessionRules()).map(rule => rule.id));
    let id=1;
    while (used.has(id)) id++;
    await chrome.declarativeNetRequest.updateSessionRules({addRules:[frameRule(id,tabId,chrome.runtime.id)]});
    return id;
  });
}
async function publish(value, state) {
  await chrome.runtime.sendMessage({ type:'peek:status', token:value.token, state, url:value.url }).catch(() => {});
}
async function withinPreview(tabId, frameId, value) {
  for (let depth=0; depth<20 && frameId>0; depth++) {
    if (frameId === value.viewerFrameId) return true;
    const frame = await chrome.webNavigation.getFrame({tabId, frameId});
    if (!frame) return false;
    frameId = frame.parentFrameId;
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return;
  const tabId = sender.tab?.id;
  let operation;
  if (message?.type === 'peek:config') {
    operation = chrome.storage.local.get({enabled:true}).then(value => ({ok:true,enabled:value.enabled}));
  } else if (!Number.isInteger(tabId)) return;
  else if (message?.type === 'peek:register') {
    if (sender.url !== chrome.runtime.getURL('viewer.html')) return;
    operation = queued(tabId, async () => {
      const url = webUrl(message.url);
      if (!url || typeof message.token !== 'string' || !/^[\w-]{20,80}$/.test(message.token)) throw new Error('Invalid preview');
      await release(tabId);
      const [destination,ruleId] = await Promise.all([previewDestination(url),grantFrame(tabId)]);
      try { await save(tabId,{token:message.token,url:destination,viewerFrameId:sender.frameId,childFrameId:null,ruleId}); }
      catch (error) {
        await updateRules(() => chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[ruleId]}));
        throw error;
      }
      return {ok:true,url:destination};
    });
  } else if (message?.type === 'peek:unregister' && sender.frameId === 0) {
    operation = queued(tabId, async () => {
      const value = await record(tabId);
      if (value?.token === message.token) await release(tabId);
      return {ok:true};
    });
  } else if (message?.type === 'peek:expand' && sender.frameId === 0) {
    operation = queued(tabId, async () => {
      const value = await record(tabId);
      const url = webUrl(value?.url || message.url);
      if (!url || value && value.token !== message.token) throw new Error('Preview closed');
      await chrome.tabs.create({url,windowId:sender.tab.windowId,openerTabId:tabId,active:true});
      return {ok:true};
    });
  } else if (message?.type === 'peek:close-child') {
    operation = queued(tabId, async () => {
      const value = await record(tabId);
      if (value && await withinPreview(tabId,sender.frameId,value)) {
        await chrome.tabs.sendMessage(tabId,{type:'peek:close',token:value.token},{frameId:0});
      }
      return {ok:true};
    });
  } else if (message?.type === 'peek:navigate-child') {
    operation = queued(tabId, async () => {
      const value = await record(tabId);
      const url = webUrl(message.url);
      if (value && url && await withinPreview(tabId,sender.frameId,value)) {
        value.url = await previewDestination(url);
        await save(tabId,value);
        await chrome.runtime.sendMessage({type:'peek:navigate',token:value.token,url:value.url});
      }
      return {ok:true};
    });
  } else return;
  operation.then(respond).catch(error => {
    console.warn('Link Peek operation failed:',message.type,error.message);
    respond({ok:false});
  });
  return true;
});

chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId === 0) return;
  queued(details.tabId, async () => {
    const value = await record(details.tabId);
    if (value && details.parentFrameId === value.viewerFrameId) {
      value.childFrameId = details.frameId;
      await save(details.tabId,value);
      await publish(value,'loading');
    }
  }).catch(() => {});
});
chrome.webNavigation.onCommitted.addListener(details => {
  queued(details.tabId, async () => {
    if (details.frameId === 0) { await release(details.tabId); return; }
    const value = await record(details.tabId);
    if (value && (details.parentFrameId === value.viewerFrameId || details.frameId === value.childFrameId)) {
      const url = webUrl(details.url);
      if (url) {
        value.url = url;
        value.childFrameId = details.frameId;
        await save(details.tabId,value);
        await publish(value,'ready');
      }
    }
  }).catch(() => {});
});
chrome.webNavigation.onErrorOccurred.addListener(details => {
  if (details.error === 'net::ERR_ABORTED') return;
  queued(details.tabId, async () => {
    const value = await record(details.tabId);
    if (value && (details.parentFrameId === value.viewerFrameId || details.frameId === value.childFrameId)) {
      await publish(value,'blocked');
    }
  }).catch(() => {});
});
chrome.tabs.onRemoved.addListener(tabId => queued(tabId,() => release(tabId)).catch(() => {}));
chrome.action.onClicked.addListener(async () => {
  const value = await chrome.storage.local.get({enabled:true});
  const enabled = !value.enabled;
  await chrome.storage.local.set({enabled});
  await chrome.action.setBadgeText({text:enabled?'':'OFF'});
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id,{type:'peek:enabled',enabled},{frameId:0}).catch(() => {})));
});
