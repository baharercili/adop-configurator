(function(global){'use strict';
const P=global.AdopModulePreview;if(!P||typeof P.data!=='function')return;
// A single live preview is moved between visible cards by the shop controller.
// Static catalogue rendering above stays independent of the live WebGL canvas.
function motionProfile(product){
 const front=product.front;
 const kind=product.family==='ST'?'span':product.family==='WS'||front==='open'?'orbit':front==='drawers'||front==='deep-drawer'?'drawer':front==='fluted-glass'||front==='vertical-glass'?'glass-door':front==='drop'?'drop-door':front==='hybrid'?'hybrid-door':'hinged-door';
 return{kind,duration:6000,angle:(kind==='drop-door'?78:68)*Math.PI/180,travel:kind==='span'?14:front==='deep-drawer'?18:16};
}
function motionProgress(elapsedMs){
 const t=((Number(elapsedMs)||0)%6000+6000)%6000;
 const smooth=value=>{const n=Math.max(0,Math.min(1,value));return n*n*n*(n*(n*6-15)+10);};
 return t<900?0:t<2500?smooth((t-900)/1600):t<3400?1:t<5000?1-smooth((t-3400)/1600):0;
}
function createMotion(){
 let liveRenderer,liveScene,liveCamera,liveFloor,liveKey,liveRig,liveModel,art,profile,materials,partsGroup,envelope,target,baseYaw=.35,currentTime=0,disposed=false,drawers=[],door,spanGroup,spanTravel=0;
 const A=global.AdopAppearance,G=global.AdopGeometry,C=global.AdopConfig;
 function setupLive(){
  if(disposed)throw Error('Bu önizleme kapatıldı.');if(liveRenderer)return;
  liveRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  liveRenderer.outputEncoding=THREE.sRGBEncoding;liveRenderer.toneMapping=THREE.ACESFilmicToneMapping;liveRenderer.toneMappingExposure=.9;
  liveRenderer.shadowMap.enabled=true;liveRenderer.shadowMap.type=THREE.PCFShadowMap;liveRenderer.shadowMap.autoUpdate=false;
  const canvas=liveRenderer.domElement;canvas.className='hm-motion-canvas';canvas.setAttribute('aria-hidden','true');
  liveScene=new THREE.Scene();liveCamera=new THREE.PerspectiveCamera(35,1,.1,4000);
  if(A.configureRenderer&&A.createStudioRig){
   // Catalogue cards keep their photographic rig and surface treatment.
   A.configureRenderer(liveRenderer,{mode:'live',exposure:.94});
   liveRig=A.createStudioRig(liveScene,liveRenderer,{shadowMapSize:1024});liveKey=liveRig.key;canvas.dataset.appearance='studio';
  }else{
   // The homepage retains its approved lighting exactly.
   A.applyEnvironment(liveScene,liveRenderer);
   liveScene.add(new THREE.HemisphereLight(0xffffff,0xb1aea4,.38));
   liveKey=new THREE.DirectionalLight(0xfff9f0,1.05);liveKey.position.set(-110,250,140);liveKey.castShadow=true;liveKey.shadow.radius=4;liveKey.shadow.mapSize.set(1024,1024);Object.assign(liveKey.shadow.camera,{left:-250,right:250,top:250,bottom:-250});liveKey.shadow.normalBias=.15;liveScene.add(liveKey);
   const fill=new THREE.DirectionalLight(0xffffff,.20);fill.position.set(120,50,-120);liveScene.add(fill);canvas.dataset.appearance='home';
  }
  liveFloor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.ShadowMaterial({opacity:.16}));liveFloor.rotation.x=-Math.PI/2;liveFloor.receiveShadow=true;liveFloor.position.y=-.1;liveScene.add(liveFloor);
 }
 function clearModel(){
  if(!liveModel)return;liveScene.remove(liveModel);
  const geometries=new Set();liveModel.traverse(node=>{if(node.geometry)geometries.add(node.geometry);});geometries.forEach(geometry=>geometry.dispose());
  if(materials)new Set(materials.values()).forEach(material=>material.dispose());
  liveModel=null;materials=null;partsGroup=null;drawers=[];door=null;spanGroup=null;envelope=null;target=null;
 }
 function meshFor(part,config,role='fixed'){
  const rawGeometry=G.make(part),geometry=A.prepareSurface?.(rawGeometry,part,config)||rawGeometry;
  const mesh=new THREE.Mesh(geometry,A.materialFor(part,config,A.texture(),materials));mesh.position.set(part.x,part.y,part.z);mesh.name=part.name;
  mesh.castShadow=!part.illumination&&part.kind!=='glass';mesh.receiveShadow=!part.illumination;mesh.userData.part=part;mesh.userData.motionRole=role;return mesh;
 }
 function addTray(group,front,config){
  // Shallow demonstration drawer boxes stay inside the carcass when closed.
  // They travel with their front, rather than leaving a floating front panel.
  const w=front.w-2,h=Math.min(18,front.h*.65),d=28,t=.8,y=-front.h/2+1.1;
  const pieces=[
   {name:'Hareket önizlemesi çekmece tabanı',w,h:t,d,x:0,y,z:-d/2-.6},
   {name:'Hareket önizlemesi çekmece sol yanı',w:t,h,d,x:-w/2+t/2,y:y+t/2+h/2,z:-d/2-.6},
   {name:'Hareket önizlemesi çekmece sağ yanı',w:t,h,d,x:w/2-t/2,y:y+t/2+h/2,z:-d/2-.6},
   {name:'Hareket önizlemesi çekmece arkası',w:w-2*t,h,d:t,x:0,y:y+t/2+h/2,z:-d-.6+t/2}
  ];
  pieces.forEach(value=>group.add(meshFor({...value,kind:'body',shape:'beveled-panel',bevel:.04,assembly:front.assembly,demoOnly:true},config,'drawer-tray')));
 }
 function apply(amount){
  if(door){if(profile.kind==='drop-door')door.rotation.x=profile.angle*amount;else door.rotation.y=-profile.angle*amount;}
  drawers.forEach((record,index)=>{record.group.position.z=record.z+profile.travel*amount*(drawers.length===1||index===drawers.length-1?1:.48);});
  if(spanGroup)spanGroup.position.x=spanTravel*amount;
  if(liveModel)liveModel.updateMatrixWorld(true);
 }
 function placeCamera(yaw,distance){
  const pitch=.24;liveCamera.position.set(target.x+distance*Math.sin(yaw)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(yaw)*Math.cos(pitch));liveCamera.lookAt(target);liveCamera.updateMatrixWorld(true);
 }
 function fitCamera(){
  if(!envelope||!art)return;
  const w=Math.max(1,art.clientWidth||art.getBoundingClientRect().width||320),h=Math.max(1,art.clientHeight||art.getBoundingClientRect().height||240),mobile=typeof global.matchMedia==='function'&&global.matchMedia('(max-width:740px)').matches;
  // Keep the card-sized drawing buffer bounded, including high-DPI mobiles.
  const ratio=Math.min(Number(global.devicePixelRatio)||1,mobile?1:1.5,700/Math.max(w,h));liveRenderer.setPixelRatio(ratio);liveRenderer.setSize(w,h,false);
  liveCamera.aspect=w/h;liveCamera.updateProjectionMatrix();target=envelope.getCenter(new THREE.Vector3());
  const size=envelope.getSize(new THREE.Vector3());let distance=Math.max(size.x,size.y,size.z,30)*1.9;
  const yaws=profile.kind==='orbit'?[baseYaw-.14,baseYaw+.14]:[baseYaw];
  for(let step=0;step<4;step++){
   let sx=0,sy=0;for(const yaw of yaws){placeCamera(yaw,distance);for(const x of[envelope.min.x,envelope.max.x])for(const y of[envelope.min.y,envelope.max.y])for(const z of[envelope.min.z,envelope.max.z]){const v=new THREE.Vector3(x,y,z).project(liveCamera);sx=Math.max(sx,Math.abs(v.x));sy=Math.max(sy,Math.abs(v.y));}}
   distance*=Math.max(sx/.84,sy/.78);
  }
  liveCamera.userData.motionDistance=distance;placeCamera(baseYaw,distance);A.fitShadow?.(liveKey,envelope);liveRenderer.shadowMap.needsUpdate=true;
 }
 function mount(nextArt,product,channels={}){
  setupLive();unmount();art=nextArt;profile=motionProfile(product);materials=new Map();currentTime=0;
  const d=P.data(product,channels),parts=d.parts.slice();
  if(product.family==='ST'){
   // The supporting 45 cm box is a fixed reference only in this motion demo.
   parts.push(...d.layout.parts.filter(part=>part.assembly==='box-0'),...G.insertParts(d.layout).filter(part=>part.assembly==='box-0'));
   const range=C.spanRange(d.config);spanTravel=Math.max(0,Math.min(profile.travel,range.max-d.layout.spanOffset));
  }
  liveModel=new THREE.Group();partsGroup=new THREE.Group();liveModel.add(partsGroup);liveScene.add(liveModel);
  const records=parts.map(part=>{const role=product.family==='ST'&&part.assembly!=='span'?'reference':profile.kind==='span'?'span':'fixed',mesh=meshFor(part,d.config,role);partsGroup.add(mesh);return{part,mesh};});
  if(profile.kind==='drawer'){
   records.filter(record=>record.part.kind==='front').sort((a,b)=>a.part.y-b.part.y).forEach(record=>{
    const group=new THREE.Group();group.position.copy(record.mesh.position);group.userData.motionRole='drawer';partsGroup.add(group);record.mesh.position.set(0,0,0);record.mesh.userData.motionRole='drawer';group.add(record.mesh);addTray(group,record.part,d.config);drawers.push({group,z:group.position.z});
   });
  }else if(['hinged-door','drop-door','hybrid-door','glass-door'].includes(profile.kind)){
   const moving=records.filter(record=>profile.kind==='glass-door'?record.part.kind==='glass'||record.part.name.startsWith('Cam kapak '):record.part.kind==='front');
   if(moving.length){
    const left=Math.min(...moving.map(record=>record.part.x-record.part.w/2)),right=Math.max(...moving.map(record=>record.part.x+record.part.w/2)),bottom=Math.min(...moving.map(record=>record.part.y-record.part.h/2)),top=Math.max(...moving.map(record=>record.part.y+record.part.h/2)),front=Math.max(...moving.map(record=>record.part.z+record.part.d/2));
    door=new THREE.Group();door.name='Kapak hareket ekseni';door.userData.motionRole='door';door.position.set(profile.kind==='drop-door'?(left+right)/2:left,profile.kind==='drop-door'?bottom:(bottom+top)/2,front);partsGroup.add(door);
    moving.forEach(record=>{record.mesh.position.sub(door.position);record.mesh.userData.motionRole='door';door.add(record.mesh);});
   }
  }else if(profile.kind==='span'){
   spanGroup=new THREE.Group();spanGroup.userData.motionRole='span';partsGroup.add(spanGroup);records.filter(record=>record.part.assembly==='span').forEach(record=>spanGroup.add(record.mesh));
  }
  apply(0);const closedBounds=new THREE.Box3().setFromObject(partsGroup),center=closedBounds.getCenter(new THREE.Vector3());liveModel.position.set(-center.x,-closedBounds.min.y,-center.z);
  envelope=new THREE.Box3();for(const value of[0,.25,.5,.75,1]){apply(value);envelope.union(new THREE.Box3().setFromObject(liveModel));}apply(0);
  const canvas=liveRenderer.domElement;canvas.dataset.motionKind=profile.kind;canvas.dataset.product=product.id;canvas.dataset.duration=String(profile.duration);art.append(canvas);fitCamera();draw(0);return canvas;
 }
 function draw(elapsedMs){
  if(!liveModel||!art)return false;currentTime=Number(elapsedMs)||0;const amount=motionProgress(currentTime);apply(amount);
  if(profile.kind==='orbit')placeCamera(baseYaw+Math.sin(currentTime/profile.duration*Math.PI*2)*.14,liveCamera.userData.motionDistance);
  liveRenderer.domElement.dataset.progress=String(Math.round(amount*1000)/1000);liveRenderer.domElement.dataset.elapsed=String(Math.round(currentTime));
  liveRenderer.shadowMap.needsUpdate=true;liveRenderer.render(liveScene,liveCamera);return true;
 }
 function resize(){if(liveModel){fitCamera();draw(currentTime);}}
 function unmount(){if(liveRenderer)liveRenderer.domElement.remove();clearModel();art=null;profile=null;}
 function dispose(){unmount();if(liveRenderer){A.disposeEnvironment?.(liveRenderer);liveFloor.geometry.dispose();liveFloor.material.dispose();liveKey.shadow.map?.dispose();liveRig?.dispose();liveRig=null;liveRenderer.dispose();liveRenderer.forceContextLoss?.();liveRenderer=null;}disposed=true;}
 return{mount,draw,resize,unmount,dispose};
}

Object.assign(P,{createMotion,motionProfile,motionProgress});
})(window);
