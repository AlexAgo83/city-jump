## item_006_replace_disc_junctions_with_trimmed_back_polygons - Replace disc junctions with trimmed-back polygons
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:33:17

# AI Context
- Summary: Replaces the placeholder disc junction with the correct construction: each incident segment trimmed back by the junction radius, the gap closed by a polygon ordered by arrival angle, including the two-segment and narrow-angle cases.
- Keywords: junction geometry, trim back, junction radius, closing polygon, incident angle ordering, degenerate cases
- Use when: junction surfaces show gaps, seams or overlap, or a junction with an unusual number of incident segments renders wrong.
- Skip when: the work is curbs, lane markings, crosswalks or signals -- named out of scope, and a far larger subject.

# Problem
- The flat disc covers the segment ends but reads as a disc: it overlaps the road surface, ignores the angles at which the segments arrive, and is visible as soon as the camera comes down.

# Scope
- In:
  - Trimming each incident segment back from the junction node by the junction radius, so the surfaces stop short of it.
  - Building the junction surface as a polygon closing the gap between the trimmed ends, ordered by the incident segments' angles.
  - Handling the degenerate cases the drawing rules can still produce: two incident segments, and segments arriving at a narrow angle.
  - Recomputing the junction when any incident segment changes.
- Out:
  - Curb fillets, lane markings, crosswalks and traffic signals.
  - Any change to how junctions are created, which the drawing tool owns.

# Acceptance criteria
- AC1: Incident segments stop short of the junction and the junction surface closes the gap with no hole and no overlapping seam at play camera distance.
- AC2: A junction of two segments and a junction of five are both handled without a visible defect.
- AC3: Segments arriving at a narrow angle produce a junction surface that is still closed.
- AC4: Editing an incident segment recomputes the junction.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: Incident segments stop short of the junction and the junction surface closes the gap with no hole and no overlapping seam at play camera distance.

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
