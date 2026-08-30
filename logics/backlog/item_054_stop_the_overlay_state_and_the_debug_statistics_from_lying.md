## item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying - Stop the overlay state and the debug statistics from lying
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:42:38

# AI Context
- Summary: Three things report something untrue: `onRoadMode` kills the traffic overlay while its radio still reads Traffic, `startupModelCount` is a constant zero by construction, and the reported building count is an app-local copy the renderer updates behind its back.
- Keywords: overlay, state, debug, statistics, lying
- Use when: Working on overlay/view state in `src/app/app.ts` and `src/ui/controls.ts`, or on the statistics object behind the debug API.
- Skip when: The work redesigns the debug API, changes how building models load, or reworks the Select view and toolbar layout.

# Problem
- `src/app/app.ts` around line 175, inside `onRoadMode`, runs `if (!zoning) roads.setShowTraffic(false)`. Any change of road tool mode therefore switches the traffic lane overlay off, while the `select-view` radio in the UI still reads `Traffic`. The control and the thing it controls disagree, and nothing puts them back in step.
- `src/ui/controls.ts` already has the right primitive for this: `currentSelectView()` reads the checked radio, and the tool-button handler calls `handlers.onSelectView(currentSelectView())` when the select tool is chosen. The road-mode path does not.
- `src/render/buildings.ts` around line 334 computes `const startupModelCount = available.length` immediately after firing the `loadModel` promises, so it is always 0. Whatever it was meant to report -- probably that no model blocked startup -- it does not report it, because a constant that cannot be anything but zero proves nothing.
- `src/app/app.ts` around line 304 reports `buildings: buildingCount` from a variable the app updates only in its own `rebuild` and in the visibility handlers. The building renderer also calls its own `rebuild` from each model-load callback, which updates `lastPlaced` without the app seeing it, so the reported count is stale while models are still arriving. The renderer already exposes a `count()` accessor for exactly this, and nothing calls it.

# Scope
- In:
  - Make the traffic overlay derive from one source of truth. Either drop the line in `onRoadMode` or re-apply the current select view after a mode change, so the radio and the overlay cannot disagree.
  - Fix or remove `startupModelCount`. If the intent is an assertion that startup does not block on models, express it as something that could fail; if it is not needed, delete it and its reporting.
  - Report `buildings` through `buildings.count()` rather than the app-local `buildingCount`, and remove the local variable if nothing else needs it.
  - Check the other entries of the statistics object for the same staleness pattern while in there.
  - Whatever the browser interaction suite already asserts about these statistics must keep passing, and should be extended if the fix makes a previously untestable claim testable.
- Out:
  - Redesigning the debug API or the statistics it exposes.
  - Changing how building models are loaded, or making loading synchronous again.
  - Reworking the Select view or the toolbar layout.

# Acceptance criteria
- AC1: Changing the road tool mode cannot leave the traffic overlay and the Select view radio in disagreement.
- AC2: `startupModelCount` either reports something that can vary, or is gone.
- AC3: The reported building count is correct while models are still arriving, sourced from the renderer rather than an app-local copy.
- AC4: The browser interaction suite still passes.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Changing the road tool mode cannot leave the traffic overlay and the Select view radio in disagreement.
- request-AC5 -> This backlog slice. Proof: AC2: `startupModelCount` either reports something that can vary, or is gone.
- request-AC10 -> This backlog slice. Proof: AC3: The reported building count is correct while models are still arriving, sourced from the renderer rather than an app-local copy.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)
- Request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
- Primary task(s): `task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
