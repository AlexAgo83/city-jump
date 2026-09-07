## item_198_answer_whether_this_scene_needs_a_clustered_container - Answer whether this scene needs a clustered container
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 19:42:05

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: answer, whether, scene, needs, clustered, container
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The clustered container is assumed to be the right model for hundreds of small lights, and that assumption has never been measured against a cheaper one.

# Scope
- In:
  - One measured prototype of a cheaper lighting model, judged on night captures and the same three-round rule; removed if rejected, with its evidence kept.
- Out:
  - A general lighting engine, new generated textures, or shipping a prototype that fails appearance.

# Acceptance criteria
- AC1: Either a measured retained implementation, or a recorded reason it cannot be tried, with the ground as the receiver checked either way.
- AC2: A rejected prototype is removed from src and keeps its committed results.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Either a measured retained implementation, or a recorded reason it cannot be tried, with the ground as the receiver checked either way.
- request-AC5 -> This backlog slice. Proof: AC2: A rejected prototype is removed from src and keeps its committed results.
- request-AC6 -> This backlog slice. Proof: AC2: A rejected prototype is removed from src and keeps its committed results.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)
- Request: `req_055_reduce_the_clustered_night_lighting_pass`
- Primary task(s): `task_056_deliver_the_measured_night_lighting_pass_reduction`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Outcome
- Answered on 2026-09-07, and the answer is no cheaper model is reachable inside this request's scope.
- The attribution in `item_195` shows the pass cost is the volume each light occupies in the cluster, not the emitter count, the tile grid or the depth slices. A cheaper model would therefore have to stop giving each lamp a real light at all.
- The one such model already in the build is the player's lights switch, which is exactly that: no real lights. It measures +39.5% at night-saved (`perf/reviews/task055-wave3-lights-ablation-all/`) and looks like `docs/media/nightrange-lights-off.png` -- the city goes flat black, with no ground pools and no lit facades. It is a fine player choice and an unacceptable default, which is why it is a switch.
- Anything between the two -- baked light maps, an emissive-only substitute, a forward pass hand-written for hundreds of small lights -- is a new lighting engine, which this request lists as out of scope. Recorded as the reason it cannot be tried here rather than left as an open question.
- If it is ever worth revisiting, the number to beat is the +32.1% that disabling the streetlight container alone buys, and the picture to preserve is `docs/media/nightrange-current.png`.
