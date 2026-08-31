## prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea - A city that has to survive what comes out of the sea
> Date: 2026-08-31
> Status: Proposed
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-31 22:28:50

# Overview
city-jump can draw a city and cannot lose one. Every zoned parcel fills the instant it is drawn,
every building works without anyone in it, and the needs panel shows four gauges that gate
nothing. This brief is the direction that makes the city matter: a **city builder whose city is
attacked**, at intervals, by a kaiju that comes out of the sea, and whose defence is the military
district the player chose to build instead of another farm.

The genre is a city builder first. Defence is not a second game bolted to the side: the military
buildings that already grow along a military road **are** the towers, so the player defends the
city by urbanising it -- by deciding where a military road runs, and how much of the workforce
stands behind a gun instead of a plough. Placeable turrets would make this a tower defence with a
city painted on it, and the two halves would stop speaking to each other.

An island is a run. The city grows, holds its waves, and at some point cannot hold another: the
player evacuates to the next island and starts again with what they earned. Leaving is a decision
rather than a defeat screen -- leave early and the island is wasted, leave late and it is lost with
you -- and the coastline is the natural ceiling on how big a city can get before that choice
arrives, so no artificial cap is needed.

What is carried over is **science**, and a wave is the only place it comes from. The thing that
destroys the city is the only thing that makes the next one stronger, so a player who never lets a
wave land never progresses, and one who lets too many land has nothing left to leave with. That
tension is the game's spine, and every other rule here serves it.

Nothing in the attack needs a new representation. A kaiju walks a path the way a car does, destroys
the way the bulldozer does, and the destruction repaints the region it touched through the
dirty-box rebuild that already exists. What is missing is not geometry: it is **scarcity**, and two
things that meter it -- money, which decides what can be built, and the workforce, which decides
what actually runs.

```mermaid
%% logics-kind: product
%% logics-signature: product|a_city_that_has_to_survive_what_comes_out_of_the_sea|generated
flowchart TD
    Workers[("Workforce<br/>what runs")] --> Farm[Agricultural]
    Workers --> Industry[Industrial]
    Workers --> Commerce[Commercial]
    Workers --> Military[Military]
    Money[("Money<br/>what gets built")] --> Build[Zoning and placing]
    Build --> Farm
    Build --> Industry
    Build --> Commerce
    Build --> Military
    Build --> Utility[Utilities<br/>producer, network, diffuser]
    Utility -->|power and water in range| Farm
    Utility -->|power and water in range| Industry
    Utility -->|power and water in range| Commerce
    Utility -->|power and water in range| Military
    Utility -->|water in range| People[Residential<br/>population]
    Farm -->|food| People
    People -->|workers| Workers
    People -->|taxes| Money
    Commerce -->|trade| Money
    Industry -->|materials| Military
    Industry -->|materials| Commerce
    Commerce -->|services: how fast the city grows| People
    Military -->|defence| Survival{Wave}
    People -->|"population sets the threat"| Survival
    Survival -->|held| Science[("Science<br/>only a wave gives it")]
    Survival -->|breached| Ruins[Buildings destroyed<br/>rebuilt over time, unusable meanwhile]
    Ruins --> People
    Science -->|carried off the island| Prestige[Prestige<br/>persistent upgrades]
    Prestige --> Island[Next island<br/>a new run]
    People -->|"reaches zero"| Over[Game over]
```

# Goals
- A building standing empty is a building that does nothing: every non-residential parcel needs
  workers to operate, and the workforce is one shared stock every district competes for.
- Proportion is the game. The player is always tempted to under-build the military, because every
  barracks is a farm or a works not built -- and the wave is what prices that choice.
- The threat scales with the city, so growing is a decision rather than a free good, and it is
  fixed at the start of a wave so the player can choose to consolidate instead of expand.
- A wave is legible before it lands: the player sees the threat and their own defence as two
  numbers, and loses to arithmetic they could have read, never to a surprise.
- Defence is bought by urbanism -- where a military road runs, and what the workforce is doing --
  not by placing turrets on a map.
- The city survives its own destruction: the graph, the saves and the undo history stay coherent
  when a wave removes roads and buildings.
- Two meters, two different pressures: money decides how much can be **built** before the next
  wave, the workforce decides how much of it **runs**. Neither substitutes for the other.
- Leaving is played, not suffered. Evacuating to the next island is a choice with a price on both
  sides of it, and what the player carries over is what they earned by staying as long as they did.
- Utilities are a second thing to plan, not a second tax: power and water reach what a diffuser
  covers, and what needs them differs by district.
- The player owns the clock. Pause, play, x2 and x4, and the city's day runs at whatever rate is
  chosen -- so a wave can be watched, and the time between two of them can be skipped.
- A wave is worth surviving *and* worth having: it is the only source of science, and science is
  the only thing that leaves the island.
