## req_004_harden_project_reliability_gates_and_demo_evidence - Harden project reliability gates and demo evidence
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:25:30

# AI Context
- Summary: Scope the review findings into reliability work: make browser checks part of the normal gate, make screenshot scenarios strict, remove the traffic per-car segment scan, and refresh README evidence.
- Keywords: project reliability, browser gate, visual capture, debug API, traffic lookup, README evidence
- Use when: implementing validation hardening or documentation evidence from the project review findings.
- Skip when: working on road-crossing graph behavior, gameplay features, or rendering polish unrelated to validation evidence.

# Needs
- The current green local gate does not prove the browser path. `npm run ci` excludes `test:e2e` and `test:visual`, so pointer input, Babylon picking, and screenshot generation can regress while the authoritative command still passes.
- The debug road builders used by screenshots can fail silently. `DebugApi.road(...)` returns `false`, but `demoNetwork()` and `demoCity()` ignore the result, so a capture can lose required avenues, tunnels, streets, or junctions and still exit successfully.
- Traffic resolves its segment by scanning every graph segment for every car on every frame. That is acceptable for the tiny prototype, but it scales as cars times roads and will become the easiest avoidable runtime cost as demo sizes grow.
- README feature status and measured figures are stale after recent tunnel, terrain, and capture work. Documentation should match the current app and should name how any performance figure was measured.

# Context
- This request is derived from `req_003_review_findings_project_reliability`; it scopes those review findings into ready-to-dev slices.
- `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto` already owns mid-segment road crossing behavior and is deliberately out of scope here.
- Review evidence: `rtk npm run ci` passed on 2026-08-28, with unit tests, architecture tests, build/typecheck, and Logics validation green.
- Gate evidence: `package.json` defines `ci` without `test:e2e` or `test:visual`, while `scripts/interact.mjs` states it exists because screenshots do not test picking.
- Capture evidence: `src/render/debugApi.ts` exposes `road(...)` as a boolean but the demo methods currently ignore that boolean.
- Runtime evidence: `src/render/traffic.ts` stores `segmentId` on each car and resolves it with `graph.allSegments().find(...)` during `scene.registerBeforeRender`.
- Documentation evidence: `README.md` still says tunnels are not implemented, despite e2e coverage and rendering support for tunnel roads and portals.

# Acceptance criteria
- AC1: A single validation command starts or reuses a dev-server safely and runs the browser interaction check, so pointer input and Babylon picking cannot regress outside the normal gate.
- AC2: Visual capture scripts exit non-zero when a named scenario drops below explicit counts for required roads, avenues, tunnels, junctions, buildings, or rendered meshes.
- AC3: Demo builders fail loudly when a required debug road is refused, and the failure message names the road label/type that did not build.
- AC4: Traffic frame updates resolve segment references without scanning the full segment list once per car per frame.
- AC5: README feature status and measured scenario figures match current behavior, and any performance figure names the command and scenario that produced it.
- AC6: The existing road-crossing draft request remains separate and is not widened by this reliability work.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_002_reliable_prototype_validation_and_evidence`
- Architecture decision(s): (none yet)

# References
- logics/request/req_003_review_findings_project_reliability.md
- package.json
- scripts/interact.mjs
- scripts/shot.mjs
- src/render/debugApi.ts
- src/render/traffic.ts
- README.md

# Backlog
- `item_009_include_browser_interaction_in_the_normal_validation_gate`
- `item_010_make_demo_and_screenshot_scenarios_fail_loudly`
- `item_011_avoid_per_car_full_graph_scans_in_traffic_updates`
- `item_012_refresh_readme_feature_status_and_measured_evidence`
