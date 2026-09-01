## item_091_a_harness_that_fights_the_wave_it_reports_on - A harness that fights the wave it reports on
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:38:09

# AI Context
- Summary: The delivery slice for the evidence: the deleted fight harness restored, the playthrough made to actually fight, outcomes derived rather than passed in, and every assertion that cannot fail replaced.
- Keywords: harness, fights, wave, reports
- Use when: Working on `scripts/balance.mjs`, `src/sim/playthrough.ts` or their tests.
- Skip when: You need the economy numbers, the zone limits, or the unbuilt criteria.

# Problem
- `a437609` wrote a real fight harness -- kaiju assault, batteries in range, missiles carrying `impactAt`, `damageWaveClock`, stepped at 0.25 s, counting salvos -- and recorded 25.5 seconds over 7.0 salvos. `6f20382` replaced the file wholesale with a playthrough that fights nothing, so `npm run balance` reports neither duration nor salvos and the retune has no reproducible proof.
- `playFirstRun(seed, rules, shape)` takes its outcome as an argument. `advanceKaijuAssault` is never called; no missile is fired; no damage is applied.
- The `lost` parcels are computed and never applied: nothing is destroyed, the lifecycle is not told, the population does not move. `nextWaveReachable` is `!run.ended`, set from the shape argument.
- Three of the harness's five assertions pass by construction -- `expect(f(x)).toBe(x)` -- and one checks a literal returned by an early return.
- The closeout says the harness 'follows a basic needs policy'. Every zone is painted before the loop, and the loop's only reaction compares `short.kind` against itself, so it never fires.
- `militaryGap` subtracts hit points from damage-per-minute, and that number is the recorded evidence for the military-versus-threat criterion.
- Nothing reports the treasury, which is why an ordinary run ending at minus $212,790 went unnoticed.

# Scope
- In:
  - Restore the fight measurement. `git show a437609 -- scripts/balance.mjs` is the whole of the deleted harness and it worked; fold it back in so combat duration and salvo count are reported again alongside the playthrough figures.
  - Make the playthrough actually play its first wave: call `advanceKaijuAssault` against the living parcels, fire the batteries in range, carry missiles to `impactAt`, apply the damage -- the same rules the app calls, from the loop the harness already has.
  - Derive the wave's shape from what happened instead of accepting it as a parameter. A caller may still steer a scenario -- fewer batteries, a bigger threat -- but the outcome must be read out, not passed in.
  - Apply the losses: destroy what the kaiju destroyed, tell the lifecycle, let the population and the treasury feel it, and read `nextWaveReachable` from the city.
  - Build the needs-following policy the closeout already claims: react to a shortage by zoning for it, and assert what following the gauges produces. If following them does not lead to a surviving city, report that rather than tuning the policy until it passes.
  - Replace every assertion that cannot fail. The test for each behaviour must break when that behaviour is removed -- check it by removing it.
  - Fix `militaryGap` to compare comparable quantities -- time to kill against the fight the wave actually is, rather than a rate against a stock -- and report the treasury at the first wave alongside it.
  - Keep every measurement the harness already takes. Extending it means adding, and a figure that disappears is the defect this slice exists to correct.
- Out:
  - The economy's numbers, which are the next slice; this one makes them visible.
  - Changing the kaiju loop, the missiles or the construction feedback, which work.
  - The browser interaction suite.
  - A second harness.

# Acceptance criteria
- AC1: `npm run balance` reports combat duration and salvo count from a simulated fight, and the twenty-to-forty-second target is reproducible from a clean checkout.
- AC2: The playthrough's first wave is fought, not stipulated, and its shape is read out of the simulation.
- AC3: A wave's losses are applied to the city and what remains possible afterwards is read from the city.
- AC4: Every assertion fails when the behaviour it names is removed, verified by removing it.
- AC5: A needs-following policy builds in response to the gauges, and what that produces is asserted.
- AC6: The treasury and a dimensionally sound military measurement are both reported.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `npm run balance` reports combat duration and salvo count from a simulated fight, and the twenty-to-forty-second target is reproducible from a clean checkout.
- request-AC2 -> This backlog slice. Proof: AC2: The playthrough's first wave is fought, not stipulated, and its shape is read out of the simulation.
- request-AC3 -> This backlog slice. Proof: AC3: A wave's losses are applied to the city and what remains possible afterwards is read from the city.
- request-AC4 -> This backlog slice. Proof: AC4: Every assertion fails when the behaviour it names is removed, verified by removing it.
- request-AC5 -> This backlog slice. Proof: AC5: A needs-following policy builds in response to the gauges, and what that produces is asserted.
- request-AC11 -> This backlog slice. Proof: AC6: The treasury and a dimensionally sound military measurement are both reported.

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
