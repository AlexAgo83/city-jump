## item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it - Make the performance scenario measure a city with buildings in it
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Measured on HEAD: the perf scenario reports buildings 0, population 12, activeMeshes 15, timeRate 0. The last comparable record had buildings 1583 and activeMeshes 2388, so every delta the harness prints today is an artifact of measuring an empty city.
- Keywords: demoCity, construction lifecycle, timeRate zero, activeMeshes, like-for-like comparison, perf scenario
- Use when: reading or recording a perf measurement, or before claiming any rendering improvement.
- Skip when: fixing the harness timeout, which item_110 owns and which is already done.

# Problem
- Probed directly on HEAD with the debug API after `reset(); demoCity(); rebuild()`: `buildings: 0`, `population: 12`, `timeRate: 0`, `activeMeshes: 15`, against `segments: 237`, `zones: 272`, `trees: 2441`, `cars: 237`.
- The last comparable entry in perf/history.jsonl (2026-09-01, a437609) recorded `buildings: 1583` and `activeMeshes: 2388`. The scenario stopped producing buildings somewhere in 0.4.0.
- The cause is the construction lifecycle 0.4.0 introduced: `demoCity()` lays roads, zones, trees and traffic, but a lot only becomes a building once its construction stage completes, and that needs the simulation clock. perf.mjs never starts it -- `timeRate` is 0 for the whole measurement.
- So the harness measures roads, trees and traffic over empty land. The deltas it printed on the first successful run after the timeout fix -- `street 84 fps (-36)`, `rebuild 431 ms (-176)` -- compare that empty city against a 1583-building one and mean nothing.
- The guard at scripts/perf.mjs:74 was meant to prevent exactly this. Its comment says "a city half-loaded draws half the buildings, and reads as fast for the wrong reason", but it waits on `stats().models`, the count of loaded GLB files, not on buildings standing. It is satisfied by 28 models and zero buildings.

# Scope
- In:
  - Make the scenario produce a built city before measuring: either run the clock until the lot count settles, or drive the instant-construction rule the scenarios harness already uses.
  - Change the settle guard to wait on buildings standing rather than on models loaded, so the comment at scripts/perf.mjs:74 becomes true.
  - Record in docs/performance.md that entries before this fix are not comparable with entries after it, and say why.
  - Re-take the baseline once the scenario builds, since the current clean entry (418c133) measures the empty city.
- Out:
  - Changing what perf measures or its metric set.
  - Changing the construction lifecycle to suit the harness.
  - Running perf in CI, which has no GPU.

# Acceptance criteria
- AC1: A perf run reports a building count of the same order as the city's lot count, not zero.
- AC2: The settle guard waits on buildings standing, and fails rather than measuring an empty city.
- AC3: docs/performance.md states which entries are comparable with which, and why the break exists.
- AC4: A fresh baseline is recorded on a clean tree with the scenario building.

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
- Rationale: Blocks item_118 and therefore every claim in this chain: nothing here can be shown against a baseline that measures an empty city.

# Tasks
- `task_039_orchestrate_the_per_frame_cost_work`

# Notes
- Found by running the harness and then probing the debug API, not by reading perf/history.jsonl.
