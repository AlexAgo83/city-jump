## item_100_derive_the_utility_mask_from_the_item_list_instead_of_owning_it - Derive the utility mask from the item list instead of owning it
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 83%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: The mask on a segment is derived from the item list, so removal clears and re-lays rather than subtracting: two diffusers can share a run of road. Changes removeNear's signature; one caller at src/app/app.ts:765.
- Keywords: removeNear, restake, segment utilities mask, shared path, save persistence, hasSegment guard
- Use when: changing how a utility is placed, removed or restored, or why a district stays lit with its plant gone.
- Skip when: changing the utility catalogue, radii, costs or pathToProducer.

# Problem
- removeNear (src/sim/utilities.ts:58) splices the item and nothing else, so the segments keep their power and water bits for ever and the stale mask is persisted through src/sim/save.ts:113. suppliedDiffusers then reports a live network with the plant gone.
- replaceWith (src/sim/utilities.ts:89) re-attaches items but never lays the mask either.
- place duplicates the wiring in a producer branch and a diffuser branch (src/sim/utilities.ts:46-54).

# Scope
- In:
  - One restake(graph) that clears every segment mask and re-lays every item's path, guarding graph.hasSegment for a utility whose road was demolished.
  - Call it from place, removeNear and replaceWith, and delete the duplicated wiring branches.
  - Update the one caller of removeNear at src/app/app.ts:765 for the new graph argument.
  - Tests: removing a producer unsupplies its diffusers; removing one of two diffusers sharing a run of road leaves the other supplied; a save round-trip after a removal carries no stale mask.
- Out:
  - Subtracting a removed item's path from the mask.
  - Changing the utility catalogue, radii or costs.
  - Changing pathToProducer.

# Acceptance criteria
- AC1: After removing a utility, no segment carries a mask that only that utility put there.
- AC2: Removing one of two diffusers whose paths overlap leaves the other supplied.
- AC3: A demolished road under a utility does not make restake throw.
- AC4: place, removeNear and replaceWith all leave the same mask for the same item list.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: After removing a utility, no segment carries a mask that only that utility put there.

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
