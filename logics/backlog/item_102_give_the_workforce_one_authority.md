## item_102_give_the_workforce_one_authority - Give the workforce one authority
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Two allocators disagree on the same city: production re-derives from raw population, the lifecycle uses a banded value with an incumbency comparator. Suspected contributor to the balance figures req_036 owns.
- Keywords: allocateWorkforce, staffing divergence, incumbency, banded population, batteries guard
- Use when: touching staffing, production output, or investigating the balance outlier.
- Skip when: changing the staffing rule itself or rebalancing costs and yields.

# Problem
- output() calls allocateWorkforce four times per advance on raw population with no incumbency comparator (src/sim/economy.ts:128), while BuildingLifecycle.sync allocates on the banded committed value with one (src/sim/buildingLifecycle.ts:73). The two answers diverge, so a lot the lifecycle reports working can be counted unstaffed by production and the reverse.
- This is the hazard src/sim/batteries.ts:13 documents and guards against, unguarded here.
- It also sorts every parcel four times per tick.
- Suspected contributor to the balance figures req_036 owns: a city that pays for buildings it does not count as productive.

# Scope
- In:
  - Make BuildingLifecycle.sync the single allocator and have advance consume its staffed statuses rather than re-deriving from population.
  - Confirm the two allocations diverge with a test before changing either, so the fix is measured rather than assumed.
  - Remove the redundant per-tick sorting.
  - Re-run npm run balance before and after and record both.
- Out:
  - Changing the staffing rule itself.
  - Rebalancing costs or yields, which req_036 owns.

# Acceptance criteria
- AC1: A test shows the two allocations disagreeing on the same city before the change.
- AC2: After the change one code path allocates the workforce and production reads its result.
- AC3: For every lot, the staffing production assumes equals the staffing the lifecycle reports.
- AC4: Balance output is recorded before and after, whether or not it improves.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A test shows the two allocations disagreeing on the same city before the change.

# Validation
- 2026-09-03: `npm run balance` before wave 3: `balance: 6 runs firstWave=1373.3s combat=13.0s salvos=3.7 held=4/6 batteries=7.2 population=224.3 treasury=$13016 militaryGap=-17.0`.
- 2026-09-03: `npm run balance` after wave 3: `balance: 6 runs firstWave=1373.3s combat=13.0s salvos=3.7 held=4/6 batteries=7.2 population=237.0 treasury=$13819 militaryGap=-17.0`.
- 2026-09-03: `npm run ci` passed after wave 3 with 294 Vitest tests, 7 architecture tests, build, typecheck, Logics lint/audit and i18n validation.

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
