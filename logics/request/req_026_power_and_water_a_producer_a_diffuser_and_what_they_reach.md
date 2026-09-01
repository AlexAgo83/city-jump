## req_026_power_and_water_a_producer_a_diffuser_and_what_they_reach - Power and water: a producer, a diffuser and what they reach
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 08:34:23

# AI Context
- Summary: The second placement verb: a producer and a diffuser the player positions, power and water carried by road segments, districts that need one or the other or both, a Utilities view, and a district that goes dark when its diffuser falls.
- Keywords: power, water, producer, diffuser, they, reach
- Use when: Working on utilities, the Build tool, coverage, or what a destroyed diffuser does to a district.
- Skip when: You need the wave itself or the economy that consumes what utilities enable.

# Needs
- Utilities are the only thing in `prod_018` the player places directly, and the brief is explicit
  that this is infrastructure rather than defence -- turrets stay out.
- The network follows the roads (option A): carrying power or water is a property of a segment, so
  it saves with the city and needs no second graph. The free-form buried network is option B and
  is deliberately held in reserve.
- Not every district needs every utility: housing and farms want water, industry and the military
  want power, commerce wants both. Four ways to be switched off is tedious; two is a puzzle.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: A producer and a diffuser can be placed, priced and staffed, and a diffuser supplies what
  falls inside its radius.
- AC2: A road segment can carry power and water, and the network from producer to diffuser is
  what makes a diffuser work.
- AC3: A building without the utility it needs is idle, and says which one it is missing.
- AC4: A Utilities view shows coverage and which roads carry what.
- AC5: Destroying a diffuser puts everything it covered out of action, and the player is told.

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
- `item_075_power_and_water_a_producer_a_diffuser_and_what_they_reach`
