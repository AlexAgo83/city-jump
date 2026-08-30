## item_037_persist_street_names_and_name_the_cities_saved_before_this_existed - Persist street names, and name the cities saved before this existed
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:02:46

# AI Context
- Summary: Names must survive a reload, but `parseCity` requires a segment tuple of exactly 6 entries, so a seventh field rejects every existing city unless the check is relaxed first; older saves get generated names on load.
- Keywords: persist, street, names, name, cities, saved, before, existed
- Use when: Changing `serializeCity`, `restoreCity`, `SAVE_VERSION`, or the older-build check in `scripts/interact.mjs`.
- Skip when: The work is any other save format change, or persisting address numbers (they stay derived).

# Problem
- A name drawn at random is worthless if it changes on every reload, so it has to be saved.
- `parseCity` requires a segment tuple of exactly 6 entries, so adding a field rejects every existing city -- the same class of break that once refused every save in the library.
- Cities saved before this feature carry no names and must be given generated ones on load.

# Scope
- In:
  - Carry the street name through `serializeCity` and `restoreCity`, following `run_006_change_what_a_save_contains_without_losing_the_player_s_city`: relax the tuple length check to accept both shapes, bump `SAVE_VERSION`, keep every version up to the current one readable.
  - Generate names on load for a city that has none, so an older save comes back fully named.
  - Extend the older-build check in `scripts/interact.mjs` to strip the new field, and add a unit test parsing a hand-written payload without it.
- Out:
  - Any other save format change.
  - Migrating or rewriting saves in place.
  - Persisting address numbers, which stay derived.

# Acceptance criteria
- AC1: A city saved with names reloads with exactly those names.
- AC2: A city saved before this feature loads successfully and comes back with generated names, covered by the extended older-build check.
- AC3: The unit test on a hand-written pre-feature payload passes, and no existing save check was relaxed to make this work.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A city saved with names reloads with exactly those names.
- request-AC7 -> This backlog slice. Proof: AC2: A city saved before this feature loads successfully and comes back with generated names, covered by the extended older-build check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Primary task(s): `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Notes
- Task `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel` was finished via `logics-manager flow finish task` on 2026-08-30.
