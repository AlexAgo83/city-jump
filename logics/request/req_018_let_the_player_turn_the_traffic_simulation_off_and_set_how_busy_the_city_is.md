## req_018_let_the_player_turn_the_traffic_simulation_off_and_set_how_busy_the_city_is - Let the player turn the traffic simulation off, and set how busy the city is
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:43:23

# AI Context
- Summary: How busy a city is lives in three frozen expressions in `src/render/traffic.ts` -- cars `min(4, max(1, floor(len/80)))`, pedestrians `min(8, max(2, floor(len/22)))` on pedestrian ways and `min(6, floor(len/45))` elsewhere -- and the simulation runs whether the machine can afford it or not. A `Traffic` toggle that removes the movers and the per-frame step, plus a density slider scaling those three counts, with the default reproducing today's city exactly.
- Keywords: let, player, turn, traffic, simulation, off, set, busy, city
- Use when: Adding the `Traffic` toggle or the density slider, or changing the spawn counts and the per-frame step in `src/render/traffic.ts`.
- Skip when: The work changes traffic behaviour (following, lane changes, signals, transfers, roundabouts), adds routing or demand, splits cars from pedestrians, or puts density into a save or share link.

# Needs
- Traffic is the third thing the city spends its frame on and the second the player cannot switch off. Every car and pedestrian is a mesh instance stepped every frame -- following the one ahead, reading signals, taking junction transfers and roundabout slots -- and a busy city carries hundreds of them.
- How busy the city is was decided once, in code, and never revisited. Cars per segment are `min(4, max(1, floor(length / 80)))`; pedestrians are `min(8, max(2, floor(length / 22)))` on a pedestrian way and `min(6, floor(length / 45))` elsewhere. Those constants are someone's taste, frozen. A player who wants a quiet town or a gridlocked city has no say.
- The two are the same lever from different ends. Turning traffic off is the largest single thing a weaker machine can do; turning it up is what someone with a fast machine wants the moment they see it works.
- `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` puts the cost on screen and `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off` gives two switches for it. This is the third and biggest, and the only one of the three that is also a thing a player would want for its own sake.

# Context
- The spawn loop is one place. `rebuild` in `src/render/traffic.ts` (around line 880) walks the segments and, per segment, creates the walkers and then the cars, each as mesh instances placed by `place`. Everything the density slider changes is those three count expressions and nothing else.
- Density cannot be applied incrementally. Changing it means respawning, which means a full traffic rebuild -- `rebuild()` with no dirty box -- disposing every mover and creating new ones. That is a heavy operation on a slider that fires an `input` event per pixel dragged, and it is exactly the mistake the zoning brush made and `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` rung 9 names. The slider must not respawn on every event.
- Turning traffic off has to stop the work, not hide the cars. The per-frame step registered through `scene.registerBeforeRender` walks every mover, resolves queues, reads signal cycles and drives headlights; disabling the meshes while that keeps running buys nothing. The movers should not exist.
- The two controls must not mean the same thing in two places. The slider's floor is a quiet city, not an empty one -- emptiness is what the toggle is for -- so the slider has no effect while traffic is off and does not offer zero.
- Headlights follow the cars. `syncHeadlights` is called with the car count at the end of every traffic rebuild, and the headlight cluster is the same one `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off` switches. Fewer cars means fewer headlights for free; no cars means none, and the two settings must combine without either fighting the other.
- The debug statistics already report `cars` and `pedestrians` from the mover list, so both stay truthful for free -- provided the movers really are gone rather than merely hidden.
- This is a preference about how the city is displayed and simulated, not a fact about the city, so it belongs in `UiSettings` in `src/ui/saves.ts` alongside the other World settings and not in the save. A city shared as a link must not carry the sender's traffic preference.
- `Settings > World` in `index.html` (around line 125) holds `Grid` and `Buildings`, plus the toggles the two chains above add. It already carries a range input elsewhere -- the sun hour, with an `<output>` beside it -- so a labelled slider in the toolbar has a precedent to copy.

# Acceptance criteria
- AC1: `Settings > World` carries a `Traffic` checkbox, on by default, and turning it off removes every car and pedestrian from the city immediately.
- AC2: With traffic off, no per-frame simulation work runs and no movers exist -- the cost is gone, not hidden, and the debug statistics report zero cars and zero pedestrians.
- AC3: `Settings > World` carries a traffic density slider that makes the city measurably busier or quieter, taking effect without a reload.
- AC4: The slider does not respawn traffic on every input event; a drag from one end to the other costs a bounded number of rebuilds, not one per pixel.
- AC5: The slider's floor is a quiet city rather than an empty one, and it has no effect while traffic is off -- the two controls never mean the same thing.
- AC6: At its default the slider reproduces exactly today's traffic, so an existing city looks unchanged until someone moves it.
- AC7: Both settings are remembered across a reload through the same storage as the other World settings, and neither travels in a save or a share link.
- AC8: Traffic off and the `Lights` setting combine without either fighting the other -- no headlights are left lit with no cars under them.
- AC9: The browser interaction suite covers turning traffic off and on and moving the slider; `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_015_a_city_whose_traffic_is_the_player_s_to_dial`
- Architecture decision(s): (none yet)

# References
- src/render/traffic.ts
- src/app/app.ts
- src/ui/controls.ts
- src/ui/saves.ts
- src/render/debugApi.ts
- index.html
- scripts/interact.mjs
- logics/request/req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off.md
- logics/product/prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine.md
- logics/roadmap/road_001_city_jump_playable_city.md

# Backlog
- `item_061_make_traffic_a_switch_that_stops_the_simulation_rather_than_hiding_it`
- `item_062_let_the_player_set_how_busy_the_city_is_without_respawning_on_every_pixel`
