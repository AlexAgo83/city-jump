## req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks - A wave you can read: a kaiju that crosses the city, missiles you can watch, and spending that never blocks
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:47:25

# AI Context
- Summary: The correction pass on the attack slice: a kaiju that keeps choosing targets, missiles that fly and explode where the damage lands, a fight long enough to read, a visible construction, and building costs that are deducted without ever refusing a build.
- Keywords: wave, you, can, read, kaiju, crosses, city, missiles, watch, spending, never, blocks
- Use when: Working on the wave loop, the kaiju's targeting, missile rendering, wave balance, the construction readout, or building prices.
- Skip when: You need the original attack slice's design rather than its corrections, or the run and prestige economy above it.

# Needs
- A manual test of the first wave found the attack is over before it is legible. The kaiju lands, walks to one building, and the wave ends -- `updateWave` in `src/app/app.ts` calls `finishWave("breached")` on the first parcel inside the 25 m destruction radius. The player sees a monster arrive and a banner appear. There is no attack to watch, no city crossed, and no decision taken during it.
- Underneath that, the kaiju's route is decided once and never revisited. `planKaiju` in `src/sim/kaiju.ts` returns `landing -> coast -> target` with the target picked from the building positions at wave start, and `kaijuPositionAt` walks that fixed polyline forever. Even with the end-of-wave rule fixed, the monster would stand on a destroyed parcel for the rest of the wave. What the design needs is a loop: nearest living building, walk, attack until it falls, pick the next.
- That loop is also the prerequisite for the bait the product brief already promises. Sacrificing a building to bend the kaiju's path is only a strategy if the kaiju chooses again after each kill.
- The military answer is not visible either. `src/render/missiles.ts` draws a `LineSystem` from each battery straight to the kaiju the instant the salvo fires, disposes and recreates the whole mesh every frame, and freezes `to` at the position the kaiju held when the shot left -- so by the time the damage lands the yellow line is pointing at empty ground. The intent is missiles leaving the city, arcing through the sky and coming down on the monster; what exists is a wire.
- The simulation is honest and the rendering is not, which is the one gap worth naming precisely. `updateWave` already holds each missile until `impactAt` and only then subtracts its damage, so the health bar already drops on impact rather than on launch. Nothing about the damage timing needs inventing: the work is making the picture agree with the arithmetic that is already correct.
- The fight is far too short even when it is allowed to run. The kaiju has 600 hit points; a single 4x3 military parcel yields a battery doing 144 damage a salvo, and the reload is 2.5 seconds. Four salvos, ten seconds, and a well-defended first wave is over before the player has found the monster on screen. The fix is the whole set of numbers -- hit points, damage per cell, reload, wave scaling -- not the hit points alone.
- There is no way to check that any new balance is right. `scripts/balance.mjs` imports nothing from `src/`: it invents a defence score as `0.44 + rnd() * 0.42` and writes the distribution of that to `balance/history.jsonl`. `req_028_runs_science_and_prestige_leaving_an_island_with_something` AC6 cites that file as proof of the run distribution, so that acceptance criterion currently rests on a random number generator. A target of twenty to forty seconds of combat is not verifiable until the harness runs the real wave.
- Construction is invisible. `BUILDING_STAGE_SECONDS` is 60, and for all sixty of them `buildingStateScaleY` returns a flat 0.28 -- the building is a stub at a fixed height, then it is finished. Nothing rises, nothing reads as a site, and selecting the parcel says only "Construction". The player cannot tell a building going up from one that is broken.
- Buildings cost nothing to build. `e1567fa` ("Make money road-only") removed `buildingBuildCost`, the funding queue and the demolition refund, which were AC1, AC2 and AC3 of `req_024_money_and_the_queue_what_a_city_can_afford_to_build` -- a request still recorded as Done at 100%. The queue is not wanted back: refusing to build was a soft-lock, and a player who cannot build cannot recover. The price is. Spending should be counted and allowed to go negative, so money is a reading of the city's health rather than a gate on playing it.
- That removal left dead branches behind it. The `waiting` state in `src/sim/buildingLifecycle.ts` is now unreachable -- `sync` maps every unknown parcel straight to `rising` -- while `src/render/buildings.ts` still paints a colour for it, `stateLabel` in `src/ui/hud.ts` still names it, and the money tooltip still reports a waiting count that is always zero.

