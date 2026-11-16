import {validatePayload,canRenderLive} from './data-contract.mjs';

const DATA_URL='./data.sample.json';
const LIVE_RENDERING_ENABLED=false; // Shadow stays non-live until an authenticated canonical adapter is explicitly integrated.
const $=id=>document.getElementById(id);
const esc=v=>String(v??'—');
function statusClass(s){s=String(s||'unknown').toLowerCase();return ['pass','open','fail','unknown'].includes(s)?s:'unknown'}
function row(label,detail,status,href=''){
 const link=href?`<a href="${href}" target="_blank" rel="noreferrer">${esc(label)}</a>`:`<span class="label">${esc(label)}</span>`;
 return `<div class="row">${link}<div class="muted">${esc(detail)}</div><span class="status ${statusClass(status)}">${esc(status).toUpperCase()}</span></div>`;
}
function metric(label,value){return `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`}
function renderUnknown(reason){
 $('sourceMode').textContent='UNKNOWN / NON-LIVE — DO NOT USE FOR OPERATIONAL DECISIONS';
 $('sourceMode').dataset.state='warning';
 $('freshness').textContent='not trusted';
 $('summary').innerHTML=[metric('Primary owner','—'),metric('Primary role','—'),metric('S4','—'),metric('Data mode','UNKNOWN')].join('');
 $('missionState').textContent='UNKNOWN';
 $('missionState').className='pill status unknown';
 $('missionText').textContent=reason;
 $('nextAction').textContent='No operational next action may be inferred from this shadow payload.';
 $('verification').innerHTML='—';$('gates').innerHTML='—';$('reviews').innerHTML='—';$('evidence').innerHTML='—';
}
function render(d){
 const validation=validatePayload(d);
 const requestedLive=d?.meta?.live===true;
 const live=canRenderLive(d,{allowLive:LIVE_RENDERING_ENABLED});
 if(requestedLive&&!live){
   const reason=!validation.ok
     ?'Live payload rejected: '+validation.errors.join(', ')
     :'Live rendering is disabled until an authenticated canonical adapter is integrated.';
   renderUnknown(reason);return;
 }
 const source=$('sourceMode');
 source.textContent='STATIC EXAMPLE — NOT LIVE PRIMER STATUS';
 source.dataset.state='warning';
 $('freshness').textContent='sample snapshot';
 $('summary').innerHTML=[
  metric('Primary owner',d.owner),metric('Primary role',d.role),metric('S4',d.s4),metric('Data mode','SAMPLE')
 ].join('');
 $('missionState').textContent=esc(d.mission?.status).toUpperCase();
 $('missionState').className=`pill status ${statusClass(d.mission?.status)}`;
 $('missionText').textContent=esc(d.mission?.text);
 $('nextAction').textContent='Illustrative next action: '+esc(d.mission?.next_valid_action);
 $('verification').innerHTML=(d.verification||[]).map(x=>row(x.layer,x.detail,x.status,x.url)).join('')||'—';
 $('gates').innerHTML=(d.gates||[]).map(x=>row(x.gate,x.detail,x.status,x.url)).join('')||'—';
 $('reviews').innerHTML=(d.reviews||[]).map(x=>row(x.item,x.detail,x.status,x.url)).join('')||'—';
 $('evidence').innerHTML=(d.evidence||[]).map(x=>row(x.item,x.detail,x.status,x.url)).join('')||'—';
}
fetch(DATA_URL,{cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('DATA_HTTP_'+r.status);return r.json()})
 .then(render)
 .catch(e=>renderUnknown('Shadow data unavailable: '+String(e.message||e)));
