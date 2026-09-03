## item_099_cut_a_segment_as_many_times_as_one_road_crosses_it - Cut a segment as many times as one road crosses it
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Reproduced: a quadratic street with control (0,0,240) crossed at z=60 throws `unknown segment: 1` after the first split has committed. The trap is that returning ok:false here moves the partial mutation instead of removing it.
- Keywords: allCrossings, splitSegment, nearestOnSegment, partial mutation, segment id zero, minLength
- Use when: touching commitSegment, allCrossings or splitSegment in src/sim/rules.ts and src/sim/graph.ts.
- Skip when: solving Bezier intersections exactly, or carrying a distance across a split arithmetically -- both are explicitly out.

# Problem
- allCrossings returns one entry per intersection without deduping by segment, and splitSegment deletes what it cuts, so the second crossing on one segment throws out of commitSegment with the first split already committed.
- lastSegment is initialised to 0 (src/sim/rules.ts:139), so a commit where every crossing snapped to an existing node returns {ok:true, segmentId:0} while ids start at 1.

# Scope
- In:
  - Re-locate a crossing whose recorded segment id is gone, using graph.nearestOnSegment, filtering tunnels as allCrossings does.
  - Drop a crossing that cannot be served rather than aborting after mutation; snap it to the node an earlier cut made when the remaining piece is shorter than RULES.minLength.
  - Replace the parallel nodes and ts arrays with one list of pairs, so dropping a crossing cannot misalign the sub-curve controls.
  - Return {ok:false} with a reason when no segment was added, instead of segment id 0.
  - A regression test for the reproduced geometry: street (-60,0) to (60,0) control (0,0,240), crossed by a straight road at z=60, expecting five segments.
  - A regression test that no success ever carries an id the graph does not have.
- Out:
  - Exact Bezier root finding in place of the sampled search at src/sim/rules.ts:170.
  - Carrying distances across a split arithmetically.
  - Changing how splitSegment samples its halves.

# Acceptance criteria
- AC1: One straight road crossing one curved segment twice produces five segments and no throw.
- AC2: No path through commitSegment mutates the graph and then reports failure.
- AC3: Three or more crossings on one segment behave the same as two.
- AC4: commitSegment never returns a segment id the graph cannot resolve.
- AC5: The single-crossing behaviour covered by existing tests in src/sim/rules.test.ts is unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: One straight road crossing one curved segment twice produces five segments and no throw.
- request-AC2 -> This backlog slice. Proof: AC2: No path through commitSegment mutates the graph and then reports failure.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Primary task(s): `task_037_orchestrate_the_0_4_0_correctness_fixes`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
