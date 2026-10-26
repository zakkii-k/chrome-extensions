import {chromium} from 'playwright';
import test from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';

test('launcher isolates page shortcuts and preserves native editing', {timeout:60000}, async () => {
  const extension=fileURLToPath(new URL('../../src/',import.meta.url));
  const profile=await mkdtemp(join(tmpdir(),'launcher-keys-'));
  const server=createServer((_request,response) => {
    response.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
    response.end(`<!doctype html><title>Shortcut fixture</title><body>
      <h1>Timeline</h1><input id="original"><input id="compose" hidden>
      <script>
        window.keys=[]; window.posts=0; window.discards=0;
        for(const type of ['keydown','keypress','keyup']) {
          window.addEventListener(type,event => {
            window.keys.push(type+':'+event.key);
            if(type==='keydown'&&event.key==='n'&&!event.ctrlKey&&!event.metaKey) {
              window.posts++;
              const compose=document.querySelector('#compose');
              compose.hidden=false; compose.focus();
            }
            if(type==='keydown'&&event.key==='Escape'&&window.posts) window.discards++;
          },true);
        }
      </script></body>`);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let context;
  try {
    context=await chromium.launchPersistentContext(profile,{
      ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chromium'}),
      headless:true,
      args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],
      permissions:['clipboard-read','clipboard-write']
    });
    // Expose the extension document's shadow for assertions only.
    await context.addInitScript(() => {
      const original=Element.prototype.attachShadow;
      Element.prototype.attachShadow=function(options){return original.call(this,{...options,mode:'open'});};
    });
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
    await worker.evaluate(() => {
      const original=fetch;
      globalThis.fetch=(url,options) => String(url).startsWith('https://suggestqueries.google.com/')
        ? Promise.resolve(new Response(JSON.stringify(['',[]]))) : original(url,options);
    });
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.bringToFront();
    await page.locator('#original').focus();
    const tab=await worker.evaluate(async () => (await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0]);
    const frameAttached=page.waitForEvent('framenavigated',{
      predicate:frame => frame.url().includes('/frame.html#')
    });
    await worker.evaluate(async id => chrome.scripting.executeScript({target:{tabId:id},files:['overlay.js']}),tab.id);
    const frame=await frameAttached;
    const input=frame.getByRole('combobox');
    await input.waitFor();
    await input.pressSequentially('new');
    assert.equal(await input.inputValue(),'new');
    assert.equal(await page.evaluate(() => window.posts),0);
    assert.deepEqual(await page.evaluate(() => window.keys),[]);

    await page.evaluate(() => {
      const compose=document.querySelector('#compose'); compose.hidden=false; compose.focus();
    });
    assert.equal(await input.evaluate(element => element.getRootNode().activeElement===element),true);
    await input.press('Control+a');
    await input.press('Control+c');
    await input.press('End');
    await input.press('Control+v');
    assert.equal(await input.inputValue(),'newnew');
    await input.press('Control+z');
    assert.equal(await input.inputValue(),'new');
    await input.press('Control+y');
    assert.equal(await input.inputValue(),'newnew');
    await input.press('Control+a');
    await input.press('Backspace');
    assert.equal(await input.inputValue(),'');

    await input.dispatchEvent('compositionstart');
    await input.press('Enter');
    assert.equal(await input.isVisible(),true);
    await input.dispatchEvent('compositionend');
    const detached=page.waitForEvent('framedetached',{predicate:item => item===frame});
    await input.press('Escape').catch(error => {if(page.frames().includes(frame))throw error;});
    await detached;
    assert.equal(await page.locator('#original').evaluate(element => document.activeElement===element),true);
    assert.equal(await page.evaluate(() => window.discards),0);
    assert.deepEqual(await page.evaluate(() => window.keys),[]);

    await page.locator('#original').press('n');
    assert.equal(await page.evaluate(() => window.posts),1);
  } finally {
    await context?.close();
    await new Promise(resolve => server.close(resolve));
    await rm(profile,{recursive:true,force:true});
  }
});
