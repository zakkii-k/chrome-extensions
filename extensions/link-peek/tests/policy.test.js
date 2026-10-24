import test from 'node:test';
import assert from 'node:assert/strict';
import {webUrl,previewLink,frameRule} from '../src/policy.js';
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
 assert.deepEqual(rule.action.responseHeaders,[{header:'x-frame-options',operation:'remove'}]);
 assert.equal(rule.id,3);
});
