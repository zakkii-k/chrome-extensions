import {chromium} from 'playwright';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('old content scripts remain safe after the extension is reloaded',{timeout:60000},async()=>{
 const extension=fileURLToPath(new URL('../../src/',import.meta.url));
 const profile=await mkdtemp(join(tmpdir(),'peek-reload-'));
 const server=createServer((request,response)=>{
  response.writeHead(200,{'Content-Type':'text/html'});
  response.end(`<!doctype html><title>Fixture</title><a id="link" target="_blank" href="http://localhost:${server.address().port}/article">Read</a><h1>Article fixture</h1>`);
 });
 await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chromium'}),headless:true,
   args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  const errors=[];
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  // Wait until the module-based content script has registered its handler.
  await page.waitForTimeout(200);
  await page.locator('#link').click();
  let viewer;
  for(let i=0;i<100;i++){
   viewer=page.frames().find(frame=>frame.url().endsWith('/viewer.html'));
   if(viewer)break;await page.waitForTimeout(20);
  }
  assert.ok(viewer);
  await viewer.locator('.loading').waitFor({state:'hidden'});
  assert.equal(await viewer.locator('.failure').isVisible(),false);
  await worker.evaluate(()=>chrome.runtime.reload()).catch(()=>{});
  await page.waitForTimeout(250);
  // The old close handler must not throw from synchronous sendMessage.
  const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');
  const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
  let close;
  function visit(node){
   if(node.nodeName==='BUTTON'&&node.attributes?.some((value,index,all)=>value==='aria-label'&&all[index+1]==='閉じる'))close=node;
   for(const child of [...(node.children||[]),...(node.shadowRoots||[])])visit(child);
  }
  visit(root);assert.ok(close);
  const {model}=await cdp.send('DOM.getBoxModel',{nodeId:close.nodeId});const bounds=model.content;
  await page.mouse.click((bounds[0]+bounds[4])/2,(bounds[1]+bounds[5])/2);
  assert.deepEqual(errors,[]);
  const nativeTab=context.waitForEvent('page');
  await page.locator('#link').click();
  const tab=await nativeTab;await tab.waitForURL(/\/article$/);
  assert.deepEqual(errors,[]);
 }finally{
  await context?.close();await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true});
 }
});
