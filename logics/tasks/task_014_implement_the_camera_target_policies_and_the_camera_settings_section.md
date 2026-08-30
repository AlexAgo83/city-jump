## task_014_implement_the_camera_target_policies_and_the_camera_settings_section - Implement the camera target policies and the Camera settings section
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:03:06
> Owner: codex

# AI Context
- Summary: Orchestration for req_012: a switchable per-frame target policy with Free unchanged, then orbit, then the Camera section and its persistence rules, then follow once cars are selectable.
- Keywords: implement, camera, target, policies, settings, section
- Use when: Implementing any of the four backlog slices under req_012, in the plan's order.
- Skip when: The change adds a second camera type, a cinematic editor, or alters the existing pan and zoom behaviour.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- The follow slice is blocked until cars and pedestrians can be selected, which `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel` delivers. The other three slices have no such dependency and can land before it.
- Following becomes durable rather than best-effort once `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work` stops disposing the whole mover population on every rebuild. This task does not wait for that: follow ends gracefully and says why, and simply stops needing to once that work lands.

# Plan
- [ ] 1. Read this request and its four backlog slices; note that the follow slice depends on cars being selectable and must not start before that exists.
- [ ] 2. Introduce the switchable target policy with Free unchanged, and the escape-to-Free rule -- everything else builds on it.
- [ ] 3. Add Orbit, and tune its pace by looking at it rather than by picking a number.
- [ ] 4. Add the Camera section and the persistence rules, so the modes are reachable and cannot corrupt the resumed view.
- [ ] 5. Add Follow once selection covers cars and pedestrians, including its graceful end when the subject disappears.
- [ ] 6. Extend the browser interaction suite, then run the fast gate and the visual check; confirm a player who never opens the section sees no change.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged`
- `item_043_orbit_the_camera_around_what_the_player_is_looking_at`
- `item_044_follow_something_that_moves_and_stop_cleanly_when_it_is_gone`
- `item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged`. Proof deferred to slice closeout.
- request-AC5 -> `item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged`. Proof deferred to slice closeout.
- request-AC7 -> `item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged`. Proof deferred to slice closeout.
- request-AC3 -> `item_043_orbit_the_camera_around_what_the_player_is_looking_at`. Proof deferred to slice closeout.
- request-AC4 -> `item_044_follow_something_that_moves_and_stop_cleanly_when_it_is_gone`. Proof deferred to slice closeout.
- request-AC1 -> `item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view`. Proof deferred to slice closeout.
- request-AC6 -> `item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view`. Proof deferred to slice closeout.
- request-AC8 -> `item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_012_give_the_camera_three_target_policies_free_orbit_and_follow`
- Product brief(s): `prod_009_a_camera_that_can_watch_not_only_be_aimed`
- Architecture decision(s): (none yet)
