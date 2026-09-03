## item_103_make_a_building_pad_stamp_idempotent_between_neighbours - Make a building pad stamp idempotent between neighbours
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 66%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: The only stamp that never records into this.claim, so it blends against a surface a previous parcel in the same pass may already have moved. The road and junction stamps are nearest-wins and do not have this.
- Keywords: stampParcel, claim, idempotence, nearest wins, dirty region, conformToRoads
- Use when: touching heightmap stamping or a terrain difference between a full and incremental rebuild.
- Skip when: changing pad shape, depth, grading falloff, or the road and junction stamps.

# Problem
- stampParcel (src/sim/heightmap.ts:339) is the only stamp that never records into this.claim, and it blends against this.current, which a previous parcel in the same pass may already have modified. The result is order-dependent between adjacent parcels.
- The road and junction stamps (src/sim/heightmap.ts:257 and :324) are nearest-wins and do not have this problem.

# Scope
- In:
  - Record parcel stamps into this.claim and resolve nearest-wins, as the road and junction stamps do.
  - A test that stamps two adjacent parcels in both orders and expects the same heightfield.
  - A test for the incremental dirty-region path interacting with a parcel stamp.
- Out:
  - Changing the pad shape, depth or grading falloff.
  - Changing the road or junction stamps.

# Acceptance criteria
- AC1: Two adjacent parcels stamped in either order give the same terrain.
- AC2: Re-stamping the same parcel twice changes nothing after the first.
- AC3: A dirty-region rebuild gives the same terrain as a full one for the same city.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Two adjacent parcels stamped in either order give the same terrain.

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