- Losing a building costs time rather than permanence -- it rebuilds itself, and does nothing
  while it does, which is a hole in the economy exactly where the kaiju walked.

# Non-goals
- Anything money is not: wages, prices that move, a market, a budget the player balances. Money
  here is one number that says how much more can be built before the next wave, and nothing else.
- Special buildings of any kind, military included. They come once the ordinary districts carry
  the loop.
- Building upgrades, tiers, or levels.
- A prestige tree, a shop, or anything else that spends what a run earns. Runs and their carried
  bonuses are the direction; what the bonuses are, and how they are chosen, is a slice of its own
  and none of it is scoped here.
- A free-form buried utility network with its own graph, its own drawing tool and its own view.
  Option B below is kept, deliberately, and is not the first version.
- Placeable turrets, walls, or any defensive object the player positions directly.
- Multiple simultaneous threats, or a threat that is not the kaiju.
- Workforce allocation by proximity. The first version draws from one global stock; recruiting
  along the road network is a much better rule and it makes roads an economic variable, which is
  worth having once the loop stands up.

# Scope and guardrails
- In: the workforce constraint, money as the build meter, the resources (food, materials, services,
  power, water, science), a population that grows over time within what the city can feed and
  staff, parcels that wait for demand instead of filling on sight, buildings that take time to go
  up and to come back, a wave clock, a kaiju that lands and destroys, military parcels that defend
  within a range, the time controls the player runs all of it at, an evacuation that ends a run,
  and the readouts that make all of it legible.
- The sun stops being a slider the player drags while the city runs: the hour follows the
  simulation clock, and the slider becomes a way to set it while paused.
- The road graph stays the only authored state (`adr_001`). Population, stocks and staffing are
  derived simulation state, saved alongside it, never a second source of truth for the city.
- Simulation rules stay deterministic and free of Babylon and browser APIs, testable without a
  renderer -- the same seam that lets `buildingNeeds` be a pure function today.
- The player's history covers the player's actions. A wave's destruction is the world acting, and
  undo does not take it back.
- A run's city and the profile that outlives it are separate saves. The city keeps being the road
  graph and its derived state; what carries to the next island never lives inside it.
- Out: everything in the non-goals, and any server-side anything (`adr_004` stays settled).

# Key product decisions
- **Military buildings are the defence.** They already grow along a military road; they gain a
  range and a rate of damage rather than being replaced by a placed object.
- **Workers are the keystone, and staffing is binary.** A parcel is staffed and works, or it is
  not and does nothing. Partial output would be more realistic and less readable, and readability
  is what lets a player act on a proportion.
- **Each district has one job in the loop.** Agriculture decides whether the population *exists*
  (food), commerce decides how fast it *grows* (services), industry supplies the military and the
  shops (materials), and the military produces nothing the economy can use -- it is a pure cost,
  which is precisely what makes under-building it tempting.
- **The threat is indexed on population**, fixed at the start of each wave, and grows more slowly
  than the city does, so a well-run city gets ahead instead of running on a treadmill.
- **Destruction is real, and temporary.** The kaiju destroys what it touches; the city rebuilds
  what was destroyed on its own, and a building under reconstruction is as useless as one under
  construction. The cost of a wave is downtime and lost production in the district it crossed, not
  a permanent hole in the map.
- **Rebuilding costs time and a quarter of the price.** Not free, so a wave through a dense
  district is felt in the budget as well as the clock; not full price, so a bad wave does not
  bankrupt a city that was already short -- which is the spiral this rule exists to avoid.
- **Science comes from waves, and only from waves.** A wave leaves science behind; science
  carried off the island becomes prestige, and prestige buys persistent upgrades on a web the
  player spends between runs. Nothing else in the game produces it.
- **Barracks fire missiles, at range, on a reload.** Not damage applied while the kaiju stands in
  a circle: that model only has one answer, which is a belt of barracks around the whole island,
  and a belt is uniform and expensive and decides nothing. A long range with a travel time lets
  two or three military clusters cover an island, and a reload makes the damage discrete -- which
  is what makes a battery readable while it fires, and what gives an upgrade two separate things
  to improve later. The missile always hits: a chance to miss would make the banner's promise,
  threat against defence, a lie.
- **You do not defend a perimeter, you defend an approach.** The kaiju lands slowly and walks at
  whatever building is nearest, so the player decides its path by deciding what they leave closest
  to the coast -- and the time it takes to reach anything worth destroying is the window the
  batteries fire in. A city set back from the shore buys itself that window; one built onto the
  beach is hit before it has fired three salvoes.
- **Bait is a strategy, not an exploit.** A cheap building left on a far coast draws the kaiju
  across the island and through whatever is waiting for it. Sacrificing a barn to walk a monster
  three kilometres under missile fire is exactly the kind of decision this game should reward, and
  it is the reason the "call it early" button has a partner: call when the bait is placed and the
  battery is loaded.
