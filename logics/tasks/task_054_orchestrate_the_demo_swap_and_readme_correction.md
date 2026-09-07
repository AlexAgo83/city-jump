## task_054_orchestrate_the_demo_swap_and_readme_correction - Orchestrate the Demo swap and README correction
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Claude
> Indicators reviewed: 2026-09-07 14:33:41

# AI Context
- Summary: Four steps: install the played Demo, repin its assertions, retake the three captures from its own camera, then correct the README claim by claim.
- Keywords: orchestration, demo swap, readme correction, captures
- Use when: picking up or resuming the Demo and README work.
- Skip when: looking for the findings themselves; those are in req_052.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Install the played save as the bundled Demo and repin its assertions. Gate on the architecture tests.
- [x] 2. Add the capture script and retake the three README images from the Demo's own camera.
- [x] 3. Correct the README claim by claim against the code and the performance record.
- [x] 4. Closeout: npm run ci and npm run test:e2e green, with the Demo bundled.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_184_replace_the_bundled_demo_with_a_city_that_has_been_played`
- `item_185_retake_the_readme_captures_from_the_demo_on_its_own_framing`
- `item_186_make_every_readme_claim_one_the_code_or_the_record_can_support`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_184_replace_the_bundled_demo_with_a_city_that_has_been_played`. Proof: public/default-demo.json is the supplied played save (v14, 131 segments, 8318 zones, 1275 buildings, 13336 residents, day 41, wave 17). tests/default-demo.mjs pins the zone and building counts, the day and the camera radius so an empty or reframed Demo fails. node --test tests/*.mjs: 29 pass. npm run test:e2e: all interaction checks passed with it bundled, including the Demo appearing in the picker.
- request-AC2 -> `item_185_retake_the_readme_captures_from_the_demo_on_its_own_framing`. Proof: scripts/readme-shots.mjs loads the Demo through the autosave the app resumes from, waits for all 107 building models and 95% of the saved buildings, then compares the live camera against the save's on all six fields and exits 1 if any drifted by more than 0.5. The three captures were retaken in one run and differ only in the tool and view selected; the script also exits non-zero on any page error.
- request-AC3 -> `item_186_make_every_readme_claim_one_the_code_or_the_record_can_support`. Proof: Six README corrections, each against a named source: the missing-features paragraph (parcelDemandLimits, CityEconomy, the upgrade web all ship; services and redevelopment do not), zoning by BuildingKind rather than low/dense, eight road types rather than five, five select views rather than two, power and water added, and the unsourced Apple M3 Pro frame rate replaced with the city size perf/history.jsonl holds plus an explicit statement that no device frame rate has been measured. The three Mermaid diagrams were checked and left unchanged.

# Validation
- command: `npm run ci` | result: passed | date: 2026-09-07 | note: 386 unit tests, 29 architecture and asset tests including the repinned Demo assertions, src/sim coverage 96.86%, build and typecheck clean, Logics lint OK. npm run test:e2e passed with the new Demo bundled.
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.
- Capture correction: the first three captures were taken with the simulation paused, so the streets were empty. scripts/readme-shots.mjs now runs the clock until stats().moverPositions changes, spreads the traffic for six seconds, pauses, restores the save's hour through the sun slider and asserts it within 0.05, then shoots. Retaken with 166 cars visible across the network and the clock reading day 41 20:30 in all three, matching the save. The script refuses to shoot on no traffic, a drifted hour, a drifted camera, or any page error. biome clean over 158 files; node --test tests/*.mjs 29 pass.

# Report
- Not started.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_184_replace_the_bundled_demo_with_a_city_that_has_been_played`, `item_185_retake_the_readme_captures_from_the_demo_on_its_own_framing`, `item_186_make_every_readme_claim_one_the_code_or_the_record_can_support`
- Related request(s): `req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing`

# Links
- Request: `req_052_ship_the_played_demo_city_reshoot_the_readme_from_it_and_stop_the_readme_overstating_what_is_missing`
- Product brief(s): `prod_039_a_shop_window_that_shows_the_game_that_exists`
- Architecture decision(s): (none yet)
