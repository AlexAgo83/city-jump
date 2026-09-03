## item_129_give_the_save_format_somewhere_to_migrate - Give the save format somewhere to migrate
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: Every field added since v1 must stay independently optional for ever because there is nowhere to put a transform. Separately, the first save of a painted city moves each lot centre by up to 2 m and the test passes anyway.
- Keywords: SAVE_VERSION, migration table, zones quantisation, KEY_STEP, backwards compatibility
- Use when: changing the save format or adding a field to it.
- Skip when: changing the shared-link quantisation, which is deliberate, or the tuple encoding, which is justified.

# Problem
- src/sim/save.ts:170 accepts v from 1 to 13 and stamps SAVE_VERSION on the way out with no migration hook, so every field added since v1 must stay independently optional for ever and a real transform has nowhere to live. src/sim/zones.ts:159 is the only migration and it is ad hoc.
- Zones.toJSON writes back key x KEY_STEP, so the first save of a freshly painted city moves each lot's recorded centre by up to 2 m. save.test.ts:61 passes because it re-quantises to the same key, not because nothing was lost.

# Scope
- In:
  - An ordered migration table applied in sequence from the save's version to the current one, with the zones migration moved into it.
  - Keep full precision for lot centres in a local save: docs/shared-link-threat-model.md:20 already rules that only the shared payload is quantised and local saves keep full precision, so Zones.toJSON writing back key x KEY_STEP contradicts a stated control. Pin it with a test that fails on a re-quantised centre rather than one that re-quantises to compare.
  - An ADR if the format decision turns out to constrain future fields.
  - A test that a v1 save still loads through the chain.
- Out:
  - Changing the shared-link quantisation, which is deliberate per docs/shared-link-threat-model.md:19.
  - Changing the tuple encoding, which src/sim/save.ts:26 justifies.
  - Breaking compatibility with any version currently accepted.

# Acceptance criteria
- AC1: A migration has one declared place to live.
- AC2: A save from every accepted version loads through the chain, covered by a test.
- AC3: A local save round-trip preserves a painted lot's centre exactly, pinned by a test that would fail on re-quantisation.
- AC4: No accepted save version stops loading.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A migration has one declared place to live.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
