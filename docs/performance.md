# Performance

## Measuring

```sh
npm run perf                                                  # the built-in demo city
npm run perf -- --city perf/cities/ma-ville.json --label large-demo-v14
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
existing debug `growCity(2000, 3000)` path and waits for `stats().buildings > 0`.
The first clean built-demo baseline is `c9321ea`: 237 segments, 101 buildings, 42 active
meshes, and 98 / 116 / 77 fps at overview / district / street.
The clean after row for req_037 is `6d25554`, with the same label and city: 237 segments,
101 buildings, 42 active meshes, and 85 / 108 / 73 fps, with rebuild at 522 ms. That single
software-rasterizer sample did not show a frame-rate win; it showed the same mesh counts and a
slower rebuild. Keep the CPU-side gates, but do not cite this row as an fps improvement.

**Trust the mesh counts; be careful with the fps.** The same build measured 75 fps and 42 fps at
the same framing an hour apart on this machine -- whatever else it was doing moved the number more
than most changes do. Mesh counts are deterministic; frame rates are not. To judge a change by fps,
run the two builds alternately in one sitting, more than once, and only believe a difference that
survives that.

`perf/cities/ma-ville.json` is the reference city, replaced on 2026-09-05 with the supplied
`save.large_demo.json` (save version 14). It contains 131 road segments, about 13,553 residents,
and 1,287 saved building states (1,274 working, 13 rising), across all five zone kinds.
The original gameplay rules, resources and camera are preserved. Food is depleted and waves
are enabled, so running-game comparisons must control their evolution explicitly.
Use the label `large-demo-v14` for this fixture; older `ma-ville` records describe a different city.
The harness still starts paused; these measurements do not yet cover running gameplay.

Export your own from the app (Export, beside Share) to add another fixture.

## Reusable review probes

The review instrumentation now lives in `scripts/review/`, using the installed Playwright rather
than machine-specific imports. It does not instrument the shipped app or fix the findings below.
It intentionally targets the current `large-demo-v14` fixture: 28 models, 1,287 buildings and saved
camera coordinates. Changing the fixture requires reviewing those preconditions and edit positions.

Prerequisites: Node 22+, `npm ci`, and `npm exec -- playwright install chromium`. The default uses
a visible Chromium window; keep it unobscured, the machine plugged in and other workloads idle.
Do not run probes concurrently. `--headless` is available for diagnostic execution, but is not a
substitute for comparable GPU measurements. The actual renderer is recorded, not assumed.

```sh
npm run perf:review                              # interactions, rebuilds, x1/x4
npm run perf:review -- --probe profile            # ablations and Chrome CPU profile
npm run perf:review -- --probe soak               # edit/restore cycles + three minutes x4
npm run perf:review -- --probe all                # all seven probes, sequentially
node scripts/review/run.mjs --help
```

The npm command reuses the project's existing development-server wrapper on port 5173. For a
different port, start the server explicitly and pass its URL (the runner does not own that server):

```sh
npm run dev -- --host 127.0.0.1 --port 5190 --strictPort
# Another terminal:
node scripts/review/run.mjs http://127.0.0.1:5190 --probe extra
```

Production startup is included in `extra` only when `--preview-url` is supplied. Build the same
checkout before starting preview; otherwise the manifest's source hash will not describe its bundle.

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5191 --strictPort
# Another terminal, with the development server also running:
node scripts/review/run.mjs http://127.0.0.1:5190 --probe extra --preview-url http://127.0.0.1:5191
```

| Probe | Workload | Main output |
| --- | --- | --- |
| `profile` | Three ablation rounds, 8 s CPU trace, full/dirty rebuilds | `large-profile.json`, `large.cpuprofile` |
| `focus` | Lifecycle, staffing sorts, HUD churn, uploads, 30 s play, preliminary wave observation | `large-focus.json` |
| `rubble` | Three baseline/temporary empty-map-guard pairs | `rubble-ab.json` |
| `wave` | Debug advance to combat, then 20 s real-time observation | `wave-profile.json` |
| `interactions` | Pointer tools, zoning, follow, ten rebuilds/loads, x1/x4 windows | `review-completion.json` |
| `extra` | Asserted same-city loads, picking confirmations, uploads, display sizes, optional startup | `review-extra.json` |
| `soak` | Five actual road-create/bulldoze/restore cycles, three minutes x4, paused autosave flush | `review-soak.json` |

