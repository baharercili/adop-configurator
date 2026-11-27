(function(global){'use strict';
let sourceScan,photo,loading,paintSurface,studioTablesReady=false,softShadowsInstalled=false;
const woodMaps={},woodSurface={},environments=new WeakMap();
const palette={
 oak:{id:'oak',name:'Açık meşe',kind:'veneer',color:'#aa8558'},
 'dark-oak':{id:'dark-oak',name:'Koyu meşe',kind:'veneer',color:'#64523d'},
 'black-oak':{id:'black-oak',name:'Siyah boyalı meşe',kind:'veneer',color:'#302f2b'},
 cream:{id:'cream',name:'Krem lake',kind:'lacquer',color:'#d8d7c2'},
 olive:{id:'olive',name:'Olive lake',kind:'lacquer',color:'#7a704f'},
 'light-grey':{id:'light-grey',name:'Açık gri lake',kind:'lacquer',color:'#c7c8c5'},
 burgundy:{id:'burgundy',name:'Bordo lake',kind:'lacquer',color:'#6b2938'}
};
function finishId(id){if(id==='walnut'||id==='smoked-oak')return'dark-oak';return palette[id]?id:'oak';}
function finish(id){id=finishId(id);const stored=global.AdopModules?.finishes.find(f=>f.id===id);return{...stored,...palette[id]};}
function loadMap(url){return new Promise((resolve,reject)=>{new THREE.TextureLoader().load(url,map=>{map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;map.encoding=THREE.sRGBEncoding;resolve(map);},undefined,reject);});}
function colourVariants(source){
 // The original scan and its pixels remain immutable. Wood finishes retain
 // the same scanned grain; colour and contrast are applied to separate copies.
 const canvas=document.createElement('canvas'),image=source.image;
 canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,count=data.length/4;
 const broad=document.createElement('canvas');broad.width=canvas.width;broad.height=canvas.height;const broadContext=broad.getContext('2d',{willReadFrequently:true});broadContext.filter='blur(12px)';broadContext.drawImage(canvas,0,0);const low=broadContext.getImageData(0,0,canvas.width,canvas.height).data;
 let meanR=0,meanG=0,meanB=0;
 for(let i=0;i<data.length;i+=4){meanR+=data[i];meanG+=data[i+1];meanB+=data[i+2];}
 meanR/=count;meanG/=count;meanB/=count;
 const mean=.2126*meanR+.7152*meanG+.0722*meanB,means=[meanR,meanG,meanB];
 const variants=[{id:'oak',contrast:1,chroma:1},{id:'dark-oak',target:[92,72,49],contrast:.90,chroma:.28},{id:'black-oak',target:[48,47,43],contrast:.32,chroma:.04}];
 variants.forEach(variant=>{
  const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
  const output=copy.getContext('2d'),pixels=output.createImageData(copy.width,copy.height),out=pixels.data;
  for(let i=0;i<data.length;i+=4){
   const luminance=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2],broadLuma=.2126*low[i]+.7152*low[i+1]+.0722*low[i+2],delta=((broadLuma-mean)*.72+(luminance-broadLuma)*1.12)*variant.contrast;
   for(let channel=0;channel<3;channel++)out[i+channel]=variant.id==='oak'?means[channel]+[6,2,-4][channel]+(low[i+channel]-means[channel])*.72+(data[i+channel]-low[i+channel])*1.12:variant.target[channel]+delta+variant.chroma*((data[i+channel]-luminance)-(means[channel]-mean));
   out[i+3]=data[i+3];
  }
  output.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(copy);map.encoding=THREE.sRGBEncoding;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
  map.userData={finish:variant.id,baseColour:palette[variant.id].color,source:'assets/oak-veneer-scan.jpg'};
  woodMaps[variant.id]=map;
 });
}
function veneerSurface(source){
 // Surface maps are generated from the untouched scan. The relief is under
 // one tenth of a millimetre; broad colour variation never becomes geometry.
 const image=source.image,canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),original=pixels.data;
 const roughCanvas=document.createElement('canvas');roughCanvas.width=canvas.width;roughCanvas.height=canvas.height;const rough=roughCanvas.getContext('2d'),values=rough.createImageData(canvas.width,canvas.height);
 // A very fine high pass follows pores without embossing the colour bands.
 const bumpCanvas=document.createElement('canvas');bumpCanvas.width=canvas.width;bumpCanvas.height=canvas.height;const bump=bumpCanvas.getContext('2d'),heightMap=bump.createImageData(canvas.width,canvas.height),W=canvas.width,H=canvas.height;
 const lum=(x,y)=>{const i=((y+H)%H*W+(x+W)%W)*4;return .2126*original[i]+.7152*original[i+1]+.0722*original[i+2];};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const center=lum(x,y),local=(lum(x-2,y)+lum(x+2,y)+lum(x,y-2)+lum(x,y+2))*.25,pores=center-local,i=(y*W+x)*4;
  const height=Math.max(104,Math.min(152,128+pores*.85)),roughness=Math.max(218,Math.min(246,234-pores*.34));
  heightMap.data[i]=heightMap.data[i+1]=heightMap.data[i+2]=height;heightMap.data[i+3]=255;
  values.data[i]=values.data[i+1]=values.data[i+2]=roughness;values.data[i+3]=255;
 }
 rough.putImageData(values,0,0);bump.putImageData(heightMap,0,0);
 for(const [key,surface] of [['roughness',roughCanvas],['bump',bumpCanvas]]){const map=new THREE.CanvasTexture(surface);map.encoding=THREE.LinearEncoding;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;woodSurface[key]=map;}
}

