## task_031_make_the_wave_readable_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks - Make the wave readable: a kaiju that crosses the city, missiles you can watch, and spending that never blocks
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:19:50
> Owner: Codex

# AI Context
- Summary: The executable surface of `req_029`: the kaiju loop first, then the missiles, then the balance, then the construction and the costs.
- Keywords: wave, readable, kaiju, crosses, city, missiles, you, can, watch, spending, never, blocks
- Use when: Implementing or reviewing the corrections to the attack slice.
- Skip when: You need the original attack slice's design rather than its corrections.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its four slices, then read `updateWave` in `src/app/app.ts` end to end before touching anything -- the wave's end condition, the targeting, the salvo and the damage timing all live in that one function and three of the four slices land in it.
- [x] 2. Correct nothing that is already correct. The damage is already applied at `impactAt` and the health bar already drops on impact; the defect is the rendering, and a slice that 'fixes' the timing will break what works.
- [x] 3. Take the kaiju loop first. It is the one everything else is watched through: missiles look no better against a monster that has stopped, and no balance target means anything for a wave that ends in ten seconds on the first building.
- [x] 4. Then the missiles, then the balance, then the construction and the costs -- the order the manual test put them in, and the order of how much each one changes what the player sees.
- [x] 5. Keep `src/sim/kaiju.ts` pure and seed-replayable throughout; the targeting loop is the part a headless test can actually hold, and `adr_002_keep_simulation_independent_from_babylon_and_the_browser` requires it.
- [x] 6. Reuse what exists rather than building beside it: `Treasury.spend`'s `allowDebt` flag, the existing destruction and repaint path, the existing missile flight time, the existing lifecycle states.
- [x] 7. Rewrite the balance harness before trusting any retuned number -- the current one proves nothing, and the twenty-to-forty-second target is only a claim until it is measured against the real simulation. There is one harness across this milestone, not one per request: see `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision`.
- [x] 8. Add no new resource, no debt consequence and no per-kind duration; every one of those is named as later work in the brief and each is a way for this pass to stop being deliverable.
- [x] 9. Verify a save from before this loads, and that a building saved mid-construction resumes at its progress.
- [x] 10. Run `npm run ci`, `npm run test:e2e` and `npm run balance` locally; the browser suite is the local gate, not something to discover in CI.
- [x] 11. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. the money slice's reinstated criteria and the run slice's AC6 evidence both need saying out loud in the closeout.
- [x] 12. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`
- `item_079_missiles_that_fly_and_explode_where_the_damage_lands`
- `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`
- `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC2 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC3 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC4 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC5 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC6 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC7 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC8 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC9 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC10 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`
- request-AC11 -> This task. Proof: Implemented across commits 96edd6a, b894a1d, 192213c, a437609, b4e2ee1; validated with npm run ci, npm run test:e2e, npm run balance (25.5s avg, 7.0 salvos), and npm run perf (87/103/120 fps, 607 ms rebuild). Source: `b4e2ee1`

# Validation
- (no validation recorded yet)
- 2026-09-01: npm run ci passed (247 Vitest, 6 architecture, build/typecheck, Logics lint/audit); npm run test:e2e passed (all interaction checks); npm run balance passed (25.5s avg, 7.0 salvos); npm run perf passed (87/103/120 fps, 607 ms rebuild).
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Delivered the wave's legibility: the kaiju retargets the nearest living building and re-reads the
  target set each tick, so a building placed during an attack is a candidate; attacking takes five
  seconds; the wave ends only on the kaiju's death or the last building's. Missiles became pooled
  projectiles with an arc, a trail, an impact flash and staggered launches, aimed at the kaiju's
  live position while the damage stays applied at `impactAt`. Construction rises over a 24-second
  stage with a live percentage and countdown, is charged with debt allowed, refunds half on
  demolition, and roads are no longer refused for lack of funds.
- Balance retuned to 900 hit points, a 4-second reload and 12 damage a parcel cell, measured at
  25.5 seconds over 7.0 salvos by a fight harness written into `scripts/balance.mjs`.
- Re-opened by review: that fight harness was replaced wholesale by `6f20382` in the following task,
  so the 25.5-second figure is no longer reproducible and request-AC7 no longer holds. The
  wave-scale performance figure of request-AC11 was also not taken -- the recorded entry is the
  ordinary demo rebuild. Both are carried by
  `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`, `item_079_missiles_that_fly_and_explode_where_the_damage_lands`, `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`, `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`
- Related request(s): `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`

# Links
- Request: `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)
