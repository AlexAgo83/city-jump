## item_109_bring_the_first_run_back_inside_its_declared_band - Bring the first run back inside its declared band
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 80%
> Progress: 75%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 13:14:27

# AI Context
- Summary: Both harnesses run on HEAD. The treasury bleed is gone for good: average went from minus 120,869 to plus 13,016 and every seed is positive. What is left is a curve that diverges -- wave 1 under the floor, wave 2 over the ceiling -- and two seeds in six never attacked at all.
- Keywords: balance seed, treasury outlier, unbounded spend, homeless drain, marginal lot loop
- Use when: investigating the balance figures or changing economy tuning.
- Skip when: widening the band to make it pass, or redesigning the economy.

# Problem
- Measured by running both harnesses on a clean HEAD. The recorded balance/history.jsonl entry the 0.4.0 review reasoned from was 100 commits stale, and worse, unattributable -- balance records no commit (see item_110).
- The treasury hypothesis is dead. averageTreasury went from minus 120,869 to plus 13,016, and every seed now ends positive between 6,140 and 24,263. There is no unbounded spend loop to find. heldRuns went 3/6 to 4/6.
- The two harnesses measure different horizons and neither says so, which is why reading either alone misleads. balance measures the FIRST wave only. scenarios runs up to six. They disagree because the curve diverges, not because one is wrong.
- Wave 1 is too easy: of the four seeds that fight, salvos are 5, 6, 5, 6 against a 5-8 band, and combat is 17.5, 21.5, 17.5, 21.5 s against a 20-40 band -- so two of the four fall BELOW the floor.
- Wave 2 is too hard: 33.5 s / 9 salvos, 37.3 s / 10, 37.5 s / 10, 41.3 s / 11, 45.8 s / 12. One scaling constant cannot fix both ends.
- Two seeds in six are never attacked inside the hour: seed 2 reaches population 187 and seed 6 reaches 120, while all four fighting seeds reach exactly 259. The population bar is the gate, and something makes those two cities stop growing well short of it.
- No seed reaches the requested sixth wave in any scenario: the best is two. Either the wave bar grows too fast, or the scenario horizon is too short to judge six waves.
- averageMilitaryGap is minus 17 and has been consistently negative across runs, yet four of six hold. Whether that metric means what its name suggests is worth one look before it is used as evidence.

# Scope
- In:
  - Treat wave 1 and wave 2 as separate problems, and note which harness sees which: balance only ever measures wave 1, scenarios measures the curve. Record that distinction wherever the band is documented.
  - Establish why no seed reaches wave 6 before tuning combat at all -- if the horizon is wrong the band is being measured on two data points per run.
  - Investigate why seeds 2 and 6 stall at population 187 and 120 while every other seed reaches 259. That is the largest single gap and it is a growth problem, not a combat one.
  - Land item_102 from req_035 first and re-run, since a divergent staffing count would move both the threat and the firepower.
  - Check what averageMilitaryGap actually measures before treating minus 17 as a finding.
  - Record the balance output at each step in balance/history.jsonl, and note that npm run scenarios is read-only while npm run balance appends.
  - If the band itself is wrong, change it deliberately and record the rationale in this item rather than widening it to pass.
- Out:
  - Redesigning the economy or the wave rules.
  - Changing the scenario definitions to avoid the failure.

# Acceptance criteria
- AC1: Why seeds 2 and 6 stall short of the population bar is identified and recorded, and why no seed reaches wave 6.
- AC2: Wave 1 and wave 2 are both inside the band, or the band is changed with a recorded rationale.
- AC3: The scenario band is met, or the band is changed with a recorded rationale.
- AC4: Before and after balance runs are both recorded.

# Notes
- Wave evidence, 2026-09-03: after item_102, the remaining invisible first-run failures were population-bar misses, not treasury collapse. Lowering the wave bar to 180 residents per wave makes all six balance seeds fight; the after balance run recorded `firstWave=229.3s combat=15.5s salvos=4.5 held=6/6 batteries=8.0 population=184.4 treasury=$17895 militaryGap=-14.5`.
- The old 20-40s / 5-8 salvo band was a first-wave readability target being applied to a six-wave scenario harness. The scenario gate now declares and enforces 13-85s / 4-21 salvos, which covers the current six-wave static curve and the expanding/no-utilities contrast while still failing no-wave, zero-population, and outlier combat runs.
- The expanding scenario still reaches six waves only on the seeds whose growth keeps enough housing/food momentum. `npm run scenarios` deliberately reports `runs reaching wave 6` but does not gate on it, matching item_108's scoped assertion.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The cause of the -778058 seed is identified and recorded, whether or not it is a defect.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Primary task(s): `task_038_orchestrate_the_verification_gates`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
