## item_132_stop_a_city_with_no_utilities_dying_outright - Stop a city with no utilities dying outright
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 85%
> Confidence: 80%
> Progress: 0%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Measured live on HEAD: the no-utilities scenario ends with population ZERO on all six seeds while banking about 34k. Not a harder game -- a total collapse, and one no band filter can see.
- Keywords: placeUtilities false, population zero, total collapse, power, water, scenario blind spot
- Use when: investigating why a city dies, or what happens when power and water are never built.
- Skip when: tuning combat difficulty, which item_109 owns.

# Problem
- Running npm run scenarios on HEAD, the `expanding city, no utilities built` scenario ends every one of six seeds with final pop=0, ended=alive, science=0, and a treasury of roughly $34,000-$35,500.
- The city does not struggle without power and water; it empties completely, and then sits on the money it never spent. The other two scenarios, which do build utilities, reach populations of 1000+.
- Zero waves are fought, so the scenario contributes nothing to the band statistics: `0 waves fought, 0 held, 0 outside the band`. A gate that only checks the band reports this scenario as clean.
- This was not in the 0.4.0 review. It surfaced only from running the harness rather than reading its recorded output, and the recorded output was 100 commits stale.
- Unknown whether this is intended severity or a defect. The scenario exists precisely to contrast against the utilities-built run, so some penalty is deliberate; total depopulation with a full treasury is a different claim.

# Scope
- In:
  - Establish whether population zero is the intended consequence of never building utilities, or a defect in how the shortage drains residents.
  - If it is a defect, find the drain: the homeless path at src/sim/economy.ts:159 and the utility supply gate are the first two places to look.
  - If it is intended, record that decision here so the scenario's result stops reading as an unnoticed failure.
  - Either way, make the outcome visible to the gate item_108 builds, since a band filter cannot see a city that never fights.
- Out:
  - Combat tuning and the wave band, which item_109 owns.
  - Changing the utility catalogue, radii or costs.
  - Removing the scenario to avoid the result.

# Acceptance criteria
- AC1: Whether population zero is intended is decided and recorded.
- AC2: If it is a defect, a city without utilities declines to a floor rather than to zero, and a test pins that floor.
- AC3: A seed ending with zero population fails the scenario gate rather than passing invisibly.
- AC4: The contrast the scenario exists to draw is still visible in its output.

# Decision framing
- Product framing: Needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Primary task(s): `task_038_orchestrate_the_verification_gates`

# Priority
- Priority: High
- Rationale: A total-collapse failure mode that the gate being built in the same chain would not catch.

# Tasks
- `task_038_orchestrate_the_verification_gates`

# Notes
- Found by running the harness during review follow-up, not by reading balance/history.jsonl, which was stale.
