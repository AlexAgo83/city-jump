## item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle - Stop rebuilding the whole city for a visibility toggle
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:20:20

# AI Context
- Summary: `onBuildings` and `onSelectView` call the full `rebuild()` -- parcel solve, `conformToRoads` and every renderer -- when only mesh visibility and fading changed.
- Keywords: rebuilding, whole, city, visibility, toggle
- Use when: Touching the select-view or buildings-checkbox handlers in `src/app/app.ts`, or the `setVisible`/`setFaded`/`setShowTraffic` entry points on the renderers.
- Skip when: The work is about the cost of computations inside `rebuild()` itself (req_005, Done) or about what any view shows.

# Problem
- `onBuildings` and `onSelectView` in `src/app/app.ts` call the full `rebuild()`, running the parcel solve, `conformToRoads` and every renderer's rebuild, when only mesh visibility and fading changed.
- The cost scales with city size, so the toggles get slower exactly on the cities where they matter most.

# Scope
- In:
  - Change both handlers to apply only the visibility and fade state they actually own, calling into the renderers' `setVisible`/`setGridVisible`/`setFaded`/`setShowTraffic` without a full resolve.
  - If a renderer genuinely needs a rebuild for a given mode, narrow it to that renderer rather than the whole city.
  - Confirm each view (all / zones / traffic, buildings on and off) still looks and behaves as it does today.
- Out:
  - Reopening req_005's optimisations inside `rebuild()` itself.
  - Changing what any view shows.

# Acceptance criteria
- AC1: Toggling buildings or switching the select view no longer runs `buildableCells`, `buildingParcels` or `conformToRoads`.
- AC2: Every select view and the buildings checkbox produce the same visible result as before the change, verified in the browser interaction or visual check.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Toggling buildings or switching the select view no longer runs `buildableCells`, `buildingParcels` or `conformToRoads`.
- request-AC6 -> This backlog slice. Proof: AC2: Every select view and the buildings checkbox produce the same visible result as before the change, verified in the browser interaction or visual check.

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
