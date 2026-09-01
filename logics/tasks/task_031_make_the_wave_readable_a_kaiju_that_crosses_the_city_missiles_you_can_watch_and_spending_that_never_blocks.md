## task_031_make_the_wave_readable_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks - Make the wave readable: a kaiju that crosses the city, missiles you can watch, and spending that never blocks
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:26:11
> Owner: Codex

# AI Context
- Summary: The executable surface of `req_029`: the kaiju loop first, then the missiles, then the balance, then the construction and the costs.
- Keywords: wave, readable, kaiju, crosses, city, missiles, you, can, watch, spending, never, blocks
- Use when: Implementing or reviewing the corrections to the attack slice.
- Skip when: You need the original attack slice's design rather than its corrections.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its four slices, then read `updateWave` in `src/app/app.ts` end to end before touching anything -- the wave's end condition, the targeting, the salvo and the damage timing all live in that one function and three of the four slices land in it.
- [ ] 2. Correct nothing that is already correct. The damage is already applied at `impactAt` and the health bar already drops on impact; the defect is the rendering, and a slice that 'fixes' the timing will break what works.
- [ ] 3. Take the kaiju loop first. It is the one everything else is watched through: missiles look no better against a monster that has stopped, and no balance target means anything for a wave that ends in ten seconds on the first building.
- [ ] 4. Then the missiles, then the balance, then the construction and the costs -- the order the manual test put them in, and the order of how much each one changes what the player sees.
- [ ] 5. Keep `src/sim/kaiju.ts` pure and seed-replayable throughout; the targeting loop is the part a headless test can actually hold, and `adr_002_keep_simulation_independent_from_babylon_and_the_browser` requires it.
- [ ] 6. Reuse what exists rather than building beside it: `Treasury.spend`'s `allowDebt` flag, the existing destruction and repaint path, the existing missile flight time, the existing lifecycle states.
- [ ] 7. Rewrite the balance harness before trusting any retuned number -- the current one proves nothing, and the twenty-to-forty-second target is only a claim until it is measured against the real simulation. There is one harness across this milestone, not one per request: see `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision`.
- [ ] 8. Add no new resource, no debt consequence and no per-kind duration; every one of those is named as later work in the brief and each is a way for this pass to stop being deliverable.
- [ ] 9. Verify a save from before this loads, and that a building saved mid-construction resumes at its progress.
- [ ] 10. Run `npm run ci`, `npm run test:e2e` and `npm run balance` locally; the browser suite is the local gate, not something to discover in CI.
- [ ] 11. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. the money slice's reinstated criteria and the run slice's AC6 evidence both need saying out loud in the closeout.
- [ ] 12. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`
- `item_079_missiles_that_fly_and_explode_where_the_damage_lands`
- `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`
- `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`. Proof deferred to slice closeout.
- request-AC2 -> `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`. Proof deferred to slice closeout.
- request-AC3 -> `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`. Proof deferred to slice closeout.
- request-AC4 -> `item_079_missiles_that_fly_and_explode_where_the_damage_lands`. Proof deferred to slice closeout.
- request-AC5 -> `item_079_missiles_that_fly_and_explode_where_the_damage_lands`. Proof deferred to slice closeout.
- request-AC6 -> `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`. Proof deferred to slice closeout.
- request-AC7 -> `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`. Proof deferred to slice closeout.
- request-AC8 -> `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`. Proof deferred to slice closeout.
- request-AC9 -> `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`. Proof deferred to slice closeout.
- request-AC10 -> `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`. Proof deferred to slice closeout.
- request-AC11 -> `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)
