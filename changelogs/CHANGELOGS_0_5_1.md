# city-jump 0.5.1

Prepared on 2026-09-07. A performance and measurement release: the city no longer decides to
stutter the moment you build on it, accelerated play saves again, and the numbers the project
quotes about itself now describe a city that is actually running.

No gameplay rule, no content and no interface changed. The scenario suite produces exactly the
same outcomes as 0.5.0: 31 waves fought, 31 held.

## Building on a large city

The regression that mattered most was interactive, not idle: drawing on the reference city dropped
it from about 75 fps to 42. Every pointer move ran a full `scene.pick` against the ground, one mesh
of 911,250 triangles. The ground is a heightfield on a regular grid, so the ray now walks only the
cells it crosses and tests the same two triangles per cell the mesh is built from -- the hit
position is the one the full pick returned, not an approximation of it.

Measured headed on the `large-demo-v14` reference city, running at simulation rate 1:

| action | 0.5.0 | 0.5.1 |
| ------ | ----: | ----: |
| road preview following the pointer | 42.5 fps | 83-87 fps |
| zone brush | 44.4 fps | 95-100 fps |
| bulldozer, pointer | 69.2 fps | 97.6 fps |
| painting zones | 58.9 fps | 86.7 fps |
| running city, untouched | 77.2 fps | 93.8 fps |
| running at quadruple speed | 72.8 fps | 93.2 fps |

## Per-frame cost

Six reductions, each landed and measured on its own:

- Terrain picking is bounded to the cells a ray crosses, as above.
- An empty rubble map answers without building a coordinate key per parcel cell, per frame.
- The workforce allocation is dealt once a frame instead of three times, returns its previous
  answer for an unchanged question, and settles priority and incumbency before its sort rather
  than inside the comparator.
- Hidden zone and utility overlays record what an edit asked for and build their geometry on
  reveal, from the latest edit. A dirty rebuild dropped from 41.6 ms to 26.5 ms.
- The needs rows and the resource ledger are written only when a displayed value moves; the ledger
  is not computed at all while collapsed. That was about 45 DOM elements inserted per frame.
- An already-empty explosion buffer is not replaced. The last expired explosion is still cleared
  exactly once.

## Clicking

Babylon picked the whole scene on both halves of every click to fill a `pickInfo` nothing reads:
18-20 ms a pick. The pointer-down pick is skipped. The pointer-up one is kept -- something reads
its ground hit on release -- but the ground now answers a ray from the heightmap, so it is cheap.
Selecting a vehicle tests the cars' bounding spheres along the picking ray instead of ray-testing
166 car bodies triangle by triangle.

Per click, on the reference city: half the picks are gone, and the ones left cost about 0.3-0.6 ms
instead of 18-20.

## Save and reload

- Autosave is bounded to at most ten seconds of deferral. Continuous accelerated play asked to
  save every fifteen simulated minutes, which at quadruple speed is under a second and so always
  inside the two-second debounce: the timer was reset forever and nothing reached storage. Closing
  the tab mid-play lost everything since the last pause in the action. A burst of edits still
  collapses into a single write.

## Measurement

The performance scripts measured a paused city and never said so, which made every number they
recorded optimistic by about 45 per cent: the reference city reads 120 fps still and 83 running.

- `npm run perf` and `npm run ablate` start the simulated clock and refuse to continue unless it
  advanced and the traffic moved with it. `--paused` keeps the still scene measurable on purpose,
  under its own label.
- Frame rates are counted over the whole requested interval instead of the last 500 ms of the HUD
  meter, so a stall at the start of a measurement lands in the number. The HUD display is
  unchanged.
- Each ablation is divided by the mean of the two baselines that bracket it, rather than the one
  taken at the top of the round, whose drift was being read as the feature's cost.
- Every recorded result carries its workload, simulation rate, renderer backend and the camera
  state the app actually settled on.
- A city with nothing standing is refused explicitly rather than measured.

Records in `perf/history.jsonl` from before 2026-09-07 were taken paused, whatever their label
says, and are not comparable with the running measurements taken since.

## Models

- Military bases, missiles and tree models are detailed rather than blocked out.
- The kaiju placeholder is replaced with a detailed articulated model.