Allow roughly 10-15 minutes for `all`, depending on the machine. Each run creates a fresh directory
under `.tmp/perf-review/<timestamp>/`, or the new directory specified by `--out`. Existing directories
are refused. Outputs are ignored by Git and historical `perf/reviews/` evidence is never overwritten.
`run.json` records command, source/script/fixture hashes, commit and dirty state, browser, renderer,
hardware, URLs, timestamps and completion/failure per probe. The renderer is queried from a separate
diagnostic WebGL2 context before workloads. Samples and auxiliary screenshots remain beside it.
Some probes write incrementally; `focus`, `rubble` and `wave` write at completion. Failed or interrupted
runs keep whatever evidence has already been written and must not be treated as complete.

To continue in another session, read this section and req_045, inspect the previous `run.json`, then
rerun the relevant probe into a **new** directory. Retain selected JSON/profile evidence under
`perf/reviews/` when adding a dated conclusion; retain screenshots only under `docs/media/` if needed.
Do not compare `profile`/`focus`/`rubble`/`wave` (expanded toolbar) directly with the collapsed-toolbar
completion probes as a before/after optimization. Fixtures/settings reset on navigation; waves are
disabled except in combat observations. Synthetic combat fast-forward is excluded from live frame
timing, and the rubble guard only exists inside that experiment's browser page.

The migrated interaction probe explicitly selects the Review save slot and asserts its building
count. Its load/bulldoze measurements supersede the discarded Demo-slot samples, not the valid
historical pointer measurements. No aggregated historical JSON is regenerated by these commands.
These probes are diagnostics with instrumentation overhead, not universal FPS pass/fail gates.
Their CLI/portability check runs with `node --test tests/perf-review.mjs` and in `test:architecture`.

## Current reference: large-demo-v14 (2026-09-05)

Measured on application commit `5a5cbd2`, with the replacement fixture and unchanged application
sources: headed Chromium, confirmed ANGLE Metal / Apple M3 Pro, 1280x800, saved camera, default
graphics, toolbar expanded and frame cap Max. Each sample starts from a fresh load and cleared
settings. Only automatic waves are disabled for steady-state comparisons; original resources and
construction remain active. Day is 10:00, night 22:00. These are development-server measurements,
not a production-build or mobile benchmark.

The temporary probe counts actual rendered frames across the full 3.5-second measurement after
1.8 seconds of warmup, instead of using the existing HUD-based `measureFps`. Three rounds were
run, reversing scenario order in round two. Values are medians of the three results; p95 is the
95th percentile of inter-frame time within each sample. No short sample recorded a task over 50 ms.

| Scenario | FPS | p95 frame time |
| --- | ---: | ---: |
| Day, paused | 120 | 8.7 ms |
| Day, running | 78 | 14.5 ms |
| Day, traffic disabled | 93 | 12.1 ms |
| Day, camera rotating | 77 | 14.4 ms |
| Night, running | 67 | 17.0 ms |
| Night, lights disabled | 80 | 14.1 ms |
| Night, shadows disabled | 69 | 16.2 ms |
| Night, buildings hidden | 75 | 14.8 ms |
| Night, bloom disabled | 71 | 15.9 ms |

The running city starts with 1,287 buildings, 166 cars, 311 pedestrians and 2,650 scene meshes.
The night sample enables 642 street lights plus vehicle headlights. Traffic-off removes both the
mover simulation and its meshes; buildings-hidden keeps the building simulation. These ablations
are diagnostic upper bounds, not proposals to remove those features or additive optimization gains.

### CPU work worth addressing

- **Empty rubble checks:** `Rubble.blocks` still walks every parcel cell and constructs position
  keys when its map is empty. The CPU profile attributes about 0.73 s of an 8.70 s trace to that
  path, called from `syncBuildings` every frame. A separate three-pair A/B experiment inserted only
  an in-browser empty-map guard: median 78.1 -> 88.4 FPS, with paired gains of 9.6%, 11.3% and
  14.2%. Mean `scene.render()` wall duration fell from about 12.1 to 10.6 ms. The guard was not
  applied to the source, and its gain only applies while no rubble exists.
- **Repeated staffing:** a separate 12-second instrumented run observed 979 lifecycle calls and
  2,939 workforce sorts (three per frame, plus diagnostic reads). Sorting accounted for about
  1.55 ms/frame. `BuildingLifecycle.sync` accounted for 2.12 ms/frame and the whole app observer
  for 4.52 ms/frame; these inclusive costs overlap and must not be added. Lifecycle staffing uses
  a population band and incumbent preference, while the needs panel independently allocates for
  staffing and batteries. Cache each policy on its actual inputs and share identical panel
  calculations; do not merge policies that intentionally differ.
- **Hidden overlay rebuilds:** a 200x200 m dirty rebuild took a median 33.1 ms. Zones and utility
  overlays consumed about 11.6 ms of it despite being hidden. `rebuild` creates their geometry
  unconditionally. Deferring hidden overlays until needed is a more focused candidate than a
  renderer rewrite.
