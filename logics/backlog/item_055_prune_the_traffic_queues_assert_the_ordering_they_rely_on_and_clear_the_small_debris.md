## item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris - Prune the traffic queues, assert the ordering they rely on, and clear the small debris
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:42:38

# AI Context
- Summary: Four small ones: `leaveQueue` never deletes emptied lane entries, the lane-order invariant the frame loop depends on is only a comment, the share button awaits `encodeShare` unguarded so a browser without `CompressionStream` fails silently, and the buildable-cell centroid is written three times.
- Keywords: prune, traffic, queues, assert, ordering, they, rely, clear, small, debris
- Use when: Working on queue bookkeeping in `src/render/traffic.ts`, the share button in `src/ui/controls.ts`, or `zoneForCell`/centroid duplication in `src/sim/slots.ts`.
- Skip when: The work reworks the car-following model, the queue data structure, or the share-link format and its size limits.

# Problem
- The traffic renderer moved queue bookkeeping out of the frame loop: `queues` is now a persistent `Map` keyed by lane, maintained by `joinQueue` and `leaveQueue` in `src/render/traffic.ts` (around line 997). `leaveQueue` splices a mover out of its array but never removes the map entry when the array empties, so lanes that no longer carry anyone accumulate as empty arrays and the frame loop iterates them forever.
- That same change replaced a per-frame sort with the claim, stated only in a comment, that queue membership changes solely when a mover boards or leaves a lane, so the stored order stays correct. It is true today because car-following prevents overtaking within a lane, but nothing asserts it, and if it ever stops holding, the `ahead` chain is wrong silently -- cars pass through each other rather than crashing.
- The share button handler in `src/ui/controls.ts` awaits `encodeShare` with no `try`/`catch`. `encodeShare` uses `CompressionStream`, which older Safari does not implement, so on those browsers the click produces an unhandled rejection and no feedback -- the one path in that file that does not report a refusal.
- `zoneForCell` in `src/sim/slots.ts` is close to dead: `cellsForBlock` already stamps `cell.zone` using the identical centroid formula, so `origin.zone ?? zoneForCell(zones, origin)` only reaches the fallback when cells were built without zones and parcels were solved with them. That same four-corner centroid is written out three times -- twice in `src/sim/slots.ts` and once as `cellCentre` in `src/app/app.ts`.

# Scope
- In:
  - Delete the map entry in `leaveQueue` when the queue it drained is empty, and confirm no other collection in the traffic renderer grows without bound over a long session.
  - Add an assertion to `src/render/traffic.test.ts` that pins the lane-ordering invariant: after a sequence of boards and leaves, each queue is still ordered by progress along the lane. Keep it in the existing test file and style -- no new framework.
  - Wrap the share handler's async work so a browser without `CompressionStream` gets the same refusal treatment every other failure in that file gets. Check `decodeShare` on the import path for the same exposure.
  - Give the buildable-cell centroid one home -- exported from `src/sim/slots.ts` alongside the cell type -- and have `cellsForBlock`, `zoneForCell` and `app.ts`'s `cellCentre` all use it.
  - Decide `zoneForCell`'s fate on evidence: if the fallback is genuinely unreachable, remove it and the `??`; if it is reachable, say when, in a comment.
- Out:
  - Reworking the car-following model or the queue data structure.
  - Changing the share-link format or its size limits.
  - Broader deduplication across the renderers.

# Acceptance criteria
- AC1: Emptied lane queues are removed from the map, and a test covers a mover joining and then leaving a lane.
- AC2: The lane-ordering invariant is asserted by a test in `src/render/traffic.test.ts`.
- AC3: A share attempt on a browser without `CompressionStream` produces a refusal message, not an unhandled rejection.
- AC4: The buildable-cell centroid exists once, and `zoneForCell` is either removed or documented as to when it is reached.
- AC5: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Emptied lane queues are removed from the map, and a test covers a mover joining and then leaving a lane.
- request-AC7 -> This backlog slice. Proof: AC2: The lane-ordering invariant is asserted by a test in `src/render/traffic.test.ts`.
- request-AC8 -> This backlog slice. Proof: AC3: A share attempt on a browser without `CompressionStream` produces a refusal message, not an unhandled rejection.
- request-AC9 -> This backlog slice. Proof: AC4: The buildable-cell centroid exists once, and `zoneForCell` is either removed or documented as to when it is reached.
- request-AC10 -> This backlog slice. Proof: AC5: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)
- Request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
- Primary task(s): `task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
