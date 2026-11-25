// shop-plans engine: renders any plan (window.PLAN) into a 3D viewer, cut lists, checks,
// one-step-per-page instructions with illustrations, and sheet layouts. Needs three.js r128 + OrbitControls.
(function(){
"use strict";
const C=window.ShopCore, PLAN=window.PLAN, $=id=>document.getElementById(id);
const frac=C.frac, f=x=>frac(x), f32=x=>frac(x,32);
const V=(x,y,z)=>new THREE.Vector3(x,z,-y);   // plan inches (x right, y back, z up) -> three.js
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const match=(id,list)=>(list||[]).some(s=>id===s||id.startsWith(s));

// ---------- Tones: one look per kind of part, shared by 3D, illustrations and sheet layouts ----------
const TONES={carcass:0xd9bb8f,top:0xc79f6b,front:0xc49060,metal:0xa7acb2,glass:0x9cc9e6,accent:0x9a5b22};
const mats={};
for(const [k,c] of Object.entries(TONES))mats[k]=k==="glass"
  ?new THREE.MeshStandardMaterial({color:c,transparent:true,opacity:.28,roughness:.1,depthWrite:false})
  :new THREE.MeshStandardMaterial({color:c,roughness:k==="metal"?.35:.8,metalness:k==="metal"?.35:0});
const ghostMat=new THREE.MeshStandardMaterial({color:0xd6cfc2,transparent:true,opacity:.28,depthWrite:false,roughness:.9});
const ghostEdge=new THREE.LineBasicMaterial({color:0x7a7066,transparent:true,opacity:.35});
const hiEdge=new THREE.LineBasicMaterial({color:0x6b3d12});
const edgeMat=new THREE.LineBasicMaterial({color:0x3a2c1c,transparent:true,opacity:.45});

// ---------- Page skeleton ----------
document.title=PLAN.title;
$("title").textContent=PLAN.title;

// Parameters form, grouped.
(function buildForm(){
  const groups={};
  for(const q of PLAN.params)(groups[q.group||"Settings"]||(groups[q.group||"Settings"]=[])).push(q);
  let html="";
  for(const [g,qs] of Object.entries(groups)){
    html+=`<h2>${esc(g)}</h2>`;
    const choice=qs.filter(q=>q.type==="choice"), nums=qs.filter(q=>q.type!=="choice");
    for(const q of choice)html+=`<div class="stock" role="radiogroup" aria-label="${esc(q.label)}">${q.options.map(o=>`<label><input type="radio" name="p_${q.id}" value="${esc(o.value)}" ${o.value===q.value?"checked":""}> ${esc(o.label)}</label>`).join("")}</div>`;
    if(nums.length)html+=`<div class="params">${nums.map(q=>`<label for="p_${q.id}">${esc(q.label)}<input id="p_${q.id}" type="number" step="${q.step||0.0625}" value="${q.value}"></label>`).join("")}</div>`;
  }
  $("params").innerHTML=html+`<div class="dims" id="dims"></div><div id="warns"></div>`;
  $("toggles").innerHTML=(PLAN.toggles||[]).map(t=>`<label><input type="checkbox" id="tg_${t.id}" checked> ${esc(t.label)}</label>`).join("")+`<label>Explode <input type="range" id="explode" min="0" max="1" step="0.01" value="0"></label>`;
})();
function readParams(){
  const p={};
  for(const q of PLAN.params){
    if(q.type==="choice"){const el=document.querySelector(`input[name="p_${q.id}"]:checked`);p[q.id]=el?el.value:q.value}
    else{const v=parseFloat($("p_"+q.id).value);p[q.id]=isFinite(v)?v:q.value}
  }
  return p;
}

// ---------- 3D viewer ----------
const stage=$("stage");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));stage.prepend(renderer.domElement);
const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(35,1,1,2000);
const ctl=new THREE.OrbitControls(cam,renderer.domElement);ctl.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x8a7a66,0.85));
const sun=new THREE.DirectionalLight(0xffffff,0.65);sun.position.set(-30,60,50);scene.add(sun);
const grid=new THREE.GridHelper(200,40,0x9a9080,0xb8b0a0);grid.material.opacity=.35;grid.material.transparent=true;scene.add(grid);
let group=new THREE.Group(), meshes=[], framed=false;scene.add(group);
function addBox(parent,b,mat,edge){
  const g=new THREE.BoxGeometry(b[3],b[5],b[4]), m=new THREE.Mesh(g,mat);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g),edge));
  m.position.copy(V(b[0]+b[3]/2,b[1]+b[4]/2,b[2]+b[5]/2));parent.add(m);return m;
}
function render3d(model){
  scene.remove(group);group=new THREE.Group();meshes=[];
  for(const p of model.parts){const m=addBox(group,p.box,mats[p.tone]||mats.carcass,edgeMat);
    m.userData={base:m.position.clone(),ex:V(...(p.explode||[0,0,0]).map(v=>v*6)),toggle:p.toggle};meshes.push(m)}
  scene.add(group);
  if(!framed){const b=new THREE.Box3().setFromObject(group),c=b.getCenter(new THREE.Vector3()),r=b.getBoundingSphere(new THREE.Sphere()).radius;
    ctl.target.copy(c);cam.position.copy(c).add(new THREE.Vector3(-0.9*r,0.7*r,1.5*r));framed=true}
  applyView();
}
function applyView(){
  const e=+$("explode").value;
  for(const m of meshes){m.position.copy(m.userData.base).addScaledVector(m.userData.ex,e);
    if(m.userData.toggle){const t=$("tg_"+m.userData.toggle);m.visible=!t||t.checked}}
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);
(function loop(){ctl.update();renderer.render(scene,cam);requestAnimationFrame(loop)})();

