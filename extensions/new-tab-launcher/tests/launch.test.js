import test from 'node:test';
import assert from 'node:assert/strict';
import { launch } from '../src/launch.js';
const source = { id:4,windowId:2 };
function browser() {
 const calls=[];
 return {calls,api:{
  tabs:{query:async options=>{calls.push(['query',options]);return [source];}},
  scripting:{executeScript:async options=>calls.push(['inject',options])},
  action:{openPopup:async()=>calls.push(['popup'])},
  windows:{create:async()=>{throw new Error('Must never create a window');}}
 }};
}
test('missing command tab is resolved before page injection',async()=>{
 const {api,calls}=browser();
 assert.equal((await launch(api)).surface,'overlay');
 assert.deepEqual(calls,[['query',{active:true,lastFocusedWindow:true}],['inject',{target:{tabId:4},files:['launcher.js']}]]);
});
test('valid command tab is injected without querying again',async()=>{
 const {api,calls}=browser();await launch(api,source);assert.equal(calls.length,1);
});
test('restricted pages can use anchored toolbar popup without creating an OS window',async()=>{
 const {api,calls}=browser();api.scripting.executeScript=async()=>{throw new Error('Restricted page');};
 const result=await launch(api,source);assert.equal(result.surface,'toolbar-popup');
 assert.deepEqual(result.failures,[{stage:'page-injection',message:'Restricted page'}]);
 assert.deepEqual(calls,[['popup']]);
});
test('failure never creates an OS window and reports both stages',async()=>{
 const {api}=browser();api.scripting.executeScript=async()=>{throw new Error('No site access');};
 api.action.openPopup=async()=>{throw new Error('Failed to open popup');};
 await assert.rejects(launch(api,source),error=>{
  for(const text of ['page-injection','No site access','toolbar-popup','Failed to open popup'])assert.ok(error.message.includes(text));
  return true;
 });
});
