## task_053_orchestrate_the_0_5_1_review_findings - Orchestrate the 0.5.1 review findings
> From version: 0.5.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Claude
> Indicators reviewed: 2026-09-07 13:58:42

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
- [ ] 6. Wave 6 - hygiene and weight: clear the scratch copies, settle the hidden script and the root screenshots, then take the disposition of the 14 unreferenced media files and write the CONTRIBUTING screenshot rule.
- [ ] 7. Closeout - `npm run ci` green, `npm run test:e2e` green, and the evidence for every AC recorded. Waves 1 to 3 are independent of each other; wave 5 depends on 2 and 4; nothing depends on wave 6.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_176_accept_a_run_block_that_omits_its_end_reason`. Proof deferred to slice closeout.
- request-AC2 -> `item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test`. Proof deferred to slice closeout.
- request-AC3 -> `item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth`. Proof deferred to slice closeout.
- request-AC4 -> `item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them`. Proof deferred to slice closeout.
- request-AC5 -> `item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it`. Proof deferred to slice closeout.
- request-AC6 -> `item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies`. Proof deferred to slice closeout.
- request-AC7 -> `item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots`. Proof deferred to slice closeout.
- request-AC8 -> `item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes`. Proof deferred to slice closeout.

# Validation
- Wave 1: save parser and dependency bot. src/sim/save.ts:217 now normalizes an absent `ended` to null before validating it, matching readWaveClock below. New save.test.ts case proves it, and was verified to fail against the previous code (expected undefined to be null) before being accepted. .github/dependabot.yml covers github-actions and npm, groups minor and patch, and ignores majors; a new architecture test asserts both ecosystems and the major exclusion, so the config cannot be silently dropped. npx vitest run: 372 tests across 52 files. node --test tests/architecture.mjs: 12 tests. biome lint and tsc clean.
- Wave 2: the simulation test net. src/sim/traffic.test.ts holds sixteen driving-rule cases with no Babylon import; src/render/traffic.test.ts keeps the single renderer case. CAR_GAP and CAR_STOP_SETBACK are asserted against the exported constants, with the meaning of the stop-line setback stated beside the two regression literals. MAX_STEP_S and CAR_TURN_RATE were untested anywhere and are now held in src/render/trafficMovers.test.ts, where they run: two oversized frames land on identical positionsKey values, and a car driven round a right angle saturates CAR_TURN_RATE * MAX_STEP_S exactly without exceeding it. Each new case was checked against a deliberate break - removing the step clamp gave 61853.43 against 61985.34; turning cars at the walker rate gave 0.697 against a 0.260 cap. npx vitest run: 374 tests across 53 files. tsc and biome clean.
- Wave 3: the manual gate. scripts/csp-hashes.mjs derives both digests from index.html with the same extraction tests/architecture.mjs uses, and rewrites the policy value in render.yaml; npm run csp:sync is the entry point and CONTRIBUTING points at it from the inline-markup path. Proved end to end: a real edit to the inline style made the architecture test fail (1 not ok), one run of the command fixed it (12 pass, 0 fail), and reverting the edit and rerunning restored the original digest byte for byte. Removing the inline style block makes the script exit 1 with a named error rather than writing an empty digest. biome clean over 155 files.
- Wave 4: the composition root. src/app/cityLoad.ts owns the load - it replays the save and decides, while everything reaching the scene, the HUD, the heightmap or a closure variable stays in app.ts as one of 15 hooks. src/app/cityLoad.test.ts: 12 cases covering the full call sequence, terrain normalization including an unknown preset, the wave-in-progress refusal, the elapsed and day defaults, the re-laid alert with and without counts, the absent camera, and a rejected replay running nothing past the replay. tests/architecture.mjs caps app.ts at 1346 lines and can only be lowered; verified it fails at 1349. npx vitest run: 386 tests across 54 files. node --test tests/*.mjs: 29. npm run test:e2e: all interaction checks passed, including loading restores every segment 58/58, loading twice gives exactly the same city, a page reload resumes the autosaved city and its day and hour, a reload keeps the zoning, an older build's save still loads, a corrupted autosave is ignored, and the city is autosaved while a kaiju is on it without the wave.
- Wave 5: coverage measured, then gated. src/sim at 96.86% lines, 94.62% statements, 97.54% functions, 87.5% branches, measured after waves 2 and 4 landed the tests that move it. Thresholds in vite.config.mjs sit just under those figures and are scoped to src/sim; verified they bite by raising the line threshold to 99.5 and getting 'Coverage for lines (96.86%) does not meet global threshold (99.5%)'. npm run ci now runs the suite once with coverage instead of twice, and passed on the first attempt with the threshold in place.

# Report
- Not started.

# Links
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