// ---------- Cut lists ----------
function renderCutLists(model){
  let html="";
  for(const [m,mat] of Object.entries(PLAN.materials)){
    const rows=C.cutRows(model,m);if(!rows.length)continue;
    const grouped=rows.some(r=>r.qty>1);
    html+=`<section class="cutlist"><h2>Cut list · ${esc(mat.name)}</h2><div class="tbl"><table><thead><tr><th>Part</th><th>Qty</th><th>T</th><th>W</th><th>L</th>${grouped?"<th>Labels</th>":""}</tr></thead><tbody>${
      rows.map(r=>`<tr><td>${esc(r.name)}${r.note?" *":""}</td><td class="n">${r.qty}</td><td class="n">${frac(r.dims[0],32)}</td><td class="n">${f(r.dims[1])}</td><td class="n">${f(r.dims[2])}</td>${grouped?`<td class="lb">${r.qty>1?esc(r.labels.join(", ")):""}</td>`:""}</tr>`).join("")
    }</tbody></table></div>${PLAN.notes&&PLAN.notes[m]?`<p class="note">${PLAN.notes[m](model)}</p>`:""}</section>`;
  }
  $("cutlists").innerHTML=html;
}

// ---------- Checks ----------
function renderChecks(model){
  const kerf=model.p[PLAN.kerfParam]||0.125;
  const list=[...C.genericChecks(PLAN,model,kerf),...(PLAN.checks?PLAN.checks(model):[])];
  const bad=list.filter(c=>!c.ok).length;
  $("checks").innerHTML=`<h2>Checks · ${bad?`${bad} failing`:"all pass"}</h2><ul class="checklist">${list.map(c=>`<li class="${c.ok?"ok":"bad"}"><span class="ck">${c.ok?"✓":"✗"}</span><span>${esc(c.name)}</span><span class="cd">${esc(c.detail||"")}</span></li>`).join("")}</ul>`;
}

