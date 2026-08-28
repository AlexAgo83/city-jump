## item_011_avoid_per_car_full_graph_scans_in_traffic_updates - Avoid per-car full graph scans in traffic updates
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-28 16:27:15

# AI Context
- Summary: Replace the per-frame `graph.allSegments().find(...)` traffic lookup with a stored segment reference or O(1) lookup prepared during traffic rebuild.
- Keywords: traffic performance, per-frame loop, segment lookup, graph scan, cars
- Use when: touching `src/render/traffic.ts` runtime update cost.
- Skip when: implementing pathfinding, lanes, traffic rules, or graph spatial indexing.

# Problem
- Every traffic frame resolves each car's `segmentId` through `graph.allSegments().find(...)`, making frame work scale as cars times roads.

# Scope
- In:
  - Store the segment reference or a segment lookup map when traffic is rebuilt.
  - Keep traffic rebuilding derived from the graph, as it is today.
  - Add a focused check or code-level evidence that the per-frame loop no longer calls `graph.allSegments().find(...)` per car.
- Out:
  - Traffic pathfinding, lane logic, or simulation behavior.
  - Spatial indexing for the road graph.
  - Performance micro-benchmarking beyond verifying the measured demo remains smooth.

# Acceptance criteria
- AC1: The per-frame traffic loop reads a stored segment reference or O(1) lookup rather than scanning all segments for each car.
- AC2: Traffic still disappears safely if its segment is removed after rebuild boundaries change.
- AC3: Existing e2e traffic movement coverage remains green.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The per-frame traffic loop reads a stored segment reference or O(1) lookup rather than scanning all segments for each car.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_002_reliable_prototype_validation_and_evidence`
- Architecture decision(s): (none yet)
- Request: `req_004_harden_project_reliability_gates_and_demo_evidence`
- Primary task(s): `task_003_implement_project_reliability_hardening`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
