## item_094_the_four_criteria_that_were_closed_without_being_built - The four criteria that were closed without being built
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:19:49

# AI Context
- Summary: The delivery slice for the four criteria reported met and never written: the district alert, the wave-scale performance figure, one notion of need, and the empty prestige branches.
- Keywords: four, criteria, were, closed, being, built
- Use when: Working on the district alert, the perf record, the needs panel, or the prestige branches.
- Skip when: You need the harness or the economy.

# Problem
- The one-line alert when a district goes dark was accepted on a task marked Done, and the word 'alert' appears nowhere in the repository.
- The performance figure at wave scale was accepted, and the recorded entry in `perf/history.jsonl` is the ordinary demo rebuild -- no wave was measured, on a kaiju that now genuinely walks the city destroying building after building.
- One notion of need was accepted, and `buildingKinds.ts` was never touched: the gauges still show workforce staffing ratios while construction is still gated on separate population thresholds.
- The prestige web shrank to three `starting` nodes, which was an allowed outcome, but `UpgradeBranch` still declares `capability` and `information` and the run request named all three branches. Two branches are declared and empty.
- All four were reported met. That is the defect worth naming as much as the missing work.

# Scope
- In:
  - Build the district-going-dark alert, in the transient one-line shape the interface slice described.
  - Measure a wave: record a `npm run perf` figure for a kaiju crossing a city and destroying buildings, which is a region rebuild per building, not a single placement.
  - Make the gauges and the construction limits one notion of need, so a player reading the panel is reading what decides.
  - Settle the prestige branches: fill them with nodes that do something, or stop declaring them. Either answer is fine; declaring a branch with nothing in it is not.
  - Say in the closeout, by name, which criteria were reported met and were not. A silent re-pass teaches nothing.
- Out:
  - New prestige mechanics if the branches are filled -- a node must fit the existing effect shape or the branch goes.
  - Reworking the ledger or the needs panel's presentation beyond the figures behind it.
  - Performance work; this measures, and only optimises if the number demands it.

# Acceptance criteria
- AC1: A district going dark raises a one-line alert.
- AC2: A wave-scale performance figure is recorded, distinct from a placement's.
- AC3: The gauges are derived from the rules that gate construction.
- AC4: No prestige branch is declared without a node that does something.
- AC5: The closeout names the criteria that were previously reported met and were not.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: A district going dark raises a one-line alert.
- request-AC11 -> This backlog slice. Proof: AC2: A wave-scale performance figure is recorded, distinct from a placement's.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)
- Request: `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`
- Primary task(s): `task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
