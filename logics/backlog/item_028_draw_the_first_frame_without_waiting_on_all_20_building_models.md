## item_028_draw_the_first_frame_without_waiting_on_all_20_building_models - Draw the first frame without waiting on all 20 building models
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 82%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: `createBuildingRenderer` awaits all 20 GLBs (1.8 MB, uncompressed) plus a flat-shade conversion and edge-rendering pass each, before `startApp` draws anything.
- Keywords: draw, first, frame, waiting, all, building, models
- Use when: Changing how building models are fetched or post-processed at startup, or adding mesh compression.
- Skip when: The work trims the loader itself (item_027) or reduces model detail.

# Problem
- `createBuildingRenderer` `Promise.all`s all 20 GLBs -- 1.8 MB uncompressed, up to 250 KB for one lot, no Draco or meshopt -- and `startApp` awaits it before anything renders.
- Each model then pays a main-thread `convertToFlatShadedMesh` and `enableEdgesRendering` before the first frame.

# Scope
- In:
  - Let the scene render before every model is ready: load models so the first frame is not gated on the full catalogue, and fill in buildings as their model arrives.
  - Consider compressing the models, or at least confirm the largest ones are not carrying geometry the game never shows.
  - Keep a restored city correct: every parcel ends up with the building it should have.
- Out:
  - Reducing model detail or replacing the models.
  - A loading screen or progress UI as a substitute for actually loading less.

# Acceptance criteria
- AC1: The first frame renders without waiting on all 20 models, and the models appear as they become available.
- AC2: A city loaded from a save ends up with the correct building on every parcel, confirmed by the interaction check.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The first frame renders without waiting on all 20 models, and the models appear as they become available.
- request-AC7 -> This backlog slice. Proof: AC2: A city loaded from a save ends up with the correct building on every parcel, confirmed by the interaction check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
