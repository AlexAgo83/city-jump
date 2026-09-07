## req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand - Review findings: a save the parser refuses, sim seams no test reaches, and gates kept by hand
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:21:02

# AI Context
- Summary: The 0.5.1 corpus review: one save-parser defect, and seven rules this repository already holds that are kept by hand rather than by something that runs.
- Keywords: review, findings, save parser, traffic test, composition root, csp digest, dependency bot, repository weight
- Use when: implementing any of the eight slices, or deciding what a gate should enforce instead of remind.
- Skip when: changing rendering or driving behaviour; the only behaviour change in scope is the save parser accepting an absent end reason.

# Needs
- Load a save whose run block omits its end reason, instead of refusing the whole city.
- Hold the driving constants sim/traffic publishes to a test, like every other simulation module.
- Move city loading out of the composition root and stop that root from growing back.
- Produce the CSP hashes from index.html instead of transcribing them into render.yaml by hand.
- See simulation coverage before choosing whether to gate on it.
- Let a bot move the SHA-pinned workflow actions, which nothing moves today.
- Keep the working tree free of scratch copies of live modules and of regenerable screenshots.
- Decide the fate of the review screenshots that no document references, and say where a new one goes.

# Priority
- High: item_176 and item_177. Medium: item_178, item_179, item_180, item_181, item_183. Low: item_182.
- Rationale: only item_176 is a defect, and it is a one-line normalization. item_177 earns High
  on exposure rather than severity - it closes the last hole in the boundary that adr_002 and the
  architecture tests exist to protect, in the module performance work reopens most often. The
  Medium slices are all steps that are manual today and need not be: real, but no gate is failing
  and no player is affected. item_182 is Low because nothing depends on it and it changes no
  tracked file.

