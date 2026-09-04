## item_151_open_a_run_with_a_treasury_that_can_build_a_city - Open a run with a treasury that can build a city
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:04:12

# AI Context
- Summary: A run opens with $40,000 against per-metre roads and per-cell buildings. Raising it moves the Starter grant's worth, which is a quarter of that base today, and feeds the balance band directly.
- Keywords: STARTING_MONEY, opening treasury, starter grant, prestige upgrade worth, balance band
- Use when: changing the opening treasury or what a starting-money upgrade is worth.
- Skip when: the per-metre road and per-cell building costs, the income model, and adding further prestige upgrades.

# Problem
- A run opens with $40,000 (src/sim/economy.ts:6), against roads charged per metre (:186-189) and buildings from $60 to $190 per cell (:191-194). It is the first constraint the player meets, and the operator wants it far higher -- $100,000 was the figure named.
- The "Starter grant" prestige upgrade adds $10,000 for 6 prestige (src/sim/run.ts:45-48). That is a quarter of the opening treasury today and a tenth of it at $100,000, so its worth moves with the base whether or not anyone decides it should.
- Money is a binding constraint in the balance runs: `npm run scenarios` reports treasuries from $1,158 to $28,735 across its seeds, so the opening figure feeds the reported band directly.

# Scope
- In:
  - The opening treasury becomes the figure the operator chose, with its reason recorded at the declaration.
  - A deliberate decision on what the prestige grant is worth against the new base.
  - Re-run npm run scenarios and record the band.
- Out:
  - The per-metre road and per-cell building costs.
  - The income model (src/sim/economy.ts:212-214).
  - Adding further prestige upgrades.

# Acceptance criteria
- A new run opens with the chosen treasury, and the reason for that figure is recorded where it is declared.
- The prestige grant's worth against the new base is deliberate and recorded.
- npm run scenarios stays inside its reported band, or the new band is recorded with its reason.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: A new run opens with the chosen treasury, and the reason for that figure is recorded where it is declared.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: Medium
- Rationale: The first constraint a player meets, and the operator has named the figure; it moves the balance band, so it is measured alongside the rubble fix.

# Validation
- 2026-09-04: STARTING_MONEY raised to 100,000; Starter grant deliberately remains 10,000 as a small first upgrade. Validated with rtk npm exec -- vitest run src/sim/run.test.ts src/sim/economy.test.ts and rtk npm run scenarios. Scenarios stayed inside 13-85s / 4-21 salvo band.
