// shop-plans core: pure functions shared by the browser engine and the node tools.
// No DOM, no three.js. Units are inches.
(function(root){
"use strict";

// Inches to a shop fraction: 1/16 by default, 1/32 only where asked.
function frac(x,den=16){
  const neg=x<0; x=Math.abs(x);
  const s=Math.round(x*den); const w=Math.floor(s/den); let r=s%den,d=den;
  while(r&&r%2===0){r/=2;d/=2}
  const t=r?(w?`${w} ${r}/${d}"`:`${r}/${d}"`):`${w}"`;
  return neg?"-"+t:t;
}

// Part box: [x,y,z,dx,dy,dz]. x = length (left to right), y = depth (front to back), z = up.
const lo=p=>[p.box[0],p.box[1],p.box[2]], hi=p=>[p.box[0]+p.box[3],p.box[1]+p.box[4],p.box[2]+p.box[5]];

// Cut size of a part: sorted [T, W, L], plus any deliberate allowance (cut tall, trim later).
function cutDims(part){
  const d=[part.box[3],part.box[4],part.box[5]].sort((a,b)=>a-b);
  if(part.cutAdd)for(let i=0;i<3;i++)d[i]+=part.cutAdd[i]||0;
  return d;
}

// Cut-list rows for one material. Parts with the same group collapse to one row with a quantity.
function cutRows(model,material){
  const rows=[], byGroup={};
  for(const p of model.parts){
    if(p.role!=="cut"||p.material!==material)continue;
    const d=cutDims(p);
    if(p.group){
      const g=byGroup[p.group]||(byGroup[p.group]={name:p.group,qty:0,dims:d,labels:[],note:p.cutNote||""});
      g.qty++;g.labels.push(p.id);
      if(!g.added){rows.push(g);g.added=true}
    } else rows.push({name:p.id,qty:1,dims:d,labels:[p.id],note:p.cutNote||""});
  }
  return rows;
}

// Guillotine sheet packer with saw kerf. Every cut runs edge to edge of the piece it splits,
// so the layout can be made on a table saw or with a track saw.
function packSheets(parts,W,H,kerf){
  const sorts=[(a,b)=>b.w*b.h-a.w*a.h,(a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h),(a,b)=>b.w-a.w,(a,b)=>b.h-a.h,(a,b)=>Math.min(b.w,b.h)-Math.min(a.w,a.h)];
  const fits=[(f,w,h)=>f.w*f.h-w*h,(f,w,h)=>Math.min(f.w-w,f.h-h),(f,w,h)=>Math.max(f.w-w,f.h-h),(f)=>f.y*1000+f.x];
  const splits=["short","long","horiz","vert"];
  function attempt(order,fit,split){
    const sheets=[],unplaced=[];
    const newSheet=()=>{const s={free:[{x:0,y:0,w:W,h:H}],placed:[]};sheets.push(s);return s};
    for(const p of order){
      if((p.w>W||p.h>H)&&(p.grain||p.h>W||p.w>H)){unplaced.push(p);continue}
      let ok=false;
      for(let pass=0;pass<2&&!ok;pass++){
        const cands=pass===0?sheets:[newSheet()];let best=null;
        for(const s of cands)s.free.forEach((f,i)=>{
          const opts=p.grain?[[p.w,p.h,false]]:[[p.w,p.h,false],[p.h,p.w,true]];
          for(const [w,h,rot] of opts)if(w<=f.w+1e-9&&h<=f.h+1e-9){const sc=fit(f,w,h);if(!best||sc<best.sc)best={s,i,f,w,h,rot,sc}}
        });
        if(best){
          const {s,i,f,w,h,rot}=best;s.placed.push({...p,x:f.x,y:f.y,w,h,rot});s.free.splice(i,1);
          const rw=f.w-w-kerf,bh=f.h-h-kerf;
          const horiz=split==="horiz"?true:split==="vert"?false:split==="short"?!(rw<bh):(rw<bh);
          const add=r=>{if(r.w>0.01&&r.h>0.01)s.free.push(r)};
          if(horiz){add({x:f.x,y:f.y+h+kerf,w:f.w,h:bh});add({x:f.x+w+kerf,y:f.y,w:rw,h})}
          else{add({x:f.x+w+kerf,y:f.y,w:rw,h:f.h});add({x:f.x,y:f.y+h+kerf,w,h:bh})}
          ok=true;
        } else if(pass===1){sheets.pop();unplaced.push(p);ok=true}
      }
    }
    return {sheets,unplaced};
  }
  let best=null;
  for(const so of sorts)for(const fi of fits)for(const sp of splits){
    const r=attempt([...parts].sort(so),fi,sp), last=r.sheets[r.sheets.length-1];
    const off=last?Math.max(0,...last.free.map(f=>f.w*f.h)):0, key=[r.unplaced.length,r.sheets.length,-off];
    if(!best||key[0]<best.key[0]||(key[0]===best.key[0]&&(key[1]<best.key[1]||(key[1]===best.key[1]&&key[2]<best.key[2]))))best={...r,key};
  }
  return best;
}

// Lay out every material on its sheet. Returns {material: {sheet, result}}.
function sheetLayouts(plan,model,kerf){
  const out={};
  for(const [m,mat] of Object.entries(plan.materials)){
    const parts=model.parts.filter(p=>p.role==="cut"&&p.material===m).map(p=>{const d=cutDims(p);return {name:p.id,w:d[2],h:d[1],grain:!!p.grain,tone:p.tone||"carcass",dl:d[2],dw:d[1]}});
    if(!parts.length)continue;
    const sheet=mat.sheet(model.p);
    out[m]={sheet,result:packSheets(parts,sheet.w,sheet.h,kerf)};
  }
  return out;
}

// Generic checks every plan gets: no two solid parts overlap, every part fits its sheet.
function genericChecks(plan,model,kerf){
  const E=1e-6, res=[];
  const solid=model.parts.filter(p=>p.role!=="ref"&&!p.nests);   // nests: sits in a groove or dado inside its neighbours on purpose
  const bad=[];
  for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){
    const a=solid[i],b=solid[j],A0=lo(a),A1=hi(a),B0=lo(b),B1=hi(b);
    const o=[0,1,2].map(k=>Math.min(A1[k],B1[k])-Math.max(A0[k],B0[k]));
    if(o.every(v=>v>E))bad.push(`${a.id} / ${b.id}`);
  }
  res.push({name:"No parts overlap",ok:!bad.length,detail:bad.length?bad.join("; "):`${solid.length} parts checked`});
  const L=sheetLayouts(plan,model,kerf);
  for(const [m,{sheet,result}] of Object.entries(L)){
    res.push({name:`All ${plan.materials[m].name} parts fit`,ok:!result.unplaced.length,
      detail:result.unplaced.length?`Too big: ${result.unplaced.map(p=>p.name).join(", ")}`:`${result.sheets.length} × ${sheet.name}`});
  }
  return res;
}

const api={frac,cutDims,cutRows,packSheets,sheetLayouts,genericChecks,lo,hi};
if(typeof module!=="undefined"&&module.exports)module.exports=api; else root.ShopCore=api;
})(typeof window!=="undefined"?window:globalThis);
