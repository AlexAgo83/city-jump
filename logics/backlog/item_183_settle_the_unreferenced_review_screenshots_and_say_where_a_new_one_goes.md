## item_183_settle_the_unreferenced_review_screenshots_and_say_where_a_new_one_goes - Settle the unreferenced review screenshots and say where a new one goes
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 14:21:03
> Owner: Claude

# AI Context
- Summary: docs/media is 22 MB and 14 of its files are referenced by no document; the rule for where a delivery capture goes is unwritten.
- Keywords: docs/media, repository weight, unreferenced images, screenshot rule, contributing
- Use when: adding a delivery screenshot, or deciding the fate of an unreferenced media file.
- Skip when: git-lfs, any history rewrite, or the generated building GLBs, which are correctly committed.

# Problem
- `docs/media/` is 22 MB over 35 files and drives repository weight far more than the generated models do; the pack is 25.21 MiB.
- 14 files are referenced by no document in the repository - README.md, `docs/`, `changelogs/` and `logics/` all checked. They are delivery-wave proof captures, added and never linked.
- Some may be cited from GitHub release notes, a reference outside the repository. Unwritten, that fact will not survive the next person who looks at an orphan file.
- Individual files reach 1.9 MB for images rendered at about 800 px wide.

# Scope
- In:
  - For each of the 14: link it from a document, record in `docs/` that it is cited from outside the repository, or delete it.
  - Resize the retained images to the width they are actually displayed at.
  - A CONTRIBUTING.md rule beside the existing screenshot request: where the file goes, at what size, and what happens when the wave closes.
- Out:
  - git-lfs, and any history rewrite. On existing history LFS shrinks nothing without one, and a rewrite would break every commit SHA the release evidence cites.
  - The generated GLBs under `public/buildings/` and `public/kaiju.glb`: Blender is not in CI, so committing them stays correct.
  - Removing any image the README or a changelog references.

# Acceptance criteria
- AC1: Every one of the 14 files is linked, recorded as externally cited, or deleted, with the disposition of each stated in the task evidence.
- AC2: No retained `docs/media/` image is materially larger than the width it is displayed at, and every document that references one still renders.
- AC3: CONTRIBUTING.md states where a delivery screenshot goes, at what size, and its fate at wave close.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: Every one of the 14 files is linked, recorded as externally cited, or deleted, with the disposition of each stated in the task evidence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- All 14 orphans retained and linked, none deleted. docs/media/README.md now indexes every capture in the directory with the commit and dated wave that added it, split into the 21 shown in documents and the 14 kept as evidence only, and says explicitly that some are cited from published GitHub release notes - a reference this repository cannot see - so an unlinked file must not be deleted for being unlinked. Attribution came from git log --diff-filter=A per file, so each row is a fact rather than a guess. AC2 on image sizing turned out to be based on a wrong premise and is satisfied as it stands: every capture measures between 390 px and 1440 px wide, which is right for content displayed at 800-900 px plus four deliberate mobile shots at 390 px. The weight is PNG encoding of dense 3D renders, inherent to what they show, not excessive dimensions - and rewriting the files could not shrink the repository anyway, only add a second copy of each to history. Nothing was resized. CONTRIBUTING.md now says where a capture goes, at what width, that it needs an index row, and to add the one that proves the change rather than the four around it.

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: Medium
- Rationale: The actual driver of repository weight, and it grows once per delivery wave. Medium because the disposition of the 14 orphans needs a human decision that only gets harder as the count rises.

# Tasks
- `task_053_orchestrate_the_0_5_1_review_findings`

# Notes
- Task `task_053_orchestrate_the_0_5_1_review_findings` was finished via `logics-manager flow finish task` on 2026-09-07.
