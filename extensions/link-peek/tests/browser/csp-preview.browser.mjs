import {chromium} from 'playwright';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('CSP exception only applies to the open extension preview, not native pages or site frames',{timeout:60000},async()=>{
 const extension=fileURLToPath(new URL('../../src/',import.meta.url));
 const profile=await mkdtemp(join(tmpdir(),'peek-csp-'));
 const server=createServer((request,response)=>{
  response.setHeader('Content-Type','text/html; charset=utf-8');
  const article=`http://localhost:${server.address().port}/article`;
  if(request.url==='/article'){
   response.setHeader('Content-Security-Policy',"frame-ancestors 'self'; script-src 'nonce-testnonce'");
   response.setHeader('X-Frame-Options','SAMEORIGIN');
   response.end('<!doctype html><title>CSP article</title><h1>Article</h1><script nonce="testnonce">document.body.dataset.allowed="yes"</script><script>document.body.dataset.unapproved="yes"</script>');
  }else{
   response.end(`<!doctype html><title>Source</title><a id="link" target="_blank" href="${article}">Read</a>`);
  }
 });
 await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chromium'}),headless:true,
   args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForTimeout(200);
  const pageCount=context.pages().length;
  await page.locator('#link').click();
  let viewer;
  for(let i=0;i<100;i++){
   viewer=page.frames().find(frame=>frame.url().endsWith('/viewer.html'));
   if(viewer)break;await page.waitForTimeout(20);
  }
  assert.ok(viewer);
  let child;
  for(let i=0;i<100;i++){
   child=viewer.childFrames().find(frame=>frame.url().endsWith('/article'));
   if(child)break;await page.waitForTimeout(20);
  }
  assert.ok(child);await child.locator('h1').waitFor();
  assert.equal(await child.title(),'CSP article');
  assert.equal(await viewer.locator('.failure').isVisible(),false);
  assert.equal(await child.locator('body').getAttribute('data-allowed'),'yes');
  // Removing the response CSP also removes its script restrictions; nonce remains harmless markup.
  assert.equal(await child.locator('body').getAttribute('data-unapproved'),'yes');
  assert.equal(context.pages().length,pageCount);
  const rules=await worker.evaluate(()=>chrome.declarativeNetRequest.getSessionRules());
  assert.equal(rules.length,1);
  // Even while the exception is active, a top-level page keeps its nonce policy.
  const native=await context.newPage();
  await native.goto(`http://localhost:${server.address().port}/article`);
  assert.equal(await native.locator('body').getAttribute('data-allowed'),'yes');
  assert.equal(await native.locator('body').getAttribute('data-unapproved'),null);
  // A frame initiated by the source site in the same tab still cannot embed the article.
  await page.evaluate(url=>{const frame=document.createElement('iframe');frame.id='site-frame';frame.src=url;document.body.append(frame);},`http://localhost:${server.address().port}/article`);
  await page.waitForTimeout(300);
  assert.equal(page.frames().filter(frame=>frame.url().endsWith('/article')).length,1);
  await viewer.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));
  for(let i=0;i<100;i++){
   if((await worker.evaluate(()=>chrome.declarativeNetRequest.getSessionRules())).length===0)break;
   await page.waitForTimeout(20);
  }
  assert.deepEqual(await worker.evaluate(()=>chrome.declarativeNetRequest.getSessionRules()),[]);
  assert.equal(context.pages().length,pageCount+1);
 }finally{
  await context?.close();await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true});
 }
});
