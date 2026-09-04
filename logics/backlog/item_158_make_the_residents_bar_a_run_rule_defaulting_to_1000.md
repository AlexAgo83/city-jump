## item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000 - Make the residents bar a run rule, defaulting to 1000
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 22:23:14

# AI Context
- Summary: The wave trigger factor is hardcoded at 180. It becomes a RunRules field defaulting to 1000 -- saved with the city, validated on the way in, and threaded into sim as a parameter rather than left in module state.
- Keywords: RunRules field, readRun numeric validation, optional parameter idiom, terrain global anti-pattern, Gameplay row
- Use when: adding a gameplay value the player sets, or passing a number into sim/.
- Skip when: a mutable module global or a setWaveFactor installer, UiSettings as the home, and bumping SAVE_VERSION.

# Problem
- `waveAtPopulation(wave) = 180 * Math.max(1, wave)` (src/sim/wave.ts:20-22) is the only wave trigger in the game -- there is no timer -- and the factor is hardcoded. The operator wants 1000 and a control for it.
- `RunRules` (src/sim/run.ts:35-44) is the right home: it travels inside the save via `readRun` (src/sim/save.ts:211-227), it is shown in the toolbar's Gameplay row (index.html:347-362), and `setRunRules` (src/ui/runPanel.ts:84-86) already changes rules live mid-run. `UiSettings` is per-browser and is not saved with the city, so a factor kept there would mean a shared city is played at the receiver's bar.
- `readRun` validates all five current rules as `rules.X === true`, which has no shape for a number. A factor needs finiteness, a floor and a ceiling, and a missing value must default the way the booleans do so old saves stay loadable -- SAVE_VERSION is 13 and there is no migration hook.
- A mutable module-level global is the wrong carrier. That is the src/sim/terrain.ts pattern req_039 recorded as invisible to every architecture rule: import-direction tests cannot see state coupling, and a missed setter fails silently.

# Scope
- In:
  - The factor as a `RunRules` field, defaulting to 1000, saved with the city and validated on the way in.
  - Threading it into the simulation as an optional parameter, the idiom already used by `advanceKaijuAssault`'s `speed`, `batteriesForParcels`' `wasStaffed` and `startingMoney`'s `base`.
  - The four call sites: `residentsUntilWave` and `summonIfDue` (src/sim/wave.ts), the waiting banner (src/app/app.ts:572), and the harness (src/sim/playthrough.ts:201).
  - A control in the Gameplay row, alongside the rules it belongs with.
- Out:
  - A mutable module-level global or a `setWaveFactor`-style installer.
  - Putting the factor in `UiSettings`.
  - The linear shape of the bar; only its factor becomes a setting.
  - Bumping SAVE_VERSION or adding a migration hook.

# Acceptance criteria
- A new run's bar is 1000 residents for wave 1, and 1000 per wave thereafter.
- The player can change the factor, and the change is visible in the waiting banner without a reload.
- The factor is saved with the city and comes back with it.
- A save with no factor loads at the default; one with a nonsense factor is refused or clamped, not replayed.
- The simulation receives the factor as an argument, and nothing in sim/ holds it as module state.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: A new run's bar is 1000 residents for wave 1, and 1000 per wave thereafter.
- request-AC2 -> This backlog slice. Proof: The player can change the factor, and the change is visible in the waiting banner without a reload.
- request-AC3 -> This backlog slice. Proof: The factor is saved with the city and comes back with it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)
- Request: `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`
- Primary task(s): `task_045_orchestrate_the_residents_bar_and_spawn_path_work`

# Priority
- Priority: High
- Rationale: What the operator asked for, and the largest single change in the chain: one number that is the only wave trigger and also feeds the threat.

# Notes
- 2026-09-04, codex: added `RunRules.residentsPerWave` defaulting to 1000, saved and validated through `readRun`, threaded into app/sim wave checks, and surfaced as the Gameplay `Residents/wave` input. Targeted Playwright proved 1000 default, live 180 banner update, autosave, and reload.
- Task `task_045_orchestrate_the_residents_bar_and_spawn_path_work` was finished via `logics-manager flow finish task` on 2026-09-04.

# Tasks
- `task_045_orchestrate_the_residents_bar_and_spawn_path_work`
