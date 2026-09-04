## item_162_land_the_deck_on_the_ground_and_join_what_reaches_it - Land the deck on the ground and join what reaches it
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:23:23

# AI Context
- Summary: The deck stopped 14 m above solid ground with nothing grading up to it, and the bridge's own node was built on top of any road already at the landfall without joining it.
- Keywords: landward node, ELEVATED_CLEARANCE span, conformToRoads skip, heights[0] forced, addNodeAt dedupe, one network
- Use when: changing where the bridge meets the island, or any code that builds a node where one may already be.
- Skip when: the island end off the playable map, an approach ramp, and the gradient guard's blindness to a raised start node.

# Problem
- The landward node was lifted 14 m to clear the water -- 66.44 m against ground at 52.44 m -- so the deck stopped in mid air, and `conformToRoads` skips elevated segments so nothing graded up to it.
- A road drawn off it began with a 14 m step: `buildSamples` forces `heights[0]` to the node while interior samples follow the terrain, and the gradient guard samples the terrain along the curve without ever comparing the start node to the ground beneath it.
- `graph.addNodeAt` never dedupes, so the bridge's own node landed on top of any road already reaching the landfall: two nodes at one metre, two networks of 13 and 2.

# Scope
- In:
  - The landward node at ground height, with the reason recorded where the lift used to be.
  - Reusing a node within `RULES.nodeSnapRadius` at the landfall instead of always building one.
  - Keeping the span a cable bridge: interior clearance, piers, pylons and the e2e assertion.
- Out:
  - The island end of the bridge, which is off the playable map.
  - An approach ramp or any road beyond the deck itself.
  - The gradient guard's blindness to a start node above its ground, which is a wider question.

# Acceptance criteria
- The deck's landward node is at ground height and the deck arrives on the ground.
- The span still renders as a cable bridge and still satisfies the e2e bridge assertion.
- The bridge and whatever reaches the landfall form one network, with no coincident nodes.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: The deck's landward node is at ground height and the deck arrives on the ground.
- request-AC2 -> This backlog slice. Proof: The span still renders as a cable bridge and still satisfies the e2e bridge assertion.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_an_island_that_hands_the_player_a_road_and_a_bridge_that_knows_when_it_has_landed`
- Architecture decision(s): (none yet)
- Request: `req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands`
- Primary task(s): `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Priority
- Priority: High
- Rationale: The deck stopping in mid air was the visible defect, and the coincident node made every road drawn there silently unreachable.

# Tasks
- `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Notes
- Task `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule` was finished via `logics-manager flow finish task` on 2026-09-04.
