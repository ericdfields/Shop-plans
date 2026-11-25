# Method

How we turn an idea, or someone else's plan, into a plan that builds right the first time.

## 1. Intake

From a prompt, settle these before modelling. Ask only what the prompt leaves open.

- What it holds or carries, and the load (a filled 55-gallon tank is about 600 lb).
- Hard limits: footprint, height, what it must clear (baseboards, outlets, a tank's rim).
- Stock: sheet sizes the person can handle and buy (two 4×4 sheets were easier than one 4×8).
- Hardware they have or want (slides, pulls, hinges). Get the maker's install sheet.
- Tools on hand. Do not plan a dado stack for someone with a circular saw.
- Look: what shows, what lines up, which edges are seen.

From someone else's plan:

- Record `source` (title, URL, author, license). Many free plans allow personal use only. Build from
  them, credit them, and do not republish their text or drawings.
- Extract every part with its size and position into `model(p)`. Rebuild the steps in our format.
- Re-derive sizes from measured stock and the actual hardware. Published plans often assume nominal
  thickness and ignore kerf.
- List every place our checks disagree with the source, and say so.

## 2. Model

- Every part is a box in its assembly position. Cut lists, sheet layouts, drawings and checks all
  come from that one model, so they cannot drift apart.
- Parameters for anything the person will measure or choose: thickness of each sheet good, kerf,
  hardware gaps, stock choice.
- Default to nominal thickness (¾", ½"). Use measured values only when the person enters them.
- Fractions in 1/16". Use 1/32" only for measured thickness and tight hardware tolerances.

## 3. Rules we learned

- **Kerf counts.** Two 17" rips and a 14" rip do not fit a 48" sheet. Let the packer place parts.
- **Hardware sets clearances.** Read the install sheet. Side-mount slides: ½" per side, +1/32"
  −0. Build the box 1 1/16" narrower than the opening.
- **Load goes straight down.** Parts that carry the load should reach the floor. A tank rim must sit
  on support all the way round.
- **Cut tall, trim flush.** Any part that must end flush with a surface the load sits on (end caps)
  is cut ⅛" proud and trimmed after glue-up. A part 1/32" proud lifts the load.
- **Check the silhouette.** Exposed edges and odd reveals spoil the look. The tank platform shipped
  with the drawer tops exposed until a top lip brought the top flush with the caps and fronts.
- **Reveals and finger room.** ⅛" between moving fronts and fixed parts. Leave room over pulls.
- **Screws.** Length = through-piece + at least ⅝" into the next. Keep tips ¼" short of a show face.
  Keep heads out from under load-bearing rims (a screw band).
- **Ergonomics of assembly.** Never ask for screws driven upward inside a short bay. Mount hardware
  on loose parts flat on the bench. Build carcasses upside down so screws go down. Laminate on the
  bench first.
- **Upside down swaps left and right.** When a step works upside down, say which labelled part now
  sits on which side.
- **Walls over walls.** When one piece stacks on another, put every load-bearing wall of the upper
  piece directly over a wall of the lower one that reaches the floor. Check coverage, not just overlap.
- **Shim where the load lands.** Level under every part that carries load, including a bottom panel
  under a divider. A panel spanning between shims sags.
- **Band and seal flat.** Edge-band and seal hard-to-reach faces before assembly.
- **Anchor tall loads.** Anything that lifts a heavy load off the floor gets anti-tip straps into studs.
- **Labels persist.** Part IDs are written on the cut pieces. Never rename them after cutting.

## 4. Instructions

European assembly-sheet style:

- One step per page. Big step number, short title.
- Parts (by label, with size), hardware with counts, tools as a ruled list.
- One drawing: new parts in full color, earlier parts as ghosts. IDs sit in the white space with thin
  angled leaders. No dimensions and no text on the parts.
- Short lettered actions. Bold the one number that matters.
- Step 0 is the inventory: hardware, tools, checks before cutting. No drawing.

## 5. Prove it

1. `node tools/verify.mjs plans/<id>`: every check across the sweep must pass.
2. `node tools/build.mjs plans/<id>`, then `node tools/print.mjs dist/<id>.html`.
3. Look at every step image and every PDF page. No step may spill onto a second page.
4. For anything that carries real load, have someone (or a fresh agent) review the plan without
   seeing how it was made.
