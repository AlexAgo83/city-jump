## item_005_derive_building_slots_from_segments_and_render_them_as_thin_instances - Derive building slots from segments and render them as thin instances
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:33:17

# AI Context
- Summary: Building slots derived from segments by arc length, offset and oriented to the road, filled with GLB models from the MeshAnvil pipeline rendered as thin instances; carries the measured frame rate at a thousand buildings.
- Keywords: building slot, setback, thin instances, GLB, MeshAnvil asset convention, draw calls, frame rate measurement
- Use when: placing buildings, changing slot spacing or setback, importing building models, or investigating the draw-call budget.
- Skip when: the question is which building goes in which slot -- zoning and growth rules are not in this request at all.

# Problem
- Buildings placed freely would each require collision resolution, an orientation heuristic and a road-access check; derived from the segment they need none of those.
- A city is thousands of buildings, and one draw call per building does not render.

# Scope
- In:
  - Slots generated along each segment by arc length, offset to each side by the road half-width plus a setback, oriented to the segment normal.
  - Slot invalidation and regeneration when the segment changes, and suppression of slots that fall within a junction's radius.
  - Loading GLB building models from the MeshAnvil pipeline, under a written asset convention: one GLB per building, origin at the footprint corner, metre scale, one fixed orientation.
  - Rendering buildings as thin instances against the shared model meshes, one matrix per building.
  - A measurement of the frame rate at a stated building count on a stated machine, recorded rather than claimed.
- Out:
  - Zoning types, growth rules, demand, and any decision about which building goes in which slot beyond a placeholder rule.
  - Level of detail and culling; they are additions to make when the measurement asks for them.
  - Building animation, interiors, and anything the buildings do.

# Acceptance criteria
- AC1: Slots along a segment are evenly spaced by arc length on both straight and curved segments, offset to the side and oriented to the road.
- AC2: Changing a segment regenerates its slots, and slots inside a junction radius are suppressed.
- AC3: Every slot fronts a road by construction; no collision or access check is performed to place a building.
- AC4: Buildings load as GLB from the MeshAnvil pipeline and the asset convention is written down where the pipeline's authors will read it.
- AC5: Buildings render as thin instances, not as one mesh per building.
- AC6: The frame rate at a stated building count of at least a thousand is measured on a stated machine and recorded.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: Slots along a segment are evenly spaced by arc length on both straight and curved segments, offset to the side and oriented to the road.
- request-AC11 -> This backlog slice. Proof: AC2: Changing a segment regenerates its slots, and slots inside a junction radius are suppressed.

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
