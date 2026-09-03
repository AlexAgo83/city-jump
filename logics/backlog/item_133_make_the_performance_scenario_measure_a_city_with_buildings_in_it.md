## item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it - Make the performance scenario measure a city with buildings in it
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 30%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: Measured on HEAD: the scenario reports buildings 0, population 12, activeMeshes 15, timeRate 0, against a last-comparable 1583 and 2388. Blocks BOTH harnesses -- perf and ablate share the setup, so ablate's `buildings off x1.02` is a tautology, not a measurement.
- Keywords: demoCity, construction lifecycle, timeRate zero, activeMeshes, like-for-like comparison, perf scenario, ablate
- Use when: reading or recording a perf measurement, or before claiming any rendering improvement.
- Skip when: fixing the harness timeout, which item_110 owns and which is already done.

# Problem
- Probed directly on HEAD with the debug API after `reset(); demoCity(); rebuild()`: `buildings: 0`, `population: 12`, `timeRate: 0`, `activeMeshes: 15`, against `segments: 237`, `zones: 272`, `trees: 2441`, `cars: 237`.
- The last comparable entry in perf/history.jsonl (2026-09-01, a437609) recorded `buildings: 1583` and `activeMeshes: 2388`. The scenario stopped producing buildings somewhere in 0.4.0.
- The cause is the construction lifecycle 0.4.0 introduced: `demoCity()` lays roads, zones, trees and traffic, but a lot only becomes a building once its construction stage completes, and that needs the simulation clock. perf.mjs never starts it -- `timeRate` is 0 for the whole measurement.
- So the harness measures roads, trees and traffic over empty land. The deltas it printed on the first successful run after the timeout fix -- `street 84 fps (-36)`, `rebuild 431 ms (-176)` -- compare that empty city against a 1583-building one and mean nothing.
- The guard at scripts/perf.mjs:74 was meant to prevent exactly this. Its comment says "a city half-loaded draws half the buildings, and reads as fast for the wrong reason", but it waits on `stats().models`, the count of loaded GLB files, not on buildings standing. It is satisfied by 28 models and zero buildings.
- scripts/ablate.mjs has the same setup (`reset(); demoCity(); rebuild()`, no clock), so it is blocked by the same thing. Its first successful run after its own toolbar fix reported `buildings off x1.02` overview and `x1.01` street -- switching off nothing, and reading as if buildings were free. Its `traffic off x1.11 / x1.24` is usable, because traffic really is in the scene.
- This matters beyond the record: ablate is the tool that says which renderer costs the frame rate, and it is what should be setting the priorities inside this chain. Until it measures a built city, item_113 is filed as the largest per-frame cost on the strength of reading the code alone.

# Scope
- In:
  - Make the scenario produce a built city before measuring: either run the clock until the lot count settles, or drive the instant-construction rule the scenarios harness already uses. Apply it to both scripts/perf.mjs and scripts/ablate.mjs, or factor the setup into one place they share.
  - Change the settle guard to wait on buildings standing rather than on models loaded, so the comment at scripts/perf.mjs:74 becomes true.
  - Record in docs/performance.md that entries before this fix are not comparable with entries after it, and say why.
  - Re-take the baseline once the scenario builds, since the current clean entry (418c133) measures the empty city.
  - Re-run ablate on the built city and use its ratios to re-order this chain's priorities, rather than keeping the order a code reading produced.
- Out:
  - Changing what perf measures or its metric set.
  - Changing the construction lifecycle to suit the harness.
  - Running perf in CI, which has no GPU.

# Acceptance criteria
- AC1: A perf run and an ablate run each report a building count of the same order as the city's lot count, not zero.
- AC2: The settle guard waits on buildings standing, and fails rather than measuring an empty city.
- AC3: docs/performance.md states which entries are comparable with which, and why the break exists.
- AC4: A fresh baseline is recorded on a clean tree with the scenario building.
- AC5: An ablate run on the built city is recorded, and this chain's priorities are re-ordered to match it or the divergence is explained.

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
- 2026-09-03 wave: `scripts/perf.mjs` and `scripts/ablate.mjs` now build the demo through the existing debug path before measurement: `demoCity(); setRunRules({ instantConstruction: true, freeBuilding: true }); zone(0, 0, 1200, "residential"); growCity(2000, 3000); rebuild();`.
- Guard proof: a Playwright probe against the same setup settled at `segments=237`, `buildings=101`, `buildingStates.working=101`, `population=3000`, `cars=237`, `activeMeshes=42`; the guard waits on stable `stats().buildings > 0` plus loaded models, so the old empty city times out instead of recording.
- Clean baseline proof: `npm run perf` from clean commit `c9321ea` appended `dirty:false` with `237 segments`, `101 buildings`, `237 cars`, `42 active meshes`, fps `overview=98`, `district=116`, `street=77`, `rebuild=437 ms`.
- Built-city ablate proof: `npm run ablate -- --rounds 1 --ms 1200` on the same harness measured overview `buildings off x1.01`, `traffic off x1.09`, `shadows off x0.91`, `lights off x0.86`, `all three off x1.17`; street `buildings off x1.01`, `traffic off x1.18`, `shadows off x1.00`, `lights off x0.99`, `all three off x1.30`.
- Priority note: the built-demo ablation does not support treating buildings as the largest per-frame toggle on this small harness. Keep the current item order only because item_113 also gates CPU upload churn, and let item_116's traffic occupancy work carry the stronger measured toggle gain.
