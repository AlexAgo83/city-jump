## item_135_declare_where_this_project_stands_on_translation - Declare where this project stands on translation
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 85%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `logics-manager i18n status` answers absent -- neither initialised nor declared not-applicable -- on a game whose entire interface is authored English. LOGICS.md allows either answer but not silence.
- Keywords: i18n status, translation contract, source locale, not applicable, user-facing copy
- Use when: adding or restructuring any user-facing string.
- Skip when: the change touches no player-visible text.

# Problem
- `logics-manager i18n status` reports `i18n: absent`, with next action `i18n init --source-locale <locale>` for a project that owns user-facing copy.
- LOGICS.md says to run it before adding or restructuring user-facing copy, and that a project owning no such copy may explicitly initialise the contract as not applicable. This project owns a great deal: every label, tooltip, alert and banner in index.html and src/ui/ is authored English.
- So the current state is neither of the two answers the instruction allows. It is silence, and silence means the next contributor adding a string has no rule to follow.
- This is a decision about the product's reach, not a technical task. Initialising a source locale commits to a structure for every string; declaring not-applicable commits to English-only.

# Scope
- In:
  - Decide and record which of the two answers applies: a source locale, or an explicit not-applicable.
  - Initialise the contract accordingly with the CLI, not by hand.
  - If a source locale is chosen, run `i18n validate` and note in CONTRIBUTING.md what adding a string now requires.
- Out:
  - Actually translating anything.
  - Extracting existing strings into catalogues, unless the chosen answer requires it.
  - Changing any user-facing wording.

# Acceptance criteria
- AC1: `logics-manager i18n status` reports a configured contract, whichever answer was chosen.
- AC2: The choice and its reason are recorded where a contributor adding a string will meet them.
- AC3: If a source locale was chosen, `i18n validate` passes.

# Decision framing
- Product framing: Needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Low
- Rationale: Nothing is blocked, but the answer is cheap and its absence leaves a documented instruction unfollowable.

# Tasks
- `task_041_orchestrate_the_structural_work`

# Notes
- Reserved for the owner: which of the two answers applies is a product decision about reach, not a measurement.
