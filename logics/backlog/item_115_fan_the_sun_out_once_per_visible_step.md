## item_115_fan_the_sun_out_once_per_visible_step - Fan the sun out once per visible step
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: A sun moving 0.0013 h per frame reaches five renderers, the worst rebuilding every tree shadow matrix. An absolute-difference guard is wrong across midnight, where 23.99 to 0.01 reads as a small change.
- Keywords: setClockHour, sun fan-out, midnight wrap, skybox lerp, tree shadows, DOM throttle
- Use when: touching the clock, the sun, or anything it fans out to.
- Skip when: changing day length, the sun path, the lighting look or the clock UI design.

# Problem
- src/app/app.ts:355 calls setClockHour unconditionally each frame for a sun moving 0.0013 h per frame at 60 fps, and each call reaches five renderers, the most expensive of which rebuilds every tree's shadow matrix and re-lerps the whole skybox.
- controls.setClock (src/ui/controls.ts:309) writes the DOM every frame for the same reason.

# Scope
- In:
  - Skip the fan-out below a visible step, comparing circularly or on a quantised hour so the midnight wrap is not read as a small change.
  - Force a fan-out on load and whenever timeRate changes.
  - Throttle controls.setClock independently of the renderers.
  - Hoist the per-mast array allocated inside the loop at src/render/signals.ts:186 to module scope.
- Out:
  - Changing the day length, the sun path or the lighting look.
  - Changing the clock UI design.

# Acceptance criteria
- AC1: Successive frames at a normal time rate do not each rebuild the skybox, the tree shadows and the lamp colours.
- AC2: The sun still visibly advances at every supported time rate.
- AC3: Crossing midnight fans out.
- AC4: A load and a time-rate change both fan out.
- AC5: No array is allocated per mast per frame.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Successive frames at a normal time rate do not each rebuild the skybox, the tree shadows and the lamp colours.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave: `setClockHour` now fans renderer updates out only when the displayed minute changes, or when a caller forces it. Load, time-rate changes, and direct sun-slider input force a fan-out.
- `controls.setClock` now has its own `day:minute:rate` key, so the DOM clock is not rewritten every frame while the displayed value is unchanged.
- `src/render/signals.ts` no longer allocates the `["red", "amber", "green"]` lamp order inside every mast update.
- Live probe proof: at x1 on the demo city, wrapping `tree_ground_shadows.thinInstanceSetBuffer("matrix", ...)` counted `4` uploads over `500 ms`; before this gate it ran once per rendered frame.
- Midnight proof: setting the sun slider to `23.99`, running x4 for `300 ms`, then pausing reached displayed time `00:06`; the existing CI sun-cycle checks also passed.
- Validation proof: `npm run typecheck && rtk npm run ci` passed. The broader `test:e2e` gate still has the pre-existing `scripts/interact.mjs:1021` zone-clear failure recorded under item_113.
