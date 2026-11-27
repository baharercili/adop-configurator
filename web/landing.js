(function (global) {
'use strict';
const C=global.AdopConfig;
if(!C)return;
const PRECISION_DURATION=8000,PRECISION_EXTRA=PRECISION_DURATION-1200;
const START=297.4,MIN=285.6,MAX=326.8,DURATION=44000+PRECISION_EXTRA,WORLD_LEFT=-START/2,MEASURE_MAX=500;
const baseModules=[{width:60,front:'plain',x:0},{width:60,front:'drawers',x:60},{width:90,front:'drop',x:120}];
const palettes={light:{body:'oak',front:'cream',name:'açık meşe gövde ve krem kapak'},dark:{body:'dark-oak',front:'olive',name:'koyu meşe gövde ve olive kapak'},black:{body:'black-oak',front:'cream',name:'siyah boyalı meşe gövde ve krem kapak'}};
const round=n=>Math.round((n+Number.EPSILON)*10)/10,clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10);},lerp=(a,b,t)=>a+(b-a)*t;
const fmt=n=>Number(n).toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1});
function parseMeasure(raw){const s=String(raw).trim();if(!/^\d+(?:[.,]\d)?$/.test(s))return null;const n=Number(s.replace(',','.'));return Number.isFinite(n)&&n>=160&&n<=MEASURE_MAX?round(n):null;}
function makeConfig(modules,span,width,palette='light',spanEnabled=true,upper=[]){const p=palettes[palette]||palettes.light;return C.clean({modules,span,spanEnabled,spanOffset:round(width-span),bodyFinish:p.body,frontFinish:p.front,spanFinish:p.body,upper});}
function isExact(config,width){if(!config)return false;if(config.spanEnabled&&!C.allowedOffsets(config).some(x=>Math.abs(x-config.spanOffset)<.00001))return false;return Math.abs(C.layout(config).width-width)<.00001;}
function configurationForWidth(width,palette='light'){
 width=round(width);if(!Number.isFinite(width)||width<160||width>MEASURE_MAX)return null;
 const preferred=makeConfig(baseModules,180,width,palette);if(isExact(preferred,width))return preferred;
 const paths=new Map([[0,[]]]);for(let total=15;total<=MEASURE_MAX;total+=15){for(const w of [60,90,120,45]){const prev=paths.get(total-w);if(prev&&(!paths.has(total)||prev.length+1<paths.get(total).length))paths.set(total,prev.concat(w));}}
 const candidates=[];
 for(const span of [180,120]){if(width<span)continue;for(const [prefix,parts] of paths){for(const last of [90,120,60,45]){const end=prefix+last;if(end>width||parts.length>8)continue;let x=0;const modules=parts.concat(last).map((w,i)=>{const m={width:w,front:w===45?'plain':w===60?(i%2?'drawers':'plain'):w===90?'drop':'hybrid',x};x+=w;return m;});const c=makeConfig(modules,span,width,palette);if(isExact(c,width))candidates.push({c,score:Math.abs(end-width*.68)+parts.length*3+(span===120?16:0)});}}}
 if(candidates.length)return candidates.sort((a,b)=>a.score-b.score)[0].c;
 const parts=paths.get(width);if(parts){let x=0;return makeConfig(parts.map(w=>{const m={width:w,front:w<=60?'plain':'drop',x};x+=w;return m;}),180,width,palette,false);}
 return null;
}
function modules(items){let x=0;return items.map(([width,front])=>{const m={width,front,x};x+=width;return m;});}
const added=modules([[60,'plain'],[60,'drawers'],[90,'drop'],[45,'plain']]);
const resized=modules([[60,'plain'],[45,'plain'],[45,'plain'],[120,'drop']]);
const varied=modules([[60,'fluted-glass'],[45,'open'],[45,'plain'],[120,'hybrid']]);
const uppers=[{type:'UW',front:'vertical',width:36,x:0,y:90,anchor:'left',edgeOffset:0},{type:'UW',front:'vertical-glass',width:36,x:36,y:90,anchor:'left',edgeOffset:36},...[100,135,170].map(y=>({type:'WS',front:'open',width:60,x:MAX-60,y,anchor:'right',edgeOffset:0}))];
const states={start:makeConfig(baseModules,180,START),wide:makeConfig(baseModules,180,MAX),narrow:makeConfig(baseModules,180,MIN),added:makeConfig(added,180,MAX),resized:makeConfig(resized,180,MAX),varied:makeConfig(varied,180,MAX),wall:makeConfig(varied,180,MAX,'light',true,uppers),dark:makeConfig(varied,180,MAX,'dark',true,uppers),black:makeConfig(varied,180,MAX,'black',true,uppers),blackBare:makeConfig(varied,180,MAX,'black',true,[])};
// Use the capsule's arc centres as the safe full travel. No new rail or
// unmodelled shaft dimension is introduced by this demonstration.
const precisionPlate=global.AdopGeometry?.connectionParts?.(states.black,C.layout(states.black))?.find(p=>p.shape==='connector-plate');
const precisionSlotWidth=Number(precisionPlate?.slotWidth)||4,precisionSlotHeight=Number(precisionPlate?.slotHeight)||.7;
const precision=Object.freeze({start:33900,end:33900+PRECISION_DURATION,duration:PRECISION_DURATION,slotWidth:precisionSlotWidth,slotHeight:precisionSlotHeight,halfTravel:(precisionSlotWidth-precisionSlotHeight)/2});
const precisionTime=t=>t>=35100?t+PRECISION_EXTRA:t;
function precisionSlide(ms){
 const h=precision.halfTravel,stops=[[0,0],[1000,-h],[1600,-h],[3900,h],[4500,h],[6800,-h],[7300,-h],[PRECISION_DURATION,0]],time=Math.max(0,Math.min(PRECISION_DURATION,ms));
 let i=0;while(i<stops.length-2&&time>stops[i+1][0])i++;const a=stops[i],b=stops[i+1];return lerp(a[1],b[1],ease((time-a[0])/(b[0]-a[0])));
}
const segments=[
 [0,1200,'fit','start','start'],[1200,4200,'span-extend','start','wide'],[4200,5200,'fit-wide','wide','wide'],[5200,7900,'span-contract','wide','narrow'],[7900,8700,'fit-narrow','narrow','narrow'],[8700,10800,'span-return','narrow','wide'],
 [10800,13700,'base-add','wide','added'],[13700,15700,'base-resize','added','resized'],[15700,17600,'front-change','resized','varied'],[17600,18200,'wall-prepare','varied','varied'],[18200,21200,'wall-add','varied','wall'],[21200,23600,'colour-dark','wall','dark'],[23600,24700,'wall-complete','dark','dark'],[24700,27000,'colour-black','dark','black'],
 [27000,30600,'rear-orbit','black','black'],[30600,33000,'hardware-approach','black','black'],[33000,33900,'hardware-release','black','black'],[33900,35100,'hardware-adjust','black','black'],[35100,36000,'hardware-secure','black','black'],[36000,38600,'hardware-depart','black','black'],[38600,40000,'front-orbit','black','black'],[40000,41800,'wall-retract','black','blackBare'],[41800,44000,'return','blackBare','start']
].map(([start,end,...rest])=>[precisionTime(start),precisionTime(end),...rest]);
// Geometry remains in one scene. Configurations at every segment boundary are
// actual catalogue products. Intermediate widths are presentation transforms.
const cameraKeys=[
 [0,{yaw:.23,pitch:.18,targetY:22,viewWidth:MAX,height:60,detail:0}],
 [15700,{yaw:.23,pitch:.18,targetY:22,viewWidth:MAX,height:60,detail:0}],
 [18200,{yaw:.23,pitch:.12,targetY:87,viewWidth:MAX,height:184,detail:0}],
 [27000,{yaw:.23,pitch:.12,targetY:87,viewWidth:MAX,height:184,detail:0}],
 [30600,{yaw:Math.PI+.17,pitch:.14,targetY:87,viewWidth:MAX,height:184,detail:0}],
 [33000,{yaw:Math.PI+.17,pitch:.12,targetY:33,viewWidth:14,height:12,detail:1}],
 [36000,{yaw:Math.PI+.17,pitch:.12,targetY:33,viewWidth:14,height:12,detail:1}],
 [38600,{yaw:Math.PI+.17,pitch:.14,targetY:87,viewWidth:MAX,height:184,detail:0}],
 [41800,{yaw:Math.PI*2+.23,pitch:.12,targetY:87,viewWidth:MAX,height:184,detail:0}],
 [44000,{yaw:Math.PI*2+.23,pitch:.18,targetY:22,viewWidth:MAX,height:60,detail:0}]
].map(([time,frame])=>[precisionTime(time),frame]);
function cameraAt(t){let i=0;while(i<cameraKeys.length-2&&t>cameraKeys[i+1][0])i++;const a=cameraKeys[i],b=cameraKeys[i+1],p=ease((t-a[0])/(b[0]-a[0])),out={};for(const key of Object.keys(a[1]))out[key]=lerp(a[1][key],b[1][key],p);return out;}
function sampleSequence(ms){
 const time=((Number(ms)||0)%DURATION+DURATION)%DURATION,seg=segments.find(s=>time<s[1])||segments[segments.length-1],progress=clamp((time-seg[0])/(seg[1]-seg[0])),blend=ease(progress),from=states[seg[3]],to=states[seg[4]];
 let loosen=0,slide=0;if(time>=33000&&time<precision.start)loosen=ease((time-33000)/900);else if(time>=precision.start&&time<precision.end){loosen=1;slide=precisionSlide(time-precision.start);}else if(time>=precision.end&&time<precision.end+900)loosen=1-ease((time-precision.end)/900);
 const fromWidth=round(Math.max(...from.modules.map(m=>m.x+m.width),from.spanEnabled?from.spanOffset+from.span:0)),toWidth=round(Math.max(...to.modules.map(m=>m.x+m.width),to.spanEnabled?to.spanOffset+to.span:0));
 return{time,phase:seg[2],progress,from,to,fromKey:seg[3],toKey:seg[4],blend,width:round(lerp(fromWidth,toWidth,blend)+slide),palette:blend<.5?seg[3]==='dark'?'dark':seg[3].startsWith('black')?'black':'light':seg[4]==='dark'?'dark':seg[4].startsWith('black')?'black':'light',camera:cameraAt(time),hardware:{loosen,slide}};
}
function loopWidth(ms){return sampleSequence(ms).width;}
global.AdopHomeMotion={parseMeasure,configurationForWidth,loopWidth,sampleSequence,states,precision,segments:segments.map(s=>({start:s[0],end:s[1],phase:s[2],from:s[3],to:s[4]})),limits:{start:START,min:MIN,max:MAX,duration:DURATION}};
const stage=document.getElementById('home-stage'),input=document.getElementById('home-wall'),toggle=document.getElementById('home-motion-toggle');
if(!stage||!input||!toggle)return;
const G=global.AdopGeometry,A=global.AdopAppearance,reduced=matchMedia('(prefers-reduced-motion:reduce)');
let width=START,palette='light',config=states.start,renderer,scene,camera,group,texture,ready=false,paused=reduced.matches,onScreen=true,elapsed=0,lastTime=null,lastPaint=0,frameRequest,resizeTimer,manualTween=null,manualMode=false,currentSample=sampleSequence(0),lastVisualParts=new Map(),lastCamera=null,detailKey,detailRim;
const materialCache=new Map(),geometryCache=new Map(),snapshotCache=new Map(),meshPool=new Map(),morphMaterials=new Map();
if(['127.0.0.1','localhost'].includes(location.hostname)){const preview=new URLSearchParams(location.search).get('previewAt');if(preview!==null&&Number.isFinite(Number(preview))){elapsed=((Number(preview)%DURATION)+DURATION)%DURATION;currentSample=sampleSequence(elapsed);width=currentSample.width;palette=currentSample.palette;config=currentSample.blend<.5?currentSample.from:currentSample.to;paused=true;}}
const form=input.closest('form'),error=document.getElementById('home-wall-error'),svg=document.getElementById('home-dimension'),line=document.getElementById('home-dimension-line'),measure=document.getElementById('home-dimension-text');
const precisionSvg=document.getElementById('home-precision'),precisionRuler=document.getElementById('home-precision-ruler'),precisionMarker=document.getElementById('home-precision-marker'),precisionValue=document.getElementById('home-precision-value'),precisionLabel=document.getElementById('home-precision-label');
let inputMeasureContext,inputFont='',inputLetterSpacing=0,inputMeasureKey='';
function syncInputWidth(reset=false){if(reset){inputFont='';inputMeasureKey='';}if(!inputMeasureContext){const canvas=document.createElement('canvas');inputMeasureContext=canvas.getContext('2d');}if(!inputFont){const css=getComputedStyle(input);inputFont=[css.fontStyle,css.fontWeight,css.fontSize,css.fontFamily].join(' ');inputLetterSpacing=parseFloat(css.letterSpacing)||0;}const value=String(input.value),key=inputFont+'|'+value;if(key===inputMeasureKey)return;inputMeasureKey=key;if(inputMeasureContext){inputMeasureContext.font=inputFont;const measured=inputMeasureContext.measureText(value).width+Math.max(0,value.length-1)*inputLetterSpacing;input.style.width=Math.ceil(measured+3)+'px';}else input.style.width='4.2ch';}
function updateToggle(){toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',paused?'Ürün animasyonunu oynat':'Animasyonu duraklat');toggle.setAttribute('aria-pressed',String(paused));}
function setText(updateInput=true){document.querySelectorAll('[data-home-measure]').forEach(el=>el.textContent=fmt(width));if(updateInput&&document.activeElement!==input&&!manualTween)input.value=fmt(width);syncInputWidth();stage.dataset.previewWidth=String(width);stage.dataset.spanOffset=String(round(lerp(currentSample.from.spanOffset,currentSample.to.spanOffset,currentSample.blend)+currentSample.hardware.slide));stage.dataset.motionState=paused?'paused':'playing';stage.dataset.scene=currentSample.phase;stage.dataset.phase=currentSample.phase;stage.dataset.sequenceTime=String(Math.round(currentSample.time||0));stage.dataset.hardwareLoosen=String(currentSample.hardware.loosen);stage.dataset.hardwareSlide=String(currentSample.hardware.slide);document.querySelectorAll('[data-home-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.homePalette===palette)));}
function announce(){stage.setAttribute('aria-label',fmt(width)+' cm genişliğinde ADØP duvar ünitesi. Adapte edilebilir tabla, değişen base modüller, duvar modülleri ve arka bağlantı detayı.');}
function dimensions(){if(!svg||!line||!measure)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;svg.setAttribute('viewBox','0 0 '+w+' '+h);let left,right;if(ready){left=new THREE.Vector3(WORLD_LEFT,-8,32).project(camera);right=new THREE.Vector3(WORLD_LEFT+width,-8,32).project(camera);left={x:(left.x+1)*w/2,y:(1-left.y)*h/2};right={x:(right.x+1)*w/2,y:(1-right.y)*h/2};}else{left={x:w*.08,y:h*.83};right={x:w*.08+w*.84*width/MAX,y:h*.83};}const detail=currentSample.camera.detail||0,orbit=Math.abs(Math.sin(currentSample.camera.yaw));svg.style.opacity=ready?String((1-detail)*(1-orbit*.85)):'0';const dx=right.x-left.x,dy=right.y-left.y,len=Math.hypot(dx,dy)||1,nx=-dy/len*5,ny=dx/len*5;line.setAttribute('d',`M${left.x},${left.y} L${right.x},${right.y} M${left.x-nx},${left.y-ny} L${left.x+nx},${left.y+ny} M${right.x-nx},${right.y-ny} L${right.x+nx},${right.y+ny}`);measure.setAttribute('x',(left.x+right.x)/2);measure.setAttribute('y',(left.y+right.y)/2+24);measure.textContent=fmt(width)+' cm';}
function geometryKey(p){return JSON.stringify([p.shape,p.kind,p.name,p.w,p.h,p.d,p.bevel,p.holes,p.ribPitch,p.ribDepth,p.innerRadius,p.band,p.slotWidth,p.slotHeight]);}
function geometryFor(p){const key=geometryKey(p);if(!geometryCache.has(key))geometryCache.set(key,G.make(p));return geometryCache.get(key);}
function snapshot(c){const key=JSON.stringify([c.modules,c.span,c.spanEnabled,c.spanOffset,c.upper]);if(snapshotCache.has(key))return snapshotCache.get(key);const layout=C.layout(c),parts=layout.parts.concat(G.insertParts(layout),G.connectionParts(c,layout),G.interiorLEDParts?.(layout)||[]),counts=new Map(),map=new Map();for(const p of parts){const stem=p.assembly+':'+p.name,occurrence=counts.get(stem)||0;counts.set(stem,occurrence+1);const id=stem+':'+occurrence;map.set(id,{...p,x:p.x-layout.left,_id:id});}const value={map,layout};snapshotCache.set(key,value);return value;}
function finishMaterial(channel,c){return A.materialFor({kind:channel==='front'?'front':'body',assembly:'box-0'},c,texture,materialCache);}
function morphMaterial(channel){if(morphMaterials.has(channel))return morphMaterials.get(channel);const original=finishMaterial(channel,states.start),material=original.clone();if(original.map){const uniforms={homeMapTo:{value:original.map},homeMapBlend:{value:0}};material.userData.homeUniforms=uniforms;material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.fragmentShader='uniform sampler2D homeMapTo;\nuniform float homeMapBlend;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
vec4 homeA = mapTexelToLinear( texture2D( map, vUv ) );
vec4 homeB = mapTexelToLinear( texture2D( homeMapTo, vUv ) );
diffuseColor *= mix( homeA, homeB, homeMapBlend );
#endif`);};material.customProgramCacheKey=()=> 'adop-home-map-morph-v1';}morphMaterials.set(channel,material);return material;}
function updateMaterials(sample){for(const channel of ['body','front']){const from=finishMaterial(channel,sample.from),to=finishMaterial(channel,sample.to),material=morphMaterial(channel),t=sample.blend;material.color.copy(from.color).lerp(to.color,t);for(const field of ['roughness','bumpScale','clearcoat','clearcoatRoughness','reflectivity'])material[field]=lerp(from[field]||0,to[field]||0,t);material.envMapIntensity=lerp(from.envMapIntensity,to.envMapIntensity,t);if(material.userData.homeUniforms){material.map=from.map;material.userData.homeUniforms.homeMapTo.value=to.map||from.map;material.userData.homeUniforms.homeMapBlend.value=t;}}}
function partMaterial(p){if(p.name==='Arka L bağlantı plakası'||p.shape==='bolt-head'){const key=p.shape==='bolt-head'?'home-detail-steel':'home-detail-plate';if(!materialCache.has(key)){const material=A.materialFor(p,states.start,texture,materialCache).clone();material.color.set(p.shape==='bolt-head'?0xb1b5b0:0x42463f);material.metalness=p.shape==='bolt-head'?.8:.76;material.roughness=p.shape==='bolt-head'?.26:.34;material.envMapIntensity=p.shape==='bolt-head'?1.25:.95;materialCache.set(key,material);}return materialCache.get(key);}if(p.kind==='hardware'||p.kind==='glass'||p.kind==='recess'||p.illumination)return A.materialFor(p,states.start,texture,materialCache);return morphMaterial(p.kind==='front'?'front':'body');}
function refreshMaterials(){const old=new Set([...materialCache.values(),...morphMaterials.values()]);materialCache.clear();morphMaterials.clear();for(const [id,mesh] of meshPool){const p=lastVisualParts.get(id)||mesh.userData.part;if(p)mesh.material=partMaterial(p);}old.forEach(material=>material.dispose?.());}
function meshFor(id,p){let mesh=meshPool.get(id);if(!mesh){mesh=new THREE.Mesh(geometryFor(p),partMaterial(p));mesh.castShadow=!p.illumination&&p.kind!=='glass';mesh.receiveShadow=!p.illumination;mesh.userData.partId=id;mesh.userData.part=p;group.add(mesh);meshPool.set(id,mesh);}return mesh;}
function collapsedPart(p,assemblyExists){const base=p.module>=0,upper=p.upper>=0;return{...p,x:base?p.x+20:p.x,y:upper?p.y+14:base?p.y*.1:p.y,z:assemblyExists?p.z+6:p.z,w:assemblyExists?.001:p.w*.001,h:assemblyExists?p.h:base?p.h*.1:p.h*.001,d:p.d};}
function drawParts(sample){const from=snapshot(sample.from).map,to=snapshot(sample.to).map,t=sample.blend,ids=new Set([...from.keys(),...to.keys()]),fromAssemblies=new Set([...from.values()].map(p=>p.assembly)),toAssemblies=new Set([...to.values()].map(p=>p.assembly));for(const mesh of meshPool.values())mesh.visible=false;lastVisualParts=new Map();
 for(const id of ids){const a=from.get(id),b=to.get(id),source=a||collapsedPart(b,fromAssemblies.has(b.assembly)),target=b||collapsedPart(a,toAssemblies.has(a.assembly)),p=b||a,chosen=t===1&&b?b:a||b,mesh=meshFor(id,chosen);let f=t;
 // Exchanging door fronts is a short physical fold. Stable carcass panels
 // interpolate in place, and entering modules expand as one assembly.
 if(!a&&fromAssemblies.has(b.assembly))f=ease(clamp((t-.34)/.66));else if(!b&&toAssemblies.has(a.assembly))f=ease(clamp(t/.66));
 const out={...p,x:lerp(source.x,target.x,f),y:lerp(source.y,target.y,f),z:lerp(source.z,target.z,f),w:lerp(source.w,target.w,f),h:lerp(source.h,target.h,f),d:lerp(source.d,target.d,f)};
 if(!a&&!fromAssemblies.has(b.assembly)&&b.upper>=0){const delay=Math.min(.2,b.upper*.035);f=ease(clamp((t-delay)/(1-delay)));out.y=lerp(source.y,target.y,f);out.w=lerp(source.w,target.w,f);out.h=lerp(source.h,target.h,f);}
 mesh.geometry=geometryFor(chosen);mesh.position.set(WORLD_LEFT+out.x,out.y,out.z);mesh.scale.set(Math.max(.00001,out.w/chosen.w),Math.max(.00001,out.h/chosen.h),Math.max(.00001,out.d/chosen.d));mesh.visible=out.w>.03&&out.h>.03;mesh.rotation.set(0,0,0);
 // The plate and rear fixings stay locked to the carcass. Only the top
 // fixing loosens and sweeps between both capsule ends with the tabletop.
 if(p.assembly==='span'&&p.kind!=='hardware')mesh.position.x+=sample.hardware.slide;
 if(p.shape==='bolt-head'&&p.name==='Tabla bağlantı cıvatası'){mesh.position.z-=sample.hardware.loosen*.55;mesh.rotation.z=sample.hardware.loosen*Math.PI*1.7;mesh.position.x+=sample.hardware.slide;}
 lastVisualParts.set(id,out);
 }
}
function hardwareTarget(){const snap=snapshot(states.black),fixing=[...snap.map.values()].find(p=>p.name==='Tabla bağlantı cıvatası');return fixing?{x:WORLD_LEFT+fixing.x,y:fixing.y,z:fixing.z}:{x:0,y:48,z:-23};}
function precisionDimensions(){
 if(!precisionSvg||!precisionRuler||!precisionMarker||!precisionValue)return;
 const alpha=ready?ease(((currentSample.camera.detail||0)-.85)/.15):0;
 precisionSvg.style.opacity=String(alpha);precisionSvg.dataset.active=String(alpha>.001);if(!alpha)return;
 const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;precisionSvg.setAttribute('viewBox','0 0 '+w+' '+h);
 const fixing=hardwareTarget(),half=precision.halfTravel,y=fixing.y-2.1,z=fixing.z-.65;
 const point=(x,Y=y)=>{const v=new THREE.Vector3(x,Y,z).project(camera);return{x:(v.x+1)*w/2,y:(1-v.y)*h/2};};
 const a=point(fixing.x-half),b=point(fixing.x+half);let d=`M${a.x},${a.y} L${b.x},${b.y}`;
 const ticks=Math.round(half*20);for(let i=0;i<=ticks;i++){const x=fixing.x-half+i/10,major=i%10===0||i===ticks,tick=major?.26:i%5===0?.19:.11,p=point(x,y-tick),q=point(x,y+tick);d+=` M${p.x},${p.y} L${q.x},${q.y}`;}
 precisionRuler.setAttribute('d',d);const marker=point(fixing.x+currentSample.hardware.slide);
 precisionMarker.setAttribute('d',`M${marker.x-4},${marker.y-12} L${marker.x+4},${marker.y-12} L${marker.x},${marker.y-5} Z`);
 const labelX=(a.x+b.x)/2,labelY=Math.max(a.y,b.y)+31;precisionValue.setAttribute('x',labelX);precisionValue.setAttribute('y',labelY);precisionValue.textContent=fmt(width)+' cm';if(precisionLabel){precisionLabel.setAttribute('x',labelX-56);precisionLabel.setAttribute('y',labelY-23);}
 precisionSvg.dataset.tickCount=String(ticks+1);precisionSvg.dataset.travelCm=String(half*2);precisionSvg.dataset.widthCm=String(width);
}
function pose(sample){if(!ready)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const c=sample.camera,detail=c.detail||0,hw=hardwareTarget(),cx=lerp(WORLD_LEFT+width/2,hw.x,detail),cy=lerp(c.targetY,hw.y,detail),cz=lerp(0,hw.z,detail),target=new THREE.Vector3(cx,cy,cz),yaw=c.yaw,pitch=c.pitch;let distance=Math.max(c.viewWidth,c.height)*1.6;
 function apply(){camera.position.set(cx+distance*Math.sin(yaw)*Math.cos(pitch),cy+distance*Math.sin(pitch),cz+distance*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(target);camera.updateMatrixWorld(true);}
 for(let step=0;step<4;step++){apply();let sx=0,sy=0;for(const x of [-c.viewWidth/2,c.viewWidth/2])for(const y of [-c.height/2,c.height/2])for(const z of [-lerp(28,5,detail),lerp(28,5,detail)]){const v=new THREE.Vector3(cx+x,cy+y,cz+z).project(camera);sx=Math.max(sx,Math.abs(v.x));sy=Math.max(sy,Math.abs(v.y));}distance*=Math.max(sx/.87,sy/.80);}
 apply();lastCamera={x:camera.position.x,y:camera.position.y,z:camera.position.z,targetX:cx,targetY:cy,targetZ:cz,distance,yaw,pitch};stage.dataset.cameraYaw=String(yaw);stage.dataset.cameraDistance=String(distance);stage.dataset.cameraDetail=String(detail);
}
function paint(){setText();if(ready){if(detailKey){detailKey.intensity=currentSample.camera.detail*1.65;detailRim.intensity=currentSample.camera.detail*.65;}updateMaterials(currentSample);drawParts(currentSample);pose(currentSample);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);stage.dataset.renderStatus='ready';stage.dataset.meshCount=String(meshPool.size);stage.dataset.geometryCount=String(geometryCache.size);}else{const fallback=stage.querySelector('[data-fallback-span]');if(fallback)fallback.setAttribute('transform','translate('+((width-START)*1.9)+',0)');}dimensions();precisionDimensions();}
function setSample(sample){currentSample=sample;width=sample.width;palette=sample.palette;config=sample.blend<.5?sample.from:sample.to;paint();}
function manualSample(c,width){return{time:elapsed,phase:'manual',progress:1,from:c,to:c,blend:0,width,palette,camera:{yaw:.23,pitch:.18,targetY:22,viewWidth:Math.max(width,180),height:60,detail:0},hardware:{loosen:0,slide:0}};}
function pause(){paused=true;manualTween=null;lastTime=null;updateToggle();setText(false);announce();}
function schedule(){if(!frameRequest)frameRequest=requestAnimationFrame(tick);}
function tick(time){frameRequest=null;const dt=lastTime===null?0:Math.min(100,time-lastTime);lastTime=time;if(!document.hidden&&onScreen){if(manualTween){manualTween.elapsed+=dt;const p=ease(manualTween.elapsed/800),from=manualTween.from,to=manualTween.to;setSample({...manualSample(to,round(lerp(manualTween.fromWidth,manualTween.toWidth,p))),from,to,blend:p});if(manualTween.elapsed>=800){manualTween=null;announce();}}else if(!paused){elapsed=(elapsed+dt)%DURATION;if(time-lastPaint>=32){setSample(sampleSequence(elapsed));lastPaint=time;}}}if(!paused||manualTween)schedule();}
function resume(){lastTime=null;if(manualMode){manualMode=false;elapsed=0;}paused=false;updateToggle();setText();announce();schedule();}
function applyInput(showError=false){const next=parseMeasure(input.value);if(next===null){if(showError){error.hidden=false;error.textContent='160–500 cm arasında, en fazla bir ondalık basamakla ölçü gir.';input.setAttribute('aria-invalid','true');}return false;}error.hidden=true;input.removeAttribute('aria-invalid');const nextConfig=configurationForWidth(next,palette);if(nextConfig){const previous=configurationForWidth(width,palette);manualMode=true;if(previous&&JSON.stringify(previous.modules)===JSON.stringify(nextConfig.modules)&&previous.span===nextConfig.span&&previous.spanEnabled===nextConfig.spanEnabled){manualTween={from:previous,to:nextConfig,fromWidth:width,toWidth:next,elapsed:0};lastTime=null;schedule();}else{manualTween=null;setSample(manualSample(nextConfig,next));}announce();}else{if(showError){error.hidden=false;error.textContent='Bu ölçüye tam oturan bir düzen yok. Farklı bir ölçü deneyebilirsin.';input.setAttribute('aria-invalid','true');}return false;}return next;}
input.addEventListener('focus',pause);input.addEventListener('input',()=>{syncInputWidth();pause();applyInput();});input.addEventListener('change',()=>{applyInput(true);});
form.addEventListener('submit',e=>{e.preventDefault();pause();const value=applyInput(true);if(value===false){input.focus();return;}const url=new URL(form.getAttribute('action'),location.href);url.searchParams.set('wall',String(value));location.assign(url.href);});
toggle.addEventListener('click',()=>{if(paused)resume();else pause();});
document.querySelectorAll('[data-home-palette]').forEach(b=>b.addEventListener('click',()=>{pause();palette=b.dataset.homePalette;manualMode=true;manualTween=null;const c=configurationForWidth(width,palette);if(c)setSample(manualSample(c,width));announce();}));
reduced.addEventListener('change',e=>{if(e.matches)pause();});document.addEventListener('visibilitychange',()=>{lastTime=null;if(!document.hidden&&(!paused||manualTween))schedule();});
if('IntersectionObserver'in global)new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;lastTime=null;if(onScreen&&(!paused||manualTween))schedule();},{threshold:.08}).observe(stage);
function setup(){if(ready||!global.THREE||!G||!A)return;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.5:2));renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.domElement.setAttribute('aria-hidden','true');scene=new THREE.Scene();A.applyEnvironment(scene,renderer);camera=new THREE.PerspectiveCamera(35,1,.1,4000);scene.add(new THREE.HemisphereLight(0xffffff,0xb1aea4,.40));const key=new THREE.DirectionalLight(0xfff9f0,1.05);key.position.set(-140,320,180);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-500,right:500,top:400,bottom:-400});key.shadow.normalBias=.15;key.shadow.bias=-.0004;scene.add(key);A.fitShadow?.(key,new THREE.Box3(new THREE.Vector3(WORLD_LEFT,0,-28),new THREE.Vector3(WORLD_LEFT+MEASURE_MAX,190,28)));const fill=new THREE.DirectionalLight(0xffffff,.24);fill.position.set(160,180,-150);scene.add(fill);const floor=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.ShadowMaterial({opacity:.20}));floor.rotation.x=-Math.PI/2;floor.position.y=-.15;floor.receiveShadow=true;scene.add(floor);texture=A.texture();group=new THREE.Group();scene.add(group);const fixing=hardwareTarget();detailKey=new THREE.SpotLight(0xfff7e9,0,260,Math.PI/5,.7,1);detailKey.position.set(fixing.x-32,fixing.y+52,fixing.z-72);detailKey.target.position.set(fixing.x,fixing.y+5,fixing.z);scene.add(detailKey,detailKey.target);detailRim=new THREE.SpotLight(0xf2f6ff,0,220,Math.PI/5,.75,1);detailRim.position.set(fixing.x+28,fixing.y+22,fixing.z-55);detailRim.target.position.set(fixing.x,fixing.y+2,fixing.z);scene.add(detailRim,detailRim.target);stage.querySelector('.home-model-fallback')?.remove();stage.prepend(renderer.domElement);ready=true;paint();}catch(error){stage.dataset.renderStatus='fallback';stage.dataset.renderError=error.message;}if(!paused)schedule();}
updateToggle();setText();announce();paint();
document.fonts?.ready.then(()=>syncInputWidth(true));
if(A){let timeout=setTimeout(setup,5000);Promise.resolve(A.ready()).then(()=>{clearTimeout(timeout);if(!ready)setup();else{const hadTexture=Boolean(texture);texture=A.texture();if(!hadTexture)refreshMaterials();paint();}}).catch(()=>{clearTimeout(timeout);setup();});}else stage.dataset.renderStatus='fallback';
if('ResizeObserver'in global)new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{syncInputWidth(true);paint();},60);}).observe(stage);else global.addEventListener('resize',paint);
if(!paused)schedule();
})(window);
