## req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes - The loops that never close: a run of one wave, a city that starves on day one, and resources nothing consumes
> From version: 0.3.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:34:33

# AI Context
- Summary: The connective pass on the survival direction: a run that schedules more than one wave, a threat that scales with the city, a starting city that can staff a building instead of starving, resources that are spent, and one notion of need.
- Keywords: loops, never, close, run, wave, city, starves, day, resources, nothing, consumes
- Use when: Working on the wave schedule, the threat, the run loop, the workforce and food rules, the resource stocks, or the zone limits.
- Skip when: You need what a wave looks like while it happens, which is the legibility request.

# Needs
- The seven slices delivered against the survival brief each work on their own and do not join up into the loop the brief describes. A run is one wave long, the starting city dies in its first simulated day, and two of the resources it produces feed nothing. None of that is visible from any single slice's acceptance criteria, which is why it survived seven closeouts.
- A run is one wave long. `finishWave` sets a verdict and nothing ever clears it: `updateWave` returns on that verdict every frame afterwards, `resetWave` is only reachable from loading a city or from the debug API, and `nextWaveAtSeconds` is never advanced past the first sixty seconds. `settleWave` dutifully increments `runState.wave`, and no second wave is ever scheduled to match it. The brief's spine -- a city that grows, holds its waves, and at some point cannot hold another -- has no second wave to fail to hold.
- The threat is a constant. `advanceWaveClock` sets `threat` to `WAVE_STARTING_VALUES.kaijuHitPoints`, the same six hundred every time, derived from nothing about the city. The brief's rule that the threat scales with the city -- which is what prices growth and makes consolidating a real choice -- is not implemented anywhere.
- A wave cannot be called early. `finishWave` passes `calledEarly: false` as a literal, so `EARLY_WAVE_SCIENCE_MULTIPLIER` can never apply. The multiplier is tested and unreachable, and the half of `req_028` AC1 that depends on it describes behaviour the game does not have.
- The starting city cannot survive its first day, and the numbers are not close. The starting population is twelve, so the workforce is six. The smallest parcel any farm is allowed to occupy is 1x4 -- agricultural, industrial and military are all restricted to `INDUSTRIAL_SIZES`, whose smallest member is four cells -- and a 1x4 farm demands twelve workers. Nothing in a new city can be staffed by anybody. Running the real modules over the starter kit's own parcels gives `staffed=0`, no food produced against twelve consumed, and a population that reaches zero inside one simulated day of ninety-six seconds. The starter kit is described as the few buildings that make the first minutes possible; it is a city that ends the run.
- Materials are produced and nothing consumes them. `CityEconomy.advance` accumulates them, `save.ts` persists them, the ledger prints them, and no rule anywhere reads the stock. Industrial parcels demand six workers a cell -- the second-highest cost in the game -- to fill a number that only ever goes up.
- Services are counted three times from one calculation. `servicesProduced` is added to the services stock, used as the term that drives population growth, and returned as `trade`, while `incomePerSecond` separately pays for the same commercial parcels. One number is a stock, a growth rate and an income at once, which makes commerce the only lever with a real effect and pays it several times over.
- A painted military zone can never produce a building. `parcelsForDemand` sets the military limit to zero, and any parcel whose cells carry a zone is filtered against it, so a zoned military parcel is dropped at every population -- verified at twelve and at four hundred. Military parcels only ever arrive from a military *road*, whose unzoned cells return before the limits are consulted. The zone brush paints five businesses and four of them build.
- The gauges and the growth rules are two unrelated notions of need. `buildingNeeds` -- what the needs panel shows -- is derived from workforce staffing ratios. What actually decides whether a zoned parcel is allowed to appear is `parcelsForDemand`, a separate set of population thresholds. A player reading the panel to decide what to build is reading something that gates nothing, which is the exact complaint the survival brief opens with about the game before it.

# Context
- Every finding here was measured by running the real modules rather than read off the source: the staffing, the day-by-day population collapse, and the military filter were all executed against `src/sim/workforce.ts`, `src/sim/economy.ts` and `src/sim/slots.ts` before being written down.
- This request is deliberately separate from `logics/request/req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks.md`. That one is about what the player sees during a wave; this one is about loops that do not close. They touch some of the same files and neither depends on the other, but a wave that is legible and still the only one is not the game the brief describes.
- The wave scaling in this request and the combat retune in the legibility request are the same numbers seen from two sides. Whichever runs second inherits the other's constants, and the balance harness -- which the legibility request rewrites onto the real simulation -- is the only way either can be checked.
- The starving start has more than one possible fix and the cheapest is not obviously the right one: lower the minimum parcel size for farms, raise the starting population, raise the workforce fraction, or let a parcel run partly staffed instead of all-or-nothing. The all-or-nothing rule in `allocateWorkforce` is what turns a shortfall of one worker into a building that produces nothing, and it is worth pricing before reaching for the constants.
- Materials have two honest answers and choosing is the work: give them a sink -- construction, rebuilding after a wave, batteries -- or stop producing them and take industrial back out until there is something to spend them on. Carrying a resource nobody consumes is the worse of the two.
- The military zone is the sharper of the two zone problems: the survival brief is explicit that defence is bought by urbanism and that the military parcels growing along a military road *are* the towers. Whether a painted military zone should also build, or whether the road is meant to be the only route, is a product decision this request has to settle rather than assume.
- Nothing here asks for a new system. Every defect is a rule that exists and does not connect to the rule beside it, and the fixes are connections: a verdict that schedules the next wave, a threat derived from the city that is already counted, a sink for a stock that is already produced, one notion of need instead of two.

# Acceptance criteria
- AC1: A finished wave schedules the next one, so a run is a sequence of waves rather than a single verdict the game never leaves.
- AC2: The threat is derived from the city and the wave number rather than being a constant, and stays fixed once a wave has started.
- AC3: A wave can be called early, which makes the science multiplier that already exists reachable from the game.
- AC4: A new run can be staffed and fed: the starter kit's own parcels are within reach of the starting workforce, and a fresh city does not fall to zero population in its first simulated day.
- AC5: Materials are consumed by something, or they stop being produced, persisted and displayed as a resource.
- AC6: Commercial output is counted once -- no single calculation is simultaneously a stock, the growth driver and an income.
- AC7: The zone brush's five businesses all build, or the ones that do not are refused for a stated product reason rather than by a limit of zero.
- AC8: The needs the interface shows and the rules that gate construction are one notion of need, so a player reading the gauges is reading what actually decides.
- AC9: Every rule this request changes is proven by a headless test over the real simulation, and a full run of several waves is playable end to end.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)

# References
- src/sim/wave.ts
- src/sim/run.ts
- src/sim/economy.ts
- src/sim/workforce.ts
- src/sim/slots.ts
- src/sim/buildingKinds.ts
- src/app/app.ts
- src/ui/ledger.ts
- logics/product/prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea.md
- logics/request/req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows.md
- logics/request/req_028_runs_science_and_prestige_leaving_an_island_with_something.md

# Backlog
- `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`
- `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`
- `item_084_resources_that_something_spends_counted_once`
- `item_085_a_military_zone_that_builds_something`
