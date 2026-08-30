## item_023_one_node_version_and_an_autosave_that_admits_it_failed - One Node version, and an autosave that admits it failed
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:20:20

# AI Context
- Summary: `.nvmrc` pins Node 22 while `render.yaml` sets `NODE_VERSION` to 20, and `writeAutosave` swallows a refused localStorage write that `writeSave` would have reported.
- Keywords: node, version, autosave, admits, failed
- Use when: Changing the Node version pin in `.nvmrc`, `render.yaml` or the workflows, or the storage-failure path in `src/ui/saves.ts`.
- Skip when: The work is a deliberate Node major upgrade, or replaces localStorage with another storage backend.

# Problem
- `.nvmrc` pins Node 22 while `render.yaml` sets `NODE_VERSION` to 20: CI builds on one major version and the deploy builds on another.
- `writeAutosave` returns void and swallows a refused localStorage write, so a full, disabled or private-mode store silently costs the player their session resume.

# Scope
- In:
  - Reduce the Node version to a single source of truth and confirm CI and the Render build resolve to the same major.
  - Have `writeAutosave` report a refused write the way `writeSave` already does, and surface it once through the existing refusal/HUD path rather than on every retry.
- Out:
  - Upgrading or downgrading the Node major itself beyond what is needed to make the two agree.
  - Replacing localStorage, or adding a storage quota estimator.

# Acceptance criteria
- AC1: The repository declares the Node version in exactly one place, and both CI and the Render deploy use that major.
- AC2: A refused autosave write is surfaced to the player once, and a working store behaves exactly as before.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The repository declares the Node version in exactly one place, and both CI and the Render deploy use that major.
- request-AC5 -> This backlog slice. Proof: AC2: A refused autosave write is surfaced to the player once, and a working store behaves exactly as before.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_004_a_city_builder_that_never_loses_the_city_on_screen`
- Architecture decision(s): (none yet)
- Request: `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
- Primary task(s): `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
