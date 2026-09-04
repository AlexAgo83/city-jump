## item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves - Keep the scenario gate measuring six waves once the bar moves
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The 180 exists for the scenario gate: the harness ends at about 1,121 residents, which clears six bars at 180 and one at 1000. Without the harness pinning its own factor, the gate stops being evidence about waves 2 to 6.
- Keywords: scenario gate, six waves per seed, harness pinned factor, recorded reason update, balance band re-measure
- Use when: changing a value the scenario harness depends on, or reading a scenario result.
- Skip when: retuning the threat, reload or damage to recover the old band, and weakening what the gate asserts.

# Problem
- The 180 exists for this gate. src/sim/wave.ts:18-20: "Linear because the scenario gate asks for six waves inside a bounded run. A quadratic bar made wave 3 wait for 2,250 residents, so the harness measured two fights and guessed at the rest." A factor of 1000 puts wave 3 at 3,000 residents -- worse than the curve that reason rejected.
- Measured: the harness ends its runs at about 1,121 residents, which clears all six bars at a factor of 180 and one bar at 1000. The gate would drop from 31 waves fought to roughly one per seed and would stop being evidence about waves 2 to 6.
- `waveThreat` also reads population (src/sim/wave.ts:73-75), so the wave-1 threat goes from 2,752 HP to 10,132 HP at 29 parcels -- about 3.7 times -- and req_042 is doubling the battery range at the same time.

# Scope
- In:
  - The harness pinning the factor it needs, set explicitly and recorded where it is set, so nobody later reads a scenario result as if it used the shipped default.
  - Updating the recorded reason at src/sim/wave.ts:18-20 to say what is true after this: the shape is still linear, the factor is now a rule, and the gate pins its own.
  - One re-measurement covering this change and req_042's battery range together, with the new band recorded and its reason given.
- Out:
  - Retuning the threat formula, the reload or the damage to make the old band come back.
  - Reducing what the gate asserts to make it pass.
  - Changing the linear shape of the bar.

# Acceptance criteria
- npm run scenarios still fights six waves per seed.
- The factor the harness uses is explicit at the point it is set, and says why it differs from the shipped default.
- The reason recorded in wave.ts describes the code as it now is.
- The band is re-measured once for this and req_042 together, and recorded with its reason.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: npm run scenarios still fights six waves per seed.
- request-AC8 -> This backlog slice. Proof: The factor the harness uses is explicit at the point it is set, and says why it differs from the shipped default.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)
- Request: `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`
- Primary task(s): `task_045_orchestrate_the_residents_bar_and_spawn_path_work`

# Priority
- Priority: High
- Rationale: Without it the factor change silently turns the only balance gate this project has into evidence about one wave instead of six.
