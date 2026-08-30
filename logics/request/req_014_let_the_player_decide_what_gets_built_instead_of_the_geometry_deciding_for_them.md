## req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them - Let the player decide what gets built, instead of the geometry deciding for them
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:51:59

# AI Context
- Summary: Buildings appear because a rectangle fit, not because anyone wanted them there; the only decision in the game is where the road goes. Adds a zone the player paints, reusing the `LOW_RISE_SIZES` constraint seam that already narrows sizes for pedestrian roads — deliberately without demand, growth or economy.
- Keywords: let, player, decide, gets, built, instead, geometry, deciding, them
- Use when: Working on zones, on what decides a parcel's building, on `buildingParcels` in `src/sim/slots.ts`, or on the Zones view.
- Skip when: The work adds demand, growth, population, economy or services; replaces buildings over time; or generates new building assets.

# Needs
- The player has no say in what appears on their land. A building exists because `buildingParcels` packed a valid rectangle into free buildable cells and the renderer loaded the model matching its size -- nothing anywhere expresses an intention. The only building decision in the game today is where to put a road.
- This is the largest unbuilt part of the project. The roadmap's own land strand records it plainly: mature for geometry, absent for meaning. Every other open request improves something that already works; none of them changes what the player is actually deciding.
- The `Zones` view already promises something the game does not have. Selecting `Zones` shows which buildable cells are taken and which are open -- a readout of geometry, under a name that suggests the player zoned something. Once real zones exist that view has to show them, or the name has to go.
- The seam for this already exists and is unused. `buildingParcels` narrows the sizes a block may use through `LOW_RISE_SIZES` when its road is pedestrian -- a road type already constrains what may be built. A zone is the same mechanism driven by the player instead of by the road.

# Context
- This request deliberately stops short of a simulation. No demand, no growth, no economy, no population, no progression. The one thing it changes is that a building appears because the player asked for that kind of building there. Demand and growth become possible afterwards, on a model that exists; they are not prerequisites for the decision itself.
- There are two ways to make a zone visible, and the cheap one should be tried first. The model library is one family of `lot_<frontage>x<depth>` shapes, so a zone can constrain which footprints and heights a block may use -- exactly as `LOW_RISE_SIZES` already does -- and that changes silhouette and density visibly without a single new asset. The expensive alternative is giving the generator a style dimension and tripling the library, which also drags in `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together` as a prerequisite, since model identity would stop being size alone.
- `scripts/gen_buildings.py` already assigns each model a style -- office, industrial, commercial, residential -- derived from its footprint. That styling is real and visible in the meshes; it is simply not addressable, because nothing outside the generator knows a model has a style.
- Zones are authored data, not derived: unlike plots and buildings, a zone cannot be recomputed from the graph, so it has to be persisted and it has to survive roads being redrawn underneath it. `run_006_change_what_a_save_contains_without_losing_the_player_s_city` is the procedure for adding it to the save.
- The build tools already have a mode that paints over ground rather than placing on it -- the tree spray -- so a zone brush has a precedent in the same tool.

# Acceptance criteria
- AC1: The player can mark an area of the city as a kind of zone, and can change or clear that marking afterwards.
- AC2: What gets built on zoned land follows the zone: two areas zoned differently produce visibly different buildings, and the difference is legible from a normal playing camera without switching views.
- AC3: Land the player has not zoned keeps behaving exactly as it does today, so an existing city is unchanged until its owner touches it.
- AC4: Zones survive a save and a reload, and survive the roads under them being edited -- redrawing a street does not silently erase what the player zoned around it.
- AC5: The `Zones` view shows the player's zones rather than only the buildable grid, so the view and its name mean the same thing.
- AC6: The zone model and the rules that turn a zone into a choice of building are pure functions in `src/sim`, unit-tested without a scene, and `tests/architecture.mjs` still passes.
- AC7: No new building assets are required to satisfy AC2; if the work concludes that new assets are unavoidable, that is recorded as a finding rather than absorbed into this request.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_011_a_city_that_is_built_on_purpose`
- Architecture decision(s): (none yet)

# References
- src/sim/slots.ts
- src/render/buildings.ts
- src/sim/save.ts
- src/render/drawTool.ts
- src/ui/controls.ts
- index.html
- scripts/gen_buildings.py
- logics/roadmap/road_001_city_jump_playable_city.md
- logics/request/req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together.md

# Backlog
- `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`
- `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`
- `item_051_paint_zones_and_make_the_zones_view_show_them`
