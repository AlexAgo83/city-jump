## task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off - Let the player turn shadows and the city's own lights off
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Orchestration for req_017: shadows first (switch on the light so rebuilds adding casters stay harmless), then the city's lights as one combined answer with the hour. Both small; the risk is reaching for a quality preset instead of two switches.
- Keywords: let, player, turn, shadows, city, own, lights, off
- Use when: Implementing either backlog slice under req_017. Runs after task_018, which establishes the third World toggle and provides the counter these are measured with.
- Skip when: The change adds graphics tiers, automatic degradation, or reduces what is drawn.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its two backlog slices. Both are small; the risk is reaching for a quality preset instead of two switches.
- [ ] 2. Run after task_018. That chain adds the third World toggle and the frame-rate counter -- these are the fourth and fifth toggles, and the counter is how their effect is measured.
- [ ] 3. Shadows first: switch on the light, not on every mesh, so a rebuild that registers new casters while the setting is off stays harmless.
- [ ] 4. Then the city's lights, as one combined answer with the hour of day rather than a second opinion beside it.
- [ ] 5. Record the frame rate with each setting on and off, on the bundled Demo city, using the counter from req_016.
- [ ] 6. Extend the browser interaction suite for both toggles, then run the fast gate and the visual check.
- [ ] 7. Confirm the Demo city looks exactly as it does today with both settings at their defaults.
- [ ] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`
- `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`. Proof deferred to slice closeout.
- request-AC3 -> `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`. Proof deferred to slice closeout.
- request-AC6 -> `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`. Proof deferred to slice closeout.
- request-AC7 -> `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`. Proof deferred to slice closeout.
- request-AC2 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.
- request-AC4 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.
- request-AC5 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.
- request-AC6 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.
- request-AC7 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.
- request-AC8 -> `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`
- Product brief(s): `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`
- Architecture decision(s): (none yet)