# Context
- Reviewed at commit a4c1d2d, version 0.5.1, on 2026-09-07, with a clean working tree. All gates passed at review time: `tsc` clean under strict plus noUncheckedIndexedAccess and noUnusedLocals; `biome lint` clean over 153 files; 371 Vitest tests across 52 files; 27 architecture and asset tests; `npm audit` reporting no vulnerability; `check-versions` OK at 0.5.1. Nothing in this request is a failing gate. Every item is either a defect no gate covers, or a step that is manual today and need not be.
- P1 - `src/sim/save.ts:217` refuses a run block that omits `ended`. The guard reads `if (value.ended !== null && value.ended !== "evacuated" && value.ended !== "population_zero" && value.ended !== "defeated") return null`, so `undefined` falls through to a null return and `parseCity` rejects the entire city. Every other optional field in the parser treats absence as its documented default, and `readWaveClock` immediately below tolerates an absent `active` with `active !== undefined`. `createRun` at `src/sim/run.ts:55` always writes `ended: null`, so no save this build produces is affected; a hand-edited save, a shortened fixture, or any future writer that omits a null field loses the city with no diagnosis. Normalize before validating (`const ended = value.ended ?? null`) and return the normalized value. `src/sim/save.test.ts:192` already builds the adjacent case and is where the new assertion belongs.
- P2 - `src/sim/traffic.ts` is 386 lines and the only module in `src/sim/` with no colocated test. It is reached indirectly through `src/render/traffic.test.ts` and `src/render/trafficMovers.ts`, so a change to its constants is observed only through a renderer. It imports neither Babylon nor the DOM, so a direct test costs nothing structurally. The module publishes the very invariants worth holding: `CAR_GAP` (line 26), `BRAKING` (31), `ACCEL` (33), `CAR_STOP_SETBACK` (34), `CAR_TURN_RATE` (39) and `MAX_STEP_S` (47). Test those properties on a graph built in the test, as `src/sim/graph.test.ts` does, rather than freezing trajectories that any pace or turn-rate tuning would invalidate. CONTRIBUTING.md asks for the narrowest test that proves changed simulation behaviour; this module is the single exception to it.
- P2 - `src/app/app.ts` is 1347 lines with 45 imports and no test. The extraction pattern is already established and working: `cityRebuild`, `drawController`, `persistence` and `waveLoop` were each moved out with a test, and `persistence.ts` and `waveLoop.ts` take their dependencies as explicit parameters rather than closing over `startApp`'s scope. `loadCity` at `src/app/app.ts:996` is the next slice by risk: about sixty lines orchestrating terrain choice, replay, `Zones.snapTo`, `BuildingLifecycle.snapTo`, wave neutralization and camera restore. Four rules inside it are currently guaranteed by comment alone - terrain normalization to `rolling` for any value but `rugged`, the deliberate `active: null` that refuses to restore a wave in progress, the relaid and carried counts behind the alert, and the `elapsed ?? 0` / `day ?? 1` defaults. The architecture test at `tests/architecture.mjs` marks modules over 700 lines with a required `ponytail: module-size` reason, which app.ts carries, but nothing caps growth; a ceiling asserted against the current line count and lowered at each extraction would make the direction enforceable rather than intended.
- P2 - The CSP hashes in `render.yaml:39` are transcribed by hand. `tests/architecture.mjs` recomputes the SHA-256 of the inline `<script>` and `<style>` of `index.html` and asserts both appear in the header, so divergence cannot ship - but nothing produces the value, and the inline style is 261 lines against a 4-line script, so the style is both the one that changes and the one whose hash is forgotten. A script that reads `index.html`, computes both digests with the same extraction the test uses, and rewrites the header value turns a manual transcription into a command the existing test confirms.
- P3 - There is no coverage tooling: the vitest v8 coverage provider is absent from devDependencies and `npm run ci` carries no threshold. With 371 tests the position is probably sound, but the two gaps above are invisible today. Coverage is only meaningful over `src/sim/`, which is pure by construction; a percentage over `src/render/` would reward executing Babylon lines, which is exactly what `test:visual` and `test:e2e` exist to cover instead. Measure first, then gate at the level actually reached, on `src/sim/` alone.
- P3 - Nothing moves the pinned action SHAs. `.github/` contains only its workflows directory; there is no Dependabot or Renovate configuration. Both workflows pin third-party actions to 40-character SHAs and `tests/architecture.mjs` enforces that pinning, which is the right posture - but a pinned SHA never advances on its own, so the discipline turns into dormant dependency debt. Application dependencies are drifting in parallel: the Babylon core and loaders packages at 9.22.2 against 9.25.0, playwright 1.62.1 against 1.63.0, all in-range and therefore frozen by `npm ci`, plus vitest 4.1.11 against a 5.0.0 major. The github-actions ecosystem is the one that matters; majors belong in their own deliberate change, not a grouped batch.
- P3 - Working tree hygiene. `.tmp/` holds 19 scratch files including `app.ts.orig` and `app.kit.ts` - gitignored, but a stale copy of the largest module in the repository invites being reopened or copied back. scripts/.lights.mjs, as it was then named, is an ad-hoc Playwright probe hidden behind a leading dot; biome does not process it, making it the only unlinted script in a directory whose siblings `terrain-shot.mjs`, `buildings-shot.mjs` and `kaiju-shot.mjs` it otherwise resembles exactly. `shot.png`, `shot-rugged.png` and `vehicle-closeup.png` sit at the repository root and are the default output names of `scripts/shot.mjs:11`, so they are regenerable artefacts rather than references. `.DS_Store` files exist at the root and in `src/`, already covered by `.gitignore`.
- P3 - Repository weight is driven by evidence screenshots, not by models. The pack is 25.21 MiB. `docs/media/` alone is 22 MB across 35 files, and 14 of them are referenced by no document in the repository - not README.md, not `docs/`, not `changelogs/`, not `logics/`: building-window-check.png, buildings-commercial_3x4_tower_steps.png, buildings-commercial_4x3_tower_offset.png, buildings-residential_3x3_tower_steps.png, buildings-residential_4x4_tower_offset.png, city-jump-rugged.png, kaiju-refined-mobile.png, kaiju.png, military.png, missile.png, roundabout-junctions-day.png, trees-ingame.png, trees-mobile.png and trees.png. They are the delivery-wave proof captures, added and never linked; some may be cited from GitHub release notes, which is a reference outside the repository and needs to be written down somewhere in `docs/` or they will be deleted by the next person to look. Individual files reach 1.9 MB for images GitHub renders at about 800 px. The generated building GLBs are a deliberate and documented choice by contrast: `public/buildings/` is 18 MB and `public/kaiju.glb` 4.7 MB, produced by `scripts/gen_buildings.py`, and Blender is not available in CI, so committing them is correct. git-lfs is explicitly not proposed: on existing history it shrinks nothing without a rewrite, and a rewrite would break every commit SHA the release evidence cites.
- Out of scope: no change to rendering or simulation behaviour. The only permitted simulation change is the save-parser normalization in AC1 and the new test in AC2. `npm run test:e2e` and `npm run test:visual` stay local, per prod_003 and the CONTRIBUTING rationale about GPU-less runners. No engine facade, ECS, state framework or dependency-injection layer is introduced by the app.ts extraction; it moves existing code behind explicit parameters, following prod_030 and the pattern `src/app/persistence.ts` already sets.
- Related settled work not reopened here: prod_030 covers the seams the tests can reach, prod_031 covers gates that check what they claim, and req_039 already moved one pass of logic out of the composition root. req_040 closed the previous corpus-review gaps in the gates.