- **HUD churn remains:** the instrumented run inserted 44,055 elements over 979 frames, still
  45/frame. It is worth fixing, but the CPU profile ranked staffing and empty rubble checks above
  `showCityStats`. Building matrix/color uploads occurred in ten batches over those 12 seconds,
  not every frame; the existing visible-state signature is doing useful work.

### Stalls and rebuilds

A 30-second normal-speed observation completed all 13 rising buildings. Its p95/p99 frame times
were 14.2/16.1 ms, with a maximum 51.5 ms and two recorded 50-51 ms long tasks, one around the
initial resume and one around the next 20-second demand boundary. A separate combat observation,
advanced to the first destruction before measuring, ran for 20 seconds at 68.5 FPS, p95 16.3 ms,
p99 21.6 ms and maximum 55.9 ms. The rubble-cell count rose from 1 to 23; 55 ms long tasks occurred
near two later destruction events. These are individual observations, not stable tail-latency
estimates. The synthetic fast-forward's 621 ms CPU cost is not a live gameplay freeze.

Three full rebuilds measured 326-340 ms (median 327.5): ground about 191 ms, roads 63 ms, buildings
15 ms. Three direct dirty rebuilds measured 30-37 ms. Dirty timings exclude the deferred parcel
repack and are not complete road-placement latency. Steady-state FPS and reconstruction stalls
need separate budgets.

Raw data: [measurement record](../perf/reviews/large-demo-v14-2026-09-05.json).
The [Chrome CPU profile](../perf/reviews/large-demo-v14-2026-09-05.cpuprofile) can be imported in DevTools.
The record includes the fixture SHA-256, sample counts, runtime state and experiment conditions.
The earlier run with settings leaking between samples was discarded and is not in this record.

### Interactive tools and display size

The completion pass uses the same fixture and GPU, but with the toolbar **collapsed**. Do not
interpret differences against the expanded-toolbar table above as code improvements. Settings
are cleared on each navigation; waves alone are disabled and the frame cap is Max.

- With the city running, a stationary pointer and selection-mode pointer movement both measured
  about 75 FPS. Road-preview movement measured 42 FPS, and zone-brush movement 46 FPS. Each probe
  sent 100 pointer moves with at least 15 ms between them; these are repeatable scripted workloads,
  not a fixed-frequency hardware mouse trace. Vehicle follow measured 73 FPS in a four-second sample.
- The shared `groundPoint` at `src/render/drawTool.ts:400` calls triangle picking for each move.
  Runtime inspection confirms 456,976 vertices, 911,250 triangles and one ground submesh. The
  dependency's triangle picker scans the submesh indices. Mean pick cost was 18-19 ms initially;
  two fresh-load confirmations measured 17.7/17.5 ms and 43/43 FPS during active road preview.
  Spatially bounded terrain picking is the strongest new interactive-performance candidate.
  Preserve exact intersections on slopes and road cuts; a flat-plane replacement is not equivalent.
- Four commercial-zone brush clicks produced eight 84-116 ms long tasks and a maximum frame
  interval of 134 ms. This captures immediate work and delayed parcel repacking, unlike the earlier
  direct dirty-rebuild timings. It does not attribute every millisecond to hidden overlays.

Two fresh-load rounds, 1.8-second warmup and full 3.5-second windows, gave these daytime results:

| View | Actual render buffer | FPS range | p95 frame time |
| --- | --- | ---: | ---: |
| Saved camera, 1280x800, DPR 1 | 1280x800 | 82-83 | 13.2-13.3 ms |
| Street, radius 140 | 1280x800 | 97 | 11.6-11.7 ms |
| Overview, radius 1200 | 1280x800 | 83 | 13.4-13.5 ms |
| Saved camera, 1920x1080, DPR 2 | 2880x1620 | 69 | 16.3-16.8 ms |

The existing 1.5x pixel-ratio cap works. The larger viewport changes aspect ratio as well as pixel
count, so this is a display-configuration comparison, not an isolated GPU fill-rate measurement.
Street and high-resolution screenshots were inspected: both show the populated reference city.

### Speed, resource lifetime and residual uploads

Separate 30-second fresh-load observations measured 73.7 FPS at x1 and 69.7 FPS at x4, with p95
17.8/19.0 ms and maximum frame intervals 50.2/89.3 ms. These single samples are not stable tail
estimates; accelerated simulation advances farther through construction and daylight.

