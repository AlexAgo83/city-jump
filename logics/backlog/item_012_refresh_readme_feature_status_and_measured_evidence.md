## item_012_refresh_readme_feature_status_and_measured_evidence - Refresh README feature status and measured evidence
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:25:30

# AI Context
- Summary: Refresh README current-state text and measured scenario figures so tunnels, validation commands, and performance evidence match the current prototype.
- Keywords: README drift, tunnel status, validation docs, performance figure, measured scenario
- Use when: updating repository documentation after reliability and tunnel/capture changes.
- Skip when: writing release notes, marketing copy, or new gameplay documentation.

# Problem
- The README says tunnels are not implemented even though tunnel roads and portals now exist.
- The README cites a largest checked scenario without tying it to a current command/output, so it can drift silently.

# Scope
- In:
  - Update the current-state and non-goal text for tunnels, terrain, captures, and validation commands.
  - Re-run the current measurement command before changing the performance figure, or remove the specific figure if it cannot be reproduced cheaply.
  - Name the command and scenario used for any retained measured figure.
- Out:
  - Marketing copy rewrite.
  - New screenshots beyond those needed to keep existing docs accurate.
  - Release notes or version bump.

# Acceptance criteria
- AC1: README no longer claims tunnels are absent while tunnel roads and portals are present.
- AC2: Validation instructions include the browser path needed for user-facing input/rendering work.
- AC3: Any frame-rate or scenario-size number in README is tied to a command and current output, or is removed.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: README no longer claims tunnels are absent while tunnel roads and portals are present.

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

# Tasks
- `task_003_implement_project_reliability_hardening`

# Notes
- Task `task_003_implement_project_reliability_hardening` was finished via `logics-manager flow finish task` on 2026-08-29.
