## item_188_cull_distant_traffic_visuals_without_stopping_the_simulation - Cull distant traffic visuals without stopping the simulation
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 16:13:12

# AI Context
- Summary: The current traffic mover loop updates every mover with no camera-distance visibility policy; the old documented 320 m to 2 km reach is absent.
- Keywords: cull, distant, traffic, visuals, stopping, simulation
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Stopping, thinning or slowing offscreen simulation.

# Problem
- The current traffic mover loop updates every mover with no camera-distance visibility policy; the old documented 320 m to 2 km reach is absent.
- Existing setEnabled(false) clears movers and is unsuitable as distance culling.

# Scope
- In:
  - Priority rationale: A bounded visibility pass is the smallest distance experiment; daytime traffic-off showed a cost but includes simulation.
  - Depends on: benchmark baseline. Trace trafficMovers, vehicleModels, vehicleLights, detail and app follow/selection together before editing.
  - Keep movers and logical positions in simulation. Check horizontal distance to the current camera target at 200 ms cadence, also on load/rebuild/teleport; initial candidate reach clamp(camera.radius * 2.3, 320, 2000) metres, with 15% extra exit reach for hysteresis. Treat these as measured initial tuning, not accepted universal values.
  - Hide or re-enable the visual root and children with a single visibility composition that respects user traffic, detail-level and view choices. Match headlights to stable mover identity, not visible-list position; disable distant beams without reallocating lights.
  - Keep the selected/followed vehicle visible and targetable; pause still responds to camera movement. Bound any late entry after camera motion and preserve offscreen routes, junction queues and occupancy.
  - Reuse current renderer hooks and distance squared; no ECS, global scene registry or simulation LOD. Consider skipping transform uploads only after logical position and follow stop depending on those visual transforms.
- Out:
  - Stopping, thinning or slowing offscreen simulation.
  - Converting all traffic to thin instances without a separate measured need.

# Acceptance criteria
- AC1: A focused check covers enter/exit hysteresis, paused camera movement, spawned movers, follow exemption and composition with pedestrian/part detail thresholds.
- AC2: Offscreen simulation positions, queues and counts match unculled execution for the same steps; no extra lights or meshes are created during camera travel.
- AC3: Headed street/district/overview A/B uses render-only visibility, with e2e selection/follow and night checks; retain only under the shared measurement rule. If the first candidate fails, record the result and revise the approach before claiming request AC2; a rejected traffic prototype alone does not satisfy the required distance behavior.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A focused check covers enter/exit hysteresis, paused camera movement, spawned movers, follow exemption and composition with pedestrian/part detail thresholds.
- request-AC9 -> This backlog slice. Proof: AC2: Offscreen simulation positions, queues and counts match unculled execution for the same steps; no extra lights or meshes are created during camera travel.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: High
- Rationale: A bounded visibility pass is the smallest distance experiment; daytime traffic-off showed a cost but includes simulation.

# Outcome
- Rejected by measurement on 2026-09-07. Two candidates were prototyped and both removed; see the Report section of `task_055_deliver_and_validate_the_distance_aware_performance_slices` for the full figures.
- Conservative reach `clamp(camera.radius * 2.3, 320, 2000)` m: `perf/reviews/task055-wave2-traffic-retry/`, three rounds, best gain +2.1% frame p50.
- Tuned reach `clamp(camera.radius * 1.2, 180, 1100)` m: `perf/reviews/task055-wave2-traffic-tuned-full/`, three rounds, frame p50 between -1.9% and +1.1%.
- AC1 and AC2 held in the prototype: focused checks covered hysteresis, paused camera travel, spawned movers and follow exemption, and offscreen queues, counts and light allocation matched unculled execution. AC3 fails: no headed A/B reaches the shared retention threshold, so nothing is retained.
- Root cause of the null result: culling removed up to 20.9% of active meshes at follow without moving frame time. These scenarios are not bound by traffic mesh count. The distance behavior request AC2 asks for must come from `item_189`, where the 1287 buildings dominate the mesh population against 166 vehicles.
