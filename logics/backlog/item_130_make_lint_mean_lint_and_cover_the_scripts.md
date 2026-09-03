## item_130_make_lint_mean_lint_and_cover_the_scripts - Make lint mean lint, and cover the scripts
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: A real linter would have caught the two discarded ringEntryRadius assignments and the unused u at rules.ts:196. scripts/interact.mjs is 2121 lines of e2e suite with no static analysis at all.
- Keywords: lint alias, Biome, tsconfig include, noUnusedLocals, engines.node, script coverage
- Use when: adopting a linter or formatter, or changing tsconfig strictness.
- Skip when: reformatting the repo in the same commit as adopting the tool, or exactOptionalPropertyTypes.

# Problem
- package.json:20 makes lint an alias for typecheck, so nothing checks style, unused code or common-error patterns. It would have caught the two discarded ringEntryRadius assignments in traffic.ts and the unused u at src/sim/rules.ts:196.
- tsconfig.json:11 includes only src, so scripts/ and tests/ are unchecked. scripts/interact.mjs is 2121 lines -- the e2e suite -- with no static analysis at all.
- tsconfig is strong where it counts (strict and noUncheckedIndexedAccess) but omits noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch and verbatimModuleSyntax.
- package.json declares no engines.node, so the Node baseline is prose in CONTRIBUTING.md:21 and a .nvmrc that only CI reads.

# Scope
- In:
  - One linter and formatter over src, scripts and tests, wired into the ci script.
  - Add the four tsconfig flags; leave exactOptionalPropertyTypes out as too disruptive to retrofit.
  - Add engines.node so npm and Render both see the contract.
  - Fix what the linter finds in one pass, separately from adopting it.
- Out:
  - Reformatting the whole repo in the same commit as adopting the tool.
  - exactOptionalPropertyTypes.
  - Type-checking the .mjs scripts as TypeScript.

# Acceptance criteria
- AC1: npm run lint runs a real linter over src, scripts and tests.
- AC2: The ci script fails on a lint error.
- AC3: The four tsconfig flags are on and the tree is clean under them.
- AC4: engines.node states the baseline.
- AC5: Adoption and the resulting fixes are separable in the history.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: npm run lint runs a real linter over src, scripts and tests.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave 2: commit `82b27fe` added Biome linting over `src`, `scripts`, and `tests`; `npm run ci` now runs `npm run lint`; `npm run format` is available without formatting the repo in this commit.
- 2026-09-03 wave 2: `tsconfig.json` now enables `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax`; `package.json` declares `engines.node >=22`.
- 2026-09-03 wave 2: commit `17204a9` fixed the resulting unused-code and Biome error findings. Biome still reports warnings, but exits 0 and fails on errors.
- 2026-09-03 validation: `rtk npm run ci` passed with Biome lint, 40 Vitest files / 306 tests, 12 architecture tests, scenarios, build/typecheck, Logics lint/audit, and i18n validation.
