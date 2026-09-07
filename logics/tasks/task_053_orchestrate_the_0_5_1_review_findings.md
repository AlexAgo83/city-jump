## task_053_orchestrate_the_0_5_1_review_findings - Orchestrate the 0.5.1 review findings
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
> Indicators reviewed: 2026-09-07 14:21:03

# AI Context
- Summary: Sequences the eight review slices into six waves: the defect and the bot first, the test net next, then the manual gate, the composition root, the coverage decision, and hygiene last.
- Keywords: orchestration, waves, review findings, sequencing, gates
- Use when: picking up or resuming implementation of the 0.5.1 review findings.
- Skip when: looking for the findings themselves or their rationale; those are in req_051.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Wave 1 - the defect and the bot, both independent of everything else: normalize the run end reason in the save parser with its test, and add the dependency bot configuration. Gate on `npm test`.
- [x] 2. Wave 2 - the simulation test net: add the colocated traffic test, verifying each property fails on a deliberate local break before accepting it. Gate on `npm test`.
- [x] 3. Wave 3 - the gate that is manual: add the CSP hash script, prove it by editing the inline style and running only that command, and confirm the existing architecture assertion passes against its output.
- [x] 4. Wave 4 - the composition root: extract city loading behind explicit dependencies, add its colocated test and the shrinking ceiling assertion. Gate on `npm run ci` plus `npm run test:e2e`, which is required here because persistence and loading are in scope.
- [x] 5. Wave 5 - measure and decide coverage over `src/sim/`, now that waves 2 and 4 have landed the tests that change the number. Record the figure, then take the gating decision against it.
- [x] 6. Wave 6 - hygiene and weight: clear the scratch copies, settle the hidden script and the root screenshots, then take the disposition of the 14 unreferenced media files and write the CONTRIBUTING screenshot rule.
- [x] 7. Closeout - `npm run ci` green, `npm run test:e2e` green, and the evidence for every AC recorded. Waves 1 to 3 are independent of each other; wave 5 depends on 2 and 4; nothing depends on wave 6.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_176_accept_a_run_block_that_omits_its_end_reason`
- `item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test`
- `item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth`
- `item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them`
- `item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it`
- `item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies`
- `item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots`
- `item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_176_accept_a_run_block_that_omits_its_end_reason`. Proof: src/sim/save.ts normalizes an absent `ended` to null before validating it. src/sim/save.test.ts asserts a run block carrying only wave and science loads with ended null and a full default rules object, and that an unknown reason is still refused. Verified to fail against the previous code: expected undefined to be null.
- request-AC2 -> `item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test`. Proof: src/sim/traffic.test.ts holds sixteen driving-rule cases with no Babylon import, with CAR_GAP and CAR_STOP_SETBACK asserted against the exported constants. MAX_STEP_S and CAR_TURN_RATE, previously asserted nowhere, are held in src/render/trafficMovers.test.ts where they run: two oversized frames land on identical positionsKey values, and a car round a right angle saturates CAR_TURN_RATE * MAX_STEP_S without exceeding it. Both verified against deliberate breaks (61853.43 vs 61985.34; 0.697 vs a 0.260 cap).
- request-AC3 -> `item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth`. Proof: src/app/cityLoad.ts owns the load behind an explicit CityState and 15 hooks; src/app/cityLoad.test.ts covers the full call sequence, terrain normalization including an unknown preset, the wave-in-progress refusal, the elapsed and day defaults, the re-laid alert with and without counts, the absent camera, and a rejected replay running nothing past the replay. tests/architecture.mjs caps src/app/app.ts at 1346 lines, verified to fail at 1349. npm run test:e2e passed, including loading twice giving an identical city and a reload resuming the autosave with its day, hour and zoning.
- request-AC4 -> `item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them`. Proof: npm run csp:sync derives both digests from index.html with the same extraction tests/architecture.mjs hashes, and rewrites the policy value. Proved end to end: a real edit to the inline style failed the architecture test, one run of the command made it pass, and reverting restored the original digest byte for byte. Deleting an inline block exits 1 with a named error instead of writing an empty digest.
- request-AC5 -> `item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it`. Proof: src/sim coverage measured after waves 2 and 4 landed: 96.86% lines (2099/2167), 94.62% statements, 97.54% functions, 87.5% branches. Gated on that measurement in vite.config.mjs, scoped to src/sim and set just under the measured figures; verified the gate bites by raising the line threshold to 99.5%, and npm run ci passed first time at 95%.
- request-AC6 -> `item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies`. Proof: .github/dependabot.yml covers github-actions and npm weekly, groups minor and patch, and excludes majors so vitest 5 stays deliberate. A new architecture test asserts both ecosystems and the major exclusion, so the config cannot be silently dropped; the existing SHA-pinning assertion is untouched and still passes.
- request-AC7 -> `item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots`. Proof: The three scratch copies of live modules under .tmp/, the three regenerable root screenshots and three .DS_Store files are gone. scripts/.lights.mjs became scripts/review/lights.mjs, dropping the leading dot that kept biome from processing it; confirmed linted directly, and npm run lint is clean over 157 files with no script excluded by a hidden filename.
- request-AC8 -> `item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes`. Proof: docs/media/README.md links all 35 captures with per-file commit attribution from git log --diff-filter=A, splitting the 21 shown in documents from the 14 kept as evidence only; none were deleted, and the index records that some are cited from release notes this repository cannot see. AC2's resize was dropped on measurement: every capture is 390 to 1440 px wide, so nothing is oversized, and rewriting the files could not shrink the pack anyway. CONTRIBUTING.md states where a capture goes, at what width, and that it needs an index row.

# Validation
- Wave 1: save parser and dependency bot. src/sim/save.ts:217 now normalizes an absent `ended` to null before validating it, matching readWaveClock below. New save.test.ts case proves it, and was verified to fail against the previous code (expected undefined to be null) before being accepted. .github/dependabot.yml covers github-actions and npm, groups minor and patch, and ignores majors; a new architecture test asserts both ecosystems and the major exclusion, so the config cannot be silently dropped. npx vitest run: 372 tests across 52 files. node --test tests/architecture.mjs: 12 tests. biome lint and tsc clean.
- Wave 2: the simulation test net. src/sim/traffic.test.ts holds sixteen driving-rule cases with no Babylon import; src/render/traffic.test.ts keeps the single renderer case. CAR_GAP and CAR_STOP_SETBACK are asserted against the exported constants, with the meaning of the stop-line setback stated beside the two regression literals. MAX_STEP_S and CAR_TURN_RATE were untested anywhere and are now held in src/render/trafficMovers.test.ts, where they run: two oversized frames land on identical positionsKey values, and a car driven round a right angle saturates CAR_TURN_RATE * MAX_STEP_S exactly without exceeding it. Each new case was checked against a deliberate break - removing the step clamp gave 61853.43 against 61985.34; turning cars at the walker rate gave 0.697 against a 0.260 cap. npx vitest run: 374 tests across 53 files. tsc and biome clean.
- Wave 3: the manual gate. scripts/csp-hashes.mjs derives both digests from index.html with the same extraction tests/architecture.mjs uses, and rewrites the policy value in render.yaml; npm run csp:sync is the entry point and CONTRIBUTING points at it from the inline-markup path. Proved end to end: a real edit to the inline style made the architecture test fail (1 not ok), one run of the command fixed it (12 pass, 0 fail), and reverting the edit and rerunning restored the original digest byte for byte. Removing the inline style block makes the script exit 1 with a named error rather than writing an empty digest. biome clean over 155 files.
- Wave 4: the composition root. src/app/cityLoad.ts owns the load - it replays the save and decides, while everything reaching the scene, the HUD, the heightmap or a closure variable stays in app.ts as one of 15 hooks. src/app/cityLoad.test.ts: 12 cases covering the full call sequence, terrain normalization including an unknown preset, the wave-in-progress refusal, the elapsed and day defaults, the re-laid alert with and without counts, the absent camera, and a rejected replay running nothing past the replay. tests/architecture.mjs caps app.ts at 1346 lines and can only be lowered; verified it fails at 1349. npx vitest run: 386 tests across 54 files. node --test tests/*.mjs: 29. npm run test:e2e: all interaction checks passed, including loading restores every segment 58/58, loading twice gives exactly the same city, a page reload resumes the autosaved city and its day and hour, a reload keeps the zoning, an older build's save still loads, a corrupted autosave is ignored, and the city is autosaved while a kaiju is on it without the wave.
- Wave 5: coverage measured, then gated. src/sim at 96.86% lines, 94.62% statements, 97.54% functions, 87.5% branches, measured after waves 2 and 4 landed the tests that move it. Thresholds in vite.config.mjs sit just under those figures and are scoped to src/sim; verified they bite by raising the line threshold to 99.5 and getting 'Coverage for lines (96.86%) does not meet global threshold (99.5%)'. npm run ci now runs the suite once with coverage instead of twice, and passed on the first attempt with the threshold in place.
- Wave 6: hygiene and weight. scripts/.lights.mjs moved to scripts/review/lights.mjs, which drops the leading dot that kept biome from processing it - confirmed linted. Deleted: .tmp/app.ts.orig, .tmp/app.kit.ts, .tmp/rules.fixed.ts, the three regenerable root screenshots, and three .DS_Store files. docs/media/README.md indexes all 35 captures with per-file commit attribution from git log --diff-filter=A, splitting the 21 shown in documents from the 14 kept as evidence; nothing was deleted, and the index warns that some are cited from release notes this repository cannot see. Measured every image: 390 to 1440 px wide, so nothing is oversized and nothing was resized. CONTRIBUTING.md carries the rule for the next capture. npm run ci green: 386 tests, 29 architecture tests, coverage thresholds met, Logics lint OK with 9 warnings, all expected deferred AC proofs plus one pre-existing.
- command: `npm run ci` | result: passed | date: 2026-09-07 | note: 386 unit tests across 54 files, 29 architecture and asset tests, src/sim coverage 96.86% lines against a 95% threshold, build and typecheck clean, Logics lint OK. npm run test:e2e passed separately for the city-loading extraction.
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_176_accept_a_run_block_that_omits_its_end_reason`, `item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test`, `item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth`, `item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them`, `item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it`, `item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies`, `item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots`, `item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes`
- Related request(s): `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`

# Links
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
