(function(global){
'use strict';
function create(THREE,t,options){
options=options||{};const a=t.appearance||{},group=new THREE.Group();group.name='TV önizlemesi';
const W=t.frameWidth,H=t.frameHeight,D=t.depth,S=t.curveSag||0,curved=t.shape==='curved',segments=curved?64:12,front=D/2-S;
const radius=t.curvatureRadiusCm||420,rawSag=radius-Math.sqrt(Math.max(0,radius*radius-W*W/4));
const curve=x=>S&&rawSag?(radius-Math.sqrt(Math.max(0,radius*radius-x*x)))*S/rawSag:0;
const color=hex=>new THREE.Color(hex).convertSRGBToLinear(),clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const caseColor=a.caseColor||'#111316',trimColor=a.trimColor||'#202327',standColor=a.standColor||'#26292d';
const polymer=()=>new THREE.MeshPhysicalMaterial({color:color(caseColor),roughness:.38,metalness:.04,clearcoat:.14,clearcoatRoughness:.27,envMapIntensity:.7});
const trim=()=>new THREE.MeshPhysicalMaterial({color:color(trimColor),roughness:.29,metalness:.32,clearcoat:.2,clearcoatRoughness:.22,envMapIntensity:.85});
const metal=()=>new THREE.MeshPhysicalMaterial({color:color(standColor),roughness:.28,metalness:.58,clearcoat:.18,clearcoatRoughness:.22,envMapIntensity:.8});
const rubber=()=>new THREE.MeshStandardMaterial({color:color('#111214'),roughness:.84,metalness:0});
function add(geometry,material,name,stand=false){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=stand;mesh.userData={ownMaterial:true,tvPick:true,...(stand?{tvStand:true}:{tvCase:true})};group.add(mesh);return mesh;}
// A subdivided surface follows the cylindrical screen, including its eased corners.
function face(w,h,r,cy,z,back=false){
 r=clamp(r,.001,Math.min(w,h)/3);const ys=[];for(let i=0;i<=4;i++)ys.push(-h/2+r*i/4);ys.push(h/2-r);for(let i=1;i<=4;i++)ys.push(h/2-r+r*i/4);
 const positions=[],uv=[],indices=[],cols=segments;
 for(let row=0;row<ys.length;row++){const y=ys[row],edge=Math.max(0,Math.abs(y)-(h/2-r)),half=w/2-r+Math.sqrt(Math.max(0,r*r-edge*edge));for(let col=0;col<=cols;col++){const x=-half+2*half*col/cols;positions.push(x,y+cy,z+curve(x));uv.push((x+w/2)/w,(y+h/2)/h);}}
 for(let row=1;row<ys.length;row++)for(let col=0;col<cols;col++){const p=(row-1)*(cols+1)+col,q=p+1,u=p+cols+1,v=u+1;indices.push(...(back?[p,u,q,q,u,v]:[p,q,u,q,v,u]));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function loop(w,h,r,cy=0){
 r=clamp(r,.001,Math.min(w,h)/3);const p=[],n=segments,corner=6,push=(x,y)=>p.push([x,y+cy]);
 for(let i=0;i<=n;i++)push(-w/2+r+(w-2*r)*i/n,h/2);
 for(let i=1;i<=corner;i++){const q=Math.PI/2-Math.PI/2*i/corner;push(w/2-r+r*Math.cos(q),h/2-r+r*Math.sin(q));}
 push(w/2,-h/2+r);for(let i=1;i<=corner;i++){const q=-Math.PI/2*i/corner;push(w/2-r+r*Math.cos(q),-h/2+r+r*Math.sin(q));}
 for(let i=1;i<=n;i++)push(w/2-r-(w-2*r)*i/n,-h/2);
 for(let i=1;i<=corner;i++){const q=-Math.PI/2-Math.PI/2*i/corner;push(-w/2+r+r*Math.cos(q),-h/2+r+r*Math.sin(q));}
 push(-w/2,h/2-r);for(let i=1;i<=corner;i++){const q=Math.PI-Math.PI/2*i/corner;push(-w/2+r+r*Math.cos(q),h/2-r+r*Math.sin(q));}
 return p;
}
function skirt(first,last,zFront,zBack){const pos=[],idx=[];first.forEach((p,i)=>{pos.push(p[0],p[1],zFront+curve(p[0]),last[i][0],last[i][1],zBack+curve(last[i][0]));});for(let i=0;i<first.length;i++){const next=(i+1)%first.length,p=i*2,q=next*2;idx.push(p,q,p+1,p+1,q,q+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function body(name,w,h,r,cy,zFront,zBack,backW=w,backH=h,backCy=cy){
 if(name!=='TV ince panel')add(face(w,h,r,cy,zFront),polymer(),name+' ön');add(face(backW,backH,r,backCy,zBack,true),polymer(),name+' arka');add(skirt(loop(w,h,r,cy),loop(backW,backH,r,backCy),zFront,zBack),polymer(),name+' kenar');
}
const outerRadius=clamp(Math.min(W,H)*.005,.16,.38),shellDepth=Math.max(.15,D-S),panelDepth=clamp(a.panelThicknessCm||(a.panelKind==='oled'?.45:.9),.15,Math.min(1.3,shellDepth));
// Thin optical panel and separately moulded rear electronics replace a full-depth slab.
body('TV ince panel',W,H,outerRadius,0,front-.065,front-panelDepth);
if(shellDepth>panelDepth+.08){
 const lower=a.backStyle==='lower-housing'||a.panelKind==='oled'&&a.backStyle!=='uniform',housingH=lower?H*.54:H-.8,housingW=lower?W-.9:W-.65,housingY=lower?-H*.205:-.12;
 body('TV arka elektronik kasası',housingW,housingH,outerRadius+.1,housingY,front-panelDepth+.025,-D/2,Math.max(10,housingW-(lower?.5:a.backStyle==='uniform'?.18:1.3)),Math.max(8,housingH-(lower?.5:a.backStyle==='uniform'?.18:1.2)),housingY-(lower?0:.2));
}
const sw=clamp(t.screenWidth,.1,W-.08),sh=clamp(t.screenHeight,.1,H-.08),screenY=Number.isFinite(t.screenCenterY)?t.screenCenterY:0,glassRadius=Math.min(.19,outerRadius*.6),outer=loop(W,H,outerRadius),inner=loop(sw,sh,glassRadius,screenY);
// A solid, narrow bezel with a shallow return catches light without a wireframe edge.
add(skirt(outer,inner,front,front-.028),trim(),'TV ön çerçeve');
let map=null;const doc=options.document||global.document;
if(doc?.createElement){const canvas=doc.createElement('canvas');canvas.width=768;canvas.height=432;const ctx=canvas.getContext('2d');if(ctx){const gradient=ctx.createLinearGradient(0,0,768,432);gradient.addColorStop(0,'#0b1013');gradient.addColorStop(.55,'#06090c');gradient.addColorStop(1,'#030507');ctx.fillStyle=gradient;ctx.fillRect(0,0,768,432);map=new THREE.CanvasTexture(canvas);map.encoding=THREE.sRGBEncoding;}}
const glass=new THREE.MeshPhysicalMaterial({color:map?0xffffff:color('#080c10'),map,roughness:.13,metalness:0,clearcoat:1,clearcoatRoughness:.10,reflectivity:.52,envMapIntensity:.7,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const screen=add(face(sw,sh,glassRadius,screenY,front-.035),glass,'TV ekran camı');screen.castShadow=false;screen.userData.label=true;screen.userData.ownTexture=!!map;screen.userData.tvScreen=true;
// Tiny sensor and an underside seam remain within the measured case envelope.
const bottomRail=Number.isFinite(t.bezelBottomCm)?t.bezelBottomCm:(H-sh)/2;
if(bottomRail>.25){const sensor=add(new THREE.SphereGeometry(Math.min(.08,bottomRail*.14),8,6),new THREE.MeshStandardMaterial({color:color('#090a0b'),roughness:.18,metalness:.1}),'TV alıcı gözü');sensor.position.set(0,-H/2+bottomRail*.43,front-.09+curve(0));}
const outlineGeo=new THREE.BufferGeometry().setFromPoints(outer.map(p=>new THREE.Vector3(p[0],p[1],front+curve(p[0])))),outline=new THREE.LineLoop(outlineGeo,new THREE.LineBasicMaterial({color:0xb16b47,transparent:true,opacity:.8,depthTest:false}));outline.userData={ownMaterial:true,tvOutline:true};outline.visible=false;group.add(outline);
if(t.mount==='surface'){
 const base=-H/2-t.standLift,fw=t.footWidth,fd=t.footDepth,pad=Math.min(4,fw/5),tip=Math.min(3,fd/5),frontZ=(fd-tip)/2,backZ=-frontZ,footY=base+.16;
 function plate(name,w,d,h,x,y,z,material,r=.16){const g=new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(-w/2+r,-d/2).lineTo(w/2-r,-d/2).quadraticCurveTo(w/2,-d/2,w/2,-d/2+r).lineTo(w/2,d/2-r).quadraticCurveTo(w/2,d/2,w/2-r,d/2).lineTo(-w/2+r,d/2).quadraticCurveTo(-w/2,d/2,-w/2,d/2-r).lineTo(-w/2,-d/2+r).quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2),{depth:h,bevelEnabled:false,curveSegments:4});g.rotateX(-Math.PI/2);g.translate(x,y,z);return add(g,material,name,true);}
 function bearing(x,z,w=pad,d=tip){plate('TV kauçuk temas pedi',w,d,.16,x,base,z,rubber(),Math.min(.12,w/8,d/8));}
 function polygonPlate(name,points,h,y,material){const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:3});g.rotateX(-Math.PI/2);g.translate(0,y,0);return add(g,material,name,true);}
 function beam(name,start,end,w0,w1,th0=.7,th1=.4){
  const s=new THREE.Vector3(...start),e=new THREE.Vector3(...end),dir=e.clone().sub(s).normalize(),u=new THREE.Vector3(1,0,0);u.addScaledVector(dir,-u.dot(dir));if(u.lengthSq()<.01){u.set(0,0,1);u.addScaledVector(dir,-u.dot(dir));}u.normalize();const v=new THREE.Vector3().crossVectors(dir,u).normalize(),points=[];
  for(const [point,w,h]of[[s,w0,th0],[e,w1,th1]])for(const [x,y]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const p=point.clone().addScaledVector(u,x*w/2).addScaledVector(v,y*h/2);points.push(p.x,p.y,p.z);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);const hard=g.toNonIndexed();g.dispose();hard.computeVertexNormals();return add(hard,metal(),name,true);
 }
 const style=a.standStyle||({twin:'twin-v',center:'t-center',pedestal:'plate',arch:'arch'}[t.standType]),footX=(fw-pad)/2,attachZ=Math.min(front-.2,-D*.20),neckBottom=[0,base+.8,-fd*.13],neckTop=[0,-H/2+.65,attachZ];
 if(t.standType==='twin')for(const sign of[-1,1]){
  const x=sign*footX;for(const end of[-1,1])bearing(x,end*frontZ);
  if(style==='twin-blade'||style==='underlay'){plate('TV ince yan ayak',Math.min(2.8,pad*.75),fd-.15,.47,x,footY,0,metal());beam('TV yan ayak boynu',[x,base+.6,-fd*.12],[x,-H/2+.7,attachZ],2.4,2.7,.9,1.2);}
  else for(const end of[-1,1])beam('TV eğimli çift ayak',[x*.96,-H/2+.7,attachZ],[x,base+.36,end*frontZ],2.1,Math.min(2.8,pad*.8),1.1,.38);
 }
 else if(t.standType==='pedestal'){
  if(a.plateShape==='hexagon'||a.plateShape==='wedge'){
   const x=(fw-.1)/2,z=(fd-.1)/2,points=a.plateShape==='hexagon'?[[-x*.76,-z],[x*.76,-z],[x,0],[x*.84,z],[-x*.84,z],[-x,0]]:[[-x*.71,-z],[x*.71,-z],[x,z],[-x,z]];
   polygonPlate('TV şekilli kaide temas tabanı',points.map(p=>p.map(n=>n*.985)),.16,base,rubber());polygonPlate('TV ince şekilli merkez taban',points,.55,footY,metal());
  }else{bearing(0,0,fw,fd);plate('TV ince merkez taban',fw-.1,fd-.1,.55,0,footY,0,metal(),Math.min(.6,fw/10,fd/10));}beam('TV eğimli kaide boynu',neckBottom,neckTop,Math.min(8,fw*.24),Math.min(6,fw*.2),Math.min(2.7,t.standLift*.55),Math.min(2.3,t.standLift*.5));
 }
 else if(t.standType==='center'){
  if(style==='fork'){
   for(const sign of[-1,1]){bearing(sign*footX,frontZ);beam('TV merkez çatal ön kol',[0,base+.65,-fd*.13],[sign*footX,base+.32,frontZ],3.4,Math.min(2.5,pad*.75),.65,.35);}
   bearing(0,backZ);beam('TV merkez çatal arka kol',[0,base+.65,-fd*.13],[0,base+.32,backZ],3.1,Math.min(2.5,pad*.75),.6,.35);
  }else{
   bearing(0,0,pad,fd);bearing(0,frontZ,fw,tip);plate('TV merkez ayak yatay taban',fw-.05,Math.max(.8,tip-.1),.48,0,footY,frontZ,metal());plate('TV merkez ayak boyuna taban',Math.min(pad-.1,3),fd-.05,.48,0,footY,0,metal());
  }
  beam('TV merkez ayak eğimli boyun',neckBottom,neckTop,Math.min(7,fw*.20),Math.min(5,fw*.18),Math.min(2.6,t.standLift*.55),Math.min(2.1,t.standLift*.5));
 }
 else{
  for(const sign of[-1,1]){bearing(sign*footX,0,pad,fd);plate('TV yay ayak ince tabanı',pad-.1,fd-.1,.42,sign*footX,footY,0,metal());}
  const points=[];for(let i=0;i<=28;i++){const x=-footX+2*footX*i/28;points.push([x,fd*.15*(1-Math.pow(x/Math.max(1,footX),2))]);}
  const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p[0],p[1]-.8):shape.moveTo(p[0],p[1]-.8));for(let i=points.length-1;i>=0;i--)shape.lineTo(points[i][0],points[i][1]+.8);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:false,curveSegments:3});g.rotateX(-Math.PI/2);g.translate(0,base+.48,0);add(g,metal(),'TV alçak yay tabanı',true);beam('TV yay ayak eğimli boyun',[0,base+.7,0],neckTop,Math.min(7,fw*.14),Math.min(5,fw*.12),Math.min(2.7,t.standLift*.55),Math.min(2.2,t.standLift*.5));
 }
}
group.userData={tv:true,shape:t.shape,mount:t.mount,standType:t.standType,panelKind:a.panelKind||'led',standStyle:a.standStyle||null};return group;
}
const api={create};global.AdopTVDisplay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
