## item_108_let_the_scenario_harness_exit_non_zero - Let the scenario harness exit non-zero
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Verified: scenario() returns offTarget and all three call sites discard it, and the file contains no process.exit. Note the blind spot: offTarget only filters waves that were fought, so a run where no wave ever arrives is invisible to it -- which is the actual current failure.
- Keywords: run-scenarios, offTarget, exit code, target band, ci script, red gate
- Use when: wiring the scenario harness or asking why an out-of-band run passes.
- Skip when: changing the target band, which item_109 owns deliberately, or adding browser suites to CI.

# Problem
- scripts/run-scenarios.mjs:48 computes offTarget and :51 prints it, but the three scenario() calls at the bottom of the file discard the returned {runs, fought, offTarget} and the file contains no process.exit. The harness cannot fail anything.
- npm run scenarios is not in the ci script, and unlike test:e2e and test:visual there is no reason it should not be: it is pure Node with no browser and no GPU.
- A band-only gate would be green on today's broken game. offTarget filters `fought`, which is flatMap over each run's waves, so a run that never triggers a wave contributes nothing. In the last recorded balance run, the three seeds that fought were all inside the band (salvos 6, 7, 7; combat 21.5 to 25.25 s) and the three that failed never reached the population bar at all -- exactly the case the filter cannot see. `runs reaching wave N` is printed at :55 and never returned.

# Scope
- In:
  - Collect the three scenario() results and exit non-zero when any wave falls outside the 20-40s / 5-8 salvo band, naming the offending scenario and seed.
  - Also gate on a run producing no wave at all, since the band filter is blind to a city that is never attacked. Do NOT assert that every seed reaches the requested wave count: measured on HEAD, that is 0/6 in all three scenarios, so it would fail 18 times out of 18 and gate nothing usefully until item_109 explains why. Assert at least one wave per seed now, and tighten once the horizon question is answered.
  - Gate on a seed ending with zero population, which is the no-utilities scenario's current outcome on all six seeds and is invisible to a band filter.
  - Keep the printed summary for a passing run.
  - Add npm run scenarios to the ci script only once all three assertions pass, so the gate does not land red.
- Out:
  - Changing the target band, which item AC2 owns deliberately.
  - Adding the browser suites to CI.
  - Changing what the scenarios simulate.

# Acceptance criteria
- AC1: A run with a wave outside the band exits non-zero and names the scenario and seed.
- AC5: A seed that never triggers a wave, or that ends with zero population, fails the gate rather than passing invisibly.
- AC6: The gate's assertions are all achievable on HEAD once item_109 lands, so wiring it into ci does not leave main permanently red.
- AC2: A run inside the band exits zero and still prints its summary.
- AC3: The ci script includes scenarios only when the band is met on main.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A run with a wave outside the band exits non-zero and names the scenario and seed.

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
