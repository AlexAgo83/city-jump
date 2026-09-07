## item_189_restore_automatic_building_detail_with_a_manual_boxes_override - Restore automatic building detail with a manual boxes override
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 18:53:55

# AI Context
- Summary: Buildings.setDistant is called only by the manual checkbox; the documented 1100 m automatic switch no longer exists.
- Keywords: restore, automatic, building, detail, manual, boxes, override
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Per-building distance buffer rewrites every frame.

# Problem
- Buildings.setDistant is called only by the manual checkbox; the documented 1100 m automatic switch no longer exists.
- Visibility setters and detail culler both enable meshes, so automatic transitions must not undo zoning/traffic views or decoration settings.

# Scope
- In:
  - Priority rationale: Simplified building geometry already exists, so automatic detail needs no new assets.
  - Depends on: benchmark baseline. Reuse distant boxes and existing buffers; initially switch the whole city to boxes above radius 1100 and back to models below 1000, then tune against the actual upper camera limit and saved framings.
  - Unchecked force-boxes means automatic detail, checked means boxes at any radius. Keep the persisted setting compatible; update its accessible label/help through the existing i18n contract. Preserve every current show-buildings, decor, draw, zoning, state and traffic-view policy.
  - Centralize effective building/decor visibility in the existing renderer rather than adding a competing per-frame scene scan. Apply after asynchronous model arrivals, rebuilds, state updates and load.
  - Invalidate shadow maps when effective detail/caster geometry changes; maintain construction state, color, footprint, picking and building identity. No new asset loads or buffer rewrites solely for crossing the global threshold.
- Out:
  - Per-building distance buffer rewrites every frame.
  - Deleting the manual override or changing saved city state.

# Acceptance criteria
- AC1: Threshold oscillation does not flicker; manual override, visibility/tool combinations and async/rebuild paths have focused coverage.
- AC2: Near, far and transition captures preserve colors, construction, selection and shadows. Zooming back never leaves stale boxes or missing models.
- AC3: Paired far-view and moving-camera measurements meet the retention rule; record selected thresholds and exact shipped behavior.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Threshold oscillation does not flicker; manual override, visibility/tool combinations and async/rebuild paths have focused coverage.
- request-AC9 -> This backlog slice. Proof: AC2: Near, far and transition captures preserve colors, construction, selection and shadows. Zooming back never leaves stale boxes or missing models.

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
- Rationale: Simplified building geometry already exists, so automatic detail needs no new assets.

# Outcome
- Retained on 2026-09-07. Boxes above camera radius 1100 m, models again only below 1000 m; the manual checkbox composes as `forced || automatic` through a single `applyDistance()` in the buildings renderer, which also resets the shadow-map refresh counter when the effective geometry changes.
- Measurement: `perf/reviews/task055-wave2-detail/`, 48 samples, eight scenarios, three rounds, complete. Frame p50 night-overview +28.2% (17.00 -> 12.20 ms), day-overview +15.5% (11.00 -> 9.30 ms). Every scenario below the threshold is flat within noise and shows an unchanged active-mesh count, which is the control the thresholds are supposed to give.
- AC1: `nextDistantDetail` is pure and covered by five focused checks in `src/render/buildings.test.ts` -- the walk up and back down, no flicker between the thresholds in either direction, the override at any height, no automatic latch hidden behind the checkbox, and re-derivation after a rebuild.
- AC2: `scripts/review/detail.mjs` is a new review probe that walks near -> far -> back and asserts what it captures: models near, boxes far, boxes surviving between the thresholds on the way down, every model restored with no stale boxes on return, the override winning close in and releasing cleanly, boxes still drawn after a rebuild far out, shadow casters present at both details, and no page errors. Captures in `docs/media/detail-*.png`.
- AC3 and the shipped thresholds: the camera's real upper limit is 1200 m (`src/render/scene.ts`), so the automatic band is 1100-1200 m -- the top of the zoom, which is where both measured wins are. A lower pair was tried and rejected on sight, not on frame time: at 950 m the boxes lose towers, roof colours and farm rows that are still legible as models (`docs/media/detail-950-models-rejected-threshold.png` against `detail-950-boxes-rejected-threshold.png`).
- Known trade, recorded rather than smoothed over: even at 1200 m the swap is visible. `docs/media/detail-1200-models-before.png` is the shipped-before skyline and `detail-far-boxes.png` the same framing after; state and construction colours carry over intact, but tower silhouettes flatten. This is the same trade the manual override always offered, now taken automatically at the top of the zoom in exchange for 15-28% frame time.
- Reverses a deliberate earlier decision, recorded here so it is not rediscovered by accident. Commit `6d390f3` (2026-09-03) removed this same automatic swap on purpose: "Past 1100 m the city swapped itself for coloured boxes, which took the city away from anyone who wanted to look at it from above." Two e2e assertions in `scripts/interact.mjs` guarded that decision and failed when this slice landed; they were rewritten to the new contract rather than deleted, with both commits named in the comment above them.
- What that earlier decision wanted and this slice does not give back: there is no "never boxes" state. Unchecked is automatic and checked is always-boxes, which is exactly what this slice specifies, but it leaves a player who wants to study the city from above in full models without a way to ask for it. Recorded as a follow-up candidate, not silently dropped.

# Tasks
- `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Notes
- Task `task_055_deliver_and_validate_the_distance_aware_performance_slices` was finished via `logics-manager flow finish task` on 2026-09-07.
