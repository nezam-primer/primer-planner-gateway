const DATA_URL='./data.sample.json';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'—');
function statusClass(s){s=String(s||'unknown').toLowerCase();return ['pass','open','fail','unknown'].includes(s)?s:'unknown'}
function row(label,detail,status,href=''){
 const link=href?`<a href="${href}" target="_blank" rel="noreferrer">${esc(label)}</a>`:`<span class="label">${esc(label)}</span>`;
 return `<div class="row">${link}<div class="muted">${esc(detail)}</div><span class="status ${statusClass(status)}">${esc(status).toUpperCase()}</span></div>`;
}
function metric(label,value){return `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`}
function render(d){
 const live=d?.meta?.live===true;
 const source=$('sourceMode');
 source.textContent=live?'LIVE SOURCE — verify provenance/freshness before action':'STATIC EXAMPLE — NOT LIVE PRIMER STATUS';
 source.dataset.state=live?'success':'warning';
 $('freshness').textContent=live&&d.as_of?`as of ${d.as_of}`:'sample snapshot';
 $('summary').innerHTML=[
  metric('Primary owner',d.owner),metric('Primary role',d.role),metric('S4',d.s4),metric('Data mode',live?'LIVE':'SAMPLE')
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
fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('DATA_HTTP_'+r.status);return r.json()}).then(render).catch(e=>{
 $('sourceMode').textContent='SOURCE UNAVAILABLE — DO NOT INFER LIVE STATUS';
 $('missionText').textContent='Shadow data unavailable: '+String(e.message||e);
 $('missionState').textContent='UNKNOWN';
});
