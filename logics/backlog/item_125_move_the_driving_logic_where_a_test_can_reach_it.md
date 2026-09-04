## item_125_move_the_driving_logic_where_a_test_can_reach_it - Move the driving logic where a test can reach it
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 78%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: Three steps, and the third is gated on an observable condition instead of an owner's call: the move to sim happens if and only if headless tests for the driving logic exist and pass. Verified that nothing blocks it -- the two render imports are three constants and a pure predicate.
- Keywords: traffic split, vehicleModels, driving.ts, Mover mesh field, conditional gate, adr_006
- Use when: splitting traffic.ts, buildings.ts or roadMesh.ts, after req_037 has finished with those hot paths.
- Skip when: changing driving, yielding or lane behaviour, or adding an abstraction over Babylon. Do not skip step C for lack of a decision -- adr_006 already made it conditional.

# Problem
- src/render/traffic.ts is 1644 lines holding three unrelated things: a vehicle catalogue and prototype mesh assembly at :268-853 with no knowledge of driving, the driving simulation at :855-1568, and the renderer proper.
- The driving half holds the project's most intricate rules -- right-of-way, lane changes, per-lane queueing, roundabout yielding -- with no unit tests beyond the eleven pure helpers already exported at :155-259. Its only coverage is the browser suite, which CONTRIBUTING.md deliberately keeps out of CI.
- The seam was verified, not assumed. `Mover` carries exactly one Babylon field, `readonly mesh: Mesh | InstancedMesh`; every other field is a number, a project type or a graph reference, and `heading`/`pitch` are already plain numbers only written to the mesh at frame end. `Ride` is entirely platform-neutral -- `Vec3` is the project's own interface from src/sim/vec.ts. The file already imports nine sim modules.
- Its only two render imports are ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH -- three numeric constants -- and streetlightsOnAt(hour), a pure predicate. Neither is Babylon-bound, so neither blocks the move. They are misfiled and travel with it.
- src/render/buildings.ts (1335 lines) and src/render/roadMesh.ts (1298) split the same way; roadMesh.ts:358 additionally rebuilds the whole city to toggle a debug overlay.
- The catch that made step C look like an owner's decision: moving code does not test it. The move unlocks testability and delivers no tests. adr_006 turns that catch into the gate rather than into a question.

# Scope
- In:
  - Step A, unconditional: extract render/vehicleModels.ts from :268-853. No behavioural surface, no dependency on the rest of this item.
  - Step B, unconditional: extract the driving logic to render/driving.ts. Same layer, so no architecture rule changes and the step is reversible by moving one file back. Write the headless tests against it here -- this is the step that earns the rest.
  - Step C, gated by adr_006: move driving.ts to src/sim/traffic.ts, splitting Mover into platform-neutral state plus a render-side Map<Mover, Mesh> that owns position, rotation and dispose. Proceed if and only if the step B tests exist and pass. Otherwise leave it in render/ and close this item as no-change, recording that the tests were not written.
  - Carry ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH and streetlightsOnAt out of render/ with step C.
  - Keep the frame loop in render/: step C moves the rules, not scene.registerBeforeRender. The loop calls a stepping function with its delta, as CityEconomy.advance(parcels, seconds) already is.
  - render/decorMeshes.ts for the 300 lines of roof and foot decor at src/render/buildings.ts:614-916, and the already-exported placement maths into its own module.
  - Separate the Traffic-view overlays in roadMesh.ts so setShowTraffic stops triggering a full rebuild.
- Out:
  - Changing driving, yielding or lane behaviour. Any defect found on the way -- item_116's ring lanes is the likely one -- is raised against req_035, not fixed here.
  - Adding an abstraction over Babylon. A Map<Mover, Mesh> is not one.
  - Asking whether step C should happen: adr_006 decided that, conditionally.

# Acceptance criteria
- AC1: render/traffic.ts is under about 300 lines and holds only the renderer.
- AC2: The driving logic has headless unit tests that run without a browser, covering at least right-of-way, lane changes and per-lane queueing.
- AC3: Step C happened if and only if AC2 was met; if it was not, this item is closed as no-change with that recorded.
- AC4: If step C happened, the architecture test covers the driving logic as simulation code and would fail on a Babylon import or a browser global.
- AC5: Toggling the traffic overlay does not rebuild the city.
- AC6: Existing traffic and building coverage passes unedited, and the browser suite stays green.

# Decision framing
- Product framing: Not needed
- Architecture framing: Settled by `adr_006_move_the_driving_logic_to_sim_when_its_tests_exist_not_before`

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): `adr_006_move_the_driving_logic_to_sim_when_its_tests_exist_not_before`
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Steps A and B are safe and unconditional; step C is gated, so the item can no longer stall waiting for a decision.

# Tasks
- `task_041_orchestrate_the_structural_work`

# Notes
- The seam facts in Problem were verified against the code rather than reported: the Mover field count, the Ride purity, the nine sim imports and the two render imports were each checked.

# Validation
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts src/app/cityRebuild.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting src/render/vehicleModels.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts src/app/cityRebuild.test.ts, rtk npm run lint, and rtk npm run ci passed after moving the headless traffic rule helpers to src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm run lint, rtk npm exec -- vitest run src/render/traffic.test.ts, and rtk npm run ci passed after extracting src/render/vehicleLights.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after moving traffic mover types and queue helpers into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting speedForRoom and accelerateToward into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting landingDistance, segmentLimit, and roomAhead into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting stopTarget and atSegmentLimit into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting uTurnPath and trimTransferFromMover into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after extracting walkJunctionTransfer, walkRingTransfer, and ringTransfer into src/render/driving.ts.
