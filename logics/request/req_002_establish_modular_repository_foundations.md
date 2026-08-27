## req_002_establish_modular_repository_foundations - Establish modular repository foundations
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-27 11:19:38

# AI Context
- Summary: Establish the repository presentation, source boundaries, tests, CI, and
  product corpus before feature work expands the prototype.
- Keywords: repository, modularity, architecture tests, CI, README, product corpus
- Use when: Changing project structure, validation commands, contribution policy, or the
  Logics product foundation.
- Skip when: Implementing one isolated simulation or rendering behavior inside an existing
  boundary.

# Needs
- Contributors need an explicit source layout before road, zoning, traffic, and economy
  code begin to depend on one another.
- The repository needs the same public presentation and collaboration surfaces as the
  maintainer's other projects: product README, security policy, contribution rules,
  versioned changelogs, licence, and continuous validation.
- Product intent, durable architecture decisions, functional contracts, and version
  sequencing need to live beside delivery workflow rather than in chat history.

# Context
- The prototype already separates pure `src/sim/` logic from Babylon rendering, but
  `src/main.ts` owns composition and all DOM listeners.
- Vitest covers simulation and Playwright drives the running browser; no new framework or
  dependency is required to enforce module direction.
- The existing product brief is settled but contains stale request-scaffold boilerplate,
  and there is no roadmap, ADR, spec, repository policy, or CI surface.

# Acceptance criteria
- AC1: The repository presents version 0.1.0 with a factual README and real screenshot,
  MIT licence, contribution and security policies, and a matching versioned changelog.
- AC2: `main.ts` is only a bootstrap; `src/app/`, `src/ui/`, `src/sim/`, and `src/render/`
  have explicit ownership, and a runnable architecture test rejects forbidden imports.
- AC3: One documented CI command runs unit, architecture, build, and Logics gates; GitHub
  CI also runs the browser interaction check, and the product corpus contains a roadmap,
  settled decisions, functional specs, and this completed chain.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)

# References
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `tests/architecture.mjs`
- `.github/workflows/ci.yml`

# Backlog
- `item_008_establish_modular_repository_foundations`
