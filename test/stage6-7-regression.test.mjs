import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/decider.mjs';
const base = {requestId:'r',service:'notes',method:'GET',path:'/notes/demo',route:'GET /notes/:id',deviceRegistered:true,
  stepUp:{verified:false,authAgeSeconds:null},recentEvents:[],signals:{source:'judge_fixture',region:'local',network:'usual',hour:14}};
test('normal request allowed',async()=>assert.equal((await decide(base)).decision,'allow'));
test('unregistered device denied',async()=>assert.equal((await decide({...base,deviceRegistered:false})).reasonCode,'device_not_registered'));
const unusual={...base,signals:{source:'judge_fixture',region:'foreign',network:'unusual',hour:3},recentEvents:[{kind:'risk_signal',ageSeconds:60,count:20}]};
test('suspicious fixture step up',async()=>assert.equal((await decide(unusual)).decision,'step_up'));
test('verified suspicious fixture allowed',async()=>assert.equal((await decide({...unusual,stepUp:{verified:true,authAgeSeconds:60}})).decision,'allow'));
