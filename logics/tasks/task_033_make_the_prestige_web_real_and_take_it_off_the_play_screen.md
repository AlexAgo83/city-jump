## task_033_make_the_prestige_web_real_and_take_it_off_the_play_screen - Make the prestige web real, and take it off the play screen
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:38:29

# AI Context
- Summary: The executable surface of `req_031`: the effects first, then where the web lives.
- Keywords: prestige, web, real, take, off, play, screen
- Use when: Implementing or reviewing the prestige web and the run panel.
- Skip when: You need the wave, the economy, or the run's own rules.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its two slices. Confirm the central finding yourself before designing anything: grep each of the nine upgrade identifiers across the repository and count where it appears. If a node has a third occurrence somewhere, this request is wrong about it and should say so.
- [ ] 2. Take the effects first. Where the web goes is an easier question once it is known which nodes survive, and a web that shrinks to four is a smaller thing to place.
- [ ] 3. Start with the starting-condition nodes: they are three numbers a new run already reads, and they are the cheapest proof that the loop can close at all.
- [ ] 4. Replace the branch-label test rather than adding beside it. A test that cannot fail is worse than no test, because it reports coverage that is not there.
- [ ] 5. Then the panel. Apply the interface slice's own rule to it, and let the moved web be the thing that pays for whatever stays.
- [ ] 6. Put a confirmation in front of Evacuate and move the hardcore setting to where a run begins. Both are destructive and both are currently a stray click away.
- [ ] 7. Run the browser interaction suite locally: it clicks these controls, and moving them is exactly the kind of change it exists to catch.
- [ ] 8. Do not grow the web. Fewer nodes that work is the preferred outcome, and adding branches or currency is out of scope.
- [ ] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The run slice's AC3 needs restating in the closeout against evidence that can fail.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered`
- `item_087_a_run_panel_that_carries_what_the_player_is_playing_with`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered`. Proof deferred to slice closeout.
- request-AC2 -> `item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered`. Proof deferred to slice closeout.
- request-AC4 -> `item_086_upgrades_that_do_something_or_upgrades_that_are_not_offered`. Proof deferred to slice closeout.
- request-AC3 -> `item_087_a_run_panel_that_carries_what_the_player_is_playing_with`. Proof deferred to slice closeout.
- request-AC5 -> `item_087_a_run_panel_that_carries_what_the_player_is_playing_with`. Proof deferred to slice closeout.
- request-AC6 -> `item_087_a_run_panel_that_carries_what_the_player_is_playing_with`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_031_a_panel_that_sells_nothing_nine_upgrades_with_no_effect_permanently_on_the_play_screen`
- Product brief(s): `prod_022_a_purchase_screen_is_not_a_play_screen`
- Architecture decision(s): (none yet)
