export const MAX_CLOCK_SKEW_MS=30_000;

function hasText(v){return typeof v==='string'&&v.trim().length>0}

function validateClaimProvenance(p,{prefix,generated,nowMs,clockSkewMs,errors}){
  if(!p||typeof p!=='object'||Array.isArray(p)){
    errors.push(prefix+'_PROVENANCE_REQUIRED');return;
  }
  if(!hasText(p.source_pointer)) errors.push(prefix+'_SOURCE_POINTER_REQUIRED');
  if(!hasText(p.source_version)) errors.push(prefix+'_SOURCE_VERSION_REQUIRED');
  const observed=typeof p.observed_at==='string'?Date.parse(p.observed_at):NaN;
  if(!Number.isFinite(observed)) errors.push(prefix+'_OBSERVED_AT_REQUIRED');
  if(Number.isFinite(observed)&&observed>nowMs+clockSkewMs) errors.push(prefix+'_OBSERVED_IN_FUTURE');
  if(Number.isFinite(observed)&&Number.isFinite(generated)&&observed>generated+clockSkewMs) errors.push(prefix+'_OBSERVED_AFTER_PAYLOAD_GENERATION');
}

export function validatePayload(d,{nowMs=Date.now(),clockSkewMs=MAX_CLOCK_SKEW_MS}={}){
  const errors=[];
  if(!d || typeof d!=='object' || Array.isArray(d)) return {ok:false,errors:['PAYLOAD_NOT_OBJECT']};
  if(!d.meta || typeof d.meta!=='object') errors.push('META_REQUIRED');
  const live=d?.meta?.live===true;
  if(live){
    if(!hasText(d.meta.source_pointer)) errors.push('LIVE_SOURCE_POINTER_REQUIRED');
    if(!hasText(d.meta.source_version)) errors.push('LIVE_SOURCE_VERSION_REQUIRED');
    const generated=typeof d.meta.generated_at==='string'?Date.parse(d.meta.generated_at):NaN;
    const expires=typeof d.meta.expires_at==='string'?Date.parse(d.meta.expires_at):NaN;
    if(!Number.isFinite(generated)) errors.push('LIVE_GENERATED_AT_REQUIRED');
    if(!Number.isFinite(expires)) errors.push('LIVE_EXPIRES_AT_REQUIRED');
    if(Number.isFinite(generated)&&Number.isFinite(expires)&&expires<=generated) errors.push('LIVE_EXPIRY_ORDER_INVALID');
    if(Number.isFinite(generated)&&generated>nowMs+clockSkewMs) errors.push('LIVE_GENERATED_IN_FUTURE');
    if(Number.isFinite(expires)&&expires<nowMs-clockSkewMs) errors.push('LIVE_EXPIRED');
    if(!hasText(d.owner)) errors.push('LIVE_OWNER_REQUIRED');
    if(!hasText(d.role)) errors.push('LIVE_ROLE_REQUIRED');
    if(!d.mission || typeof d.mission!=='object') errors.push('LIVE_MISSION_REQUIRED');
    else validateClaimProvenance(d.mission.provenance,{prefix:'LIVE_MISSION',generated,nowMs,clockSkewMs,errors});

    for(const [key,prefix] of [
      ['verification','LIVE_VERIFICATION'],
      ['gates','LIVE_GATE'],
      ['reviews','LIVE_REVIEW'],
      ['evidence','LIVE_EVIDENCE']
    ]){
      const rows=d[key];
      if(rows!==undefined&&!Array.isArray(rows)){errors.push(prefix+'_ARRAY_REQUIRED');continue}
      for(let i=0;i<(rows||[]).length;i++){
        const row=rows[i];
        if(!row||typeof row!=='object'||Array.isArray(row)){errors.push(prefix+'_'+i+'_OBJECT_REQUIRED');continue}
        validateClaimProvenance(row.provenance,{prefix:prefix+'_'+i,generated,nowMs,clockSkewMs,errors});
      }
    }
  }
  return {ok:errors.length===0,errors};
}

export function canRenderLive(d,{allowLive=false,nowMs=Date.now(),clockSkewMs=MAX_CLOCK_SKEW_MS}={}){
  if(!allowLive || d?.meta?.live!==true) return false;
  return validatePayload(d,{nowMs,clockSkewMs}).ok;
}
