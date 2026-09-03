## item_106_take_the_undo_snapshot_when_the_wrecking_ball_lands_not_when_the_player_clicks - Take the undo snapshot when the wrecking ball lands, not when the player clicks
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 33%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: beforeChange fires at click, afterChange a second later, and app.ts:415 uses ??=, so two bulldozes in one second collapse to one undo entry. The timers are also unclearable across a load.
- Keywords: DEMOLITION_MS, deferred timer, beforeChange, pendingHistorySnapshot, graph revision guard
- Use when: touching the demolition path, undo pairing, or a bulldoze that outlives its city.
- Skip when: changing DEMOLITION_MS, the animation, the refund rules, or moving drawTool, which req_039 owns.

# Problem
- Demolition is deferred by DEMOLITION_MS (src/render/drawTool.ts:498, :506, :522) but history.beforeChange fires synchronously at click time while afterChange fires in the timeout. Because src/app/app.ts:415 uses pendingHistorySnapshot ??= and afterChange nulls it, two bulldozes within one second record one undo entry and the second demolition cannot be undone.
- The timers are never cleared: tool.cancel() does not touch them, so graph.removeSegment(id) can run after a loadCity or an undo replaced the city, deleting whatever segment now holds that id or throwing out of a timer.

# Scope
- In:
  - Hold the pending timer ids and clear them from tool.cancel(), loadCity and restoreSnapshot.
  - Move history.beforeChange into the timeout so each demolition pairs with its own snapshot.
  - Guard the deferred body on the graph revision captured at click time.
  - Tests: two bulldozes inside DEMOLITION_MS give two undo entries; a demolition scheduled before a load does not run after it.
- Out:
  - Changing DEMOLITION_MS or the demolition animation.
  - Moving drawTool out of src/render/, which req_039 owns.
  - Changing the refund rules.

# Acceptance criteria
- AC1: Two bulldozes within one second are two undo entries, each undoing one.
- AC2: A demolition scheduled against a city that was then replaced does not mutate the new city.
- AC3: Cancelling the tool cancels pending demolitions.
- AC4: No deferred demolition can throw out of a timer.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Two bulldozes within one second are two undo entries, each undoing one.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Primary task(s): `task_037_orchestrate_the_0_4_0_correctness_fixes`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
