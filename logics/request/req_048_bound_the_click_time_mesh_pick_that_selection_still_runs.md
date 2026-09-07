## req_048_bound_the_click_time_mesh_pick_that_selection_still_runs - Bound the click-time mesh pick that selection still runs
> From version: 0.5.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 10:25:08

# AI Context
- Summary: Selection still runs a whole-scene `scene.pick` on click, which costs about 20 ms per pick on the large city.
- Keywords: bound, click, time, mesh, pick, selection, still, runs
- Use when: changing click-time selection or vehicle picking in `src/render/drawTool.ts`.
- Skip when: changing pointer-move ground picking, which req_047 already bounded.

# Needs
- A click on the city should not cost a fifth of a second's worth of frame time.

# Context
- Found while measuring req_047, not caused by it. On the `large-demo-v14` fixture the review
  probes measure 19-21 ms per pick at click time: `zone-paint` 20.5 ms over 16 picks,
  `bulldoze-clicks` 19.2 ms over 12. Every pointer-move pick fell below the probe's resolution
  once req_047 bounded the ground pick.
- Two sources, both unbounded scene picks:
  - Babylon's own. `zone-paint` records four picks per click in zone mode, a tool whose click path
    calls `scene.pick` nowhere: they are the picks Babylon runs to fill `pickInfo` for
    `scene.onPointerObservable`. Nothing in `src/` reads `pickInfo` -- the handlers work from
    `scene.pointerX`/`pointerY` and pick for themselves -- so the work is entirely wasted.
    `Scene` exposes `skipPointerMovePicking`, `skipPointerDownPicking` and `skipPointerUpPicking`;
    none is set.
  - The app's own, in view mode. `src/render/drawTool.ts:335` calls
    `scene.pick(pointerX, pointerY, m => m.name.startsWith("traffic_"))` to find a clicked vehicle.
    Vehicles are ~166 pickable `InstancedMesh` car bodies, ray-tested triangle by triangle. The
    probes never click in view mode, so this one is unmeasured but is the same work.
- It costs a frame on click rather than every pointer move, which is why req_047 left it out of
  scope rather than folding it in.

# Scope
- In:
  - the picks Babylon runs for pointer events whose result nothing reads
  - the click-time vehicle pick in `drawTool.selectMesh`
- Out:
  - what is selected once a target is known, and the selection panel
  - pointer-move ground picking, which req_047 already bounded

# Dependencies and risks
- Depends on req_045's repaired measurement scripts for any before/after number.
- Risk: turning off Babylon's pointer picking also removes `pickInfo` from
  `scene.onPointerObservable` and stops `ActionManager` pointer triggers firing. Neither is used
  in `src/` today; a check has to hold that.

# Acceptance criteria
- AC1: A pointer event no longer runs a scene pick whose result nothing reads, and pointer
  handling -- selection, drawing, zoning, bulldozing, camera -- behaves as before.
- AC2: Clicking a vehicle in view mode no longer ray-tests every car body's triangles, and picks
  the same vehicle a full pick would.
- AC3: The cost is measured on `large-demo-v14` with the review probes, before and after, under
  the same workload, simulation rate, renderer and camera state.
- AC4: A miss still clears the selection.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `src/render/drawTool.ts`
- `src/render/terrainPick.ts`
- `scripts/review/interactions.mjs`

# Backlog
- `item_173_bound_the_click_time_mesh_pick_that_selection_still_runs`
