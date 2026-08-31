## road_001_city_jump_playable_city - city-jump playable city
> Date: 2026-08-27
> Status: Superseded
> Related product: `prod_001_a_city_that_grows_from_the_roads_you_draw`
> Related request: `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-08-30 14:38:38

# AI Context
- Summary: Six long-running epics rather than dated versions. Each one is a standing strand of the game that keeps advancing; work moves to whichever strand the moment calls for, one request chain at a time.
- Keywords: roadmap, epics, strands, sequencing, city-jump playable city
- Use when: Deciding what to work on next, or placing a new request chain against the shape of the project.
- Skip when: You need execution detail for a single backlog item or task, or a release plan with dates.

# Summary
> Superseded on 2026-08-31 by `road_002_city_jump_a_city_worth_defending`, which sequences the
> direction `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea` sets. The six strands
> below stay open and are still where maintenance and craft work belong -- what moved is the
> sequencing, which this document deliberately did not do and the new one does.

Grow the road-construction prototype into a playable city simulation without replacing the
graph and derived-view foundations already proven in the browser.

The project does not advance in themed waves or numbered releases. It advances by picking up
whichever of these strands needs attention, delivering one request chain against it, and moving
on -- often somewhere else entirely. Every strand stays open for the life of the project; none of
them is ever "finished" and closed.

# Milestones
> These are epics, not releases. `logics-manager flow roadmap validate` expects headings of the
> form `<major>.<minor> - <name>` and will report zero milestones against this file; that is a
> deliberate divergence, not a defect, and it is outside `npm run logics:validate` (which runs
> lint and audit only). Do not "fix" it by putting version numbers back.
## E1 - The road network
- Holds: drawing straight and curved roads, snapping, splitting roads that cross, junction
  polygons, roundabouts, tunnels, one-way and multi-lane types, pedestrian ways.
- Standing: mature. This is the foundation everything else derives from, and it works.
- Open question: bridges, which alter terrain interaction the way tunnels did.
- Suggestion: model before mesh. A tunnel is a road type with a `tunnelDepth`, and the heightmap
  reads that to leave the hill whole; a bridge needs the opposite -- ground it must not conform
  to. Decide first whether that is another road type or a genuinely new kind of segment, because
  `conformToRoads`, the junction geometry and the save format all key off `type`. The chain to
  write is that decision, and `adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views`
  is where its answer belongs.

## E2 - The land and what grows on it
- Holds: the heightmap, terrain conformance under roads and junctions, buildable plots, parcel
  packing, the building model library, trees and plantings.
- Holds, since `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`
  shipped: zones the player paints, persisted in the save, constraining which footprints a block
  may use through the same seam that already narrowed sizes for pedestrian roads.
- Standing: the second decision exists. A building now appears because someone asked for that
  kind of building there, not only because a rectangle fit. Demand and economy still do not
  exist, and that was deliberate -- they needed something to act on, and this is it.
- Open question: demand, growth over time, and economy, all of which now have a model to act on.
- Suggestion: take the smallest one first -- whether a plot fills *at all*. Today every valid
  parcel gets a building; letting a zoned plot stay empty until something wants it is one boolean
  in `buildingParcels` and the first thing that makes a city feel alive rather than complete.
  Growth, upgrades and money are all downstream of that and none of them should be attempted
  before it exists.
- Open question: whether zones should carry a style dimension rather than only a footprint
  constraint.
- Suggestion: not yet, and the reason is recorded rather than forgotten -- it multiplies the model
  library, and `scripts/gen_buildings.py` already assigns a style per model that nothing outside
  the generator can address. Revisit only once the manifest from
  `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
  is proven able to carry a style field, which is a small experiment rather than a chain.

## E3 - Life on the network
- Holds: cars and pedestrians, lanes and lane changes, junction transfers, traffic signals,
  crossings, roundabout circulation, headlights and street lighting.
- Standing: mature and visibly working.
- Open question: whether trips ever mean anything -- routing between an origin and a destination
  rather than plausible movement.
- Suggestion: zoning just supplied the missing half. A dense block is a destination and a low
  block is an origin, so the smallest honest step is one car that knows where it is going --
  picked from the existing parcels, routed over the graph, and handed to the junction-transfer
  model that already moves it. Do that for one car before doing it for all of them, and do it
  after `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`,
  which is where the population count stops being a constant.

