## item_118_show_the_frame_cost_came_down - Show the frame cost came down
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 70%
> Progress: 10%
> Complexity: Low
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: Without a before and after on a clean tree, every claim in req_037 is an assertion -- and today the harness measures an empty city, so item_133 must land first or the comparison is meaningless.
- Keywords: perf record, baseline comparison, same label same city, docs/performance.md
- Use when: closing out per-frame cost work, or claiming a rendering improvement.
- Skip when: adding perf to CI, or changing the measured city or metric set.

# Problem
- CONTRIBUTING.md:38 requires rendering work meant to be faster to show it, and the record cannot support that today: perf/history.jsonl stops 77 commits back with dirty entries.
- Without a before and after on a clean tree, every claim in this request is an assertion.
- Blocked by item_133: the clean entry recorded for 418c133 reports buildings 0 and activeMeshes 15, so comparing against it would measure roads and trees over empty land. Do not open this item until the scenario builds a city.

# Scope
- In:
  - Take the after measurement on a clean tree against the baseline req_036 item_110 records.
  - Record it with the same label and city so the two are comparable.
  - Note in docs/performance.md what the state-upload gate and the sun step now cost, so the next reader knows what is already paid for.
- Out:
  - Adding perf to CI, which has no GPU.
  - Changing the measured city or the metric set.

# Acceptance criteria
- AC1: A clean-tree measurement for this work exists in perf/history.jsonl.
- AC2: It uses the same label and city as the baseline.
- AC3: docs/performance.md records what changed, including any metric that did not improve.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A clean-tree measurement for this work exists in perf/history.jsonl.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
