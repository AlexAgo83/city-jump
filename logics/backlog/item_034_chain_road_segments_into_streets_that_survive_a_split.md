## item_034_chain_road_segments_into_streets_that_survive_a_split - Chain road segments into streets that survive a split
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:52:30

# AI Context
- Summary: A road drawn through three junctions is three unrelated segments; a street is that chain, found with the same facing rule `signalCycle` already uses, and its identity has to survive `splitSegment`.
- Keywords: chain, road, segments, streets, survive, split
- Use when: Adding or changing street identity in `src/sim`, or touching `splitSegment` in `src/sim/graph.ts`.
- Skip when: The work is naming, addressing, UI, or changes how signal phases are chosen.

# Problem
- A road drawn through three junctions is three unrelated segments; nothing in the model says they are one street, so nothing can be addressed along it.
- `splitSegment` replaces one segment with two, so any identity attached to a segment has to be carried across that.
- The facing rule needed here already exists in `signalCycle` (`OPPOSITE`, 45 degrees); a second, independently written rule would eventually disagree with the first.

# Scope
- In:
  - A pure module in `src/sim` that groups the graph's segments into streets: at a junction, a segment continues into the arm that most nearly faces it within the existing `OPPOSITE` threshold, when the road type matches and neither side is a roundabout.
  - A stable street identity carried on the segment, inherited by both halves in `splitSegment` and by a segment drawn as the continuation of an existing street.
  - Distance along a street, ordered from a deterministic origin, so an address can be measured from it.
  - Unit tests for the interesting shapes: a straight run through several junctions, a bend, a T where the through road continues and the branch does not, a crossroads, a roundabout breaking the chain, and a split.
- Out:
  - Naming anything -- that is the next slice.
  - Changing `signalCycle` itself or how signal phases are chosen.
  - Any UI.

# Acceptance criteria
- AC1: Segments continuing through a junction resolve to one street, using the same facing rule as the signal phases, with a roundabout breaking the chain.
- AC2: Splitting a segment leaves both halves on the same street as before the split, proven by a test.
- AC3: The module is pure, lives in `src/sim`, and its tests run with no Babylon scene.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Segments continuing through a junction resolve to one street, using the same facing rule as the signal phases, with a roundabout breaking the chain.
- request-AC6 -> This backlog slice. Proof: AC2: Splitting a segment leaves both halves on the same street as before the split, proven by a test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Primary task(s): `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
