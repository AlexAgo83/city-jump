## item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets - Batch static city geometry by spatial tiles with shared assets
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 18:53:55

# AI Context
- Summary: Buildings, tree species and streetlight geometry force global meshes active. Thin-instance bounds span the city and cannot reject individual instances.
- Keywords: batch, static, city, geometry, spatial, tiles, shared, assets
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Network/disk streaming or unloading shared models based on camera distance.

# Problem
- Buildings, tree species and streetlight geometry force global meshes active. Thin-instance bounds span the city and cannot reject individual instances.
- Grouping by tiles can reduce submitted geometry near the camera but can worsen overview traversal and draw calls.

# Scope
- In:
  - Priority rationale: City-wide thin-instance groups prevent useful spatial rejection, but more batches can increase draw calls.
  - Depends on: baseline, automatic building detail and completed high-priority lighting/traffic/CPU slices so the final policies are known.
  - Prototype buildings first with 256 m and 512 m tiles using floor(x/size), floor(z/size) including negative coordinates. Share model geometry/materials; one batch per occupied tile/model. Expand bounds to real geometry extent rather than parcel centers.
  - Reuse the same local pattern for trees and separately assess streetlight poles/arms/bulbs. No universal chunk manager unless multiple working renderers actually need a small shared helper. Keep global batching as the A/B control and remove unhelpful prototypes.
  - Let native frustum checks reject render batches with valid aggregate bounds; avoid setEnabled-based main-camera rejection that drops necessary offscreen shadow casters. Choose explicit per-tile near/far detail only if it improves on the prior global detail result.
  - Preserve parcel/tree/light semantic identity independently of batch index; state changes and async model arrivals update affected batches. Dirty edits use one preserve/recreate predicate expanded by geometry influence per run_008.
  - Cover decoration/contact-shadow/ground-pad batches as part of building visibility accounting, and dispose tile-owned buffers without disposing shared geometry/materials. Do not rebuild all matrices on every camera move.
- Out:
  - Network/disk streaming or unloading shared models based on camera distance.
  - Rewriting road meshes or treating one tile size as proven before measurement.

# Acceptance criteria
- AC1: Boundary and negative-coordinate checks prove full/dirty scene equivalence; edits, zone switches, construction, destruction and load retain object identity and pick results.
- AC2: Outside-frustum tiles are actually rejected, while offscreen casters still shadow visible receivers; render counts and uploads show the intended bounded work.
- AC3: Each of buildings, trees and streetlight geometry has its own A/B decision, including overview/district/street and camera movement. Keep only qualifying variants and document tile size, draw-call tradeoff and rejected variants.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Boundary and negative-coordinate checks prove full/dirty scene equivalence; edits, zone switches, construction, destruction and load retain object identity and pick results.
- request-AC9 -> This backlog slice. Proof: AC2: Outside-frustum tiles are actually rejected, while offscreen casters still shadow visible receivers; render counts and uploads show the intended bounded work.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: Medium
- Rationale: City-wide thin-instance groups prevent useful spatial rejection, but more batches can increase draw calls.

# Outcome
- Rejected on 2026-09-07 before any tile implementation, on measurement. No spatial batching ships for buildings, trees or streetlight geometry; global thin-instance batching stays as it is.
- AC3's three separate decisions, each three rounds against the integrated baseline, read as per-round paired deltas.
  - Buildings. Total cost of the geometry, measured by hiding it outright (`perf/reviews/task055-wave4-ceiling-buildings/`): day-street +12.6%, day-district +19.3%, day-overview +3.1%, moving +39.5%. The overview figure is small because `item_189` already draws boxes there.
  - Buildings, achievable share. At camera radius 140, 609 of 1287 buildings are inside the frustum; at 600, 1102 of 1287; at 1200, all of them. So a perfect spatial scheme could reject at most 53% / 14% / 0%.
  - Buildings, exact ceiling. `perf/reviews/task055-wave4-perfectcull/` keeps only the in-frustum building instances at a still camera -- ideal granularity, no added draw calls, which is strictly better than any tile grid can be. It removes 1316 of 2574 instances and buys day-district -0.0% and day-street -4.3%.
  - Trees (`.../ceiling-trees/`): day-street -4.3%, day-district +1.9%, day-overview +0.0%, moving +24.7%. Only one framing carries any cost, and it is the one where just 14% of the city is offscreen.
  - Streetlight geometry (`.../ceiling-streetgeo/`): +0.0% / -2.2% / +6.1% / +2.4%, with the overview figure unstable across rounds (+6.1 / +6.7 / -4.1). Nothing to reclaim.
- The reason, and it invalidates the slice's premise rather than just failing its threshold: removing 49% of the building instances buys nothing, while removing 100% buys 12.6%. The cost is not proportional to submitted instances -- it is a fixed per-mesh and per-material cost. Tile batching moves in the wrong direction on exactly that axis, since one batch per occupied tile per model multiplies meshes to reduce instances whose reduction is free.
- Trees and streetlight geometry are closed on the same evidence without their own perfect-cull run. Stated as the inference it is: their ceilings are at or near zero everywhere except trees at `moving`, where the offscreen share is 14%, and the building result shows that culling half the instances of a far more expensive geometry returns nothing.
- Probe change made here and kept: an ablation that reaches no instances now throws instead of returning a sample. A null result must mean "no gain", never "no measurement" -- the distinction cost four discarded lighting runs earlier in this task.

# Tasks
- `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Notes
- Task `task_055_deliver_and_validate_the_distance_aware_performance_slices` was finished via `logics-manager flow finish task` on 2026-09-07.
