## item_141_pin_third_party_actions_the_same_way_in_every_workflow - Pin third-party actions the same way in every workflow
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 82%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: ci.yml pins actions/checkout@v4 while render-release-deploy.yml pins it by SHA, and the architecture test asserts the SHA pin only on the workflow that was already correct.
- Keywords: action pinning, SHA pin, workflow directory, supply chain, architecture assertion
- Use when: adding a workflow or a third-party action.
- Skip when: dependency update bots, or changing what either workflow runs or when it triggers.

# Problem
- .github/workflows/ci.yml uses actions/checkout@v4; .github/workflows/render-release-deploy.yml pins the same action by SHA.
- tests/architecture.mjs asserts the SHA pin on the deploy workflow only, so the test enforces the stricter posture on the file that was already correct and says nothing about the other.

# Scope
- In:
  - One pinning posture across both workflows.
  - An architecture assertion that covers every file in .github/workflows, not one named path.
- Out:
  - Adding a dependency update bot.
  - Changing what either workflow runs or when it triggers.

# Acceptance criteria
- Every third-party action in .github/workflows is pinned the same way.
- The architecture test enumerates the workflow directory rather than asserting against one named workflow.
- Adding a new workflow with an unpinned action fails the test.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: Every third-party action in .github/workflows is pinned the same way.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: Medium
- Rationale: One repo should not hold two opinions on how far an action is trusted, but nothing is exploitable while both pins resolve.

# Validation
- 2026-09-04: Pinned every third-party action in .github/workflows by SHA and added an architecture test that enumerates all workflow files. Validated with rtk npm run test:architecture and rtk npm run check:versions.
