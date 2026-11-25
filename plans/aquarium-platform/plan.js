// 55-gallon aquarium platform: low carcass, two drawer bays, optional end caps.
// Plan format: see docs/PLAN-FORMAT.md. Units: inches. Axes: x = length, y = depth (front 0 to back), z = up.
(function(root){
"use strict";

const TANK={l:48.25,w:12.75,h:21};          // standard 55-gallon outside size
const CAP_TRIM=0.125;                        // end caps cut tall, trimmed flush after glue-up
const GAP=0.125;                             // reveal between drawer fronts and at the caps
const SLIDE_EXTRA=0.0625;                    // slide makers: ½" +1/32" per side, so the box is 1 1/16" narrower than the bay
const PULL={l:7.875,w:1.614,t:0.1};          // 200 mm L-profile edge pull: 41 mm leg on the top edge

const PLAN={
  id:"aquarium-platform",
  title:"55-Gallon Tank Platform",
  kerfParam:"kf",

  params:[
    {id:"mode",label:"Plywood stock",type:"choice",value:"4x4",group:"Plywood stock",
      options:[{value:"4x4",label:"Two 4×4 sheets"},{value:"4x8",label:"One 4×8 sheet"}]},
    {id:"w",label:"Box width",value:22,step:0.0625,group:"Drawer size (inches)",derivedWhen:p=>p.mode==="4x4"},
    {id:"d",label:"Box depth",value:16,step:0.0625,group:"Drawer size (inches)"},
    {id:"h",label:"Box height",value:6,step:0.0625,group:"Drawer size (inches)"},
    {id:"g",label:"Slide gap / side",value:0.5,step:0.0625,group:"Drawer size (inches)"},
    {id:"kf",label:"Saw kerf",value:0.125,step:0.03125,group:"Drawer size (inches)"},
    {id:"t34",label:'¾" ply, measured',value:0.75,step:0.001,group:"Drawer size (inches)"},
    {id:"t12",label:'½" ply, measured',value:0.5,step:0.001,group:"Drawer size (inches)"},
  ],

  materials:{
    ply34:{name:'¾" plywood',short:"¾\"",thick:p=>p.t34,sheet:p=>p.mode==="4x4"?{name:"4×4",w:48,h:48}:{name:"4×8",w:96,h:48}},
    ply12:{name:'½" plywood',short:"½\"",thick:p=>p.t12,sheet:()=>({name:"2×4",w:48,h:24})},
    ply14:{name:'¼" plywood',short:"¼\"",thick:()=>0.25,sheet:()=>({name:"2×4",w:48,h:24})},
  },

  toggles:[{id:"tank",label:"Tank"},{id:"drawers",label:"Drawers"}],

  model(p0){
    const p={...p0}, T=p.t34, T12=p.t12;
    const openH=p.h+0.5, dep=p.d+1, pd=dep-T, z1=T+openH, z2=z1+T, H=z2+T;
    const is44=p.mode==="4x4";
    let bay,len,core,o,widened=false;
    if(is44){core=48;o=T;bay=(core-3*T)/2;len=core+2*T;p.w=bay-2*p.g-SLIDE_EXTRA}
    else{bay=p.w+2*p.g+SLIDE_EXTRA;core=Math.max(2*bay+3*T,TANK.l);if(2*bay+3*T<TANK.l){bay=(core-3*T)/2;widened=true;p.w=bay-2*p.g-SLIDE_EXTRA}len=core;o=0}
    const parts=[];
    const cut=(id,material,box,x={})=>parts.push({id,role:"cut",material,box,tone:"carcass",...x});
    const hw=(id,box,x={})=>parts.push({id,role:"hardware",box,tone:"metal",...x});
    const half=is44?(core-GAP)/2:core/2;
    cut("Bottom","ply34",[o,0,0,core,dep,T],{explode:[0,0,-1]});
    cut("End panel L","ply34",[o,0,T,T,pd,openH],{explode:[-1,0,0]});
    cut("Divider","ply34",[o+T+bay,0,T,T,pd,openH]);
    cut("End panel R","ply34",[o+core-T,0,T,T,pd,openH],{explode:[1,0,0]});
    cut("Back","ply34",[o,pd,T,core,T,openH],{explode:[0,1,0]});
    cut("Top lower L","ply34",[o,0,z1,half,dep,T],{tone:"top",explode:[-.3,0,1]});
    cut("Top lower R","ply34",[o+core-half,0,z1,half,dep,T],{tone:"top",explode:[.3,0,1]});
    cut("Top upper","ply34",[o,0,z2,core,dep,T],{tone:"top",explode:[0,0,2]});
    if(is44){
      const note='Cut ⅛" taller than the platform. Trim flush after assembly.';
      cut("End cap L","ply34",[0,-T,0,T,dep+T,H],{cutAdd:[0,CAP_TRIM,0],cutNote:note,explode:[-2,0,0]});
      cut("End cap R","ply34",[o+core,-T,0,T,dep+T,H],{cutAdd:[0,CAP_TRIM,0],cutNote:note,explode:[2,0,0]});
    }
    const fl=is44?(core-3*GAP)/2:(core-GAP)/2, fx0=is44?o+GAP:0;
    cut("Front L","ply34",[fx0,-T,T/2,fl,T,openH+T],{tone:"front",grain:true,toggle:"drawers",explode:[0,-1.4,0]});
    cut("Front R","ply34",[fx0+fl+GAP,-T,T/2,fl,T,openH+T],{tone:"front",grain:true,toggle:"drawers",explode:[0,-1.4,0]});
    // Drawer boxes: sides full depth, front and back between them, bottom floating in a ¼" groove.
    const bw=p.w-2*T12+0.375, bd=p.d-2*T12+0.375, z0=T+0.25;
    [[1,o+T],[2,o+2*T+bay]].forEach(([i,wall])=>{
      const x0=wall+p.g+SLIDE_EXTRA/2, ex={toggle:"drawers",explode:[0,-1.4,0]};
      const box=(id,mat,b,grp)=>cut(id,mat,b,{...ex,group:grp,tone:mat==="ply14"?"top":"carcass"});
      box(`D${i} side L`,"ply12",[x0,0,z0,T12,p.d,p.h],"Sides");
      box(`D${i} side R`,"ply12",[x0+p.w-T12,0,z0,T12,p.d,p.h],"Sides");
      box(`D${i} front`,"ply12",[x0+T12,0,z0,p.w-2*T12,T12,p.h],"Fronts and backs");
      box(`D${i} back`,"ply12",[x0+T12,p.d-T12,z0,p.w-2*T12,T12,p.h],"Fronts and backs");
      box(`D${i} bottom`,"ply14",[x0+(p.w-bw)/2,(p.d-bd)/2,z0+0.25,bw,bd,0.25],"Bottoms");
      parts[parts.length-1].nests=true;   // sits in the groove, inside the sides: skip the overlap check
      const sz=z0+p.h/2-0.885;
      hw(`Slide D${i} L`,[wall,0,sz,x0-wall,p.d,1.77],ex);
      hw(`Slide D${i} R`,[x0+p.w,0,sz,wall+bay-(x0+p.w),p.d,1.77],ex);
    });
    // Top lip: brings the top surface forward, flush with the caps and drawer fronts,
    // stopping ⅛" above the pulls so the drawers open under it.
    const lipZ=T/2+openH+T+PULL.t+GAP;
    cut("Top lip","ply34",[o,-T,lipZ,core,T,H-lipZ],{tone:"top",explode:[0,-1,1]});
    for(const f of ["Front L","Front R"]){const b=parts.find(q=>q.id===f).box;
      hw("Pull "+f.slice(-1),[b[0]+b[3]/2-PULL.l/2,-PULL.w,b[2]+b[5],PULL.l,PULL.w,PULL.t],{toggle:"drawers",explode:[0,-1.4,0]})}
    parts.push({id:"Tank",role:"ref",box:[(len-TANK.l)/2,dep-TANK.w,H,TANK.l,TANK.w,TANK.h],tone:"glass",toggle:"tank",explode:[0,0,3.2]});
    const f=ShopCore.frac;
    return {p,parts,
      dims:{len,dep:is44?dep+T:dep,H,bay,openH,core,o,T,T12,is44},
      summary:[`Overall ${f(len)} L × ${f(is44?dep+T:dep)} D × ${f(H)} H`,`Bay     ${f(bay,32)} W × ${f(openH)} H (×2)`,`Box     ${f(p.w,32)} W × ${f(p.d)} D × ${f(p.h)} H`],
      warnings:is44?[`Box width is set by the 48" core. Measure each panel before you buy: some 4×4 panels are only 47¾", and the 48" parts will not fit.`]
        :widened?[`The platform must be at least as long as the tank, so the bays were widened and each box grew to ${f(p.w,32)}.`]:[]};
  },

  // Plan-specific checks. Engine adds: no overlaps, every part fits its sheet.
  checks(m){
    const P=Object.fromEntries(m.parts.map(q=>[q.id,q])), d=m.dims, p=m.p, E=1e-6, out=[];
    const x1=q=>q.box[0]+q.box[3], z1=q=>q.box[2]+q.box[5];
    for(const i of [1,2]){
      const sl=P[`D${i} side L`], sr=P[`D${i} side R`], wl=i===1?P["End panel L"]:P["Divider"], wr=i===1?P["Divider"]:P["End panel R"];
      const gl=sl.box[0]-x1(wl), gr=wr.box[0]-x1(sr), want=p.g+SLIDE_EXTRA/2;
      out.push({name:`Drawer ${i} slide space`,ok:Math.abs(gl-want)<1e-3&&Math.abs(gr-want)<1e-3,detail:`${gl.toFixed(4)}" / ${gr.toFixed(4)}" per side`});
      const above=P["Top lower L"].box[2]-z1(sl), below=sl.box[2]-z1(P.Bottom);
      out.push({name:`Drawer ${i} clears top and bottom`,ok:above>=0.25-E&&below>=0.25-E,detail:`${above.toFixed(3)}" above, ${below.toFixed(3)}" below`});
      out.push({name:`Drawer ${i} fits the bay depth`,ok:p.d<=P["End panel L"].box[4]+E,detail:`${p.d}" slide in a ${P["End panel L"].box[4]}" deep bay`});
    }
    const lL=P["Top lower L"], lR=P["Top lower R"], dv=P.Divider;
    out.push({name:"Top seam sits over the divider",ok:x1(lL)>=dv.box[0]-E&&lR.box[0]<=x1(dv)+E,detail:`seam ${x1(lL).toFixed(3)}–${lR.box[0].toFixed(3)}, divider ${dv.box[0].toFixed(3)}–${x1(dv).toFixed(3)}`});
    const tk=P.Tank, up=P["Top upper"];
    let s0=up.box[0], s1=x1(up);
    if(P["End cap L"]){for(const c of ["End cap L","End cap R"]){const q=P[c];if(Math.abs(z1(q)-d.H)>E)out.push({name:`${c} flush with the top`,ok:false,detail:`${z1(q)} vs ${d.H}`});s0=Math.min(s0,q.box[0]);s1=Math.max(s1,x1(q))}}
    out.push({name:"Tank fully supported",ok:tk.box[0]>=s0-E&&x1(tk)<=s1+E,detail:`tank ${tk.box[0].toFixed(3)}–${x1(tk).toFixed(3)} on ${s0.toFixed(3)}–${s1.toFixed(3)}`});
    if(P["End cap L"]){const fl=P["Front L"],fr=P["Front R"];
      const g1=fl.box[0]-x1(P["End cap L"]), g2=P["End cap R"].box[0]-x1(fr);
      out.push({name:"Fronts clear the end caps",ok:g1>=0.1&&g2>=0.1,detail:`${g1.toFixed(3)}" / ${g2.toFixed(3)}"`});}
    return out;
  },

  notes:{
    ply34:m=>`T × W × L. Thickness is what you entered as measured.${m.dims.is44?' * End caps are cut ⅛" taller than the platform. Trim them flush after assembly.':""} The lower top layer is two halves that meet over the divider.`,
    ply12:()=>`Fronts and backs fit between the sides.`,
    ply14:()=>`Bottoms float in a ¼" × ¼" groove, ¼" up from the bottom edge, with 1/16" play on each edge.`,
    sheets:m=>(m.dims.is44?"End caps cover the ends of the top layers, the end panels and the bottom, so the tank load at each end goes straight to the floor. ":"")+"Gaps between parts are the saw kerf. Every cut runs fully across the piece it splits, so you can make it on a table saw or with a track saw. Rip the long strips first, then crosscut.",
  },

  // Steps: one page each. need = part IDs (or [id, note], or {labels:[...]}) · hw = [qty, item] · fig = illustration spec.
  steps(m,h){
    const d=m.dims, p=m.p, T=d.T, is44=d.is44, f=h.f, f32=h.f32;
    const P=Object.fromEntries(m.parts.map(q=>[q.id,q]));
    const halfL=P["Top lower L"].box[3], seamGap=d.core-2*halfL, slideLine=0.25+p.h/2;
    const ep=P["End panel L"], dv=P.Divider, epR=P["End panel R"], tl=P["Top lower L"];
    const walls=["End panel","Divider","Slide"];
    const S=[];
    S.push({title:"Before you start",
      hw:[["2 pr",`${f(p.d)} side-mount slides, ½" per side, 75 lb+`],["2","Aluminum L-profile edge pulls, 200 mm"],["≈15",'#8 × 2½" screws'],["≈30",'#8 × 1⅝" screws'],["≈30",'#8 × 1¼" screws'],["8",'#6 × 1" screws'],["≈50",'18 ga × 1¼" brads'],["—","Glue, polyurethane, composite shims, double-sided tape"]],
      tools:["Saw, 60T+ plywood blade","Drill / driver","#8 countersink bit (⅛\" pilot)",'3/32" bit',is44?"Right-angle attachment":null,"Router: "+(is44?"flush-trim + ":"")+'¼" straight',"18 ga brad nailer","4 bar clamps 24\"+","2 clamps 36\"+","Spring clamps","≈50 lb weights","Calipers, squares, 4' level, 48\" straightedge",'⅛" shims ×4, ⅜" spacers ×2',"Sander 120/180/220","Glasses, ear and dust protection"].filter(Boolean),
      acts:[
        `Measure both plywood thicknesses with calipers. If either differs from ¾" or ½", enter what you measured above. Bay widths, drawer boxes and platform height all follow from it.`,
        is44?`Measure both 4×4 panels. Each must be a full 48" × 48". Some sold as 4×4 are 47¾", and the 48" parts will not fit.`:`Check the 4×8 sheet is a full 48" × 96".`,
        `Read the slide instructions. They must ask for ½" per side. If they ask for something else, enter it as the slide gap above.`,
        `Lay out every cut part. Check each label against the parts list on each page. Mark the front edge of the bottom, the walls and the top layers.`]});
    S.push({title:"Laminate the top",need:["Top upper","Top lower L","Top lower R"],hw:[["≈16",'#8 × 1¼" screws'],["—","Glue"]],tools:["Countersink bit","Clamps","Weights"],
      fig:{show:["Top"],hi:["Top lower"],labels:["Top upper","Top lower L","Top lower R"],flip:true,explode:{"Top lower L":[0,0,-3],"Top lower R":[0,0,-3]},
        notes:[{text:"Seam over center",at:[tl.box[0]+tl.box[3],tl.box[4]*0.5,tl.box[2]-3]}],cap:"Upper top face down. Lower halves glued and screwed onto it."},
      acts:[
        `Lay <b>Top upper</b> on a flat bench, good face down, front edge toward you. Upside down like this, its left end is on your right. So <b>Top lower L</b> goes on the right and <b>Top lower R</b> on the left.`,
        `Spread glue. Set both lower halves on it, flush at the ends, front and back. The seam sits at <b>${f(d.core/2)}</b> from either end${seamGap>0.01?`, with a ${f(seamGap)} gap`:""}.`,
        `Screw down through the halves with 1¼" screws, about every 6" and 1" from the edges. Longer screws come out through the good face.`,
        `Clamp the edges and set the weights on. Let it cure while you do steps 2 to 4.`]});
    const len=ep.box[4], wid=ep.box[5], gx=5;
    const bench=["End panel L","Divider","End panel R"].map((n,i)=>({id:n,label:n==="Divider"?"Divider · slides on both faces":n,tone:"carcass",box:[i*(len+gx),0,0,len,wid,T]}));
    const benchSlides=[0,1,2].map(i=>({id:"slide"+i,tone:"metal",box:[i*(len+gx),slideLine-0.885,T,p.d,1.77,0.25]}));
    S.push({title:"Slides onto the walls",need:["End panel L","End panel R","Divider"],hw:[["4","Slide cabinet members (2 pairs, separated)"],["—","Slide screws, from the slide box"]],tools:['3/32" bit',"Combination square"],
      fig:{parts:[...bench,...benchSlides],labels:bench.map(b=>b.id),view:"bench",
        notes:[{text:"Slide",at:[2*(len+gx)+p.d*0.7,slideLine,T+0.25]},{text:"Front edge",at:[0,wid*0.5,T/2]},{text:"Bottom edge",at:[len*0.35,0,T/2]}],cap:`Cabinet members centered ${f32(slideLine)} up, front ends flush`},
      acts:[
        `Do this now, while the walls lie flat on the bench.`,
        `Draw a line <b>${f32(slideLine)}</b> up from the bottom edge on the inner face of each end panel and on both faces of the divider.`,
        `Separate each slide. Screw the cabinet member on, centered on the line, front end flush with the front edge.`,
        `On the divider the slides are back to back. Stagger the screws so they do not meet.`]});
    S.push({title:"Walls onto the bottom",need:["Bottom",["End panel L","from step 2"],["End panel R","from step 2"],["Divider","from step 2"]],hw:[["≈12",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","Framing square","Tape measure"],
      fig:{show:["Bottom",...walls],hi:["Bottom"],flip:true,explode:{"Bottom":[0,0,-3]},labels:["Bottom","End panel L","Divider","End panel R"],cap:"Upside down: walls on their top edges, bottom on top"},
      acts:[
        `On the inside face of <b>Bottom</b>, draw the wall positions. End panels sit flush with the ends. The divider straddles the centerline at <b>${f(d.core/2)}</b>.`,
        `Drill ⅛" pilots straight through each wall line, about every 5". Start 1" from the front and stop ${f(T+1)} from the back, because the walls stop ${f32(T)} short of the back. Turn it over and countersink.`,
        `Stand the walls upside down on their top edges, fronts toward you, slides facing into the bays. <b>End panel L</b> now stands on your right.`,
        `Glue the edges. Lower <b>Bottom</b> on, outside face up, flush at the front and ends. Screw down with 1⅝" screws.`,
        `Before the glue sets, check each bay at front and back: <b>${f32(d.bay)}</b>.`]});
    S.push({title:"Back",need:["Back"],hw:[["≈14",'#8 × 1⅝" screws'],["—","Glue"]],tools:["Countersink bit","2 clamps 36\"+","Tape measure"],
      fig:{show:["Bottom","Back",...walls],hi:["Back"],flip:true,view:"back",labels:["Back"],cap:"Back fitted, carcass still upside down"},
      acts:[`Glue <b>Back</b> in behind the walls, against the bottom.`,
        `Screw down through the bottom into the back's edge, about every 6". Drive two screws through the back into each wall.`,
        `Measure both diagonals of the front face. If they differ, clamp across the long one until they match.`]});
    const tz=P["Top upper"].box[2]+T+3;
    S.push({title:"Top onto the carcass",need:[["Top upper","laminated, step 1"],["Top lower L","laminated, step 1"],["Top lower R","laminated, step 1"]],hw:[["9",'#8 × 2½" screws'],["—","Glue"]],tools:["Countersink bit","Weights"],
      fig:{show:["Bottom","Back","Top",...walls],hi:["Top"],explode:{"Top upper":[0,0,3],"Top lower L":[0,0,3],"Top lower R":[0,0,3]},
        extra:[ep,dv,epR].map(w=>({tone:"accent",box:[w.box[0],6,tz,T,9,0.06]})),
        notes:[{text:"Screw band",at:[dv.box[0]+T/2,10.5,tz]}],cap:'Screws only in the band 6" to 15" from the front'},
      acts:[`Turn the carcass upright. Glue the top edges of the walls and the back.`,
        `Set the laminated top on, good face up, flush on all sides. The seam sits over the divider.`,
        `Draw lines across the top at <b>6"</b> and <b>15"</b> from the front. The tank rim sits near 4¼" and along the back, so no screws go under it.`,
        `Between the lines, drive three 2½" screws into each wall: ${f32(T/2)} in from each end, and on the centerline. Sink the heads just below the surface.`,
        `Weigh the top down until the glue sets.`]});
    if(is44){const c=P["End cap R"];
      S.push({title:"End caps",need:[["End cap L",'cut ⅛" tall'],["End cap R",'cut ⅛" tall']],hw:[["8",'#8 × 1¼" screws'],["—","Glue"]],tools:["Right-angle attachment","Flush-trim bit or block plane","Straightedge"],
        fig:{hide:["D1","D2","Front","Pull","Tank","Slide"],hi:["End cap"],labels:["End cap L","End cap R"],explode:{"End cap L":[-4,0,CAP_TRIM],"End cap R":[4,0,CAP_TRIM]},
          notes:[{text:"Trim flush",at:[c.box[0]+4+T/2,c.box[1]+c.box[4]*0.3,c.box[2]+c.box[5]+CAP_TRIM]}],cap:'Caps stand ⅛" proud, then get trimmed flush'},
        acts:[`Set each cap against an end. Bottom edge on the same surface as the bottom panel. Front edge ${f32(T)} ahead of the carcass, flush with the future drawer fronts. Back edge flush. Top edge ⅛" proud.`,
          `Glue it. From inside the bay, screw through the end panel into the cap: four 1¼" screws, two above the slide and two below.`,
          `When dry, trim the top edge <b>flush</b> with the top. Check with a straightedge. A cap even 1/32" proud lifts the tank off the top.`]});}
    const lip=P["Top lip"];
    S.push({title:"Top lip",need:["Top lip"],hw:[["≈10",'18 ga × 1¼" brads'],["—","Glue"]],tools:["Brad nailer","3 bar clamps 24\"+","Sanding block"],
      fig:{hide:["Tank","D1","D2","Slide"],hi:["Top lip"],labels:["Top lip"],explode:{"Top lip":[0,-4,0]},cap:"The lip brings the top flush with the caps and fronts"},
      acts:[`Glue <b>Top lip</b> to the front edge of the top${is44?", between the end caps":""}. Keep its top face flush with the top surface.`,
        `Its bottom edge sits <b>${f(lip.box[2])}</b> above the floor. That leaves ⅛" over the pulls, so the drawers open under it.`,
        `Clamp front to back every 12". Add a few brads from the front if a clamp will not reach. Fill the holes.`,
        `When dry, sand the joint on the top until you cannot feel it.`]});
    const e=3.2;
    S.push({title:"Drawer boxes",need:[{labels:["D1 side L","D1 side R","D2 side L","D2 side R"]},{labels:["D1 front","D1 back","D2 front","D2 back"]},{labels:["D1 bottom","D2 bottom"]}],hw:[["≈40",'18 ga × 1¼" brads'],["4","Slide drawer members"],["—","Glue"]],tools:['Router, ¼" straight bit',"Brad nailer","4 bar clamps",'3/32" bit'],
      fig:{show:["D1 ","Slide D1 L"],hi:["D1 "],view:"box",labels:["D1 side L","D1 side R","D1 front","D1 back","D1 bottom"],
        explode:{"D1 side L":[-e,0,0],"D1 side R":[e,0,0],"D1 front":[0,-e,0],"D1 back":[0,e,0],"D1 bottom":[0,0,-e*1.6],"Slide D1 L":[-e,0,0]},
        notes:[{text:"Slide",on:"Slide D1 L",frac:[0.5,0.3,0.5],shift:[-e,0,0]}],cap:"One box, exploded. Build two."},
      acts:[`Cut a ¼" × ¼" groove on the inside face of all four box parts, ¼" up from the bottom edge.`,
        `Glue and nail. Sides run the full ${f(p.d)} depth. Front and back fit between them. Slide the bottom in before the last corner. Do not glue it.`,
        `Clamp and match the diagonals. Outside width: <b>${f32(p.w)}</b>, up to 1/16" wider. Never narrower.`,
        `Draw a line <b>${f32(p.h/2)}</b> up on each side. Screw the drawer member on, centered, front end flush with the box front.`,
        `Slide each box in. It must run the full length without rubbing, with about ¼" above.`]});
    const fL=P["Front L"], fR=P["Front R"], pl=P["Pull L"];
    S.push({title:"Fronts and pulls",need:["Front L","Front R"],hw:[["2","Edge pulls + their screws"],["8",'#6 × 1" screws'],["—","Double-sided tape"]],tools:['Router, ¼" straight bit','⅛" shims ×4','⅜" spacers ×2','3/32" bit'],
      fig:{hide:["Tank"],hi:["Front","Pull"],labels:["Front L","Front R"],explode:{"Front L":[0,-4,0],"Front R":[0,-4,0],"Pull L":[0,-4,0],"Pull R":[0,-4,0]},
        notes:[{text:"Gap",at:[fR.box[0]-GAP/2,fL.box[1]-4,fL.box[2]+fL.box[5]*0.5]},{text:"Edge pull",at:[pl.box[0]+pl.box[3]/2,pl.box[1]-4,pl.box[2]+pl.box[5]]}],cap:'⅛" gaps, ⅜" above the floor'},
      acts:[`Lay the pull's wide leg flat on the top edge of each front, centered. It overhangs the face by about ${f(PULL.w-T)}. That overhang is the grip.`,
        `Trace the narrow leg on the back of the front. Rout a recess as deep as the leg is thick, so it sits flush. Screw the pull on with flat heads.`,
        `Close both drawers. Set each front on ⅜" spacers, so its bottom is <b>${f(T/2)}</b> above the floor.`,
        is44?`Shim ⅛" at each end cap and ⅛" between the fronts.`:`Keep the outer ends flush, with ⅛" between the fronts.`,
        `Tape each front in place. Pull the drawer fully open. From inside the box, drive four 1" screws into the front, clear of the pull's screws.`]});
    S.push({title:"Finish and set up",hw:[["—","Water-based polyurethane"],["—","Composite shims"]],tools:["Sander 120/180/220","Foam brush or roller","4' level"],
      fig:{hi:["Tank"],view:"tank",cap:"Tank centered, back faces flush"},
      acts:[`Remove the drawers and pulls. Sand. Give every face and edge 2 or 3 coats of polyurethane, including the underside${is44?" and the cap bottoms":""}. Cure 72 hours.`,
        `Set it in place. Level end to end and front to back, within ⅛". Shim under the walls${is44?" and the caps":""}.`,
        `Set the tank on${is44?`, centered end to end, about ${f32((d.len-TANK.l)/2)} of cap showing at each end`:""}, back faces flush. Fill one-third, wait a few hours, check level, then fill.`]});
    return S;
  },

  // Parameter sweep for tools/verify.mjs: every combination must pass every check.
  sweep:{mode:["4x4","4x8"],t34:[0.75,0.71875],t12:[0.5,0.46875],w:[20,22],h:[5,6]},
};

if(typeof module!=="undefined"&&module.exports)module.exports=PLAN; else root.PLAN=PLAN;
})(typeof window!=="undefined"?window:globalThis);
