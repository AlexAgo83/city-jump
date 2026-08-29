## req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto - Split roads that cross each other, not only those drawn onto
> From version: 1.0.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:28:39

# AI Context
- Summary: Most of this was delivered without going back through this request: `firstCrossing` in `src/sim/rules.ts` now splits both roads where a drawn curve crosses an existing one (AC1), built from the sample polylines rather than new curve-intersection math (AC4), reusing the existing junction geometry unchanged (AC5), and skipping tunnels on either side of the crossing (AC6, verified by the `does not split surface roads when a tunnel crosses under them` test). Re-verified 2026-08-29: still true against the current tree. Two gaps remain open: a stroke that crosses more than one existing road only splits at the first crossing found (AC2), and a crossing that lands within the node-snap radius of an existing node still creates a new node beside it instead of reusing it (AC3).
- Keywords: road crossing, segment intersection, mid-segment split, junction creation, snapping rules, multiple crossings, snap-radius merge
- Use when: changing how junctions come into existence from a crossing, or investigating a multi-road stroke that only splits at one of the roads it crosses.
- Skip when: the work is endpoint snapping (already delivered by `req_000`), junction geometry (unchanged, owned by `req_000`'s trimmed-polygon slice), or the single-crossing case (already delivered and tested here).

# Needs
- `firstCrossing` (`src/sim/rules.ts:151-173`) returns after the first crossing it finds and `commitSegment` (`:115-138`) splits only there; a stroke drawn across two or more existing roads leaves every crossing past the first one unsplit, so the network reads as connected at the first junction and silently is not at the rest.
- The same function has no node-snap-radius check: the crossing point becomes a brand-new node (via `graph.splitSegment`) even when an existing node sits within `RULES.nodeSnapRadius` (8 units, `src/sim/rules.ts:12`) of it, producing two nodes a few units apart where the player would expect one junction.
- Delivered and should not be redone: AC1 (single crossing splits both roads, tested in `src/sim/rules.test.ts:69` "splits both roads when one crosses another in the middle"), AC4 (sample-polyline sweep, no new curve math), AC5 (junction geometry untouched), AC6 (tunnels excluded from crossing checks on both sides, tested in `src/sim/rules.test.ts:144` "does not split surface roads when a tunnel crosses under them").

# Context
- Re-verified against `src/sim/rules.ts` and `src/sim/rules.test.ts` on 2026-08-29; `npm run ci` green at the same commit.
- `graph.splitSegment` already preserves the curve on both sides of a split and is reused as-is for every additional crossing this would add; nothing new is needed there.
- The expensive part is still deciding what to test against, not the intersection test itself. A linear scan over every segment remains fine at the scale measured so far and matches what `nearestNode`/`nearestOnSegment` already do.

# Acceptance criteria
- AC1 (delivered): A road drawn across an existing one splits both at the crossing and leaves a single node shared by four segments.
- AC2 (open): A road crossing several others in one stroke splits at every crossing, in order along its length -- not only the first one `firstCrossing` finds.
- AC3 (open): A crossing that falls within the node-snap radius of an existing node attaches to that node instead of creating a second one beside it.
- AC4 (delivered): Crossings are found from the segments' existing sample polylines, with no new curve-intersection machinery.
- AC5 (delivered): The junction geometry a new crossing produces is the one already delivered, with no change to how it is built.
- AC6 (delivered): Tunnels are excluded from crossing detection on both the drawn road and the existing segments it is tested against.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

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
- `item_013_split_roads_that_cross_each_other_not_only_those_drawn_onto`
