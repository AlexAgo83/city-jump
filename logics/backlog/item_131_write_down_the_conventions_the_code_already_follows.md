## item_131_write_down_the_conventions_the_code_already_follows - Write down the conventions the code already follows
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: 42 ponytail comments encode deliberate simplifications with their revision condition and the word appears in no document. Separately, the asset test's deepEqual actively forbids a manifest entry for the four hand-authored models.
- Keywords: ponytail convention, CONTRIBUTING, deepEqual assertion, hand-authored models, gitignore
- Use when: documenting a convention, or trying to declare roof geometry for tower, block, house or shop.
- Skip when: changing what ponytail comments say, regenerating a GLB, or changing the roof format.

# Problem
- 42 ponytail: comments mark deliberate simplifications with the condition that would justify replacing them -- a good practice, documented in neither CONTRIBUTING.md, README.md nor docs/. A new contributor cannot infer it.
- tests/building-assets.mjs:46 uses deepEqual, so it forbids a manifest entry for tower.glb, block.glb, house.glb and shop.glb; declaring a roof for a tower would break the test, and those four ship unvalidated. docs/assets.md:29 describes the runtime fallback they rely on, which is accurate but does not say the test depends on their absence.
- .gitignore does not cover .claude/, which is only excluded through .git/info/exclude on one machine.

# Scope
- In:
  - Document the ponytail convention in CONTRIBUTING.md: a deliberate simplification with its revision condition, not a TODO.
  - Change the manifest assertion from equality to inclusion, so a hand-authored model may declare a roof, and extend the height checks to the four hand-authored models.
  - Note in docs/assets.md which models rely on the fallback and why.
  - Add .claude/ to .gitignore.
- Out:
  - Changing what ponytail comments say.
  - Regenerating any GLB.
  - Changing the roof geometry format.

# Acceptance criteria
- AC1: CONTRIBUTING.md defines the ponytail convention.
- AC2: A manifest entry for a hand-authored model does not fail the asset test.
- AC3: The four hand-authored models are height-checked or their exemption is recorded.
- AC4: .claude/ is ignored for every contributor.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: CONTRIBUTING.md defines the ponytail convention.
- request-AC9 -> This backlog slice. Proof: AC2: A manifest entry for a hand-authored model does not fail the asset test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.
