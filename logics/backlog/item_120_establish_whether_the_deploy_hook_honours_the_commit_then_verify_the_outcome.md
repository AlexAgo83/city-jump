## item_120_establish_whether_the_deploy_hook_honours_the_commit_then_verify_the_outcome - Establish whether the deploy hook honours the commit, then verify the outcome
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 20%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Proven against the live service, not just the docs: all three deploy_hook deploys landed exactly on the v0.2.0, v0.3.0 and v0.4.0 tag commits with autoDeploy off, so ?ref= is honoured. Two deploys in the same history are build_failed, so the 200-then-fail risk is real and has already happened here.
- Keywords: deploy hook, ref parameter, deploy verification, Render API, advisory checks, runbook
- Use when: before trusting the deploy workflow's verification, or changing how a release reaches production.
- Skip when: migrating off Render, or changing autoDeploy without a recorded decision.

# Problem
- The workflow does real diligence -- tag to SHA, version match, green CI on that SHA -- then POSTs the hook at :94 and exits on the 200. Nothing confirms the deploy then succeeded.
- Resolved empirically against service srv-da9n061srm7s73cpph80 (type static_site, autoDeploy off, branch main). The three deploy_hook deploys in its history carry commits 9d5d029a, 2d4c115b and b7f551cf, which are exactly the commits v0.2.0, v0.3.0 and v0.4.0 point at. With autoDeploy off and the branch tip ahead at those moments, the ref was honoured three times out of three.
- Production is currently b7f551cf, which is exactly v0.4.0. The release pipeline works end to end; it is only the outcome that goes unreported.
- The API returns `commit.id` per deploy, so a deployed commit can be asserted rather than assumed.
- What remains is narrower but real: a 200 says a deploy started, not that it finished. The service's own history contains two `build_failed` deploys, so a release reported as successful while its build failed is not hypothetical here.
- Deploy statuses observed on this service: `live`, `deactivated`, `canceled`, `build_failed`. Note that a successful deploy becomes `deactivated` once superseded, so a polling check must treat `live` as success now and `deactivated` as success historically -- not as a failure.

# Scope
- In:
  - Poll GET /v1/services/{id}/deploys after the hook is accepted, match the deploy carrying RELEASE_SHA, and fail the job unless it reaches `live`. Treat `build_failed` and `canceled` as failures and `deactivated` as an already-superseded success.
  - Read the API key from an untracked .env (see .env.example) or an Actions secret; never from a command line, a log or a workflow echo.
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
