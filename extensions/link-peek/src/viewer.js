import { webUrl } from './policy.js';
const frame = document.querySelector('iframe');
const loading = document.querySelector('.loading');
const failure = document.querySelector('.failure');
let configuration;
let timeout;
function state(value) {
  loading.hidden = value !== 'loading';
  failure.hidden = value !== 'blocked';
  clearTimeout(timeout);
  if (value === 'loading') timeout = setTimeout(() => state('blocked'),15000);
}
function tellParent(type) {
  window.parent.postMessage({type,token:configuration.token},configuration.parentOrigin);
}
chrome.runtime.onMessage.addListener(message => {
  if (!configuration || message?.token !== configuration.token) return;
  if (message.type === 'peek:status') state(message.state);
  if (message.type === 'peek:navigate') {
    const url = webUrl(message.url);
    if (url) {state('loading');frame.src=url;}
  }
});
window.addEventListener('message',async event => {
  if (event.source !== window.parent || configuration || event.data?.type !== 'peek:init') return;
  const url = webUrl(event.data.url);
  if (!url || !/^https?:\/\//.test(event.origin)) return;
  configuration = {token:event.data.token,parentOrigin:event.origin};
  const result = await chrome.runtime.sendMessage({type:'peek:register',token:configuration.token,url}).catch(() => null);
  if (!result?.ok) { state('blocked'); return; }
  state('loading');
  frame.src = webUrl(result.url) || url;
});
document.querySelector('button').addEventListener('click',() => tellParent('peek:expand-request'));
window.addEventListener('keydown',event => {
  if (event.key === 'Escape' && configuration) tellParent('peek:close-request');
});
window.parent.postMessage({type:'peek:viewer-ready'},'*');
