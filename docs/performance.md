# Performance

## Measuring

```sh
npm run perf                                                  # the built-in demo city
npm run perf -- --city perf/cities/ma-ville.json --label ma-ville
npm run perf -- --city '#city=H4sIA…' --label shared
```

A run loads the city, waits for every building model to be in (a half-loaded city draws half the
buildings and reads as fast for the wrong reason), then reports:

- **fps** at three framings -- the whole map, a district, street level. A city is slow in
  different ways depending on how much of it is on screen.
- **rebuild** -- one full `rebuild()`, which is what loading a city costs. Editing a road uses the
  dirty-region path instead and is far cheaper.
- **meshes** -- the eight biggest mesh groups, by name prefix, one renderer's output each.

Add `--gpu` to run in a real window on the machine's own driver. Without it the run is headless,
which means SwiftShader -- a software rasteriser that prices triangles and draw calls nothing like
a GPU does. GPU runs are recorded under their own `<label>-gpu`.

Every run appends a line to `perf/history.jsonl` with the commit, and prints the delta against the
last run carrying the same `--label`.

Entries from `418c133` through `2258a5c` are clean but not comparable with built-city records:
the harness loaded the demo roads and models, then measured before construction produced any
standing buildings. Built-demo entries start after the 2026-09-03 harness fix that calls the
existing debug `growCity(2000, 200)` path and waits for `stats().buildings > 0`.

**Trust the mesh counts; be careful with the fps.** The same build measured 75 fps and 42 fps at
the same framing an hour apart on this machine -- whatever else it was doing moved the number more
than most changes do. Mesh counts are deterministic; frame rates are not. To judge a change by fps,
run the two builds alternately in one sitting, more than once, and only believe a difference that
survives that.

`perf/cities/ma-ville.json` is the reference city. Export your own from the app (Export, beside
Share) and drop it in beside it.

## What actually costs

Buildings are the least of it. They are thin instances: 2826 buildings in the reference city are
28 meshes. What costs is everything drawn one object at a time -- each unique mesh is a draw call,
and every mesh in the scene is walked each frame whether it is on screen or not.

The profile that started this, on the reference city (4625 meshes, 1216 active):

| group      | meshes | what it was                      |
| ---------- | -----: | -------------------------------- |
| crossing   |   1098 | one mesh per zebra stripe        |
| carpart    |    732 | wheels/glass/lamps, instanced    |
| pedestrian |    715 | instanced                        |
| sidewalk   |    371 | one mesh per side of a road      |
| curb       |    368 | one line mesh per side of a road |
| signal     |    336 | instanced                        |

Instanced meshes (traffic, pedestrians, signals, lamps) already batch into one draw call per
prototype, so their count costs CPU traversal, not draw calls. The unique geometry is what to go
after.

## What costs the frame rate

`npm run ablate` switches one thing off at a time and measures, re-measuring the full scene
between every ablation so the answer is a ratio taken minutes apart at most. On the reference
city, at 1024 x 4 cascades:

| off        | overview | street |
| ---------- | -------: | -----: |
| buildings  |    x2.10 |  x2.55 |
| shadows    |    x2.03 |  x2.48 |
| lights     |    x1.18 |  x1.07 |
| traffic    |    x1.00 |  x1.07 |

Re-run after the two fixes below, the same table flattens out -- buildings x1.43, shadows x1.59,
traffic x1.46, lights x1.41 at overview, and nothing above x1.21 at street level. There is no
single hot spot left: what remains is spread across the whole frame.

Traffic is free. Buildings and shadows are each worth half the frame -- and they are the same
cost twice, because what was expensive was **drawing every building into the shadow map, once per
cascade**. Emptying the caster list bought as much as switching shadows off altogether; dropping
only the buildings from it bought nearly all of that.

So the fix was the cascade count, not the buildings: two cascades instead of four halves that
pass. Two at 2048 measure the same as two at 1024 (the cost is the geometry pass, not the fill)
and resolve near shadows better than four at 1024 did -- the same city, framed the same way, is
indistinguishable in a screenshot.

## What was done

