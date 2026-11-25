// Run every check across the plan's parameter sweep. Exit code 1 on any failure.
// Usage: node tools/verify.mjs plans/<id>
import { createRequire } from "node:module"; import path from "node:path";
const require=createRequire(import.meta.url);
const dir=process.argv[2]; if(!dir){console.error("usage: node tools/verify.mjs plans/<id>");process.exit(1)}
const core=require("../engine/core.js"); globalThis.ShopCore=core;
const plan=require(path.resolve(dir,"plan.js"));
const base=Object.fromEntries(plan.params.map(q=>[q.id,q.value]));
const sweep=plan.sweep||{};
let combos=[{}];
for(const [k,vals] of Object.entries(sweep))combos=combos.flatMap(c=>vals.map(v=>({...c,[k]:v})));
let fails=0;
for(const c of combos){
  const p={...base,...c}, m=plan.model(p), kerf=p[plan.kerfParam]||0.125;
  const res=[...core.genericChecks(plan,m,kerf),...(plan.checks?plan.checks(m):[])];
  let steps=[];try{steps=plan.steps(m,{f:x=>core.frac(x),f32:x=>core.frac(x,32)})}catch(e){res.push({name:"Steps build",ok:false,detail:e.message})}
  // Every part a step asks for must exist in the model.
  const ids=new Set(m.parts.map(q=>q.id));
  for(const st of steps)for(const it of st.need||[]){for(const id of it.labels||[Array.isArray(it)?it[0]:it])if(!ids.has(id))res.push({name:`Step "${st.title}" part`,ok:false,detail:`${id} not in model`})}
  const bad=res.filter(r=>!r.ok);fails+=bad.length;
  const tag=Object.entries(c).map(([k,v])=>`${k}=${v}`).join(" ");
  console.log(`${bad.length?"FAIL":"ok  "} ${tag||"defaults"}  (${res.length} checks, ${steps.length} steps)`);
  for(const b of bad)console.log(`     ✗ ${b.name}: ${b.detail}`);
}
console.log(fails?`\n${fails} failing checks`:`\nAll ${combos.length} combinations pass`);
process.exit(fails?1:0);
