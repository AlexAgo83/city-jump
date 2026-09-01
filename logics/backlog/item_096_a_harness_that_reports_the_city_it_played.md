## item_096_a_harness_that_reports_the_city_it_played - A harness that reports the city it played
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:04:58

# AI Context
- Summary: The delivery slice for honest reporting: the playthrough's own combat figures emitted, the fixture retired or labelled, and every copied simulation quantity imported instead.
- Keywords: harness, reports, city, played
- Use when: Working on `scripts/balance.mjs`, what the playthrough emits, or duplicated constants.
- Skip when: You need the balance numbers themselves, which the defence slice owns.

# Problem
- `npm run balance` prints `combat=25.5s salvos=7.0` from `fight()`, a fixture with one hardcoded 4x3 battery against three fixed points. The city the harness plays measures 90 seconds and 0 salvos.
- The playthrough computes its own `combatDurationSeconds` and `salvos` and never emits them, so one JSON record carries both answers and reports the flattering one.
- It reads those two figures back out of a log line with `log.find(line => line.startsWith("combat:"))?.slice(7)`, parsing numbers out of strings it wrote itself.
- The treasury it reports is the `freeBuilding: true` run, where nothing is charged. The paid run's figure -- the one that means anything -- is not recorded.
- `rebuildingCost` is `rubble.count() * 140`, contradicting the `buildingBuildCost` the same function charges the rebuild with three lines earlier.
- `militaryGap` subtracts hit points divided by a number chosen by an unrelated boolean from damage per minute.

# Scope
- In:
  - Emit the playthrough's own combat duration, salvo count, held verdict, battery count, population and paid-run treasury from `npm run balance`, and make those the figures a closeout quotes.
  - Retire the `fight()` fixture or label it as a fixture wherever it is printed and recorded. It may be useful as a control; it may not be mistaken for the game.
  - Carry the combat figures as values rather than parsing them back out of log strings.
  - Replace `rubble.count() * 140` with the price the rebuild is actually charged, imported from where it is defined.
  - Fix `militaryGap` to compare like with like, or replace it with time to kill against the twenty-to-forty-second target -- the salvo count is already there to derive it from.
  - Sweep for other copies of a simulation quantity in the harness, the tests and the renderers, and import instead. Per `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision`, a second copy is a defect on sight.
- Out:
  - The balance numbers themselves, which the defence slice owns.
  - A second harness of any kind.
  - Changing what the playthrough simulates.

# Acceptance criteria
- AC1: `npm run balance` prints the playthrough's own combat duration, salvos, held verdict, batteries, population and paid treasury.
- AC2: Any fixture figure is labelled as a fixture wherever it is printed and recorded, or the fixture is gone.
- AC3: No simulation quantity is copied: `rubble.count() * 140` and any others found are imported from their definition.
- AC4: The military measurement compares like with like, or is time to kill against the stated target.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: `npm run balance` prints the playthrough's own combat duration, salvos, held verdict, batteries, population and paid treasury.
- request-AC8 -> This backlog slice. Proof: AC2: Any fixture figure is labelled as a fixture wherever it is printed and recorded, or the fixture is gone.
- request-AC9 -> This backlog slice. Proof: AC3: No simulation quantity is copied: `rubble.count() * 140` and any others found are imported from their definition.
- request-AC11 -> This backlog slice. Proof: AC4: The military measurement compares like with like, or is time to kill against the stated target.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Primary task(s): `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
