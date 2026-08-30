## item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one - Make a failed city load a no-op instead of a destructive one
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `restoreCity` empties the graph and plantings before replaying a save, so a segment the rules refuse leaves the player with a refusal message over a city that no longer exists in the model.
- Keywords: failed, city, load, instead, destructive
- Use when: Changing `restoreCity` in `src/sim/save.ts` or `loadCity` in `src/app/app.ts`, or adding failure coverage around loading a saved city.
- Skip when: The work is about the save format, `parseCity` validation, or making the graph rules accept segments they currently refuse.

# Problem
- `restoreCity` clears plantings and removes every segment before replaying the saved ones, then throws on a segment the current rules refuse or a missing node reference.
- `loadCity` catches the throw and returns false, but the graph is already emptied and `applyTerrain` has already regenerated the terrain -- the refusal is shown over a city that no longer exists in the model, and the next edit autosaves the emptied graph.

# Scope
- In:
  - Restore the pre-load state when a load fails: snapshot the current city before the replay and put it back in the failure path, or replay into a scratch graph and only swap it in on success -- whichever keeps `restoreCity` itself simple.
  - Cover the failure with a test that builds a city, attempts a load that throws mid-replay, and asserts the original graph, plantings and terrain preset are intact.
- Out:
  - Changing the save format or `parseCity`'s validation rules.
  - Making the graph rules accept segments they currently refuse.

# Acceptance criteria
- AC1: After a load that throws mid-replay, the graph, plantings and terrain preset are identical to their pre-load values, and the refusal message is still shown.
- AC2: An automated test reproduces the mid-replay failure and asserts the pre-load state survives it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: After a load that throws mid-replay, the graph, plantings and terrain preset are identical to their pre-load values, and the refusal message is still shown.
- request-AC6 -> This backlog slice. Proof: AC2: An automated test reproduces the mid-replay failure and asserts the pre-load state survives it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_004_a_city_builder_that_never_loses_the_city_on_screen`
- Architecture decision(s): (none yet)
- Request: `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
- Primary task(s): `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
