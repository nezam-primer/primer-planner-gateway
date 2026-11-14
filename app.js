const tg=window.Telegram?.WebApp;
if(tg){try{tg.ready();tg.expand()}catch{}}
const hashParams=new URLSearchParams(location.hash.replace(/^#/,''));
const initData=tg?.initData||hashParams.get('tgWebAppData')||'';
const $=id=>document.getElementById(id);
let currentSuggestionSet=null;
let lastRenderedState=null;
let actionBusy=false;
let actionQueue=Promise.resolve();
const stableUi=location.hostname==='nezam-primer.github.io';
const TARGET_RAW='https://gist.githubusercontent.com/nezam-primer/d69a62e6102246fcdb5dd9675468051e/raw/primer-planner-target.json';
let transportTargets=[];
let preferredTarget='';
let targetsFetchedAt=0;

function validTarget(u){return /^https:\/\/[a-z0-9]+\.app\.lhr\.life\/?$/i.test(String(u||''))}
function normalizeTarget(u){return String(u||'').replace(/\/$/,'')}
const bootParams=new URLSearchParams(location.search);
const bootTargets=[bootParams.get('a'),bootParams.get('b')].map(normalizeTarget).filter(validTarget);
try{
 const cached=JSON.parse(localStorage.getItem('primer_transport_targets_v1')||'null');
 const cachedUrls=Array.isArray(cached?.urls)?cached.urls.map(normalizeTarget).filter(validTarget):[];
 transportTargets=[...new Set([...bootTargets,...cachedUrls])];
 preferredTarget=normalizeTarget(bootTargets[0]||cached?.preferred||transportTargets[0]||'');
 if(transportTargets.length)targetsFetchedAt=Date.now();
}catch{transportTargets=[...new Set(bootTargets)];preferredTarget=transportTargets[0]||'';if(transportTargets.length)targetsFetchedAt=Date.now()}
async function refreshTargets(force=false){
 if(!stableUi)return [];
 if(!force&&transportTargets.length&&Date.now()-targetsFetchedAt<5000)return transportTargets;
 const r=await fetch(TARGET_RAW+'?t='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw new Error('REGISTRY_HTTP_'+r.status);
 const x=await r.json();
 const urls=[...(Array.isArray(x.urls)?x.urls:[]),x.url].map(normalizeTarget).filter(validTarget);
 transportTargets=[...new Set(urls)];targetsFetchedAt=Date.now();
 if(!preferredTarget||!transportTargets.includes(preferredTarget))preferredTarget=transportTargets[0]||'';
 try{localStorage.setItem('primer_transport_targets_v1',JSON.stringify({urls:transportTargets,preferred:preferredTarget,savedAt:Date.now()}))}catch{}
 return transportTargets;
}
async function transportFetch(path,opt={},requestId=''){
 if(!stableUi)return fetch(path,opt);
 const attempt=async(base)=>{
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),3500);
  try{
   const headers={...(opt.headers||{})};
   if(requestId)headers['x-primer-request-id']=requestId;
   const r=await fetch(base+path,{...opt,headers,signal:ctrl.signal,cache:'no-store'});
   if([502,503,504].includes(r.status))throw new Error('HTTP_'+r.status);
   return {r,base};
  }finally{clearTimeout(timer)}
 };
 const trySet=async(force=false)=>{
  const urls=await refreshTargets(force);
  const ordered=[preferredTarget,...urls].filter(Boolean).filter((u,i,a)=>a.indexOf(u)===i);
  if(!ordered.length)throw new Error('BACKEND_UNAVAILABLE');
  const method=String(opt.method||'GET').toUpperCase();
  if(method==='GET'&&ordered.length>1){
   const winner=await Promise.any(ordered.map(attempt));
   preferredTarget=winner.base;
   try{localStorage.setItem('primer_transport_targets_v1',JSON.stringify({urls:transportTargets,preferred:preferredTarget,savedAt:Date.now()}))}catch{}
   return winner.r;
  }
  let last=null;
  for(const base of ordered){
   try{const x=await attempt(base);preferredTarget=x.base;return x.r}catch(e){last=e}
  }
  throw last||new Error('BACKEND_UNAVAILABLE');
 };
 try{return await trySet(false)}catch{return await trySet(true)}
}

function setFeedback(state,text){
 const el=$('actionStatus');
 if(!el)return;
 el.dataset.state=state||'';
 el.textContent=text;
}
function safeError(e){return String(e?.message||e||'UNKNOWN_ERROR').slice(0,120)}
function probe(ui_action='',ui_phase='',ui_error=''){
 transportFetch('/probe',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({
   has_init_data:Boolean(initData),
   telegram_platform:tg?.platform||'',
   telegram_version:tg?.version||'',
   ui_action,ui_phase,ui_error,
   last_event_seq:lastRenderedState?.last_event_seq??null
  })
 }).catch(()=>{});
}
probe('PAGE','LOADED','');

