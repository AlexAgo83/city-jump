## task_050_bound_the_click_time_mesh_pick_that_selection_still_runs - Bound the click-time mesh pick that selection still runs
> From version: 0.5.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-09-07 10:25:09

# AI Context
- Summary: Turn off the pointer picks nothing reads, and bound the view-mode vehicle pick to the movers' own bounding spheres.
- Keywords: bound, click, time, mesh, pick, selection, still, runs
- Use when: changing pointer handling in `src/render/drawTool.ts` or the scene's pointer picking configuration in `src/render/scene.ts`.
- Skip when: changing pointer-move ground picking, which req_047 already bounded in `src/render/terrainPick.ts`.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_173_bound_the_click_time_mesh_pick_that_selection_still_runs`

# Acceptance criteria
- AC1: A pointer event no longer runs a scene pick whose result nothing reads, and pointer handling -- selection, drawing, zoning, bulldozing, camera -- behaves as before.
- AC2: Clicking a vehicle in view mode no longer ray-tests every car body's triangles, and picks the same vehicle a full pick would.
- AC3: The cost is measured on `large-demo-v14` with the review probes, before and after, under the same workload, simulation rate, renderer and camera state.
- AC4: A miss still clears the selection.

# Plan
- [x] 1. Record the before number: `npm run perf:review -- --probe interactions`, headed, on
      `large-demo-v14`. Keep `zone-paint` and `bulldoze-clicks` picking means.
- [x] 2. Confirm nothing reads what is about to be turned off: no `pickInfo` use in `src/`, and no
      `ActionManager` pointer trigger. If either appears, the flags are the wrong fix and the
      pointer predicates are the fallback.
- [x] 3. Set `skipPointerMovePicking`, `skipPointerDownPicking` and `skipPointerUpPicking` on the
      scene, next to the rest of its setup, with the reason written down.
- [x] 4. Replace the `scene.pick` in `drawTool.selectMesh` with a bounded pass the traffic renderer
      owns: the picking ray against each mover's bounding sphere, nearest along the ray. It keeps
      the screen-space accuracy a click on a small car needs, which the 14 m `vehicleAt` fallback
      does not have.
- [x] 5. Cover it: a headless-Babylon check that the ray picks the nearer of two cars and misses
      when it points at neither, and that a miss still clears the selection.
- [x] 6. Run `npm run test:e2e`, which drives selection, drawing, zoning and bulldozing through
      real pointer events -- the suite that would catch a pointer path broken by step 3.
- [x] 7. Record the after number the same way as step 1, and write both into `docs/performance.md`.
- [x] 8. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and
      leave the repo commit-ready.

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-09-07
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- AC1, partly by a different route than planned. The pointer-down pick is skipped outright
- Finished on 2026-09-07.
- Linked backlog item(s): `item_173_bound_the_click_time_mesh_pick_that_selection_still_runs`
- Related request(s): `req_048_bound_the_click_time_mesh_pick_that_selection_still_runs`
  (`scene.skipPointerDownPicking`), and nothing reads it. The pointer-up pick could not be: the
  interaction suite fails with `skipPointerUpPicking`, and fails again with
  `pointerUpPredicate = () => false`, but passes with a predicate admitting only the ground.
  Something on release reads that ground hit. Rather than keep hunting the consumer, the ground
  was made cheap to hit: `createGround` gives the ground mesh an `intersects` that walks the
  heightmap grid -- the same walk `pickHeightmap` does for the drawing tools, already held to a
  full triangle scan by `src/render/terrainPick.test.ts` -- so the pick returns the same point for
  a fraction of the work. Every ground pick in the app and in the review harness got cheap with it.
- AC2: `drawTool.selectMesh` casts the picking ray at each mover's bounding sphere and takes the
  nearest, instead of `scene.pick` ray-testing 166 car bodies triangle by triangle. Covered in
  `src/render/trafficMovers.test.ts`: straight down onto a car, two misses, and a sweep along the
  road asserting the first car reached is the one returned. `vehicleByMesh` had no other caller
  and was deleted.
- AC3, measured on `large-demo-v14`, headed, running at simulation rate 1, both runs through
  `npm run perf:review -- --probe interactions`:
  - `zone-paint`: 8 picks at 19.97 ms -> 4 picks at 0.58 ms; 78.6 -> 86.7 fps.
  - `bulldoze-clicks`: 6 picks at 18.08 ms -> 3 picks at 0.30 ms.
  - Half the picks gone with the down skip; the remaining one costs a thirtieth of what it did.
- AC4: unchanged and covered by the interaction suite -- a click that hits no vehicle falls through
  to `selectAt`, which clears the selection when it finds nothing.
- Note for whoever comes next: the pointer-up consumer of the ground hit is still unidentified. It
  no longer costs anything, so it was not worth more runs to name it, but it is a real dependency
  and not a suspicion -- three suite runs either side of it say so.

# Links
- Request: `req_048_bound_the_click_time_mesh_pick_that_selection_still_runs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 2ebb402 and 5885103; validated with npm run ci and npm run test:e2e, and measured on large-demo-v14: zone-paint 8 picks at 19.97 ms -> 4 at 0.58 ms, bulldoze-clicks 6 at 18.08 ms -> 3 at 0.30 ms. Source: `5885103`
- request-AC2 -> This task. Proof: Implemented in 2ebb402 and 5885103; validated with npm run ci and npm run test:e2e, and measured on large-demo-v14: zone-paint 8 picks at 19.97 ms -> 4 at 0.58 ms, bulldoze-clicks 6 at 18.08 ms -> 3 at 0.30 ms. Source: `5885103`
- request-AC3 -> This task. Proof: Implemented in 2ebb402 and 5885103; validated with npm run ci and npm run test:e2e, and measured on large-demo-v14: zone-paint 8 picks at 19.97 ms -> 4 at 0.58 ms, bulldoze-clicks 6 at 18.08 ms -> 3 at 0.30 ms. Source: `5885103`
- request-AC4 -> This task. Proof: Implemented in 2ebb402 and 5885103; validated with npm run ci and npm run test:e2e, and measured on large-demo-v14: zone-paint 8 picks at 19.97 ms -> 4 at 0.58 ms, bulldoze-clicks 6 at 18.08 ms -> 3 at 0.30 ms. Source: `5885103`
