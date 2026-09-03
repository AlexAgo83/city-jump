## item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome - Establish whether the deploy hook honours the commit, then verify the outcome
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Answered from Render's docs: ?ref=<sha> is supported, and a 200 means the SHA was valid and a deploy has started. So the upstream checks are NOT advisory and only the outcome is unverified -- a build that fails after the 200 is reported as success.
- Keywords: deploy hook, ref parameter, deploy verification, Render API, advisory checks, runbook
- Use when: before trusting the deploy workflow's verification, or changing how a release reaches production.
- Skip when: migrating off Render, or changing autoDeploy without a recorded decision.

# Problem
- The workflow does real diligence -- tag to SHA, version match, green CI on that SHA -- then POSTs the hook at :94 and exits on the 200. Nothing confirms the deploy then succeeded.
- Resolved from Render's documentation: the deploy hook accepts a `ref` query parameter naming a full or short commit SHA, and returns 200 OK when that SHA is valid and a deploy has started. No static-site exclusion is documented. The commit selection therefore works, and the three upstream checks are load-bearing rather than advisory.
- What remains unverified is narrower: a 200 says a deploy started, not that it finished. A build that fails after the hook is accepted is still reported to the operator as a successful release.

# Scope
- In:
  - Poll the deploy after the hook is accepted and fail the job unless it reaches a succeeded state; the commit itself no longer needs re-verifying, since a 200 already means the SHA was valid.
  - Confirm once against a real deploy that a static site behaves as documented, since the docs do not call static sites out either way.
  - Record the polling interval and timeout at the step, so a slow build is not read as a failed one.
  - Consider a runbook in logics/runbook/ if the procedure turns out to be worth repeating.
- Out:
  - Migrating off Render.
  - Changing autoDeploy or the branch configuration without a recorded decision.

# Acceptance criteria
- AC1: A deploy that starts and then fails does not report success to the operator.
- AC2: A deploy that succeeds is reported with the commit it built.
- AC3: The polling timeout is explicit, and a slow build is distinguishable from a failed one.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The behaviour of ?ref= for this deploy hook is established and recorded, whichever way it falls.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_a_release_that_proves_it_shipped_and_a_link_that_cannot_write_to_the_page`
- Architecture decision(s): (none yet)
- Request: `req_038_harden_the_release_path_and_the_shared_link_surface`
- Primary task(s): `task_040_orchestrate_the_release_and_client_hardening`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
