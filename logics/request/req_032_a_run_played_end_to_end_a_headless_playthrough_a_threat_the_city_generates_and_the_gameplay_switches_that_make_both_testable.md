## req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable - A run played end to end: a headless playthrough, a threat the city generates, and the gameplay switches that make both testable
> From version: 0.3.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:46:48

# AI Context
- Summary: The harness that would have caught the last three requests' defects: a headless playthrough from arrival to the first kaiju, a wave that arrives on threat the city generated, a military measured against it, and a Gameplay settings section whose switches are both player options and test instruments.
- Keywords: run, played, end, headless, playthrough, threat, city, generates, gameplay, switches, both, testable
- Use when: Working on end-to-end simulation tests, wave timing and threat generation, the military balance question, or the gameplay switches.
- Skip when: You need what a wave looks like on screen, or the individual defects the other requests own.

# Needs
- Every defect the last three requests record survived seven closeouts for the same reason: each acceptance criterion was checked inside its own slice, and nothing ever played a run. A wave that ends on the first building, a starting city that starves in one simulated day, nine upgrades that change nothing -- none of these is visible from a unit test of the part it lives in, and every one of them is obvious to anything that plays from arrival to the first attack.
- What is missing is a harness that plays. Arrive on the island, draw the first roads, paint the first zones, watch parcels be admitted and rise, watch the needs move, build what the needs say to build, and reach the first wave with a city that is still alive. Every one of those steps is pure simulation -- the graph, the zones, the slots, the lifecycle, the economy and the wave are all Babylon-free by the ADR keeping the simulation independent of Babylon and the browser -- so the playthrough can be headless, deterministic and fast, and is not the browser suite in another costume.
- The needs are the part that most wants exercising. A player is told to read the gauges to decide what to build next; nothing has ever done that. A harness that follows what the needs panel says, and then asserts the city is better off for it, is the only way that instruction is ever tested -- and if the gauges cannot be followed to a surviving city, that is the finding.
- One wave, three endings. The first attack has to be played through in each of its shapes: the kaiju destroys everything, the kaiju destroys about half the city, the kaiju destroys nothing. Each must have a stated consequence that the harness asserts -- what the run state becomes, what the population does afterwards, what rebuilding costs, whether the city can still reach the next wave. Today two of those three shapes cannot even occur, because the wave ends on the first building destroyed.
- The wave's timing is a constant that nothing generates. `nextWaveAtSeconds` is sixty and never moves. The threat is a fixed six hundred hit points derived from nothing. A city that sprawls and a city that consolidates face the same kaiju at the same moment, so neither choice is priced. What the game needs is a rate: the city generates threat by existing and growing, and the wave arrives when enough of it has accumulated.
- The other half of that balance has never been looked at either: whether the military a city can actually afford, staff and place by the time a wave lands is a match for the kaiju it has to beat. Battery damage scales with parcel area, military parcels demand eight workers a cell -- the highest in the game -- and the threat scales with nothing. Nobody has measured whether a reasonably played city arrives at its first wave over-armed, under-armed, or unable to field a battery at all.
- The settings menu has no gameplay section, and it needs one. Hardcore currently sits on the play screen where it can be toggled mid-run; a kaiju that cannot be switched off means there is no way to build a city without a clock running against it; and construction time and build cost, which are exactly what a person testing the rest of the game wants to skip, can only be skipped by editing constants.
- Those switches are not only a convenience. A harness that can play with instant construction, or with no kaiju, or with costs off, can isolate the rule it is testing instead of waiting sixty seconds per building for a scenario about food. The player-facing option and the instrument the tests need are the same switch.

