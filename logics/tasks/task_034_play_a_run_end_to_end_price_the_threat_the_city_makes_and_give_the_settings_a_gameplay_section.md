## task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section - Play a run end to end, price the threat the city makes, and give the settings a Gameplay section
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 14:54:13
> Owner: Codex

# AI Context
- Summary: The executable surface of `req_032`: the harness first, then the threat rate and the military measurement, then the Gameplay section.
- Keywords: play, run, end, price, threat, city, makes, settings, gameplay, section
- Use when: Implementing or reviewing the end-to-end harness, the threat rate, or the gameplay switches.
- Skip when: You need a single earlier slice's own design.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its three slices, and read the two requests before it -- the legibility one and the loop-closure one. This request is what would have caught both, and it deliberately does not fix what they own.
- [x] 2. Consider writing the harness first and letting it fail on each known defect in turn. It is a legitimate order and probably the better one: a harness written after the fixes proves the fixes, while a harness written before them proves the harness.
- [x] 3. Build the playthrough on the same entry points the game uses. A test-only shortcut past a decision the player has to make is how `scripts/balance.mjs` came to prove nothing, and it is the one mistake this slice cannot afford to repeat.
- [x] 4. Follow the needs, then report what following them does. If the gauges cannot be followed to a surviving city, that is the finding and it goes in the closeout -- do not tune the policy until it passes.
- [x] 5. There is one balance harness, per `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision`. If the legibility request has already rewritten it onto the real simulation, extend it; if not, build it here and say so, because the other request expects it to exist. Milestone 9.0 of `road_002_city_jump_a_city_worth_defending` carries the order across all four chains; this plan carries only this one.
- [x] 6. Design the threat rate together with the threat scaling the loop-closure request owns. Building them apart is fine; designing them apart will produce two rules that disagree.
- [x] 7. Measure the military gap and report it. Closing it is combat balance and belongs elsewhere -- this slice's job is to make the number exist.
- [x] 8. Build each gameplay switch after the thing it switches: free building needs costs to have returned, instant construction needs the construction stage. Neither is buildable before its slice.
- [x] 9. Say plainly what a pacifist run stops accruing. A mode that silently disables the science economy is worse than no mode.
- [x] 10. Run `npm run ci`, `npm run test:e2e` and `npm run balance` locally; the browser suite is the local gate and this request moves controls it clicks.
- [x] 11. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The run-panel request's hardcore wording is superseded here and its slice needs the note.
- [x] 12. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_088_a_harness_that_plays_a_run_from_arrival_to_the_first_kaiju`
- `item_089_a_threat_the_city_generates_and_a_military_that_is_measured_against_it`
- `item_090_a_gameplay_section_in_settings_hardcore_pacifist_instant_build_free_build`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC2 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC3 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC4 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC5 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC6 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC7 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC8 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC9 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`
- request-AC10 -> This task. Proof: Implemented in 6f20382; validated with npm run ci, npm run test:e2e, and npm run balance. Source: `6f20382`

# Validation
- `npm run ci` passed.
- `npm run test:e2e` passed.
- `npm run balance` passed: 6 playthrough runs, average first wave 40.0s, average military gap 15765.7.
- command: `npm run ci; npm run test:e2e; npm run balance` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Added `src/sim/playthrough.ts` and `src/sim/playthrough.test.ts`: the harness builds roads through graph snapping/commit, paints zones, advances lifecycle/economy/wave state, follows a basic needs policy, and asserts first-wave outcomes for total loss, partial loss and clean hold.
- Wave arrival now uses accumulated city threat in `src/sim/wave.ts`; tests prove sprawling and consolidated cities reach the first wave at different times while the HUD keeps a countdown.
- Extended the single balance path in `scripts/balance.mjs` to run the playthrough harness and report military capacity versus first-wave threat across seeds.
- Added run-carried gameplay rules for kaiju spawn, instant construction and free building; saves default older runs deliberately to normal rules.
- Added Gameplay settings controls in `index.html`/`src/app/app.ts`; pacifist mode states that waves, science and prestige pause, and e2e covers persistence/reset.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_088_a_harness_that_plays_a_run_from_arrival_to_the_first_kaiju`, `item_089_a_threat_the_city_generates_and_a_military_that_is_measured_against_it`, `item_090_a_gameplay_section_in_settings_hardcore_pacifist_instant_build_free_build`
- Related request(s): `req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable`

# Links
- Request: `req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable`
- Product brief(s): `prod_023_a_game_that_plays_itself_once_before_anyone_believes_it`
- Architecture decision(s): (none yet)
