## item_092_an_economy_back_inside_the_range_it_was_aimed_at - An economy back inside the range it was aimed at
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:38:09

# AI Context
- Summary: The delivery slice for the economy: trade income restored, industry given an output, materials resolved either way, building prices differentiated again, and a first minute that reads.
- Keywords: economy, back, inside, range, aimed
- Use when: Working on `incomePerSecond`, `CityEconomy`, building prices, or the materials resource.
- Skip when: You need the harness, the zone limits, or the wave.

# Problem
- `incomePerSecond` lost its trade term and is now population tax alone -- about $0.24 a second at the starting population -- while a building costs a flat 800 a cell. Forty seconds of ordinary play ends at minus $212,790.
- That removal also silently reverts the city-resources criterion which says commerce produces services *and* trade, with no doc recording it -- the same undocumented-revert pattern as the deleted harness.
- The flat 800 replaced a per-kind table (residential 60, commercial 110, agricultural 75, industrial 140, military 190 a cell) with a rate four to thirteen times higher and no differentiation, so a barracks and a house now cost the same.
- `materialsProduced` is zero, so an industrial parcel produces nothing while demanding six workers a cell. Zoning industrial is now strictly harmful.
- Materials are nonetheless still in `CityResources`, still saved, still printed by the ledger, and `starter-materials` still sells 25 of them for nine prestige -- a prestige node buying a frozen number, which is the defect the prestige request was written to delete.

# Scope
- In:
  - Restore trade as income and drive population growth from jobs and housing instead of the same services figure. This satisfies counting commerce once by moving a term rather than deleting one, and gives the treasury something to move it upward.
  - Give industry a reason to exist: have it produce money the way commerce does, and then remove materials outright -- from `CityResources`, the saves, `CityTerms`, the ledger and the prestige web. The alternative is a genuine sink, which means a second currency on every build; take it only if the sink is already in the game.
  - Whichever answer materials get, `starter-materials` must buy something real or leave the web.
  - Recalibrate building prices, restoring per-kind differentiation rather than a flat rate -- the old table existed and a barracks should not cost a house.
  - Aim the whole set at a stated target: an ordinary first minute leaves the treasury somewhere a player can read, and going negative stays possible and unblocked as the construction slice decided.
  - Prove it through the harness rather than by eye, using the treasury figure the first slice adds, and record the chosen numbers and the reasoning.
  - Confirm an older save still loads once a resource leaves the shape.
- Out:
  - Debt, interest, maintenance or any consequence of a negative balance -- still later work.
  - Refusing a build for lack of funds, which stays out for good.
  - New resources.
  - Reworking the workforce priorities or the food rules.

# Acceptance criteria
- AC1: An ordinary first minute leaves a treasury figure a player can read, proven through the harness rather than by eye.
- AC2: Commerce contributes income again, and no single figure is both the growth driver and the income.
- AC3: No zoning choice is strictly harmful: industry produces something for the workers it costs.
- AC4: Materials are spent by something or are gone from the resources, the saves, the ledger and the prestige web, and an older save still loads.
- AC5: Building prices differentiate by kind, and the numbers chosen are written down.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: An ordinary first minute leaves a treasury figure a player can read, proven through the harness rather than by eye.
- request-AC7 -> This backlog slice. Proof: AC2: Commerce contributes income again, and no single figure is both the growth driver and the income.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)
- Request: `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`
- Primary task(s): `task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty`

# Notes
- Task `task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty` was finished via `logics-manager flow finish task` on 2026-09-01.