Ten full rebuilds kept 2,650 meshes, 610 materials, 1,040 geometries and eight before-render
observers, with post-GC JS heap moving from 147.1 to 149.5 MB. Ten in-page loads of the **Review**
slot kept the same counts, 11 scene textures and 13 internal textures; heap moved from 147.3 to
150.6 MB. Five actual road-create/bulldoze/restore cycles changed segments 132 -> 139 -> 138 -> 132
each time and restored the same resource counts. Heap increased from 148.1 to 180.9 MB on the first
cycle, then to 183.7 MB by cycle five. This is not evidence of an unbounded resource leak; the
first-use retained allocation deserves separation from repeated growth. Babylon also lazily caches
terrain positions as Vector3 objects for picking; the probe does not isolate that allocation. These counters do not
measure GPU memory bytes or prove hour-long stability. An initial load test selected Demo by
mistake; its load/edit results were discarded and replaced by the asserted Review-slot test.

Twelve-second upload observations counted 58 tree-shadow matrix replacements / 9.38 MB at x1,
and 231 / 37.37 MB at x4, following displayed simulation minutes. The upload method itself took
16.9/67.4 ms total, excluding matrix construction. Empty explosion matrices were still replaced
949/927 times, with zero payload and only 36.4/29.7 ms total method time. A no-active-effects guard
is a small cleanup candidate, not a major FPS gain. Building uploads remain batched, not per-frame.

The same observation exposed a correctness risk: four autosave writes occurred at x1, none at x4.
`maybeAutosaveClock` requests a save every 15 displayed minutes (about 0.78 real seconds at x4),
while `createAutosave` restarts a two-second debounce on every request. Sustained accelerated play
can therefore indefinitely defer persistence. A bounded maximum wait must accompany any save
batching optimization; lower write frequency is not a performance win when progress is not saved.

A subsequent three-minute x4 run after the five edit/restore cycles confirmed **zero autosave
writes**, followed by one write 2.5 seconds after pausing. Saved elapsed time stayed at 13,944.55 s
throughout play and then became 14,666.11 s. The city advanced from day 7 at 10:17 to day 9 at 20:00.
Its three one-minute windows measured 53.9/52.5/50.0 FPS, p95 37.1/35.5/33.9 ms and maxima
200/207/167 ms. This longer day/night workload exposes stalls absent from short daylight samples;
the probe does not identify their individual causes or establish progressive slowdown. Scene
meshes/materials/geometries/observers remained constant; internal textures warmed from 13 to 17
and stayed there. Post-GC heap was 191.8/194.9/195.4 MB at the minute boundaries. Forced collections
are outside the measured frame windows. Three minutes is a bounded soak, not an hour-long test.

### Production startup

A fresh production build (`npm run build`, then Vite preview) was tested separately from gameplay.
The ready condition requires all 28 models and 1,287 buildings, not merely the first WebGL draw.
Two cold-cache local loads took 1.86/1.94 s to reach that condition; first draw was at 591/587 ms.
A warmed-cache reload took 1.86 s, first draw at 515 ms. This points to meaningful initialization
work beyond network transfer, but does not isolate shader compilation from CPU scene creation.

Cold resource transfers totalled 2.53 MB over 126 resources, excluding the HTML document: 1.82 MB
of GLBs and 0.68 MB of JavaScript. The 1.20 MB minified main chunk alone is not the complete load.
With simulated 10 Mbit/s, 40 ms latency and 4x CPU slowdown, one cold load took 9.43 s; first draw
was at 2.50 s. This is a diagnostic throttled desktop run, **not a measured mobile device**.
Loading/readiness instrumentation should remain separate from steady-state FPS benchmarks.

Completion evidence: [interaction, display, loading and lifetime record](../perf/reviews/large-demo-v14-2026-09-05-completion.json).

## Historical measurements

The remaining sections describe earlier fixtures and builds, not the replacement city above.

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

The 2026-09-03 built-demo harness run on `c9321ea` is smaller than the reference city but no
longer empty: 101 buildings, 237 cars, and 42 active meshes. Its one-round software-rasteriser
ablation measured traffic as the clearest current win, not buildings: overview traffic off x1.09,
street traffic off x1.18, and all three of buildings / traffic / shadows off x1.17 overview and
x1.30 street. That keeps the current chain order honest: building upload work may still matter for
CPU churn, but it is no longer justified by an empty-city `buildings off` ratio.

The req_037 CPU gates are still worth keeping for churn: building state uploads are skipped when
the visible state signature is unchanged, supplied utilities are cached on `graph.revision`, the
sun fan-out only runs when the displayed minute changes, and traffic yield/crossing occupancy is
indexed once per frame. They do not reduce mesh counts, and the final clean perf row above did not
prove an fps gain.

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