// ---------- Instructions: one step per page ----------
let curStep=0, showAll=false, wired=false;
function renderSteps(model){
  const steps=PLAN.steps(model,{f,f32});
  const P=Object.fromEntries(model.parts.map(q=>[q.id,q]));
  const sz=id=>{const q=P[id];if(!q)return"";const d=C.cutDims(q);return `${frac(d[0],32)} × ${f(d[1])} × ${f(d[2])}`};
  const need=st=>{
    let h="";
    if(st.need&&st.need.length)h+=`<div><h4>Parts</h4><ul class="need-parts">${st.need.map(it=>{
      if(it.labels)return `<li><span class="lab">×${it.labels.length}</span><span class="dm">${sz(it.labels[0])}</span><span class="grp">${esc(it.labels.join(" · "))}</span></li>`;
      const [lab,note]=Array.isArray(it)?it:[it,""];
      return `<li><span class="lab">${esc(lab)}</span><span class="dm">${sz(lab)}</span>${note?`<span class="nt">${esc(note)}</span>`:""}</li>`}).join("")}</ul></div>`;
    if(st.hw&&st.hw.length)h+=`<div><h4>Hardware</h4><ul class="need-hw">${st.hw.map(([qy,it])=>`<li><span class="qty">${qy==="—"?"":/^\d+$/.test(qy)?"×"+qy:qy}</span><span>${esc(it)}</span></li>`).join("")}</ul></div>`;
    if(st.tools&&st.tools.length)h+=`<div><h4>Tools</h4><ul class="need-tools">${st.tools.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`;
    return h;
  };
  const total=steps.length;
  const cards=steps.map((st,i)=>`<article class="stepcard" id="step-${i}" data-i="${i}" aria-label="Step ${i}: ${esc(st.title)}">
  <header class="sc-head"><span class="sc-num">${i}</span><div class="sc-titles"><span class="sc-eyebrow">Step ${i} of ${total-1}</span><h3>${esc(st.title)}</h3></div></header>
  <div class="sc-body${st.fig?"":" sc-body--plain"}">
    <aside class="sc-need">${need(st)}</aside>
    ${st.fig?`<figure class="sc-fig"><img data-step="${i}" alt="${esc(st.fig.cap||st.title)}"><figcaption>${esc(st.fig.cap||"")}</figcaption></figure>`:""}
  </div>
  <ol class="sc-acts">${st.acts.map(a=>`<li><span>${a}</span></li>`).join("")}</ol>
</article>`).join("");
  $("assembly").innerHTML=`<div class="stepper" id="stepper"><nav class="stepnav" aria-label="Steps">
    <button type="button" class="sn-btn" id="snPrev" aria-label="Previous step">←</button>
    <div class="sn-dots">${steps.map((st,i)=>`<button type="button" class="sn-dot" data-i="${i}" aria-label="Step ${i}: ${esc(st.title)}">${i}</button>`).join("")}</div>
    <button type="button" class="sn-btn" id="snNext" aria-label="Next step">→</button>
    <button type="button" class="sn-all" id="snAll" aria-pressed="false">All steps</button></nav>${cards}</div>`;
  wireStepper(total);
  queueIllustrations(model,steps);
}
function wireStepper(total){
  const root=$("stepper");
  if(!wired){const m=/^#step-(\d+)$/.exec(location.hash||"");if(m)curStep=+m[1];wired=true}
  const go=i=>{curStep=Math.max(0,Math.min(total-1,i));
    root.querySelectorAll(".stepcard").forEach(c=>c.classList.toggle("on",+c.dataset.i===curStep));
    root.querySelectorAll(".sn-dot").forEach(b=>{const on=+b.dataset.i===curStep;b.classList.toggle("on",on);b.setAttribute("aria-current",on?"step":"false")});
    $("snPrev").disabled=curStep===0;$("snNext").disabled=curStep===total-1};
  root.classList.toggle("all",showAll);$("snAll").setAttribute("aria-pressed",String(showAll));
  root.querySelectorAll(".sn-dot").forEach(b=>b.onclick=()=>go(+b.dataset.i));
  $("snPrev").onclick=()=>go(curStep-1);$("snNext").onclick=()=>go(curStep+1);
  $("snAll").onclick=()=>{showAll=!showAll;root.classList.toggle("all",showAll);$("snAll").setAttribute("aria-pressed",String(showAll))};
  go(curStep);
}
document.addEventListener("keydown",e=>{
  if(e.target.closest&&e.target.closest("input,textarea,select")||showAll)return;
  if(e.key==="ArrowRight"&&$("snNext"))$("snNext").click();
  if(e.key==="ArrowLeft"&&$("snPrev"))$("snPrev").click();
});
addEventListener("hashchange",()=>{const m=/^#step-(\d+)$/.exec(location.hash);if(m){const b=document.querySelector(`.sn-dot[data-i="${m[1]}"]`);if(b)b.click()}});

// ---------- Illustrations ----------
// Each figure is drawn from the model: new parts in full color, earlier parts as ghosts,
// IDs in the white space with hairline leaders. Labels are never printed on the parts.
const IW=1440, IH=780;
const VIEWS={front:[-0.5,-1,0.75],back:[0.55,1,0.65],box:[-0.8,-1,0.9],tank:[-0.45,-1,0.6],bench:[-0.3,-1,1.25],top:[-0.2,-0.6,1.6]};
let illR=null, illT=null, CALL=[], FL=[];
function queueIllustrations(model,steps){clearTimeout(illT);illT=setTimeout(()=>renderIllustrations(model,steps),250)}
function fitCamera(sc,cam,dir,pad){
  const box=new THREE.Box3();sc.traverse(o=>{if(o.isMesh)box.expandByObject(o)});
  const c=box.getCenter(new THREE.Vector3()), r=box.getBoundingSphere(new THREE.Sphere()).radius, u=dir.clone().normalize(), pts=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])pts.push(new THREE.Vector3(x,y,z));
  let lo=r*0.3,hi=r*8,dist=hi;
  for(let i=0;i<30;i++){const m=(lo+hi)/2;cam.position.copy(c).addScaledVector(u,m);cam.lookAt(c);cam.near=m/50;cam.far=m*4;cam.updateProjectionMatrix();cam.updateMatrixWorld();
    const ext=Math.max(...pts.map(p=>{const v=p.clone().project(cam);return Math.max(Math.abs(v.x),Math.abs(v.y))}));
    if(ext>0.88/pad)lo=m;else{hi=m;dist=m}}
  cam.position.copy(c).addScaledVector(u,dist);cam.lookAt(c);cam.near=dist/50;cam.far=dist*4;cam.updateProjectionMatrix();
}
// Pick a visible point on each labeled part (raycast past anything opaque in front of it).
function partAnchors(cam,sc){
  const opaque=[];sc.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o)});
  const ray=new THREE.Raycaster();
  const seen=(m,w)=>{const dir=w.clone().sub(cam.position),d=dir.length();ray.set(cam.position,dir.normalize());ray.far=d+0.01;
    const hit=ray.intersectObjects(opaque,false)[0];return !hit||hit.object===m||hit.distance>d-0.05};
  for(const L of FL){
    const m=L.mesh, pr=m.geometry.parameters, half=[pr.width/2,pr.height/2,pr.depth/2];
    let best=null;
    for(let ax=0;ax<3;ax++)for(const sg of [1,-1]){
      const n=new THREE.Vector3();n.setComponent(ax,sg);
      const cL=n.clone().multiplyScalar(half[ax]), cW=m.localToWorld(cL.clone()), nW=m.localToWorld(cL.clone().add(n)).sub(cW);
      if(nW.dot(cam.position.clone().sub(cW))<=0)continue;
      const others=[0,1,2].filter(i=>i!==ax);
      const sp=v=>{const q=v.clone().project(cam);return new THREE.Vector2(q.x,q.y)};
      const cs=[[1,1],[1,-1],[-1,-1],[-1,1]].map(([a,b])=>{const v=cL.clone();v.setComponent(others[0],half[others[0]]*a);v.setComponent(others[1],half[others[1]]*b);return sp(m.localToWorld(v))});
      let area=0;for(let i=0;i<4;i++){const p=cs[i],q=cs[(i+1)%4];area+=p.x*q.y-q.x*p.y}area=Math.abs(area);
      if(!best||area>best.area)best={area,cL,others};
    }
    let anchor=m.localToWorld(new THREE.Vector3());
    if(best)for(const [a,b] of [[0,0],[.3,.3],[-.3,-.3],[.3,-.3],[-.3,.3],[.42,0],[-.42,0],[0,.42],[0,-.42]]){
      const v=best.cL.clone();v.setComponent(best.others[0],v.getComponent(best.others[0])+a*half[best.others[0]]*2);v.setComponent(best.others[1],v.getComponent(best.others[1])+b*half[best.others[1]]*2);
      const w=m.localToWorld(v);if(seen(m,w)){anchor=w;break}}
    const [t,...rest]=L.text.split(" · ");CALL.push({world:anchor,t,sub:rest.join(" · ")});
  }
}
function drawCallouts(sc,cam){
  const c=document.createElement("canvas");c.width=IW;c.height=IH;const g=c.getContext("2d"),u=IW/960;
  g.drawImage(illR.domElement,0,0);
  partAnchors(cam,sc);
  const box=new THREE.Box3();sc.traverse(o=>{if(o.isMesh)box.expandByObject(o)});
  let minX=IW,maxX=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).project(cam),sx=(v.x+1)/2*IW;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx)}
  const tf=`500 ${Math.round(25*u)}px "Source Sans 3",system-ui,sans-serif`, sf=`400 ${Math.round(19*u)}px "IBM Plex Mono",ui-monospace,monospace`;
  const items=CALL.map(k=>{const v=(k.world?k.world.clone():k.obj.localToWorld(k.p.clone())).project(cam);
    const sx=(v.x+1)/2*IW,sy=(1-v.y)/2*IH;g.font=tf;let w=g.measureText(k.t).width;if(k.sub){g.font=sf;w=Math.max(w,g.measureText(k.sub).width)}
    return {...k,sx,sy,w,h:(k.sub?56:32)*u}});
  const mid=(minX+maxX)/2;
  for(const side of ["L","R"]){
    const list=items.filter(i=>(i.sx<mid)===(side==="L")).sort((a,b)=>a.sy-b.sy);
    const gap=12*u,top=22*u,bot=IH-22*u;let y=top;
    for(const i of list){i.ly=Math.max(i.sy-i.h/2,y);y=i.ly+i.h+gap}
    const over=y-gap-bot;if(over>0)for(const i of list)i.ly-=over;
    for(const i of list){
      const colX=side==="L"?Math.max(minX-34*u,i.w+18*u):Math.min(maxX+34*u,IW-i.w-18*u);
      const elbowX=side==="L"?colX+26*u:colX-26*u, ty=i.ly+15*u;
      g.strokeStyle="#22211d";g.lineWidth=1*u;g.beginPath();g.moveTo(i.sx,i.sy);g.lineTo(elbowX,ty);g.lineTo(side==="L"?colX+6*u:colX-6*u,ty);g.stroke();
      g.fillStyle="#22211d";g.beginPath();g.arc(i.sx,i.sy,2.6*u,0,Math.PI*2);g.fill();
      g.textAlign=side==="L"?"right":"left";g.textBaseline="middle";
      g.font=tf;g.fillStyle="#1b1a17";g.fillText(i.t,colX,ty);
      if(i.sub){g.font=sf;g.fillStyle="#5e5a52";g.fillText(i.sub,colX,ty+26*u)}
    }
  }
  return c.toDataURL("image/png");
}
function renderIllustrations(model,steps){
  const imgs=[...document.querySelectorAll("img[data-step]")];if(!imgs.length)return;
  if(!illR){illR=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});illR.setPixelRatio(1);illR.setSize(IW,IH,false);illR.setClearColor(0xffffff,1)}
  const P=Object.fromEntries(model.parts.map(q=>[q.id,q]));
  for(const img of imgs){
    const fig=steps[+img.dataset.step].fig;if(!fig)continue;
    CALL=[];FL=[];
    const sc=new THREE.Scene(), root=new THREE.Group();sc.add(root);
    sc.add(new THREE.HemisphereLight(0xffffff,0x8a7a66,.9));const s=new THREE.DirectionalLight(0xffffff,.6);s.position.set(-30,60,50);sc.add(s);
    const cam=new THREE.PerspectiveCamera(32,IW/IH,1,1000);
    const list=fig.parts?fig.parts.map(q=>({...q,hi:true}))
      :model.parts.filter(q=>(fig.show?match(q.id,fig.show):true)&&!match(q.id,fig.hide)).map(q=>({...q,hi:match(q.id,fig.hi)}));
    for(const q of list){
      const ex=(fig.explode||{})[q.id]||[0,0,0], b=[q.box[0]+ex[0],q.box[1]+ex[1],q.box[2]+ex[2],q.box[3],q.box[4],q.box[5]];
      const mesh=addBox(root,b,q.hi?(mats[q.tone]||mats.carcass):(q.tone==="glass"?mats.glass:ghostMat),q.hi?hiEdge:ghostEdge);
      if((fig.labels||[]).includes(q.id))FL.push({mesh,text:q.label||q.id});
    }
    for(const x of fig.extra||[])addBox(root,x.box,new THREE.MeshBasicMaterial({color:TONES[x.tone]||TONES.accent}),hiEdge);
    for(const n of fig.notes||[]){
      let at=n.at;
      if(n.on&&P[n.on]){const b=P[n.on].box,fr=n.frac||[.5,.5,.5],sh=n.shift||[0,0,0];at=[b[0]+b[3]*fr[0]+sh[0],b[1]+b[4]*fr[1]+sh[1],b[2]+b[5]*fr[2]+sh[2]]}
      const [t,...rest]=n.text.split(" · ");CALL.push({obj:root,p:V(...at),t,sub:rest.join(" · ")});
    }
    if(fig.flip){const b=new THREE.Box3().setFromObject(root),c=b.getCenter(new THREE.Vector3()),pv=new THREE.Group();pv.position.copy(c);sc.add(pv);root.position.sub(c);pv.add(root);pv.rotation.z=Math.PI}
    sc.updateMatrixWorld(true);
    const dir=Array.isArray(fig.view)?fig.view:VIEWS[fig.view||"front"];
    fitCamera(sc,cam,V(...dir),fig.pad||(fig.labels||fig.notes?1.5:1.1));
    sc.updateMatrixWorld(true);illR.render(sc,cam);
    img.src=drawCallouts(sc,cam);
    sc.traverse(o=>{if(o.geometry)o.geometry.dispose()});
  }
}

