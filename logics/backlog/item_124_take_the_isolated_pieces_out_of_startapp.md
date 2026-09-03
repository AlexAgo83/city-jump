## item_124_take_the_isolated_pieces_out_of_startapp - Take the isolated pieces out of startApp
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: The missing module leaves fingerprints: the same 200-character parcelsForDemand expression appears at :140 and :213, and :1152 monkey-patches a debug surface that :1108 already built.
- Keywords: startApp, extraction order, closure over mutable locals, duplicated expression, debug surface
- Use when: splitting src/app/app.ts, after req_035 through req_038 are done.
- Skip when: introducing a framework or DI layer, which LOGICS.md forbids without an ADR, or starting while an earlier chain is open.

# Problem
- src/app/app.ts is one 1200-line function with about 60 closures over 40 mutable locals, and it is the highest-churn file in the repo at 143 commits with no test.
- The same parcelsForDemand(...).filter(...) expression appears at :140 and :213.
- :1152 monkey-patches window.cityjump after installDebugApi already ran at :1108.

# Scope
- In:
  - In dependency order, least entangled first: ui/runPanel.ts from :775-878, which is raw DOM wiring in the app layer; the debug surface, by passing it to installDebugApi instead of patching from outside; app/persistence.ts from :368-405 and :970-1032; app/waveLoop.ts from :451-660; app/cityRebuild.ts from :126-330 last, deduplicating the repeated expression.
  - One commit per extraction with npm run ci between each.
  - Behaviour unchanged: no existing test may need editing.
- Out:
  - Introducing a framework or DI layer, which LOGICS.md forbids without an ADR.
  - Changing what any extracted piece does.
  - Starting before req_035 through req_038 are done.

# Acceptance criteria
- AC1: startApp is composition, not implementation.
- AC2: The repeated demand expression exists once.
- AC3: window.cityjump is assembled in one place.
- AC4: Every pre-existing test passes unedited.
- AC5: npm run test:e2e passes after the persistence and wave extractions.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: startApp is composition, not implementation.

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

# Notes
- 2026-09-03 wave 3a: commit `61ea53f` moved the run-panel DOM binding, gameplay rule checkboxes, hardcore checkbox, prestige upgrade buttons, new-run button, evacuation button, and call-wave button into `src/ui/runPanel.ts`.
- 2026-09-03 wave 3a: `src/app/app.ts` still owns `runState`, `profile`, wave scheduling, city rebuild side effects, autosave, and player feedback; the extraction only moved DOM wiring.
- 2026-09-03 validation: `rtk npm run ci` passed. `rtk npm run test:e2e` passed the run-panel/gameplay checks before the existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3b: commit `5feceac` passes app-specific debug hooks through `installDebugApi(..., { extra })`; `src/app/app.ts` no longer reads `window.cityjump` back and patches it after install.
- 2026-09-03 validation: `rtk npm run ci` passed. `rtk npm run test:e2e` got past `window.cityjump.reset()` and failed later at the existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3c: commit `466a35d` moved camera snapshot/apply and the debounced autosave timer into `src/app/persistence.ts`; `startApp` still supplies the current city serialization closure.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed.
- 2026-09-03 wave 3d: commit `b3bfc69` started `src/app/waveLoop.ts` by moving repeated wave visual clearing, missile trail rebuild, `PendingMissile`, and `WaveVerdict` out of `src/app/app.ts`.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed. `rtk npm run test:e2e` reached the wave/persistence path and failed later at the existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3e: commit `4d310b5` moved the deterministic wave plan and camera framing calculation into `src/app/waveLoop.ts`; `startApp` still owns mutable wave state and rendering side effects.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed.
