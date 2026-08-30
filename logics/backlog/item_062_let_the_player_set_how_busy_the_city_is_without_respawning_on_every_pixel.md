## item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel - Let the player set how busy the city is, without respawning on every pixel
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: One factor scaling the three spawn-count expressions, applied at spawn time, pure and unit-tested, with the default reproducing today's counts exactly. Density cannot be applied incrementally -- it means a full traffic rebuild -- so the slider settles before it respawns, or it repeats the zoning brush's defect. Its floor is a quiet city, not an empty one; emptiness is the toggle's job.
- Keywords: let, player, set, busy, city, respawning, pixel
- Use when: Adding the traffic density slider, or changing the per-segment car and pedestrian spawn counts.
- Skip when: The work separates cars from pedestrians, varies density by hour or zone, reshapes the count expressions beyond scaling, or carries density in a save.

# Problem
- How busy a city is lives in three expressions in `src/render/traffic.ts`: cars are `min(4, max(1, floor(length / 80)))`, pedestrians are `min(8, max(2, floor(length / 22)))` on a pedestrian way and `min(6, floor(length / 45))` elsewhere. They are someone's taste, frozen in the source, and the player cannot reach them.
- Density cannot be changed in place. A different count means different movers, which means a full traffic rebuild that disposes every existing one -- and a range input fires on every pixel of a drag. Wiring the slider straight to a rebuild reproduces exactly the defect the zoning brush shipped with.
- A slider that reaches zero and a toggle that turns traffic off are two controls for one state, and a player who finds both will not know which one they are supposed to use.

# Scope
- In:
  - One density factor that scales the three count expressions, applied at spawn time in the traffic rebuild, with the middle or default position reproducing today's counts exactly.
  - Keep the scaling a pure function of the existing expression and the factor, unit-tested without a scene: today's factor gives today's numbers, a higher factor gives more, a lower one gives fewer, and no factor produces a negative or absurd count.
  - A labelled range input in the `World` row of `index.html`, following the sun-hour slider's precedent of a range with an `<output>` beside it, persisted in `UiSettings` with the other World settings.
  - Rebuild on a bounded cadence rather than per input event -- settle on the value before respawning -- so dragging the slider end to end costs a handful of rebuilds and not hundreds. `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` rung 9 is the precedent.
  - The slider's floor is a quiet city, not an empty one, and it does nothing while traffic is off.
  - Extend `scripts/interact.mjs`: move the slider up, assert more cars; move it down, assert fewer; confirm the default reproduces the count the suite asserts today.
- Out:
  - Separate controls for cars and pedestrians, or density per road type.
  - Density that varies by hour, by zone, or by anything the simulation decides.
  - Changing the shape of the count expressions themselves beyond scaling them.
  - Carrying density in a save or a share link.

# Acceptance criteria
- AC1: A density slider in `Settings > World` makes the city measurably busier or quieter without a reload.
- AC2: At its default the counts are exactly today's, proven by the existing suite's assertions still holding unchanged.
- AC3: The scaling is a pure function with unit tests, and never yields a negative or absurd count.
- AC4: A drag from one end of the slider to the other costs a bounded number of traffic rebuilds, not one per input event.
- AC5: The slider offers no empty city and has no effect while traffic is off; the choice survives a reload and never travels in a save or a share link.
- AC6: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A density slider in `Settings > World` makes the city measurably busier or quieter without a reload.
- request-AC4 -> This backlog slice. Proof: AC2: At its default the counts are exactly today's, proven by the existing suite's assertions still holding unchanged.
- request-AC5 -> This backlog slice. Proof: AC3: The scaling is a pure function with unit tests, and never yields a negative or absurd count.
- request-AC6 -> This backlog slice. Proof: AC4: A drag from one end of the slider to the other costs a bounded number of traffic rebuilds, not one per input event.
- request-AC7 -> This backlog slice. Proof: AC5: The slider offers no empty city and has no effect while traffic is off; the choice survives a reload and never travels in a save or a share link.
- request-AC9 -> This backlog slice. Proof: AC6: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_015_a_city_whose_traffic_is_the_player_s_to_dial`
- Architecture decision(s): (none yet)
- Request: `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
- Primary task(s): `task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
