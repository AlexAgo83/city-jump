## item_105_make_house_numbering_locale_independent_and_stop_rebuilding_every_street_per_parcel - Make house numbering locale-independent and stop rebuilding every street per parcel
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 66%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: localeCompare makes house numbers depend on the runtime locale for one city, and streetForSegment rebuilds every street from every segment once per parcel.
- Keywords: segmentOffsets, localeCompare, determinism, addressForParcel, per-parcel rebuild
- Use when: touching street addressing or numbering determinism.
- Skip when: changing the naming word lists, suffix rules or the numbering scheme.

# Problem
- segmentOffsets orders segments with localeCompare (src/sim/streets.ts:89), which is locale-sensitive, so house numbers can differ between environments for one city.
- streetForSegment rebuilds every street from every segment on each call, and addressForParcel calls it once per parcel.
- src/sim/streets.test.ts covers naming, not addressing, so the ordering is unpinned.

# Scope
- In:
  - Replace localeCompare with a plain ordering comparison.
  - Hoist the streets(graph) result out of the per-parcel loop.
  - A test pinning the address of a known parcel on a known city.
- Out:
  - Changing the naming word lists or suffix rules.
  - Changing the numbering scheme itself.

# Acceptance criteria
- AC1: Addressing uses no locale-sensitive comparison.
- AC2: A pinned city gives the same addresses on any runtime locale.
- AC3: addressForParcel over a whole city does not rebuild the street list per parcel.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: Addressing uses no locale-sensitive comparison.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Primary task(s): `task_037_orchestrate_the_0_4_0_correctness_fixes`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
