## item_189_restore_automatic_building_detail_with_a_manual_boxes_override - Restore automatic building detail with a manual boxes override
> From version: 0.5.2
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:22:14

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
