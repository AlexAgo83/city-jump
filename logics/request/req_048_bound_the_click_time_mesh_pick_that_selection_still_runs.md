## req_048_bound_the_click_time_mesh_pick_that_selection_still_runs - Bound the click-time mesh pick that selection still runs
> From version: 0.5.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 09:49:38

# AI Context
- Summary: Selection still runs a whole-scene `scene.pick` on click, which costs about 20 ms per pick on the large city.
- Keywords: bound, click, time, mesh, pick, selection, still, runs
- Use when: changing click-time selection or vehicle picking in `src/render/drawTool.ts`.
- Skip when: changing pointer-move ground picking, which req_047 already bounded.

# Needs
- A click on the city should not cost a fifth of a second's worth of frame time.

# Context
- Found while measuring req_047, not caused by it. `src/render/drawTool.ts:335` calls
  `scene.pick(pointerX, pointerY, m => m.name.startsWith("traffic_"))` to find a clicked vehicle.
- On the `large-demo-v14` fixture the review probes measure it at 19-21 ms per pick: `zone-paint`
  20.5 ms over 16 picks, `bulldoze-clicks` 19.2 ms over 12. Every other measured pick fell to
  under the probe's resolution once req_047 bounded the pointer-move ground pick.
- It costs a frame on click rather than every pointer move, which is why it was left out of
  req_047's scope rather than folded into it.

# Acceptance criteria
- AC1: Clicking to select on the reference city no longer performs unbounded intersection work,
  and the same vehicle, building, utility, road or tree is selected as before.
- AC2: The cost is measured on `large-demo-v14` with the review probes, before and after, under
  the same workload, simulation rate, renderer and camera state.
- AC3: A miss still clears the selection.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `src/render/drawTool.ts`
- `src/render/terrainPick.ts`
- `scripts/review/interactions.mjs`

# Backlog
- none
