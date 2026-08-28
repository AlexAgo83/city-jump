## item_009_include_browser_interaction_in_the_normal_validation_gate - Include browser interaction in the normal validation gate
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-28 16:27:15

# AI Context
- Summary: Add a local validation path that runs the existing browser interaction script with a managed Vite server, then include it in the normal readiness gate.
- Keywords: browser validation, e2e, Vite server, ci gate, pointer input, Babylon picking
- Use when: making `npm run ci` or another readiness command prove the real browser interaction path.
- Skip when: changing the interaction assertions themselves or adding unrelated visual screenshot checks.

# Problem
- `npm run ci` is treated as the local gate but does not run the browser interaction check.
- `scripts/interact.mjs` covers pointer input and Babylon picking, which unit tests and visual screenshots do not prove.

# Scope
- In:
  - Add the smallest script path that runs a dev server and `scripts/interact.mjs` together, with cleanup when the check exits.
  - Wire that browser interaction check into the normal validation path used before claims of readiness.
  - Keep the existing standalone `test:e2e` command usable against an already running server.
- Out:
  - Adding a new browser test framework.
  - Running visual screenshots in every unit-only workflow unless explicitly chosen.
  - Changing the interaction assertions themselves except where needed for orchestration.

# Acceptance criteria
- AC1: A clean checkout can run one validation command without manually starting Vite first, and it executes the browser interaction check.
- AC2: The command exits non-zero if the dev server fails, the browser check fails, or the browser check times out.
- AC3: The dev server process started by the command is stopped after success or failure.
- AC4: Existing direct use of `npm run test:e2e` against a running URL still works.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A clean checkout can run one validation command without manually starting Vite first, and it executes the browser interaction check.
- request-AC6 -> This backlog slice. Proof: AC2: The command exits non-zero if the dev server fails, the browser check fails, or the browser check times out.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_002_reliable_prototype_validation_and_evidence`
- Architecture decision(s): (none yet)
- Request: `req_004_harden_project_reliability_gates_and_demo_evidence`
- Primary task(s): `task_003_implement_project_reliability_hardening`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
