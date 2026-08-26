## item_003_draw_roads_with_the_pointer_under_four_snapping_rules - Draw roads with the pointer under four snapping rules
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:33:17

# AI Context
- Summary: The drawing tool and the four snapping rules that make junctions appear as a consequence rather than as a placement, plus draw-time refusal with a reason. No angle snapping, on purpose.
- Keywords: drawing tool, node snap, segment snap, split, position quantisation, minimum length, maximum gradient, preview, no angle snap
- Use when: changing how roads are drawn, how a junction comes into existence, or which segments are refused and why.
- Skip when: the work is the road surface mesh or junction geometry -- this item may leave the network drawn as bare lines.

# Problem
- An unconstrained drawing tool produces three-degree angles, sub-metre segments and near-coincident nodes that are not the same node, and each of those breaks junction geometry downstream.
- Intersections have to come from somewhere, and asking the player to place them is both more UI and a worse result.

# Scope
- In:
  - A pointer interaction that places a start node, an end node and a control point, and commits a segment.
  - The four snapping rules: node snap within a radius, segment snap that splits the segment drawn onto, position quantisation to a fixed step, and a minimum segment length.
  - Validation at draw time -- minimum length and maximum gradient -- with the reason shown when a segment is refused.
  - A preview of the segment under the pointer that shows whether it would be accepted.
  - Tests for the snapping resolution and the validation rules, independent of the pointer.
- Out:
  - Angle snapping, which is what would make the network read as gridded.
  - Undo/redo and deletion of existing roads.
  - Road types and any choice of width at draw time.
  - The road surface mesh; the network may be drawn as bare lines here.

# Acceptance criteria
- AC1: A road is drawn by pointer, curves under its control point, and enters the graph.
- AC2: Ending near an existing node attaches to that node rather than creating a second one at the same place.
- AC3: Drawing onto an existing segment splits it and shares the new node, producing a junction.
- AC4: Positions are quantised to the fixed step, so two nodes drawn at the same place are one node.
- AC5: A segment below the minimum length or above the maximum gradient is refused with its reason shown, and does not enter the graph.
- AC6: No angle snapping is applied at any point.
- AC7: The preview shows, before the commit, whether the segment would be accepted.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A road is drawn by pointer, curves under its control point, and enters the graph.
- request-AC6 -> This backlog slice. Proof: AC2: Ending near an existing node attaches to that node rather than creating a second one at the same place.
- request-AC7 -> This backlog slice. Proof: AC3: Drawing onto an existing segment splits it and shares the new node, producing a junction.
- request-AC13 -> This backlog slice. Proof: AC4: Positions are quantised to the fixed step, so two nodes drawn at the same place are one node.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
- Request: `req_000_draw_a_road_network_the_city_grows_from`
- Primary task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
