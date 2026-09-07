## item_178_move_city_loading_out_of_the_composition_root_and_cap_that_root_s_growth - Move city loading out of the composition root and cap that root's growth
> From version: 0.5.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 38%
> Complexity: High
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 13:58:42

# AI Context
- Summary: loadCity at app.ts:996 holds four load rules by comment alone, and nothing stops the composition root growing back after an extraction.
- Keywords: app.ts, loadCity, extraction, explicit dependencies, module ceiling
- Use when: extracting from the composition root, or changing what loading a city does.
- Skip when: introducing a facade, ECS, state framework or DI layer; the project context forbids these without a measured need and an ADR.

# Problem
- `src/app/app.ts` is 1347 lines with 45 imports and no test. `loadCity` at line 996 is its highest-risk untested logic: terrain choice, replay, both `snapTo` passes, wave neutralization and camera restore.
- Four rules inside it are guaranteed by comment alone - terrain normalization, the deliberate `active: null` refusing to restore a wave in progress, the relaid and carried alert counts, and the `elapsed ?? 0` / `day ?? 1` defaults.
- `tests/architecture.mjs` requires a `ponytail: module-size` reason above 700 lines, which app.ts carries, but nothing stops it growing further - so each extraction can be silently undone.

# Scope
- In:
  - Extract city loading into its own `src/app/` module taking explicit dependencies, following `src/app/persistence.ts` and `src/app/waveLoop.ts`.
  - A colocated test covering terrain normalization, the wave-in-progress refusal, the relaid and carried counts and the elapsed and day defaults.
  - An architecture assertion capping `src/app/app.ts` at its post-extraction line count, written so it can only be lowered.
- Out:
  - Any change to what loading does; this is a move plus a cap, not a behaviour change.
  - An engine facade, ECS, state framework or dependency-injection layer, per the LOGICS.md project context.
  - Extracting further slices in this item; the cap makes the next one someone else's turn.

# Acceptance criteria
- AC1: City loading lives in its own module with explicit parameters, and `src/app/app.ts` calls it.
- AC2: A colocated test covers the four rules currently held by comment, and runs headless.
- AC3: An architecture test fails if `src/app/app.ts` grows beyond its recorded ceiling.
- AC4: `npm run test:e2e` passes against the dev server: loading a saved city, resuming an autosave and importing a shared link all still work.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: City loading lives in its own module with explicit parameters, and `src/app/app.ts` calls it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: Medium
- Rationale: The largest untested surface in the repository, but the extraction pattern is already proven by persistence.ts and waveLoop.ts, so this is a known move rather than a design question. Medium because no defect is known behind those four comments - the risk is that the next change to them is unobserved.
