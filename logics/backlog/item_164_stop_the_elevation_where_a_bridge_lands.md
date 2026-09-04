## item_164_stop_the_elevation_where_a_bridge_lands - Stop the elevation where a bridge lands
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:23:23

# AI Context
- Summary: Elevation propagated from any node carrying an elevated arm, so a road off the bridge's landfall became a bridge and cascaded -- 16 of 16 roads in the operator's city, floating 2 m over ungraded ground with no crossing splits.
- Keywords: touchesElevated, aloft test, ELEVATED_CLEARANCE threshold, cascade, conformToRoads skip, crossing split skip, duplicated predicate
- Use when: changing what makes a drawn road elevated, or reconciling the commit with the preview.
- Skip when: replay of an elevated save, the 60 m bridge-end magnet, and extending a bridge that is genuinely aloft.

# Problem
- `commitSegment` set `elevated` from `touchesElevated`, true whenever any segment at the snapped node was elevated. Drawing from the bridge's landfall made the road a bridge, and its far node then propagated to the next -- measured as all 16 roads of a city elevated, with four nodes at the +2 m `ELEVATED_CLEARANCE` signature.
- Nothing said so. An elevated segment is skipped by `conformToRoads`, so the town floated over ungraded ground, and by the crossing split, so crossing roads would never have formed a junction.
- `touchesElevated` existed verbatim in both src/sim/rules.ts and src/app/drawController.ts -- the commit and the preview -- so they could disagree about what a road would become.

# Scope
- In:
  - Deciding elevation by whether the point is still aloft, at the `ELEVATED_CLEARANCE` threshold.
  - One shared implementation, exported from the rules and imported by the controller.
  - Tests that fail without the rule, including the cascade.
- Out:
  - Replay: a save recording an elevated segment is honoured as written.
  - The 60 m magnet to bridge-end nodes, which still helps a road connect.
  - Extending a bridge that is genuinely aloft, which must keep working.

# Acceptance criteria
- A road drawn from a landed deck is a surface road, and drawing on from it does not cascade.
- A road drawn from a deck still in the air is still elevated.
- One implementation decides it, used by both the commit and the preview.
- Removing the rule fails a test.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: A road drawn from a landed deck is a surface road, and drawing on from it does not cascade.
- request-AC7 -> This backlog slice. Proof: A road drawn from a deck still in the air is still elevated.
- request-AC8 -> This backlog slice. Proof: One implementation decides it, used by both the commit and the preview.

# Decision framing
- Product framing: Not needed
- Architecture framing: Settled by `adr_008_decide_elevation_by_height_above_ground_not_by_what_a_node_touches`

# Links
- Product brief(s): `prod_035_an_island_that_hands_the_player_a_road_and_a_bridge_that_knows_when_it_has_landed`
- Architecture decision(s): `adr_008_decide_elevation_by_height_above_ground_not_by_what_a_node_touches`
- Request: `req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands`
- Primary task(s): `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Priority
- Priority: High
- Rationale: A defect that silently turns a city into bridges and stops the ground being graded under it; it also overrides a rule about drawing, so it carries an ADR.

# Tasks
- `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Notes
- Task `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule` was finished via `logics-manager flow finish task` on 2026-09-04.
