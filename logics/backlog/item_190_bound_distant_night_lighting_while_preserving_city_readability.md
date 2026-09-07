## item_190_bound_distant_night_lighting_while_preserving_city_readability - Bound distant night lighting while preserving city readability
> From version: 0.5.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:20:01

# AI Context
- Summary: Streetlights and vehicle headlights use city-wide clustered containers. Removing distant emitters may still leave a costly clustered pass.
- Keywords: bound, distant, night, lighting, while, preserving, city, readability
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Switching off all distant lighting with no visual substitute.

# Problem
- Streetlights and vehicle headlights use city-wide clustered containers. Removing distant emitters may still leave a costly clustered pass.
- Previous distance removal flattened the city and an additive substitute rendered black; simply disabling far lights is not an acceptable visual outcome.

# Scope
- In:
  - Priority rationale: Night lights-off changed 58.6 to 91.7 FPS; bloom-off was effectively unchanged.
  - Depends on: baseline and traffic visibility identity/composition. Measure streetlights and headlights separately, emissive bulbs separately from real lighting, and cluster pass cost rather than counting lights alone.
  - Use persistent emitter pools and a bounded camera-motion/cadence pass. First candidate real-light reach is the traffic reach; test independent larger facade reach only if distant illumination requires it. Keep lights that influence a visible receiver even if the emitter is offscreen.
  - Prototype a cheap distant road-light pool/facade substitute using installed Babylon materials or existing geometry; verify blending/color in actual screenshots before scaling up. Preserve emissive bulbs and day/night clock behavior.
  - Accept a visual lighting LOD only if it improves the shared measurement gate across saved/street/overview night views and transitions. If clustered cost persists or the substitute fails appearance, remove prototype and record the negative result; retain the existing player lights switch.
  - Test lamp edits, loads, disabled lights, offscreen cars, follow, power-related building appearance and crossings of dawn/dusk without light/texture growth.
- Out:
  - Switching off all distant lighting with no visual substitute.
  - A new lighting engine, new textures generated without need, or claiming light count predicts FPS.

# Acceptance criteria
- AC1: Near lighting and distant road/facade readability remain demonstrably coherent in paired night screenshots; transitions have no sudden blackout.
- AC2: Camera movement and repeat load/edit cycles do not create/dispose emitter pools continuously or leak resources; daytime incurs no night-light pass.
- AC3: Report separate street/car/cluster measurements and a retained implementation or explicit measured rejection, including why earlier failed substitutes now work or remain unsuitable.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Near lighting and distant road/facade readability remain demonstrably coherent in paired night screenshots; transitions have no sudden blackout.
- request-AC9 -> This backlog slice. Proof: AC2: Camera movement and repeat load/edit cycles do not create/dispose emitter pools continuously or leak resources; daytime incurs no night-light pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: High
- Rationale: Night lights-off changed 58.6 to 91.7 FPS; bloom-off was effectively unchanged.
