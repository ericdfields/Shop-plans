// Tank riser: an open two-bay cabinet that lifts the drawer platform (plans/aquarium-platform)
// and its 55-gallon tank to standard stand height. Walls sit directly under the platform's walls.
// Plan format: docs/PLAN-FORMAT.md. Units: inches. Axes: x = length, y = depth (front 0 to back), z = up.
(function(root){
"use strict";

const TANK={l:48.25,w:12.75,h:21};
const CLEAT=1.5;          // cleat height under the top at each end
const LOAD=650+80;        // filled 55-gallon tank plus the drawer platform, lb (approximate)

const PLAN={
  id:"tank-riser",
  title:"Tank Riser Cabinet",
  kerfParam:"kf",

  params:[
    {id:"target",label:"Tank bottom height",value:30,step:0.25,group:"Height (inches)"},
    {id:"pL",label:"Platform length",value:49.5,step:0.0625,group:"Drawer platform (as built)"},
    {id:"pD",label:"Platform depth",value:17.75,step:0.0625,group:"Drawer platform (as built)"},
    {id:"pH",label:"Platform height",value:8.75,step:0.0625,group:"Drawer platform (as built)"},
    {id:"pT",label:"Platform plywood",value:0.75,step:0.001,group:"Drawer platform (as built)"},
    {id:"mode",label:"Plywood stock",type:"choice",value:"4x8",group:"Plywood stock",
      options:[{value:"4x8",label:"One 4×8 sheet"},{value:"4x4",label:"4×4 sheets (needs three)"}]},
    {id:"kf",label:"Saw kerf",value:0.125,step:0.03125,group:"Plywood stock"},
    {id:"t34",label:'¾" ply, measured',value:0.75,step:0.001,group:"Plywood stock"},
  ],

  materials:{
    ply34:{name:'¾" plywood',thick:p=>p.t34,sheet:p=>p.mode==="4x4"?{name:"4×4",w:48,h:48}:{name:"4×8",w:96,h:48}},
  },

  toggles:[{id:"platform",label:"Drawer platform"},{id:"tank",label:"Tank"}],

  model(p){
    const T=p.t34, L=p.pL, D=p.pD, Hr=p.target-p.pH;
    // Parts between the ends must fit the sheet. With thin plywood on 4×4 sheets the riser
    // comes out a hair shorter than the platform; it stays centered under it.
    const core=Math.min(L-2*T,p.mode==="4x4"?48:96), x0=(L-(core+2*T))/2, Lr=core+2*T;
    const parts=[];
    const cut=(id,box,x={})=>parts.push({id,role:"cut",material:"ply34",box,tone:"carcass",...x});
    // Ends run floor to top surface, so the platform's end caps bear straight on their edges.
    // Cut ⅛" tall and trimmed flush after glue-up: an end even 1/32" proud would rock the platform.
    const tall=Hr>D?[0,0,0.125]:[0,0.125,0], tallNote='Cut ⅛" taller than the riser. Trim flush after glue-up.';
    cut("Riser end L",[x0,0,0,T,D,Hr],{explode:[-1,0,0],cutAdd:tall,cutNote:tallNote});
    cut("Riser end R",[x0+Lr-T,0,0,T,D,Hr],{explode:[1,0,0],cutAdd:tall,cutNote:tallNote});
    // Back runs floor to under the top, between the ends, under the platform's back.
    cut("Riser back",[x0+T,D-T,0,core,T,Hr-T],{explode:[0,1,0]});
    cut("Riser bottom",[x0+T,0,0,core,D-T,T],{explode:[0,0,-1]});
    // Divider centered under the platform's divider.
    cut("Riser divider",[L/2-T/2,0,T,T,D-T,Hr-2*T]);
    cut("Riser top",[x0+T,0,Hr-T,core,D,T],{tone:"top",explode:[0,0,1]});
    // Cleats carry the top under the platform's end panels, which sit just inside the caps.
    cut("Cleat L",[x0+T,0,Hr-T-CLEAT,T,D-T,CLEAT],{explode:[-1,0,0]});
    cut("Cleat R",[x0+Lr-2*T,0,Hr-T-CLEAT,T,D-T,CLEAT],{explode:[1,0,0]});
    // The drawer platform and tank, for position and checks only.
    parts.push({id:"Drawer platform",role:"ref",box:[0,0,Hr,L,D,p.pH],tone:"front",toggle:"platform",explode:[0,0,2]});
    parts.push({id:"Tank",role:"ref",box:[(L-TANK.l)/2,D-TANK.w,Hr+p.pH,TANK.l,TANK.w,TANK.h],tone:"glass",toggle:"tank",explode:[0,0,3]});
    const f=ShopCore.frac, bay=(core-T)/2;
    return {p,parts,dims:{T,L,D,Hr,bay,openH:Hr-2*T,core,x0,Lr},
      summary:[`Riser ${f(Lr)} L × ${f(D)} D × ${f(Hr)} H`,`Bays    ${f(bay)} W × ${f(Hr-2*T)} H × ${f(D-T)} D (×2)`,`Tank bottom ${f(p.target)} above the floor · top of tank ${f(p.target+TANK.h)}`],
      warnings:[`A filled tank on a riser is top-heavy. Strap the riser to a wall stud.`,`About ${LOAD} lb sits on ${(L*D/144).toFixed(1)} sq ft. Where you can, set it against an outside wall and run its length across the floor joists.`]};
  },

  checks(m){
    const P=Object.fromEntries(m.parts.map(q=>[q.id,q])), d=m.dims, p=m.p, T=d.T, E=1e-6, out=[];
    const x1=q=>q.box[0]+q.box[3], z1=q=>q.box[2]+q.box[5];
    const cover=(a0,a1,b0,b1)=>Math.max(0,Math.min(a1,b1)-Math.max(a0,b0))/(b1-b0);
    // The platform (4×4 build): end caps on the outer ¾", end panels on the next ¾", divider centered, back on the rear ¾".
    const dv=P["Riser divider"];
    out.push({name:"Divider under the platform's divider",ok:Math.abs((dv.box[0]+T/2)-d.L/2)<E,detail:`riser divider center ${(dv.box[0]+T/2).toFixed(3)}, platform center ${(d.L/2).toFixed(3)}`});
    out.push({name:"Back under the platform's back",ok:cover(P["Riser back"].box[1],d.D,d.D-p.pT,d.D)>=0.9,detail:`riser back at ${P["Riser back"].box[1].toFixed(3)}–${d.D.toFixed(3)}`});
    // The platform's end caps fill its outer pT at each end, its end panels the next pT.
    // Each must sit at least 90% on the riser part below it.
    const pT=p.pT;
    const eL=P["Riser end L"], eR=P["Riser end R"], cL=P["Cleat L"], cR=P["Cleat R"];
    const caps=[cover(eL.box[0],x1(eL),0,pT),cover(eR.box[0],x1(eR),d.L-pT,d.L)];
    const pans=[cover(cL.box[0],x1(cL),pT,2*pT),cover(cR.box[0],x1(cR),d.L-2*pT,d.L-pT)];
    out.push({name:"Ends under the platform's end caps",ok:caps.every(c=>c>=0.9),detail:`${caps.map(c=>Math.round(c*100)+"%").join(" / ")} of each cap on a riser end`});
    out.push({name:"Cleats under the platform's end panels",ok:pans.every(c=>c>=0.9),detail:`${pans.map(c=>Math.round(c*100)+"%").join(" / ")} of each end panel on a cleat`});
    for(const id of ["Riser end L","Riser end R"])out.push({name:`${id} flush with the top`,ok:Math.abs(z1(P[id])-z1(P["Riser top"]))<E,detail:`${z1(P[id]).toFixed(3)} vs ${z1(P["Riser top"]).toFixed(3)}`});
    for(const id of ["Riser end L","Riser end R","Riser back"])out.push({name:`${id} reaches the floor`,ok:P[id].box[2]===0,detail:"load path to the floor"});
    out.push({name:"Riser footprint matches the platform",ok:Math.abs(d.Lr-d.L)<=0.0625+E&&P["Riser top"].box[4]===d.D,detail:`${d.Lr.toFixed(3)} × ${d.D} under ${d.L} × ${d.D}`});
    out.push({name:"Height is reachable",ok:d.Hr>=12&&p.target<=36,detail:`riser ${d.Hr.toFixed(2)}", tank bottom ${p.target}"`});
    return out;
  },

  notes:{
    ply34:()=>`T × W × L. Thickness is what you entered as measured. * Ends are cut ⅛" tall and trimmed flush after glue-up. Ends and back reach the floor. The top sits between the ends, on the cleats, the divider and the back. Platform sizes assume the two-4×4 build of the drawer platform; the stock choice here is for the riser's own plywood.`,
    sheets:()=>"Gaps between parts are the saw kerf. Every cut runs fully across the piece it splits. Rip the long strips first, then crosscut.",
  },

  steps(m,h){
    const d=m.dims, p=m.p, T=d.T, f=h.f, f32=h.f32;
    const P=Object.fromEntries(m.parts.map(q=>[q.id,q]));
    const S=[];
    S.push({title:"Before you start",
      hw:[["≈20",'#8 × 2" screws'],["≈36",'#8 × 1⅝" screws'],["≈14",'#8 × 1¼" screws'],["2",'Anti-tip straps'],["2",'#10 × 3" structural screws (into studs)'],["—","Glue, wood filler, ¾\" iron-on edge banding, polyurethane, composite shims"]],
      tools:["Saw, 60T+ plywood blade","Drill / driver","#8 countersink bit (⅛\" pilot) with stop collar","4 bar clamps 24\"+","2 clamps 54\"+","Framing square","Block plane","Straightedge","4' level","Household iron","Sander 120/180/220","Stud finder"],
      acts:[
        `Measure the drawer platform as built and enter its length, depth, height and plywood thickness above. The riser matches its footprint.`,
        `Set the tank bottom height. The riser height follows: <b>${f(d.Hr)}</b> for a tank bottom at ${f(p.target)}.`,
        `Measure the riser plywood. If it is not ¾", enter what you measured.`,
        `Cut every part and label it in pencil. Mark the front edge of each part. The ends are cut ⅛" tall on purpose.`]});
    S.push({title:"Band and seal",need:["Riser end L","Riser end R","Riser top","Riser bottom","Riser divider","Cleat L","Cleat R"],hw:[["—",'¾" iron-on edge banding'],["—","Polyurethane"]],tools:["Household iron","Edge-banding trimmer or block plane","Sander 120/180/220"],
      acts:[
        `Do this now, while every part lies flat. Banding inside the bays after assembly is awkward.`,
        `Iron banding onto the front edge of the top, the bottom, the divider, both ends and both cleats. Trim it flush.`,
        `Seal the faces that will be hard to reach or sit on the floor: the bottom's underside, the bottom edges of the ends and the back, and the top's upper face. Two coats.`,
        `Keep glue areas bare: mask the edges and faces that get glued in later steps.`]});
    const benchEnd=(id,x0)=>({id,tone:"carcass",box:[x0,0,0,d.D,d.Hr,T]});
    const benchCleat=(id,x0)=>({id,tone:"top",box:[x0,d.Hr-T-CLEAT,T,d.D-T,CLEAT,T]});
    S.push({title:"Cleats onto the ends",need:["Riser end L","Riser end R","Cleat L","Cleat R"],hw:[["8",'#8 × 1¼" screws'],["—","Glue"]],tools:["Countersink bit","Combination square","Spring clamps"],
      fig:{parts:[benchEnd("Riser end L",0),benchCleat("Cleat L",0),benchEnd("Riser end R",d.D+6),benchCleat("Cleat R",d.D+6)],labels:["Riser end L","Cleat L","Riser end R","Cleat R"],view:"bench",
        notes:[{text:"Front edge",at:[0,d.Hr*0.4,T/2]},{text:"Top edge",at:[d.D+6+d.D*0.5,d.Hr,T/2]}],cap:"Ends flat, inside face up. Cleats one top thickness below the top edge."},
      acts:[`Lay both ends flat, inside face up, mirror images of each other. Remember each end is ⅛" tall at the top edge.`,
        `Glue each cleat on, its top edge <b>${f(T+0.125)}</b> below the end's top edge, its front flush with the front edge. It stops ${f(T)} short of the back edge, for the back.`,
        `Screw through the cleat into the end with four 1¼" screws. Glue is the joint; the screws only clamp it.`]});
    S.push({title:"Divider onto the bottom",need:["Riser bottom","Riser divider"],hw:[["≈5",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","Framing square"],
      fig:{show:["Riser bottom","Riser divider"],hi:["Riser divider"],flip:true,labels:["Riser bottom","Riser divider"],explode:{"Riser bottom":[0,0,-3]},cap:"Upside down: divider standing, bottom on top"},
      acts:[`Mark the centerline on the inside face of <b>Riser bottom</b>: <b>${f(d.core/2)}</b> from either end.`,
        `Drill ⅛" pilots along the line, about every 4". Start 1" from the front. Turn the bottom over and countersink.`,
        `Stand the divider on its top edge. Glue its bottom edge, lower the bottom on, front edges flush, and screw down.`,
        `Check the divider is square to the bottom.`]});
    S.push({title:"Back",need:["Riser back"],hw:[["≈10",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit with stop collar","Framing square"],
      fig:{show:["Riser bottom","Riser divider","Riser back"],hi:["Riser back"],flip:true,view:"back",labels:["Riser back"],cap:"Back behind the bottom and the divider"},
      acts:[`With the assembly still upside down, glue <b>Riser back</b> behind the bottom and the divider. Its long edge sits flush with the bottom's underside.`,
        `Screw through the back into the bottom's back edge, about every 6", and into the divider's back edge with three screws. Center each pilot on the edge: it lands only ${f(T/2)} from the face.`]});
    S.push({title:"Top",need:["Riser top"],hw:[["≈10",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","Framing square"],
      fig:{show:["Riser bottom","Riser divider","Riser back","Riser top"],hi:["Riser top"],labels:["Riser top"],explode:{"Riser top":[0,0,3]},cap:"Top on the divider and the back"},
      acts:[`Turn the assembly upright. Glue the top edges of the divider and the back.`,
        `Set <b>Riser top</b> on, flush with the bottom at the ends and the front, and flush with the back's outer face.`,
        `Screw down into the divider and the back. Sink every head just below the surface, so the platform sits flat.`]});
    S.push({title:"Ends",need:[["Riser end L","cleat on, step 2"],["Riser end R","cleat on, step 2"]],hw:[["≈20",'#8 × 2" screws'],["6",'#8 × 1⅝" screws'],["—","Glue, wood filler"]],tools:["Countersink bit","2 clamps 54\"+","Framing square","Block plane","Straightedge"],
      fig:{hi:["Riser end","Cleat"],hide:["Drawer platform","Tank"],labels:["Riser end L","Riser end R"],explode:{"Riser end L":[-5,0,0],"Riser end R":[5,0,0],"Cleat L":[-5,0,0],"Cleat R":[5,0,0]},cap:"The top drops onto the cleats"},
      acts:[`Glue the ends of the top, bottom and back, and the top edge of each cleat. Set each end on, its cleat tucked under the top, front edges flush. The end stands ⅛" above the top.`,
        `Clamp across the full length with the 54" clamps. Check the front face for square before the glue sets.`,
        `Screw through each end into the edges of the top, the bottom and the back with 2" screws, about every 6". Countersink and fill.`,
        `Drive three 1⅝" screws down through the top into each cleat, <b>${f(T+3/8)}</b> in from the end's outer face. Sink the heads.`,
        `When the glue is dry, plane the top edge of each end <b>flush</b> with the top. Check with a straightedge across the joint. An end even 1/32" proud rocks the platform.`]});
    S.push({title:"Platform onto the riser",need:[],hw:[["6",'#8 × 1¼" screws'],["2","Anti-tip straps"],["2",'#10 × 3" structural screws'],["—","Composite shims"]],tools:["4' level","Drill / driver","Stud finder"],
      fig:{hi:["Drawer platform"],hide:["Tank"],explode:{"Drawer platform":[0,0,4]},labels:["Drawer platform"],cap:"Platform flush with the riser on all four sides"},
      acts:[`Finish the riser like the platform and let it cure. If there is a baseboard, cut it out behind the riser or keep the riser off the wall by its thickness. Never notch the riser: its ends and back carry the load.`,
        `Level end to end and front to back. Shim under the ends, the back, and under the bottom along the divider and the front, so the bottom bears on the floor under the divider.`,
        `Strap the riser back, near the top at each end, to a wall stud with a 3" structural screw.`,
        `Take the drawers out. Lift the platform on, flush on all sides: caps on the riser ends, end panels over the cleats, divider over divider, back over back. In each platform bay, drive three 1¼" screws down into the riser top, 2" from the walls.`,
        `Put the drawers back. Set the tank on. Fill one-third, check level, then fill.`]});
    return S;
  },

  sweep:{target:[28,30,32],mode:["4x4","4x8"],t34:[0.75,0.71875]},
};
if(typeof module!=="undefined"&&module.exports)module.exports=PLAN; else root.PLAN=PLAN;
})(typeof window!=="undefined"?window:globalThis);
