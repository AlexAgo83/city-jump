## item_142_the_fixes_whose_record_is_the_change_itself - The fixes whose record is the change itself
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 94%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: The residue: two accumulating-spread reduces in playthrough.ts, five fixable lint items across the scripts and one test, and three runbook code anchors pointing at commits no longer in the repo.
- Keywords: noAccumulatingSpread, fixable lint, unused variable, stale code anchor, ADR 030
- Use when: clearing the lint and audit baseline so a new warning means something new.
- Skip when: reformatting either script, or adding lint rules and a warnings-as-errors switch, which need a decision of their own.

# Problem
- src/sim/playthrough.ts:280-281 holds two reduces that spread the accumulator, O(n^2) over allSegments. They are outside the frame loop, so cost is not the argument -- they are the only lint warnings left in src/.
- Four fixable lint items remain: scripts/interact.mjs:119 (useTemplate), scripts/interact.mjs:550 and scripts/shot.mjs:79 (useOptionalChain), src/sim/roadTypes.test.ts:36-37 (useLiteralKeys), plus an unused variable at scripts/interact.mjs:2068.
- logics-manager audit names three stale code anchors in logics/runbook/run_002 and run_003, commit SHAs no longer in the repository.

# Scope
- In:
  - Replace the two accumulating spreads with plain accumulation.
  - Apply the fixable lint items and remove the unused variable.
  - Re-anchor or drop the three stale runbook citations.
- Out:
  - Reformatting either script.
  - New lint rules or a warnings-as-errors switch, which belong to a decision of their own.

# Acceptance criteria
- biome lint over src, scripts and tests reports no warnings.
- logics-manager audit reports no stale code anchors.
- Each fix carries its record at the point where it would be undone, per ADR 030, with no chain of its own.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: biome lint over src, scripts and tests reports no warnings.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: Low
- Rationale: None of it changes behaviour. It runs last so a clean baseline is the closing state, not an early one that later slices dirty again.

# Validation
- 2026-09-04: Cleared biome warnings in src/scripts/tests and removed stale runbook code anchors. Validated with rtk npm run lint, rtk npm run typecheck, rtk npm run scenarios, and rtk logics-manager audit --group-by-doc --include-deferred.
