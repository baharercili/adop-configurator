(function(){'use strict';
const M=window.AdopModules,P=window.AdopModulePreview,rail=document.getElementById('home-modules-grid');if(!M||!P||!rail)return;
const ids=['bb-60-drawers','bb-45-plain','bb-90-drop','bb-120-hybrid','uw-36-vertical','uw-60-fluted-glass','st-180','ws-90','bb-45-open','bb-60-fluted-glass','bb-90-deep-drawer','uw-120-hybrid'];
const products=ids.map(id=>M.products.find(p=>p.id===id)).filter(Boolean),selected=new Map();let queue=[],scheduled=false,ready=false;
const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(n);
const variantFor=p=>selected.get(p.id)||M.cardVariants(p)[0];
const finishFor=p=>{const v=variantFor(p);return{bodyFinish:v.bodyFinish,frontFinish:v.frontFinish,spanFinish:v.spanFinish};};
const link=(p,c)=>'modul.html?'+new URLSearchParams({id:p.id,...c});
function shortName(p){const names={plain:'Kapaklı alt kutu',drawers:'Çekmeceli alt kutu',drop:p.family==='BB'?'Düşer kapaklı alt kutu':'Kapaklı duvar dolabı',hybrid:p.family==='BB'?'Hibrit alt kutu':'Hibrit duvar dolabı',open:p.family==='BB'?'Açık alt kutu':'Açık duvar rafı',vertical:'Dikey duvar dolabı','vertical-glass':'Dikey cam dolap','fluted-glass':p.family==='BB'?'Cam kapaklı alt kutu':'Cam kapaklı duvar dolabı','deep-drawer':'Derin çekmeceli alt kutu'};return p.family==='ST'?'Kaydırılabilir tabla':p.family==='WS'?'Duvar rafı':names[p.front]||p.name;}
function swatches(p,dual){const variants=M.cardVariants(p).filter(v=>v.dual===dual);if(!variants.length)return'';return`<div class="hm-swatches${dual?' hm-dual-swatches':''}" role="group" aria-label="${dual?'Çift renk':'Tek renk'}">${variants.map(v=>{const body=M.finishes.find(f=>f.id===v.bodyFinish),front=M.finishes.find(f=>f.id===v.frontFinish);return`<button type="button" ${dual?'data-home-variant':'data-home-finish'}="${v.id}" data-body-finish="${v.bodyFinish}" data-front-finish="${v.frontFinish}" aria-label="${v.ariaLabel}" title="${v.ariaLabel}" aria-pressed="${v.id===variantFor(p).id}"><i style="${dual?'--swatch-body:'+body.color+';--swatch-front:'+front.color:'--swatch:'+body.color}" aria-hidden="true">${dual?'<span class="swatch-body"></span><span class="swatch-front"></span>':''}</i><span>${v.label}</span></button>`;}).join('')}</div>`;}
function colorPeek(p){const current=variantFor(p),ids=[current.bodyFinish,...M.finishes.map(f=>f.id).filter(id=>id!==current.bodyFinish)].slice(0,3);return'<span class="hm-color-peek" aria-hidden="true">'+ids.map(id=>`<i style="--swatch:${M.finishes.find(f=>f.id===id).color}"></i>`).join('')+'</span><span>Renk seç</span>';}
rail.innerHTML=products.map(p=>{const c=finishFor(p),href=link(p,c);return`<article class="hm-card" data-home-product="${p.id}"><a class="hm-art" href="${href}" aria-label="${p.name} ürününü aç"><img data-home-product-image="${p.id}" width="800" height="600" alt="${p.name}" hidden></a><h3><a href="${href}">${shortName(p)}</a></h3><p class="hm-width">${p.width} cm</p><strong class="hm-price">${money(M.price(p,c))}</strong><button type="button" class="hm-color-button" data-home-colors="${p.id}" aria-label="${shortName(p)} için renk seç" aria-haspopup="dialog">${colorPeek(p)}</button><span class="hm-finish">${variantFor(p).label}</span></article>`;}).join('');
const colorDialog=document.createElement('dialog');colorDialog.className='hm-color-dialog';colorDialog.setAttribute('aria-labelledby','hm-color-title');colorDialog.innerHTML='<header><h2 id="hm-color-title">Rengini seç</h2><button type="button" data-home-color-close aria-label="Renk seçimini kapat">×</button></header><div class="hm-color-options"></div>';document.body.appendChild(colorDialog);let colorProduct=null,colorOpener=null;
function openColors(id,opener){const p=products.find(p=>p.id===id);if(!p)return;colorProduct=p;colorOpener=opener;const dual=M.cardVariants(p).some(v=>v.dual);colorDialog.querySelector('.hm-color-options').innerHTML='<h3>Tek renk</h3>'+swatches(p,false)+(dual?'<h3>Çift renk</h3>'+swatches(p,true):'');colorDialog.showModal();wakeMotion();colorDialog.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});}
function selectVariant(p,id){const v=M.cardVariants(p).find(v=>v.id===id);if(!v)return;selected.set(p.id,v);const card=rail.querySelector(`[data-home-product="${p.id}"]`),c=finishFor(p);card.querySelectorAll('a').forEach(a=>a.href=link(p,c));card.querySelector('.hm-price').textContent=money(M.price(p,c));card.querySelector('.hm-finish').textContent=v.label;const button=card.querySelector('[data-home-colors]');button.innerHTML=colorPeek(p);button.setAttribute('aria-label',shortName(p)+' için renk seç · '+v.label);enqueue(card.querySelector('img'),true);refreshMotionVariant(card);}
colorDialog.addEventListener('click',e=>{const b=e.target.closest('[data-home-finish],[data-home-variant]');if(b&&colorProduct){selectVariant(colorProduct,b.dataset.homeVariant||b.dataset.homeFinish);colorDialog.close();return;}if(e.target.closest('[data-home-color-close]')){colorDialog.close();return;}if(e.target===colorDialog){const r=colorDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)colorDialog.close();}});
colorDialog.addEventListener('close',()=>{colorOpener?.focus({preventScroll:true});colorProduct=null;wakeMotion();});
function enqueue(node,first=false){if(!node?.isConnected)return;queue=queue.filter(n=>n!==node);first?queue.unshift(node):queue.push(node);schedule();}
function schedule(){if(!ready||scheduled||!queue.length)return;scheduled=true;const run=()=>{scheduled=false;const node=queue.shift();if(node?.isConnected){const p=products.find(p=>p.id===node.dataset.homeProductImage),c=finishFor(p),src=P.render(p,c);if(src){node.src=src;node.alt=p.name+' · '+variantFor(p).label;node.hidden=false;}}schedule();};if(window.requestIdleCallback)requestIdleCallback(run,{timeout:1200});else requestAnimationFrame(run);}
rail.addEventListener('click',e=>{const b=e.target.closest('[data-home-colors]');if(b)openColors(b.dataset.homeColors,b);});
const prev=document.getElementById('home-modules-prev'),next=document.getElementById('home-modules-next');
function updateArrows(){if(prev)prev.disabled=rail.scrollLeft<2;if(next)next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-2;}
prev?.addEventListener('click',()=>rail.scrollBy({left:-rail.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));next?.addEventListener('click',()=>rail.scrollBy({left:rail.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));rail.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);updateArrows();
function railKeys(element){element?.addEventListener('keydown',e=>{if(e.target!==element||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';if(e.key==='Home'||e.key==='End')element.scrollTo({left:e.key==='Home'?0:element.scrollWidth,behavior});else element.scrollBy({left:element.clientWidth*(e.key==='ArrowRight'?.85:-.85),behavior});});}
railKeys(rail);railKeys(document.querySelector('.home-process-grid'));
// A single live preview follows the visible cards; all others keep their
// lightweight still image. The loop is owned here, never by each product.
const motionToggle=document.getElementById('home-modules-motion-toggle'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled=!reduced.matches,motionSupported=typeof P.createMotion==='function',motion=null,motionObserver=null,motionRequest=0,activeArt=null,hoveredArt=null,focusedArt=null,cycleTime=0,lastMotionTime=null,lastMotionPaint=-Infinity;
const visibleArts=new Set(),motionDuration=6000;
function visibleMotionArts(){return Array.from(rail.querySelectorAll('.hm-art')).filter(art=>art.isConnected&&visibleArts.has(art));}
function motionState(){return !motionSupported?'unavailable':!ready?'loading':document.hidden?'hidden':colorDialog.open?'dialog':!visibleMotionArts().length?'offscreen':!motionEnabled?(reduced.matches?'reduced':'paused'):'playing';}
function updateMotionControl(){if(motionToggle){motionToggle.hidden=!motionSupported;motionToggle.setAttribute('aria-pressed',String(motionEnabled));motionToggle.setAttribute('aria-label',motionEnabled?'Modül animasyonlarını duraklat':'Modül animasyonlarını oynat');motionToggle.textContent=motionEnabled?'Ⅱ':'▷';}}
function cancelMotion(unmount=false){if(motionRequest)cancelAnimationFrame(motionRequest);motionRequest=0;lastMotionTime=null;if(unmount){motion?.unmount();if(activeArt)delete activeArt.dataset.motionActive;activeArt=null;delete rail.dataset.activeProduct;}}
function activateMotion(art,rebuild=false){
 if(!art||!motionSupported)return false;
 if(activeArt===art&&!rebuild)return true;
 const product=products.find(p=>p.id===art.closest('[data-home-product]')?.dataset.homeProduct);if(!product)return false;
 try{if(!motion)motion=P.createMotion();if(!motion)throw Error('Motion preview unavailable');motion.mount(art,product,finishFor(product));if(activeArt)delete activeArt.dataset.motionActive;activeArt=art;art.dataset.motionActive='true';rail.dataset.activeProduct=product.id;cycleTime=0;lastMotionTime=null;lastMotionPaint=-Infinity;motion.draw(0);return true;}
 catch(error){motionSupported=false;motion?.dispose();motion=null;cancelMotion(true);rail.dataset.motionState='unavailable';updateMotionControl();return false;}
}
function queueMotion(){if(!motionRequest&&motionState()==='playing')motionRequest=requestAnimationFrame(animateMotion);}
function wakeMotion(){
 const state=motionState();rail.dataset.motionState=state;updateMotionControl();
 if(state!=='playing'){cancelMotion(state!=='paused');return;}
 const arts=visibleMotionArts(),preferred=[focusedArt,hoveredArt].find(art=>arts.includes(art));
 if(!activateMotion(preferred|| (arts.includes(activeArt)?activeArt:arts[0])))return;queueMotion();
}
function animateMotion(now){
 motionRequest=0;const state=motionState();if(state!=='playing'){wakeMotion();return;}
 const arts=visibleMotionArts();if(!arts.includes(activeArt)){wakeMotion();return;}
 if(lastMotionTime!==null)cycleTime+=Math.min(100,Math.max(0,now-lastMotionTime));lastMotionTime=now;
 if(cycleTime>=motionDuration){const held=[hoveredArt,focusedArt].includes(activeArt),nextArt=held?activeArt:arts[(arts.indexOf(activeArt)+1)%arts.length];if(nextArt===activeArt)cycleTime%=motionDuration;else if(!activateMotion(nextArt))return;}
 if(now-lastMotionPaint>=1000/24){motion.draw(cycleTime);lastMotionPaint=now;}
 queueMotion();
}
function refreshMotionVariant(card){const art=card.querySelector('.hm-art');if(art!==activeArt)return;if(motionState()==='playing'||rail.dataset.motionState==='paused'){activateMotion(art,true);wakeMotion();}}
function cardArt(target){return target?.closest?.('[data-home-product]')?.querySelector('.hm-art')||null;}
rail.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const art=cardArt(event.target);if(art&&art!==hoveredArt){hoveredArt=art;wakeMotion();}});
rail.addEventListener('pointerout',event=>{if(cardArt(event.relatedTarget)!==hoveredArt){hoveredArt=null;}});
rail.addEventListener('focusin',event=>{focusedArt=cardArt(event.target);wakeMotion();});
rail.addEventListener('focusout',event=>{focusedArt=cardArt(event.relatedTarget);wakeMotion();});
motionToggle?.addEventListener('click',()=>{motionEnabled=!motionEnabled;wakeMotion();});
reduced.addEventListener?.('change',event=>{motionEnabled=!event.matches;wakeMotion();});
document.addEventListener('visibilitychange',wakeMotion);
window.addEventListener('resize',()=>{motion?.resize();wakeMotion();});
window.addEventListener('pagehide',()=>{cancelMotion(true);motion?.dispose();motion=null;});
window.addEventListener('pageshow',wakeMotion);
function observeMotion(){
 if(!motionSupported){wakeMotion();return;}
 if('IntersectionObserver'in window){motionObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{const visible=entry.isIntersecting&&(entry.intersectionRatio===undefined||entry.intersectionRatio>=.55);if(visible)visibleArts.add(entry.target);else visibleArts.delete(entry.target);});wakeMotion();},{threshold:[0,.55]});rail.querySelectorAll('.hm-art').forEach(art=>motionObserver.observe(art));}
 else{const measure=()=>{visibleArts.clear();const bounds=rail.getBoundingClientRect();rail.querySelectorAll('.hm-art').forEach(art=>{const r=art.getBoundingClientRect(),width=Math.max(0,Math.min(r.right,bounds.right,innerWidth)-Math.max(r.left,bounds.left,0)),height=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));if(r.width&&r.height&&width*height/(r.width*r.height)>=.55)visibleArts.add(art);});wakeMotion();};window.addEventListener('scroll',measure,{passive:true});rail.addEventListener('scroll',measure,{passive:true});window.addEventListener('resize',measure);measure();}
 wakeMotion();
}
updateMotionControl();rail.dataset.motionState=motionState();
Promise.resolve(window.AdopAppearance.ready()).then(()=>{ready=true;observeMotion();if('IntersectionObserver'in window){const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){observer.unobserve(item.target);enqueue(item.target.querySelector('img'));}}),{rootMargin:'150px'});rail.querySelectorAll('.hm-art').forEach(art=>observer.observe(art));}else rail.querySelectorAll('img').forEach(img=>enqueue(img));});
})();
