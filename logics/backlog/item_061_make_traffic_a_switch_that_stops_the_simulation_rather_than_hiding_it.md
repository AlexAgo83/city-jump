## item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it - Make traffic a switch that stops the simulation rather than hiding it
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Off must mean the movers do not exist and the `registerBeforeRender` step is not entered -- hiding the meshes leaves the whole cost running and the frame rate unmoved, which is the worst outcome for a setting whose only purpose is cost. Headlights answer to this and to `Lights` as one combined answer, so no beams survive their cars.
- Keywords: traffic, switch, stops, simulation, rather, than, hiding
- Use when: Adding the `Traffic` toggle, or changing what runs per frame in `src/render/traffic.ts`.
- Skip when: The work touches the density slider, changes traffic behaviour, or switches streetlights and shadows.

# Problem
- The per-frame step registered through `scene.registerBeforeRender` in `src/render/traffic.ts` walks every mover, resolves the lane queues, reads signal cycles, drives roundabout slots and positions headlights. It runs whether anyone can afford it or not.
- Disabling the mover meshes would leave all of that running for nothing -- the cars would vanish and the frame rate would not move, which is the worst possible outcome for a setting whose whole purpose is cost.
- Headlights are driven from the car count through `syncHeadlights`, and the same cluster is switched by the `Lights` setting. Two settings reaching for the same lights is how one ends up leaving beams lit over an empty road.

# Scope
- In:
  - A traffic switch that results in no movers existing and no per-frame step running -- the meshes disposed and the simulation not entered, rather than skipped inside.
  - A `Traffic` checkbox in the `World` row of `index.html`, on by default, wired in `src/ui/controls.ts` and persisted in `UiSettings`, copying `show-grid` and `show-buildings` exactly.
  - Make the traffic switch and the `Lights` switch combine into one answer for the headlight cluster, so no beams survive their cars.
  - Confirm the debug statistics report zero cars and zero pedestrians with the setting off -- they read the mover list, so this holds only if the movers are genuinely gone.
  - Record the frame rate on the bundled Demo city with traffic on and off, using the counter from `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`.
  - Extend `scripts/interact.mjs`: traffic off, assert no cars and no pedestrians, traffic on, assert they return.
- Out:
  - The density slider, which is the other slice.
  - Changing how traffic behaves once it is running.
  - Streetlights, shadows, or anything else the other chains switch.

# Acceptance criteria
- AC1: A `Traffic` toggle in `Settings > World`, on by default, empties the city of cars and pedestrians immediately.
- AC2: With traffic off no movers exist and no per-frame simulation runs, evidenced by the statistics reading zero and by a measured frame-rate difference.
- AC3: Traffic off leaves no headlights lit, whatever the `Lights` setting says.
- AC4: The choice survives a reload and does not appear in a save or a share link.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A `Traffic` toggle in `Settings > World`, on by default, empties the city of cars and pedestrians immediately.
- request-AC2 -> This backlog slice. Proof: AC2: With traffic off no movers exist and no per-frame simulation runs, evidenced by the statistics reading zero and by a measured frame-rate difference.
- request-AC7 -> This backlog slice. Proof: AC3: Traffic off leaves no headlights lit, whatever the `Lights` setting says.
- request-AC8 -> This backlog slice. Proof: AC4: The choice survives a reload and does not appear in a save or a share link.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_015_a_city_whose_traffic_is_the_player_s_to_dial`
- Architecture decision(s): (none yet)
- Request: `req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
- Primary task(s): `task_020_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is`
- Depends on: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` -- its counter is how "the cost is gone, not hidden" is evidenced, and `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off` owns the headlight cluster this slice has to share an answer with.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
