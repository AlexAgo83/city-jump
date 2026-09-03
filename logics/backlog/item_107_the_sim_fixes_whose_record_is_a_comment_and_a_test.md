## item_107_the_sim_fixes_whose_record_is_a_comment_and_a_test - The sim fixes whose record is a comment and a test
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 66%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Six defects grouped deliberately: per ADR 030 their reasoning fits at the declaration that would undo them, so each needs a comment and a failing test rather than a chain.
- Keywords: ADR 030, pointsEvery guard, dead splitBuilt, mutable RoadNode, kaiju dt, expand ordering, smoothstep duplication
- Use when: picking up a small sim fix, or deciding whether a fix needs a chain at all.
- Skip when: splitting transfers.ts, which req_039 owns, or changing the combat step.

# Problem
- Six small defects whose reasoning fits at the declaration that would undo them, so per ADR 030 they need a comment and a failing test, not a chain each.
- graph.ts:258 pointsEvery loops for ever on spacing <= 0, with no guard.
- graph.ts:397 splitBuilt and rebuildBuilt are dead, superseded by the re-sampling at :310.
- graph.ts:206 node() and allNodes() hand out the internal RoadNode with its live mutable segments Set, so a caller can corrupt the graph without bumping revision.
- kaiju.ts:65 exits the loop on the first destroyed target and discards the rest of dt; correct at the 0.25 s combat step, wrong at any larger one.
- playthrough.ts:139 expand() commits the spine road before checking the cross street validated, then returns false having already mutated.
- angleBetween is byte-identical in facing.ts:5 and junction.ts:242, and smoothstep is reimplemented in graph.ts:106, heightmap.ts:374, transfers.ts:29 and rules.ts.

# Scope
- In:
  - A guard on pointsEvery with the comment saying why, and a test that a zero spacing returns rather than hangs.
  - Delete splitBuilt and rebuildBuilt.
  - Return a read-only view from node()/allNodes(), or document the invariant at the declaration if the change is too wide.
  - Drain dt in the kaiju loop, with a test at a step larger than the combat step.
  - Validate both roads in expand() before committing either.
  - One angleBetween and one smoothstep, in src/sim/vec.ts.
- Out:
  - Splitting transfers.ts, which req_039 owns.
  - Changing the combat step or the playthrough scenario shape.

# Acceptance criteria
- AC1: A zero or negative spacing cannot hang pointsEvery, and a test proves it.
- AC2: No dead split path remains in src/sim/graph.ts.
- AC3: A kaiju step larger than the combat step consumes all of its dt.
- AC4: expand() never mutates the graph and then reports failure.
- AC5: angleBetween and smoothstep are each defined once.
- AC6: Each fix carries a comment at the declaration saying what it prevents.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: A zero or negative spacing cannot hang pointsEvery, and a test proves it.

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
