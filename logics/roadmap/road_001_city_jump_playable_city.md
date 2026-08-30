## road_001_city_jump_playable_city - city-jump playable city
> Date: 2026-08-27
> Status: Proposed
> Related product: `prod_001_a_city_that_grows_from_the_roads_you_draw`
> Related request: `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-08-30 11:50:12

# AI Context
- Summary: Six long-running epics rather than dated versions. Each one is a standing strand of the game that keeps advancing; work moves to whichever strand the moment calls for, one request chain at a time.
- Keywords: roadmap, epics, strands, sequencing, city-jump playable city
- Use when: Deciding what to work on next, or placing a new request chain against the shape of the project.
- Skip when: You need execution detail for a single backlog item or task, or a release plan with dates.

# Summary
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
- Open questions: bridges, which alter terrain interaction the way tunnels did and deserve their
  own chain when they come.

## E2 - The land and what grows on it
- Holds: the heightmap, terrain conformance under roads and junctions, buildable plots, parcel
  packing, the building model library, trees and plantings.
- Standing: mature for geometry, absent for meaning. Buildings appear because a plot is valid,
  not because anyone wanted them there.
- Open questions: zoning and demand -- the largest unbuilt strand in the project, and the one
  that turns a city model into a game.

## E3 - Life on the network
- Holds: cars and pedestrians, lanes and lane changes, junction transfers, traffic signals,
  crossings, roundabout circulation, headlights and street lighting.
- Standing: mature and visibly working.
- Open questions: whether trips ever mean anything -- routing between an origin and a
  destination rather than plausible movement.

## E4 - Reading the city
- Holds: the select tool, the detail panel, the zone and traffic views, the buildable grid.
- Standing: advancing. `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
  gives the city streets, names and addresses, and extends the panel to buildings and cars;
  `req_012_give_the_camera_three_target_policies_free_orbit_and_follow` lets the player watch the
  city rather than only aim at it.
- Open questions: everything above the street -- districts, neighbourhoods, a map view.

## E5 - Keeping and sharing a city
- Holds: named saves, autosave, session resume, the bundled Demo city, camera and settings
  persistence.
- Standing: advancing. `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
  closes the paths where a city can be lost;
  `req_011_share_a_city_as_a_link_that_needs_no_server` lets one leave the browser that built it.
- Open questions: whether a city is ever worth more than a link -- galleries, remixing, any of
  which would need infrastructure this project deliberately does not have.

## E6 - The craft underneath
- Holds: the layering the architecture test enforces, the test suite, the CI budget, the
  performance of a rebuild, the runbooks, and this corpus.
- Standing: advancing.
  `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
  makes an action cost what it changed;
  `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
  removes a duplicated source of truth.
- Open questions: none standing. This strand is fed by review, and reviews keep finding work.

# Sequencing
- Advance whichever strand the moment calls for. There is no prescribed order between them and
  no version gate to pass.
- One request chain at a time per strand, so each increment stays independently reviewable and
  linked to concrete workflow docs.
- Where two chains touch the same files, the ordering lives in the orchestration tasks, not here.
- A strand with an open question that blocks a player-visible decision earns priority over one
  that only carries internal work -- but only when the decision is actually blocked, not merely
  imagined.

# Risks
- Zoning, traffic, and economy can each become standalone simulations; request chains must keep
  every increment tied to one visible player decision.
- The road graph is a strong foundation but bridges and any future persistence of simulation
  state may expose missing model that must be decided before meshes or UI depend on it.
- Strands that are already mature attract polish while the strand that would change the game
  (zoning and demand) stays unbuilt. Notice when that is happening.
- These strands are a description of the project's shape, not a commitment to any of them in any
  order or timeframe.

# References
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`,
  `prod_004_a_city_builder_that_never_loses_the_city_on_screen`,
  `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`,
  `prod_006_one_source_of_truth_for_what_a_building_model_is`,
  `prod_007_a_city_you_can_point_at_and_name`,
  `prod_008_a_city_you_can_hand_to_someone_else`,
  `prod_009_a_camera_that_can_watch_not_only_be_aimed`
- Request(s): `req_000_draw_a_road_network_the_city_grows_from`,
  `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`,
  `req_002_establish_modular_repository_foundations`,
  `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`,
  `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`,
  `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`,
  `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`,
  `req_011_share_a_city_as_a_link_that_needs_no_server`,
  `req_012_give_the_camera_three_target_policies_free_orbit_and_follow`
- Backlog item(s): `item_001_stand_up_the_babylon_scene_and_the_dev_loop`,
  `item_008_establish_modular_repository_foundations`
- Task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`,
  `task_002_establish_modular_repository_foundations`
