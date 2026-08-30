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

## What was done

- **A crossing is one mesh, not one per stripe.** The stripes are four vertices each and never
  move apart. 1098 meshes -> ~180.
- **Both footways of a road in one mesh**, and both kerbs in one line system. Same material, same
  lifetime, half the meshes.

- **A junction's corners in one mesh**, and a roundabout's whole footway in one, rather than one
  per corner and one per gap between arms.

Together: 1216 -> 841 active meshes, overview 50 -> 65 fps, district 60 -> 74, street 70 -> 76, a
full rebuild 671 -> 553 ms.

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

## What is left

- **A repeatable measurement, before anything else.** Every remaining idea is a trade, and this
  machine's fps wanders too much to judge one. Pinning it down -- interleaved A/B runs, more
  samples, a quieter machine -- is what unblocks the rest.
- **Road surface per tile rather than per segment** -- `road` 184 + `roundabout` 182 + `junction`
  90 + `lane` 55 are still one mesh each. Tried once (above) and reverted; it also needs a
  tile-level dirty region to stop an edit rebuilding whole tiles.
- **Traffic as thin instances** -- ~1700 meshes for cars, their parts and pedestrians. They batch
  already, so this buys scene traversal, not draw calls, and costs a per-frame matrix buffer
  rewrite. Measure before doing it.
- **`ground` is 240 ms of a full rebuild.** The edit path already rebuilds only the dirty region
  (~50 ms); the full number is a load cost.
