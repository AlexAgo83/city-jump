## item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does - Make docs/assets.md and the authoring runbook describe what the code actually does
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:39:36

# AI Context
- Summary: `docs/assets.md` claims dimensions need not be declared because the renderer reads the bounding box, which the duplicated spec contradicts, and run_001 carries a manual mirror-the-formula step that should not outlive the fix.
- Keywords: docs, assets, authoring, runbook, describe, code, actually, does
- Use when: Correcting `docs/assets.md` or `run_001_author_a_building_model_that_lands_on_its_parcel` after the mechanism changes.
- Skip when: The mechanism itself has not landed yet, or the work would expand the deliberately fixed asset convention.

# Problem
- `docs/assets.md` says the renderer reads each model's bounding box so dimensions need not be declared, which is only half true today: height, roof style and setback geometry are re-derived from the filename instead.
- `run_001_author_a_building_model_that_lands_on_its_parcel` carries a manual instruction to mirror any formula change across both languages -- a workaround that should not outlive the fix.

# Scope
- In:
  - Update `docs/assets.md` to state the real contract once it exists, including whatever a model must declare and what happens if it declares nothing.
  - Update `run_001_author_a_building_model_that_lands_on_its_parcel`: replace the mirror-the-formula step with the new mechanism and its check.
  - Keep both documents short; this is a correction, not an expansion.
- Out:
  - Rewriting the rest of the asset convention, which is deliberately fixed.
  - Documenting anything the code does not yet do.

# Acceptance criteria
- AC1: `docs/assets.md` describes the contract as implemented, with no statement that the code contradicts.
- AC2: The manual mirror-the-formula instruction is gone from the runbook, replaced by the mechanism that made it unnecessary, and the runbook's verification line is updated.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `docs/assets.md` describes the contract as implemented, with no statement that the code contradicts.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)
- Request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
- Primary task(s): `task_011_implement_one_source_of_truth_for_building_model_geometry`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_011_implement_one_source_of_truth_for_building_model_geometry`

# Notes
- Task `task_011_implement_one_source_of_truth_for_building_model_geometry` was finished via `logics-manager flow finish task` on 2026-08-30.
