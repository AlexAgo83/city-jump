## task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto - Split roads that cross each other, not only those drawn onto
> From version: 1.0.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-29 10:28:39

# AI Context
- Summary: Close the two remaining gaps in road-crossing splitting: `firstCrossing` (`src/sim/rules.ts:151-173`) only acts on the first crossing a stroke finds (AC2), and has no node-snap-radius merge (AC3). AC1/AC4/AC5/AC6 are already delivered and tested (`src/sim/rules.test.ts:69`, `:144`) -- do not redo them.
- Keywords: road crossing, multiple crossings, snap-radius merge, firstCrossing, commitSegment
- Use when: implementing multi-crossing splitting or crossing-to-node snap merging in `src/sim/rules.ts`.
- Skip when: touching the already-delivered single-crossing path, junction geometry, or endpoint snapping.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_013_split_roads_that_cross_each_other_not_only_those_drawn_onto`

# Acceptance criteria
- AC1 (delivered): A road drawn across an existing one splits both at the crossing and leaves a single node shared by four segments.
- AC2 (open): A road crossing several others in one stroke splits at every crossing, in order along its length -- not only the first one `firstCrossing` finds.
- AC3 (open): A crossing that falls within the node-snap radius of an existing node attaches to that node instead of creating a second one beside it.
- AC4 (delivered): Crossings are found from the segments' existing sample polylines, with no new curve-intersection machinery.
- AC5 (delivered): The junction geometry a new crossing produces is the one already delivered, with no change to how it is built.
- AC6 (delivered): Tunnels are excluded from crossing detection on both the drawn road and the existing segments it is tested against.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_004_split_roads_that_cross_each_other_not_only_those_drawn_onto.md` after implementation.

# Validation
- (no validation recorded yet)
- command: `npm run ci; npm run test:visual; node scripts/with-dev-server.mjs scripts/shot.mjs /tmp/city-jump-city.png city` | result: passed | date: 2026-08-29
- Finish workflow executed on 2026-08-29.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-29.
- Linked backlog item(s): `item_013_split_roads_that_cross_each_other_not_only_those_drawn_onto`
- Related request(s): `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`

# Links
- Request: `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
