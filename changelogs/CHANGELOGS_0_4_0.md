# city-jump 0.4.0

Prepared on 2026-09-02. A hundred and fifty-three commits since 0.3.0, all serving one change: the
city can now be lost. 0.3.0 could draw a city and had nothing to do with it. This release gives it
a workforce that has to be shared, money that runs out, food that runs out, a kaiju that comes out
of the sea when the city has become worth attacking, and an island a player leaves with what they
earned.

## The run

- A **kaiju** lands when the city crosses a population bar and walks in from the coast, flattening
  a lot every few seconds. Its size is fixed the moment it lands -- 900, plus 150 a wave, 9 a
  resident and 8 a lot -- so a player can choose to consolidate instead of expand, and the number
  they are about to face is on screen before it arrives.
- Nothing is on a schedule. The bar is `250 x wave squared`: a city that does not build is never
  attacked, and one that grows fast brings the next one on itself.
- The defence is the city. Every **staffed military lot is a battery**: 220 m of range, a salvo
  every 4 seconds, damage by the size of the lot. There is no turret to place -- a barracks is a
  farm not built, and the wave is what prices that choice.
- **Call wave** brings the next one early and doubles its science. **Evacuate** ends the run and
  carries the science off the island as prestige, spent on a first web of persistent upgrades.
- Science comes from held waves only, ten times the wave number. The thing that destroys the city is the only
  thing that makes the next one stronger.
- A breached wave is not a game over: buildings rebuild, the run rolls on, and only an empty island
  ends it.
- Run rules, all switchable: pacifist (no waves, so no science), instant construction, free
  building, and ignore power and water. Hardcore, chosen for the run, deletes the autosave when the city falls.
- Missiles are pooled projectiles with travel time, and the kaiju retargets as the city changes
  under it.

## The economy

- **Workforce**: one global stock, every resident a worker, re-dealt from scratch every tick.
  Barracks are served first, then farms, then works, then shops -- biggest lot first -- and a lot
  is staffed whole or not at all. An unstaffed building produces nothing, earns nothing and does
  not fire.
- **Food, materials and population**: farms feed the city, works supply the shops and the barracks,
  and a city short of food loses twice what it is short. Growth is a rate gated by housing and
  surplus, not a conversion of loaves into residents.
- **Money**: roads cost by type and metre, buildings by kind and cell, demolition refunds half, and
  a wave's rebuilding is charged on the spot even into debt. Money is what gets built; the
  workforce is what runs. Neither substitutes for the other.
- **Lots answer to demand**: a zoned lot is a lot the city can carry -- a lot per 24 to 72
  residents by kind, and one more admitted every 20 seconds -- so zoning is a decision rather than
  an instant fill.
- **Buildings have a life**: a 24-second construction stage, then working, or idle with a reason --
  no workers, no power, no water, no materials. A lot flattened by a wave rebuilds itself, and does
  nothing while it does.
- The clock is the player's: pause, play, x2, x4, and a city day of 96 seconds that runs on the
  simulation rather than on the frame rate.

## Utilities

- A **producer**, the road network, and a **diffuser**: power and water reach what a diffuser
  covers, and what needs them differs by district. Placement and coverage are shown as an overlay,
  and a district that goes dark says so.

## Zoning

- A zone belongs to a **lot**, not to the ground under it: the brush paints the lots it touches,
  and the overlay fills them opaque rather than dusting the grass between them.
- Open zoned land fades out rather than being coloured as if it were built, and taken cells are
  shaded, so the map says what is planned and what is standing.
- The starter kit lays out districts on the road it comes with, and a new island starts clean.

## Interface

- The needs panel is a **balance sheet**: click it for the arithmetic behind each gauge instead of
  four bars that gate nothing.
- The panels stack rather than overlap -- clock and status bottom-left, run and wave top-right --
  and the settings menu opens closed.
- The wave banner carries the kaiju's hit points and the city's own firepower, so a wave is lost to
  arithmetic the player could read, not to a surprise.
- Night is lit, the run opens framed on the city in daylight, and a marked building says it is
  about to die.

## Balance and evidence

- `npm run balance` plays a scenario headless; `npm run scenarios` plays whole runs, wave by wave,
  and reports the wait, the threat, the lots, the batteries, the combat length and the salvos per
  seed rather than an average -- an average is how a run that is out of band hides.
- The visual check zones and grows the city it shoots, since a road no longer builds its own
  frontage.

## Performance

- A new lot no longer rebuilds the world. Re-packing the lots is its own path: it repaints the
  buildings and the zone overlay and reconforms the ground only under the lots that appeared or
  left. Measured on a 561-building city, **337 ms becomes 16-24 ms**.
- The buildable cells are solved only when the roads, the zoning or the ground have moved. Walking
  every block of every segment costs ~65 ms, and the demand tick that triggered most re-packs
  changes none of the three.
- The ground's normals come from the heightfield rather than from `ComputeNormals`, which walked
  all 913k triangles whatever bounds it was given: **47.5 ms of a 48.1 ms patch refresh**.
- A wave no longer schedules a whole-world rebuild for every building it destroys.

## Fixes

- The simulation clock is saved with the city. Lot demand and every construction stage are timed
  against it, so a reload that restarted it at zero un-built the city: one lot per kind admitted
  again, and every standing building back under scaffolding with a start time in the future.
- A working building keeps its own colours. The lifecycle state is a per-instance vertex colour and
  multiplies the model's texture; `working` answered a wall colour meant for the untextured LOD
  boxes, so every finished building was drawn at half brightness.
- The marginal lot no longer rebuilds itself for ever. The demand cap crossed an integer whenever
  the population wobbled, the lot left the list for a tick and came back as a new parcel on a fresh
  stage -- a building flickering between "Under construction" and "No workers". A lot keeps its
  state for 120 s after it was last seen, and one already standing is judged on a wider limit than
  one being admitted.
- A wave in progress is never restored: nothing about the kaiju is saved, so a reload used to drop
  a fresh monster on the other side of the island with the old hit points. A reload puts the city
  back to just before the wave.
- A finished kaiju no longer walks into the next wave, and the materials gate has hysteresis: at a
  bare `materials <= 0` the shops stopped, stopped consuming, restarted and drained it again, every
  frame.
- The opening no longer evicts its own arrivals: before the first house exists there is no housing
  cap to be under.
- One road placement no longer empties the island. Losing homes costs 40% of the homeless a day
  rather than the whole deficit in the tick that noticed it.
