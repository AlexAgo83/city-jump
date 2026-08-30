## req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off - Let the player turn shadows and the city's own lights off
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:37:32

# AI Context
- Summary: The two most expensive things the scene does -- a cascaded shadow map every frame, and a clustered spotlight plus point light per streetlight and per headlight after dark -- are the two the player cannot switch off. Both already have their seam: `sun.shadowEnabled` on the light, and the `setEnabled` the two `ClusteredLightContainer`s already take from the hour of day. Two positive-sense World toggles, on by default.
- Keywords: let, player, turn, shadows, city, own, lights, off
- Use when: Adding or changing the `Shadows` / `Lights` World toggles, or anything touching the shadow generator in `src/render/scene.ts` or the light clusters in `src/render/streetlights.ts` and `src/render/traffic.ts`.
- Skip when: The work adds a quality preset or detail tiers, degrades automatically on a low frame rate, tunes shadow resolution or filtering, touches the sun/ambient lights, or reduces what is drawn rather than switching emitters off.

# Needs
- The two most expensive things the scene does are the two the player has no say over. A cascaded shadow map re-renders the casters every frame, and after dark the city lights a clustered spotlight and point light per streetlight plus a spotlight per car headlight.
- A visitor on a weaker machine has exactly one lever today: stop building. The game gives them no way to trade fidelity for speed, which is the ordinary bargain every 3D application offers.
- `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` puts the cost on screen. Showing someone a number they cannot act on is worse than not showing it; these are the two switches that make the number actionable.
- Both are already switchable. Nothing needs inventing -- the seams exist and are currently driven only by the hour of day.

# Context
- Shadows are one object. `src/render/scene.ts` builds a single `CascadedShadowGenerator` over the `sun` `DirectionalLight`, and every caster registers against it (`shadows.addShadowCaster` in `src/render/buildings.ts` and `src/render/trees.ts`, with `receiveShadows` set on the meshes). The native switch is on the light -- `sun.shadowEnabled` -- which stops the shadow map rendering without touching a single caster or receiver. Walking every mesh to clear `receiveShadows` and emptying the caster list is the wrong path: it is more code, it has to be undone exactly, and it fights every rebuild that adds a new caster.
- The city's lights are two clusters. `src/render/streetlights.ts` holds a `ClusteredLightContainer` plus a `SpotLight` and `PointLight` per lamp, and already enables and disables the whole cluster by hour at `setSunHour` (`lightCluster.setEnabled(on)`). `src/render/traffic.ts` holds a second `ClusteredLightContainer` for car headlights. Both already have the exact call the setting needs.
- The sun and the ambient light are not part of this. `HemisphericLight` and the `DirectionalLight` are what make the world visible at all, and turning them off leaves a black screen rather than a faster one. This setting is about the lights the city itself emits.
- The hour of day already owns these. `streetlightsOnAt(hour)` decides when lamps come on, and `setSunHour` applies it. A setting that fights that will produce the classic bug: the player turns lights back on at 22:00 and nothing happens until they next move the sun slider. The setting and the hour have to combine into one answer that is applied immediately.
- The debug statistics stay honest for free: `realLightCount()` already returns 0 when the cluster is disabled, so a lights-off city reports zero real lights without any change.
- `Settings > World` is the row in `index.html` (around line 125) that holds `Grid` and `Buildings`, wired in `src/ui/controls.ts` and persisted through `UiSettings` in `src/ui/saves.ts` by `applySetting` and `persistSettings`. The frame-rate chain adds the third toggle to that row; these are the fourth and fifth. Copy `show-grid` and `show-buildings` -- markup in the `World` row, a handler in `bindControls`, a field in `UiSettings`, and a line in each of `persistSettings` and the `applySetting` block.
- Both toggles read positively -- `Shadows` and `Lights`, checked by default -- to match `Grid` and `Buildings` beside them and to keep today's appearance as the default. The player-facing effect is the one asked for; only the sense of the label differs.

# Acceptance criteria
- AC1: `Settings > World` carries a `Shadows` checkbox, on by default, and turning it off removes shadows from the scene immediately.
- AC2: `Settings > World` carries a `Lights` checkbox, on by default, and turning it off puts out the streetlights and car headlights immediately, at any hour.
- AC3: With shadows off, no shadow map is rendered -- the cost is actually gone, not merely invisible.
- AC4: With lights off, the scene is still lit by the sun and the ambient light; night is darker, not black.
- AC5: The setting and the hour of day combine into one answer: turning lights on after dark lights them at once, and turning them on during the day leaves them off until dusk as usual.
- AC6: Both choices are remembered across a reload, through the same settings storage the other World toggles use.
- AC7: Turning either setting off and back on restores the scene to what it looked like before -- no missing casters, no lamps left dark, verified against the bundled Demo city.
- AC8: The browser interaction suite covers both toggles off and on again; `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`
- Architecture decision(s): (none yet)

# References
- src/render/scene.ts
- src/render/streetlights.ts
- src/render/traffic.ts
- src/ui/controls.ts
- src/ui/saves.ts
- src/app/app.ts
- index.html
- scripts/interact.mjs
- logics/request/req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off.md
- logics/product/prod_013_a_city_that_tells_you_what_it_costs_to_draw.md
- logics/roadmap/road_001_city_jump_playable_city.md

# Backlog
- `item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh`
- `item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black`
