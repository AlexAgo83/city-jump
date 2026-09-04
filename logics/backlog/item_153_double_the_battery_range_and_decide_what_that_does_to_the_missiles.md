## item_153_double_the_battery_range_and_decide_what_that_does_to_the_missiles - Double the battery range and decide what that does to the missiles
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:27:21

# AI Context
- Summary: batteryRangeM is 220 and the operator wants it doubled. That multiplies firepower by more than two and, because flight time is a fraction of range rather than a speed, doubles missile speed as a side effect.
- Keywords: batteryRangeM, batteriesInRange, missileTravelSecondsAtRange, flight time as fraction of range, balance band
- Use when: changing a wave constant, or anything where a duration is expressed as a fraction of a distance.
- Skip when: damagePerParcelCell, reloadSeconds and destructionRadiusM, and retuning the wave curve to compensate.

# Problem
- src/sim/wave.ts:4 sets `batteryRangeM: 220`, which is too short for a barracks to defend the city it stands in. The operator wants it doubled.
- Doubling multiplies firepower by more than two: `batteriesInRange` (src/sim/batteries.ts:27) filters by that radius, so every barracks within 440 m contributes to each volley instead of every one within 220 m.
- It also doubles missile speed as a side effect. `impactAt` uses `missileTravelSecondsAtRange * Math.min(1, distXZ(battery, target) / battery.range)` (src/app/app.ts:598), which expresses flight time as a fraction of range rather than a speed -- so at 440 m a missile crosses twice the distance in the same 1.5 s.
- **Settled, 2026-09-04:** the operator wants the flight time to lengthen. A missile keeps the speed it flies today, so reaching twice as far takes twice as long -- about 3 s at the new maximum range instead of 1.5 s. The side effect is not wanted and is not to be shipped.
- The reported balance band -- 31 of 31 waves held, 13-85 s combat, 4-21 salvos -- is measured against the old range.

# Scope
- In:
  - Battery range doubled, with the figure's reason recorded at the declaration.
  - Missile speed held where it is, so the flight time lengthens with the reach: `missileTravelSecondsAtRange` moves with the range, or the formula stops dividing by range and expresses a speed outright. Prefer the second -- a duration written as a fraction of a distance is what produced this side effect, and it will produce it again at the next range change.
  - Re-run npm run scenarios and record the band.
- Out:
  - `damagePerParcelCell`, `reloadSeconds` and `destructionRadiusM`, which are not what was asked for.
  - Retuning the wave curve to compensate for the change.
  - The workforce staffing that decides which batteries fire at all.

# Acceptance criteria
- A battery engages the kaiju from twice the distance it used to.
- A missile flies no faster than it does today: at the new maximum range its flight takes about twice as long, and the arithmetic says so without a reader having to work it out.
- npm run scenarios stays inside its reported band, or the new band is recorded with its reason.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: A battery engages the kaiju from twice the distance it used to.
- request-AC8 -> This backlog slice. Proof: Whether a missile also flies twice as fast is a recorded decision, and the arithmetic says what it means.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Primary task(s): `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`

# Priority
- Priority: High
- Rationale: The operator named the change, and it moves the balance band, so it is measured early rather than discovered later.

# Notes
- 2026-09-04, operator: flight time lengthening is the wanted behaviour ("ca me va que ca le rallonge"). This slice no longer carries an open question -- it implements a constant-speed missile whose flight lengthens with the doubled reach.
- 2026-09-04, codex: doubled `batteryRangeM` to 440, replaced range-fraction flight timing with constant-speed `missileTravelSeconds(distanceM)`, and measured scenarios still inside band: expanding city 21/21 waves held, static city 31/31 held, 0 outside the 13-85s / 4-21 salvo band.
