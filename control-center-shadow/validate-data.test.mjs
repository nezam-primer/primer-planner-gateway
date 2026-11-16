import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePayload} from './validate-data.mjs';

test('bundled sample is valid but explicitly non-live',()=>{
  const d=JSON.parse(fs.readFileSync(new URL('./data.sample.json',import.meta.url),'utf8'));
  const r=validatePayload(d);
  assert.equal(r.ok,true);
  assert.equal(d.meta.live,false);
});

test('live payload without provenance fails closed',()=>{
  const r=validatePayload({meta:{live:true},owner:'P-PRIMER',role:'EXECUTOR',mission:{}});
  assert.equal(r.ok,false);
  assert.ok(r.errors.includes('LIVE_SOURCE_POINTER_REQUIRED'));
  assert.ok(r.errors.includes('LIVE_GENERATED_AT_REQUIRED'));
  assert.ok(r.errors.includes('LIVE_EXPIRES_AT_REQUIRED'));
});

test('live payload with provenance and freshness contract validates',()=>{
  const d={
    meta:{
      live:true,
      source_pointer:'registry://primer/status',
      source_version:'sha256:example',
      generated_at:'2026-11-16T01:00:00Z',
      expires_at:'2026-11-16T01:05:00Z'
    },
    owner:'P-PRIMER',
    role:'EXECUTOR',
    mission:{status:'open',text:'example',next_valid_action:'example'}
  };
  assert.deepEqual(validatePayload(d),{ok:true,errors:[]});
});

test('live payload with inverted freshness window is rejected',()=>{
  const d={
    meta:{
      live:true,
      source_pointer:'registry://primer/status',
      source_version:'sha256:example',
      generated_at:'2026-11-16T01:05:00Z',
      expires_at:'2026-11-16T01:00:00Z'
    },
    owner:'P-PRIMER',
    role:'EXECUTOR',
    mission:{}
  };
  const r=validatePayload(d);
  assert.equal(r.ok,false);
  assert.ok(r.errors.includes('LIVE_EXPIRY_ORDER_INVALID'));
});
