## item_179_derive_the_csp_hashes_from_index_html_instead_of_transcribing_them - Derive the CSP hashes from index.html instead of transcribing them
> From version: 0.5.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 38%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 13:58:42

# AI Context
- Summary: The two CSP digests in render.yaml are transcribed by hand; a test catches a stale one but nothing produces the correct value.
- Keywords: csp, sha256 digest, render.yaml, inline style, gate tooling
- Use when: editing the inline script or style of index.html, or the content security policy header.
- Skip when: changing the policy directives themselves, or moving the inline blocks out of index.html.

# Problem
- The two SHA-256 digests in `render.yaml:39` are typed in by hand.
- `tests/architecture.mjs` recomputes them from `index.html` and asserts they match, so a stale header cannot ship - but nothing produces the correct value, so the loop is edit, fail, compute by hand, retry.
- The inline style is 261 lines against a 4-line script: the one that changes is the one whose hash is forgotten.

# Scope
- In:
  - A script that extracts the inline script and style from `index.html` with the same extraction the architecture test uses, computes both base64 SHA-256 digests, and rewrites the Content-Security-Policy value in `render.yaml`.
  - An npm script entry point for it.
  - A CONTRIBUTING.md line pointing at it from the inline-markup editing path.
- Out:
  - Changing the policy itself - the directives, the sources or the removal of an inline block.
  - Replacing the existing architecture assertion, which stays the gate.
  - Moving the inline script or style out of `index.html`.

# Acceptance criteria
- AC1: Running the command after an inline-style edit leaves the architecture test green with no manual editing of `render.yaml`.
- AC2: The script and the architecture test derive their digests from the same extraction, so neither can be right while the other is wrong.
- AC3: The script fails loudly if an expected inline block is missing rather than writing an empty digest.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Running the command after an inline-style edit leaves the architecture test green with no manual editing of `render.yaml`.

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
- Rationale: The gate already cannot let a stale header ship, so this is friction rather than exposure: the loop today is edit, fail, compute by hand, retry. Medium because the inline style is 261 lines and is the block that actually changes.