- **The kaiju walks, it does not hunt.** It arrives from the open sea at a random edge of the map
  -- anywhere but the bridge -- makes for the nearest point of the coast, and from there for
  whatever building is nearest to it, destroying on contact. It is enormous and slow. Slowing it
  or turning it aside is what technologies are for, later.
- **A run ends two ways.** The player evacuates, or the population reaches zero and it is over.
  There is no third: the point of evacuating is to leave before the second one happens.
- **The threat rises with the city.** Waves come with a threat level that follows the population,
  which is what makes growth a decision rather than a free good -- and what makes securing growth
  the thing the player is actually playing.
- **A wave can be called, and only winning pays.** A button asks the kaiju to come early; calling
  it multiplies the science a *defeated* kaiju leaves. Lose and the call was free bravado -- which
  is what makes it a decision rather than a button the player mashes. It is the one place the
  player sets the pace of their own danger.
- **Population lives in buildings.** Each home holds a share of the residents, so a home destroyed
  is that share gone -- the kaiju does not kill an abstract number, it walks through the place
  those people lived. The other way population falls is food: too little for too long and it
  declines, which is the slow failure to the destruction's fast one.
- **No equilibrium is free.** Every fix unbalances something else: a farm wants workers, workers
  want homes, homes want food. A city *can* be brought into balance -- that is the reward for
  playing well -- but a balanced city earns no science, so standing still is losing slowly. The
  pressure comes from wanting to progress, not from gauges nagging at a player who has already
  solved their city.
- **Placing a building costs money, resources to run it, and time to raise it.** Nothing appears
  finished. That third cost is what settles a question the interface would otherwise have to:
  building during a wave is allowed, because a barracks ordered when the kaiju lands is a
  building site when it arrives. The clock guards the exploit, not a rule.
- **Saving is free, and a hardcore mode is where it is not.** This is a solo game and reloading
  before a bad wave is the player's business -- but the risk economy only means something if the
  risk is real, so the option that deletes the save on defeat is kept in view rather than argued
  about. It is one setting, and it is the honest version of the game.
- **The player watches a wave, for now.** Everything they could have done, they did before it
  landed: where the military district is, what is staffed, what the coast looks like. Acting
  during an attack is a later question, and it is written down as one rather than assumed away.
- **An island is a run, and the coast is the cap.** There is no rule limiting how big a city may
  get: the buildable land runs out, the waves keep growing, and evacuating to the next island is
  how a run ends and the next one starts richer.
- **Money gates building, workers gate running.** Money comes from taxes on the population and
  from trade in the commercial district -- which is what finally makes commerce a job rather than
  an abstract growth multiplier.
- **Utilities are placed, defence is not.** A producer and a diffuser are buildings the player
  positions; the diffuser covers a radius, and a building inside it is supplied. This is the
  second placement verb in the game, and the only one -- turrets remain out.
- **The utility network follows the roads (option A).** Carrying power or water is a property of
  a road segment, not a second graph: it saves with the city, it needs no new drawing tool, and it
  makes the road network the thing that structures the city twice over. Option B -- a free-form
  buried network with its own graph -- is kept in reserve for when running along roads proves too
  constraining in play, and is a slice of its own if it ever arrives.
- **The road proposes, the brush disposes.** Land use has two mechanisms today -- a road type
  decides the working districts, a brush decides housing and shops -- and the player has to guess
  which one applies where. One rule replaces both: a road type gives its frontage a **default**
  business, and the brush can **override** any cell, for any of the five. Painted wins where it is
  painted; the road decides everywhere else.

  The obvious objection is that painting military anywhere makes defence cheap to place, which is
  what turrets were rejected for. It does not, because the cost moved: a barracks needs money to
  build, and workers and power to *work*. Painting is easy; running is not. What this buys is both
  halves -- a dirt track through the fields still grows farms on its own, and a player watching a
  kaiju come in from the north-east can zone that coast without first routing a military road to
  it.
- **Not every district needs every utility.** Housing and farms want water, industry and the
  military want power, commerce wants both. Four ways to be switched off is tedious; a district
  that needs two of them is a planning puzzle.

# How a run opens
A run starts at the bridge, with a road running inland to a starter kit -- the few buildings that
make the first minutes possible. From there the player follows the gauges: the strip says what the
city is short of, and building that is the next move. There is no tutorial and there is no
scripted sequence; the readout that will guide the player for the whole game is the one that
guides them at the start.

That places a demand on the interface rather than on the player: what is short has to be **one
thing at a time and in the right order** -- a slot that says "food, then workers" teaches, and one
that lists four shortages at once teaches nothing.

