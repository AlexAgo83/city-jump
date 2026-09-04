## item_150_drop_the_second_the_bulldozer_waits_for_nothing - Drop the second the bulldozer waits for nothing
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:04:12

# AI Context
- Summary: `DEMOLITION_MS = 1_000` defers every demolition by a second that nothing waits on -- no animation, and the target highlight is switched off at the click. It arrived with no comment, in a file where every deliberate simplification carries one.
- Keywords: DEMOLITION_MS, scheduleDemolition, deferred commit, graph revision guard, magic constant
- Use when: changing when a demolition commits, or removing a constant with no recorded reason.
- Skip when: the bulldozer's target priority order and the refund arithmetic, which are deliberate and correct.

# Problem
- src/render/drawTool.ts:32 sets `DEMOLITION_MS = 1_000`, and `scheduleDemolition` (:625-641) defers every road, building and utility demolition by that second. Clicking a road feels like it takes about a second, because it does.
- Nothing waits on it. There is no demolition animation, src/render/rubble.ts only draws the rubble a kaiju leaves, and the target highlight is switched off at the click (:500-501) -- so the feedback disappears and the road stands.
- It arrived in 15c3f6c "Add delayed demolition refunds" with no comment and no recorded reason, in a file where every other deliberate simplification carries a `ponytail:` and its revision condition.
- The delay also makes a demolition droppable: c06edbf added the `graph.revision !== revision` guard at :629, so any road edit inside that second silently cancels the pending demolition.

# Scope
- In:
  - Establish whether the delay was buying anything, and record the answer.
  - A bulldoze that takes effect when the player clicks, or a delay that carries its reason at the declaration.
  - Retire the deferred-commit guard if the commit becomes immediate.
- Out:
  - The order in which the bulldozer picks its target (src/render/drawTool.ts:644-649), which is deliberate.
  - The demolition refund arithmetic, which is correct.
  - Adding a demolition animation.

# Acceptance criteria
- Clicking the bulldozer on a road removes it without a wait the player can feel, or the wait has a recorded reason.
- Nothing silently cancels a demolition the player asked for.
- The undo entry still lands with the demolition, not before it.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: Clicking the bulldozer on a road removes it without a wait the player can feel, or the wait has a recorded reason.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: High
- Rationale: Every demolition the player asks for waits a second for nothing, and the constant has no recorded reason to weigh against removing it.

# Validation
- 2026-09-04: Removed `DEMOLITION_MS`, the pending timeout set, and the revision guard in `src/render/drawTool.ts`; demolition now commits synchronously inside the same history boundary. Updated `scripts/interact.mjs` to assert immediate building and road bulldozes. Validation passed with `rtk npm run typecheck`, `rtk npm exec -- vitest run src/render/drawTool.test.ts`, and `rtk npm run test:e2e`.
