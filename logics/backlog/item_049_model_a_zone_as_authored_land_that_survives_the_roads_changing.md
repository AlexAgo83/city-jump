## item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing - Model a zone as authored land that survives the roads changing
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A zone is authored intent, not derived state, so it cannot be recomputed from the graph and must survive the roads under it being redrawn — anchored to ground rather than to parcels.
- Keywords: model, zone, authored, land, survives, roads, changing
- Use when: Modelling zones in `src/sim`, or persisting them through `serializeCity` and `restoreCity`.
- Skip when: The work paints a zone in the UI, or decides what a zone causes to be built.

# Problem
- Everything the city renders today is derived from the graph and can be thrown away and recomputed. A zone cannot: it is what the player meant, and nothing else in the model can reproduce it.
- Roads move. A zone anchored to a parcel or a cell index would be erased the moment a street under it is redrawn, which is exactly when the player would least expect to lose it.

# Scope
- In:
  - A pure zone model in `src/sim`: what kinds exist, what area a zone covers, and how a zone is resolved for a given piece of buildable land.
  - Anchor a zone to something that survives the graph changing -- ground, not parcels -- so redrawing a street re-derives which parcels are affected rather than losing the intent.
  - Persist zones through `serializeCity` and `restoreCity`, following `run_006_change_what_a_save_contains_without_losing_the_player_s_city`; a city saved without zones loads with none and behaves as it does today.
  - Unit tests: a zone survives a road being split, moved and deleted under it; clearing a zone returns the land to unzoned; an old save loads unzoned.
- Out:
  - Painting a zone in the UI, and anything visual.
  - What a zone causes to be built.
  - Any simulation over zones.

# Acceptance criteria
- AC1: A zone survives the roads under it being redrawn, proven by tests that split, move and delete a road beneath one.
- AC2: Zones round-trip through a save, and a city saved before zones existed loads unzoned and unchanged.
- AC3: The model is pure, in `src/sim`, and its tests run with no scene.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A zone survives the roads under it being redrawn, proven by tests that split, move and delete a road beneath one.
- request-AC4 -> This backlog slice. Proof: AC2: Zones round-trip through a save, and a city saved before zones existed loads unzoned and unchanged.
- request-AC6 -> This backlog slice. Proof: AC3: The model is pure, in `src/sim`, and its tests run with no scene.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_011_a_city_that_is_built_on_purpose`
- Architecture decision(s): (none yet)
- Request: `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`
- Primary task(s): `task_016_implement_zoning_as_the_player_s_second_decision`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
