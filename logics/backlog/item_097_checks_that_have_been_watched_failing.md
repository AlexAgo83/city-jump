## item_097_checks_that_have_been_watched_failing - Checks that have been watched failing
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:04:51

# AI Context
- Summary: The delivery slice for the tests: four assertions that cannot fail replaced, every check watched failing with its behaviour removed, and the needs-following policy finally built.
- Keywords: checks, been, watched, failing
- Use when: Working on `src/sim/playthrough.test.ts` or the needs policy at `src/sim/playthrough.ts` line 92.
- Skip when: You need the balance numbers or the ledger.

# Problem
- Four assertions in `src/sim/playthrough.test.ts` cannot fail: `expect(["total_loss","partial_loss","clean_hold"]).toContain(played.wave.shape)` over a value the return type already constrains; `expect(played.wave.rebuildingCost).toBeGreaterThanOrEqual(0)` over a product of positives; `expect(playFirstRun(3, { kaijuSpawns: false }).wave.threat).toBe(0)` over a literal returned by the pacifist early return; and `expect(Number.isFinite(militaryGap(3))).toBe(true)` over ordinary arithmetic.
- They were written under a criterion saying an assertion that cannot fail is replaced rather than supplemented, and a plan step saying to prove each one by removing the behaviour it names.
- The needs-following policy was reported built twice and has never been built. Line 92 of `src/sim/playthrough.ts` compares `short.kind` against `firstNeeds.find(need => need.kind === short.kind)?.kind` -- the same value -- so it is always false and a full run logs zero `need:` entries.
- Every zone is still painted before the loop, so nothing is ever built in response to a gauge and the claim that the gauges can be followed has still never been tested.

# Scope
- In:
  - Replace the four named assertions with checks over behaviour: which outcome the fight produced and why, what the rebuild actually cost, that a pacifist run schedules no wave at all rather than that a literal is zero, and what the military measurement says about the fight.
  - Apply the mutation protocol to every test this request touches: delete or invert the behaviour the assertion names, run it, confirm it fails, restore. Record in the closeout that this was done and which behaviours were removed to prove it.
  - Build the needs-following policy: zone in response to what the gauges report short, inside the loop rather than before it, and log what was built and which shortage prompted it.
  - Assert what following the gauges produces. If following them does not lead to a city that survives its first wave, report that as a finding rather than adjusting the policy until it passes.
  - Fix line 92 rather than working around it; it is the concrete evidence that this was never built.
- Out:
  - The balance numbers, which the defence slice owns.
  - The browser interaction suite.
  - Adding tests beyond the behaviours these criteria name.

# Acceptance criteria
- AC1: None of the four named assertions remains, and none of their replacements passes by construction.
- AC2: Every test this request touches has been watched to fail with its behaviour removed, and the closeout says which behaviours were removed.
- AC3: A run zones in response to a reported shortage and logs what it built and why, with a non-zero count of such entries.
- AC4: What following the gauges produces is asserted, and reported honestly if it is not survival.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: None of the four named assertions remains, and none of their replacements passes by construction.
- request-AC6 -> This backlog slice. Proof: AC2: Every test this request touches has been watched to fail with its behaviour removed, and the closeout says which behaviours were removed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Primary task(s): `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
