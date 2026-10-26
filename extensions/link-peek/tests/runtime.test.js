import test from 'node:test';
import assert from 'node:assert/strict';
import {createMessenger} from '../src/runtime.js';

test('synchronous invalidation during unregister is caught and cleanup runs once',async()=>{
 let cleaned=0;
 const runtime={id:'extension',sendMessage:()=>{throw new Error('Extension context invalidated.');}};
 const messaging=createMessenger(runtime,()=>cleaned++);
 assert.equal(await messaging.send({type:'peek:unregister'}),null);
 assert.equal(await messaging.send({type:'peek:unregister'}),null);
 assert.equal(cleaned,1);assert.equal(messaging.alive(),false);
});
test('asynchronous invalidation also disables the old handler',async()=>{
 let cleaned=0;
 const messaging=createMessenger({id:'extension',sendMessage:async()=>{throw new Error('Extension context invalidated.');}},()=>cleaned++);
 assert.equal(await messaging.send({}),null);assert.equal(cleaned,1);
});
test('a missing runtime ID is detected before a native click is intercepted',()=>{
 let called=false,cleaned=false;
 const messaging=createMessenger({id:undefined,sendMessage:()=>{called=true;}},()=>{cleaned=true;});
 assert.equal(messaging.alive(),false);assert.equal(called,false);assert.equal(cleaned,true);
});
test('resource failure after reload returns null instead of opening an empty modal',()=>{
 const messaging=createMessenger({id:'extension',getURL:()=>{throw new Error('Extension context invalidated.');}});
 assert.equal(messaging.resource('viewer.html'),null);assert.equal(messaging.alive(),false);
});
test('ordinary message failures do not permanently disable a valid context',async()=>{
 let attempts=0;
 const messaging=createMessenger({id:'extension',sendMessage:async()=>{if(++attempts===1)throw new Error('Port closed');return {ok:true};}});
 assert.equal(await messaging.send({}),null);assert.equal(messaging.alive(),true);
 assert.deepEqual(await messaging.send({}),{ok:true});
});
