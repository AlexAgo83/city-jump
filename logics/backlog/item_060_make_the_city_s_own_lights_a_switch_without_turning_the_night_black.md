## item_060_make_the_city_s_own_lights_a_switch_without_turning_the_night_black - Make the city's own lights a switch, without turning the night black
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:22:33

# AI Context
- Summary: One combined answer -- the hour says on AND the setting allows it -- through the `setEnabled` calls both light clusters already have, so switching at 22:00 takes effect at once instead of waiting for the next sun-slider move. Ambient and sun stay lit: night goes darker, not black.
- Keywords: city, own, lights, switch, turning, night, black
- Use when: Adding the `Lights` toggle, or changing how the streetlight and headlight `ClusteredLightContainer`s are enabled.
- Skip when: The work changes `streetlightsOnAt` or when lamps come on by hour, touches the sun/ambient/sky, or reduces the number of lamps rather than switching them off.

# Problem
- After dark the city lights a `SpotLight` and a `PointLight` per streetlight through a `ClusteredLightContainer` in `src/render/streetlights.ts`, plus a `SpotLight` per car through a second cluster in `src/render/traffic.ts`. Nothing but the hour of day decides whether they run.
- The hour already owns them: `streetlightsOnAt(hour)` decides, `setSunHour` applies. A setting bolted on beside that produces the classic bug -- the player switches lights back on at 22:00 and nothing happens until they next touch the sun slider.
- Turning off the wrong lights turns off the scene. The `HemisphericLight` and the sun `DirectionalLight` are what make the world visible; this setting is about the lights the city itself emits, and confusing the two yields a black screen rather than a faster one.

# Scope
- In:
  - One combined answer -- the hour says lights should be on AND the setting allows them -- applied through the `setEnabled` calls both clusters already have, so switching the setting at any hour takes effect at once.
  - Cover both emitters: the streetlight cluster and its per-lamp lights in `src/render/streetlights.ts`, and the headlight cluster in `src/render/traffic.ts`.
  - Leave the ambient and sun lights alone, so night with lights off is darker rather than black.
  - A `Lights` checkbox in the `World` row of `index.html`, on by default, wired and persisted by copying `show-grid` and `show-buildings` exactly.
  - Confirm `realLightCount()` in the debug statistics reports zero with the setting off -- it already keys off the cluster being enabled, so this should hold for free, and if it does not the combined answer was applied in the wrong place.
  - Extend `scripts/interact.mjs`: set the hour after dark, lights off, lights on, and the lamps back.
- Out:
  - Changing `streetlightsOnAt` or when lights come on by hour.
  - The sun, the ambient light, the sky, or the day cycle.
  - Shadows, which are the other slice.
  - Reducing the number of lamps or headlights rather than switching them off.

# Acceptance criteria
- AC1: A `Lights` toggle in `Settings > World`, on by default, puts out streetlights and headlights immediately at any hour.
- AC2: With lights off after dark the scene is still lit by sun and ambient light -- darker, not black.
- AC3: Turning lights on after dark lights them at once, without touching the sun slider; turning them on during the day leaves them off until dusk as usual.
- AC4: `realLightCount()` reports zero with the setting off, and switching back on restores the Demo city to what it looked like before.
- AC5: The `Lights` choice survives a reload, through the same storage as the other World toggles.
- AC6: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A `Lights` toggle in `Settings > World`, on by default, puts out streetlights and headlights immediately at any hour.
- request-AC4 -> This backlog slice. Proof: AC2: With lights off after dark the scene is still lit by sun and ambient light -- darker, not black.
- request-AC5 -> This backlog slice. Proof: AC3: Turning lights on after dark lights them at once, without touching the sun slider; turning them on during the day leaves them off until dusk as usual.
- request-AC6 -> This backlog slice. Proof: AC4: `realLightCount()` reports zero with the setting off, and switching back on restores the Demo city to what it looked like before.
- request-AC7 -> This backlog slice. Proof: AC5: The `Lights` choice survives a reload, through the same storage as the other World toggles.
- request-AC8 -> This backlog slice. Proof: AC6: This slice lands last, so `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` are all green on the request as a whole when it closes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`
- Architecture decision(s): (none yet)
- Request: `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`
- Primary task(s): `task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
