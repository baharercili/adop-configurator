(function (global) {
'use strict';
const C = global.AdopConfig;
if (!C) return;
const FIRST = 297.4, SECOND = 326.8, SPAN = 180, DISTANCE = 520, DURATION = 21000;
const modules = [{width:60,front:'plain',x:0},{width:60,front:'drawers',x:60},{width:90,front:'drop',x:120}];
const clamp = n => Math.max(0,Math.min(1,n));
const ease = n => { n=clamp(n); return n*n*n*(n*(n*6-15)+10); };
const lerp = (a,b,t) => a+(b-a)*t;
const round = n => Math.round((n+Number.EPSILON)*10)/10;
const format = n => Number(n).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});
function configuration(width) {
 return C.clean({modules,span:SPAN,spanEnabled:true,spanOffset:round(width-SPAN),bodyFinish:'oak',frontFinish:'cream',spanFinish:'oak',upper:[]});
}
const segments = [
 [0,1800,'first-home'],[1800,3200,'leave-first'],[3200,6000,'move-to-second'],
 [6000,7200,'enter-second'],[7200,9600,'adapt-second'],[9600,12200,'second-home'],
 [12200,14200,'prepare-return'],[14200,15400,'leave-second'],
 [15400,18200,'move-to-first'],[18200,19600,'enter-first'],[19600,DURATION,'first-home']
];
function sample(ms) {
 const time=((Number(ms)||0)%DURATION+DURATION)%DURATION;
 const segment=segments.find(s=>time<s[1])||segments[segments.length-1];
 const t=ease((time-segment[0])/(segment[1]-segment[0])), phase=segment[2];
 const firstLeft=-FIRST/2, secondLeft=DISTANCE-SECOND/2;
 let left=firstLeft, z=0, lift=0, width=FIRST, room=0;
 if(phase==='leave-first'){z=lerp(0,100,t);lift=4*t;}
 else if(phase==='move-to-second'){left=lerp(firstLeft,secondLeft,t);z=100;lift=4;room=t;}
 else if(phase==='enter-second'){left=secondLeft;z=lerp(100,0,t);lift=4*(1-t);room=1;}
 else if(phase==='adapt-second'){left=secondLeft;width=lerp(FIRST,SECOND,t);room=1;}
 else if(phase==='second-home'){left=secondLeft;width=SECOND;room=1;}
 else if(phase==='prepare-return'){left=secondLeft;width=lerp(SECOND,FIRST,t);room=1;}
 else if(phase==='leave-second'){left=secondLeft;z=lerp(0,100,t);lift=4*t;room=1;}
 else if(phase==='move-to-first'){left=lerp(secondLeft,firstLeft,t);z=100;lift=4;room=1-t;}
 else if(phase==='enter-first'){z=lerp(100,0,t);lift=4*(1-t);}
 return {time,phase,progress:t,left,z,lift,width,spanOffset:width-SPAN,room,
  camera:{x:left+SECOND/2,y:48,z:z*.88},sameModules:modules,span:SPAN};
}
global.AdopHomeMove={sample,configuration,segments:segments.map(s=>({start:s[0],end:s[1],phase:s[2]})),limits:{first:FIRST,second:SECOND,span:SPAN,duration:DURATION}};
if(typeof document==='undefined')return;
const figure=document.getElementById('home-move-demo'),stage=document.getElementById('home-move-stage'),toggle=document.getElementById('home-move-toggle');
if(!figure||!stage||!toggle)return;
const G=global.AdopGeometry,A=global.AdopAppearance,reduced=matchMedia('(prefers-reduced-motion:reduce)');
let renderer,scene,camera,unit,texture,ready=false,starting=false,onScreen=false,elapsed=0,raf=0,lastTime=null,lastPaint=0;
let paused=reduced.matches,current=sample(0),preview=false;
const materialCache=new Map(),geometryCache=new Map(),spanMeshes=[],unitMeshes=[];
const roomOne=figure.querySelector('[data-move-room="first"]'),roomTwo=figure.querySelector('[data-move-room="second"]');
const widthText=document.getElementById('home-move-width'),dimension=document.getElementById('home-move-dimension'),dimensionLine=document.getElementById('home-move-dimension-line');
const config=configuration(FIRST);
if(['localhost','127.0.0.1'].includes(location.hostname)){
 const seek=new URLSearchParams(location.search).get('moveAt');
 if(seek!==null&&Number.isFinite(Number(seek))){elapsed=Number(seek);current=sample(elapsed);paused=true;preview=true;}
}
function setState(){
 const moving=['leave-first','move-to-second','enter-second','leave-second','move-to-first','enter-first'].includes(current.phase);
 figure.dataset.phase=current.phase;figure.dataset.moveTime=String(Math.round(current.time));
 figure.dataset.unitWidth=String(round(current.width));figure.dataset.spanOffset=String(round(current.spanOffset));
 figure.dataset.unitLeft=String(current.left);figure.dataset.unitZ=String(current.z);
 figure.dataset.motionState=paused?'paused':'playing';figure.dataset.activeRoom=moving?'moving':current.room>.5?'second':'first';
 roomOne.classList.toggle('is-active',current.room<.5);roomTwo.classList.toggle('is-active',current.room>=.5);
 if(widthText)widthText.textContent=format(current.width)+' cm';
 toggle.setAttribute('aria-pressed',String(paused));
 toggle.setAttribute('aria-label',paused?'Taşınma animasyonunu oynat':'Taşınma animasyonunu duraklat');
 toggle.querySelector('span').textContent=paused?'▶':'Ⅱ';
}
function announce(){stage.setAttribute('aria-label','Aynı üç base modül ve aynı 180 cm tabla, '+format(FIRST)+' cm ölçüsündeki ilk evden '+format(SECOND)+' cm ölçüsündeki yeni eve taşınıyor. Kutular aynı kalıyor; tabla kayarak yeni alana tam uyuyor.');}
function geometryFor(part){const key=JSON.stringify(part);if(!geometryCache.has(key))geometryCache.set(key,G.make(part));return geometryCache.get(key);}
function buildUnit(){
 const layout=C.layout(config),parts=layout.parts.concat(G.insertParts(layout),G.interiorLEDParts?.(layout)||[]);
 for(const part of parts){
  const mesh=new THREE.Mesh(geometryFor(part),A.materialFor(part,config,texture,materialCache));
  mesh.position.set(part.x-layout.left,part.y,part.z);mesh.castShadow=!part.illumination&&part.kind!=='glass';mesh.receiveShadow=!part.illumination;
  mesh.userData.initialX=mesh.position.x;mesh.userData.part=part;unit.add(mesh);unitMeshes.push(mesh);
  if(part.assembly==='span')spanMeshes.push(mesh);
 }
 figure.dataset.moduleCount=String(config.modules.length);figure.dataset.spanLength=String(SPAN);
 figure.dataset.moduleSizes=config.modules.map(m=>m.width).join(',');
}
function room(center,width,tone){
 const group=new THREE.Group();group.position.x=center;
 const material=new THREE.MeshStandardMaterial({color:new THREE.Color(tone).convertSRGBToLinear(),roughness:.93,metalness:0});
 const edgeMaterial=new THREE.LineBasicMaterial({color:0xaaa99b,transparent:true,opacity:.45});
 function panel(w,h,d,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.receiveShadow=true;group.add(mesh);return mesh;}
 panel(width+3,112,1.5,0,56,-25.2);
 panel(1.5,112,38,-width/2-.75,56,-6.95);
 panel(1.5,112,38,width/2+.75,56,-6.95);
 panel(width+3,1,114,0,-.7,30);
 // Narrow architectural edges make the two exact wall boundaries readable.
 const vertices=[-width/2,0,12,-width/2,112,12,width/2,0,12,width/2,112,12,-width/2,0,-24.4,width/2,0,-24.4];
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 group.add(new THREE.LineSegments(geometry,edgeMaterial));scene.add(group);
}
function pose(){
 const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 const target=new THREE.Vector3(current.camera.x,current.camera.y,current.camera.z);
 const yaw=.12,pitch=.22;
 let distance=Math.max(SECOND*1.55,440);
 function apply(){camera.position.set(target.x+distance*Math.sin(yaw)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(target);camera.updateMatrixWorld(true);}
 for(let step=0;step<4;step++){
  apply();let sx=0,sy=0;
  for(const x of [-SECOND/2-8,SECOND/2+8])for(const y of [-55,72])for(const z of [-45,50]){
   const point=new THREE.Vector3(target.x+x,target.y+y,target.z+z).project(camera);
   sx=Math.max(sx,Math.abs(point.x));sy=Math.max(sy,Math.abs(point.y));
  }
  distance*=Math.max(sx/.92,sy/.86);
 }
 apply();figure.dataset.cameraX=String(target.x);figure.dataset.cameraZ=String(target.z);
}
function drawDimension(){
 if(!ready||!dimension||!dimensionLine)return;
 const w=stage.clientWidth,h=stage.clientHeight;dimension.setAttribute('viewBox','0 0 '+w+' '+h);
 const a=new THREE.Vector3(current.left,-5,current.z+34).project(camera),b=new THREE.Vector3(current.left+current.width,-5,current.z+34).project(camera);
 const ax=(a.x+1)*w/2,ay=(1-a.y)*h/2,bx=(b.x+1)*w/2,by=(1-b.y)*h/2;
 dimensionLine.setAttribute('d',`M${ax},${ay}L${bx},${by}M${ax},${ay-3}v6M${bx},${by-3}v6`);
 const measure=dimension.querySelector('text');measure.setAttribute('x',(ax+bx)/2);measure.setAttribute('y',(ay+by)/2+20);measure.textContent=format(current.width)+' cm';
}
function paint(){
 setState();if(!ready)return;
 unit.position.set(current.left,current.lift,current.z);
 const delta=current.spanOffset-(FIRST-SPAN);
 for(const mesh of spanMeshes)mesh.position.x=mesh.userData.initialX+delta;
 pose();drawDimension();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
 figure.dataset.renderStatus='ready';figure.dataset.meshCount=String(unitMeshes.length);figure.dataset.geometryCount=String(geometryCache.size);
}
function schedule(){if(!raf&&!paused&&onScreen&&!document.hidden&&ready)raf=requestAnimationFrame(tick);}
function tick(now){
 raf=0;if(paused||!onScreen||document.hidden||!ready){lastTime=null;return;}
 if(lastTime!==null)elapsed+=(now-lastTime);lastTime=now;
 if(now-lastPaint>=40){current=sample(elapsed);paint();lastPaint=now;}
 schedule();
}
function stopFrame(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=null;}
function setup(){
 if(ready||starting||!global.THREE||!G||!A)return;
 starting=true;
 Promise.resolve(A.ready()).catch(()=>null).then(()=>{
  try{
   texture=A.texture();renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
   renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));renderer.outputEncoding=THREE.sRGBEncoding;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
   renderer.domElement.setAttribute('aria-hidden','true');
   scene=new THREE.Scene();A.applyEnvironment(scene,renderer);camera=new THREE.PerspectiveCamera(35,1,.1,2400);
   scene.add(new THREE.HemisphereLight(0xffffff,0xa8a18f,.85));
   const key=new THREE.DirectionalLight(0xfff5e7,1.15);key.position.set(DISTANCE/2-190,330,260);key.castShadow=true;
   key.shadow.mapSize.set(1024,512);Object.assign(key.shadow.camera,{left:-650,right:650,top:200,bottom:-200,far:1000});
   key.shadow.normalBias=.12;key.shadow.bias=-.00025;scene.add(key);
   const fill=new THREE.DirectionalLight(0xffffff,.35);fill.position.set(DISTANCE,180,-90);scene.add(fill);
   const floor=new THREE.Mesh(new THREE.PlaneGeometry(1600,600),new THREE.ShadowMaterial({opacity:.14}));
   floor.rotation.x=-Math.PI/2;floor.position.set(DISTANCE/2,-.1,100);floor.receiveShadow=true;scene.add(floor);
   room(0,FIRST,'#e4e3d7');room(DISTANCE,SECOND,'#d7dfd8');
   unit=new THREE.Group();scene.add(unit);buildUnit();stage.prepend(renderer.domElement);
   ready=true;figure.classList.add('is-rendered');figure.classList.remove('is-static');paint();schedule();
  }catch(error){figure.dataset.renderStatus='fallback';figure.dataset.renderError=error.message;figure.classList.add('is-static');toggle.hidden=true;}
  starting=false;
 });
}
toggle.addEventListener('click',()=>{
 paused=!paused;stopFrame();
 if(!paused){figure.classList.remove('is-static');setup();schedule();}
 paint();
});
reduced.addEventListener('change',event=>{
 if(event.matches){paused=true;stopFrame();figure.classList.add('is-static');setState();}
});
document.addEventListener('visibilitychange',()=>{stopFrame();if(!document.hidden)schedule();});
if('IntersectionObserver'in global){
 const observer=new IntersectionObserver(entries=>{
  onScreen=entries[0].isIntersecting;figure.dataset.inViewport=String(onScreen);stopFrame();
  if(onScreen){if(!reduced.matches||preview)setup();schedule();}
 },{threshold:.12});observer.observe(figure);
}else{onScreen=true;if(!reduced.matches||preview)setup();}
if('ResizeObserver'in global)new ResizeObserver(()=>{if(ready&&onScreen)paint();}).observe(stage);
else global.addEventListener('resize',()=>{if(ready&&onScreen)paint();});
if(reduced.matches&&!preview)figure.classList.add('is-static');
figure.dataset.renderStatus='waiting';setState();announce();
})(window);
