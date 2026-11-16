import fs from 'node:fs';

export function validatePayload(d){
  const errors=[];
  if(!d || typeof d!=='object' || Array.isArray(d)) return {ok:false,errors:['PAYLOAD_NOT_OBJECT']};
  if(!d.meta || typeof d.meta!=='object') errors.push('META_REQUIRED');
  const live=d?.meta?.live===true;
  if(live){
    if(typeof d.meta.source_pointer!=='string' || !d.meta.source_pointer.trim()) errors.push('LIVE_SOURCE_POINTER_REQUIRED');
    if(typeof d.meta.source_version!=='string' || !d.meta.source_version.trim()) errors.push('LIVE_SOURCE_VERSION_REQUIRED');
    if(typeof d.meta.generated_at!=='string' || !Number.isFinite(Date.parse(d.meta.generated_at))) errors.push('LIVE_GENERATED_AT_REQUIRED');
    if(typeof d.meta.expires_at!=='string' || !Number.isFinite(Date.parse(d.meta.expires_at))) errors.push('LIVE_EXPIRES_AT_REQUIRED');
    if(Number.isFinite(Date.parse(d.meta.generated_at)) && Number.isFinite(Date.parse(d.meta.expires_at)) &&
       Date.parse(d.meta.expires_at) <= Date.parse(d.meta.generated_at)) errors.push('LIVE_EXPIRY_ORDER_INVALID');
    if(typeof d.owner!=='string' || !d.owner.trim()) errors.push('LIVE_OWNER_REQUIRED');
    if(typeof d.role!=='string' || !d.role.trim()) errors.push('LIVE_ROLE_REQUIRED');
    if(!d.mission || typeof d.mission!=='object') errors.push('LIVE_MISSION_REQUIRED');
  }
  return {ok:errors.length===0,errors};
}

if(import.meta.url===new URL('file:'+process.argv[1]).href){
  const p=process.argv[2]||new URL('./data.sample.json',import.meta.url);
  const d=JSON.parse(fs.readFileSync(p,'utf8'));
  const result=validatePayload(d);
  console.log(JSON.stringify(result));
  if(!result.ok) process.exit(2);
}
