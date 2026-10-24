import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestions,tabSuggestions,switchTab } from '../src/suggestions.js';
const tabs=[
 {id:1,windowId:2,title:'東京の地図',url:'https://maps.google.com/',lastAccessed:30},
 {id:2,windowId:2,title:'東京 Wikipedia',url:'https://ja.wikipedia.org/',lastAccessed:50},
 {id:3,windowId:2,title:'secret 東京',url:'https://secret.test/',incognito:true},
 {id:4,windowId:2,title:'Settings',url:'chrome://settings'},
 {id:5,windowId:2,title:'Other',url:'https://other.test/'}
];
test('tab candidates match titles and URLs, exclude current and private tabs',()=>{
 assert.deepEqual(tabSuggestions(tabs,'東京',{id:2}).map(t=>t.id),[1]);
 assert.deepEqual(tabSuggestions(tabs,'other',{}).map(t=>t.id),[5]);
 assert.deepEqual(tabSuggestions(tabs,'東京',{incognito:true}).map(t=>t.id),[3]);
});
test('empty input lists recent normal web tabs',()=>{
 assert.deepEqual(tabSuggestions(tabs,'',{}).map(t=>t.id),[2,1,5]);
});
test('search suggestions precede existing tabs without duplicates',async()=>{
 let requested;
 const result=await suggestions({tabs:{query:async()=>tabs}},'東京',{},async(url,options)=>{
  requested={url,options};return {ok:true,json:async()=>['東京',['東京','東京 天気','東京 天気','東京 ランチ',99]]};
 });
 assert.deepEqual(result.slice(0,2),[{kind:'search',text:'東京 天気'},{kind:'search',text:'東京 ランチ'}]);
 assert.equal(result[2].kind,'tab');
 assert.equal(new URL(requested.url).searchParams.get('q'),'東京');
 assert.equal(requested.options.credentials,'omit');
});
test('URLs, email addresses, empty input and schemes never leave the device for suggestions',async()=>{
 let requests=0;
 for(const query of ['https://example.com/private?q=secret','example.com','localhost:3000','user@example.com','javascript:foo','']){
  await suggestions({tabs:{query:async()=>[]}},query,{},async()=>{requests++;});
 }
 assert.equal(requests,0);
});
test('network failure preserves local tab suggestions',async()=>{
 const result=await suggestions({tabs:{query:async()=>tabs}},'東京',{},async()=>{throw new Error('offline');});
 assert.equal(result.length,2);assert.equal(result[0].kind,'tab');
});
test('malformed provider response does not break local candidates',async()=>{
 const result=await suggestions({tabs:{query:async()=>tabs}},'東京',{},async()=>({ok:true,json:async()=>({unexpected:true})}));
 assert.equal(result.length,2);
});
test('explicit tab selection activates its window without creating tabs',async()=>{
 const calls=[];
 await switchTab({tabs:{get:async()=>({windowId:8}),update:async(...args)=>calls.push(['tab',...args])},windows:{update:async(...args)=>calls.push(['window',...args])}},6);
 assert.deepEqual(calls,[['tab',6,{active:true}],['window',8,{focused:true}]]);
});
test('invalid or closed tabs fail rather than open a replacement',async()=>{
 await assert.rejects(switchTab({},'6'),/Invalid tab/);
 await assert.rejects(switchTab({tabs:{get:async()=>{throw new Error('closed');}}},6),/closed/);
});
