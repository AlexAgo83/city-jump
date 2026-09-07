## item_181_let_a_bot_move_the_pinned_action_shas_and_the_in_range_dependencies - Let a bot move the pinned action SHAs and the in-range dependencies
> From version: 0.5.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Nothing proposes to advance the SHA-pinned workflow actions, so a correct pinning discipline is turning into dormant dependency debt.
- Keywords: dependency bot, sha pinning, github actions, grouped updates, majors
- Use when: configuring dependency updates, or taking an in-range application update.
- Skip when: taking the vitest 5 major, unpinning an action, or enabling auto-merge.

# Problem
- `.github/` holds only `workflows/`; nothing proposes updates.
- Both workflows pin third-party actions to 40-character SHAs and an architecture test enforces it. That is the right posture, but a pinned SHA never advances by itself, so the discipline becomes dormant debt.
- In-range application dependencies are drifting and frozen by `npm ci`: Babylon 9.22.2 against 9.25.0, playwright 1.62.1 against 1.63.0, plus a vitest 5.0.0 major.

# Scope
- In:
  - A dependency bot configuration covering the github-actions and npm ecosystems on a weekly schedule.
  - Grouping minor and patch application updates into one proposal.
  - Excluding majors from the grouped proposal so they stay deliberate.
- Out:
  - Taking the vitest 5 major in this item.
  - Unpinning any action or relaxing the architecture assertion that enforces SHA pinning.
  - Auto-merge of any proposal; `npm run ci` and a human stay in the path.

# Acceptance criteria
- AC1: A bot configuration exists for both ecosystems and is accepted by the platform without a validation error.
- AC2: An action update it proposes keeps the 40-character SHA form, so the architecture assertion still passes.
- AC3: A major version update is not part of the grouped minor and patch proposal.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A bot configuration exists for both ecosystems and is accepted by the platform without a validation error.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: Medium
- Rationale: Independent of every other slice and cheap. Medium because the pinning it protects is already correct and enforced; what is missing is the thing that moves it.
