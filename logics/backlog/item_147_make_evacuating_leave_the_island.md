## item_147_make_evacuating_leave_the_island - Make evacuating leave the island
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-05 00:22:22

# AI Context
- Summary: Evacuating banks the science, ends the run and tells the player to start a new one. The new island is a second click on a button hidden until the run ends, so one decision costs two confirmations.
- Keywords: evacuate, new island, between-runs panel, prestige upgrades, carryScience, run exit
- Use when: changing how a run ends or how the next one starts.
- Skip when: carryScience and the prestige arithmetic, which are correct, and the population-zero and defeat endings.

# Problem
- src/app/app.ts:774-782 banks the science, autosaves, ends the run and says "Start a new run when you are ready." It does not start one.
- The new island is a second click on `#new-run` (index.html:481), hidden inside `#between-runs` until the run has ended, so the player confirms twice -- "Evacuate this run?", then "Leave for a new island?" -- to do one thing.
- The between-runs panel is also where prestige is spent, so evacuating straight onto a new island would skip the shop the science was just banked for.

# Scope
- In:
  - Evacuating ends on a new island with the science banked.
  - A decision about where the upgrade step lives once the two are joined, and the upgrade step still being reachable there.
  - One confirmation for one decision.
- Out:
  - `carryScience` and the prestige arithmetic (src/sim/run.ts:73-75), which are correct.
  - The population-zero and defeat endings, which are not what was asked for.
  - Removing the ability to look at the upgrade web between runs.

# Acceptance criteria
- Evacuating leaves the player on a fresh island with the run's science added to prestige.
- The prestige upgrades are reachable at the point they are meant to be spent, and the flow through them is recorded.
- Evacuating asks for confirmation once.
- A new island opened this way carries no state from the run that just ended -- no banner, no wave, no latch.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: Evacuating leaves the player on a fresh island with the run's science added to prestige.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: Medium
- Rationale: A real friction in the run loop, but it waits on a decision about where prestige is spent, which is design work not repair.

# Validation
- 2026-09-04: Evacuation now banks science, opens a fresh island immediately, keeps the prestige web reachable there, hides the second new-run confirmation, and autosaves the fresh island. Updated the interaction checks for evacuation, share-link startup, and debug forced waves. Validation passed with `rtk npm run typecheck`, `rtk npm exec -- vitest run src/ui/controls.test.ts src/ui/runPanel.test.ts src/sim/kaiju.test.ts`, `rtk npm run test:e2e`, and `rtk npm run ci`.

# Tasks
- `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Notes
- Task `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work` was finished via `logics-manager flow finish task` on 2026-09-05.
