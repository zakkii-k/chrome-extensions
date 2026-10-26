import test from 'node:test';
import assert from 'node:assert/strict';
import {webUrl,previewLink,frameRule,previewDestination,shortLinkTarget} from '../src/policy.js';
const event={isTrusted:true,defaultPrevented:false,button:0};
const base='https://x.com/home';
const anchor={href:'https://news.yahoo.co.jp/story',download:false,target:'_blank'};
test('normal external link click opens a preview',()=>assert.equal(previewLink(event,anchor,base),anchor.href));
test('internal links, same-page anchors and relative links keep original behavior',()=>{
 for(const href of ['https://x.com/profile','#section','/messages'])assert.equal(previewLink(event,{...anchor,href},base),null);
});
test('modifier keys, middle click and downloads keep native browser behavior',()=>{
 for(const key of ['ctrlKey','metaKey','shiftKey','altKey'])assert.equal(previewLink({...event,[key]:true},anchor,base),null);
 assert.equal(previewLink({...event,button:1},anchor,base),null);
 assert.equal(previewLink(event,{...anchor,download:true},base),null);
});
test('synthetic events and already-handled clicks are ignored',()=>{
 assert.equal(previewLink({...event,isTrusted:false},anchor,base),null);
 assert.equal(previewLink({...event,defaultPrevented:true},anchor,base),null);
});
test('non-web schemes, credentials and invalid URLs never open previews',()=>{
 for(const href of ['javascript:alert(1)','mailto:a@example.com','file:///tmp/test','https://user:pass@example.com/','http://[']){
  assert.equal(webUrl(href),null);assert.equal(previewLink(event,{...anchor,href},base),null);
 }
});
test('parent and top navigation targets are left untouched',()=>{
 for(const target of ['_top','_parent'])assert.equal(previewLink(event,{...anchor,target},base),null);
});
test('header exception is session-only, tab-scoped and extension-initiated subframes only',()=>{
 const rule=frameRule(3,99,'extension-id');
 assert.deepEqual(rule.condition,{tabIds:[99],initiatorDomains:['extension-id'],resourceTypes:['sub_frame']});
 assert.deepEqual(rule.action.responseHeaders,[{header:'x-frame-options',operation:'remove'},{header:'content-security-policy',operation:'remove'}]);
 assert.equal(rule.id,3);
});
test('t.co is resolved without cookies before frame navigation',async()=>{
 let call;
 const target='https://news.yahoo.co.jp/articles/example?source=sns';
 assert.equal(await previewDestination('https://t.co/example',async(url,options)=>{
  call={url,options};return {url:target};
 }),target);
 assert.equal(call.url,'https://t.co/example');
 assert.equal(call.options.method,'GET');
 assert.equal(call.options.credentials,'omit');
 assert.equal(call.options.redirect,'follow');
});
test('t.co HTML meta refresh is decoded without executing its script',async()=>{
 const html='<noscript><META http-equiv="refresh" content="0;URL=https://news.yahoo.co.jp/articles/example?source=sns&amp;dv=sp"></noscript><script>throw new Error("must not execute")</script>';
 assert.equal(shortLinkTarget(html,'https://t.co/example'),'https://news.yahoo.co.jp/articles/example?source=sns&dv=sp');
 assert.equal(await previewDestination('https://t.co/example',async()=>({url:'https://t.co/example',text:async()=>html})),
  'https://news.yahoo.co.jp/articles/example?source=sns&dv=sp');
});
test('JSON redirect literals are parsed and non-web redirects are rejected',()=>{
 assert.equal(shortLinkTarget('<script>location.replace("https:\\/\\/example.com\\/article")</script>','https://t.co/a'),'https://example.com/article');
 assert.equal(shortLinkTarget('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">','https://t.co/a'),null);
 assert.equal(shortLinkTarget('<script>location.replace(runSomeCode())</script>','https://t.co/a'),null);
});
test('ordinary URLs are never prefetched',async()=>{
 let requested=false;
 const url='https://news.yahoo.co.jp/articles/example';
 assert.equal(await previewDestination(url,async()=>{requested=true;}),url);
 assert.equal(requested,false);
});
test('failed or non-web short-link responses preserve the original link',async()=>{
 const url='https://t.co/example';
 assert.equal(await previewDestination(url,async()=>{throw new Error('offline');}),url);
 assert.equal(await previewDestination(url,async()=>({url:'javascript:bad'})),url);
});
test('reopening a resolved short link does not request it again within five minutes',async()=>{
 let requests=0;
 const request=async()=>{requests++;return {url:'https://example.com/article'};};
 await previewDestination('https://t.co/reopen',request);
 await previewDestination('https://t.co/reopen',request);
 assert.equal(requests,1);
});
test('cached destinations expire instead of remaining valid indefinitely',async()=>{
 let requests=0,time=0;
 const request=async()=>{requests++;return {url:'https://example.com/article'};};
 await previewDestination('https://t.co/expiry',request,()=>time);
 time=300001;
 await previewDestination('https://t.co/expiry',request,()=>time);
 assert.equal(requests,2);
});
test('a failed resolution is not cached and can recover on the next click',async()=>{
 let requests=0;
 const request=async()=>{if(++requests===1)throw new Error('offline');return {url:'https://example.com/article'};};
 assert.equal(await previewDestination('https://t.co/retry',request),'https://t.co/retry');
 assert.equal(await previewDestination('https://t.co/retry',request),'https://example.com/article');
 assert.equal(requests,2);
});
test('concurrent requests for the same short link share one network request',async()=>{
 let requests=0,finish;
 const response=new Promise(resolve=>{finish=resolve;});
 const request=async()=>{requests++;return response;};
 const first=previewDestination('https://t.co/concurrent',request);
 const second=previewDestination('https://t.co/concurrent',request);
 finish({url:'https://example.com/article'});
 assert.deepEqual(await Promise.all([first,second]),['https://example.com/article','https://example.com/article']);
 assert.equal(requests,1);
});
