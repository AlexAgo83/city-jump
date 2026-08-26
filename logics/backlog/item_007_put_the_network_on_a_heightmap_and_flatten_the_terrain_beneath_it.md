## item_007_put_the_network_on_a_heightmap_and_flatten_the_terrain_beneath_it - Put the network on a heightmap and flatten the terrain beneath it
> From version: 1.0.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:54:17

# AI Context
- Summary: Activates the relief the whole request was shaped to admit: a heightmap behind the terrain-height function, roads and slots following it, and the terrain flattened beneath each road with an embankment margin. The graph should need no change.
- Keywords: heightmap, terrain mesh, terrain flattening, embankment margin, road conformance, maximum gradient, ground restoration
- Use when: adding relief, fixing a road that floats or is buried, changing how terrain responds to roads, or enforcing the gradient rule on real slopes.
- Skip when: the work is bridges or tunnels (they need an elevated flag suppressing flattening, a later request) or player-facing terrain sculpting.

# Problem
- The terrain-height function returns zero, so the whole relief interface exists and does nothing.
- Roads laid over a relief without conforming the terrain to them either float above the ground or are buried by it, and no amount of care in the road mesh fixes that -- the ground has to move.

# Scope
- In:
  - A heightmap terrain and its mesh, with the terrain-height function reading from it.
  - Road surface and building slots following the sampled elevation, through the existing interface with no change to the graph.
  - Flattening the terrain beneath each road: walking the segment polyline and setting the cells within the road width to the road's elevation, with an embankment margin blending out to the surrounding ground.
  - The maximum-gradient rule taking effect now that segments have real gradients.
  - Regenerating the affected terrain when a road is added, changed or removed, including restoring the ground where a road was.
- Out:
  - Elevated segments -- bridges and tunnels -- which need a flag suppressing flattening and are a later request.
  - Terrain sculpting tools for the player.
  - Any change to the graph, which is what the interface was written to avoid.

# Acceptance criteria
- AC1: The terrain has relief, and the terrain-height function reads it; nothing else in the codebase computes an elevation.
- AC2: Roads and building slots follow the relief, and the graph is unchanged by this item.
- AC3: No road floats above the ground or is buried by it on any slope the drawing rules allow.
- AC4: The terrain under a road is level with it across its width, and blends out to the surrounding ground over the embankment margin.
- AC5: A segment exceeding the maximum gradient is refused at draw time on real relief.
- AC6: Removing a road restores the ground beneath it.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The terrain has relief, and the terrain-height function reads it; nothing else in the codebase computes an elevation.
- request-AC12 -> This backlog slice. Proof: AC2: Roads and building slots follow the relief, and the graph is unchanged by this item.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
- Request: `req_000_draw_a_road_network_the_city_grows_from`
- Primary task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`

# Notes
- Task `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it` was finished via `logics-manager flow finish task` on 2026-08-26.
