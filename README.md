# shop-plans

Parametric furniture plans that build themselves into one page:

- a 3D model you can orbit and explode
- cut lists per material, with the part labels you write on the cut pieces
- checks that prove the design works (no overlaps, every part fits its sheet, plus plan-specific rules)
- one-step-per-page instructions with parts, hardware, tools and a drawing for each step
- sheet layouts with saw kerf, cuttable on a table saw or track saw
- a print layout: one step per Letter page

Each plan is one file, `plans/<id>/plan.js`. The engine does the rest.

## Use

```sh
npm i                                        # playwright + three, for the tools only
node tools/verify.mjs plans/<id>             # run every check across the plan's parameter sweep
node tools/build.mjs  plans/<id>             # -> dist/<id>.html (self-contained page)
node tools/print.mjs  dist/<id>.html         # -> dist/<id>.pdf and dist/<id>-step-N.png
```

The built page is self-contained apart from three.js and Google Fonts from their CDNs, so it can be
published as an artifact or opened locally.

## Start a new plan

1. Copy `plans/_template` to `plans/<id>`.
2. Write `model(p)`: every part as a box in assembly position.
3. Write `checks(m)`: the rules this design must keep.
4. Write `steps(m,h)`: the build order, one page per step.
5. Run verify, build, print. Look at every PDF page.

See `docs/PLAN-FORMAT.md` for the file format and `docs/METHOD.md` for how we design, check and write plans,
including how to adapt someone else's plan.

## Layout

```
engine/core.js      pure functions: fractions, cut rows, sheet packer, generic checks (browser + node)
engine/engine.js    page: 3D viewer, cut lists, checks, steps, illustrations, sheet layouts, print
engine/engine.css   styles, light and dark, print rules
engine/shell.html   page skeleton the bundler fills in
plans/<id>/plan.js  one plan
tools/              build, verify, print
docs/               format and method
```
