import {chromium} from 'playwright';
import test from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtemp,rm} from 'node:fs/promises';

test('native new-tab search has no placeholder Back entry', {timeout:60000},async()=>{
 const extension=fileURLToPath(new URL('../../src/',import.meta.url));
 const profile=await mkdtemp(join(tmpdir(),'launcher-history-'));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chromium'}),headless:true,
   args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  // Serve the native provider's destination locally: history behavior is real,
  // but no search query or search-page resource needs to leave the test runner.
  await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Search result fixture</title><h1>Results</h1>'}));
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  const page=await context.newPage();
  await page.goto(`chrome-extension://${id}/popup.html`);
  const result=context.waitForEvent('page');
  await page.evaluate(()=>chrome.runtime.sendMessage({type:'launcher:submit',text:'test history'}));
  const searched=await result;
  await searched.waitForURL(url=>url.href!=='about:blank');
  const cdp=await context.newCDPSession(searched);
  const history=await cdp.send('Page.getNavigationHistory');
  assert.equal(history.currentIndex,0);
  assert.equal(history.entries.length,1);
  assert.notEqual(history.entries[0].url,'about:blank');
  assert.equal(await searched.goBack(),null);
 }finally{
  await context?.close();
  await rm(profile,{recursive:true,force:true});
 }
});
