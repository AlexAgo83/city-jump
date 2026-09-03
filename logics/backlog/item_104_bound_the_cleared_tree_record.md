## item_104_bound_the_cleared_tree_record - Bound the cleared-tree record
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 33%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Every miss pushes a point, including clicks on bare ground and repeats on one spot, and all of it is saved. isCleared is a linear scan per generated tree per rebuild, so cost is quadratic in session length.
- Keywords: plantings, removed list, REMOVAL_RADIUS, dedupe, grid buckets, unbounded growth
- Use when: touching tree clearing or planting persistence. There is no test file for this module yet.
- Skip when: changing REMOVAL_RADIUS, species, placement or density.

# Problem
- Plantings.clear (src/sim/plantings.ts:40) pushes a point on every call that misses a hand-planted tree, including clicks on bare ground and repeat clicks on one spot. Nothing dedupes or prunes, and all of it is persisted through src/sim/save.ts:89.
- isCleared (src/sim/plantings.ts:54) is a linear scan run once per generated tree per rebuild, so a long session costs quadratically.
- There is no test file for this module.

# Scope
- In:
  - Record a removal only when one actually removed a generated tree.
  - Dedupe on REMOVAL_RADIUS at insertion.
  - Replace the linear scan with the fixed grid buckets already used at src/render/trees.ts:377.
  - A first test file covering the removal radius rule, dedupe, and a save round-trip.
- Out:
  - Changing REMOVAL_RADIUS.
  - Changing tree species, placement or density.

# Acceptance criteria
- AC1: Clicking bare ground records nothing.
- AC2: Clicking the same spot repeatedly records one removal.
- AC3: A cleared tree stays cleared across a save round-trip.
- AC4: isCleared cost does not grow with total removals for a fixed query area.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: Clicking bare ground records nothing.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Primary task(s): `task_037_orchestrate_the_0_4_0_correctness_fixes`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
