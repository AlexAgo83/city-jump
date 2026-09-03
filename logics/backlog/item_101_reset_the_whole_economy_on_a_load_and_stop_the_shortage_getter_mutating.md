## item_101_reset_the_whole_economy_on_a_load_and_stop_the_shortage_getter_mutating - Reset the whole economy on a load, and stop the shortage getter mutating
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Two defects in one getter: it mutates on read, and it rewrites shortSince on every read while the stock is at zero, so the recovery window the comment describes can never elapse.
- Keywords: materialsShort, hysteresis, shortSince, starved, replaceWith, committed, staffed but idle
- Use when: touching the economy or lifecycle reset path, or a shortage that never clears.
- Skip when: changing MATERIALS_RECOVERY values or what a shortage does to production.

# Problem
- CityEconomy.replaceWith (src/sim/economy.ts:121) resets state only: housed, starved, shortSince and clock survive, so a load inherits the previous run's shortage latch and keeps counting its clock.
- materialsShort (src/sim/economy.ts:111) is a getter that writes starved and shortSince. Two reads in one frame can differ and a render-layer read extends the shortage.
- It also rewrites shortSince on every read while materials are at zero, so the MATERIALS_RECOVERY_SECONDS window can never elapse while the stock stays empty -- the hysteresis the comment describes does not work.
- BuildingLifecycle.replaceWith (src/sim/buildingLifecycle.ts:161) never resets committed, so the first sync after a load deals shifts against the previous city's population; it also collapses staffing to state === working, losing staffed-but-idle.

# Scope
- In:
  - Make materialsShort a pure read and move the transition into a private updateShortage called from advance, which owns the clock.
  - Set shortSince only on the transition into shortage, not on every read.
  - Have the constructor and replaceWith share one starting-state helper so the two cannot diverge.
  - Reset committed in BuildingLifecycle.replaceWith and keep staffed-but-idle distinct from working.
  - Tests: a load after a shortage reports no shortage; a shortage at a flat zero stock clears once the recovery window and buffer are met; the first sync after a load deals against the loaded population.
- Out:
  - Changing MATERIALS_RECOVERY or MATERIALS_RECOVERY_SECONDS values, which req_036 owns.
  - Changing what a shortage does to production.

# Acceptance criteria
- AC1: Reading materialsShort twice in a row cannot change its answer or any field.
- AC2: A shortage that begins at a flat zero stock clears once the recovery window has really elapsed.
- AC3: A loaded city reports no inherited shortage, housing flag, clock or committed population.
- AC4: A staffed building that is idle is not reported as working.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Reading materialsShort twice in a row cannot change its answer or any field.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Primary task(s): `task_037_orchestrate_the_0_4_0_correctness_fixes`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
