## item_111_fail_the_gate_when_a_shipped_document_misstates_the_version - Fail the gate when a shipped document misstates the version
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 13:14:27

# AI Context
- Summary: Not cosmetic: the release workflow hard-fails unless the tag matches package.json, so following the blueprint's v0.2.0 produces a failed deploy. SECURITY.md declares the shipping line unsupported.
- Keywords: version drift, badge, supported versions, blueprint tag, check-versions script
- Use when: changing the version, or after a release, or reading a document that states one.
- Skip when: automating the release bump itself or restructuring the changelog convention.

# Problem
- README.md:7 states 0.2.0, SECURITY.md:9 declares 0.2.x supported and the shipping 0.4.x line unsupported, and docs/static-site-blueprint.md:8 states version 0.2.0 and tag v0.2.0.
- Following the blueprint produces a failed deploy, because .github/workflows/render-release-deploy.yml:55 requires the tag to match package.json.
- Two releases have passed without these being updated, so a third manual correction would not hold.

# Scope
- In:
  - Correct the three documents.
  - A scripts/check-versions.mjs that reads package.json and fails when a shipped document disagrees, wired into the ci script.
  - Cover README.md's badge, SECURITY.md's supported table and the blueprint's version and tag lines.
- Out:
  - Automating the release version bump itself.
  - Restructuring the changelog convention.

# Acceptance criteria
- AC1: The three documents agree with package.json.
- AC2: Editing package.json's version without the documents fails the local gate.
- AC3: The check names each disagreeing file and the value it found.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: The three documents agree with package.json.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Primary task(s): `task_038_orchestrate_the_verification_gates`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
