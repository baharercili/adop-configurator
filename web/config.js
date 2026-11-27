(function(global){
'use strict';
const widths=[45,60,90,120],fronts=['plain','drop','open','drawers','hybrid','deep-drawer','fluted-glass'],finishes=['oak','dark-oak','black-oak','cream','olive','light-grey','burgundy'];
const widthMatrix={plain:[45,60],drop:[90,120],open:[45],drawers:[60,90],hybrid:[120],'deep-drawer':[90,120],'fluted-glass':[45,60]};
const finishAliases={'smoked-oak':'dark-oak',anthracite:'olive',greige:'cream',walnut:'dark-oak'};
const tvSizes=[32,40,42,43,48,50,55,58,60,65,70,75,77,83,85,86,98,100];
const bodyHeights=[40,50,60];
function normalizeBodyHeight(value,fallback=40){const number=typeof value==='number'||typeof value==='string'?Number(value):NaN;return bodyHeights.includes(number)?number:bodyHeights.includes(fallback)?fallback:40;}
function tvNumber(value){if(typeof value!=='number'&&typeof value!=='string')return null;if(typeof value==='string'&&!value.trim())return null;const number=Number(value);return Number.isFinite(number)?number:null;}
function cleanTV(input){
const tv=input&&typeof input==='object'&&!Array.isArray(input)?input:{},model=global.AdopTVCatalog?.get(tv.modelId),requested=tvNumber(tv.inch),inch=model?model.inch:requested,center=tvNumber(tv.center),bottom=tvNumber(tv.bottom),result={inch:inch!==null&&inch>=20&&inch<=120?inch:0,center:center===null?null:Math.max(-200,Math.min(800,center)),bottom:bottom===null?null:Math.max(0,Math.min(300,bottom)),...(model?{modelId:model.id}:{})};
if(['wall','surface'].includes(tv.mount))result.mount=tv.mount;
if(['auto','twin','center','pedestal','arch'].includes(tv.standType))result.standType=tv.standType;
if(['auto','flat','curved'].includes(tv.shape))result.shape=tv.shape;
const setback=tvNumber(tv.setback);if(setback!==null)result.setback=Math.max(0,Math.min(40,setback));
if(!model)for(const [key,min,max]of [['customWidthCm',20,300],['customHeightCm',15,180],['customDepthCm',.5,30]]){const n=tvNumber(tv[key]);if(n!==null&&n>=min&&n<=max)result[key]=n;}
return result;
}

const isWood=value=>value==='oak'||value==='dark-oak'||value==='black-oak';
const getWidthsForFront=front=>(widthMatrix[front]||widths).slice();
const getWidths=front=>getWidthsForFront(front);
const frontsForWidth=width=>fronts.filter(front=>widthMatrix[front].includes(Number(width)));
function nearestWidth(values,value){return values.reduce((nearest,width)=>Math.abs(width-value)<Math.abs(nearest-value)?width:nearest,values[0]);}
function normalizedFinish(value,fallback='oak'){const finish=finishAliases[value]||value;return finishes.includes(finish)?finish:fallback;}
function normalizeMaterials(input,preferredChannel){
const body=normalizedFinish(input.bodyFinish,normalizedFinish(input.finish,normalizedFinish(input.spanFinish))),channels={bodyFinish:body,frontFinish:normalizedFinish(input.frontFinish,body),spanFinish:normalizedFinish(input.spanFinish,body)},order=['bodyFinish','frontFinish','spanFinish'];
// The top and carcass are one material choice. A span-only product selection
// can choose that shared finish; saved mixed designs use the body as source.
if(preferredChannel==='spanFinish')channels.bodyFinish=channels.spanFinish;
channels.spanFinish=channels.bodyFinish;
const explicitWood=order.filter(key=>Object.prototype.hasOwnProperty.call(input,key)&&input[key]).map(key=>channels[key]).find(isWood),preferred=order.includes(preferredChannel)&&isWood(channels[preferredChannel])?channels[preferredChannel]:(explicitWood||order.map(key=>channels[key]).find(isWood));
if(preferred)order.forEach(key=>{if(isWood(channels[key]))channels[key]=preferred;});
channels.spanFinish=channels.bodyFinish;
return{...input,...channels,finish:channels.bodyFinish};
}
function canonicalFront(front,width){if(fronts.includes(front)&&widthMatrix[front].includes(width))return front;if(front==='drawers'&&width===120)return'deep-drawer';if(front==='deep-drawer'&&width===60)return'drawers';return width<=60?'plain':'drop';}
function upperDimensions(u){if(u.type==='WS')return{width:[60,90,120].includes(u.width)?u.width:90,depth:26,height:2.8,provisional:false};const front=u.front==='plain'?'drop':u.front;if(front==='vertical'||front==='vertical-glass')return{width:36,depth:36,height:90,provisional:true};if(front==='hybrid')return{width:120,depth:36,height:18,provisional:false};return{width:front==='open'?45:60,depth:36,height:36,provisional:false};}
const defaults=()=>({version:6,preset:'tv',bodyHeight:40,span:180,spanEnabled:true,spanOffset:0,finish:'oak',bodyFinish:'oak',frontFinish:'oak',spanFinish:'oak',modules:[{width:45,front:'plain'}],upper:[],tv:cleanTV()});
function clean(input){
if(!input||typeof input!=='object')throw Error('Geçersiz tasarım');
const materials=normalizeMaterials(input);let end=0;
const modules=(Array.isArray(input.modules)&&input.modules.length?input.modules:defaults().modules).map(m=>{const width=nearestWidth(widths,Number.isFinite(m.width)?m.width:45),x=Number.isFinite(m.x)?Math.max(0,m.x):end;end=Math.max(end,x+width);return{width,x,front:canonicalFront(m.front,width)};});
const upper=(Array.isArray(input.upper)?input.upper:[]).filter(u=>u&&typeof u==='object'&&(u.type==='UW'||u.type==='WS')).map(u=>{const front=u.front==='plain'?'drop':['drop','open','hybrid','vertical','fluted-glass','vertical-glass'].includes(u.front)?u.front:'open',d=upperDimensions({...u,front});return{type:u.type,width:d.width,front,x:Number.isFinite(u.x)?Math.max(0,u.x):0,y:Number.isFinite(u.y)?Math.max(60,Math.min(240,u.y)):(u.type==='UW'?(['vertical','vertical-glass'].includes(front)?90:140):130),...(['left','right'].includes(u.anchor)?{anchor:u.anchor,edgeOffset:Number.isFinite(u.edgeOffset)?Math.max(0,u.edgeOffset):0}:{})};});
return{version:6,bodyHeight:normalizeBodyHeight(input.bodyHeight),spanEnabled:input.spanEnabled!==false,spanOffset:Number.isFinite(input.spanOffset)?input.spanOffset:0,preset:'tv',span:input.span===120?120:180,finish:materials.bodyFinish,bodyFinish:materials.bodyFinish,frontFinish:materials.frontFinish,spanFinish:materials.spanFinish,modules,upper,tv:cleanTV(input.tv)};
}
function withBodyHeight(input,value){const c=clean(input),height=normalizeBodyHeight(value,c.bodyHeight),delta=height-c.bodyHeight,minimum=Math.max(60,height+(c.spanEnabled?10.5:0));c.bodyHeight=height;c.upper=c.upper.map(u=>({...u,y:Math.max(minimum,Math.min(240,u.y+delta))}));return c;}
function allowedOffsets(input){const c=clean(input),valid=new Set();for(const support of c.modules){const from=Math.max(0,Math.ceil((support.x+5+.9-25)*10-.000001)),to=Math.floor((support.x+support.width-5-.9-25)*10+.000001);for(let unit=from;unit<=to;unit++){const x=unit/10,legLeft=x+c.span-13.5,legRight=x+c.span-11;const clear=c.modules.every(m=>legRight<=m.x-1||legLeft>=m.x+m.width+1);if(clear)valid.add(x);}}return [...valid].sort((a,b)=>a-b);}
function spanRange(input){const c=clean(input),valid=allowedOffsets(c);if(!valid.length)return{min:c.spanOffset,max:c.spanOffset,valid:false};let selected=valid.reduce((a,b)=>Math.abs(b-c.spanOffset)<Math.abs(a-c.spanOffset)?b:a);let first=valid.indexOf(selected),last=first;while(first>0&&valid[first]-valid[first-1]<.100001)first--;while(last<valid.length-1&&valid[last+1]-valid[last]<.100001)last++;return{min:valid[first],max:valid[last],valid:true};}
// The editor can transfer the top between support boxes. Motion demos keep
// spanRange's continuous interval; travel spans every valid bearing interval.
function travelBounds(valid,fallback){return valid.length?{min:valid[0],max:valid[valid.length-1],valid:true}:{min:fallback,max:fallback,valid:false};}
function spanTravelRange(input){const c=clean(input);return travelBounds(allowedOffsets(c),c.spanOffset);}
function spanStep(input,key){const steps={ArrowRight:.1,ArrowUp:.1,ArrowLeft:-.1,ArrowDown:-.1,PageUp:10,PageDown:-10};if(!Object.hasOwn(steps,key)&&key!=='Home'&&key!=='End')return null;const c=clean(input),valid=allowedOffsets(c);if(!valid.length)return c.spanOffset;if(key==='Home')return valid[0];if(key==='End')return valid[valid.length-1];const step=steps[key],target=c.spanOffset+step;return step>0?(valid.find(n=>n>=target-.000001)??valid[valid.length-1]):(valid.slice().reverse().find(n=>n<=target+.000001)??valid[0]);}
// Edge offsets describe a group footprint, not an absolute wall position. A
// right-anchored pair therefore follows a sliding top without limiting its
// mechanical travel to the original, wider composition.
function upperBounds(upper){let left=0,right=0,free=0;for(const u of upper||[]){if(u.anchor==='left')left=Math.max(left,(u.edgeOffset||0)+u.width);else if(u.anchor==='right')right=Math.max(right,(u.edgeOffset||0)+u.width);else free=Math.max(free,u.x+u.width);}return{left,right,free,minWidth:Math.max(free,left+right)};}
function resolveUpper(upper,width){return(upper||[]).map(u=>({...u,x:u.anchor==='right'?Math.max(0,Math.round((width-u.width-(u.edgeOffset||0))*1000)/1000):u.anchor==='left'?(u.edgeOffset||0):u.x}));}
function layout(input){
const c=clean(input),h=c.bodyHeight,baseWidth=Math.max(...c.modules.map(m=>m.x+m.width)),range=spanRange(c),offset=Math.max(range.min,Math.min(range.max,c.spanOffset)),groundWidth=c.spanEnabled?Math.max(baseWidth,offset+c.span):baseWidth,upperMinimum=upperBounds(c.upper).minWidth,width=Math.max(groundWidth,upperMinimum);c.upper=resolveUpper(c.upper,width);const upperWidth=Math.max(0,...c.upper.map(u=>u.x+u.width)),valid=allowedOffsets(c),travelRange=travelBounds(valid,c.spanOffset),furthestOffset=valid.length?valid[valid.length-1]:Math.max(0,c.spanOffset),frameWidth=Math.max(baseWidth,upperMinimum,c.spanEnabled?furthestOffset+c.span:0),origin=-frameWidth/2,parts=[];
function box(name,w,h,d,x,y,z,kind='body',module=-1,assembly){const part={name,w,h,d,x,y,z,kind,module,assembly:assembly||(module>=0?'box-'+module:'span')};if(kind==='body'||kind==='shelf'||kind==='front'){part.shape='beveled-panel';part.bevel=.08;}parts.push(part);return part;}
// Framed clear reeded glass is an opening with a real profiled sheet, never
// an opaque texture applied over the original solid door. Frame and shelves
// use the common body finish. These assembly details remain visual assumptions.
function glazedDoor(add,w,H,t,x,y,z){
const rail=2,glassW=w-rail*2+.3,glassH=H-rail*2+.3;
add('Cam kapak sol çerçeve',rail,H,t,x-w/2+rail/2,y,z,'body');
add('Cam kapak sağ çerçeve',rail,H,t,x+w/2-rail/2,y,z,'body');
add('Cam kapak alt çerçeve',w-rail*2,rail,t,x,y-H/2+rail/2,z,'body');
add('Cam kapak üst çerçeve',w-rail*2,rail,t,x,y+H/2-rail/2,z,'body');
const glass=add('Şeffaf fitilli cam',glassW,glassH,.55,x,y,z-.05,'glass');glass.shape='fluted-glass';glass.ribPitch=.8;glass.ribDepth=.18;glass.provisional=true;
}
c.modules.forEach((m,i)=>{const start=origin+m.x,x=start+m.width/2,w=m.width,t=1.2,frontW=w-2*t-.4,frontH=h-2*t-.4,frontZ=22.5-.4-t/2;
box('Sol yan',t,h,45,start+t/2,h/2,0,'body',i);box('Sağ yan',t,h,45,start+w-t/2,h/2,0,'body',i);box('Alt panel',w-2*t,t,45,x,t/2,0,'body',i);box('Kutu üstü',w-2*t,t,45,x,h-t/2,0,'body',i);
const back=box('Arkalık',w-2*t,h-2*t,.8,x,h/2,-22.1,'back',i);back.shape='perforated-panel';back.holes=[];
// Two rows of five rear fixing holes follow the prototype photograph; their 6 mm diameter is provisional.
for(const y of [-back.h/4,back.h/4])for(let j=1;j<=5;j++)back.holes.push({x:-back.w/2+back.w*j/6,y,r:.3});
if(m.front==='fluted-glass'){glazedDoor((...args)=>box(...args,i),frontW,frontH,t,x,h/2,frontZ);box('Cam modül iç rafı',w-2*t,t,39.5,x,h/2,-1.5,'shelf',i);}
if(m.front==='plain')box('Düz kapak',frontW,frontH,t,x,h/2,frontZ,'front',i);
if(m.front==='drop')box('Düşer kapak',frontW,frontH,t,x,h/2,frontZ,'front',i);
if(m.front==='open')box('Kutu iç dikmesi',t,h-2*t,43.4,x,h/2,-.1,'body',i);
if(m.front==='hybrid'){
box('Kutu orta dikme',t,h-2*t,43.4,x,h/2,-.1,'body',i);
box('Kutu açık bölüm rafı',(w-3*t)/2,t,43.4,x+(w-t)/4,h/2,-.1,'shelf',i);
box('Kutu yarım kapağı',(w-3*t)/2-.4,frontH,t,start+t+(w-3*t)/4,h/2,frontZ,'front',i);
}
if(m.front==='drawers'){
// Each existing 4 mm joint has a dark recessed return two millimetres
// behind the front plane. It sits only inside the real joint, rather than
// drawing a line over a solid front. The return detail is a visual assumption.
const n=2;for(let j=1;j<n;j++){const cavity=box('Çekmece iç gölge boşluğu',frontW,.4,.16,x,t+j*(h-2*t)/n,frontZ+t/2-.28,'recess',i);cavity.provisional=true;}
for(let j=0;j<n;j++)box('Çekmece önü',frontW,(h-2*t)/n-.4,t,x,t+(j+.5)*(h-2*t)/n,frontZ,'front',i);
}
if(m.front==='deep-drawer')box('Derin çekmece önü',frontW,frontH,t,x,h/2,frontZ,'front',i);
});
if(c.spanEnabled){const left=origin+offset;const top=box('Span üst tablası',c.span,2.5,45,left+c.span/2,h+9.25,0,'top');top.shape='beveled-panel';top.bevel=.5;box('Span ara desteği',1.8,8,40,left+25,h+4,0,'support');box('Span panel ayak',2.5,h+8,42,left+c.span-12.25,(h+8)/2,0,'leg');}
c.upper.forEach((u,i)=>{const assembly='upper-'+i,left=origin+u.x,x=left+u.width/2;
function upperBox(name,w,h,d,x,y,z,kind='body'){const part=box(name,w,h,d,x,y,z,kind,-1,assembly);part.upper=i;return part;}
if(u.type==='WS'){upperBox('Duvar rafı',u.width,2.8,26,x,u.y+1.4,-9.5,'shelf');return;}
const dims=upperDimensions(u),w=dims.width,H=dims.height,D=dims.depth,t=1.2,z=-22.5+D/2,centerY=u.y+H/2,frontW=w-2*t-.4,frontH=H-2*t-.4,frontZ=z+D/2-.4-t/2;
upperBox('Duvar modül sol yan',t,H,D,left+t/2,centerY,z);upperBox('Duvar modül sağ yan',t,H,D,left+w-t/2,centerY,z);
upperBox('Duvar modül altı',w-2*t,t,D,x,u.y+t/2,z);upperBox('Duvar modül üstü',w-2*t,t,D,x,u.y+H-t/2,z);
const back=upperBox('Duvar modül arkalığı',w-2*t,H-2*t,.8,x,centerY,-22.1,'back');back.shape='perforated-panel';back.holes=[];
for(const y of [-back.h/4,back.h/4])for(let j=1;j<=5;j++)back.holes.push({x:-back.w/2+back.w*j/6,y,r:.3});
if(u.front==='fluted-glass'||u.front==='vertical-glass'){
glazedDoor(upperBox,frontW,frontH,t,x,centerY,frontZ);
const count=u.front==='vertical-glass'?2:1;for(let shelf=1;shelf<=count;shelf++)upperBox('Cam duvar modül iç rafı',w-2*t,t,D-5,x,u.y+t+(H-2*t)*shelf/(count+1),z-1.5,'shelf');
}
if(u.front==='drop'||u.front==='vertical')upperBox(u.front==='vertical'?'Dikey menteşeli duvar modül kapağı':'Duvar modül kapağı',frontW,frontH,t,x,centerY,frontZ,'front');
if(u.front==='open')upperBox('Duvar modül iç rafı',w-2*t,t,D-.8,x,centerY,z+.4,'shelf');
if(u.front==='hybrid'){
upperBox('Duvar modül orta dikme',t,H-2*t,D-.8,x,centerY,z+.4);
upperBox('Duvar modül yarım kapağı',(w-3*t)/2-.4,frontH,t,left+t+(w-3*t)/4,centerY,frontZ,'front');
}

});
const groundHeight=h+(c.spanEnabled?10.5:0),height=Math.max(groundHeight,...c.upper.map(u=>u.y+upperDimensions(u).height));
return{width,groundWidth,upper:c.upper,frameWidth,left:origin,right:origin+width,baseWidth,spanOffset:offset,range,travelRange,height,groundHeight,depth:45,boxHeight:h,parts,metadata:{unit:'cm',assumptions:[...(c.modules.some(m=>m.front==='fluted-glass')||c.upper.some(u=>['fluted-glass','vertical-glass'].includes(u.front))?['Fitilli camda 8 mm ritim, 1,8 mm kabartı, 20 mm çerçeve ve cam kalınlığı görsel kabuldür; üretim öncesinde kesinleşir.']:[]),'Kutu panel kalınlığı 1,2 cm ve kapak içeri çekilmesi 0,4 cm görsel varsayımdır.','Tüm modül arkalarında 2 × 5 bağlantı deliği bulunur; çapı 0,6 cm ve yerleşimi yaklaşık olarak alınmıştır.',...(c.upper.some(u=>u.type==='UW'&&['vertical','vertical-glass'].includes(u.front))?['Dikey duvar modülü 36 × 36 × 90 cm ilk model ölçüsüdür; taslak oranından alınmış, üretim ölçüsü henüz doğrulanmamıştır.']:[])]}};
}
function appendModule(input){const c=clean(input),x=Math.max(...c.modules.map(m=>m.x+m.width));const width=c.modules[0].width;c.modules.push({width,x,front:c.modules[0].front});if(c.spanEnabled)c.spanOffset=x+width/2-25;return c;}
function openSpanOffset(input){const c=clean(input),last=c.modules.reduce((a,b)=>a.x+a.width>b.x+b.width?a:b);return Math.max(0,last.x+last.width/2-25);}
function removeModule(input,index){
const c=clean(input);if(!Number.isInteger(index)||index<0||index>=c.modules.length||c.modules.length<=1)return c;
const physical=c.modules.map((m,i)=>({index:i,x:m.x})).sort((a,b)=>a.x-b.x||a.index-b.index),position=physical.findIndex(m=>m.index===index),removed=c.modules[index],next=physical[position+1],right=new Set(physical.slice(position+1).map(m=>m.index));
// The right-hand group fills the removed footprint. Its own manual gaps and
// the intentional space before that footprint remain unchanged.
const shift=next?next.x-removed.x:0;c.modules=c.modules.filter((m,i)=>{if(i===index)return false;if(right.has(i))m.x=Math.max(0,m.x-shift);return true;});
if(c.spanEnabled){const offsets=allowedOffsets(c);if(!offsets.length)throw new Error('Kalan base modüllerde tabla için geçerli bir destek konumu yok.');const target=openSpanOffset(c);c.spanOffset=offsets.reduce((nearest,offset)=>Math.abs(offset-target)<Math.abs(nearest-target)?offset:nearest);}
return c;
}
const api={defaults,clean,cleanTV,tvSizes,bodyHeights,normalizeBodyHeight,withBodyHeight,layout,widths,fronts,finishes,widthMatrix,getWidths,getWidthsForFront,frontsForWidth,normalizeMaterials,upperDimensions,upperBounds,resolveUpper,canonicalFront,spanRange,spanTravelRange,spanStep,allowedOffsets,appendModule,openSpanOffset,removeModule};if(typeof module!=='undefined'&&module.exports)module.exports=api;else global.AdopConfig=api;
})(typeof window!=='undefined'?window:globalThis);
