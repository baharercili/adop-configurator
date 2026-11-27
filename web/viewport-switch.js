(function(){'use strict';
 const source=document.currentScript?.src||new URL('viewport-switch.js',location.href).href,root=new URL('.',source),origin=location.origin,KEY='adop-viewport-handoff';
 const hostPath=new URL('gorunum.html',root).pathname;
 const isHost=[hostPath,hostPath.replace(/\.html$/,'')].includes(location.pathname.replace(/\/$/,''));
 function validPage(value){try{const u=new URL(value,origin);if(u.origin!==origin||u.username||u.password||!u.pathname.startsWith(root.pathname))return null;const p=u.pathname.slice(root.pathname.length);if(!/^(?:|v2\/|(?:v2\/)?(?:index|anasayfa|moduller|modul|kombinasyonlar|ilham)(?:\.html)?)$/.test(p))return null;return u.pathname+u.search+u.hash;}catch{return null;}}
 function framed(){try{return window.parent!==window&&window.frameElement?.id==='adop-site-preview'&&window.parent.AdopViewportHost===true&&window.parent.location.origin===origin;}catch{return false;}}
 const inside=framed();
 // Consume a short-lived handoff before app.js interprets the page defaults.
 if(inside){try{const raw=sessionStorage.getItem(KEY);if(raw){const d=JSON.parse(raw),page=validPage(location.href);if(d.page===page&&Date.now()-d.time>=0&&Date.now()-d.time<60000&&d.config&&typeof d.config==='object'){window.AdopViewportDraft=d.config;sessionStorage.removeItem(KEY);}else if(Date.now()-d.time>=60000)sessionStorage.removeItem(KEY);}}catch{}}
 function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
 const icons={mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 18h4"/>',desktop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>'};
 function makeBar(selected,onChange){const bar=document.createElement('div');bar.id='adop-viewport-bar';bar.className='adop-viewport-bar';bar.innerHTML='<div class="adop-viewport-options" role="group" aria-label="Site görünümü">'+[['mobile','Mobil'],['desktop','Masaüstü']].map(([id,label])=>'<button type="button" data-adop-viewport="'+id+'" aria-pressed="'+(id===selected)+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+icons[id]+'</svg><span>'+label+'</span></button>').join('')+'</div><span class="adop-viewport-warning" role="status" aria-live="polite"></span>';bar.addEventListener('click',e=>{const b=e.target.closest('[data-adop-viewport]');if(b)onChange(b.dataset.adopViewport,bar);});return bar;}
 if(inside){
  let queued=false;const notify=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;const page=validPage(location.href);if(page)window.parent.postMessage({type:'adop:viewport-page',page},origin);});};
  for(const method of ['pushState','replaceState']){const original=history[method];history[method]=function(){const result=original.apply(this,arguments);notify();return result;};}
  window.addEventListener('popstate',notify);window.addEventListener('hashchange',notify);ready(notify);return;
 }
 if(isHost){
  window.AdopViewportHost=true;
  ready(()=>{
   const params=new URLSearchParams(location.search);let page=validPage(params.get('page')||root.pathname)||root.pathname,mode=['mobile','desktop'].includes(params.get('mode'))?params.get('mode'):(matchMedia('(max-width:900px)').matches?'mobile':'desktop');
   const bar=makeBar(mode,next=>{mode=next;bar.querySelectorAll('[data-adop-viewport]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adopViewport===mode)));layout();writeURL();});
   const area=document.createElement('main');area.className='adop-viewport-area';area.setAttribute('aria-label','Site önizlemesi');const frameBox=document.createElement('div');frameBox.className='adop-viewport-frame-box';const frame=document.createElement('iframe');frame.id='adop-site-preview';frame.title='ADØP site önizlemesi';frame.allow='fullscreen';frame.src=page;frameBox.append(frame);area.append(frameBox);document.body.replaceChildren(bar,area);
   function writeURL(){const u=new URL(location.href);u.searchParams.set('mode',mode);u.searchParams.set('page',page);history.replaceState(null,'',u.pathname+u.search);}
   function layout(){const width=area.clientWidth,height=area.clientHeight,virtualWidth=mode==='mobile'?Math.min(390,width):1440,scale=mode==='mobile'?1:Math.min(1,width/virtualWidth);frame.style.width=virtualWidth+'px';frame.style.height=(height/scale)+'px';frame.style.transform='scale('+scale+')';frameBox.style.width=(virtualWidth*scale)+'px';frameBox.style.height=height+'px';area.dataset.mode=mode;}
   window.addEventListener('message',e=>{if(e.origin!==origin||e.source!==frame.contentWindow||e.data?.type!=='adop:viewport-page')return;const next=validPage(e.data.page);if(next){page=next;writeURL();}});
   frame.addEventListener('load',()=>{try{const next=validPage(frame.contentWindow.location.href);if(next){page=next;writeURL();}}catch{}layout();});window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);layout();writeURL();
  });return;
 }
 ready(()=>{document.body.classList.add('adop-viewport-native');const selected=matchMedia('(max-width:900px)').matches?'mobile':'desktop';let current=selected;
  const bar=makeBar(selected,(next,bar)=>{if(next===current)return;const page=validPage(location.href);if(!page)return;const bridge=window.AdopCustomerEditorBridge||window.AdopMobileEditorBridge;let config;try{config=bridge?.getState?.()?.config;}catch{bar.querySelector('.adop-viewport-warning').textContent='Tasarım korunamadı. Görünüm değiştirilemedi.';return;}
   if(config){try{const value=JSON.stringify({page,time:Date.now(),config});sessionStorage.setItem(KEY,value);if(sessionStorage.getItem(KEY)!==value)throw Error('storage');}catch{bar.querySelector('.adop-viewport-warning').textContent='Tasarım korunamadı. Görünüm değiştirilemedi.';return;}}
   const u=new URL('gorunum.html',root);u.searchParams.set('mode',next);u.searchParams.set('page',page);location.assign(u.href);
  });document.body.prepend(bar);const media=matchMedia('(max-width:900px)');media.addEventListener('change',e=>{current=e.matches?'mobile':'desktop';bar.querySelectorAll('[data-adop-viewport]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adopViewport===current)));});
 });
})();
