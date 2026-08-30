## item_029_stop_rebuilding_the_traffic_queue_bookkeeping_every_frame - Stop rebuilding the traffic queue bookkeeping every frame
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: The traffic `registerBeforeRender` loop rebuilds its lane-queue Map with a string key per car, an `ahead` Map, a sort per queue and a further flatMap/Map/sort in `roundaboutRooms`, 60 times a second.
- Keywords: rebuilding, traffic, queue, bookkeeping, frame
- Use when: Touching the per-frame loop, the queue bookkeeping or `armOf` in `src/render/traffic.ts`.
- Skip when: The work is the rebuild path (item_026) or changes traffic behaviour or density.

# Problem
- The `registerBeforeRender` loop builds a queue `Map` keyed by an interpolated string per car per frame, a second `ahead` Map, a sort per queue, and a further flatMap/Map/sort inside `roundaboutRooms` -- at 60 fps.
- Queue order only changes when a mover boards or arrives; the model has no overtaking, so almost all of that work reproduces the previous frame's answer.
- `armOf` does a linear `find` over a junction's arms and is called several times per car per frame through `limitOf`, `stopFor` and `stopLineOf`.

# Scope
- In:
  - Maintain the lane queues incrementally, updating them when a mover boards or arrives rather than regrouping and re-sorting every frame.
  - Replace the per-frame string keys with something that does not allocate.
  - Give `armOf` a per-junction lookup by segment id instead of a linear scan.
- Out:
  - Changing traffic behaviour: queueing, light obedience, roundabout entry and lane changes must be unchanged.
  - Changing traffic density or the vehicle meshes.

# Acceptance criteria
- AC1: The frame loop no longer regroups and re-sorts every lane queue from scratch on each frame, and allocates no per-mover string key per frame.
- AC2: Traffic behaves as it does today -- cars queue behind the car in front, hold at red lights, and take roundabouts -- confirmed by the browser interaction check.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: The frame loop no longer regroups and re-sorts every lane queue from scratch on each frame, and allocates no per-mover string key per frame.
- request-AC7 -> This backlog slice. Proof: AC2: Traffic behaves as it does today -- cars queue behind the car in front, hold at red lights, and take roundabouts -- confirmed by the browser interaction check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