async function api(path,opt={}){
 const headers={'content-type':'application/json',...(opt.headers||{})};
 if(initData)headers['x-telegram-init-data']=initData;
 const requestId=(String(opt.method||'GET').toUpperCase()==='POST')?(crypto.randomUUID?.()||('REQ-'+Date.now()+'-'+Math.random().toString(16).slice(2))):'';
 let r;
 try{r=await transportFetch(path,{...opt,headers},requestId)}catch{throw new Error('BACKEND_RECOVERING')}
 let x={};
 try{x=await r.json()}catch{}
 if(!r.ok)throw new Error(x.error||('HTTP_'+r.status));
 return x;
}
async function verifyState(minSeq=null){
 const x=await api('/api/state');
 if(minSeq!=null&&Number(x.state?.last_event_seq)<Number(minSeq))throw new Error('STATE_NOT_COMMITTED');
 return x.state;
}
function backgroundVerify(minSeq){
 if(minSeq==null)return;
 setTimeout(()=>verifyState(minSeq).then(s=>{
  if(Number(s.last_event_seq)>Number(lastRenderedState?.last_event_seq||0))render(s);
  probe('BACKGROUND_VERIFY','SUCCESS','');
 }).catch(e=>probe('BACKGROUND_VERIFY','ERROR',safeError(e))),250);
}
function runAction(label,fn){
 const job=async()=>{
  actionBusy=true;
  setFeedback('pending',label+'…');
  probe(label,'TAP','');
  syncControls(lastRenderedState);
  try{
   const result=await fn();
   if(result?.state)render(result.state);
   const seq=result?.state?.last_event_seq??lastRenderedState?.last_event_seq??null;
   backgroundVerify(seq);
   let detail='';
   if(result?.routed_to)detail=' → '+result.routed_to;
   else if(label==='Done')detail=' · بسته شد: '+(result?.completed_title||'task')+(result?.next_title?' → بعدی: '+result.next_title:' → NOW خالی');
   setFeedback('success',label+' انجام شد'+detail+(lastRenderedState?.last_event_seq?' · event '+lastRenderedState.last_event_seq:''));
   probe(label,'SUCCESS','');
   try{tg?.HapticFeedback?.notificationOccurred?.('success')}catch{}
   return result;
  }catch(e){
   const err=safeError(e);
   if(err==='BACKEND_RECOVERING'){
    setFeedback('pending','اتصال در حال بازیابی است…');
    probe(label,'RECOVERING','502');
   }else{
    setFeedback('error',label+' خطا: '+err);
    probe(label,'ERROR',err);
    try{tg?.HapticFeedback?.notificationOccurred?.('error')}catch{}
   }
   return null;
  }finally{
   actionBusy=false;
   syncControls(lastRenderedState);
  }
 };
 const pending=actionQueue.then(job,job);
 actionQueue=pending.catch(()=>{});
 return pending;
}
const task=(s,id)=>id?s.tasks?.[id]:null;