# Context
- This request depends on the corrections in the two requests before it rather than duplicating them. The wave that no longer ends on the first building comes from the legibility request; the run that schedules a second wave, the survivable opening and the resource sinks come from the loop-closure request. Playing a run end to end is only meaningful once those exist -- but writing the harness first, and watching it fail on each of them in turn, is a legitimate and probably better order.
- The balance harness is the sharpest overlap and the one place duplication is likely. The legibility request rewrites `scripts/balance.mjs` onto the real wave simulation to check combat duration. This request needs a fuller playthrough for the same reason. Whichever lands first builds the harness; the other extends it. Two harnesses over the same simulation is the failure mode to avoid, and it should be named in whichever closeout comes second.
- The threat rate here and the threat scaling in the loop-closure request are one rule seen from two sides: that request makes the threat depend on the city and the wave number, this one makes the *arrival* depend on accumulated threat. They should be designed together even if they are built apart.
- The gameplay switches interact with work already scoped elsewhere and the ordering matters. Disabling build costs presumes costs exist again, which is the legibility request's construction slice. Instant construction presumes the construction stage the same slice shortens. Neither switch should be built before the thing it switches.
- Hardcore's home is settled by this request rather than by the run-panel request, which had scoped it to 'where a run begins'. A Gameplay section in settings is the more specific answer and supersedes that wording; the panel request's slice should carry the note rather than both moving it.
- The interface slice's rule that the settings menu contains nothing a player needs during a wave is satisfied by this section rather than strained by it: pacifist mode, instant construction and free building are all chosen before or between runs, never mid-attack.
- A pacifist switch is a real mode, not a debug flag. city-jump is a city builder first, and a player who wants to draw a city without a clock running against it should be able to -- with the run economy that depends on waves simply not accruing, said plainly rather than silently broken.
- Keeping the harness honest matters more than keeping it short: it must drive the same rules the game drives, from the same entry points, with no test-only shortcut through a decision the player has to make. A harness that has its own copy of a rule proves nothing, which is the defect `scripts/balance.mjs` already demonstrates.

# Acceptance criteria
- AC1: A headless harness plays a run from arrival through the first roads, the first zones, parcels rising and the needs moving, up to the first wave, and fails when any of those steps stops being possible.
- AC2: The harness can build what the needs say to build, so the gauges are exercised as an instrument rather than only read -- and if following them does not produce a surviving city, that is reported as a finding rather than worked around.
- AC3: The first wave is played in three shapes -- the kaiju destroys everything, about half, or nothing -- and each has a stated consequence the harness asserts, including what the city can still do afterwards.
- AC4: When a wave arrives is driven by threat the city generates rather than by a fixed sixty seconds, so sprawling and consolidating are priced differently.
- AC5: The military a city can afford, staff and place by its first wave is measured against the kaiju it must beat, across seeds, and the gap is reported rather than assumed.
- AC6: The settings menu has a Gameplay section.
- AC7: The hardcore setting lives in that section instead of on the play screen.
- AC8: A switch turns off the kaiju spawn, making a pacifist city builder, with whatever depends on waves stated plainly rather than silently inert.
- AC9: A switch makes construction instant, and a separate switch removes build costs.
- AC10: The gameplay switches are carried with the run and honoured by the headless harness, so a scenario can be played with construction instant, costs off, or no kaiju.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_023_a_game_that_plays_itself_once_before_anyone_believes_it`
- Architecture decision(s): (none yet)

# References
- src/sim/graph.ts
- src/sim/zones.ts
- src/sim/slots.ts
- src/sim/buildingLifecycle.ts
- src/sim/economy.ts
- src/sim/buildingKinds.ts
- src/sim/wave.ts
- src/sim/kaiju.ts
- src/sim/batteries.ts
- src/sim/run.ts
- scripts/balance.mjs
- scripts/interact.mjs
- index.html
- src/ui/controls.ts
- logics/architecture/adr_002_keep_simulation_independent_from_babylon_and_the_browser.md

# Backlog
- `item_088_a_harness_that_plays_a_run_from_arrival_to_the_first_kaiju`
- `item_089_a_threat_the_city_generates_and_a_military_that_is_measured_against_it`
- `item_090_a_gameplay_section_in_settings_hardcore_pacifist_instant_build_free_build`
