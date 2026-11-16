import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePayload,canRenderLive,MAX_CLOCK_SKEW_MS} from './data-contract.mjs';

const NOW=Date.parse('2026-11-16T01:02:00Z');
const claimProvenance=()=>({
 source_pointer:'registry://primer/status',
 source_version:'sha256:claim-example',
 observed_at:'2026-11-16T01:00:30Z'
});

function live(meta={}){
 return {
  meta:{
   live:true,
   source_pointer:'registry://primer/status',
   source_version:'sha256:example',
   generated_at:'2026-11-16T01:01:00Z',
   expires_at:'2026-11-16T01:03:00Z',
   ...meta
  },
  owner:'P-PRIMER',
  role:'EXECUTOR',
  mission:{status:'open',text:'example',next_valid_action:'example',provenance:claimProvenance()}
 };
}

test('bundled sample is valid but explicitly non-live',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('./data.sample.json',import.meta.url),'utf8'));
 assert.equal(validatePayload(d,{nowMs:NOW}).ok,true);
 assert.equal(d.meta.live,false);
 assert.equal(canRenderLive(d,{allowLive:true,nowMs:NOW}),false);
});

test('live payload without provenance fails closed',()=>{
 const r=validatePayload({meta:{live:true},owner:'P-PRIMER',role:'EXECUTOR',mission:{}},{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_SOURCE_POINTER_REQUIRED'));
 assert.ok(r.errors.includes('LIVE_GENERATED_AT_REQUIRED'));
 assert.ok(r.errors.includes('LIVE_EXPIRES_AT_REQUIRED'));
 assert.ok(r.errors.includes('LIVE_MISSION_PROVENANCE_REQUIRED'));
});

test('live payload valid within freshness window validates',()=>{
 assert.deepEqual(validatePayload(live(),{nowMs:NOW}),{ok:true,errors:[]});
});

test('every displayed live claim requires its own provenance',()=>{
 const d=live();
 d.verification=[{layer:'Regression',status:'pass',detail:'example'}];
 const r=validatePayload(d,{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_VERIFICATION_0_PROVENANCE_REQUIRED'));
 d.verification[0].provenance=claimProvenance();
 assert.equal(validatePayload(d,{nowMs:NOW}).ok,true);
});

test('claim provenance rejects future observations',()=>{
 const d=live();
 d.evidence=[{item:'receipt',status:'pass',provenance:{...claimProvenance(),observed_at:'2026-11-16T01:04:00Z'}}];
 const r=validatePayload(d,{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_EVIDENCE_0_OBSERVED_IN_FUTURE'));
 assert.ok(r.errors.includes('LIVE_EVIDENCE_0_OBSERVED_AFTER_PAYLOAD_GENERATION'));
});

test('inverted freshness window is rejected',()=>{
 const r=validatePayload(live({generated_at:'2026-11-16T01:05:00Z',expires_at:'2026-11-16T01:00:00Z'}),{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_EXPIRY_ORDER_INVALID'));
});

test('expired live payload is rejected deterministically',()=>{
 const r=validatePayload(live({generated_at:'2026-11-16T00:50:00Z',expires_at:'2026-11-16T00:59:00Z'}),{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_EXPIRED'));
});

test('future-generated live payload is rejected deterministically',()=>{
 const r=validatePayload(live({generated_at:'2026-11-16T01:03:00Z',expires_at:'2026-11-16T01:10:00Z'}),{nowMs:NOW});
 assert.equal(r.ok,false);
 assert.ok(r.errors.includes('LIVE_GENERATED_IN_FUTURE'));
});

test('bounded clock skew is explicit',()=>{
 const d=live({generated_at:new Date(NOW+MAX_CLOCK_SKEW_MS).toISOString(),expires_at:new Date(NOW+60_000).toISOString()});
 d.mission.provenance.observed_at=new Date(NOW+MAX_CLOCK_SKEW_MS).toISOString();
 assert.equal(validatePayload(d,{nowMs:NOW}).ok,true);
});

test('shadow refuses even a contract-valid live payload until canonical adapter is enabled',()=>{
 const d=live();
 assert.equal(canRenderLive(d,{allowLive:false,nowMs:NOW}),false);
 assert.equal(canRenderLive(d,{allowLive:true,nowMs:NOW}),true);
});