## E4 - Reading the city
- Holds: the select tool, the detail panel, the zone and traffic views, the buildable grid.
- Holds, since `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
  and `req_012_give_the_camera_three_target_policies_free_orbit_and_follow` shipped: streets that
  carry a name across the segments that continue each other, building addresses, a detail panel
  that opens on a road, a building, a car, a tree or a roundabout, and free, orbit and follow
  cameras.
- Standing: the city can be read and watched, and -- once
  `req_019_let_the_player_take_back_the_last_thing_they_did` lands -- changed back. There is no
  undo today, which is felt hardest where the game is strongest: a curve is three considered
  clicks and the bulldozer is one. `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
  adds the one readout the player has no way to see today, and
  `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`,
  `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`,
  `req_019_let_the_player_take_back_the_last_thing_they_did`,
  `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit` and
  `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`,
  `req_019_let_the_player_take_back_the_last_thing_they_did`,
  `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit` give them
  the switches that make that number worth looking at -- showing someone a cost they cannot act
  on is worse than not showing it. The traffic pair is the largest of the three and the only one
  a player would also want for its own sake.
- Open question: everything above the street -- districts, neighbourhoods, a map view.
- Suggestion: streets and addresses exist now, so a district is a grouping over streets rather
  than a new coordinate system -- start by naming a group, not by drawing a map. A map view is
  the expensive end of this and should wait until there is something on it worth reading; the
  cheap first step is the detail panel saying which district a street belongs to.

## E5 - Keeping and sharing a city
- Holds: named saves, autosave, session resume, the bundled Demo city, camera and settings
  persistence.
- Holds, since `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
  and `req_011_share_a_city_as_a_link_that_needs_no_server` shipped: a failed load that changes
  nothing, an autosave that says when it could not write, and a city that travels as a gzipped
  URL fragment with no server behind it.
- Standing: a city is safe and it can leave the browser that built it.
- Open question: whether a city is ever worth more than a link -- galleries, remixing, any of
  which would need infrastructure this project deliberately does not have.
- Suggestion: treat this as answered no, and record it. `adr_004_stay_a_static_client_with_no_server_of_its_own`
  is Settled, and a gallery is a server by another name. The right move is to close the question
  against that ADR rather than leave it standing as if it were pending -- if it should reopen, the
  thing to reopen is the ADR, not this line.

## E6 - The craft underneath
- Holds: the layering the architecture test enforces, the test suite, the CI budget, the
  performance of a rebuild, the runbooks, and this corpus.
- Holds, since `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`,
  `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
  and `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`
  shipped: an edit that repaints the region it touched rather than the world, a building manifest
  that is the single source of a model's geometry, and documents that describe the deployment
  that actually exists.
- Standing: the bill for that speed is now due. A code review of the whole range found ten
  defects the green suite cannot see, two of them player-visible;
  `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
  closes them and leaves behind the checks that would have caught them. This is the strand's
  standing lesson: moving correctness from one place into four buys speed and costs proof.
- Standing, second front: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
  takes the strand's own open question and puts a measurement behind it. Trees rescan 5,400 m of
  island on every road placed, the world grid allocates on the order of 900,000 vectors whenever
  it is showing, and `allJunctions` solves the same geometry five times per rebuild. The chain is
  written to allow the answer "leave it, here is the number".
- Open question: the main bundle, still 963 kB raw and 251 kB gzipped, warned about by Vite on
  every build, which no chain covers.
- Suggestion: measure the chunk before splitting it. `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
  already narrowed the glTF loader and deferred the building models; what is left is mostly
  Babylon, and the question is which of its subsystems are reachable at first paint. A chain here
  is worth scaffolding once that measurement exists -- for a game whose pitch is "no install, it
  runs on the page", first-paint weight is the pitch.
- Open question: whether the build tools should ever work on a touchscreen.
  `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen` answered what to *tell*
  a phone visitor, not whether they can build.
- Suggestion: the blocker is named in the README -- hover previews and right-click cancel have no
  touch equivalent. So the chain to write is not "add touch support" but "decide what a preview
  and a cancel are without a hover and a right button", and that is a design question worth one
  short request before any code.

