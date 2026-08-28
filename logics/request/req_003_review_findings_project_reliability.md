## req_003_review_findings_project_reliability - Review findings: project reliability
> From version: 0.1.0
> Schema version: 1.0
> Status: Obsolete
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 00:57:19

# AI Context
- Summary: Code review found several reliability and maintenance gaps that are not covered by the current green local gate: browser checks are outside `ci`, debug capture roads can fail silently, traffic does a per-car segment scan every frame, and README state is stale after tunnel and capture changes.
- Keywords: review, findings, project, reliability, browser validation, visual capture, debug API, traffic performance, README drift
- Use when: improving the project's validation gate, screenshot/demo reliability, runtime traffic cost, or README accuracy.
- Skip when: implementing the already-captured crossing-road behavior in `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`.

# Needs
- Browser-critical behavior should be represented in an automated gate. `npm run ci` currently runs unit tests, architecture tests, build, typecheck, lint, and Logics validation, but not `test:e2e` or `test:visual`; both browser checks are only listed as separate commands. This lets a commit pass `ci` while pointer input, Babylon picking, debug screenshots, or captured rendering are broken.
- Screenshot/demo generation should fail loudly when the requested scenario is not actually built. `DebugApi.road(...)` returns `false` when a road is refused, but `demoNetwork()` and `demoCity()` ignore every return value. The current `scripts/interact.mjs` rugged check only asserts that some road remains, so the screenshot scenario can silently drop avenues, tunnels, or local streets and still pass.
- Traffic lookup should avoid scanning all segments once per car per frame. `createTrafficRenderer` stores only `segmentId` per car, then each `beforeRender` loops over cars and calls `graph.allSegments().find(...)` for every one. That is fine for the prototype, but the README already claims a 237-road scenario; with several cars per segment, the current loop scales as cars times roads every frame.
- README state should be refreshed after recent feature work. It still says tunnels are not implemented, while the code and e2e test now include tunnel drawing and portal rendering. It also cites the largest checked scenario as 237 roads, 126 junctions, and 1,422 buildings, which should be reverified or removed if it is no longer the live measured scenario.

# Context
- Review started from a clean worktree on the main branch, ahead of origin/main by 27 commits.
- Existing corpus already captures the road-crossing graph gap in `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`; this review should not create a duplicate crossing request.
- Validation run during review: `rtk npm run ci` passed on 2026-08-28, with 5 Vitest files and 66 tests passing, 2 architecture tests passing, build/typecheck passing, and Logics lint/audit passing.
- Validation evidence: the `ci` script in `package.json` is `npm test && npm run test:architecture && npm run build && npm run logics:validate`, while `test:e2e` and `test:visual` are separate scripts.
- Browser check evidence: `scripts/interact.mjs` exists specifically because debug screenshots do not test picking, but it is not part of `ci`.
- Demo evidence: `src/render/debugApi.ts` line-level review shows `road(...)` returns `result.ok`, while `demoNetwork()` and `demoCity()` call it repeatedly without checking failure.
- Traffic evidence: `src/render/traffic.ts` line-level review shows `scene.registerBeforeRender` iterating cars and resolving each `segmentId` through `graph.allSegments().find(...)`.
- README drift evidence: `README.md` line-level review shows tunnels listed as not implemented and a performance figure that should be tied to a current command/output.

# Acceptance criteria
- AC1: A single command can run the browser interaction check in a fresh dev-server context, so pointer input and Babylon picking cannot regress while `ci` stays green.
- AC2: Visual capture scripts fail non-zero when a named scenario refuses required road types or drops below expected counts for avenues, tunnels, streets, and junctions.
- AC3: Traffic per-frame updates resolve segment references without scanning the full graph once per car, and the measured largest demo remains smooth.
- AC4: README feature status and measured scenario figures match current behavior and name the command used to produce the figures.
- AC5: This review request does not scope or duplicate the road-crossing behavior already captured by `req_001`.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `package.json`
- `scripts/interact.mjs`
- `scripts/shot.mjs`
- `src/render/debugApi.ts`
- `src/render/traffic.ts`
- `README.md`
- `logics/request/req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto.md`

# Backlog
- none

# Links
- Superseded by: `req_004_harden_project_reliability_gates_and_demo_evidence`
