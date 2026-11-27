(function(global){
'use strict';
const standStyles={twin:'twin-v',center:'t-center',pedestal:'plate',arch:'arch'};
// These are visual construction profiles, not manufacturer CAD. Exact outside
// dimensions remain in the sourced catalogue; small trim details are estimates.
function resolve(model,tv){
 const code=model?.model||'',brand=model?.brand||'',oled=/OLED/i.test(code),profile={id:oled?'generic-oled':'generic-led',panelKind:oled?'oled':'led',backStyle:oled?'lower-housing':'tapered',panelThicknessCm:oled ? .45 : .9,caseColor:'#111317',trimColor:'#202328',standColor:'#34373b',bezelBottomRatio:.64,referenceUrl:null,visualProfileVerified:false};
 let standType=null;
 if(brand==='Samsung'&&/^UE(49|55|65)MU6500$/.test(code)){Object.assign(profile,{id:'samsung-mu6500',standStyle:'fork',footWidthRatio:.66,panelKind:'led',backStyle:'tapered',caseColor:'#101215',trimColor:'#24272b',standColor:'#42464b',bezelBottomRatio:.68,visualProfileVerified:true});standType='center';}
 if(brand==='Samsung'&&/^UE(49|55|65)RU7300$/.test(code)){Object.assign(profile,{id:'samsung-ru7300',standStyle:'twin-blade',panelKind:'led',backStyle:'tapered',standColor:'#25282d',visualProfileVerified:true});standType='twin';}
 if(brand==='Samsung'&&/^QE(65|77)S95FATXTK$/.test(code)){Object.assign(profile,{id:'samsung-s95f',standStyle:'plate',panelKind:'oled',backStyle:'uniform',panelThicknessCm:.45,caseColor:'#141518',trimColor:'#24262a',standColor:'#282a2e',bezelBottomRatio:.62,visualProfileVerified:true});standType='pedestal';}
 if(brand==='Samsung'&&code==='QE65QN90FATXTK'){Object.assign(profile,{id:'samsung-qn90f',standStyle:'plate',plateShape:'hexagon',panelKind:'led',backStyle:'uniform',panelThicknessCm:.8,caseColor:'#141518',trimColor:'#2a2c2e',standColor:'#303235',bezelBottomRatio:.61,visualProfileVerified:true});standType='pedestal';}
 if(brand==='Samsung'&&code==='QE65Q7FAAUXTK'){Object.assign(profile,{id:'samsung-q7f',standStyle:'twin-blade',panelKind:'led',backStyle:'tapered',caseColor:'#101215',trimColor:'#181b20',standColor:'#171a1e',bezelBottomRatio:.72,visualProfileVerified:true});standType='twin';}
 if(brand==='LG'&&/^OLED(55|65|77)C54LA$/.test(code)){Object.assign(profile,{id:'lg-c5',standStyle:'plate',plateShape:'wedge',panelKind:'oled',backStyle:'lower-housing',panelThicknessCm:.63,caseColor:'#181a1e',trimColor:'#55585b',standColor:'#3b3e42',bezelBottomRatio:.69,visualProfileVerified:true});standType='pedestal';}
 if(brand==='Sony'&&code==='K-65XR80'){Object.assign(profile,{id:'sony-xr80',standStyle:'underlay',panelKind:'oled',backStyle:'lower-housing',panelThicknessCm:.65,caseColor:'#15171b',trimColor:'#4c4f52',standColor:'#53565a',bezelBottomRatio:.62,visualProfileVerified:true,footWidthCm:124.4,footDepthCm:24.8,standLiftCm:2.6,standDimensionsVerified:true});standType='twin';}
 const override=tv?.standType&&tv.standType!=='auto'?tv.standType:null,resolvedType=override||standType||model?.standType||'twin';
 if(override||!profile.standStyle)profile.standStyle=standStyles[resolvedType]||'twin-v';
 if(override){profile.standOverride=true;delete profile.plateShape;delete profile.footWidthRatio;delete profile.footWidthCm;delete profile.footDepthCm;delete profile.standLiftCm;profile.standDimensionsVerified=false;}
 profile.standType=resolvedType;if(profile.visualProfileVerified)profile.referenceUrl=model?.sourceUrl||null;
 return profile;
}
const api=Object.freeze({resolve});global.AdopTVAppearance=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