# Sequencing
- Advance whichever strand the moment calls for. There is no prescribed order between them and
  no version gate to pass.
- One request chain at a time per strand, so each increment stays independently reviewable and
  linked to concrete workflow docs.
- Where two chains touch the same files, the ordering lives in the orchestration tasks, not here.

Every chain listed above has shipped except the two that are open now. There is no queue behind
them; the next chain is chosen when this one closes.

1. `task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work` --
   first, because two of its findings are player-visible and both were introduced by work that
   is already closed. Its own plan carries the internal ordering: the road-mesh predicate is
   settled before anything else depends on it.
2. `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` -- after it, and
   deliberately so: an FPS readout is only worth trusting once a partial rebuild is known not to
   be silently dropping geometry, and it is the instrument the next performance question will be
   argued with.
3. `task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off` -- after the counter
   exists: these switches are the answer to the number it shows, and the counter is how their
   effect is measured rather than asserted.
4. `task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is` --
   after step 3, because it shares the headlight cluster with it and inherits the World-toggle
   pattern from both steps above.
5. `task_021_let_the_player_take_back_the_last_thing_they_did` -- independent of the four above and
   the largest player-visible gap left; it needs only step 1's predicate work not to be in flight
   in the same files.
6. `task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world` -- after step 1 and
   not before: that chain settles the dispose-and-recreate predicate this one would otherwise copy
   wrong four more times.

- A strand with an open question that blocks a player-visible decision earns priority over one
  that only carries internal work -- but only when the decision is actually blocked, not merely
  imagined.

# Risks
- Zoning, traffic, and economy can each become standalone simulations; request chains must keep
  every increment tied to one visible player decision.
- The road graph is a strong foundation but bridges and any future persistence of simulation
  state may expose missing model that must be decided before meshes or UI depend on it.
- Strands that are already mature attract polish while the strand that would change the game
  stays unbuilt. Zoning has landed, so the version of this risk that applies now is demand:
  four of the six open chains are settings, measurement and correctness work, and none of them
  changes what the player decides. That is defensible while the review findings are open and
  stops being defensible after them. Notice when it stops.
- Five of the six open chains touch the renderers, and three touch the same files. The ordering
  that keeps them apart lives in each orchestration task's plan, not here, and running two of
  them at once is the failure mode -- particularly `task_017` against anything else, since it
  settles the dispose-and-recreate predicate the others copy.
- These strands are a description of the project's shape, not a commitment to any of them in any
  order or timeframe.

# References
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`,
  `prod_004_a_city_builder_that_never_loses_the_city_on_screen`,
  `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`,
  `prod_006_one_source_of_truth_for_what_a_building_model_is`,
  `prod_007_a_city_you_can_point_at_and_name`,
  `prod_008_a_city_you_can_hand_to_someone_else`,
  `prod_009_a_camera_that_can_watch_not_only_be_aimed`,
  `prod_010_a_published_game_whose_documents_tell_the_truth`,
  `prod_011_a_city_that_is_built_on_purpose`,
  `prod_012_a_city_that_keeps_drawing_itself_correctly`,
  `prod_013_a_city_that_tells_you_what_it_costs_to_draw`,
  `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`,
  `prod_015_a_city_whose_traffic_is_the_player_s_to_dial`,
  `prod_016_a_city_you_can_change_your_mind_about`,
  `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Request(s): `req_000_draw_a_road_network_the_city_grows_from`,
  `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`,
  `req_002_establish_modular_repository_foundations`,
  `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`,
  `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`,
  `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`,
  `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`,
  `req_011_share_a_city_as_a_link_that_needs_no_server`,
  `req_012_give_the_camera_three_target_policies_free_orbit_and_follow`,
  `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`,
  `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`,
  `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`,
  `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`,
  `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`,
  `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`,
  `req_019_let_the_player_take_back_the_last_thing_they_did`,
  `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Backlog item(s): `item_001_stand_up_the_babylon_scene_and_the_dev_loop`,
  `item_008_establish_modular_repository_foundations`
- Task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`,
  `task_002_establish_modular_repository_foundations`
