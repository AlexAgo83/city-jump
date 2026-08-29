## item_013_split_roads_that_cross_each_other_not_only_those_drawn_onto - Split roads that cross each other, not only those drawn onto
> From version: 1.0.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:28:39

# AI Context
- Summary: The single-crossing case is already delivered and tested; this slice closes the two remaining gaps -- a stroke crossing several roads only splits at the first one found, and a crossing near an existing node does not merge into it.
- Keywords: road crossing, multiple crossings, snap-radius merge, firstCrossing, commitSegment
- Use when: implementing multi-crossing splitting or crossing-to-node snap merging in `src/sim/rules.ts`.
- Skip when: touching the already-delivered single-crossing path, junction geometry, or endpoint snapping.

# Problem
`firstCrossing` (`src/sim/rules.ts:151-173`) returns after the first crossing it finds and `commitSegment` (`:115-138`) splits only there; a stroke drawn across two or more existing roads leaves every crossing past the first one unsplit, so the network reads as connected at the first junction and silently is not at the rest.
The same function has no node-snap-radius check: the crossing point becomes a brand-new node (via `graph.splitSegment`) even when an existing node sits within `RULES.nodeSnapRadius` (8 units, `src/sim/rules.ts:12`) of it, producing two nodes a few units apart where the player would expect one junction.
Already delivered and out of scope here: AC1 (single crossing splits both roads, tested in `src/sim/rules.test.ts:69` "splits both roads when one crosses another in the middle"), AC4 (sample-polyline sweep, no new curve math), AC5 (junction geometry untouched), AC6 (tunnels excluded from crossing checks on both sides, tested in `src/sim/rules.test.ts:144` "does not split surface roads when a tunnel crosses under them").

# Scope
- In:
  - Make a drawn stroke split at every crossing it makes, in order along its length, not only the first.
  - Merge a crossing that falls inside `RULES.nodeSnapRadius` of an existing node into that node instead of creating a new one beside it.
- Out:
  - The single-crossing path, junction geometry, and tunnel exclusion -- already delivered, covered by existing tests, not to be redone.
  - Elevated/bridge segments -- do not exist yet; the current tunnel-exclusion behavior is the only "crossing is sometimes deliberate" case in scope today.

# Acceptance criteria
- AC1 (delivered): A road drawn across an existing one splits both at the crossing and leaves a single node shared by four segments.
- AC2 (open): A road crossing several others in one stroke splits at every crossing, in order along its length -- not only the first one `firstCrossing` finds.
- AC3 (open): A crossing that falls within the node-snap radius of an existing node attaches to that node instead of creating a second one beside it.
- AC4 (delivered): Crossings are found from the segments' existing sample polylines, with no new curve-intersection machinery.
- AC5 (delivered): The junction geometry a new crossing produces is the one already delivered, with no change to how it is built.
- AC6 (delivered): Tunnels are excluded from crossing detection on both the drawn road and the existing segments it is tested against.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1 (delivered): A road drawn across an existing one splits both at the crossing and leaves a single node shared by four segments.
- request-AC2 -> This backlog slice. Proof: AC2 (open): A road crossing several others in one stroke splits at every crossing, in order along its length -- not only the first one `firstCrossing` finds.
- request-AC3 -> This backlog slice. Proof: AC3 (open): A crossing that falls within the node-snap radius of an existing node attaches to that node instead of creating a second one beside it.
- request-AC4 -> This backlog slice. Proof: AC4 (delivered): Crossings are found from the segments' existing sample polylines, with no new curve-intersection machinery.
- request-AC5 -> This backlog slice. Proof: AC5 (delivered): The junction geometry a new crossing produces is the one already delivered, with no change to how it is built.
- request-AC6 -> This backlog slice. Proof: AC6 (delivered): Tunnels are excluded from crossing detection on both the drawn road and the existing segments it is tested against.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`
- Primary task(s): `task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto`

# Priority
- Priority: Medium
- Rationale: A real graph-integrity gap (a multi-crossing stroke silently leaves the network disconnected past the first junction), but narrow to trigger and cosmetic-adjacent for the snap-merge half; not urgent enough to preempt the already-scheduled reliability hardening in `task_003`.

# Notes
- Hybrid rationale: Derived from request `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto.md`.
- Generated locally by logics-manager.
- Task `task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto` was finished via `logics-manager flow finish task` on 2026-08-29.

# Tasks
- `task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto`