- **A crossing is one mesh, not one per stripe.** The stripes are four vertices each and never
  move apart. 1098 meshes -> ~180.
- **Both footways of a road in one mesh**, and both kerbs in one line system. Same material, same
  lifetime, half the meshes.

- **A junction's corners in one mesh**, and a roundabout's whole footway in one, rather than one
  per corner and one per gap between arms.

- **Two shadow cascades at 2048, not four at 1024.** Measured back to back on the same session:
  overview 65 -> 81 fps, street 78 -> 103.
- **The shadow map is drawn once and kept.** Nothing that casts a shadow moves on its own -- cars
  and people are not casters -- so the map is only redrawn when the camera moves (the cascades are
  fitted to its frustum), the sun moves, or the city changes. With the camera still that is 2
  renders in 457 frames instead of 457. Worth about +12 fps at street level: what is left of the
  shadow cost is the main pass sampling the map, not drawing it.

- **Detail stops being drawn as the camera pulls out** (`render/detail.ts`): street furniture and
  car parts beyond 420 m, roof clutter beyond 700, people beyond 900. Cars stay at every height --
  they are what makes a city look alive from up there. Overview 88 -> 107 fps, 841 -> 709 active
  meshes. The rules are keyed on mesh-name prefixes, so a renderer opts in by naming its output.

Meshes: 1216 -> 709. Frame rates moved with them, but see the warning above about believing any
single pair of numbers.

Merging has to keep the name the dirty-region rebuild matches on (`sidewalk_<segmentId>`,
`crossing_<segmentId>_<nodeId>`), see the regex in `roadMesh.ts` -- that is how an edit knows which
meshes to throw away and which to keep.

## Tried, and not kept

- **Merging the carriageway into tiles** -- road ribbons, junction polygons and roundabout rings
  into one mesh per material per 96--320 m tile. It did cut meshes (841 -> 782), but the fps it was
  supposed to buy never showed up above the machine's own drift, and it makes an edit rebuild every
  road in the tiles it touches instead of just the ones it changed. Reverted: real cost, unproven
  gain. Worth another look with a repeatable measurement.
- **`freezeWorldMatrix()` on road geometry.** Sound in theory -- the meshes are built in world
  space and never move -- but three runs either side of the change came out inside the noise
  (+-5 fps run to run on the same build). Not kept: it is a claim the numbers do not support.

## The look settings

`render/postFx.ts` adds the screen-space passes, all of them switchable from the Look row because
they cost fill rate rather than draw calls -- the one budget a city of thin instances still has to
spare, and the player's to spend:

- **Smooth** (FXAA) on top of 4x multisampling. The pipeline renders the scene into its own target,
  which does not inherit the canvas's multisampling: leaving `samples` at 1 made every edge
  stepped, which is worse than having no pipeline at all.
- **Glow** (bloom), which follows the clock rather than a second switch -- a bloom that costs a
  pass at noon and shows nothing is waste.
- **Depth** (SSAO, half resolution). The strongest of the four on a city of boxes: it is what puts
  a building on the ground rather than in front of it.
- **Miniature** (depth of field). Focused on what the camera is pointed at, so the middle of the
  screen stays sharp. The focal length is derived rather than chosen: an ordinary lens focused
  hundreds of metres out holds a whole city in focus, so `f = sqrt(8.7 * D * N)` keeps the blur the
  same strength at every height.

Tone mapping, a little contrast and a vignette are always on: they are a shader constant each.

The engine renders at the device pixel ratio, capped at 1.5x. Uncapped, a retina screen draws four
times the pixels, and this scene is fill-bound the moment the water fills the frame: looking out to
sea measured 87 fps at 2x and 124 at 1.5x. Past 1.5x the multisampling and FXAA are doing the work
anyway.

The swell is recomputed at 30 Hz rather than every frame -- 5329 vertices whose normals have to be
recomputed with them, for a difference nobody can see in water.

## Buildings at a distance

Above 1100 m the models are swapped for one box each, in the colour the model generator would have
painted that lot -- the same rule, so the swap is a change of detail rather than of palette.
Measured back to back at 1600 m: 76 fps with the models, 94 with the boxes.

