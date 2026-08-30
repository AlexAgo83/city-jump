## task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off - Let the player turn shadows and the city's own lights off
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-30 18:37:32

# AI Context
- Summary: Orchestration for req_017: shadows first (switch on the light so rebuilds adding casters stay harmless), then the city's lights as one combined answer with the hour. Both small; the risk is reaching for a quality preset instead of two switches.
- Keywords: let, player, turn, shadows, city, own, lights, off
- Use when: Implementing either backlog slice under req_017. Runs after task_018, which establishes the third World toggle and provides the counter these are measured with.
- Skip when: The change adds graphics tiers, automatic degradation, or reduces what is drawn.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its two backlog slices. Both are small; the risk is reaching for a quality preset instead of two switches.
- [x] 2. Run after task_018. That chain adds the third World toggle and the frame-rate counter -- these are the fourth and fifth toggles, and the counter is how their effect is measured.
- [x] 3. Shadows first: switch on the light, not on every mesh, so a rebuild that registers new casters while the setting is off stays harmless.
- [x] 4. Then the city's lights, as one combined answer with the hour of day rather than a second opinion beside it.
- [x] 5. Record the frame rate with each setting on and off, on the bundled Demo city, using the counter from req_016.
- [x] 6. Extend the browser interaction suite for both toggles, then run the fast gate and the visual check.
- [x] 7. Confirm the Demo city looks exactly as it does today with both settings at their defaults.
- [x] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`
- `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC3 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC6 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC7 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC2 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC4 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC5 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC6 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC7 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`
- request-AC8 -> This task. Proof: Implemented in 36af6c9. Validated on 2026-08-30 with rtk npm run ci, rtk npm run test:e2e, rtk npm run test:visual, and Demo FPS samples: default 40, shadows off 55, lights off 62, both off 65. Source: `36af6c9`

# Validation
- (no validation recorded yet)
- command: `rtk npm run ci; rtk npm run test:e2e; rtk npm run test:visual; Playwright Demo FPS: default 40, shadows off 55, lights off 62, both off 65` | result: passed | date: 2026-08-30
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`, `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`
- Related request(s): `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`, `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`

# Links
- Request: `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`
- Product brief(s): `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`
- Architecture decision(s): (none yet)
