## req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up - Let the player set the bar a kaiju comes for, and fix what reading the spawn path turned up
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The residents bar that triggers a kaiju is a hardcoded 180 per wave and the operator wants 1000 plus a control. That number is the only wave trigger, it feeds the threat formula, and the reason it is 180 is written in the code and points at the scenario gate. Reading the spawn path to answer that also found a kaiju that can only land on two of four edges, an unused constant, and a drain the return type cannot report.
- Keywords: waveAtPopulation factor, RunRules field, scenario gate six waves, threat reads population, landing edge ranking, destructionRadiusM unused, destroyed overwritten
- Use when: changing the wave trigger, the landing geometry, or anything in WAVE_STARTING_VALUES.
- Skip when: reworking the threat formula or the approach geometry to compensate, replacing the deterministic seed hash, or adding a save migration hook -- a defaulted rule needs none.

# Needs
- The residents a city must hold before a kaiju comes for it is the player's choice, and it starts at 1000 rather than 180.
- A kaiju can land on any edge of the map, not on one of two.
- A constant that shapes the wave either does something or is not there.
- A building the kaiju destroyed is a building the city sees destroyed.

# Context
- Four items from reading the whole spawn path end to end. The first is what the operator asked for; the other three came out of that reading. The first is not a one-line change: it contradicts a decision recorded in the code, and it moves the one gate this project measures balance with.
- The bar is `waveAtPopulation(wave) = 180 * Math.max(1, wave)` (src/sim/wave.ts:20-22). `residentsUntilWave` derives from it, `summonIfDue` (src/sim/wave.ts:88) is the only trigger -- there is no timer anywhere -- and the waiting banner reads it directly (src/app/app.ts:572).
- The 180 has a recorded reason that a factor of 1000 contradicts head-on. src/sim/wave.ts:18-20 says: "Linear because the scenario gate asks for six waves inside a bounded run. A quadratic bar made wave 3 wait for 2,250 residents, so the harness measured two fights and guessed at the rest." At a factor of 1000 the bars become 1000, 2000, 3000, 4000, 5000, 6000 -- so wave 3 waits for 3,000 residents, which is worse than the quadratic curve that reason was written to reject.
- Measured, not estimated: the scenario harness ends its runs at about 1,121 residents. At a factor of 180 that clears all six bars, which is why the gate reports 31 waves fought. At a factor of 1000 it clears one. The gate would go from six fights per seed to one, and `npm run scenarios` would stop being evidence about waves 2 to 6 at all.
- So the factor being configurable is what makes the default movable: the harness pins the value it needs for the gate, and the shipped default is the operator's 1000. Decide that explicitly -- a scenario harness silently running different numbers from the game is a trap unless it is written down where the harness sets it.
- There is a second consequence the operator should see before choosing 1000. `waveThreat` (src/sim/wave.ts:73-75) includes `population * 9`, so a taller bar makes a bigger first kaiju: at the wave-1 bar with 29 parcels, the threat goes from 2,752 HP at a factor of 180 to 10,132 HP at 1000 -- about 3.7 times. That lands on top of req_042's doubled battery range, so the two together must be measured once, not separately.
- Where the setting lives is a real decision, not a formality. `RunRules` (src/sim/run.ts:35-44) is the gameplay-rules surface: it travels inside the save (`readRun`, src/sim/save.ts:211-227), it is shown in the toolbar's Gameplay row (index.html:347-362), and `setRunRules` (src/ui/runPanel.ts:84-86) already changes it live mid-run. `UiSettings` (src/ui/saves.ts:81) is per-browser and is NOT saved with the city, so a factor kept there would mean a shared city is played at whatever bar the receiver happens to have set. RunRules is the home; UiSettings is not.
- `readRun` has no shape for a number yet. All five current rules are validated as `rules.X === true`, which coerces anything to a boolean. A numeric factor needs finiteness, a positive floor and a sane ceiling, and a missing value must default the way the booleans do -- that is what keeps old saves loadable without touching SAVE_VERSION, which is 13 and has no migration hook.
- Do not reach for a mutable module-level global to carry the factor into the simulation layer. That is exactly the pattern src/sim/terrain.ts uses, which req_039 recorded as invisible to every architecture rule that exists: an import-direction test cannot see state coupling, and a missed setter renders the whole city at sea level silently. Thread it as an optional parameter instead, which is the established idiom here -- `speed` and `attackDuration` on `advanceKaijuAssault` (src/sim/kaiju.ts:56), `wasStaffed` on `batteriesForParcels`, `base` on `startingMoney`.
- The call sites that need the factor are few and known: `residentsUntilWave` and `summonIfDue` in src/sim/wave.ts, the waiting banner at src/app/app.ts:572, and the harness at src/sim/playthrough.ts:201.
- A kaiju can only ever land on two of the four edges, and that is arithmetic rather than chance. `landingPoint` (src/sim/kaiju.ts:88) ranks the four edges by distance from a fixed point -- the `bridge`, `v3(-360, 0, 1500)`, passed at src/app/waveLoop.ts:39 -- then takes `ranked[Math.floor(random(...) * 2)]`, one of the two furthest.
- With `GROUND_SIZE = 5400` those distances are fixed for every game: north 4200, east 3060, west 2340, south 1200. The top two are always north and east. Checked across 600 possible seeds: 304 north, 296 east, 0 west, 0 south. The intent -- do not land on the bridge -- is sound; the effect is that half the map is never a landing.
- The seed is deterministic and should stay so. `random` (src/sim/kaiju.ts:118) is an FNV-1a hash of the seed string, not a stateful generator, and the seed is `String(Math.round(waveClock.elapsedSeconds))` (src/app/app.ts:454). The scenario harness depends on that reproducibility, so this is about widening which edges are reachable, not about adding real randomness.
- While in there, the approach is worth a look but is not in scope unless the operator asks: `coast` is 32 points on a circle of radius 2,484 (src/app/waveLoop.ts:29-32) while the landing is on a square edge, so the wade-in runs 216 m at the middle of an edge and 1,334 m at a corner -- 13.5 s against 83.4 s at 16 m/s. Widening the edges changes how often each of those happens.
- `destructionRadiusM: 25` (src/sim/wave.ts:8) is declared and used nowhere in src/. Destruction is one building at a time, by name, with no radius: the kaiju attacks its target for `KAIJU_ATTACK_SECONDS` and that one lot becomes rubble. The constant is either a feature nobody wrote or a leftover.
- A destroyed building can be dropped, though not today. `advanceKaijuAssault` (src/sim/kaiju.ts:56-86) has a `while` loop that can destroy more than one building in a single call, but `destroyed` is one `Vec3` overwritten each time round -- and both callers handle exactly one per tick (src/app/app.ts:614, src/sim/playthrough.ts:313). The comment at src/sim/kaiju.ts:66 says draining large ticks is deliberate: "tests and future callers are not all locked to the 0.25 s combat step."
- It is latent, not live: both callers step at 0.25 s (src/sim/playthrough.ts:84 sets `COMBAT_STEP_SECONDS = 0.25`) and a building takes 5 s to fall, so a second destruction inside one tick cannot happen at the shipped step. It becomes real the moment anything steps at more than 5 s -- which the comment invites. The signature promises something the return type cannot carry.

# Acceptance criteria
- The residents bar is a run rule the player can set, it defaults to 1000, and it travels with the save.
- The factor reaches the simulation as data rather than as module state, and no architecture rule has to be trusted to catch a missed setter.
- An old save loads with the new rule defaulted, and a save carrying a nonsense factor is refused or clamped rather than replayed.
- The scenario gate still measures six waves per seed, and the value it pins is recorded where the harness sets it.
- A kaiju can land on any of the four edges, and the landing stays reproducible from its seed.
- No constant in WAVE_STARTING_VALUES is unused.
- A tick that destroys more than one building reports all of them, or the function cannot be asked to.
- npm run scenarios is re-measured once for this and req_042 together, and the band is recorded with its reason.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)

# References
- src/sim/wave.ts
- src/sim/kaiju.ts
- src/sim/run.ts
- src/sim/save.ts
- src/sim/playthrough.ts
- src/app/app.ts
- src/app/waveLoop.ts
- src/ui/runPanel.ts
- src/ui/controls.ts
- index.html

# Backlog
- `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`
- `item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves`
- `item_160_let_a_kaiju_land_on_any_edge_of_the_map`
- `item_161_settle_the_two_loose_ends_in_the_assault_code`
