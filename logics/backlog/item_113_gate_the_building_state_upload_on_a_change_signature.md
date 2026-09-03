## item_113_gate_the_building_state_upload_on_a_change_signature - Gate the building state upload on a change signature
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 14:57:57

# AI Context
- Summary: The single largest per-frame cost: about 40 Float32Arrays and a Matrix per building, every frame, to redraw buildings that did not move. The pattern to copy is decorKey, already in the same file.
- Keywords: updateStates, thin instance buffer, change signature, decorKey, distant boxes, model lookup
- Use when: touching the building state upload or per-frame render cost.
- Skip when: changing what a building looks like or when it is decorated.

# Problem
- src/app/app.ts:1047 calls buildings.updateStates on every drawn frame while the clock runs. updateStates (src/render/buildings.ts:483) allocates about 40 Float32Arrays and thousands of Matrix objects per frame to redraw buildings that did not move.
- The distant-box loop at src/render/buildings.ts:503 resolves its model with available.find(...) per status, which is O(parcels x models).
- The pattern to copy is already in the file: decorKey at src/render/buildings.ts:289.

# Scope
- In:
  - A cheap integer signature over each status's state, quantised progress and staffed flag; compare it and return early when unchanged.
  - Invalidate the signature from repackParcels and from each model finishing its load, so a rebuild still uploads.
  - Hoist the model lookup out of the distant loop into a map.
  - Keep the existing decorKey gate inside the body.
- Out:
  - Changing what a building looks like or when it is decorated.
  - Splitting buildings.ts, which req_039 owns.

# Acceptance criteria
- AC1: A settled city performs no thin-instance upload for buildings across successive frames.
- AC2: A construction stage advancing still updates within a frame of the change.
- AC3: A rebuild and a late-resolving model both refresh the buffers.
- AC4: The distant loop resolves its model in constant time per status.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A settled city performs no thin-instance upload for buildings across successive frames.
- request-AC2 -> This backlog slice. Proof: AC2: A construction stage advancing still updates within a frame of the change.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave: `buildings.updateStates` now returns early when a cheap status signature is unchanged. The signature covers parcel position/size, state, quantised progress, staffing, and idle reason because reason changes alter colours.
- The distant-box path now uses a `modelById` map instead of `available.find(...)` per status.
- Live probe proof: after the built demo settled at `101` buildings and all `28` models loaded, a repeated `setRunRules({ instantConstruction: true, freeBuilding: true })` produced zero building `thinInstanceSetBuffer` writes.
- Validation proof: `rtk npm exec -- vitest run src/render/buildings.test.ts && npm run typecheck` passed; `rtk npm run ci` passed.
- E2E note: `rtk npm run test:e2e` still fails at `scripts/interact.mjs:1021` waiting for the zone-clear click to reduce `stats().zones`; the same failure reproduces from comparison worktree `bd2ee98`, before this wave, so it is not caused by the building-state gate.
- Clean perf after proof: `npm run perf` on `6b63046` recorded `dirty:false`, `101 buildings`, `42 active meshes`, fps `overview=99`, `district=110`, `street=79`, `rebuild=436 ms`; deltas against `c9321ea` are inside known fps noise.