# Acceptance criteria
- AC1: `parseCity` accepts a run block that omits `ended`, restoring it as `null`, and still refuses an `ended` value outside the known reasons; a save whose run block carries only `wave` and `science` loads as a playable city.
- AC2: `src/sim/traffic.ts` has a colocated test that holds its published constants as properties on a graph built in the test - the gap two queued cars keep, a red stopping a bumper at the setback rather than a centre, a frame longer than `MAX_STEP_S` advancing no one further than the clamp, and a heading turning no faster than `CAR_TURN_RATE` in one step - and that test fails if the corresponding constant is honoured incorrectly rather than merely changed.
- AC3: City loading leaves `src/app/app.ts` for its own module taking explicit dependencies, with a test covering terrain normalization, the refusal to restore a wave in progress, the relaid and carried counts, and the elapsed and day defaults; an architecture test caps `src/app/app.ts` at a line count that can only be lowered.
- AC4: One command derives both CSP digests from `index.html` and writes them into `render.yaml`, the existing architecture assertion passes against its output, and editing the inline style then running that command is sufficient to keep the header correct.
- AC5: Simulation coverage over `src/sim/` is measured and recorded, and the decision whether to gate `npm run ci` on it is taken against that measured number rather than assumed; if gated, the threshold is scoped to `src/sim/` and set no higher than the level actually reached.
- AC6: A dependency bot configuration covers the github-actions and npm ecosystems, keeps SHA pinning intact when it proposes an action update, groups minor and patch application updates, and leaves majors out of the grouped proposal.
- AC7: `.tmp/app.ts.orig` and `.tmp/app.kit.ts` are gone, the dot-hidden probe is either a linted sibling of the other scripts or deleted, the three default-named screenshots at the repository root and the tracked-directory `.DS_Store` files are gone, and `npm run lint` covers every script in `scripts/`.
- AC8: Each of the 14 unreferenced `docs/media/` files is either linked from a document, recorded in `docs/` as cited from outside the repository, or deleted; the images that remain are sized for the width they are displayed at; and CONTRIBUTING.md states where a delivery screenshot goes, at what size, and what happens to it when the wave closes.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)

# References
- src/sim/save.ts
- src/sim/save.test.ts
- src/sim/traffic.ts
- src/app/app.ts
- src/app/persistence.ts
- src/app/waveLoop.ts
- tests/architecture.mjs
- index.html
- render.yaml
- package.json
- vite.config.mjs
- CONTRIBUTING.md
- docs/media/
- scripts/shot.mjs
- .github/workflows/ci.yml
- .github/workflows/render-release-deploy.yml

# Backlog
- `item_176_accept_a_run_block_that_omits_its_end_reason`
- `item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test`
- `item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth`
- `item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them`
- `item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it`
- `item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies`
- `item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots`
- `item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes`