function syncControls(s){
 if(!s)return;
 const current=task(s,s.active_task_id||s.focus?.now);
 const hasTask=Boolean(current);
 const active=Boolean(s.active_task_id);
 $('start').disabled=actionBusy||!hasTask||active;
 $('start').textContent=active?'● ACTIVE':'▶ START';
 $('done').disabled=actionBusy||!hasTask;
 $('stuck').disabled=actionBusy||!hasTask;
 $('checkpoint').disabled=actionBusy||!hasTask;
 $('stop').disabled=actionBusy||!active;
 $('return').disabled=actionBusy;
 $('refreshSuggestions').disabled=actionBusy;
}
function candidateHiddenByState(c,s){
 if(!c||!s)return false;
 const now=Date.now();
 return Object.values(s.tasks||{}).some(t=>{
  if(t?.metadata?.suggestion_candidate_id!==c.candidate_id)return false;
  if(['READY','ACTIVE','PAUSED'].includes(t.status))return true;
  if(t.status==='DONE'&&t.completed_at){
   const age=now-new Date(t.completed_at).getTime();
   return Number.isFinite(age)&&age>=0&&age<6*60*60*1000;
  }
  return false;
 });
}
function renderSuggestions(set){
 const box=$('suggestions');
 box.textContent='';
 const cs=(set?.candidates||[]).filter(c=>!candidateHiddenByState(c,lastRenderedState));
 if(!cs.length){box.textContent='فعلاً پیشنهاد تازه‌ای نداریم.';return}
 for(const c of cs){
  const card=document.createElement('div');card.className='suggestion';
  const h=document.createElement('b');h.textContent=c.title;
  const p=document.createElement('p');p.textContent=c.next_action;
  const meta=document.createElement('small');meta.textContent=[c.owner,c.time_cap_min+' min',...(c.reason_codes||[])].join(' · ');
  const row=document.createElement('div');row.className='suggestion-actions';
  for(const [label,action,reason] of [['انتخاب','accept',''],['بعداً','reject','LATER'],['مناسب نیست','reject','NOT_FIT']]){
   const b=document.createElement('button');b.type='button';b.textContent=label;
   b.onclick=()=>runAction('پیشنهاد: '+label,()=>suggestionDecision(action,c.candidate_id,reason));
   row.appendChild(b);
  }
  card.append(h,p,meta,row);box.appendChild(card);
 }
}
async function refreshSuggestionsRaw(){
 const x=await api('/api/suggestions',{method:'POST',body:'{}'});
 currentSuggestionSet=x.set;renderSuggestions(x.set);return x;
}
async function suggestionDecision(action,candidate_id,reason=''){
 if(!currentSuggestionSet)throw new Error('NO_SUGGESTION_SET');
 const x=await api('/api/suggestions/'+action,{
  method:'POST',
  body:JSON.stringify({set_id:currentSuggestionSet.set_id,candidate_id,reason})
 });
 if(x.state)render(x.state);
 currentSuggestionSet={...currentSuggestionSet,candidates:(currentSuggestionSet.candidates||[]).filter(c=>c.candidate_id!==candidate_id)};
 renderSuggestions(currentSuggestionSet);
 return x;
}
function metric(label,value){return '<div class="metric"><b>'+String(value??'—')+'</b><span>'+label+'</span></div>'}
function render(s){
 lastRenderedState=s;
 $('mode').textContent=s.mode;
 const n=task(s,s.active_task_id||s.focus?.now),nx=task(s,s.focus?.next);
 $('nowTitle').textContent=n?.title||'NOW خالی است';
 $('nowAction').textContent=n?.next_action||'یک task را در Engine به NOW route کن.';
 $('nowMeta').textContent=n?(n.lane+' · '+n.time_cap_min+' min · '+n.status):'';
 $('next').textContent=nx?(nx.title+' → '+nx.next_action):'—';
 $('later').innerHTML=(s.focus?.later||[]).map(id=>task(s,id)).filter(Boolean).map(t=>'<div>'+t.title+'</div>').join('')||'—';
 const m=s.metrics||{};
 const visible=new Set([s.focus?.now,s.focus?.next,...(s.focus?.later||[])].filter(Boolean));
 const parking=Object.values(s.tasks||{}).filter(t=>!['DONE','SUPERSEDED'].includes(t.status)&&!visible.has(t.id)).length;
 $('metrics').innerHTML=metric('Activation',m.activations)+metric('Completion',m.completions)+metric('Return',m.returns)+metric('Parking',parking);
 $('energy').value=s.daily_state?.energy??5;$('stress').value=s.daily_state?.stress??5;$('resistance').value=s.daily_state?.resistance??5;$('sleep').value=s.daily_state?.sleep??'OK';
 $('status').textContent=s.status+' · event '+s.last_event_seq;
 if(currentSuggestionSet)renderSuggestions(currentSuggestionSet);
 syncControls(s);
}
async function command(command,payload={}){
 const x=await api('/api/command',{method:'POST',body:JSON.stringify({command,payload})});
 render(x.state);
 return x;
}
$('stateForm').addEventListener('submit',e=>{
 e.preventDefault();
 runAction('ثبت State',()=>command('STATE',{energy:+$('energy').value,stress:+$('stress').value,resistance:+$('resistance').value,sleep:$('sleep').value}));
});
$('addForm').addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.target;
 const result=await runAction('Add Task',()=>command('ADD',{
  title:$('taskTitle').value,next_action:$('taskAction').value,lane:$('taskLane').value,time_cap_min:+$('taskMinutes').value,
  metadata:{requires_anchor:$('requiresAnchor').checked}
 }));
 if(result){form.reset();$('taskMinutes').value=10}
});
$('start').onclick=()=>runAction('Start',()=>command('START'));
$('done').onclick=()=>runAction('Done',()=>command('DONE'));
$('stuck').onclick=()=>runAction('Stuck',()=>command('STUCK'));
$('return').onclick=()=>runAction('Return',()=>command('RETURN'));
$('checkpoint').onclick=()=>runAction('Checkpoint',()=>command('CHECKPOINT',{note:'MINIAPP_CHECKPOINT'}));
$('stop').onclick=()=>runAction('Stop',()=>command('STOP',{reason:'MINIAPP_STOP'}));
$('refreshSuggestions').onclick=()=>runAction('تازه‌سازی پیشنهادها',()=>refreshSuggestionsRaw());

try{
 let x=await api('/api/state');render(x.state);
 try{window.parent?.postMessage?.({type:'PRIMER_APP_READY',version:'0.6.5-fast-recovery',last_event_seq:lastRenderedState?.last_event_seq??null},'*')}catch{}
 setFeedback('success','آماده · event '+(lastRenderedState?.last_event_seq??'—'));
 refreshSuggestionsRaw().catch(e=>{
  if(safeError(e)!=='BACKEND_RECOVERING')$('suggestions').textContent='پیشنهادها فعلاً در دسترس نیستند.';
 });
 if(x.state.focus?.now&&!sessionStorage.getItem('primer_prompted')){
  sessionStorage.setItem('primer_prompted','1');
  api('/api/prompt',{method:'POST',body:'{}'}).then(p=>p?.state&&render(p.state)).catch(()=>{});
 }
}catch(e){
 const err=safeError(e);
 $('status').textContent='Error: '+err;
 setFeedback('error','شروع Mini App خطا: '+err);
 probe('PAGE','ERROR',err);
}
