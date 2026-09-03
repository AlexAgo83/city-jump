## item_125_move_the_driving_logic_where_a_test_can_reach_it - Move the driving logic where a test can reach it
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The seam is already proven: eight pure functions are exported and unit-tested at traffic.ts:155-259. Moving the driving logic to sim also puts it under the architecture test that keeps sim browser-free.
- Keywords: traffic split, vehicleModels, sim/traffic, decorMeshes, traffic overlay rebuild
- Use when: splitting traffic.ts, buildings.ts or roadMesh.ts, after req_037 has finished with those hot paths.
- Skip when: changing driving, yielding or lane behaviour, or adding an abstraction over Babylon.

# Problem
- src/render/traffic.ts is 1644 lines holding three unrelated things: a vehicle catalogue and mesh assembly at :268-853 with no knowledge of driving, the driving simulation at :855-1568 which touches Babylon only to write mesh.position, and the actual renderer.
- The seam is already proven by the eight pure functions exported and unit-tested at :155-259.
- src/render/buildings.ts (1335 lines) and src/render/roadMesh.ts (1298) split the same way; roadMesh.ts:358 additionally rebuilds the whole city to toggle a debug overlay.

# Scope
- In:
  - render/vehicleModels.ts for the catalogue and prototypes.
  - sim/traffic.ts for the driving logic, with a thin render adapter, so the architecture test then keeps it browser-free.
  - render/decorMeshes.ts for the 300 lines of roof and foot decor at src/render/buildings.ts:614-916, and the already-exported placement maths into its own module.
  - Separate the Traffic-view overlays in roadMesh.ts so setShowTraffic stops triggering a full rebuild.
  - Do this after req_037, which touches the same traffic hot path.
- Out:
  - Changing driving, yielding or lane behaviour.
  - Changing what any mesh looks like.
  - Adding an abstraction layer over Babylon.

# Acceptance criteria
- AC1: The driving logic has unit tests that run without a browser.
- AC2: The architecture test covers it as simulation code.
- AC3: Toggling the traffic overlay does not rebuild the city.
- AC4: Existing traffic and building coverage passes unedited, and e2e stays green.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The driving logic has unit tests that run without a browser.
- request-AC2 -> This backlog slice. Proof: AC2: The architecture test covers it as simulation code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
