## req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows - A city that has to be fed: food, materials and a population that grows
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The districts start owing each other something: farms make food and food gates population, industry makes materials, commerce makes services and trade, population grows over time within what the city can feed and staff, and a zoned parcel waits for demand instead of filling on sight.
- Keywords: city, fed, food, materials, population, grows
- Use when: Working on the resource loop, population growth, or when a zoned parcel becomes a building.
- Skip when: You need utilities, the wave, or the run.

# Needs
- The needs gauges have shown supply against demand since 0.3.0 and gated nothing. This is where
  they start to bite.
- Food decides whether the population exists, commerce decides how fast it grows, industry
  supplies the army and the shops, and the military produces nothing the economy can use -- which
  is what makes under-building it tempting and the wave's job to price.
- A parcel that waits for demand is the smallest change that makes a city feel alive rather than
  finished, and it is what makes the whole loop visible on the map.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: Farms produce food, industry materials, commerce services and trade, each only while
  staffed.
- AC2: Population grows over time, capped by housing and gated by food, and falls when food is
  short for long enough or when the homes holding it are destroyed.
- AC3: A zoned parcel stays empty until something wants it, and fills over time when it does.
- AC4: A city of nothing but housing stalls, and the reason is visible in the gauges.
- AC5: The loop is deterministic and covered by tests from a fixed seed with no renderer.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)

# References
- `src/sim/` -- the deterministic rules this slice adds to.
- `src/render/` -- where they become something on screen.
- `docs/performance.md` -- the budget every slice is measured against.

# Backlog
- `item_074_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
