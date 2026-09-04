## item_161_settle_the_two_loose_ends_in_the_assault_code - Settle the two loose ends in the assault code
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 22:12:44

# AI Context
- Summary: destructionRadiusM is declared and used nowhere. And advanceKaijuAssault's loop can destroy two buildings in one call while `destroyed` holds one -- latent at the shipped 0.25 s step, but the comment invites the large ticks that would expose it.
- Keywords: destructionRadiusM unused, destroyed overwritten, large tick drain, contract narrowing, combat step
- Use when: changing the assault loop or auditing WAVE_STARTING_VALUES.
- Skip when: adding collateral damage as a feature unless that is what the constant turns out to mean, and changing the 0.25 s step.

# Problem
- `destructionRadiusM: 25` (src/sim/wave.ts:8) is declared and used nowhere in src/. Destruction is one named building at a time with no radius, so the constant is either an unwritten feature or a leftover.
- `advanceKaijuAssault` (src/sim/kaiju.ts:56-86) can destroy more than one building in a single call, but `destroyed` is one `Vec3` overwritten each iteration, and both callers handle one per tick (src/app/app.ts:614, src/sim/playthrough.ts:313). The comment at src/sim/kaiju.ts:66 invites large ticks: "tests and future callers are not all locked to the 0.25 s combat step."
- It is latent rather than live -- both callers step at 0.25 s (src/sim/playthrough.ts:84) and a building takes 5 s to fall -- but the signature promises a drain the return type cannot report.

# Scope
- In:
  - Either give `destructionRadiusM` a use or remove it, and say which at the declaration.
  - Either report every building destroyed in a call, or narrow the contract so a tick that could destroy two cannot be asked for -- and record which was chosen.
  - A test that would fail if a large tick silently dropped a destruction.
- Out:
  - Adding collateral damage as a feature, unless that is what giving the constant a use turns out to mean.
  - Changing the 0.25 s combat step in either caller.
  - The attack duration or the targeting order.

# Acceptance criteria
- No constant in WAVE_STARTING_VALUES is unused.
- A tick long enough to destroy two buildings either reports both or is refused, and a test covers it.
- The comment at src/sim/kaiju.ts:66 matches what the function actually guarantees.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: No constant in WAVE_STARTING_VALUES is unused.
- request-AC7 -> This backlog slice. Proof: A tick long enough to destroy two buildings either reports both or is refused, and a test covers it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)
- Request: `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`
- Primary task(s): `task_045_orchestrate_the_residents_bar_and_spawn_path_work`

# Priority
- Priority: Low
- Rationale: Neither is live: one constant does nothing and one drain cannot be triggered at the shipped step. Gathered under ADR 030 and taken last.
