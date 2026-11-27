(function(global){'use strict';
function init({grid,engine,products,finishFor}){
 if(!grid)return null;
 const toggle=document.getElementById('catalog-motion-toggle'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),duration=6000;
 let enabled=!reduced.matches,supported=typeof engine?.createMotion==='function',motion=null,observer=null,request=0,active=null,hovered=null,focused=null,elapsed=0,lastTime=null,lastPaint=-Infinity,disposed=false;
 const visible=new Set(),listeners=[];
 const on=(target,type,handler,options)=>{target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));};
 const arts=()=>Array.from(grid.querySelectorAll('.module-card-image')).filter(art=>art.isConnected&&visible.has(art));
 const state=()=>!supported?'unavailable':document.hidden?'hidden':!arts().length?'offscreen':!enabled?(reduced.matches?'reduced':'paused'):'playing';
 function control(){if(!toggle)return;toggle.hidden=!supported;toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Modül animasyonlarını duraklat':'Modül animasyonlarını oynat');toggle.title=enabled?'Animasyonları duraklat':'Animasyonları oynat';toggle.textContent=enabled?'Ⅱ':'▷';}
 function cancel(unmount=false){if(request)cancelAnimationFrame(request);request=0;lastTime=null;if(unmount){motion?.unmount();if(active)delete active.dataset.motionActive;active=null;delete grid.dataset.activeProduct;}}
 function activate(art,rebuild=false){
  if(!art||!supported)return false;if(active===art&&!rebuild)return true;
  const product=products.find(p=>p.id===art.closest('[data-product-id]')?.dataset.productId);if(!product)return false;
  try{if(!motion)motion=engine.createMotion();if(!motion)throw Error('Motion preview unavailable');motion.mount(art,product,finishFor(product));if(active)delete active.dataset.motionActive;active=art;art.dataset.motionActive='true';art.classList.add('is-ready');grid.dataset.activeProduct=product.id;elapsed=0;lastTime=null;lastPaint=-Infinity;motion.draw(0);return true;}
  catch(error){supported=false;motion?.dispose();motion=null;cancel(true);grid.dataset.motionState='unavailable';control();return false;}
 }
 function schedule(){if(!request&&!disposed&&state()==='playing')request=requestAnimationFrame(frame);}
 function wake(){if(disposed)return;const current=state();grid.dataset.motionState=current;control();if(current!=='playing'){cancel(current!=='paused');return;}const list=arts(),preferred=[focused,hovered].find(art=>list.includes(art));if(activate(preferred||(list.includes(active)?active:list[0])))schedule();}
 function frame(now){
  request=0;if(state()!=='playing'||!arts().includes(active)){wake();return;}
  if(lastTime!==null)elapsed+=Math.min(100,Math.max(0,now-lastTime));lastTime=now;
  if(elapsed>=duration){const list=arts(),held=[hovered,focused].includes(active),next=held?active:list[(list.indexOf(active)+1)%list.length];if(next===active)elapsed%=duration;else if(!activate(next))return;}
  if(now-lastPaint>=1000/24){motion.draw(elapsed);lastPaint=now;}schedule();
 }
 function cardArt(target){return target?.closest?.('[data-product-id]')?.querySelector('.module-card-image')||null;}
 function measure(){visible.clear();grid.querySelectorAll('.module-card-image').forEach(art=>{const r=art.getBoundingClientRect(),w=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),h=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));if(r.width&&r.height&&w*h/(r.width*r.height)>=.55)visible.add(art);});wake();}
 function refresh(){
  observer?.disconnect();cancel(true);visible.clear();if(!hovered?.isConnected)hovered=null;if(!focused?.isConnected)focused=null;
  if(supported&&'IntersectionObserver'in global){if(!observer)observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting&&(entry.intersectionRatio===undefined||entry.intersectionRatio>=.55))visible.add(entry.target);else visible.delete(entry.target);});wake();},{threshold:[0,.55]});grid.querySelectorAll('.module-card-image').forEach(art=>observer.observe(art));wake();}
  else if(supported)measure();else wake();
 }
 function variantChanged(card){const art=card?.querySelector('.module-card-image');if(art===active&&(state()==='playing'||state()==='paused')){activate(art,true);wake();}}
 on(grid,'pointerover',event=>{if(event.pointerType==='touch')return;const art=cardArt(event.target);if(art&&art!==hovered){hovered=art;wake();}});
 on(grid,'pointerout',event=>{if(cardArt(event.relatedTarget)!==hovered)hovered=null;});
 on(grid,'focusin',event=>{focused=cardArt(event.target);wake();});on(grid,'focusout',event=>{focused=cardArt(event.relatedTarget);wake();});
 if(toggle)on(toggle,'click',()=>{enabled=!enabled;wake();});
 if(reduced.addEventListener)on(reduced,'change',event=>{enabled=!event.matches;wake();});
 on(document,'visibilitychange',wake);on(global,'resize',()=>{motion?.resize();if(!('IntersectionObserver'in global))measure();else wake();});
 if(!('IntersectionObserver'in global))on(global,'scroll',measure,{passive:true});
 on(global,'pagehide',()=>{cancel(true);motion?.dispose();motion=null;});on(global,'pageshow',wake);
 function dispose(){cancel(true);observer?.disconnect();visible.clear();motion?.dispose();motion=null;listeners.splice(0).forEach(remove=>remove());disposed=true;grid.dataset.motionState='disposed';}
 control();grid.dataset.motionState=state();return{refresh,variantChanged,dispose};
}
global.AdopCatalogMotion={init};
})(window);
