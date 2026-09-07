## item_176_accept_a_run_block_that_omits_its_end_reason - Accept a run block that omits its end reason
> From version: 0.5.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Persistence
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: save.ts:217 rejects a whole city when the run block omits `ended`, unlike every neighbouring optional field.
- Keywords: save parser, run state, ended, absent field, parseCity
- Use when: fixing the parser or extending its tests around run state.
- Skip when: touching the save version ceiling or the node length-equality check, both deliberate.

# Problem
- `src/sim/save.ts:217` compares `value.ended` against null and the three known reasons, so an absent `ended` returns null from `parseCity` and the whole city is refused.
- Every other optional field in the parser defaults on absence, and `readWaveClock` directly below tolerates an absent `active`. This one field is inconsistent with its own neighbours.
- No save this build writes is affected, because `createRun` at `src/sim/run.ts:55` always writes `ended: null`. The exposure is a hand-edited save, a shortened fixture, or a future writer that omits null fields - and the failure gives the player no reason.

# Scope
- In:
  - Normalize `value.ended` to null before validating it, and return the normalized value rather than `value.ended`.
  - Keep refusing an `ended` value outside `evacuated`, `population_zero` and `defeated`.
  - Extend `src/sim/save.test.ts` beside the existing run cases at line 192 with a run block carrying only `wave` and `science`.
- Out:
  - Any other parser field.
  - The save version ceiling and the refusal of newer saves.
  - Loosening the length-equality check at `src/sim/save.ts:202` that makes a malformed node reject the city instead of dropping it silently.

# Acceptance criteria
- AC1: `parseCity` on a city whose run block omits `ended` returns a save whose `run.ended` is null.
- AC2: `parseCity` still returns null for an `ended` value outside the three known reasons.
- AC3: The restored city is playable, not merely parsed: the run state it carries reaches the application unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `parseCity` on a city whose run block omits `ended` returns a save whose `run.ended` is null.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: High
- Rationale: The only actual defect in the request, and the cheapest. No save this build writes triggers it, so it is High on correctness rather than on urgency: a parser stricter than its own neighbours by accident will bite a fixture or a future writer with no diagnosis.
