## item_116_build_the_yield_and_crossing_occupancy_once_per_frame - Build the yield and crossing occupancy once per frame
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: roundaboutRooms already walks the movers once per frame, which is where the index belongs. The discarded ringEntryRadius is resolved and it is NOT dead code: it looks like a missing lane comparison, which would make it a correctness defect for req_035 rather than a cleanup here.
- Keywords: stopFor, roundaboutYieldBlocked, flatMap allocation, occupancy index, ringEntryRadius
- Use when: touching traffic yielding, crossing occupancy or the mover loop's allocation cost.
- Skip when: changing right-of-way rules, moving driving logic to sim, which req_039 owns, or adding a spatial index.

# Problem
- stopFor (src/render/traffic.ts:1042) is called per non-walking mover per frame and calls roundaboutYieldBlocked, which flatMaps over all movers twice at :1063 and :1068. arrive repeats those two at :1133, and crossingOccupiedByWalker scans all movers again at :1244. With a few hundred movers this is the frame loop's dominant allocation source.
- roundaboutRooms at :1456 already walks the movers once per frame, which is where a shared occupancy index belongs.
- src/render/traffic.ts:1061 and :1131 each compute an unused ringEntryRadius. Archaeology done, and the answer is not `delete it`.
- The identical expression at :1298 (ringTransfer) IS used, feeding ringJoinPath and ringSweep -- so the value is the entering car's ring-lane radius, and it is meaningful.
- roundaboutEntryBlocked (:179) takes only (entry, occupied) and has no lane parameter. Its gap test multiplies the angular gap by `radius` taken from each OCCUPYING car's ride. And `occupied` is built from every mover on the ring node regardless of lane. So today a car on the outer ring lane blocks an entry to the inner lane and the reverse.
- The entering car's radius being computed and dropped at exactly the two yield decisions is evidence that a same-lane comparison was intended and lost. If so, roundabout right-of-way has been wrong, which is a defect for req_035 and not a performance cleanup.

# Scope
- In:
  - Build a per-roundabout occupancy index and a crossing-walker index once per frame and pass them into stopFor and arrive.
  - Decide whether ring lanes should block each other. If they should not, this is a defect: raise it against req_035 and give roundaboutEntryBlocked the entering lane, rather than fixing it quietly inside a performance change.
  - Keep the hot path allocation-free, as the file already is.
- Out:
  - Changing the yielding or right-of-way rules.
  - Moving the driving logic into sim, which req_039 owns.
  - Adding a spatial index.

# Acceptance criteria
- AC1: Yielding and crossing occupancy each derive their index once per frame.
- AC2: No new per-frame allocation is introduced in the mover loop.
- AC3: Existing traffic behaviour coverage stays green and e2e traffic movement still passes.
- AC4: Whether ring lanes block each other is decided and recorded; if they should not, the fix is raised against req_035 rather than landed here.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Yielding and crossing occupancy each derive their index once per frame.
- request-AC7 -> This backlog slice. Proof: AC2: No new per-frame allocation is introduced in the mover loop.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