// ---------- Sheet layouts ----------
function sheetSVG(label,W,H,res){
  const m=3.2, vb=`${-m} ${-m} ${W+m+2} ${H+m+0.6}`, fs=W>60?1.5:1.1;
  let out="";
  res.sheets.forEach((sh,si)=>{
    let g=`<svg class="sheet-svg" viewBox="${vb}" role="img" aria-label="${esc(label)} sheet ${si+1} layout"><defs><pattern id="waste" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="sv-waste-bg" width="2" height="2"/><line class="sv-hatch" x1="0" y1="0" x2="0" y2="2"/></pattern></defs><rect class="sv-sheet" x="0" y="0" width="${W}" height="${H}"/>`;
    for(let x=0;x<=W;x+=12)g+=`<line class="sv-tick" x1="${x}" y1="-1" x2="${x}" y2="0"/><text class="sv-ruler" x="${x}" y="-1.5" text-anchor="middle" style="font-size:${fs}px">${x}</text>`;
    for(let y=0;y<=H;y+=12)g+=`<line class="sv-tick" x1="-1" y1="${y}" x2="0" y2="${y}"/><text class="sv-ruler" x="-1.4" y="${y+fs*0.35}" text-anchor="end" style="font-size:${fs}px">${y}</text>`;
    for(const p of sh.placed){
      g+=`<rect class="sv-part sv-${p.tone}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/>`;
      const vert=p.h>p.w,long=Math.max(p.w,p.h),short=Math.min(p.w,p.h),fz=Math.min(W>60?1.9:1.5,short*0.24,long/9),cx=p.x+p.w/2,cy=p.y+p.h/2;
      const tr=vert?` transform="rotate(-90 ${cx} ${cy})"`:"", dims=`${f(p.dw).replace(/"/g,"")} × ${f(p.dl).replace(/"/g,"")}`;
      if(short>=fz*2.6)g+=`<text class="sv-name" x="${cx}" y="${cy-fz*0.15}" text-anchor="middle" style="font-size:${fz}px"${tr}>${esc(p.name)}</text><text class="sv-dim" x="${cx}" y="${cy+fz*1.05}" text-anchor="middle" style="font-size:${fz*0.85}px"${tr}>${dims}</text>`;
      else g+=`<text class="sv-name" x="${cx}" y="${cy+fz*0.35}" text-anchor="middle" style="font-size:${fz}px"${tr}>${esc(p.name)} · ${dims}</text>`;
    }
    const used=sh.placed.reduce((a,p)=>a+p.w*p.h,0);
    out+=`<figure><figcaption><span>${esc(label)}${res.sheets.length>1?` · sheet ${si+1} of ${res.sheets.length}`:""}</span><span>${Math.round(100*used/(W*H))}% used</span></figcaption>${g}</svg></figure>`;
  });
  if(res.unplaced.length)out+=`<p class="warn">Too big for this sheet: ${esc(res.unplaced.map(p=>p.name).join(", "))}.</p>`;
  return out;
}
function renderSheets(model){
  const L=C.sheetLayouts(PLAN,model,model.p[PLAN.kerfParam]||0.125);
  const tones=new Set();
  let html="";
  for(const [m,{sheet,result}] of Object.entries(L)){
    result.sheets.forEach(s=>s.placed.forEach(p=>tones.add(p.tone)));
    html+=`<div class="sheetgroup${sheet.w>60||result.sheets.length>1?" wide":""}">${sheetSVG(`${PLAN.materials[m].name} · ${sheet.name}`,sheet.w,sheet.h,result)}</div>`;
  }
  const names={carcass:"Carcass and box parts",top:"Top layers and bottoms",front:"Fronts (grain runs the long way)"};
  $("legend").innerHTML=[...tones].map(t=>`<span><i class="sw sv-${t}"></i>${names[t]||t}</span>`).join("")+`<span><i class="sw sw-off"></i>Offcut</span>`;
  $("sheetlist").innerHTML=html;
  $("sheetnote").innerHTML=PLAN.notes&&PLAN.notes.sheets?PLAN.notes.sheets(model):"";
}

