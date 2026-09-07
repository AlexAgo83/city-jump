## item_173_bound_the_click_time_mesh_pick_that_selection_still_runs - Bound the click-time mesh pick that selection still runs
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Stop the unbounded scene picks that run on every pointer event and on a view-mode click.
- Keywords: bound, click, time, mesh, pick, selection, still, runs
- Use when: changing pointer handling in `src/render/drawTool.ts` or the scene's pointer picking configuration.
- Skip when: changing pointer-move ground picking, which req_047 already bounded in `src/render/terrainPick.ts`.

# Problem
- A click on the large city costs 19-21 ms of picking: `zone-paint` measures 20.5 ms over 16 picks
  and `bulldoze-clicks` 19.2 ms over 12, on `large-demo-v14` with the headed review probes.
- Four of those picks land per click in zone mode, a tool whose click path calls `scene.pick`
  nowhere: they are Babylon's own, filling `pickInfo` for `scene.onPointerObservable`. No handler
  in `src/` reads `pickInfo` -- they work from `scene.pointerX`/`pointerY` and pick for themselves
  -- so the whole cost is wasted. `Scene` exposes `skipPointerMovePicking`,
  `skipPointerDownPicking` and `skipPointerUpPicking`; none is set.
- `src/render/drawTool.ts:335` adds one more in view mode, ray-testing ~166 pickable
  `InstancedMesh` car bodies triangle by triangle to find a clicked vehicle. The probes never click
  in view mode, so it is unmeasured, but it is the same work as the picks that are.

# Scope
- In:
  - the picks Babylon runs for pointer events whose result nothing reads
  - the click-time vehicle pick in `drawTool.selectMesh`, bounded rather than removed
- Out:
  - what is selected once a target is known, and the selection panel
  - pointer-move ground picking, which req_047 already bounded

# Acceptance criteria
- AC1: A pointer event no longer runs a scene pick whose result nothing reads, and pointer
  handling -- selection, drawing, zoning, bulldozing, camera -- behaves as before.
- AC2: Clicking a vehicle in view mode no longer ray-tests every car body's triangles, and picks
  the same vehicle a full pick would.
- AC3: The cost is measured on `large-demo-v14` with the review probes, before and after, under
  the same workload, simulation rate, renderer and camera state.
- AC4: A miss still clears the selection.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A pointer event no longer runs a scene pick whose result nothing reads, and pointer handling behaves as before.
- request-AC2 -> This backlog slice. Proof: AC2: Clicking a vehicle in view mode no longer ray-tests every car body's triangles, and picks the same vehicle a full pick would.
- request-AC3 -> This backlog slice. Proof: AC3: The cost is measured on `large-demo-v14` with the review probes, before and after, under the same conditions.
- request-AC4 -> This backlog slice. Proof: AC4: A miss still clears the selection.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_048_bound_the_click_time_mesh_pick_that_selection_still_runs.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: 19-21 ms on a click, on the largest measured city. It costs a dropped frame on an
  action the player takes deliberately, not the continuous cost req_047 removed.

# Notes
- Hybrid rationale: Derived from request `req_048_bound_the_click_time_mesh_pick_that_selection_still_runs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_048_bound_the_click_time_mesh_pick_that_selection_still_runs.md`.
- Generated locally by logics-manager.

# Tasks
- `task_050_bound_the_click_time_mesh_pick_that_selection_still_runs`
