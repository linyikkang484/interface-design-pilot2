/* Client-observed route and visibility record. No pointer coordinates or keystrokes. */
(function(){
'use strict';
class Trace {
 constructor(state,changed){
  this.state=state;this.changed=changed||function(){};
  const s=state.trace||(state.trace={events:[],elapsedStarted:null,totalTransitions:0,firstPdpTransitions:null,firstPdpPath:[],path:[],page:null,color:'beige',visibleMs:0,moduleMs:{home:0,collection:0,products:0,pdp:0},gaps:0,clickCount:0,exposure:[],complete:false});
  this.s=s;this.active=false;this.nowPerf=performance.now();this.previousVisible=document.visibilityState==='visible';
  this.tickHandler=()=>this.tick();this.visHandler=()=>{this.tick();this.previousVisible=document.visibilityState==='visible';if(this.active)this.log('visibility',{state:document.visibilityState});};
  this.scrollHandler=()=>{if(!this.scheduled){this.scheduled=true;requestAnimationFrame(()=>{this.scheduled=false;this.tick();});}};
  document.addEventListener('visibilitychange',this.visHandler);window.addEventListener('scroll',this.scrollHandler,{passive:true});
  this.timer=setInterval(this.tickHandler,1000);
 }
 log(type,data){const s=this.s;const e={seq:(s.eventsBase||0)+s.events.length+1,type:type,t_ms:s.elapsedStarted===null?0:Math.max(0,Date.now()-s.elapsedStarted),data:data||{}};s.events.push(e);this.changed();return e;}
 begin(resume){
  if(this.s.elapsedStarted===null)this.s.elapsedStarted=Date.now();
  this.active=true;this.nowPerf=performance.now();this.previousVisible=document.visibilityState==='visible';
  if(resume){this.s.gaps++;this.log('reload_resume',{page:this.s.page,note:'Unobserved interval is not imputed as visible time.'});}
  else this.log('browsing_start',{viewport:{width:innerWidth,height:innerHeight},font_status:document.fonts?document.fonts.status:'unknown'});
 }
 tick(){const current=performance.now(),delta=current-this.nowPerf;this.nowPerf=current;
  if(!this.active||!this.previousVisible)return;
  if(delta<0||delta>6000){this.s.gaps++;this.log('timing_gap',{observed_interval_ms:Math.round(delta)});return;}
  this.s.visibleMs+=delta;
  const top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'))||112;
  document.querySelectorAll('[data-module]').forEach(el=>{
   if(el.hidden||el.closest('[hidden]'))return;
   const r=el.getBoundingClientRect();const overlap=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top));
   const threshold=Math.min(r.height,innerHeight-top)*.25;
   if(overlap>=threshold&&r.width>0){const k=el.dataset.module;this.s.moduleMs[k]=(this.s.moduleMs[k]||0)+delta;
    if(this.s.exposure.indexOf(k)<0){this.s.exposure.push(k);this.log('module_visible',{module:k,definition:'At least 25% of min(module height, available viewport) vertically visible.'});}
   }
  });
 }
 navigate(page,module,reason){this.tick();const s=this.s,prior=s.page;
  if(prior!==page){if(prior!==null){s.totalTransitions++;this.log('transition',{from:prior,to:page,reason:reason});}
   s.page=page;s.path.push(page);this.log('page_view',{page:page,module:module,reason:reason});
   if(page==='pdp'&&s.firstPdpTransitions===null){s.firstPdpTransitions=s.totalTransitions;s.firstPdpPath=s.path.slice();}
  }else this.log('anchor',{page:page,module:module,reason:reason});
  this.changed();
 }
 click(target,extra){this.tick();this.s.clickCount++;this.log('click',Object.assign({target:target,page:this.s.page},extra||{}));}
 finish(color){this.tick();this.s.color=color;this.s.complete=true;this.s.endedAt=Date.now();this.log('browsing_complete',{color:color,page:this.s.page});this.active=false;this.changed();}
 stop(){this.tick();this.active=false;this.changed();}
 destroy(){this.stop();clearInterval(this.timer);document.removeEventListener('visibilitychange',this.visHandler);window.removeEventListener('scroll',this.scrollHandler);}
 snapshot(){this.tick();const s=this.s;return {first_pdp_transitions:s.firstPdpTransitions,total_transitions:s.totalTransitions,first_pdp_path:s.firstPdpPath,path:s.path,click_count:s.clickCount,elapsed_ms:s.complete&&s.frozenElapsedMs!==undefined?s.frozenElapsedMs:s.elapsedStarted===null?null:Math.max(0,(s.endedAt||Date.now())-s.elapsedStarted),visible_ms:Math.round(s.visibleMs),module_visible_ms:Object.fromEntries(Object.entries(s.moduleMs).map(([k,v])=>[k,Math.round(v)])),time_gap:s.gaps>0?1:0,time_gap_count:s.gaps,exposure:s.exposure,task_complete:s.complete?1:0};}
}
window.StudyTrace=Trace;
})();