// ---------- Update ----------
function update(){
  const model=PLAN.model(readParams());
  for(const q of PLAN.params)if(q.derivedWhen){const el=$("p_"+q.id),on=q.derivedWhen(model.p);el.disabled=on;if(on)el.value=+model.p[q.id].toFixed(4)}
  $("sub").textContent=model.summary[0].replace(/^Overall\s+/,"");
  $("dims").innerHTML=model.summary.map(s=>`<span>${esc(s)}</span>`).join("");
  $("warns").innerHTML=(model.warnings||[]).map(w=>`<p class="warn">${esc(w)}</p>`).join("");
  render3d(model);renderCutLists(model);renderChecks(model);renderSteps(model);renderSheets(model);
  window.SHOP_MODEL=model;
}
document.addEventListener("input",e=>{if(e.target.closest("#params"))update();if(e.target.closest("#toggles"))applyView()});
document.addEventListener("change",e=>{if(e.target.closest("#params"))update()});

// Print: copy the 3D view into an <img>, because WebGL canvases often print blank.
function snapshot(){if(!renderer.domElement.width||!stage.clientWidth)return;try{renderer.render(scene,cam);$("snap").src=renderer.domElement.toDataURL("image/png")}catch(e){}}
addEventListener("beforeprint",snapshot);
let snapT;const queueSnap=()=>{clearTimeout(snapT);snapT=setTimeout(snapshot,400)};
ctl.addEventListener("end",queueSnap);document.addEventListener("change",queueSnap);
update();resize();queueSnap();
})();
