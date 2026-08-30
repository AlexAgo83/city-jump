## item_059_make_shadows_a_switch_on_the_light_rather_than_on_every_mesh - Make shadows a switch, on the light rather than on every mesh
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:37:32

# AI Context
- Summary: Switch shadows at the light (`sun.shadowEnabled`), not by walking meshes and emptying the caster list -- buildings and trees re-register casters on every rebuild, so the mesh-walking approach quietly undoes itself. Must stop the shadow map rendering, not just hide its result.
- Keywords: shadows, switch, light, rather, than, mesh
- Use when: Adding the `Shadows` toggle, or changing how the `CascadedShadowGenerator` in `src/render/scene.ts` is driven.
- Skip when: The work tunes shadow resolution, filtering, cascades, darkness or bias, turns off the sun itself, or touches the light clusters.

# Problem
- The `CascadedShadowGenerator` in `src/render/scene.ts` re-renders every caster into a shadow map each frame, and nothing can stop it. It is created once at startup and never referred to again except to register casters.
- The tempting fix is the expensive one: walk every mesh clearing `receiveShadows` and empty the caster list. That is more code, has to be undone exactly to satisfy AC7, and fights every rebuild that adds a new caster -- buildings and trees both register casters on rebuild, so a rebuild while shadows are off would quietly put them back.
- A setting that only hides the shadows without stopping the shadow map costs exactly as much as leaving them on, which fails the point of the setting.

# Scope
- In:
  - Expose a shadow switch from `createScene` alongside the `shadows` generator and `setSunHour` it already returns, so `src/app/app.ts` can drive it the way it drives the sun.
  - Use the native switch on the light -- `sun.shadowEnabled` -- rather than unregistering casters, so rebuilds that add casters while the setting is off stay harmless.
  - A `Shadows` checkbox in the `World` row of `index.html`, on by default, wired in `src/ui/controls.ts` and persisted in `UiSettings`, copying `show-grid` and `show-buildings` exactly.
  - Prove the cost is gone rather than hidden: confirm the shadow map is not being rendered when the setting is off, and record the before-and-after frame rate from the counter `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` adds.
  - Extend `scripts/interact.mjs`: shadows off, shadows on, and the scene back to what it was.
- Out:
  - Shadow map resolution, filtering quality, cascade counts, darkness, or bias.
  - Turning off the sun itself.
  - The streetlight and headlight clusters, which are the other slice.

# Acceptance criteria
- AC1: A `Shadows` toggle in `Settings > World`, on by default, removes shadows immediately when switched off.
- AC2: With shadows off, no shadow map is rendered, evidenced rather than asserted.
- AC3: A rebuild that adds new casters while the setting is off does not bring shadows back.
- AC4: Switching back on restores the Demo city to what it looked like before, and the choice survives a reload.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A `Shadows` toggle in `Settings > World`, on by default, removes shadows immediately when switched off.
- request-AC3 -> This backlog slice. Proof: AC2: With shadows off, no shadow map is rendered, evidenced rather than asserted.
- request-AC6 -> This backlog slice. Proof: AC3: A rebuild that adds new casters while the setting is off does not bring shadows back.
- request-AC7 -> This backlog slice. Proof: AC4: Switching back on restores the Demo city to what it looked like before, and the choice survives a reload.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_014_a_city_that_can_be_made_to_run_on_a_weaker_machine`
- Architecture decision(s): (none yet)
- Request: `req_017_let_the_player_turn_shadows_and_the_city_s_own_lights_off`
- Primary task(s): `task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off`
- Depends on: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` -- its counter is how this slice's before-and-after is measured, and `item_058_add_show_fps_to_settings_world_and_remember_it` establishes the World-toggle pattern this follows.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off`

# Notes
- Task `task_019_let_the_player_turn_shadows_and_the_city_s_own_lights_off` was finished via `logics-manager flow finish task` on 2026-08-30.
