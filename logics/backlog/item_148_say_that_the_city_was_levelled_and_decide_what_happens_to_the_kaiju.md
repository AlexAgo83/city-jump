## item_148_say_that_the_city_was_levelled_and_decide_what_happens_to_the_kaiju - Say that the city was levelled, and decide what happens to the kaiju
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:04:12

# AI Context
- Summary: Confirmed: when the last building falls the wave finishes as breached, the kaiju's mesh is hidden, the banner gives the same three words as any breach, and the run does not end -- the player is left on an empty island still waiting for the next wave.
- Keywords: city levelled, wave breached, clearWaveVisuals, kaiju idle, endIfPopulationZero, run state
- Use when: changing what the player is told when a wave ends, or what the kaiju does when it runs out of targets.
- Skip when: the wave difficulty curve, the population decay model, and giving the kaiju retreat or patrol behaviour.

# Problem
- Confirmed: src/app/app.ts:621 finishes the wave as breached the moment no building has a state other than "rebuilding", and `finishWave` calls `clearWaveVisuals`, which hides the kaiju (src/app/waveLoop.ts:63-67). It disappears.
- The banner then reads "Wave breached" for three seconds -- the same words as a wave that broke through and left the city standing.
- The run does not end either. `settleWaveOutcome` ends a breached run only through `endIfPopulationZero`, evaluated against the population at that instant, which is still well above zero the moment the last building falls. The player is left on an empty island with a live run and nothing to rebuild from.
- Nothing in the sim makes the kaiju leave: src/sim/kaiju.ts:59 goes idle and stops when it runs out of targets. The disappearance is the app hiding the mesh.

# Scope
- In:
  - A message that distinguishes a city destroyed to the last building from an ordinary breach.
  - A decision, recorded, on whether the kaiju is shown leaving or stays hidden as now.
  - Making the run state agree with what the player is looking at when nothing is left standing.
- Out:
  - Giving the kaiju retreat, patrol or idle behaviour beyond what the player is shown.
  - The wave difficulty curve.
  - The population decay model.

# Acceptance criteria
- A city destroyed to the last building produces its own message, distinct from a breach that left buildings standing.
- What happens to the kaiju at that moment is deliberate and recorded, not a side effect of hiding the wave's meshes.
- The run's own state matches what the player sees: an island with nothing on it is not a run still waiting for the next wave.

# Decision
- 2026-09-04: The kaiju stays hidden when the last building falls. No retreat or idle behaviour is added in this slice; the wave visuals are cleared because the run has ended as defeated.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: A city destroyed to the last building produces its own message, distinct from a breach that left buildings standing.

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
- Rationale: A run that continues on an empty island with no explanation is the worst state the game can leave a player in.

# Validation
- 2026-09-04: A city levelled to its last building now ends the run as defeated, keeps the wave from scheduling again, and shows "The city was levelled" in the banner/run panel. Validated with rtk npm exec -- vitest run src/app/waveLoop.test.ts src/ui/runPanel.test.ts src/sim/run.test.ts src/sim/save.test.ts and rtk npm run ci.
