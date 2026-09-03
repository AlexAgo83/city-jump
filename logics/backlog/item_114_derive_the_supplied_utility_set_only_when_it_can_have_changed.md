## item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed - Derive the supplied-utility set only when it can have changed
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 55%
> Complexity: Low
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: syncBuildings itself cannot be gated because it produces the statuses the frame reads; only its expensive part is cacheable. graph.revision is a sufficient key: setSegmentUtilities bumps it at src/sim/graph.ts:180.
- Keywords: suppliedDiffusers, memoisation, graph revision, invalidation, restake hook
- Use when: touching syncBuildings or the supplied-utility derivation.
- Skip when: changing what suppliedDiffusers computes or the utility overlay.

# Problem
- syncBuildings (src/app/app.ts:293) re-derives suppliedDiffusers over the whole graph every frame, rebuilding two Sets, though the answer only changes when the graph or the utilities change.
- syncBuildings itself cannot be gated, because it is what produces the statuses the frame reads.

# Scope
- In:
  - Memoise the supplied set on graph.revision.
  - Key the cache on graph.revision alone: setSegmentUtilities bumps it (src/sim/graph.ts:180), so a utility change already invalidates. No separate Utilities version counter is needed.
  - Make req_035's restake invalidate it.
- Out:
  - Changing what suppliedDiffusers computes.
  - Changing the utility overlay.

# Acceptance criteria
- AC1: The supplied set is computed once per graph or utility change, not once per frame.
- AC2: Placing or removing a utility updates it in the same frame.
- AC3: A test covers the invalidation path, not only the cache hit.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The supplied set is computed once per graph or utility change, not once per frame.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave: `app.ts` now caches a utility snapshot keyed by `graph.revision`; the snapshot carries both `suppliedDiffusers(...)` and the diffuser list used by `missingUtility`.
- Utility placement/removal still invalidates in the same frame through existing `Utilities.restake(graph)`, which calls `graph.setSegmentUtilities(...)` and bumps `graph.revision`.
- Validation proof: `npm run typecheck && rtk npm run ci` passed. The CI path includes the scenario gate and the unit utility invalidation tests; the browser e2e utility-removal checks passed before the pre-existing zone-clear failure recorded under item_113.
