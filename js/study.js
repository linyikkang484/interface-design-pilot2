/* New study controller. No legacy storage, endpoint, assignments, or dataset is read. */
(function(){
'use strict';
const cfg=window.STUDY_CONFIG,Q=window.QUESTIONNAIRE,root=document.getElementById('app');
const p=new URLSearchParams(location.search),preview=p.get('preview')==='1',isTest=preview||p.get('test')==='1',design=preview&&p.get('flow')!=='1';
const force=isTest?String(p.get('condition')||p.get('cond')||'').toUpperCase():'';
const NS='AMELINE_PILOT2_CLEAN|'+cfg.dataNamespace+'|'+(preview?'preview':isTest?'test':'real')+'|';
const urlPid=p.get('PROLIFIC_PID')||'';
let S=null,T=null,store=null,saveTimer=null,netPromise=null,closing=false,releaseTabLock=null,localOK=true,revisionSent=0;
const esc=s=>String(s===undefined?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=()=>crypto.randomUUID();
const key256=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const get=k=>{try{return localStorage.getItem(k);}catch(e){localOK=false;return null;}};
const set=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){localOK=false;return false;}};
const recordKey=pid=>NS+'record|'+pid;
function persist(){if(!S)return;set(recordKey(S.pid),JSON.stringify(S));try{sessionStorage.setItem(NS+'tab_pid',S.pid);}catch(e){localOK=false;}}
function changed(){if(!S)return;S.revision=(S.revision||0)+1;S.dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(persist,150);}
function msg(text,kind){if(!localOK&&S&&S.phase!=='done'){text='Browser storage could not retain the latest progress. Keep this tab open and contact the researcher. Cloud saving may still be pending.';kind='error';}const el=document.getElementById('status-message');if(el){el.textContent=text;el.className='msg '+(kind||'');}}
function top(label){return (preview?'<div class="preview-banner">LOCAL PREVIEW · '+esc(cfg.build)+' · No cloud data or Prolific submission</div>':isTest?'<div class="preview-banner">TEST RECORD · '+esc(cfg.build)+'</div>':'')+'<header class="study-top"><strong>Website Browsing Study</strong><span>'+esc(label)+'</span></header>';}
function shell(body,label){root.innerHTML=top(label)+'<main class="study-shell">'+body+'<p id="status-message" class="msg" role="status"></p></main>';window.scrollTo(0,0);}
function load(pid){try{const s=JSON.parse(get(recordKey(pid)));return s&&s.studyId===cfg.studyId&&s.dataNamespace===cfg.dataNamespace?s:null;}catch(e){return null;}}
function newState(pid){const savedKey=get(NS+'credential|'+pid);const key=/^[0-9a-f]{64}$/.test(savedKey||'')?savedKey:key256();set(NS+'credential|'+pid,key);
 return {studyId:cfg.studyId,dataNamespace:cfg.dataNamespace,build:cfg.build,localId:uuid(),pid,clientKey:key,responseId:null,condition:null,phase:'consent',qpage:2,color:'beige',answers:{},revision:1,ack:0,dirty:true,isTest:isTest?1:0};}
async function tabLock(){if(preview||!navigator.locks)return true;
 return new Promise(resolve=>{navigator.locks.request(NS+'writer|'+S.pid,{ifAvailable:true},lock=>{if(!lock){resolve(false);return;}return new Promise(release=>{releaseTabLock=release;resolve(true);});}).catch(()=>resolve(true));});}
function canCollect(){return cfg.collectionEnabled&&cfg.apiUrl&&cfg.researcherName&&cfg.institution&&cfg.contact&&cfg.retentionNotice&&cfg.ethicsNotice&&cfg.launchReviewConfirmed&&cfg.sourceVisualReviewConfirmed&&cfg.completionConfirmedForThisStudy;}
function consent(){shell('<h1>Introduction and consent</h1>'+ 
 '<p>Thank you for considering this academic study. You will explore a simulated handbag brand website and answer brief questions about the Bonbon Mini handbag and your browsing experience. There are no right or wrong opinions.</p>'+ 
 '<p>Participation is voluntary. You must be at least 18 years old. You may stop at any time, and you may leave opinion items unanswered. No purchase or payment is required. Please use a desktop or laptop computer.</p>'+ 
 '<p>We will collect your questionnaire responses and limited study-related navigation records. Your Prolific ID is used to link your study submission with Prolific; the linked research records are therefore not fully anonymous. Estimated study duration and payment are listed in the Prolific study description.</p>'+ 
 '<h2>Study information and consent</h2><p>Please review the study information and privacy notice provided with this study before continuing.</p>'+ 
 '<details class="privacy-notice"><summary>Study information and privacy notice</summary><div><p>'+esc(cfg.researcherName||'[Researcher name not yet configured]')+' · '+esc(cfg.institution||'[Institution not yet configured]')+'</p><p>Contact: '+esc(cfg.contact||'[Contact not yet configured]')+'</p><p>'+esc(cfg.retentionNotice||'[Data retention and withdrawal notice not yet configured]')+'</p><p>'+esc(cfg.ethicsNotice||'[Applicable ethics notice not yet configured]')+'</p></div></details>'+ 
 '<p style="margin-top:20px">I confirm that I am at least 18 years old, have reviewed the study information, and agree to participate.</p>'+ 
 '<label class="choice"><input type="radio" name="consent" id="consent-check" value="1">Yes, I agree.</label><label class="choice"><input type="radio" name="consent" id="consent-no" value="0">No, I do not agree.</label>'+ 
 '<h2>Prolific ID</h2><label class="input-label" for="pid">Please enter your Prolific ID. This is a study identifier, not your password.</label><input id="pid" type="text" maxlength="64" value="'+esc(urlPid)+'" autocomplete="off" spellcheck="false">'+ 
 (isTest?'<p class="optional-hint">Researcher preview/test only: leave the ID blank to generate a test identifier.</p>':'')+ 
 '<h2>Before you begin</h2><p>Explore the Bonbon Mini presentation in the displayed order, including its shape, details and four available colors. You may click any color card to open the Bonbon Mini product page.</p>'+ 
 '<p>Review the product page and select “Continue to questions.” Your answers will refer to the Bonbon Mini in the color you have selected. You do not need to add anything to a bag, check out or create an account.</p>'+ 
 '<div class="actions"><span></span><button id="start" class="primary">START BROWSING →</button></div>','Page 01 of 03');
 document.getElementById('start').onclick=()=>{if(document.getElementById('consent-no').checked){shell('<h1>Thank you</h1><p>You chose not to take part. No study session has been created. Please return the study on Prolific.</p>','Not participating');return;}start();};
}
async function request(action,extra,maxAttempts){if(!cfg.apiUrl)throw new Error('No backend is configured.');
 const payload=Object.assign({study_id:cfg.studyId,build:cfg.build,data_schema:cfg.dataSchema,data_namespace:cfg.dataNamespace,action,is_test:S.isTest,client_key:S.clientKey,response_id:S.responseId,prolific_pid:S.pid},extra||{});
 let err;const began=Date.now();
 for(let i=0;i<(maxAttempts||1);i++){
  const ctrl=new AbortController(),to=setTimeout(()=>ctrl.abort(),18000);
  try{const r=await fetch(cfg.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),credentials:'omit',redirect:'follow',signal:ctrl.signal});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const j=await r.json();if(j.study_id!==cfg.studyId||j.data_schema!==cfg.dataSchema||j.data_namespace!==cfg.dataNamespace)throw Object.assign(new Error('The endpoint belongs to a different study. Contact the researcher; do not change your ID.'),{permanent:true});
   if(!j.ok)throw Object.assign(new Error(j.message||j.error||'Save failed'),{permanent:!j.retry,retryAfter:j.retry_after_ms});
   return j;
  }catch(e){err=e;if(e.permanent||i===(maxAttempts||1)-1||Date.now()-began>30000)break;await new Promise(resolve=>setTimeout(resolve,e.retryAfter||1500+Math.random()*2500));}
  finally{clearTimeout(to);}
 }
 throw new Error(err&&err.name==='AbortError'?'The server has not confirmed this request. Keep this tab open and try again; do not restart under another ID.':err.message);
}
async function start(){const go=document.getElementById('start');if(!document.getElementById('consent-check').checked){msg('Please confirm consent before starting.','error');return;}
 let pid=document.getElementById('pid').value.trim();if(!pid&&isTest)pid='TEST-'+uuid();
 if(!pid||pid.length>64||(!isTest&&!/^[a-zA-Z0-9_-]+$/.test(pid))){msg('A valid participant ID is required.','error');return;}
 S=load(pid)||newState(pid);persist();if(!localOK){msg('Browser storage is not available. Please contact the researcher rather than starting in another browser.','error');return;}
 go.disabled=true;msg('Creating or restoring your study session…');
 if(!await tabLock()){go.disabled=false;msg('This session is already open in another tab. Continue there or close it before retrying.','error');return;}
 try{
  if(preview){if(S.condition===null)S.condition=force==='B'?1:force==='A'?0:(Math.random()<.5?0:1);S.responseId=S.responseId||'PREVIEW-'+uuid();}
  else {const r=await request('start',{consent:1,force_condition:force==='A'?0:force==='B'?1:null},3);
   S.responseId=r.response_id;S.condition=r.condition;S.ack=Math.max(S.ack||0,r.ack||0);
   if((r.pending_local_retry||r.resume_requires_original)&&!S.trace){throw new Error('The saved session needs its original tab and locally retained progress. Please contact the researcher; do not change your ID or repeat the browsing task.');}
   if(r.snapshot&&(!S.trace||r.revision>S.revision)) restoreServerSnapshot(r);
   S.revision=Math.max(S.revision||0,r.revision||0);if(r.status==='completed')S.phase='done';else if(r.status==='withdrawn')S.phase='withdrawn';
  }
  S.phase=S.phase==='consent'?'browse':S.phase;persist();initTrace();route();scheduleSync();
 }catch(e){go.disabled=false;msg(e.message,'error');if(releaseTabLock){releaseTabLock();releaseTabLock=null;}}
}
// Restore ONLY server-confirmed values. Unknown intervals are never filled in as visible time.
function restoreServerSnapshot(r){
 const saved=r.snapshot,u=saved.restored_summary||{},oldKey=S.clientKey;
 Object.assign(S,{phase:saved.phase,qpage:saved.qpage||2,color:saved.color,answers:saved.answers||{},technicalText:saved.technicalText||'',clientKey:oldKey});
 S.trace={events:[],eventsBase:r.ack||0,elapsedStarted:null,totalTransitions:u.total_transitions||0,firstPdpTransitions:u.first_pdp_transitions,firstPdpPath:u.first_pdp_path||[],path:u.path||[],page:'pdp',color:S.color,visibleMs:u.visible_ms||0,moduleMs:u.module_visible_ms||{home:0,collection:0,products:0,pdp:0},gaps:1,clickCount:u.click_count||0,exposure:[],complete:true,frozenElapsedMs:u.elapsed_ms};
 S.ack=r.ack||0;S.surveyBaseMs=saved.saved_questionnaire_ms||0;S.surveyStartedAt=Date.now();S.restoredFromServer=true;S.route='pdp';S.storeStarted=true;
}
function initTrace(){if(T)T.destroy();T=new StudyTrace(S,changed);if(S.restoredFromServer){T.log('restored_saved_record',{note:'Only acknowledged values recovered; unknown timing interval excluded and gap flagged.'});S.restoredFromServer=false;persist();}}
function cleanupStore(){if(store){store.destroy();store=null;}}
function route(){cleanupStore();if(S.phase==='browse')showStore();else if(S.phase==='survey')questionPage();else if(S.phase==='done')done();else if(S.phase==='withdrawn')shell('<h1>The study has ended</h1><p>Thank you. Please contact the researcher through Prolific regarding your participation.</p>','Ended');else consent();}
function showStore(){root.innerHTML='';store=new PilotStore(root,S,T,{onContinue:()=>{S.phase='survey';S.qpage=2;S.surveyStartedAt=S.surveyStartedAt||Date.now();changed();persist();route();}});
 const help=document.createElement('button');help.className='technical-link';help.textContent='Problem with the study?';help.onclick=technical;root.appendChild(help);
 if(preview){const inspector=document.createElement('details');inspector.className='preview-tool';inspector.innerHTML='<summary>Preview · '+(S.condition===0?'A / PL1':'B / PL3')+'</summary><div>No cloud writes.<br>Actual transitions: <span id="live-count">'+T.s.totalTransitions+'</span><br><button class="text-button" id="download-trace">Download route log</button></div>';root.appendChild(inspector);inspector.querySelector('button').onclick=downloadTrace;}
}
function downloadTrace(){T.tick();persist();const blob=new Blob([JSON.stringify({study_id:cfg.studyId,condition:S.condition,summary:T.snapshot(),events:T.s.events},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='preview-route-'+(S.condition===0?'A':'B')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function technical(){T.tick();T.log('technical_dialog_open');const layer=document.createElement('div');layer.className='dialog-overlay';layer.innerHTML='<section class="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="problem-title"><h2 id="problem-title">Problem with the study?</h2><p>Please describe the technical issue. Do not include personal contact details.</p><textarea aria-label="Technical issue" maxlength="1500"></textarea><div class="actions"><button class="secondary" data-close>Continue browsing</button><button class="secondary" data-report>Record issue</button><button class="text-button" data-stop>Stop participating</button></div><p class="msg" role="status"></p></section>';root.appendChild(layer);
 layer.querySelector('[data-close]').onclick=()=>layer.remove();layer.querySelector('[data-report]').onclick=()=>{const t=layer.querySelector('textarea').value.trim();T.log('technical_report',{message:t});S.technicalText=t;changed();persist();layer.querySelector('.msg').textContent='Recorded in this browser; it will be included in the next successful save.';};
 layer.querySelector('[data-stop]').onclick=()=>{const note=layer.querySelector('textarea').value.trim();S.technicalText=note||S.technicalText||'';T.log('withdrawal',{message:note});T.stop();S.phase='withdrawn';changed();persist();cleanupStore();route();(async()=>{if(netPromise){try{await netPromise;}catch(e){}}let rounds=0;while(nextBatch().length<T.s.events.filter(e=>e.seq>(S.ack||0)).length){if(++rounds>300)throw new Error('Long event stream; contact the researcher.');await sync(true);}return sync(true,'withdraw');})().catch(e=>msg('The server has not confirmed the withdrawal record: '+e.message,'error'));};
 layer.querySelector('textarea').focus();
}
const PAGE2_GROUPS=['Your impressions','Buying this handbag'];
const PAGE3_GROUPS=['Your attention to the product','The character of the browsing process'];
function matrix(group,n){const items=Q.filter(q=>q.page===n&&q.group===group);
 return '<table class="matrix" aria-label="'+esc(group)+'"><thead><tr><th scope="col">Statement</th>'+[1,2,3,4,5,6,7].map(v=>'<th scope="col">'+v+'</th>').join('')+'</tr></thead><tbody>'+items.map(q=>'<tr data-question="'+q.id+'"><td><span>'+esc(q.text)+'</span><button type="button" class="clear-answer" data-clear="'+q.id+'" aria-label="Clear answer for '+esc(q.text)+'"'+(S.answers[q.id]==null?' hidden':'')+'>Clear answer</button></td>'+[1,2,3,4,5,6,7].map(v=>'<td><label data-label="'+v+'"><input type="radio" name="'+q.id+'" value="'+v+'" aria-label="'+v+': '+esc(q.text)+'"'+(S.answers[q.id]===v?' checked':'')+'></label></td>').join('')+'</tr>').join('')+'</tbody></table>';
}
const SCALE_NOTE='1 = Strongly disagree · 4 = Neither agree nor disagree · 7 = Strongly agree';
function questionPage(){const n=S.qpage===3?3:2;S.qpage=n;let body='';
 if(n===2){const c=STIMULUS.colors.find(c=>c.id===S.color)||STIMULUS.colors[1];
  body='<h1>Your impressions of the handbag</h1><div class="target-text"><strong>Maison Améline — Bonbon Mini</strong><span>Color: '+esc(c.name)+'</span></div>'+ 
   '<p>Please evaluate the handbag in the color you selected.</p><p>All questions on this page refer only to the Bonbon Mini in the color you selected—not to the website or the entire brand.</p>'+ 
   '<h2>Your impressions</h2><p class="scale-caption">'+SCALE_NOTE+'</p>'+matrix('Your impressions',2)+ 
   '<h2>Buying this handbag</h2><p class="scale-caption">Please use the same 1–7 agreement scale for the Bonbon Mini you viewed.</p>'+matrix('Buying this handbag',2);
  const w=Q.find(q=>q.id==='wtp1'),v=S.answers.wtp1,ref=S.answers.wtp1_declined===1;
  body+='<h2>Your maximum payment</h2><p>'+esc(w.text)+'</p><p class="wtp-help">'+esc(w.help)+'</p><div class="wtp-row"><span>US$</span><input name="wtp1" aria-label="Your maximum payment in US dollars" type="number" min="0" step="any" value="'+(v==null?'':esc(v))+'"'+(ref?' disabled':'')+'><label class="choice"><input type="checkbox" name="wtp1_declined"'+(ref?' checked':'')+'>Prefer not to answer</label></div>';
 }else{
  body='<h1>Your browsing experience</h1><p>Please think about your experience of exploring the Bonbon Mini before you first reached its product-detail page. When answering, focus on the browsing experience itself rather than your opinion of the handbag.</p>'+ 
   '<p>Choose one number for each statement. You may leave an opinion item unanswered.</p>'+ 
   '<h2>Your attention to the product</h2><p class="scale-caption">'+SCALE_NOTE+'</p>'+matrix('Your attention to the product',3)+ 
   '<h2>The character of the browsing process</h2><p class="scale-caption">Please use the same 1–7 agreement scale. Think about the process itself, not just the final handbag.</p>'+matrix('The character of the browsing process',3)+ 
   '<p style="margin-top:25px">Thank you for taking part. Selecting the button below will submit your responses and return you to Prolific. Please wait until the submission finishes saving.</p>';
 }
 body+='<div class="actions">'+(n===3?'<button class="secondary" id="back">Back</button>':'<span></span>')+'<button class="primary" id="next">'+(n===3?'SUBMIT AND RETURN TO PROLIFIC →':'NEXT →')+'</button></div>';
 shell(body,'Page 0'+n+' of 03');
 const readPage=()=>{
  Q.filter(q=>q.page===n).forEach(q=>{if(q.type==='agreement'){const el=root.querySelector('input[name="'+q.id+'"]:checked');S.answers[q.id]=el?Number(el.value):null;}
   else{const refuse=root.querySelector('[name="'+q.refusalKey+'"]'),input=root.querySelector('[name="'+q.id+'"]');S.answers[q.refusalKey]=refuse.checked?1:0;input.disabled=refuse.checked;if(refuse.checked)input.value='';S.answers[q.id]=refuse.checked||input.value===''?null:Number(input.value);}
  });changed();persist();msg(preview?'Preview answers stay in this browser only.':'Saved in this browser; background sync may still be pending.');
  root.querySelectorAll('[data-clear]').forEach(b=>b.hidden=S.answers[b.dataset.clear]==null);
 };
 const form=root.querySelector('.study-shell');form.onchange=readPage;form.oninput=readPage;
 form.addEventListener('click',e=>{const b=e.target.closest('[data-clear]');if(!b)return;root.querySelectorAll('[name="'+b.dataset.clear+'"]').forEach(i=>i.checked=false);readPage();});
 const b=document.getElementById('back');if(b)b.onclick=()=>{if(closing)return;readPage();S.qpage=2;changed();persist();T.log('questionnaire_page',{page:2});questionPage();};
 document.getElementById('next').onclick=()=>{readPage();if(validatePage(n).length){msg('Please enter a nonnegative amount, leave it blank, or choose Prefer not to answer.','error');return;}if(n===3){finish();return;}S.qpage=3;T.log('questionnaire_page',{page:3});changed();persist();questionPage();};
}
function validatePage(page){return Q.filter(q=>q.page===page).filter(q=>{const v=S.answers[q.id];if(v===null||v===undefined||v==='')return false;if(q.type==='number')return S.answers[q.refusalKey]!==1&&(!Number.isFinite(v)||v<0);return !Number.isInteger(v)||v<1||v>7;}).map(q=>q.id);}
function snapshot(){const ts=T.snapshot();const traceCopy=JSON.parse(JSON.stringify(T.s));delete traceCopy.events;return {phase:S.phase,qpage:S.qpage,color:S.color,answers:JSON.parse(JSON.stringify(S.answers)),trace:traceCopy,summary:ts,technicalText:S.technicalText||'',survey_elapsed_ms:S.surveyStartedAt?(S.surveyBaseMs||0)+Date.now()-S.surveyStartedAt:null,surveyStartedAt:S.surveyStartedAt||null,route:S.route,storeStarted:S.storeStarted,revision:S.revision,total_events:(T.s.eventsBase||0)+T.s.events.length};}
function nextBatch(){const arr=T.s.events.filter(e=>e.seq>(S.ack||0));let batch=[],size=2;for(const e of arr){const len=JSON.stringify(e).length+1;if(batch.length>=100||size+len>30000)break;batch.push(e);size+=len;}return batch;}
async function sync(urgent,action){if(preview){S.dirty=false;return {ok:true,preview:true};}if(!S||!S.responseId)return;if(netPromise){await netPromise;if(!urgent)return;}
 // Every frozen network snapshot receives a unique monotone number; retries reuse its payload.
 S.revision=Math.max(S.revision||0,revisionSent||0)+1;persist();
 const snap=snapshot(),rev=S.revision,events=nextBatch();
 netPromise=request(action||'save',{revision:rev,snapshot:snap,events},urgent?3:1).then(r=>{S.ack=Math.max(S.ack||0,r.ack||0);revisionSent=Math.max(revisionSent,r.revision||0,rev);if(S.revision===rev&&!r.stale)S.dirty=false;else S.dirty=true;persist();if(S.phase==='survey'&&!closing)msg(S.revision===rev&&!r.stale?'Answers saved.':'Earlier progress synced; recent changes remain in this browser.',S.revision===rev&&!r.stale?'ok':'');return r;});
 try{return await netPromise;}finally{netPromise=null;}
}
let backgroundTimer;
function scheduleSync(){if(!S||['done','withdrawn'].includes(S.phase))return;clearTimeout(backgroundTimer);backgroundTimer=setTimeout(async()=>{if(S&&!closing&&S.phase!=='done'&&(S.dirty||nextBatch().length)){try{await sync(false);}catch(e){msg('Not yet synced. You may keep answering; keep this tab open.','error');}}if(S&&!['done','withdrawn'].includes(S.phase))scheduleSync();},(Math.max(60,cfg.backgroundSyncSeconds||75)+Math.random()*20)*1000);}
async function finish(){if(closing)return;closing=true;document.getElementById('next').disabled=true;const back=document.getElementById('back');if(back)back.disabled=true;
 root.querySelectorAll('.study-shell input,.clear-answer').forEach(e=>e.disabled=true);
 T.stop();T.log('submit_attempt');changed();persist();clearTimeout(backgroundTimer);msg('Submitting your answers and route record. Please keep this tab open…');
 try{if(preview){donePreview();return;}if(netPromise){try{await netPromise;}catch(e){/* retry full current snapshot below */}}
  let rounds=0;while(nextBatch().length < T.s.events.filter(e=>e.seq>(S.ack||0)).length){if(++rounds>300)throw new Error('The event record is unusually long. Please contact the researcher.');await sync(true);}
  const r=await sync(true,'finish');if(!r||r.status!=='completed')throw new Error('No final confirmation was returned.');S.phase='done';S.dirty=false;persist();if(releaseTabLock)releaseTabLock();
  if(!isTest&&cfg.completionConfirmedForThisStudy&&/^https:\/\/app\.prolific\.com\/submissions\/complete\?cc=[A-Za-z0-9]+$/.test(cfg.completionUrl)){location.assign(cfg.completionUrl);}else done();
 }catch(e){closing=false;root.querySelectorAll('.study-shell input,.clear-answer').forEach(e=>e.disabled=false);document.getElementById('next').disabled=false;const wtp=root.querySelector('[name="wtp1"]');if(wtp&&S.answers.wtp1_declined===1)wtp.disabled=true;if(back)back.disabled=false;msg('Your final submission has NOT been confirmed. '+e.message+' Select Finish to retry, or contact the researcher.','error');scheduleSync();}
}
function donePreview(){S.phase='done';persist();done();}
function done(){cleanupStore();if(T)T.stop();shell('<h1>'+(preview?'Preview complete':'Your responses have been saved')+'</h1><p>'+(preview?'This was a local preview. Nothing was sent to Google or Prolific.':'Thank you for taking part.')+'</p>'+(preview?'<button class="secondary" id="export">Download preview route log</button>':isTest?'<p>Test session complete. This record must not be treated as a research participant.</p>':cfg.completionConfirmedForThisStudy?'<p>Your completion code: <b>'+esc(cfg.completionCode)+'</b></p><a class="primary" href="'+esc(cfg.completionUrl)+'">Return to Prolific</a>':'<p>Please contact the researcher through Prolific.</p>'),'Complete');if(preview)document.getElementById('export').onclick=downloadTrace;}
window.addEventListener('pagehide',()=>{if(T){T.tick();T.stop();}persist();});
window.addEventListener('pageshow',e=>{if(e.persisted&&S&&S.phase==='browse'&&T)T.begin(true);});
window.addEventListener('beforeunload',e=>{if(S&&S.phase!=='done'&&S.phase!=='withdrawn'&&S.dirty&&!preview){persist();e.preventDefault();e.returnValue='';}});
window.addEventListener('error',e=>{if(T&&S&&S.phase!=='done')T.log('technical_error',{kind:'script',message:String(e.message||'Resource failed').slice(0,300)});});
setInterval(()=>{if(S&&S.phase!=='done'){persist();const el=document.getElementById('live-count');if(el&&T)el.textContent=T.s.totalTransitions;}},5000);
// Exposed read-only diagnostics for local QA; no credentials or participant identifiers returned.
window.STUDY_DIAGNOSTICS=()=>S&&T?{build:cfg.build,preview,condition:S.condition,phase:S.phase,qpage:S.qpage,summary:T.snapshot(),events:JSON.parse(JSON.stringify(T.s.events))}:{build:cfg.build,preview};
if(design){S=newState('PREVIEW-'+uuid());S.condition=force==='B'?1:0;S.phase='browse';initTrace();showStore();}
else if(!preview&&(!cfg.apiUrl||(!isTest&&!canCollect()))){shell('<h1>This study is not open yet</h1><p>This is a new, independent study. The researcher must connect a NEW database and complete launch settings before recruitment.</p><p><a href="preview.html">Open local design previews</a></p>','Not collecting data');}
else {
 let tabPid='';try{tabPid=sessionStorage.getItem(NS+'tab_pid')||'';}catch(e){}
 const cached=tabPid&&(!urlPid||urlPid===tabPid)?load(tabPid):null;
 if(cached&&cached.responseId&&cached.condition!==null&&cached.phase!=='consent'){
  S=cached;
  tabLock().then(ok=>{if(!ok){shell('<h1>Continue in your original tab</h1><p>This session is already open in another tab. Please close the duplicate tab.</p>','Session open');return;}initTrace();route();scheduleSync();});
 }else consent();
}
})();
