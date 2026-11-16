export const MAX_CLOCK_SKEW_MS=30_000;

export function validatePayload(d,{nowMs=Date.now(),clockSkewMs=MAX_CLOCK_SKEW_MS}={}){
  const errors=[];
  if(!d || typeof d!=='object' || Array.isArray(d)) return {ok:false,errors:['PAYLOAD_NOT_OBJECT']};
  if(!d.meta || typeof d.meta!=='object') errors.push('META_REQUIRED');
  const live=d?.meta?.live===true;
  if(live){
    if(typeof d.meta.source_pointer!=='string' || !d.meta.source_pointer.trim()) errors.push('LIVE_SOURCE_POINTER_REQUIRED');
    if(typeof d.meta.source_version!=='string' || !d.meta.source_version.trim()) errors.push('LIVE_SOURCE_VERSION_REQUIRED');
    const generated=typeof d.meta.generated_at==='string'?Date.parse(d.meta.generated_at):NaN;
    const expires=typeof d.meta.expires_at==='string'?Date.parse(d.meta.expires_at):NaN;
    if(!Number.isFinite(generated)) errors.push('LIVE_GENERATED_AT_REQUIRED');
    if(!Number.isFinite(expires)) errors.push('LIVE_EXPIRES_AT_REQUIRED');
    if(Number.isFinite(generated)&&Number.isFinite(expires)&&expires<=generated) errors.push('LIVE_EXPIRY_ORDER_INVALID');
    if(Number.isFinite(generated)&&generated>nowMs+clockSkewMs) errors.push('LIVE_GENERATED_IN_FUTURE');
    if(Number.isFinite(expires)&&expires<nowMs-clockSkewMs) errors.push('LIVE_EXPIRED');
    if(typeof d.owner!=='string' || !d.owner.trim()) errors.push('LIVE_OWNER_REQUIRED');
    if(typeof d.role!=='string' || !d.role.trim()) errors.push('LIVE_ROLE_REQUIRED');
    if(!d.mission || typeof d.mission!=='object') errors.push('LIVE_MISSION_REQUIRED');
  }
  return {ok:errors.length===0,errors};
}

export function canRenderLive(d,{allowLive=false,nowMs=Date.now(),clockSkewMs=MAX_CLOCK_SKEW_MS}={}){
  if(!allowLive || d?.meta?.live!==true) return false;
  return validatePayload(d,{nowMs,clockSkewMs}).ok;
}
