# city-jump 0.5.3

Prepared on 2026-09-07. A release about measurement. Eight performance slices were investigated
against the same repeatable protocol; three shipped, five were closed with their evidence, and four
of those five were closed before a line of them was written. What the city looks like barely
changes. What it costs at night, and what the project can now prove about its own frame time, does.

Balance is unchanged from 0.5.2. The scenario suite reports the same outcome: 31 waves fought,
31 held, none outside the 13-85s / 4-21 salvo band, 5 of 6 runs reaching wave 6.

## The far city draws itself as boxes again

Above 1100 m the buildings are swapped for one coloured box each, and below 1000 m the models come
back. The gap between the two numbers is the whole flicker guard: a camera resting on the threshold
cannot swap the city back and forth every frame.

Measured over three interleaved rounds against the same build without it: **+28.7% frame time at
the night overview framing, +15.5% by day**, with every framing below the threshold flat and its
active-mesh count unchanged.

This swap existed once, and 0.5.1 removed it on purpose, because from above it took the city away
from anyone who wanted to look at it. So the control has three states rather than the old two. The
**Far** dropdown in the Look row offers `Auto`, `Boxes` and `Models`: `Auto` is the default and
carries the gain, `Boxes` holds boxes at every height as the old checkbox did, and `Models` holds
models at every height, which is what that removal was protecting. A saved `Boxes` checkbox still
reads back correctly, as boxes or as models, since the camera used to decide nothing.

The threshold is tuned against the camera's real 1200 m limit, so the automatic band is the top
100 m of the zoom. Lower was tried and rejected on sight rather than on frame time: at 950 m the
boxes lose towers, roof colours and farm rows that are still legible as models.

## Extra AA, because the scene is fill-bound

The renderer multisampled the whole scene four times over, and nothing could turn that off — the
`Smooth` checkbox is FXAA and always was. **Extra AA** in the Look row now owns it. Off is one
sample and **+21.6% frame time at the saved night framing**, +7.0% moving, +4.7% at district. It
defaults to on, and FXAA still smooths the edges underneath, so off reads as softer rather than
stepped.

Two thirds render resolution was measured too, at +18.6% on the same framing, and not chosen: it
blurs text and road markings, where multisampling costs edge quality only.

## Work the simulation stopped repeating

The workforce allocation is reused between frames now, one bounded cache per policy owner. Paused,
nothing is recomputed at all; running at x1 the city panel recomputes 9 times per 351 frames and
the building cycle none; at x4, 94 and 1. It used to sort 1287 parcels on every single frame,
because it handed a freshly built array to a cache that compared arrays by identity.

Frame time does not move, and none is claimed. It is work the machine no longer does.

## Five things that were measured and not shipped

Each of these has its evidence committed under `perf/reviews/`, and the reason it failed is
recorded next to the numbers.

- **Distance culling for traffic.** Two reaches, three rounds each. It culls up to 20.9% of the
  active meshes when following a car, and none of it reaches the frame: these views are not bound
  by how many vehicles are drawn.
- **A distance policy for night lighting.** The night cost is the clustered light container's own
  per-frame pass, not the lamps inside it. Disabling all 808 emitters while the containers stay on
  buys +1.0%; disabling the streetlight container buys +32.1% and the headlight container +14.0%. A
  distance policy can only reach individual lamps, so it can only ever buy the first number.
- **Spatial tile batching**, rejected before being built. Perfect frustum culling of the building
  instances — ideal granularity, no added draw calls, better than any tile grid can be — removes
  1316 of 2574 instances and buys nothing. Removing 49% of the instances is free while removing
  100% is worth 12.6%, so the cost is fixed per mesh and per material. Tiles would multiply meshes
  to save instances that are not the problem.
- **Terrain tiling and distant LOD**, both rejected before being built. The ground costs nothing by
  day and +11.9% by night at the identical framing, so its price is per-pixel shading as the
  largest receiver of the city's lights, not its 911250 triangles.
- **Trees and streetlight geometry** batched by tile: no measurable cost to reclaim at three of the
  four framings.

The night lighting pass was then investigated on its own, since disabling the streetlight container
is worth 32.1% at the saved night framing and something ought to be recoverable. Nothing was. The
pass costs the volume each light occupies in the cluster and nothing else: halving the tile grid or
the depth slices is worse than leaving them alone, thinning the lamps is worth nothing, and
shortening `maxRange` is the only lever that pays. It pays out of the picture — 24 m puts the lit
facades out entirely, 32 m keeps them and visibly shrinks the ground pools for 7.1%, and fitting the
value to the longest light each container actually holds clips nothing and buys nothing. The
cheapest lighting model that would help is no real lights, which is already the `Lights` switch.

The thread through all of it is one sentence, now written down in `docs/performance.md`: this scene
is fill-bound, not geometry-bound. Every geometric lever measured about zero; every per-pixel lever
measured 10 to 30 percent. The next person with an idea about fewer meshes has the numbers, and so
does the next person with an idea about the night lights.

## Measurement the project can trust

The review harness gained the parts that make a comparison mean something.

- `scripts/review/paired.mjs` reads a run as the median of per-round paired deltas, and flags a
  baseline that shifts between rounds. Reading a median per side instead once turned a run made
  under machine load into a 36.6% gain that was not there.
- **An ablation that reaches nothing now throws instead of returning a sample.** Three of them
  silently measured nothing during this work and read as "no gain": a filter over `scene.lights`
  found no lights, because a clustered container removes its own lights from that array; a one-shot
  change was undone within two frames by the running clock; and a hardware scaling level was asked
  for while already set. Four runs were thrown away over the first two. A null result now has to
  mean no gain, never no measurement.
- Every lighting and mesh ablation re-applies each frame — except the clustered container's own
  parameters, which persist, and which the container rebuilds its clustering for if they are set
  again every frame. Setting them once measures the parameter; setting them repeatedly measures the
  rebuild, and the probe's "city and traffic advanced" guard catches it.
- The distance probe can split the night bill nine ways: streetlight container, headlight
  container, the emitters inside them, the lit bulb materials, the player's own switch, `maxRange`
  at three values, the tile grid, and the depth slices.
- Three new probes: `detail.mjs` walks the camera near, far and back and asserts what it captures;
  `workforce.mjs` counts allocations against drawn frames; `look.mjs` proves the Extra AA control
  drives the pipeline and persists.

`npm run ci` is green at 0.5.3: version check, 393 unit tests across 54 files, `src/sim` line
coverage 96.84%, 30 architecture and asset tests, the scenario suite unchanged from 0.5.2, the
build with types, and Logics validation. `npm run test:e2e` passes 281 browser checks, four of them
holding the new Far control to its contract in both directions.