# The first upgrade web
A first cut, to be replaced once a run has been played rather than defended. What matters more
than the nodes is the rule they follow: **prestige buys capabilities, starting conditions and
information -- not multipliers on the scarcities the loop is made of.** A node that adds workers
per home, or food per farm, dissolves the tension one purchase at a time; a node that tells the
player where the kaiju will land changes what they decide without changing what anything costs.

- **Survey** -- what a run starts with. More credits to open with. A stretch of road already
  drawn. And, best of the three, knowing which coast the next kaiju makes for one wave ahead.
- **Engineering** -- what the city does between waves. Buildings go up faster. Rebuilding costs
  15% instead of 25%. A diffuser covers more ground.
- **Defence** -- what a wave costs. Military buildings reach further. The kaiju slows while inside
  a military district's range, which is where "slow it down and turn it aside" starts. A better
  multiplier on the science a defeated kaiju leaves.

Nine nodes, three branches, no tiers and no prerequisites beyond the branch itself. If a run is
not interesting with these, more nodes will not be the reason.

# How this gets balanced
Numbers are outputs, not inventions. The simulation is deterministic and runs without a renderer,
so the way to balance it is to run it -- the same discipline as `docs/performance.md`, applied to
play instead of frames.

- **One anchor: the interval between waves.** Everything else is quoted against it. An income is
  credits per interval; a cost is intervals of income *at the city's current size*; a wave is the
  share of the city that has to have gone to the military. Change the interval and nothing else
  needs retuning.
- **The pacing number is how many buildings fit between two waves.** One is suffocating, ten makes
  the wave stop being a deadline; three to five is the target, and it is what sets the costs once
  the interval is chosen -- not the other way round.
- **Money has two sources.** The population pays tax and the commercial district trades. Commerce
  alone would mean a city that loses its shops in a wave loses its income exactly when it has to
  rebuild: a death spiral, not a decision.
- **The threat grows geometrically, the city grows linearly** -- the island is finite and so is the
  workforce. The military share needed therefore climbs until it passes what the city can feed and
  staff. The end of a run is a consequence rather than a rule, which is what makes evacuation
  arrive on its own and at the right moment.
- **A balance harness, beside the performance one.** It runs the simulation headless over many
  seeds against scripted player policies -- economy only, always 20% military, one wave late -- and
  reports the distribution: waves held, population at evacuation, when defence falls behind. The
  constants are tuned until:
  - the policy that ignores the military dies at wave 3 or 4, early and legibly;
  - the policy that builds nothing but military starves by about wave 6;
  - a balanced policy holds 12 to 15 waves and is then overtaken;
  - the median run ends in evacuation rather than destruction -- if it does not, leaving is not
    priced right.
- **None of this applies to the first slice.** The vertical slice of an attack keeps hardcoded
  numbers chosen to make one wave playable in a minute. Balancing an engine before it has been run
  is tuning to taste; the harness comes once the loop exists and is known to be worth playing.

# Success signals
- A city can be lost, and the loss is explicable: the player can point at the number that was too
  small before the wave landed.
- Turning half a district off by over-staffing another is visible in the city itself, not only in
  a panel.
- A player who zones nothing but housing stalls, and can say why.
- A wave that destroys a quarter of the city leaves a graph, a save and an undo history that all
  still work, and a rebuild that repaints the region it touched rather than the world.
- The simulation runs in a test with no renderer, from a fixed seed, and produces the same city.
- A player can say why they cannot build the thing they want: no money, or nowhere left to put it.
- A district goes dark when its diffuser is destroyed, and the player can see which one it was.
- A run ends by evacuation at least as often as by defeat -- if nobody ever chooses to leave, the
  choice is not priced right.
- Every balance constant in the game can be traced to a harness run rather than to someone's
  judgement on the day.
- The frame rate through a wave stays inside the budget `docs/performance.md` records for the
  reference city.

# Open questions
- **How much a call multiplies by**, and whether it grows with how early the call is. The harness
  answers this one: a multiplier that makes calling always correct is as bad as one nobody uses.
- **Acting during an attack.** A spectator wave is the first version, deliberately. What the player
  could do -- evacuate a district, cut a bridge, concentrate the defence -- is a question to answer
  once one has been watched. Ordering a building is already allowed, and construction time is what
  makes it a gamble rather than a cheat.

# References
- Product back-reference: (none yet)
- Task back-reference: (none yet)
- Interface: `prod_019_an_interface_for_a_city_you_can_lose` -- what these rules demand of the
  screen, which is a move rather than an addition.
- Roadmap: `road_001_city_jump_playable_city` -- strands E2 (what grows on the land) and E3 (life
  on the network) are the ones this direction bends.
- Related product: `prod_011_a_city_that_is_built_on_purpose` -- zoning by business, which this
  brief turns from a preference into a constraint.
- Architecture: `adr_001_keep_the_road_graph_as_the_source_of_truth`,
  `adr_004_stay_a_static_client_with_no_server_of_its_own`.
