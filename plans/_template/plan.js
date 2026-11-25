// Template plan: a plywood bench (top, two legs, a stretcher). Copy this folder to start a new plan.
// Format reference: docs/PLAN-FORMAT.md. Units: inches. Axes: x = length, y = depth (front 0 to back), z = up.
(function(root){
"use strict";
const PLAN={
  id:"plywood-bench",
  title:"Plywood Bench",
  kerfParam:"kf",
  params:[
    {id:"L",label:"Length",value:42,step:0.25,group:"Size (inches)"},
    {id:"D",label:"Depth",value:14,step:0.25,group:"Size (inches)"},
    {id:"H",label:"Height",value:18,step:0.25,group:"Size (inches)"},
    {id:"inset",label:"Leg inset from ends",value:3,step:0.25,group:"Size (inches)"},
    {id:"kf",label:"Saw kerf",value:0.125,step:0.03125,group:"Stock"},
    {id:"t",label:'¾" ply, measured',value:0.75,step:0.001,group:"Stock"},
  ],
  materials:{ply34:{name:'¾" plywood',thick:p=>p.t,sheet:()=>({name:"4×8",w:96,h:48})}},
  toggles:[],

  model(p){
    const T=p.t, legH=p.H-T, sh=4;   // stretcher height
    const parts=[];
    const cut=(id,box,x={})=>parts.push({id,role:"cut",material:"ply34",box,tone:"carcass",...x});
    cut("Top",[0,0,legH,p.L,p.D,T],{tone:"top",explode:[0,0,1]});
    cut("Leg L",[p.inset,0,0,T,p.D,legH],{explode:[-1,0,0]});
    cut("Leg R",[p.L-p.inset-T,0,0,T,p.D,legH],{explode:[1,0,0]});
    cut("Stretcher",[p.inset+T,p.D/2-T/2,legH-sh,p.L-2*p.inset-2*T,T,sh],{explode:[0,0,-1]});
    const f=ShopCore.frac;
    return {p,parts,dims:{T,legH,sh},summary:[`Overall ${f(p.L)} L × ${f(p.D)} D × ${f(p.H)} H`],warnings:p.inset<2?["Legs this close to the ends make the top easy to tip."]:[]};
  },

  checks(m){
    const P=Object.fromEntries(m.parts.map(q=>[q.id,q]));
    const span=P["Leg R"].box[0]-(P["Leg L"].box[0]+m.dims.T);
    return [{name:"Top span between legs ≤ 36\"",ok:span<=36,detail:`${span.toFixed(2)}" unsupported span`}];
  },

  notes:{ply34:()=>"T × W × L. Thickness is what you entered as measured.",sheets:()=>"Gaps between parts are the saw kerf."},

  steps(m,h){
    const f=h.f, d=m.dims;
    return [
      {title:"Before you start",hw:[["≈16",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Saw","Drill / driver","Countersink bit","2 bar clamps"],
        acts:[`Measure the plywood. Enter its thickness above if it is not ¾".`,`Cut every part and label it in pencil.`]},
      {title:"Stretcher between the legs",need:["Leg L","Leg R","Stretcher"],hw:[["4",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","Clamps"],
        fig:{show:["Leg","Stretcher"],hi:["Stretcher"],labels:["Leg L","Leg R","Stretcher"],explode:{"Stretcher":[0,0,-3]},cap:"Stretcher centered, flush with the leg tops"},
        acts:[`Glue the <b>Stretcher</b> between the legs, centered front to back, its top flush with the leg tops.`,`Screw through each leg into the stretcher ends.`]},
      {title:"Top",need:["Top"],hw:[["≈12",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","Square"],
        fig:{hi:["Top"],labels:["Top"],explode:{"Top":[0,0,3]},cap:"Top overhangs the legs equally at both ends"},
        acts:[`Set the <b>Top</b> on, overhanging each leg by <b>${f(m.p.inset)}</b>.`,`Glue and screw down into the leg edges and the stretcher.`]},
    ];
  },
  sweep:{L:[36,42],D:[12,14],t:[0.75,0.71875]},
};
if(typeof module!=="undefined"&&module.exports)module.exports=PLAN; else root.PLAN=PLAN;
})(typeof window!=="undefined"?window:globalThis);