function ready(){if(!loading)loading=loadMap('assets/oak-veneer-scan.jpg').then(map=>{sourceScan=map;colourVariants(sourceScan);veneerSurface(sourceScan);photo=woodMaps.oak;return photo;});return loading;}
function texture(){return photo;}
// One shadow pass, with a blocker search: contact stays sharp while the
// penumbra grows with receiver distance. Fixed samples remain stable in motion.
function installSoftShadows(){
 if(softShadowsInstalled)return;
 const original=THREE.ShaderChunk.shadowmap_pars_fragment;
 if(original.includes('float adopSoftShadow(')){softShadowsInstalled=true;return;}
 const first=original.indexOf('#if defined( SHADOWMAP_TYPE_PCF )'),last=original.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',first);
 if(first<0||last<0)return;
 const disk=[[-.942016,-.399062],[.945586,-.768907],[-.094184,-.929389],[.344959,.293878],[-.915886,.457714],[-.815442,-.879125],[-.382775,.276768],[.974844,.756484],[.443233,-.975116],[.53743,-.473734],[-.264969,-.41893],[.791975,.190902],[-.241888,.997065],[-.8141,.914376],[.199841,.786414],[.143832,-.141008]];
 const vector=p=>'vec2( '+p[0].toFixed(6)+', '+p[1].toFixed(6)+' )';
 const search=disk.filter((p,i)=>i%2===0).map(p=>'adopBlocker( depths, coord.xy + '+vector(p)+' * searchRadius, coord.z, blockers );').join('\n');
 const filterDisk=Array.from({length:32},(_,i)=>{const radius=Math.sqrt((i+.5)/32),angle=i*2.399963229728653;return[Math.cos(angle)*radius,Math.sin(angle)*radius];});
 const filter=filterDisk.map(p=>'texture2DCompare( depths, coord.xy + '+vector(p)+' * filterRadius, coord.z )').join(' +\n');
 const helpers=[
 'void adopBlocker( sampler2D depths, vec2 uv, float receiver, inout vec2 result ) {',
 ' float depth = unpackRGBAToDepth( texture2D( depths, clamp( uv, vec2( 0.001 ), vec2( 0.999 ) ) ) );',
 ' if ( depth < receiver ) result += vec2( depth, 1.0 );',
 '}',
 'float adopSoftShadow( sampler2D depths, vec2 size, float softness, vec3 coord ) {',
 ' vec2 blockers = vec2( 0.0 );',
 ' vec2 texel = vec2( 1.0 ) / size;',
 ' vec2 searchRadius = max( texel * 1.5, vec2( min( 0.035, softness * 0.25 ) ) );',
 search,
 ' if ( blockers.y < 0.5 ) return 1.0;',
 ' float separation = max( 0.0, coord.z - blockers.x / blockers.y );',
 ' vec2 filterRadius = max( texel * 0.75, vec2( min( 0.045, separation * softness ) ) );',
 ' return ( '+filter+' ) * ( 1.0 / 32.0 );',
 '}'
 ].join('\n');
 const patched=original.slice(0,first)+'#if defined( SHADOWMAP_TYPE_PCF )\n shadow = adopSoftShadow( shadowMap, shadowMapSize, shadowRadius, shadowCoord.xyz );\n '+original.slice(last);
 THREE.ShaderChunk.shadowmap_pars_fragment=patched.replace('float getShadow(',helpers+'\nfloat getShadow(');
 softShadowsInstalled=true;
}
function configureRenderer(renderer,options={}){
 if(!renderer)return renderer;
 installSoftShadows();
 renderer.outputEncoding=THREE.sRGBEncoding;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=options.exposure??.94;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 if(options.pixelRatio!==undefined)renderer.setPixelRatio(options.pixelRatio);
 return renderer;
}
function createStudioRig(scene,renderer,options={}){
 configureRenderer(renderer,options);applyEnvironment(scene,renderer);
 if(!studioTablesReady&&THREE.RectAreaLightUniformsLib){THREE.RectAreaLightUniformsLib.init();studioTablesReady=true;}
 const ambient=new THREE.HemisphereLight(0xffffff,0xaaa69e,.20);
 const key=new THREE.DirectionalLight(0xfffaf4,.82);
 key.castShadow=true;const size=options.shadowMapSize||1024;
 key.shadow.mapSize.set(size,size);
 const fill=new THREE.DirectionalLight(0xf3f6ff,.10);fill.position.set(180,100,-160);
 const area=studioTablesReady?new THREE.RectAreaLight(0xffffff,3.2,240,300):null;
 const rig={key,fill,ambient,area,dispose(){[key,key.target,fill,fill.target,ambient,area].filter(Boolean).forEach(light=>scene.remove(light));}};
 key.userData.photoStudio=rig;
 scene.add(ambient,key,fill);if(area)scene.add(area);
 fitShadow(key,options.shadowBounds||new THREE.Box3(new THREE.Vector3(-100,0,-25),new THREE.Vector3(100,80,25)));
 return rig;
}
function render(renderer,scene,camera){return renderer.render(scene,camera);}
function prepareSurface(geometry,part,config){return global.AdopContact?.prepare(geometry,part,config)||geometry;}
function surfaceKey(part,config){return global.AdopContact?.key(part,config)||'';}
function decorateSurfaceMaterial(material){return global.AdopContact?.decorateMaterial(material)||material;}
function lacquerSurface(){
 if(paintSurface)return paintSurface;
 const size=128,noise=new Float32Array(size*size);let seed=173;
 for(let i=0;i<noise.length;i++){seed=(seed*16807)%2147483647;noise[i]=seed/2147483647;}
 const at=(x,y)=>noise[((y+size)%size)*size+(x+size)%size],roughCanvas=document.createElement('canvas'),bumpCanvas=document.createElement('canvas');roughCanvas.width=roughCanvas.height=bumpCanvas.width=bumpCanvas.height=size;
 const rough=roughCanvas.getContext('2d'),bump=bumpCanvas.getContext('2d'),roughPixels=rough.createImageData(size,size),bumpPixels=bump.createImageData(size,size);
 // A sprayed satin finish has a minute, spatially correlated orange peel,
 // not timber grain or a visible random speckle. This texture repeats over
 // 3.75 × 1.875 cm using the existing physical veneer UVs.
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=(at(x,y)*4+at(x-1,y)+at(x+1,y)+at(x,y-1)+at(x,y+1))/8-.5,i=(y*size+x)*4;
  const r=235+n*25,h=128+n*44;
  roughPixels.data[i]=roughPixels.data[i+1]=roughPixels.data[i+2]=r;roughPixels.data[i+3]=255;
  bumpPixels.data[i]=bumpPixels.data[i+1]=bumpPixels.data[i+2]=h;bumpPixels.data[i+3]=255;
 }
 rough.putImageData(roughPixels,0,0);bump.putImageData(bumpPixels,0,0);paintSurface={};
 for(const [key,canvas] of [['roughness',roughCanvas],['bump',bumpCanvas]]){const map=new THREE.CanvasTexture(canvas);map.encoding=THREE.LinearEncoding;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(32,32);map.anisotropy=4;paintSurface[key]=map;}
 return paintSurface;
}
function ledWashMaterial(surface,bodyFinish){
 // Tiny gradient maps describe soft diffuse spill on the inside surfaces,
 // rather than tinting the glass or lighting the whole cabinet uniformly.
 const width=32,height=64,data=new Uint8Array(width*height*4),horizontal=surface==='floor';
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1),v=y/(height-1),edge=Math.pow(Math.sin(Math.PI*u),.4);
  const fade=horizontal?Math.pow(Math.sin(Math.PI*v),.32)*(.2+.8*Math.exp(-v*2.4)):Math.pow(v,.3)*Math.exp(-(1-v)*2.8)*Math.min(1,(1-v)*24);
  const i=(y*width+x)*4;data[i]=255;data[i+1]=216;data[i+2]=162;data[i+3]=Math.round(255*edge*fade);
 }
 const map=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);map.encoding=THREE.sRGBEncoding;map.magFilter=map.minFilter=THREE.LinearFilter;map.generateMipmaps=false;map.needsUpdate=true;
 // Dark finishes absorb more of the LED spill; they must not turn white.
 const strengths={'black-oak':.56,'dark-oak':.72,oak:.76,olive:.64,cream:.70,'light-grey':.68,burgundy:.60};
 // Add emitted radiance to the existing timber rather than replacing its
 // grain with a translucent colour panel. The clear glass then attenuates
 // the warm pool naturally; side bounce is reduced by geometry vertex colour.
 const material=new THREE.MeshBasicMaterial({map,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,opacity:(strengths[bodyFinish]||.96)*(horizontal?.72:1),depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 material.userData={temperatureK:3000,interiorLED:true};
 // Viewers own materials through their existing cache. A wash's private map
 // follows the same lifetime, including catalogue image rendering/disposal.
 material.addEventListener('dispose',()=>map.dispose());return material;
}
function materialFor(p,c,textureMap,cache=new Map()){
 // The dark material belongs behind a real opening. It is not a line
 // painted on the drawer fronts, and the existing four-millimetre gap
 // remains unchanged. Reeded glass has its own material, independent of paint.
 if(p.kind==='led'){
  if(!cache.has('interior-led-3000k')){const material=new THREE.MeshStandardMaterial({color:new THREE.Color('#fff1d8').convertSRGBToLinear(),emissive:new THREE.Color('#ffd6a3').convertSRGBToLinear(),emissiveIntensity:.9,roughness:.52,metalness:0,envMapIntensity:.15});material.userData={temperatureK:3000,interiorLED:true};cache.set('interior-led-3000k',material);}
  return cache.get('interior-led-3000k');
 }
 if(p.kind==='led-wash'){
  const surface=p.surface==='floor'?'floor':'vertical',id=finishId(c.bodyFinish||c.finish||'oak'),key='interior-led-wash-'+surface+'-'+id;
  if(!cache.has(key))cache.set(key,ledWashMaterial(surface,id));return cache.get(key);
 }
 if(p.kind==='recess'){
  if(!cache.has('recess'))cache.set('recess',new THREE.MeshStandardMaterial({color:new THREE.Color(0x11120f).convertSRGBToLinear(),roughness:1,metalness:0,envMapIntensity:.03}));
  return cache.get('recess');
 }
 // Three r128 implements transmission through alpha blending. Keep the
 // material transparent so the interior remains visible in this renderer.
 if(p.kind==='glass'){
  if(!cache.has('fluted-glass'))cache.set('fluted-glass',new THREE.MeshPhysicalMaterial({color:new THREE.Color('#cbd9d3').convertSRGBToLinear(),transmission:.94,transparent:true,opacity:.72,roughness:.075,metalness:0,clearcoat:.12,clearcoatRoughness:.10,reflectivity:.5,envMapIntensity:.95,side:THREE.FrontSide,depthWrite:false}));
  return cache.get('fluted-glass');
 }
 const hardware=p.kind==='hardware',channel=p.assembly==='span'?'spanFinish':(['front','slat'].includes(p.kind)?'frontFinish':'bodyFinish');
 const id=hardware?p.finish:finishId(c[channel]||c.finish||'oak');
 const key=hardware?id:id+'-'+(p.kind==='slat'?'slat':'base');if(cache.has(key))return cache.get(key);
 let material;
 if(hardware)material=new THREE.MeshStandardMaterial({color:new THREE.Color(id==='steel'?0x9b9c98:0x242521).convertSRGBToLinear(),metalness:id==='steel'?1:.75,roughness:id==='steel'?.30:.40,envMapIntensity:.9});
 else{
  const f=finish(id),wood=f.kind==='veneer';
  if(wood)material=new THREE.MeshPhysicalMaterial({map:woodMaps[id]||photo||textureMap,color:0xffffff,roughness:id==='black-oak'?.60:id==='dark-oak'?.54:.51,roughnessMap:woodSurface.roughness,bumpMap:woodSurface.bump,bumpScale:id==='black-oak'?.005:.008,metalness:0,clearcoat:id==='black-oak'?.10:.08,clearcoatRoughness:.42,reflectivity:.5,envMapIntensity:id==='black-oak'?.76:.62});
  else{const surface=lacquerSurface();material=new THREE.MeshPhysicalMaterial({color:new THREE.Color(f.color).convertSRGBToLinear(),roughness:id==='olive'?.44:.42,roughnessMap:surface.roughness,bumpMap:surface.bump,bumpScale:.0015,metalness:0,clearcoat:.16,clearcoatRoughness:.36,clearcoatRoughnessMap:surface.roughness,reflectivity:.5,envMapIntensity:.88});}
  decorateSurfaceMaterial(material);
 }
 cache.set(key,material);return material;
}
function applyEnvironment(scene,renderer){
 if(!scene||!renderer)return null;
 let record=environments.get(renderer);
 if(!record){
  const room=new THREE.Scene(),temporary=[];
  function panel(width,height,position,rotation,brightness){
   const geometry=new THREE.PlaneGeometry(width,height),material=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(brightness,brightness,brightness),side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);room.add(mesh);temporary.push(geometry,material);
  }
  // A dim neutral surround and unequal softboxes retain shadow-side shape.
  // This is radiance for material reflections; direct illumination belongs
  // to the caller's scene. Keeping it neutral preserves the approved finish hues.
  const boxGeometry=new THREE.BoxGeometry(12,9,12),boxMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(.13,.13,.13),side:THREE.BackSide});
  room.add(new THREE.Mesh(boxGeometry,boxMaterial));temporary.push(boxGeometry,boxMaterial);
  panel(4.5,3.2,[-1.8,2.3,5.8],[0,Math.PI,0],3.4);
  // Narrow studio softboxes give the curved glass ribs a continuous vertical
  // highlight while the broad key keeps timber and lacquer softly lit.
  panel(.40,5,[-2.4,.2,5.7],[0,Math.PI,0],5.6);
  panel(.28,4,[3.5,.8,5.7],[0,Math.PI,0],2.4);
  panel(4,3,[-5.8,1.4,-.8],[0,Math.PI/2,0],1.5);
  panel(3,4,[5.8,1.2,1.2],[0,-Math.PI/2,0],.55);
  panel(5,4,[0,4.3,-.7],[Math.PI/2,0,0],1.4);
  const generator=new THREE.PMREMGenerator(renderer);let target;
  try{target=generator.fromScene(room,.04,.1,50);}finally{generator.dispose();temporary.forEach(item=>item.dispose());}
  record={target,scenes:new Set()};environments.set(renderer,record);
 }
 record.scenes.add(scene);scene.environment=record.target.texture;return record.target.texture;
}
// Fit the shadow texels to the actual furniture, rather than a fixed room.
function fitShadow(light,object){
 if(!light||!light.shadow||!object)return;
 const bounds=object.isBox3?object:new THREE.Box3().setFromObject(object);
 if(bounds.isEmpty())return;
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const direction=new THREE.Vector3(-.62,1.55,1.15).normalize(),distance=Math.max(220,size.length()*1.15);
 light.position.copy(center).addScaledVector(direction,distance);light.target.position.copy(center);
 if(light.parent&&!light.target.parent)light.parent.add(light.target);
 light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);
 const camera=light.shadow.camera;camera.position.copy(light.position);camera.lookAt(center);camera.updateMatrixWorld(true);
 let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,near=Infinity,far=-Infinity;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const point=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
  left=Math.min(left,point.x);right=Math.max(right,point.x);bottom=Math.min(bottom,point.y);top=Math.max(top,point.y);near=Math.min(near,-point.z);far=Math.max(far,-point.z);
 }
 const margin=Math.max(7,Math.max(size.x,size.y)*.035);
 Object.assign(camera,{left:left-margin,right:right+margin,bottom:bottom-margin,top:top+margin,near:Math.max(1,near-margin*3),far:far+margin*3+Math.max(0,bounds.max.y)/direction.y});camera.updateProjectionMatrix();
 const rig=light.userData.photoStudio;
 light.shadow.radius=rig?Math.max(.025,(camera.far-camera.near)*.14/(camera.right-camera.left)):4;
 light.shadow.normalBias=.06;light.shadow.bias=-.0002;light.shadow.needsUpdate=true;
 if(rig){
  const extent=Math.max(120,size.x,size.y*1.2),sourceDistance=Math.max(180,extent*1.08);
  rig.fill.position.copy(center).add(new THREE.Vector3(sourceDistance*.8,sourceDistance*.55,-sourceDistance*.9));rig.fill.target.position.copy(center);if(rig.fill.parent&&!rig.fill.target.parent)rig.fill.parent.add(rig.fill.target);
  if(rig.area){rig.area.width=extent*1.35;rig.area.height=extent*1.6;rig.area.position.copy(center).addScaledVector(direction,sourceDistance);rig.area.lookAt(center);}
 }
}
function disposeEnvironment(renderer){
 const record=environments.get(renderer);if(!record)return;
 record.scenes.forEach(scene=>{if(scene.environment===record.target.texture)scene.environment=null;});
 record.target.dispose();environments.delete(renderer);
}
global.AdopAppearance={finish,materialFor,texture,ready,applyEnvironment,fitShadow,disposeEnvironment,configureRenderer,createStudioRig,render,prepareSurface,surfaceKey,decorateSurfaceMaterial};
})(window);
