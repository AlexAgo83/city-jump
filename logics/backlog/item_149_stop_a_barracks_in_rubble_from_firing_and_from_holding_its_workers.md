## item_149_stop_a_barracks_in_rubble_from_firing_and_from_holding_its_workers - Stop a barracks in rubble from firing and from holding its workers
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:04:12

# AI Context
- Summary: Confirmed: batteries are built from every parcel while the kaiju targets only the ones standing, so a flattened barracks keeps firing -- and keeps the workers the survivors are being refused, because military is first in the workforce priority and rubble preserves its staffed flag.
- Keywords: rubble battery, currentParcels, livingBuildings, allocateWorkforce, PRIORITY military, wasStaffed, balance band
- Use when: changing what a destroyed lot still contributes, or how the workforce is dealt.
- Skip when: the PRIORITY order and the wasStaffed hint, which are not what is wrong, and retuning the wave to compensate.

# Problem
- Confirmed: src/app/app.ts:589 builds the batteries from `currentParcels`, while the kaiju targets `livingBuildings` -- statuses whose state is not "rebuilding" (src/app/app.ts:577). A destroyed lot moves to "rebuilding" (src/sim/buildingLifecycle.ts:101) but stays in `currentParcels`, and `batteriesForParcels` filters only on kind and staffing (src/sim/batteries.ts:19).
- It also keeps its shift. `allocateWorkforce` deals on kind, frontage and depth with no notion of building state, "military" is first in PRIORITY (src/sim/workforce.ts:14), and `BuildingLifecycle.rebuild` preserves the `staffed` flag (src/sim/buildingLifecycle.ts:101), which `wasStaffed` uses to keep the lot at the front of the queue.
- So a flattened barracks fires at the kaiju and simultaneously holds workers that the lots still standing are being refused.

# Scope
- In:
  - The batteries come from the lots that are standing -- the same list the kaiju already targets.
  - A lot in rubble demands no workforce.
  - Re-run npm run scenarios and record the band.
- Out:
  - Changing the workforce PRIORITY order, which is not what is wrong.
  - Removing the `wasStaffed` hint, which exists to stop the staffing flickering (src/sim/workforce.ts:28-37) and must keep working.
  - Retuning the wave curve to compensate; a band change is recorded, not designed around.

# Acceptance criteria
- A destroyed military lot contributes no battery for as long as it is rubble.
- A destroyed lot of any kind demands no workforce, and the lots still standing get those workers.
- The staffing of surviving lots does not flicker when a neighbour is destroyed.
- npm run scenarios stays inside its reported 13-85 s / 4-21 salvo band, or the new band is recorded with its reason.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: A destroyed military lot contributes no battery for as long as it is rubble.
- request-AC7 -> This backlog slice. Proof: A destroyed lot of any kind demands no workforce, and the lots still standing get those workers.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: High
- Rationale: A live defect that gives the city firepower it has lost and starves the survivors of workers; it also moves the balance band, so it goes first.

# Validation
- 2026-09-04: BuildingLifecycle excludes rebuilding lots from workforce allocation, app/playthrough batteries use non-rebuilding building statuses, and tests cover rubble staffing and standing batteries. Validated with rtk npm exec -- vitest run src/sim/buildingLifecycle.test.ts src/sim/batteries.test.ts src/sim/run.test.ts src/sim/economy.test.ts src/sim/playthrough.test.ts, rtk npm run typecheck, and rtk npm run scenarios. Scenarios stayed inside 13-85s / 4-21 salvo band.
