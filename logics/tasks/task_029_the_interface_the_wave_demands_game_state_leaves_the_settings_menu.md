## task_029_the_interface_the_wave_demands_game_state_leaves_the_settings_menu - The interface the wave demands: game state leaves the settings menu
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:30

# AI Context
- Summary: Implementing game state leaves the settings menu, and the loop gets its screen.
- Keywords: interface, wave, demands, game, state, leaves, settings, menu
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It lands after the four slices that add things to read, on purpose.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. Move the needs panel out of the settings menu, and with it everything a player consults
      during play. The menu keeps look, performance, saves and a paused-only sun.
- [ ] 2. The wave banner and the time controls take the top of the screen, together, because they
      are used together.
- [ ] 3. The city strip: money and rate, workers assigned against available, food, and one slot for
      what is short -- one shortage until the gauge panel has been opened once, all of them after.
- [ ] 4. The ledger behind the gauges: sources and sinks per resource, and formulas with this
      city's values substituted. It displays terms the simulation reported; it computes nothing.
- [ ] 5. A State view colouring buildings by why they are not working, and the alert line for facts.
- [ ] 6. The edge glow for a wave, and the layout rules: nothing opens itself, the camera is never
      taken, colour never speaks about the future.
- [ ] 7. Check the screen's budget: nothing permanent was added without something being removed.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_076_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: the settings menu holding nothing needed during a wave; proven by an interaction check over its contents.
- request-AC2 -> This task. Proof: the permanent banner, clock and city strip; proven by interaction checks on each.
- request-AC3 -> This task. Proof: the ledger and its substituted formulas; proven by an interaction check reading one line against the simulation's own terms.
- request-AC4 -> This task. Proof: no formula written twice; proven by a unit test that the ledger renders reported terms and computes nothing.
- request-AC5 -> This task. Proof: the State view and the alert line; proven by interaction checks.
- request-AC6 -> This task. Proof: the screen's budget; proven by recording what was removed or folded alongside what was added.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_027_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`
- Product brief(s): `prod_019_an_interface_for_a_city_you_can_lose`
- Architecture decision(s): (none yet)
