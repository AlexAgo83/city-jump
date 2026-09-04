## item_160_let_a_kaiju_land_on_any_edge_of_the_map - Let a kaiju land on any edge of the map
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Low
> Theme: City simulation core
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 22:12:44

# AI Context
- Summary: landingPoint ranks four edges by distance from a fixed bridge point and takes one of the two furthest. Those distances never change, so it is always north or east -- 600 seeds give 304 north, 296 east, zero west or south.
- Keywords: landingPoint, edge ranking, bridge point, top-two slice, FNV-1a seed, reproducible landing
- Use when: changing where a kaiju arrives from.
- Skip when: real randomness, the coast ring's shape and wade-in distance, and moving the bridge point.

# Problem
- `landingPoint` (src/sim/kaiju.ts:88) ranks the four edges by distance from the `bridge` point `v3(-360, 0, 1500)` (src/app/waveLoop.ts:39) and takes `ranked[Math.floor(random(...) * 2)]` -- one of the two furthest.
- With `GROUND_SIZE = 5400` those distances never change: north 4200, east 3060, west 2340, south 1200. North and east are always the top two. Across 600 possible seeds: 304 north, 296 east, 0 west, 0 south.
- The intent -- do not land on the bridge -- is sound. The effect is that half the map is never a landing, in every game.

# Scope
- In:
  - All four edges reachable, with the bridge still avoided by whatever means replaces the top-two slice -- weighting by distance rather than truncating to two is the obvious candidate.
  - Keeping the landing reproducible from its seed: `random` (src/sim/kaiju.ts:118) stays a hash, not a stateful generator.
- Out:
  - Real randomness; the harness depends on reproducibility.
  - The coast ring's shape and the wade-in distance, which the wider edges make more visible but which is a separate question.
  - Moving the bridge point itself.

# Acceptance criteria
- Over a range of seeds, all four edges occur.
- The edge nearest the bridge is still the least likely, and landing on the bridge is still avoided.
- The same seed still produces the same landing.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: Over a range of seeds, all four edges occur.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)
- Request: `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`
- Primary task(s): `task_045_orchestrate_the_residents_bar_and_spawn_path_work`

# Priority
- Priority: Medium
- Rationale: Half the map has never been a landing in any game. Cheap, independent, and it costs the player variety rather than correctness.
