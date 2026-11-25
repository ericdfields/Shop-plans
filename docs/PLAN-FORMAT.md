# Plan format

A plan is one JavaScript file that sets `PLAN` (browser) or `module.exports` (node). It holds data and
small functions. It must not touch the DOM or three.js. It may use `ShopCore.frac` for fractions.

Units are inches. Axes: **x** = length (left to right), **y** = depth (front = 0, toward the back),
**z** = up. A box is `[x, y, z, dx, dy, dz]`: the near-left-bottom corner, then the size.

```js
const PLAN = {
  id: "aquarium-platform",
  title: "55-Gallon Tank Platform",
  source: { title, url, author, license },   // only when adapted from someone else's plan
  kerfParam: "kf",                           // which param is the saw kerf

  params: [                                  // the form on the page
    { id:"mode", label:"Plywood stock", type:"choice", value:"4x4", group:"Plywood stock",
      options:[{value:"4x4",label:"Two 4×4 sheets"}, {value:"4x8",label:"One 4×8 sheet"}] },
    { id:"w", label:"Box width", value:22, step:0.0625, group:"Drawer size (inches)",
      derivedWhen: p => p.mode==="4x4" },    // shown read-only, value taken from model(p).p
  ],

  materials: {                               // one cut list and one set of sheet layouts each
    ply34: { name:'¾" plywood', thick:p=>p.t34, sheet:p=>({name:"4×8", w:96, h:48}) },
  },

  toggles: [{ id:"tank", label:"Tank" }],    // 3D show/hide; parts opt in with toggle:"tank"

  model(p) {                                 // -> { p, parts, dims, summary, warnings }
    // parts: [{ id, role, material, box, tone, ...options }]
  },
  checks(m) { return [{ name, ok, detail }] },
  notes: { ply34: m => "…", sheets: m => "…" },   // text under each cut list and the sheet layouts
  steps(m, h) { return [ step, … ] },             // h.f(x) = 1/16 fraction, h.f32(x) = 1/32
  sweep: { mode:["4x4","4x8"], t34:[0.75,0.71875] },   // verify.mjs runs every combination
};
```

## Parts

| Field | Meaning |
|---|---|
| `id` | The label written on the cut piece. Never rename once parts are cut. |
| `role` | `cut` (in cut lists and sheet layouts), `hardware` (slides, pulls), `ref` (the tank, a wall: not built, never overlap-checked) |
| `material` | Key in `materials` (cut parts only) |
| `box` | `[x,y,z,dx,dy,dz]` in assembly position |
| `tone` | `carcass`, `top`, `front`, `metal`, `glass`, `accent`: sets the look in 3D, drawings and sheets |
| `group` | Collapse into one cut-list row with a quantity, e.g. `"Sides"` |
| `grain` | Keep the long side along the sheet's long side (visible faces that must match) |
| `cutAdd` | `[t,w,l]` added to the cut size, e.g. cut tall and trim flush later |
| `cutNote` | Footnote for that cut-list row |
| `nests` | Sits in a groove or dado inside its neighbours, so skip the overlap check |
| `toggle` | 3D show/hide group |
| `explode` | Direction for the explode slider, e.g. `[0,0,1]` |

## Steps

Step 0 is the inventory page (hardware, tools, checks before cutting). It has no drawing.

```js
{
  title: "Walls onto the bottom",
  need: ["Bottom", ["End panel L","from step 2"], { labels:["D1 side L","D1 side R"] }],
  hw:   [["≈12", '#8 × 1⅝" screws'], ["—","Glue"]],
  tools:["Countersink bit", "Framing square"],
  acts: ["Lettered actions. Put the key number in <b>bold</b>.", "…"],
  fig: {
    show:  ["Bottom","End panel","Divider"],   // id prefixes to include (default: all)
    hide:  ["Tank"],                            // id prefixes to leave out
    hi:    ["Bottom"],                          // full color; everything else is a ghost
    labels:["Bottom","End panel L"],            // IDs drawn in the white space with leaders
    explode:{ "Bottom":[0,0,-3] },              // inches
    flip:  true,                                // upside down, front still toward you
    view:  "front" | "back" | "box" | "bench" | "tank" | "top" | [dx,dy,dz],
    parts: [ {id,label,tone,box} ],             // draw these instead of model parts (e.g. parts laid flat)
    extra: [ {tone:"accent", box} ],            // marks such as a screw band
    notes: [ {text:"Seam over center", at:[x,y,z]},
             {text:"Slide", on:"Slide D1 L", frac:[.5,.3,.5], shift:[-3,0,0]} ],
    cap:   "Caption under the drawing",
  },
}
```

Drawings never carry dimensions. Sizes live in the parts table and the actions.
