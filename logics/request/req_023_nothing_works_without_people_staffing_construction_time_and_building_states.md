## req_023_nothing_works_without_people_staffing_construction_time_and_building_states - Nothing works without people: staffing, construction time and building states
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The keystone of the economy: every non-residential parcel needs workers from one shared stock, staffing is binary, buildings take time to go up, and the map shows construction, idle and rebuilding without a panel being opened.
- Keywords: nothing, works, people, staffing, construction, time, building, states
- Use when: Working on staffing, building states, construction time, or how a building's condition reads on the map.
- Skip when: You need money, food, materials or utilities -- each is its own slice.

# Needs
- Without this a building is free to run and the game is a painting exercise. With it, every
  district competes for the same people and proportion becomes the thing being played.
- Binary rather than partial output, deliberately: a building works or it does not, because that
  is what a player can act on at a glance.
- Buildings taking time to raise is what makes building during a wave a gamble rather than a
  cheat, which is a rule `prod_018` already leans on.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: Population produces a workforce; every non-residential parcel demands workers from it, and
  one that cannot be staffed stands and produces nothing.
- AC2: A parcel takes time to build, and shows it -- construction, working, idle and rebuilding are
  distinguishable on the map before anything is clicked.
- AC3: Staffing is deterministic and covered by tests with no renderer.
- AC4: Turning half a district off by over-staffing another is visible in the city itself.

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
- `item_072_nothing_works_without_people_staffing_construction_time_and_building_states`
