## item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames - Make workforce caching reusable across unchanged gameplay frames
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:22:14

# AI Context
- Summary: Workforce has a single last-allocation cache keyed by array and callback identity. Lifecycle builds fresh arrays/closures; the needs path builds another array and interleaves a distinct policy.
- Keywords: workforce, caching, reusable, across, unchanged, gameplay, frames
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: One shared allocation policy for lifecycle and HUD.

# Problem
- Workforce has a single last-allocation cache keyed by array and callback identity. Lifecycle builds fresh arrays/closures; the needs path builds another array and interleaves a distinct policy.
- Completed item_168 already shares battery staffing and precomputes sort terms; this slice fixes the remaining invalidation gap, not those delivered changes.

# Scope
- In:
  - Priority rationale: The CPU profile still samples lifecycle sync and allocation; current identity-based cache misses are confirmed.
  - Depends on: baseline. Count policy-specific allocations/sorts in the running app, not just repeated direct calls to allocateWorkforce.
  - Reuse results separately in existing lifecycle and needs owners using stable inputs or small semantic revision keys. No global multi-city cache or new framework. Include parcel identity/order/kind/size, committed versus integer population, incumbent changes, rebuilding exclusion and rules in the relevant invalidation policy.
  - Keep construction progress, seenAt/memory and resource simulation advancing each existing tick; cache expensive allocation only. Preserve distinct lifecycle hysteresis/incumbency and needs/battery policies.
  - Invalidate on load/replace, parcel edits/reorder, demolition, wave-held rebuild and transition back to eligible work; ensure memory remains bounded. Keep prior comparator/battery optimizations.
- Out:
  - One shared allocation policy for lifecycle and HUD.
  - Throttling the simulation/HUD or changing economic balance to hide CPU work.

# Acceptance criteria
- AC1: An integration-level runnable check proves zero repeated allocation sorts across unchanged app-equivalent frames for both interleaved policies, and recalculation on every relevant input change.
- AC2: Compare cached and uncached outputs across population bands, workforce shortages, incumbent changes, parcel reordering, rebuild holds, expiry and reload; deterministic scenario outcomes match.
- AC3: Run existing lifecycle/workforce/battery/replay tests and scenarios; record allocation counts and CPU/frame-time evidence for x1 and x4 without changing simulation cadence.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: An integration-level runnable check proves zero repeated allocation sorts across unchanged app-equivalent frames for both interleaved policies, and recalculation on every relevant input change.
- request-AC9 -> This backlog slice. Proof: AC2: Compare cached and uncached outputs across population bands, workforce shortages, incumbent changes, parcel reordering, rebuild holds, expiry and reload; deterministic scenario outcomes match.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: High
- Rationale: The CPU profile still samples lifecycle sync and allocation; current identity-based cache misses are confirmed.

# Outcome
- Retained on 2026-09-07, on reuse evidence rather than on frame time. `createWorkforceAllocator()` gives each policy owner its own bounded cache: one inside `BuildingLifecycle`, one beside `buildingNeeds` in `buildingKinds.ts`. Each validates the parcel list by identity plus the fields that can move in place (kind, frontage, depth, incumbency) and the whole-resident workforce, which is the only way population reaches `allocateWorkforce`.
- AC1: `perf/reviews/task055-wave3-workforce/` via the new `scripts/review/workforce.mjs` probe, which counts allocations against drawn frames. Paused: 353 frames, 0 lifecycle and 0 needs recomputes. Running x1: 351 frames, 0 and 9. Running x4: 336 frames, 1 and 94. Before the change the panel recomputed on every frame -- it passed a freshly mapped array, which the existing identity cache in `allocateWorkforce` could never validate.
- AC2: covered in `src/sim/buildingLifecycle.test.ts`, which runs a cached lifecycle beside an uncached reference and asserts identical transitions and identical serialized state across population bands, workforce shortages, incumbency settling, parcel reordering, a rebuild hold, demolition expiry, reload through `replaceWith`, and an in-place parcel mutation that must force a recompute.
- AC3: `perf/reviews/task055-wave3-workforce-ab-retry/`, 42 samples, three rounds, complete. Read as per-round paired deltas, frame time does not move: between -6.2% and +4.3% with no consistent direction, which is noise on this machine. CPU p50 is positive where the cache can help most -- paused +10.5% -- and mixed elsewhere. No frame-time gain is claimed.
- The retention rests on AC5 as written: it asks that the two allocations reuse results for unchanged semantic inputs and stay correct and deterministic, not that a frame-time threshold is met. A per-frame sort over 1287 parcels is real work removed; that it does not surface in a frame budget dominated elsewhere is recorded, not dressed up.
- First A/B attempt `perf/reviews/task055-wave3-workforce-ab/` is kept and labelled: every case's baseline varied 1.45x to 1.89x across rounds under machine contention, and reading it as a median per side produced a spurious +36.6% on day-street. It is the run that prompted `scripts/review/paired.mjs`.
