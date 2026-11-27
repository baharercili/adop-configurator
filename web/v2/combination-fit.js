(function(global){
'use strict';
const EPSILON=1e-7;
function configOf(input){const C=global.AdopConfig;if(!C)throw new Error('ADØP yapılandırma verisi yüklenmedi.');return C.clean(input&&input.config?input.config:input);}
function fixedBounds(c){const baseStorageWidth=Math.max(0,...c.modules.map(m=>m.x+m.width)),upperWidth=Math.max(0,...c.upper.map(u=>u.x+u.width));return{baseStorageWidth,upperWidth,fixedWidth:Math.max(baseStorageWidth,global.AdopConfig.upperBounds(c.upper).minWidth),storageWidth:c.modules.reduce((sum,m)=>sum+m.width,0)};}
function products(input){const c=configOf(input),M=global.AdopModules;function find(family,width,front){if(!M)return null;return M.findProduct?M.findProduct(family,width,front):(M.products||[]).find(p=>p.family===family&&p.width===width&&(front===undefined||p.front===front))||null;}const list=c.modules.map(m=>find('BB',m.width,m.front));if(c.spanEnabled)list.push(find('ST',c.span));c.upper.forEach(u=>list.push(find(u.type,u.width,u.type==='UW'?(u.front==='plain'?'drop':u.front):undefined)));return list;}
function price(input){const c=configOf(input),M=global.AdopModules;if(!M||typeof M.price!=='function')return null;const list=products(c);if(!list.length||list.some(p=>!p))return null;try{const amounts=list.map(p=>M.price(p,c));return amounts.every(Number.isFinite)?amounts.reduce((sum,value)=>sum+value,0):null;}catch{return null;}}
function bounds(input){const c=configOf(input),fixed=fixedBounds(c),offsets=c.spanEnabled?global.AdopConfig.allowedOffsets(c):[],valid=!c.spanEnabled||offsets.length>0,min=valid?(c.spanEnabled?Math.max(fixed.fixedWidth,offsets[0]+c.span):fixed.fixedWidth):null,max=valid?(c.spanEnabled?Math.max(fixed.fixedWidth,offsets[offsets.length-1]+c.span):fixed.fixedWidth):null;return{...fixed,min,max,minWidth:min,maxWidth:max,spanEnabled:c.spanEnabled,valid,minOffset:offsets.length?offsets[0]:null,maxOffset:offsets.length?offsets[offsets.length-1]:null};}
function rounded(value){return Math.round(value*1000)/1000;}
// Base positions and materials remain fixed. The top uses its mechanical
// range; anchored upper groups follow the resulting composition edges.
function fit(input,wall,clearance=10){
const c=configOf(input),C=global.AdopConfig,range=bounds(c),gap=Number(clearance),unrestricted=wall===null||wall===undefined,wallWidth=unrestricted?null:Number(wall);
if(!range.valid||!Number.isFinite(gap)||gap<0||(!unrestricted&&(!Number.isFinite(wallWidth)||wallWidth<=0)))return null;
const availableWidth=unrestricted?null:wallWidth-2*gap;if(!unrestricted&&(availableWidth<0||range.fixedWidth>availableWidth+EPSILON))return null;
const originalOffset=c.spanOffset;
if(c.spanEnabled){const offsets=C.allowedOffsets(c);let selected=null,bestWidth=-Infinity,bestDistance=Infinity;for(const offset of offsets){const width=Math.max(range.fixedWidth,offset+c.span);if(!unrestricted&&width>availableWidth+EPSILON)continue;const distance=Math.abs(offset-originalOffset);if(unrestricted){if(distance<bestDistance-EPSILON){selected=offset;bestDistance=distance;}continue;}if(width>bestWidth+EPSILON||(Math.abs(width-bestWidth)<=EPSILON&&distance<bestDistance-EPSILON)){selected=offset;bestWidth=width;bestDistance=distance;}}if(selected===null)return null;c.spanOffset=selected;}
const layout=C.layout(c);c.upper=layout.upper;if(c.spanEnabled)c.spanOffset=layout.spanOffset;if(!unrestricted&&layout.width>availableWidth+EPSILON)return null;
const residual=unrestricted?null:rounded(wallWidth-layout.width),freeWidth=unrestricted?null:rounded(availableWidth-layout.width);
return{...(input&&input.config?input:{}),config:c,layout,bounds:range,wall:wallWidth,clearance:gap,availableWidth,targetWidth:availableWidth,actualWidth:layout.width,width:layout.width,baseStorageWidth:range.baseStorageWidth,storageWidth:range.storageWidth,upperWidth:range.upperWidth,residual,sideGap:residual===null?null:rounded(residual/2),freeWidth,adapted:Math.abs(c.spanOffset-originalOffset)>EPSILON};
}
const api={products,price,bounds,fit};global.AdopCombinationFit=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
