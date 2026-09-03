## item_109_bring_the_first_run_back_inside_its_declared_band - Bring the first run back inside its declared band
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Measured live on HEAD, not from the stale record: the band is violated in BOTH directions (wave 1 at the floor, wave 2 over the ceiling), every wave is held, and no seed reaches wave 6. The minus 778k treasury bleed is gone -- that hypothesis died with the stale data.
- Keywords: balance seed, treasury outlier, unbounded spend, homeless drain, marginal lot loop
- Use when: investigating the balance figures or changing economy tuning.
- Skip when: widening the band to make it pass, or redesigning the economy.

# Problem
- Measured by running npm run scenarios on HEAD (read-only; the recorded balance/history.jsonl was 100 commits stale and its minus 778k bleed no longer reproduces).
- The band is violated in both directions, and the two directions are different problems. Wave 1 lands at or under the floor: combat 17.5 s with 5 salvos on three of six seeds. Wave 2 overshoots the ceiling: 33.5 s / 9 salvos, 37.3 s / 10, 37.5 s / 10, 41.3 s / 11, 45.8 s / 12. So the difficulty curve does not just sit off-centre, it diverges between wave 1 and wave 2.
- Every wave is held: 7 of 7 in the expanding scenario, 6 of 6 in the static one. Nothing breaches, so the threat is not actually threatening.
- No seed reaches the requested sixth wave in any scenario: the best is two. Either the wave bar grows too fast for the city to keep up, or the scenario's horizon is too short for six waves.
- Money is not scarce late: the static scenario ends two seeds at $210k and $201k while wave 2 dips negative mid-fight. The shortage is transient, not structural.

# Scope
- In:
  - Treat wave 1 and wave 2 as separate problems: one is at the floor, the other over the ceiling, so a single scaling constant will not fix both.
  - Establish why no seed reaches wave 6 before tuning combat at all -- if the horizon is wrong the band is being measured on two data points per run.
  - Land item_102 from req_035 first and re-run, since a divergent staffing count would move both the threat and the firepower.
  - Record the balance output at each step in balance/history.jsonl, and note that npm run scenarios is read-only while npm run balance appends.
  - If the band itself is wrong, change it deliberately and record the rationale in this item rather than widening it to pass.
- Out:
  - Redesigning the economy or the wave rules.
  - Changing the scenario definitions to avoid the failure.

# Acceptance criteria
- AC1: Why no seed reaches wave 6 is identified and recorded, whether the fix is the wave bar or the scenario horizon.
- AC2: Wave 1 and wave 2 are both inside the band, or the band is changed with a recorded rationale.
- AC3: The scenario band is met, or the band is changed with a recorded rationale.
- AC4: Before and after balance runs are both recorded.

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
