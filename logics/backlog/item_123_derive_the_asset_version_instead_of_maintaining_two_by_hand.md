## item_123_derive_the_asset_version_instead_of_maintaining_two_by_hand - Derive the asset version instead of maintaining two by hand
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:02:49

# AI Context
- Summary: The immutable cache is correct and must stay -- the version query parameter is what makes it safe. The residual risk is only that two constants are hand-maintained, in two files, at diverging dates.
- Keywords: BUILDING_ASSET_VERSION, KAIJU_ASSET_VERSION, cache busting, immutable, derived version
- Use when: shipping a changed GLB or manifest, or touching the asset load path.
- Skip when: content-hashing GLB filenames, or dropping the immutable cache, which would be wrong.

# Problem
- BUILDING_ASSET_VERSION at src/render/buildings.ts:34 reads 2026-08-30-11 and KAIJU_ASSET_VERSION at src/render/kaiju.ts:11 reads 2026-09-01-01: two hand-maintained constants in two files at diverging dates.
- The discipline has held so far -- ec2c24c bumped the building constant in the same commit as the last GLB change, deb87c3 did the same for the kaiju -- but nothing enforces it, and forgetting means returning visitors keep a stale model for up to a year.
- The immutable cache itself is correct and must stay: the query parameter is what makes it safe.

# Scope
- In:
  - One ASSET_VERSION shared by both call sites, derived from the package version at build time rather than typed.
  - A note at the declaration saying what the immutable cache in render.yaml depends on.
- Out:
  - Content-hashing the GLB filenames at build time.
  - Changing the cache headers.
  - Changing how models are loaded.

# Acceptance criteria
- AC1: One asset version constant serves both the building and kaiju loads.
- AC2: It is derived, not hand-typed.
- AC3: A shipped asset change reaches a returning visitor without a manual edit.
- AC4: The dependency between the query parameter and the immutable cache is recorded at the declaration.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: One asset version constant serves both the building and kaiju loads.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 implementation wave: added `vite.config.mjs` to read `package.json` and inject `__APP_VERSION__`, then added one shared `src/render/assets.ts` `ASSET_VERSION` for building and kaiju model URLs.
- 2026-09-03 implementation wave: removed the hand-maintained `BUILDING_ASSET_VERSION` and `KAIJU_ASSET_VERSION`; `logics/runbook/run_001_author_a_building_model_that_lands_on_its_parcel.md` now says asset cache busting follows the shipped package version.
- 2026-09-03 validation: `rtk npm run typecheck` and `rtk npm run test:architecture` passed; the architecture check asserts both model paths use `ASSET_VERSION`.
- Task `task_040_orchestrate_the_release_and_client_hardening` was finished via `logics-manager flow finish task` on 2026-09-03.

# Tasks
- `task_040_orchestrate_the_release_and_client_hardening`
