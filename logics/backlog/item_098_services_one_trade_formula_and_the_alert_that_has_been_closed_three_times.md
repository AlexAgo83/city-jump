## item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times - Services, one trade formula, and the alert that has been closed three times
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:04:51

# AI Context
- Summary: The delivery slice for the leftovers: services resolved the way materials were, one trade formula, and the district alert that three Done tasks have accepted without it existing.
- Keywords: services, trade, formula, alert, been, closed, three, times
- Use when: Working on the services resource, the ledger's trade figure, or the district alert.
- Skip when: You need the harness or the defence balance.

# Problem
- Growth no longer reads `servicesProduced`, so `resources.services` accumulates and is read by nothing but the ledger -- and `starter-services` still sells 20 of it for 10 prestige. That is the materials defect, removed one field away in the same commit, left standing.
- `CityTerms.trade` is `servicesProduced + industryTrade` at per-cell-per-day rates of 4 and 3; `incomePerSecond` computes a different trade from the statuses at per-cell-per-second rates of 0.35 and 0.25. The ledger displays the first, the treasury earns the second, so the ledger reports income the city does not receive.
- The district-going-dark alert has been accepted on three separate Done tasks. The word 'alert' appears nowhere in the repository.

# Scope
- In:
  - Give services a consumer or remove them the way materials were removed -- from `CityResources`, the saves, `CityTerms`, the ledger and the prestige web. Precedent is one field away and one commit old.
  - If services go, `starter-services` must buy something real or leave the web; a prestige node selling a frozen number is what the prestige request exists to forbid.
  - Keep one trade formula. `incomePerSecond` is what the treasury receives, so that is what the ledger displays, satisfying the interface criterion that no formula is written down twice.
  - Build the district-going-dark alert, in the transient one-line shape the interface slice described, and cover it so it cannot be closed a fourth time without existing.
  - Confirm an older save still loads if a resource leaves the shape.
- Out:
  - New resources or new prestige nodes.
  - Reworking the ledger's presentation beyond the figures behind it.
  - Changing what the needs panel shows, which is settled.

# Acceptance criteria
- AC1: Services are spent by something or are gone from the resources, the saves, `CityTerms`, the ledger and the prestige web.
- AC2: No prestige node sells a frozen number, and an older save still loads.
- AC3: One trade formula exists and the ledger displays the one the treasury receives.
- AC4: A district going dark raises a one-line alert, covered by a check that fails without it.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Services are spent by something or are gone from the resources, the saves, `CityTerms`, the ledger and the prestige web.
- request-AC8 -> This backlog slice. Proof: AC2: No prestige node sells a frozen number, and an older save still loads.
- request-AC10 -> This backlog slice. Proof: AC3: One trade formula exists and the ledger displays the one the treasury receives.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Primary task(s): `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
