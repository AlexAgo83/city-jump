## item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone - Run the CI gate once per push, and from a clean clone
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 20%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 13:14:27

# AI Context
- Summary: Two identical runs per push on a repo that has a product brief about respecting the Actions budget, and npm run ci -- the documented pre-PR gate -- fails on a clean clone because logics-manager is an undocumented global install.
- Keywords: push trigger, concurrency, devDependency, clean clone, timeout-minutes, Actions budget
- Use when: touching .github/workflows/ci.yml or reproducing the gate locally.
- Skip when: SHA-pinning the deploy workflow, which req_038 owns, or adding browser suites.

# Problem
- .github/workflows/ci.yml:3 has on: push with no branches filter plus on: pull_request, so every push to a pull request branch triggers two identical runs. The repo has a product brief named prod_003_ci_that_respects_a_limited_actions_budget.
- There is no concurrency group, so superseded runs keep going; render-release-deploy.yml:17 already has the pattern to copy.
- ci.yml:20 installs @grifhinz/logics-manager globally, uncached, and it is not in devDependencies. npm run ci -- which CONTRIBUTING.md:31 presents as the gate to run before a pull request -- therefore fails on a clean clone, and neither CONTRIBUTING.md nor LOGICS.md documents the global install.
- Neither job sets timeout-minutes.

# Scope
- In:
  - Restrict the push trigger to main and add a concurrency group.
  - Move @grifhinz/logics-manager into devDependencies so npm ci provides it and the cache covers it.
  - Add timeout-minutes to both jobs.
  - Verify npm ci followed by npm run ci passes on a fresh clone.
- Out:
  - Pinning actions to SHAs, which req_038 owns for the deploy workflow.
  - Adding the browser suites to CI.

# Acceptance criteria
- AC1: A push to a pull request branch triggers one CI run.
- AC2: A superseded run is cancelled.
- AC3: npm ci then npm run ci passes on a clean clone with no global install.
- AC4: Both jobs have a timeout.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A push to a pull request branch triggers one CI run.
- request-AC7 -> This backlog slice. Proof: AC2: A superseded run is cancelled.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Primary task(s): `task_038_orchestrate_the_verification_gates`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
