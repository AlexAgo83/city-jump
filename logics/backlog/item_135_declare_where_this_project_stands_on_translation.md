## item_135_declare_where_this_project_stands_on_translation - Declare where this project stands on translation
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 45%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: Decided by the owner: English is the source locale and further languages come later, so the contract is initialised as applicable rather than not-applicable. The remaining work is extraction -- the catalogue exists and is empty while every string is still inline.
- Keywords: i18n contract, source locale en, catalogue extraction, src/i18n/en.json, inline strings
- Use when: adding or restructuring any user-facing string.
- Skip when: the change touches no player-visible text.

# Problem
- `logics-manager i18n status` reported `absent` -- neither initialised nor declared not-applicable -- on a game whose entire interface is authored English. That was the one answer LOGICS.md does not allow.
- Now decided and initialised: `applicability: applicable`, `source_locale: en`, catalogue at `src/i18n/{locale}.json`. English is the default and further languages are expected later, so the structure is in place rather than deferred until a translation is actually wanted.
- What is not done is the part that costs something. `src/i18n/en.json` is `{}` and every string is still inline: labels, tooltips, alerts and banners live in index.html's markup and in `src/ui/`. `logics-manager i18n status` reads valid because an empty catalogue is consistent, not because the copy has moved.
- So the contract now describes an intention the code does not yet meet, and the next contributor adding a string still has no rule telling them where to put it. That is the gap this slice closes.

# Scope
- In:
  - Extract user-facing strings into `src/i18n/en.json` under semantic keys, starting with what `src/ui/` owns rather than attempting index.html's markup in the same pass.
  - A lookup at the UI boundary, small enough not to become a framework -- LOGICS.md forbids introducing one without a measured need and a decision.
  - Note in CONTRIBUTING.md that a new user-facing string goes in the catalogue, and that `i18n validate` is part of the local gate.
  - Add `i18n validate` to the `logics:validate` script so the contract cannot drift unnoticed.
- Out:
  - Translating anything, or adding a second locale. The decision is English first, others later.
  - A locale switcher in the interface.
  - Extracting index.html's static markup, unless the UI pass proves it cheap -- 220 lines of accessible markup is a separate job.
  - Changing any wording.

# Acceptance criteria
- AC1: `logics-manager i18n validate` passes with a catalogue that is no longer empty.
- AC2: Every string `src/ui/` renders comes from the catalogue rather than a literal.
- AC3: `i18n validate` runs as part of the local gate.
- AC4: CONTRIBUTING.md says where a new user-facing string goes.
- AC5: No wording visible to a player changes.

# Decision framing
- Product framing: Settled by the owner -- English source locale, further languages later
- Architecture framing: Not needed, provided the lookup stays a lookup

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Low
- Rationale: The contract is in place so nothing is blocked; the extraction is real work with no caller waiting for it.

# Tasks
- `task_041_orchestrate_the_structural_work`

# Notes
- The contract was initialised through `logics-manager i18n init --source-locale en`, not by hand.
- Nothing broke: `tsc` and the architecture tests both pass with `src/i18n/en.json` present.
