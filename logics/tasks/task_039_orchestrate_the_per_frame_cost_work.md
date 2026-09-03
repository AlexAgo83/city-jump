## task_039_orchestrate_the_per_frame_cost_work - Orchestrate the per-frame cost work
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 75%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 15:41:32

# AI Context
- Summary: Gate the uploads, step the sun, index the yielding -- each measured against the clean baseline req_036 records.
- Keywords: signature gate, sun step, occupancy index, mover resolution, perf measurement
- Use when: implementing req_037, once a clean baseline exists.
- Skip when: no clean perf baseline has been recorded yet: without it nothing here can be shown.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Do not start until req_036 item_110 has recorded a clean baseline; without it nothing here can be shown.
- [x] 2. Wave 1: the building state signature and the distant-loop map, measured immediately -- this is the largest single cost.
- [x] 3. Wave 2: the sun step and the signals allocation, minding the midnight wrap.
- [x] 4. Wave 3: the supplied-utility memo, after req_035's restake exists so the invalidation has something to hook.
- [x] 5. Wave 4: the traffic occupancy index, and elucidate the discarded entry radius before touching it.
- [x] 6. Wave 5: the mover segment re-resolution.
- [x] 7. Wave 6: the after measurement and the docs/performance.md note.
- [x] 8. Run npm run test:e2e after any wave touching the render loop, per CONTRIBUTING.md:53.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_113_gate_the_building_state_upload_on_a_change_signature`
- `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`
- `item_115_fan_the_sun_out_once_per_visible_step`
- `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`
- `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`
- `item_118_show_the_frame_cost_came_down`
- `item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC2 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC3 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC4 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC5 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC7 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC6 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`
- request-AC8 -> This task. Proof: Implemented by task_039 commits c9321ea, 6b63046, 9b15535, 163c37e, 938cebd, 8b64610, 6d25554, and 6255a43. Validated with rtk npm run ci and rtk npm run perf; perf/history.jsonl has clean built-demo row 6d25554, which records the final non-improving fps result. Source: `6255a43`

# Validation
- 2026-09-03 wave item_133: Playwright probe of the perf setup settled at `237 segments`, `101 buildings`, `101 working`, `237 cars`, `42 active meshes`.
- 2026-09-03 wave item_133: `npm run ci` passed after the harness change.
- 2026-09-03 wave item_133: clean `npm run perf` on `c9321ea` appended a `dirty:false` built-demo baseline with `101 buildings`.
- 2026-09-03 wave item_133: `npm run ablate -- --rounds 1 --ms 1200` recorded built-demo ratios; traffic off was the clearest single toggle at x1.09 overview / x1.18 street.
- 2026-09-03 wave item_113: `rtk npm exec -- vitest run src/render/buildings.test.ts && npm run typecheck` passed.
- 2026-09-03 wave item_113: live Playwright probe counted zero building `thinInstanceSetBuffer` writes after a repeated settled update on the 101-building demo.
- 2026-09-03 wave item_113: `rtk npm run ci` passed.
- 2026-09-03 wave item_113: `rtk npm run test:e2e` fails at `scripts/interact.mjs:1021` waiting for zone-clear to reduce `stats().zones`; comparison worktree `bd2ee98` fails the same way, so this is a pre-existing gate gap outside item_113.
- 2026-09-03 wave item_113: clean `npm run perf` on `6b63046` appended `dirty:false`, `101 buildings`, fps `99 / 110 / 79`, rebuild `436 ms`.
- 2026-09-03 wave item_115: live x1 clock probe counted `4` tree-shadow matrix uploads over `500 ms`, showing minute-step fan-out rather than frame-by-frame fan-out.
- 2026-09-03 wave item_115: midnight probe from slider `23.99` reached displayed time `00:06` after x4 for `300 ms`.
- 2026-09-03 wave item_115: `npm run typecheck && rtk npm run ci` passed.
- 2026-09-03 wave item_114: `app.ts` caches supplied utilities and diffusers on `graph.revision`; utility restake already invalidates that key.
- 2026-09-03 wave item_114: `npm run typecheck && rtk npm run ci` passed.
- 2026-09-03 wave item_117: dirty traffic rebuilds keep eligible movers but re-resolve their segment object from the graph first.
- 2026-09-03 wave item_117: `rtk npx vitest run src/render/traffic.test.ts` and `npm run typecheck` passed.
- 2026-09-03 wave item_116: traffic now builds one frame occupancy index for roundabout yielding, exiting rides, crossing walkers, and ring-room spacing.
- 2026-09-03 wave item_116: roundabout lane-blocking behaviour is intentionally unchanged; same-lane-only yielding belongs to req_035 if product wants it.
- 2026-09-03 wave item_116: `npm run typecheck`, `rtk npx vitest run src/render/traffic.test.ts`, and `rtk npm run ci` passed; `rtk npm run test:e2e` passed traffic movement checks before the known zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave item_118: `rtk npm run perf` appended clean built-demo row `6d25554`, 237 segments, 101 buildings, 42 active meshes.
- 2026-09-03 wave item_118: final row did not prove fps improvement: 85 / 108 / 73 fps and 522 ms rebuild; `docs/performance.md` records the non-improvement.
- command: `rtk npm run ci; rtk npm run perf` | result: passed | date: 2026-09-03
- Finish workflow executed on 2026-09-03.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-03.
- Linked backlog item(s): `item_113_gate_the_building_state_upload_on_a_change_signature`, `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`, `item_115_fan_the_sun_out_once_per_visible_step`, `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`, `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`, `item_118_show_the_frame_cost_came_down`, `item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it`
- Related request(s): `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`

# Links
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) abandon any optimisation here whose measurement shows no gain -- a null result closes the item, and item_133 exists so that the measurement can be trusted. (2) In item_116, if ring lanes turn out not to be meant to block each other, raise the fix against req_035 and close the perf half separately rather than fixing right-of-way inside a performance change. Reserved for the owner: whether a 10.5 s startup and a 2.5 s demo build are acceptable. That number surfaced while measuring, belongs to no slice here, and needs its own decision rather than being folded into per-frame work.
- item_133 closed the baseline blocker for this task: entries before `c9321ea` are clean but empty-city and not comparable with the built-demo baseline.
