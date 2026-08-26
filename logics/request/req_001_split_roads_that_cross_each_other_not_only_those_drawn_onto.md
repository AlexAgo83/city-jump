## req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto - Split roads that cross each other, not only those drawn onto
> From version: 1.0.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:55:01

# AI Context
- Summary: Two roads drawn across each other overlap without producing a junction, because the segment-snap rule only fires when an endpoint lands on a segment. Found while building req_000; deliberately left out of it, since nothing in that request's criteria mentions crossings.
- Keywords: road crossing, segment intersection, mid-segment split, junction creation, snapping rules, req_000 follow-up
- Use when: changing how junctions come into existence, or investigating two roads that overlap with no junction between them.
- Skip when: the work is endpoint snapping, which req_000 already delivered, or junction geometry, which req_000's trimmed-polygon slice owns.

# Needs
- `resolveSnap` in `src/sim/rules.ts` snaps an endpoint to a nearby node or splits the segment that endpoint lands on. Neither rule looks at what a segment passes *through*, so a road drawn straight across another produces two segments that overlap in the world and share nothing in the graph.
- The road surface still renders -- the two ribbons simply cross -- so the defect is invisible until something reads the graph and expects the network to be connected. Traffic would be the first to find it, but building slots already suffer a milder version: neither road knows to keep its frontage clear of the other.
- This was found while delivering `req_000` and deliberately left out of it. That request's AC7 defines a junction as what snapping produces, and none of its criteria mentions crossings; widening it during delivery would have made the scope unreadable.

# Context
- The graph already has everything the fix needs: `splitSegment` splits at a distance along a segment and preserves the curve on both sides, and `nearestOnSegment` turns a world position into a segment plus a distance. What is missing is finding the crossing in the first place.
- Two quadratic Beziers can be intersected exactly, but the sample polylines every segment already carries make a segment-segment sweep far simpler, and their resolution -- roughly one point per metre -- is well under the 2 m position grid the drawing rules quantise to.
- The expensive part is not the intersection test but deciding what to test against. A linear scan over every segment is fine at the scale measured so far (237 segments) and is what `nearestNode`/`nearestOnSegment` already do; both carry a note that a spatial index is the upgrade when a profile asks for one.
- Cities:Skylines splits both roads at the crossing and makes it a junction. The alternative -- refusing the crossing outright -- is worse: it makes a common drawing gesture fail for a reason the player cannot see.
- Bridges are the reason this cannot simply always split: once a segment can be elevated, a crossing is sometimes deliberate. That interaction should be named here even though elevated segments do not exist yet.

# Acceptance criteria
- AC1: A road drawn across an existing one splits both at the crossing and leaves a single node shared by four segments, so the network is connected wherever it looks connected.
- AC2: A road crossing several others in one stroke splits at every crossing, in order along its length.
- AC3: A crossing that falls within the node-snap radius of an existing node attaches to that node instead of creating a second one beside it.
- AC4: Crossings are found from the segments' existing sample polylines, with no new curve-intersection machinery, and the cost of the search is stated against the segment count it was measured at.
- AC5: The junction geometry a new crossing produces is the one already delivered, with no change to how it is built.
- AC6: The interaction with elevated segments is written down: when a segment can be elevated, a crossing is a decision rather than always a split.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `src/sim/rules.ts`
- `src/sim/graph.ts`
- `src/sim/junction.ts`
- `src/sim/rules.test.ts`
- `req_000_draw_a_road_network_the_city_grows_from`

# Backlog
- none
