import { openDestination } from './destination.js';
import { launch } from './launch.js';
import { suggestions, switchTab } from './suggestions.js';

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'open-launcher') return;
  try {
    const result = await launch(chrome, tab);
    if (result.surface === 'unavailable') {
      console.info('Launcher unavailable on this browser-owned page');
      await chrome.action.setBadgeText({ text:'!' });
      await chrome.action.setTitle({ title:'ブラウザ内部の画面では表示できません。Webページ上で開いてください。' });
      return;
    }
    console.info('Launcher display', result);
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'New Tab Launcher' });
  } catch (error) {
    console.error('Launcher could not open', error);
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setTitle({ title: 'このページでは表示できません。拡張機能アイコンから開いてください。' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  let operation;
  switch (message?.type) {
    case 'launcher:suggest':
      operation = suggestions(chrome, message.text, sender.tab).then(items => ({ ok: true, items }));
      break;
    case 'launcher:switch':
      operation = switchTab(chrome, message.id).then(() => ({ ok: true }));
      break;
    case 'launcher:submit':
      operation = openDestination(chrome, message.text, sender.tab).then(() => ({ ok: true }));
      break;
    default: return;
  }
  operation.then(sendResponse).catch(error => {
    console.warn('Launcher operation failed', message.type, error.message);
    sendResponse({ ok: false, error: '実行できませんでした。もう一度お試しください。' });
  });
  return true;
});
