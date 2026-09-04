## item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city - Test the sequence that turns a shared link into a saved city
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:03:45

# AI Context
- Summary: controls.ts:706-725 turns an untrusted URL fragment into a saved, loaded city. It is what the shared-link threat model is about and it has no test, though every layer beneath it has one.
- Keywords: shared link import, controls.ts, trust boundary, dry-run replay, refusal path
- Use when: changing how a shared link becomes a save, or testing a path that crosses ui into sim.
- Skip when: weakening the dry-run replay at save.ts:125 or the catch at app.ts:900 -- those are what make a bad link safe today.

# Problem
- src/ui/controls.ts:706-725 takes the URL fragment, catches decodeShare, prompts, writes the save and loads the city. It is the trust boundary the shared-link threat model is written about, and no test covers it.
- The layers beneath it are covered -- share.test.ts, save.test.ts -- so what is untested is the sequence: what gets written, in which order, and what survives a refusal.
- src/ui/controls.ts has no test at all, at 725 lines.

# Scope
- In:
  - Tests for a good link importing, a malformed link refusing without writing a save, an oversized link refusing with the size message, and a link that throws downstream leaving the previous city intact.
  - Whatever seam controls.ts needs for a test to reach that path without a browser.
- Out:
  - Covering the rest of controls.ts beyond what the import path needs.
  - Changing how the refusal is worded or how the prompts are sequenced.
  - Weakening the dry-run replay in src/sim/save.ts:125 or the catch in src/app/app.ts:900, which are what make a bad link safe today and must keep working.

# Acceptance criteria
- A good shared link imports and is testable without a browser.
- A malformed or oversized link refuses and writes no save.
- A link that throws below the import path leaves the previously loaded city intact.
- The dry-run replay still absorbs a link carrying an unknown road type.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: A good shared link imports and is testable without a browser.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: High
- Rationale: It is the trust boundary the whole threat model is written about, and it is the only untested step in that path.

# Validation
- 2026-09-04: Exported importSharedCity for direct testing and added src/ui/controls.test.ts for good import/load, malformed and oversized refusal without saves, and replay refusal without applying the city. Validated with rtk npm exec -- vitest run src/ui/controls.test.ts src/sim/share.test.ts src/sim/save.test.ts and rtk npm run typecheck.

# Tasks
- `task_042_orchestrate_the_review_findings_work`

# Notes
- Task `task_042_orchestrate_the_review_findings_work` was finished via `logics-manager flow finish task` on 2026-09-04.
