/* Pilot 2 stimulus. Shared DOM/CSS/images; only page grouping changes. */
(function () {
'use strict';
const C = window.STIMULUS;
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function moduleHTML(m) {
 if (m.id === 'home') return `<section class="module home" id="m-home" data-module="home"><div class="hero-photo"><img src="${m.image}" alt="${esc(m.alt)}" width="462" height="711" decoding="async"></div><div class="hero-copy"><h1>A MODERN<br>ICON</h1><p>${esc(m.body)}</p><button class="primary light" data-to="${m.next}">${esc(m.cta)} <span aria-hidden="true">→</span></button></div></section>`;
 return `<section class="module collection" id="m-collection" data-module="collection"><div class="collection-copy"><h2>${esc(m.title)}</h2><p>${esc(m.body)}</p><button class="primary light" data-to="${m.next}">${esc(m.cta)}</button></div><div class="collection-photo"><img src="${m.image}" alt="${esc(m.alt)}" width="564" height="297" decoding="async"></div></section>`;
}
function productsHTML() { return `<section class="module products" id="m-products" data-module="products"><aside class="categories" aria-label="Product grouping"><p>ALL BAGS</p><span>Bonbon Mini</span><span>Four colors</span></aside><div class="product-area"><h2>${esc(C.collection)} Collection</h2><div class="product-grid">${C.colors.map(c=>`<button class="product-card" data-color-card="${c.id}" aria-label="View Bonbon Mini in ${esc(c.name)}"><span class="product-photo"><img src="${c.image}" alt="Bonbon Mini in ${esc(c.name)}" width="568" height="724" decoding="async"></span><span class="product-name">Bonbon Mini</span><span class="product-color">${esc(c.name)}</span></button>`).join('')}</div></div></section>`; }
class PilotStore {
 constructor(root,state,trace,options) {
  Object.assign(this,{root,state,trace,options:options||{}});this.cond=Number(state.condition);this.color=state.color||'beige';this.bag=false;
  root.innerHTML=`<div class="stimulus"><header class="site-header"><button class="wordmark" data-to="home" aria-label="Maison Améline homepage">AMÉLINE</button><nav class="site-nav" aria-label="Main navigation"><button data-to="home">NEW</button><button data-to="products">BAGS</button><button data-to="collection">COLLECTION</button></nav></header><main class="site-main">${C.modules.map(moduleHTML).join('')}${productsHTML()}<section class="pdp" id="m-pdp" data-module="pdp" hidden></section></main><footer class="site-footer">Maison Améline</footer></div>`;
  this.renderPDP();
  this.handleClick=e=>this.click(e);root.addEventListener('click',this.handleClick);
  this.handleToggle=e=>{if(e.target.tagName==='DETAILS')trace.log('details_toggle',{section:e.target.dataset.detail,open:e.target.open});};root.addEventListener('toggle',this.handleToggle,true);
  this.imageError=e=>{if(e.target.tagName==='IMG')trace.log('technical_error',{kind:'image',asset:e.target.getAttribute('src')});};root.addEventListener('error',this.imageError,true);
  this.pop=e=>{if(e.state&&e.state.trial===state.localId&&e.state.kind==='store')this.go(e.state.module,'browser_history',false);};window.addEventListener('popstate',this.pop);
  const initialModule=state.route||'home';
  root.querySelectorAll('[data-module]').forEach(el=>{el.hidden=initialModule==='pdp'?el.dataset.module!=='pdp':this.cond===0?el.dataset.module==='pdp':el.dataset.module!==initialModule;});
  trace.begin(!!state.storeStarted);state.storeStarted=true;this.go(initialModule,'entry',false,true);
 }
 renderPDP() {
  const c=C.colors.find(c=>c.id===this.color)||C.colors[1];this.color=c.id;
  this.root.querySelector('#m-pdp').innerHTML=`<div class="pdp-photo"><img id="pdp-image" src="${c.image}" alt="Bonbon Mini in ${esc(c.name)}" width="568" height="724"></div><div class="pdp-info"><h1>Bonbon Mini</h1><p class="pdp-description">${esc(C.pdp.description)}</p><p class="color-label">Color: <span id="color-name">${esc(c.name)}</span></p><div class="swatches" aria-label="Select a color">${C.colors.map(x=>`<button class="swatch" data-swatch="${x.id}" style="background:${x.hex}" aria-label="${esc(x.name)}" aria-pressed="${x.id===c.id}"></button>`).join('')}</div><button class="primary add-selection" data-bag="add">ADD TO BAG</button><div class="bag-notice" id="bag-notice" hidden>Added to your selection. <button class="text-button" data-bag="remove">Remove</button></div><details data-detail="details"><summary>Details</summary><p>${esc(C.pdp.details)}</p></details><details data-detail="care"><summary>Care</summary><p>${esc(C.pdp.care)}</p></details><div class="study-next"><button class="secondary" data-continue>Continue to questions →</button></div></div>`;
 }
 click(e) {
  const b=e.target.closest('button');if(!b||!this.root.contains(b))return;
  if(b.dataset.to){const reason=b.closest('header')?'header':'primary';this.trace.click('navigation',{module:b.dataset.to,via:reason});this.go(b.dataset.to,reason,true);}
  else if(b.dataset.colorCard){this.trace.click('color_card',{color:b.dataset.colorCard});this.setColor(b.dataset.colorCard);this.go('pdp','color_card',true);}
  else if(b.dataset.swatch){this.trace.click('color_swatch',{color:b.dataset.swatch});this.setColor(b.dataset.swatch);}
  else if(b.dataset.bag){this.bag=b.dataset.bag==='add';this.trace.click('bag_'+b.dataset.bag,{color:this.color});this.root.querySelector('#bag-notice').hidden=!this.bag;}
  else if(b.hasAttribute('data-continue')){this.trace.click('continue_questions');this.trace.finish(this.color);this.state.color=this.color;if(this.options.onContinue)this.options.onContinue();}
 }
 setColor(id) {const c=C.colors.find(x=>x.id===id);if(!c)return;this.color=id;this.state.color=id;this.trace.s.color=id;const im=this.root.querySelector('#pdp-image');im.src=c.image;im.alt='Bonbon Mini in '+c.name;this.root.querySelector('#color-name').textContent=c.name;this.root.querySelectorAll('[data-swatch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.swatch===id)));this.trace.log('color',{color:id,code:c.code});}
 go(module,reason,push,initial) {
  if(!['home','collection','products','pdp'].includes(module))return;
  const page=module==='pdp'?'pdp':this.cond===0?'continuous':module;
  this.trace.navigate(page,module,reason);this.state.route=module;
  this.root.querySelectorAll('[data-module]').forEach(el=>{el.hidden=page==='pdp'?el.dataset.module!=='pdp':this.cond===0?el.dataset.module==='pdp':el.dataset.module!==module;});
  const h={trial:this.state.localId,kind:'store',module};
  if(push)history.pushState(h,'','#'+module);else if(initial)history.replaceState(h,'','#'+module);
  if(this.cond===0&&module!=='pdp'&&module!=='home')this.root.querySelector('#m-'+module).scrollIntoView({behavior:'instant',block:'start'});else window.scrollTo({top:0,behavior:'instant'});
  this.trace.changed();
 }
 destroy(){this.trace.stop();this.root.removeEventListener('click',this.handleClick);this.root.removeEventListener('toggle',this.handleToggle,true);this.root.removeEventListener('error',this.imageError,true);window.removeEventListener('popstate',this.pop);}
}
window.PilotStore=PilotStore;
})();