# Context
- Everything here is a correction to systems that already exist. The wave clock, the kaiju plan, the battery model, the missile flight time, the building lifecycle and the treasury are all in place and all tested; nothing in this request wants a parallel mechanic beside one of them.
- `Treasury.spend` already takes an `allowDebt` flag and already lets the balance go below zero when it is set. Allowing debt is a matter of how it is called, not of new machinery.
- `src/sim/kaiju.ts` is pure and Babylon-free by `adr_002_keep_simulation_independent_from_babylon_and_the_browser`, and `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not` AC5 pins that: the retargeting loop must stay replayable from a seed with no renderer, which also makes it the part a test can hold.
- The building states are only recomputed when `syncBuildings` runs, which outside an edit means the twenty-second demand step in `advanceClock`. A construction readout that shows a percentage and a countdown needs the progress derived from `startedAt` and the current time at read, not a state that is only refreshed three times a minute.
- The destruction path itself is fine and should be kept: `rubble.destroy`, `buildingLifecycle.rebuild`, the dirty-box repaint. What is missing before it is a duration -- the kaiju attacking a building for some seconds -- because instant destruction on contact is what makes both the loop and the bait unreadable.
- A wave that no longer ends on the first loss needs a rule for when it does end. The deliberately simple one: the wave is held when the kaiju's hit points reach zero, and breached when it has destroyed the last living building. Time limits, morale and partial verdicts are all richer and all out of scope here.
- The missile trajectory is meant to be stylised, not ballistic: a strong near-vertical climb over the first quarter of the flight, travel at altitude through the middle, and a fast dive over the last third. The flight time already exists as `missileTravelSecondsAtRange` scaled by distance, so the arc is a function of the progress between launch and `impactAt` rather than a new physics step.
- Salvos are currently perfectly synchronised because one `nextSalvoAt` gates every battery. Giving each battery its own small offset is what turns a salvo into several launches.
- This request deliberately adds no new resources: no construction materials, no build crews, no debt interest, no maintenance penalties, no reduced services while negative. Those consequences are named in the product brief as later work and stay there.

# Acceptance criteria
- AC1: A wave no longer ends when the first building falls: it is held when the kaiju dies, and breached when the last living building is destroyed.
- AC2: The kaiju picks the nearest living building from where it currently stands, walks to it, and picks again after each kill, for as long as it is alive -- a loop, not a route fixed at wave start.
- AC3: Destroying a building takes time rather than happening on contact, so the attack is something the player can watch and interrupt.
- AC4: Batteries launch visible missiles that climb, travel and dive onto the kaiju, with a trail and a short impact explosion, and several batteries no longer fire as one perfectly synchronised salvo.
- AC5: Damage still lands at the moment of impact and the impact is drawn where the damage is applied -- the health bar and the explosion agree, on a kaiju that has moved since the shot left.
- AC6: A first wave against a competent defence lasts roughly twenty to forty seconds and takes five to eight significant salvos, reached by revisiting hit points, damage, reload and wave scaling together.
- AC7: `npm run balance` runs the real wave simulation from `src/` rather than an invented defence score, so the combat-duration target is a measured number and `req_028_runs_science_and_prestige_leaving_an_island_with_something` AC6 stops resting on a random number generator.
- AC8: A building under construction visibly rises over its stage, reads as a site rather than as a finished building, and when selected shows its progress and the time it has left -- the same for a rebuild after a wave.
- AC9: Buildings cost money to build and the cost is deducted, but a shortfall never refuses construction: the balance may go negative and nothing is blocked by it, roads included.
- AC10: The states and readouts left unreachable by the earlier money removal are gone or reachable again, with no branch painting a state that cannot happen.
- AC11: The frame budget survives a wave: this request adds per-frame missile geometry, a building
  that rises over its stage, a live progress readout, and a kaiju whose destruction triggers a region
  rebuild per building. `docs/performance.md` is the budget every slice is measured against, and the
  figure recorded is for a wave rather than for a single road placement.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)

# References
- src/sim/kaiju.ts
- src/sim/wave.ts
- src/sim/batteries.ts
- src/sim/buildingLifecycle.ts
- src/sim/economy.ts
- src/render/missiles.ts
- src/render/kaiju.ts
- src/render/buildings.ts
- src/ui/hud.ts
- src/app/app.ts
- scripts/balance.mjs
- logics/request/req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not.md
- logics/request/req_024_money_and_the_queue_what_a_city_can_afford_to_build.md
- logics/request/req_028_runs_science_and_prestige_leaving_an_island_with_something.md

# Backlog
- `item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building`
- `item_079_missiles_that_fly_and_explode_where_the_damage_lands`
- `item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it`
- `item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game`
