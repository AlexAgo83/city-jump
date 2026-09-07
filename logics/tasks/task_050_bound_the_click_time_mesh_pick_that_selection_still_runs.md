## task_050_bound_the_click_time_mesh_pick_that_selection_still_runs - Bound the click-time mesh pick that selection still runs
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Turn off the pointer picks nothing reads, and bound the view-mode vehicle pick to the movers' own bounding spheres.
- Keywords: bound, click, time, mesh, pick, selection, still, runs
- Use when: changing pointer handling in `src/render/drawTool.ts` or the scene's pointer picking configuration in `src/render/scene.ts`.
- Skip when: changing pointer-move ground picking, which req_047 already bounded in `src/render/terrainPick.ts`.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_173_bound_the_click_time_mesh_pick_that_selection_still_runs`

# Acceptance criteria
- AC1: A pointer event no longer runs a scene pick whose result nothing reads, and pointer handling -- selection, drawing, zoning, bulldozing, camera -- behaves as before.
- AC2: Clicking a vehicle in view mode no longer ray-tests every car body's triangles, and picks the same vehicle a full pick would.
- AC3: The cost is measured on `large-demo-v14` with the review probes, before and after, under the same workload, simulation rate, renderer and camera state.
- AC4: A miss still clears the selection.

# Plan
- [ ] 1. Record the before number: `npm run perf:review -- --probe interactions`, headed, on
      `large-demo-v14`. Keep `zone-paint` and `bulldoze-clicks` picking means.
- [ ] 2. Confirm nothing reads what is about to be turned off: no `pickInfo` use in `src/`, and no
      `ActionManager` pointer trigger. If either appears, the flags are the wrong fix and the
      pointer predicates are the fallback.
- [ ] 3. Set `skipPointerMovePicking`, `skipPointerDownPicking` and `skipPointerUpPicking` on the
      scene, next to the rest of its setup, with the reason written down.
- [ ] 4. Replace the `scene.pick` in `drawTool.selectMesh` with a bounded pass the traffic renderer
      owns: the picking ray against each mover's bounding sphere, nearest along the ray. It keeps
      the screen-space accuracy a click on a small car needs, which the 14 m `vehicleAt` fallback
      does not have.
- [ ] 5. Cover it: a headless-Babylon check that the ray picks the nearer of two cars and misses
      when it points at neither, and that a miss still clears the selection.
- [ ] 6. Run `npm run test:e2e`, which drives selection, drawing, zoning and bulldozing through
      real pointer events -- the suite that would catch a pointer path broken by step 3.
- [ ] 7. Record the after number the same way as step 1, and write both into `docs/performance.md`.
- [ ] 8. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and
      leave the repo commit-ready.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_048_bound_the_click_time_mesh_pick_that_selection_still_runs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
