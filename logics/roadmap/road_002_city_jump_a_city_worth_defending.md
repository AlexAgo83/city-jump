## road_002_city_jump_a_city_worth_defending - city-jump: a city worth defending
> Date: 2026-08-31
> Status: Active
> Related product: `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
> Related request: `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-08-31 22:59:27

# AI Context
- Summary: Eight ordered slices that turn a city editor into a game with something at stake. The
  order is deliberate and it is a risk order, not a feature order: the thing nobody knows -- whether
  a wave is worth watching -- is built first, crudely, and everything after it serves a loop that
  has been seen working.
- Keywords: roadmap, slices, kaiju, economy, workers, money, utilities, runs, prestige, interface
- Use when: Deciding what to work on next, or placing a new request chain against the shape of the
  project.
- Skip when: You need execution detail for a single backlog item or task.

# Summary
`road_001_city_jump_playable_city` grew a road-drawing prototype into a city that could be drawn,
read, saved and shared. It succeeded, and it left the city with nothing at stake: every zoned
parcel filled on sight, every building worked with nobody in it, and four gauges gated nothing.

This roadmap is the direction `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea` and
`prod_019_an_interface_for_a_city_you_can_lose` describe: a city builder whose city is attacked at
intervals by a kaiju out of the sea, defended by the military district the player built instead of
another farm, played in runs that end by evacuation and carry science to the next island.

Unlike its predecessor, this roadmap **is** a sequence. The strands of `road_001` stay open and
are still where maintenance and craft work belong; these eight slices are ordered, and the order
is the point.

# Milestones
## 1.0 - The wave, watched
- Chain: `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
- Goal: find out whether a wave is worth watching, before anything is built to serve one.
- Scope: a countdown, a kaiju that lands at a random coast and walks at the nearest building,
  military parcels that fire missiles on a reload, destruction that leaves rubble, and a banner
  that says held or breached. Hardcoded numbers, no economy, no run.
- Exit signal: a wave can be watched end to end, and the answer to "is this worth building a game
  around" is a yes or a no somebody has seen.

## 2.0 - The clock is the player's
- Chain: `req_022_give_the_player_the_clock_pause_play_and_speed`
- Goal: give the player the time controls the rest of the game assumes.
- Scope: pause, play, x2, x4; the day running at that rate; the sun slider demoted to a
  paused-only control. Everything already moves on elapsed time, so this is controls and plumbing.
- Exit signal: a city runs the same distance per second at every speed, and the game is fully
  playable paused.

## 3.0 - Nothing works without people
- Chain: `req_023_nothing_works_without_people_staffing_construction_time_and_building_states`
- Goal: the keystone -- make a building something that can be standing and doing nothing.
- Scope: every non-residential parcel needs workers from one shared stock; staffing is binary;
  buildings take time to go up; the map shows construction, idle and rebuilding without a panel.
- Exit signal: turning half a district off by over-staffing another is visible in the city itself.

## 4.0 - Money, and the queue
- Chain: `req_024_money_and_the_queue_what_a_city_can_afford_to_build`
- Goal: meter what gets built, as distinct from what runs.
- Scope: roads priced by the metre, buildings priced to build; the city raises what it can afford
  and queues the rest; rebuilding may go negative and only new work waits; demolishing takes time
  and returns half; prices shown before the click.
- Exit signal: a player can say why they cannot build the thing they want -- no money, or nowhere
  to put it.

## 5.0 - A city that has to be fed
- Chain: `req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
- Goal: the districts stop being decoration and start owing each other something.
- Scope: farms produce food and food gates population; industry produces materials; commerce
  produces services and trade; a population that grows over time within what the city can feed and
  staff; parcels that wait for demand instead of filling on sight.
- Exit signal: a city of nothing but housing stalls, and the ledger says why.

## 6.0 - Power and water
- Chain: `req_026_power_and_water_a_producer_a_diffuser_and_what_they_reach`
- Goal: the second placement verb, and a second thing to plan.
- Scope: a producer and a diffuser the player places; power and water carried by road segments; a
  district that needs one, the other or both; the Utilities view; a district going dark when its
  diffuser falls.
- Exit signal: a wave that destroys one building can put a quarter of the city out of action, and
  the player can see exactly why.

## 7.0 - The interface the wave demands
- Chain: `req_027_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`
- Goal: move game state out of the settings menu and give the loop its screen.
- Scope: the wave banner, the time controls in their place, the compact city strip, the ledger
  behind the gauges, the State view, the alerts, the edge glow. `prod_019` end to end.
- Exit signal: a player who has not touched the game for a minute can tell whether a wave is near
  and whether they are ready, without clicking anything.

## 8.0 - Runs, science and prestige
- Chain: `req_028_runs_science_and_prestige_leaving_an_island_with_something`
- Goal: close the loop the whole thing exists for.
- Scope: science left by a defeated kaiju, evacuation as a decision, the panels that open and
  close a run, the first upgrade web, the hardcore option that deletes the save, and the balance
  harness that turns every constant into an output.
- Exit signal: the median run ends in evacuation rather than destruction, measured across seeds
  rather than felt.

# Risks
- **The first slice answers a question that can be answered no.** If a wave is not worth watching,
  seven of these eight are wasted -- which is exactly why it is first and why it is hardcoded.
- **The economy is four constraints deep** (workers, money, food and materials, power and water)
  and each one added on its own is legible; all four at once is not. They are separate slices for
  that reason, and each has to be playable alone.
- **This is a much bigger game than the one that exists.** The slices are ordered so that stopping
  after any of them leaves something coherent, because stopping is a real possibility.
- **The interface arrives at 7.0, after four slices have added things to read.** That is
  deliberate -- laying out a screen before knowing what goes on it is how a screen gets laid out
  twice -- but it means slices 3 to 6 will be played with a temporary readout.

# Success signals
- A run can be lost, and the loss is explicable: the player can point at the number that was too
  small before the wave landed.
- Every balance constant traces to a harness run rather than to somebody's judgement on the day.
- The simulation runs headless from a fixed seed and produces the same city, waves included.
- The frame rate through a wave stays inside the budget `docs/performance.md` records.

# References
- Product: `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea` (the game),
  `prod_019_an_interface_for_a_city_you_can_lose` (the screen).
- Superseded roadmap: `road_001_city_jump_playable_city` -- its six strands stay open as the place
  maintenance and craft work belong; sequencing moved here.
- Architecture: `adr_001_keep_the_road_graph_as_the_source_of_truth`,
  `adr_004_stay_a_static_client_with_no_server_of_its_own`.
