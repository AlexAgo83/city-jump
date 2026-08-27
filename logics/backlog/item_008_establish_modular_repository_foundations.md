## item_008_establish_modular_repository_foundations - Establish modular repository foundations
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-27 11:19:39

# AI Context
- Summary: Deliver repository presentation, application/UI composition boundaries,
  executable architecture rules, CI, and initial product corpus as one foundation slice.
- Keywords: modularity, repository docs, architecture boundaries, CI, Logics corpus
- Use when: Reviewing why the source tree, validation scripts, and product documents were
  established together in version 0.1.0.
- Skip when: Scoping a gameplay feature that does not alter these foundations.

# Problem
The prototype works, but its composition, repository contract, and product memory are not
yet strong enough to support several parallel gameplay systems without drift.

# Scope
- In:
  - Repository README, policies, licence, changelog convention, version metadata, and an
    actual browser capture.
  - `app` and `ui` extraction with `sim` and `render` dependency direction enforced by a
    native Node test.
  - Normalized test/build/Logics scripts and GitHub CI including Playwright interaction.
  - Product brief correction, versioned roadmap, architecture decisions, functional specs,
    assistant bridges, and a validated context pack.
- Out:
  - New gameplay behavior, a generic application framework, ESLint, a dependency-injection
    container, release automation, and publishing configuration before a remote exists.

# Acceptance criteria
- AC1: Repository and source boundaries are documented, executable, and verified without
  adding a runtime or tooling dependency.
- AC2: The product corpus describes current behavior and future milestones, passes doctor,
  lint, audit, product consistency, and roadmap validation, and leaves only the existing
  crossing-road request open.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: bounded delivery slice.
- request-AC2 -> This backlog slice. Proof: promotable backlog item.
- request-AC3 -> This backlog slice. Proof: delivery chain includes a task-ready backlog item.

# Decision framing
- Product framing: Reuse and correct
  `prod_001_a_city_that_grows_from_the_roads_you_draw`.
- Architecture framing: Required for graph ownership, layer direction, and derived-view
  rebuild behavior.

# Links
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
- Request: `req_002_establish_modular_repository_foundations`
- Primary task(s): `task_002_establish_modular_repository_foundations`

# Priority
- Priority: High
- Rationale: Establish these contracts before additional simulation systems multiply the
  number of dependencies and contributors must unwind.

# Notes
- Delivered in four focused repository waves: documentation, composition, validation, and
  product corpus.
- Task `task_002_establish_modular_repository_foundations` was finished via `logics-manager flow finish task` on 2026-08-27.

# Tasks
- `task_002_establish_modular_repository_foundations`
