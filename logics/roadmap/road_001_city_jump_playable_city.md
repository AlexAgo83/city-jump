## road_001_city_jump_playable_city - city-jump playable city
> Date: 2026-08-27
> Status: Proposed
> Related product: `prod_001_a_city_that_grows_from_the_roads_you_draw`
> Related request: `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-08-27 11:16:42

# AI Context
- Summary: Roadmap for city-jump playable city.
- Keywords: roadmap, milestones, versions, city-jump playable city
- Use when: Planning or sequencing versions for city-jump playable city.
- Skip when: You need execution details for a single backlog item or task.

# Summary
Grow the road-construction prototype into a playable city simulation without replacing
the graph and derived-view foundations already proven in the browser.

# Milestones
## 0.1 - Road and repository foundation
- Goal: Make drawing roads, reading buildable land, and evaluating the result a stable
  pre-alpha foundation.
- Scope: Completed `req_000_draw_a_road_network_the_city_grows_from`, repository
  modularity through `req_002_establish_modular_repository_foundations`, terrain and
  light controls, and the crossing-road follow-up
  `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`.
- Exit signal: Unit, architecture, build, Logics, and browser interaction checks pass;
  the application renders at least one thousand buildings interactively.

## 0.2 - Zoning and growth
- Goal: Turn valid plots into intentional districts whose buildings change over time.
- Scope: Zone types, demand, plot occupancy, building replacement, and save/load for the
  authored graph plus simulation state. Scope each slice through its own request chain.
- Exit signal: A saved city can be reloaded and visibly grows according to player zoning
  choices without overlapping plots or orphaned buildings.

## 0.3 - Mobility
- Goal: Make the road graph carry movement, not only geometry.
- Scope: Lane direction, pathfinding, vehicle spawning, and congestion feedback. Bridges
  and tunnels remain separate requests because they alter terrain interaction.
- Exit signal: Trips choose valid routes through junctions and congestion is visible and
  reproducible in a deterministic test scenario.

## 0.4 - Economy and services
- Goal: Give construction and growth constraints that create meaningful player choices.
- Scope: Budget, construction cost, population, jobs, utilities, and a minimal service
  coverage model, each introduced only with an observable gameplay consequence.
- Exit signal: The city can fail or stabilize for explainable economic and service reasons,
  and the player has controls that change the outcome.

## 1.0 - Playable city loop
- Goal: Join construction, growth, mobility, and economy into a coherent session.
- Scope: Onboarding, progression pacing, persistence hardening, performance budgets, and
  release-quality accessibility and input behavior.
- Exit signal: A new player can build, grow, diagnose, save, and resume a city through a
  complete session with no developer API or transcript context.

# Sequencing
- Deliver milestones in ascending version order unless dependencies force a documented exception.
- Keep each increment independently reviewable and linked to concrete workflow docs.

# Risks
- Zoning, traffic, and economy can each become standalone simulations; request chains must
  keep every increment tied to one visible player decision.
- The road graph is a strong foundation but bridges, tunnels, and persistence may expose
  missing state that must be decided before meshes or UI depend on it.
- Version labels are planning targets, not release promises.

# References
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Request(s): `req_000_draw_a_road_network_the_city_grows_from`,
  `req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto`,
  `req_002_establish_modular_repository_foundations`
- Backlog item(s): `item_001_stand_up_the_babylon_scene_and_the_dev_loop`,
  `item_008_establish_modular_repository_foundations`
- Task(s): `task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it`,
  `task_002_establish_modular_repository_foundations`