It is a whole-city swap, not per building: the models are thin-instanced, and splitting their
instance buffers by distance would cost more CPU every frame than the vertices save. Above that
height every building is far away anyway.

## Traffic at a distance

Cars and people are hidden past a reach that follows the zoom (320 m at street level, up to 2 km
when the whole city is in shot). They keep driving -- the simulation is cheap, the drawing is not
-- and the check runs a few times a second rather than every frame.

Measured against the same build without it: 145 of 959 movers drawn instead of all of them, and
104 fps against 95 with the camera in close. At mid zoom it is worth nothing (89 against 88): the
ones it hides were being frustum-culled anyway. Kept for the close view and for the ~800 meshes it
takes out of the scene walk each frame.

## The cheapest optimisation: stop drawing so many frames

Measured on the machine this is developed on -- an M3 Pro, ProMotion display, the reference city:
the browser's animation-frame ceiling is 120 Hz and the game runs at 119. It is not slow, it is
flat out, and no ablation moves it by more than a tenth. What reads as "the game is heavy" is a
laptop being asked for 120 frames a second of a scene that looks the same at 60.

So there is a frame cap, in the settings beside Shadows and Lights: 30, 60 (the default), 120, or
Max. At 60 on a 120 Hz screen the machine does half the work. The city keeps moving at any cap --
everything is driven by elapsed time, so a longer frame is a longer step, not a slower city -- and
an unfocused window drops to 10 fps on its own.

Both measurement harnesses set the cap to Max before measuring, and so does the interaction test,
which steps frame by frame.

## Night is a different city

The benchmark framings are at 16:00, and they miss the one thing that still costs half a frame.
The reference city is saved at 20:15; in its own saved view it measured 52 fps where the daytime
framings measure 119. Switching each thing off in turn, in that view:

| off              | fps |
| ---------------- | --: |
| nothing          |  52 |
| Glow (bloom)     |  53 |
| **Lights**       |  98 |

The lamps and headlights are real lights, in two clustered containers -- 1348 of them for the
streetlights alone, plus one per car. What costs is the clustered lighting pass itself, not their
number: halving the lights (dropping each lamp's facade light) measured 50, capping materials at
8 simultaneous lights measured 54, shrinking the cluster's range from 52 m to 28 measured 57.
Only turning the pass off recovers the frame.

Switching the real lights off beyond a camera distance was tried and reverted: it does give the
2x back, but the far city goes flat and dark exactly where a night city is worth looking at, and
a cheap stand-in (an additive decal for each lamp's pool of light) did not come out of the
renderer in the colour it was given -- worth another go with time to debug it.

So the lever is the player's: **Lights, off**, which is already in the settings and doubles the
frame rate at night.

## What is left

- **A repeatable measurement, before anything else.** Every remaining idea is a trade, and this
  machine's fps wanders too much to judge one. Pinning it down -- interleaved A/B runs, more
  samples, a quieter machine -- is what unblocks the rest.
- **Road surface per tile rather than per segment** -- `road` 184 + `roundabout` 182 + `junction`
  90 + `lane` 55 are still one mesh each. Tried once (above) and reverted; it also needs a
  tile-level dirty region to stop an edit rebuilding whole tiles.
- **A cheap stand-in for a lamp's pool of light**, so the real lights can be switched off at a
  distance without the night going flat. See above: the decal renders, but black.
- **Distance for the rest.** Traffic is culled by distance (above); street furniture, roof clutter
  and building models are still switched by zoom alone, because they are thin-instanced -- culling
  one instance means rewriting the buffer its neighbours are in. Road detail (crossings, kerbs,
  signals) could take the same pass traffic does, and was not worth it while traffic's own gain
  measured 9%.
- **Traffic as thin instances** -- ~1700 meshes for cars, their parts and pedestrians. They batch
  already, so this buys scene traversal, not draw calls, and costs a per-frame matrix buffer
  rewrite. Measure before doing it.
- **`ground` is 240 ms of a full rebuild.** The edit path already rebuilds only the dirty region
  (~50 ms); the full number is a load cost.
