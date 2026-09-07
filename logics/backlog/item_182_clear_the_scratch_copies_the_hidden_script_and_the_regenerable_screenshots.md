## item_182_clear_the_scratch_copies_the_hidden_script_and_the_regenerable_screenshots - Clear the scratch copies, the hidden script and the regenerable screenshots
> From version: 0.5.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 13:58:42

# AI Context
- Summary: Stale scratch copies of live modules, one script hidden from lint by a leading dot, and regenerable screenshots at the repository root.
- Keywords: working tree, scratch files, hidden script, lint coverage, generated screenshots
- Use when: clearing the working tree or checking that lint reaches every script.
- Skip when: changing what a shot script does, or editing .gitignore rules that already cover these paths.

# Problem
- `.tmp/` holds 19 scratch files including `app.ts.orig` and `app.kit.ts`; a stale copy of the largest module in the repository invites being reopened or partially copied back.
- `scripts/.lights.mjs` is hidden behind a leading dot, is not processed by biome, and is otherwise an exact sibling of `terrain-shot.mjs`, `buildings-shot.mjs` and `kaiju-shot.mjs`.
- `shot.png`, `shot-rugged.png` and `vehicle-closeup.png` at the root are the default output names of `scripts/shot.mjs:11`, and `.DS_Store` files sit at the root and in `src/`.

# Scope
- In:
  - Delete the stale scratch copies of live modules.
  - Either rename `scripts/.lights.mjs` into the shot-script family so lint covers it, or delete it.
  - Remove the default-named root screenshots and the `.DS_Store` files already covered by `.gitignore`.
  - Confirm `npm run lint` reaches every script in `scripts/` afterwards.
- Out:
  - Changing what any shot script does.
  - Removing `.tmp/` itself or the scratch probes that are still in use.
  - Editing `.gitignore` rules, which already cover these paths.

# Acceptance criteria
- AC1: No scratch copy of a live `src/` module remains under `.tmp/`.
- AC2: Every script under `scripts/` is processed by `npm run lint`, with none excluded by a hidden filename.
- AC3: The repository root holds no generated screenshot and no `.DS_Store`.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: No scratch copy of a live `src/` module remains under `.tmp/`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: Low
- Rationale: Nothing depends on it and no tracked file changes except a renamed script. Low, and last - but a stale copy of the largest module in the repository is worth not keeping.
