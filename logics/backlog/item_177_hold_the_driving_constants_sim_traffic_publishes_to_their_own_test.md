## item_177_hold_the_driving_constants_sim_traffic_publishes_to_their_own_test - Hold the driving constants sim traffic publishes to their own test
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:06:32
> Owner: Claude

# AI Context
- Summary: sim/traffic.ts is the one simulation module no colocated test reaches, and it is pure.
- Keywords: traffic, driving constants, car gap, stop setback, turn rate, step clamp
- Use when: adding or reading the traffic invariant test, or changing a driving constant.
- Skip when: moving driving logic between layers - adr_006 gates that on these tests existing, not on doing both at once.

# Problem
- `src/sim/traffic.ts` is 386 lines and the only `src/sim/` module without a colocated test; it is observed only through `src/render/traffic.test.ts` and `src/render/trafficMovers.ts`.
- It imports neither Babylon nor the DOM, so nothing structural prevents a direct test. CONTRIBUTING.md already asks for the narrowest test proving changed simulation behaviour.
- The module is what performance work reopens most often, which is exactly where an untested pure module costs the most.

# Scope
- In:
  - A colocated `src/sim/traffic.test.ts` building its graph in the test, as `src/sim/graph.test.ts` does.
  - Properties rather than trajectories: the `CAR_GAP` two queued cars keep, a red stopping a bumper at `CAR_STOP_SETBACK` from the line rather than a centre, a step longer than `MAX_STEP_S` being clamped, and a heading turning no faster than `CAR_TURN_RATE`.
  - Assertions that read the exported constant rather than a copied literal, so tuning a pace does not falsify the test.
- Out:
  - Changing any driving behaviour, constant or pace.
  - Moving driving logic between layers; ADR 006 makes that conditional on these tests existing, not simultaneous with them.
  - Pedestrian crossing and ring geometry beyond what the four properties above touch.

# Acceptance criteria
- AC1: `src/sim/traffic.test.ts` exists and passes under `npm test`.
- AC2: Each of the four properties fails when the behaviour stops honouring its constant, verified by a deliberate local break before the test is accepted.
- AC3: Changing the numeric value of a tested constant alone leaves the suite green.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `src/sim/traffic.test.ts` exists and passes under `npm test`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Corrected premise. The request said sim/traffic.ts had no test. What was true: sixteen of the seventeen cases in src/render/traffic.test.ts were pure simulation assertions on sim/traffic exports, and only one needed a scene - so the module was well covered, but its tests were filed under render/ behind a Babylon NullEngine they never used, which is why the simulation layer looked untested from the outside. Implemented accordingly: the sixteen moved to src/sim/traffic.test.ts and run with no Babylon import, render/traffic.test.ts keeps the one renderer case, and the constants those cases turned on (CAR_GAP, CAR_STOP_SETBACK) are now written against the exported constant instead of the literal 8.5 or 71.5 they had become. Genuinely untested and now covered: MAX_STEP_S and CAR_TURN_RATE, honoured only inside the mover system's frame callback in src/render/trafficMovers.ts. They are tested there, where they run, rather than moved into sim - adr_006 gates that move on tests existing first, and this slice's scope excludes it.

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: High
- Rationale: The last exception to a boundary the whole architecture is built on, in the module performance work reopens most often. High on exposure: nothing is broken, but a change here is currently observed only through a renderer.
