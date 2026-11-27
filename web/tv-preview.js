(function(global){
'use strict';
const sizes=Object.freeze((global.AdopConfig?.tvSizes||[32,43,50,55,65,75,85,98]).slice()),EPSILON=1e-6;
const finite=(value,fallback)=>Number.isFinite(value)&&value>0?value:fallback;
function clean(input){if(!global.AdopConfig?.cleanTV)throw new Error('ADØP TV seçenekleri yüklenmedi.');return global.AdopConfig.cleanTV(input);}
function dimensions(input){
const tv=clean(input&&typeof input==='object'?input:{inch:input});if(!tv.inch)return null;
const model=global.AdopTVCatalog?.get(tv.modelId),diagonalCm=tv.inch*2.54,ratio=Math.hypot(16,9),nominalWidth=diagonalCm*16/ratio,nominalHeight=diagonalCm*9/ratio;
const appearance=global.AdopTVAppearance?.resolve(model,tv)||null,frameWidth=model?model.widthCm:finite(tv.customWidthCm,nominalWidth+1.2),frameHeight=model?model.heightCm:finite(tv.customHeightCm,nominalHeight+1.2),scale=Math.min(1,(frameWidth-.2)/nominalWidth,(frameHeight-.2)/nominalHeight),shape=tv.shape&&tv.shape!=='auto'?tv.shape:model?.shape==='curved'?'curved':'flat',standType=tv.standType&&tv.standType!=='auto'?tv.standType:appearance?.standType||(['twin','center','pedestal','arch'].includes(model?.standType)?model.standType:'twin');
const screenWidth=nominalWidth*scale,screenHeight=nominalHeight*scale,bezelSideCm=(frameWidth-screenWidth)/2,bezelBottomCm=(frameHeight-screenHeight)*(appearance?.bezelBottomRatio??.5),bezelTopCm=frameHeight-screenHeight-bezelBottomCm,screenCenterY=(bezelBottomCm-bezelTopCm)/2;
// Published standWidthCm describes the complete assembled television, not the distance between its feet.
const defaultFootWidth=frameWidth*(appearance?.footWidthRatio??({twin:.76,center:.31,pedestal:.38,arch:.65}[standType])),matchingStand=!tv.standType||tv.standType==='auto';
const standLift=matchingStand?finite(model?.standLiftCm,finite(appearance?.standLiftCm,finite(model?.standHeightCm-model?.heightCm,8))):8,footWidth=matchingStand?finite(model?.footWidthCm,finite(appearance?.footWidthCm,defaultFootWidth)):defaultFootWidth,footDepth=matchingStand?finite(model?.footDepthCm,finite(appearance?.footDepthCm,finite(model?.standDepthCm,25))):25;
let depth=model?model.depthCm:finite(tv.customDepthCm,shape==='curved'?10:3);
const radius=shape==='curved'?Math.max(frameWidth/2+1,finite(model?.curvatureRadiusCm,420)):null,requestedSag=radius?radius-Math.sqrt(radius*radius-frameWidth*frameWidth/4):0;
// Keep the manufacturer's overall casing depth; a geometric override may require a deeper generic case.
if(shape==='curved'&&(!model||model.shape!=='curved'))depth=Math.max(depth,requestedSag+1);
const curveSag=shape==='curved'?Math.min(requestedSag,Math.max(.1,depth-.5)):0,manual=!model&&['customWidthCm','customHeightCm','customDepthCm'].some(k=>tv[k]!==undefined);
const standVerified=!!(matchingStand&&((model?.standType||appearance?.visualProfileVerified)&&model?.footWidthCm&&model?.footDepthCm&&(model?.standLiftCm||model?.standHeightCm)||appearance?.standDimensionsVerified)),standPrecision=standVerified?'manufacturer':'approximate';
return{inch:tv.inch,diagonalCm,screenWidth,screenHeight,screenCenterY,bezelSideCm,bezelTopCm,bezelBottomCm,appearance,frameWidth,frameHeight,depth,mount:tv.mount==='surface'?'surface':'wall',shape,standType,standLift,footWidth,footDepth,standPrecision,standVerified,curveSag,curvatureRadiusCm:radius,curvatureVerified:!!(model?.curvatureRadiusCm&&tv.shape!=='flat'),setback:tv.setback??5,modelId:model?.id||null,brand:model?.brand||null,model:model?.model||null,sourceUrl:model?.sourceUrl||null,checkedAt:model?.checkedAt||null,region:model?.region||null,precision:model?'manufacturer':manual?'manual':'approximate',dimensionsVerified:!!model};
}
function overlaps(a,b){return a.left<b.right-EPSILON&&a.right>b.left+EPSILON&&a.bottom<b.top-EPSILON&&a.top>b.bottom+EPSILON&&a.back<b.front-EPSILON&&a.front>b.back+EPSILON;}
function partBounds(part){return{left:part.x-part.w/2,right:part.x+part.w/2,bottom:part.y-part.h/2,top:part.y+part.h/2,back:part.z-part.d/2,front:part.z+part.d/2};}
function contactRects(d){
const w=d.footWidth,h=d.footDepth,pad=Math.min(4,w/5),tip=Math.min(3,h/5),rect=(x,z,rw,rd)=>({left:x-rw/2,right:x+rw/2,back:z-rd/2,front:z+rd/2});
if(d.appearance?.standStyle==='fork')return[rect(-(w-pad)/2,(h-tip)/2,pad,tip),rect((w-pad)/2,(h-tip)/2,pad,tip),rect(0,-(h-tip)/2,pad,tip)];
if(d.standType==='twin')return[-1,1].flatMap(side=>[-1,1].map(end=>rect(side*(w-pad)/2,end*(h-tip)/2,pad,tip)));
if(d.standType==='arch')return[-1,1].map(side=>rect(side*(w-pad)/2,0,pad,h));
if(d.standType==='center')return[rect(0,0,pad,h),rect(0,(h-tip)/2,w,tip)];
return[rect(0,0,w,h)];
}
// Rectangular subdivision checks the full bearing pad, including gaps between adjacent cabinet tops.
function covered(rect,tops){
const intersects=tops.filter(t=>t.left<rect.right+EPSILON&&t.right>rect.left-EPSILON&&t.back<rect.front+EPSILON&&t.front>rect.back-EPSILON);
if(!intersects.length)return false;
const cuts=(low,high,a,b)=>[low,high,...intersects.flatMap(t=>[t[a],t[b]]).filter(n=>n>low&&n<high)].sort((x,y)=>x-y),xs=cuts(rect.left,rect.right,'left','right'),zs=cuts(rect.back,rect.front,'back','front');
for(let i=1;i<xs.length;i++)for(let j=1;j<zs.length;j++){if(xs[i]-xs[i-1]<EPSILON||zs[j]-zs[j-1]<EPSILON)continue;const x=(xs[i]+xs[i-1])/2,z=(zs[j]+zs[j-1])/2;if(!intersects.some(t=>x>=t.left-EPSILON&&x<=t.right+EPSILON&&z>=t.back-EPSILON&&z<=t.front+EPSILON))return false;}
return true;
}
function layout(input,furnitureLayout){
const C=global.AdopConfig,c=C.clean(input),tv=clean(c.tv),d=dimensions(tv);if(!d)return null;
const furniture=furnitureLayout||C.layout(c),groundWidth=furniture.groundWidth??furniture.baseWidth,tops=(furniture.parts||[]).filter(p=>p.name==='Kutu üstü'||p.name==='Span üst tablası'||p.module>=0&&['Sol yan','Sağ yan'].includes(p.name)).map(p=>({...partBounds(p),name:p.name})),heights=[...new Set(tops.map(t=>t.top))].sort((a,b)=>b-a),localContacts=contactRects(d),frontEdge=22.5;
let centerFromLeft=tv.center===null?(d.mount==='surface'?groundWidth:furniture.baseWidth)/2:tv.center,x=furniture.left+centerFromLeft,z=d.mount==='surface'?frontEdge-d.setback-d.footDepth/2:-20+d.depth/2,supportHeight=null,supportValid=true,supportMessage='',footContacts=[];
const contactsAt=center=>localContacts.map(r=>({left:furniture.left+center+r.left,right:furniture.left+center+r.right,back:z+r.back,front:z+r.front})),supportAt=center=>{const contacts=contactsAt(center);for(const height of heights)if(contacts.every(r=>covered(r,tops.filter(t=>Math.abs(t.top-height)<EPSILON))&&!tops.some(t=>t.top>height+EPSILON&&r.left<t.right-EPSILON&&r.right>t.left+EPSILON&&r.back<t.front-EPSILON&&r.front>t.back+EPSILON)))return height;return null;};
if(d.mount==='surface'){
 if(tv.center===null&&supportAt(centerFromLeft)===null){const candidates=new Set([centerFromLeft,...tops.map(t=>(t.left+t.right)/2-furniture.left)]);for(const t of tops)for(const r of localContacts){candidates.add(t.left-furniture.left-r.left);candidates.add(t.right-furniture.left-r.right);}const valid=[...candidates].filter(center=>supportAt(center)!==null).sort((a,b)=>Math.abs(a-centerFromLeft)-Math.abs(b-centerFromLeft));if(valid.length)centerFromLeft=valid[0];}
 x=furniture.left+centerFromLeft;footContacts=contactsAt(centerFromLeft);supportHeight=supportAt(centerFromLeft);supportValid=supportHeight!==null;
 if(!supportValid){const touched=tops.filter(t=>footContacts.some(r=>r.left<t.right&&r.right>t.left&&r.back<t.front&&r.front>t.back));supportHeight=touched.length?Math.max(...touched.map(t=>t.top)):(furniture.groundHeight??40);supportMessage='Ayakların tamamı aynı yükseklikte bir yüzeye oturmuyor. TV’yi kaydır veya ayak tipini değiştir.';}else supportMessage='TV ayakları ünite üzerinde destekleniyor.';
 footContacts=footContacts.map(r=>({...r,bottom:supportHeight,top:supportHeight+.12}));
}
const bottom=d.mount==='surface'?supportHeight+d.standLift:tv.bottom===null?(furniture.groundHeight??40)+15:tv.bottom,y=bottom+d.frameHeight/2,top=bottom+d.frameHeight,leftFromLeft=centerFromLeft-d.frameWidth/2,rightFromLeft=centerFromLeft+d.frameWidth/2,caseBox={left:x-d.frameWidth/2,right:x+d.frameWidth/2,bottom,top,back:z-d.depth/2,front:z+d.depth/2},bbox={...caseBox};
if(d.mount==='surface'){bbox.bottom=supportHeight;bbox.left=Math.min(bbox.left,x-d.footWidth/2);bbox.right=Math.max(bbox.right,x+d.footWidth/2);bbox.back=Math.min(bbox.back,z-d.footDepth/2);bbox.front=Math.max(bbox.front,z+d.footDepth/2);}
const overhang={left:Math.max(0,-leftFromLeft),right:Math.max(0,rightFromLeft-groundWidth)},collisions=[];
(furniture.upper||c.upper).forEach((u,index)=>{const size=C.upperDimensions(u),bounds={left:furniture.left+u.x,right:furniture.left+u.x+size.width,bottom:u.y,top:u.y+size.height,back:-22.5,front:-22.5+size.depth};if(overlaps(bbox,bounds))collisions.push({type:'upper',index,label:(u.type==='WS'?'Raf ':'Duvar modül ')+(index+1)});});
const found=new Set();(furniture.parts||[]).forEach(part=>{const type=part.assembly==='span'?'span':part.module>=0?'base':null,bounds=partBounds(part);if(!type||found.has(type)||!overlaps(caseBox,bounds))return;found.add(type);const collision={type,label:type==='span'?'Adapte edilebilir tabla':'Base modül'};if(type==='base')collision.index=part.module;collisions.push(collision);});
return{...d,centerFromLeft,bottom,x,y,z,leftFromLeft,rightFromLeft,top,bbox,caseBox,overhang,fitsGround:overhang.left<=EPSILON&&overhang.right<=EPSILON,collisions,hasCollisions:collisions.length>0,clearanceAboveFurniture:bottom-(furniture.groundHeight??40),supportHeight,supportBottom:supportHeight,supportValid,supportMessage,footContacts};
}
const api={sizes,clean,dimensions,layout};global.AdopTV=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
