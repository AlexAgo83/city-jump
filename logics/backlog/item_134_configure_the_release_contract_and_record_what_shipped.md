## item_134_configure_the_release_contract_and_record_what_shipped - Configure the release contract and record what shipped
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 85%
> Confidence: 80%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `logics-manager release status` answers not_configured, so the contract Logics expects for release readiness has never existed -- while three versions have been tagged and deployed. This chain hardens the release path without it.
- Keywords: release contract, release discover, release evidence, readiness, not_configured
- Use when: preparing a release, or claiming a version is ready to ship.
- Skip when: hardening the deploy workflow itself, which item_119 and item_120 own.

# Problem
- `logics-manager release status` reports `Release state: not_configured`, `Configured: no`, `Target version: <unknown>`, and names its own next action: run `release discover --write`, then review and promote `logics/release/contract.draft.json` to `logics/release/contract.json`.
- LOGICS.md instructs contributors to run `release status` before claiming release readiness and to record proof with `release evidence add`, and adds that neither conversation memory nor a passing command counts as proof without matching evidence. None of that is possible while the contract is absent.
- Three versions have been tagged and deployed regardless -- v0.2.0, v0.3.0 and v0.4.0 -- so releases work through the GitHub workflow while the Logics side of the same process records nothing.
- req_038 hardens the deploy path end to end and never mentions this, which is the gap: the mechanism was reviewed, the contract that is supposed to describe it was not.

# Scope
- In:
  - Run `release discover --write`, review the draft rather than accepting it unread, and promote it to `logics/release/contract.json`.
  - Record evidence for the 0.4.0 release that already shipped, so the contract starts describing reality rather than an empty state.
  - Note in CONTRIBUTING.md that a release runs through `release plan` and `release validate`, if that is what the promoted contract says.
- Out:
  - Changing the GitHub release workflow, which item_119 and item_120 own.
  - Automating the version bump.
  - Inventing release gates the project does not already run.

# Acceptance criteria
- AC1: `logics-manager release status` reports a configured contract.
- AC2: `logics-manager release validate` passes for the shipped 0.4.0.
- AC3: Evidence for 0.4.0 is recorded rather than asserted.
- AC4: The contract describes gates the project actually runs, not aspirational ones.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: Medium
- Rationale: A contract that describes nothing cannot block a bad release, but no release is currently blocked on it either.

# Tasks
- `task_040_orchestrate_the_release_and_client_hardening`

# Notes
- Found by running the diagnostics LOGICS.md prescribes, which the 0.4.0 review had not run.
