## task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is - Let the player turn the traffic simulation off and set how busy the city is
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 70%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-30 18:38:12

# AI Context
- Summary: Orchestration for req_018: the switch first (no movers, no per-frame step, headlights joined with `Lights`), then density as one scaling factor. The trap is a slider wired straight to a rebuild -- read run_008 rung 9 before writing it.
- Keywords: let, player, turn, traffic, simulation, off, set, busy, city
- Use when: Implementing either backlog slice under req_018. Runs after task_019, which settles the World-toggle pattern and the shared headlight answer.
- Skip when: The change adds routing or demand, alters traffic behaviour, or reacts automatically to the frame rate.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its two backlog slices. The trap here is a slider wired straight to a rebuild; read `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` rung 9 before writing it.
- [ ] 2. Run after task_019. That chain settles the World-toggle pattern and the shared answer for the headlight cluster this one has to join.
- [ ] 3. The switch first: no movers, no per-frame step, and the headlight cluster answering to both this and the `Lights` setting.
- [ ] 4. Then density: one factor scaling the three spawn counts, pure and unit-tested, with the default reproducing today's city exactly.
- [ ] 5. Throttle the slider before wiring it to anything -- settle on a value, then respawn once.
- [ ] 6. Record the frame rate on the bundled Demo city at traffic off, default density and maximum density, using the counter from req_016.
- [ ] 7. Extend the browser interaction suite for both, then run the fast gate and the visual check.
- [ ] 8. Confirm the Demo city is identical to today with both settings at their defaults.
- [ ] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`
- `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`. Proof deferred to slice closeout.
- request-AC7 -> `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`. Proof deferred to slice closeout.
- request-AC8 -> `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.
- request-AC4 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.
- request-AC5 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.
- request-AC6 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.
- request-AC7 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.
- request-AC9 -> `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
- Product brief(s): `prod_015_a_city_whose_traffic_is_the_player_s_to_dial`
- Architecture decision(s): (none yet)
