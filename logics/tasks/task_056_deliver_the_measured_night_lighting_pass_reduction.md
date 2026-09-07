## task_056_deliver_the_measured_night_lighting_pass_reduction - Deliver the measured night lighting pass reduction
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claw
> Indicators reviewed: 2026-09-07 20:07:46

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: deliver, measured, night, lighting, pass, reduction
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Attribute the container pass cost parameter by parameter before changing anything.
- [x] 2. Measure maxRange, then lamp count, then a cheaper lighting model, each decided separately against night captures.
- [x] 3. Run the integrated night A/B, CI, e2e and Logics validation, and record shipped and rejected candidates in docs/performance.md.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`
- `item_196_measure_a_lower_clustered_maxrange_against_night_reach`
- `item_197_measure_fewer_real_lights_against_dark_gaps`
- `item_198_answer_whether_this_scene_needs_a_clustered_container`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC5 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC2 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC5 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC6 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC3 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC5 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC6 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC4 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC5 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`
- request-AC6 -> This task. Proof: Implemented in 8895498; validated with npm run ci and npm run test:e2e. Source: `8895498`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-09-07
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- All four slices close on measurement; no application code ships. The clustered container's pass costs the volume each light occupies in the cluster, and nothing else.
- `item_195` attributed it: `maxRange` 52 and 42 m down to 24 buys +7.5% / +12.9% / +4.2% at night-saved / night-street / night-overview; tiles halved is -3.2% / -0.7% / -4.1%; depth slices halved is -2.7% / -4.3% / -7.5%; half the lamps keeping a real light is +0.5% / -0.7% / +0.8%.
- `item_196` rejected every `maxRange` candidate: 24 m puts the facades out, 32 m keeps them but shrinks the ground pools for +4.3% / +7.1% / +0.8%, and fitting the value to the longest light each container actually holds clips nothing and buys nothing. AC1 asked for retention only with unchanged reach, and the only candidate with unchanged reach has no gain.
- `item_197` rejected thinning the lamps: no gain to weigh against the dark gaps it would cost.
- `item_198` answered that no cheaper model is reachable in scope. The one already in the build is the player's lights switch -- no real lights, +39.5%, and a flat black city.
- Probe change kept: the container's own parameters persist, so they are applied once. Re-applying them each frame makes the container rebuild its clustering continuously, which the probe's "city and traffic advanced" guard caught and which would have measured that rebuild instead of the parameter.
- Captures: `docs/media/nightrange-current.png`, `-max32.png`, `-max24.png`, `-lights-off.png`.
- Not started.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`, `item_196_measure_a_lower_clustered_maxrange_against_night_reach`, `item_197_measure_fewer_real_lights_against_dark_gaps`, `item_198_answer_whether_this_scene_needs_a_clustered_container`
- Related request(s): `req_055_reduce_the_clustered_night_lighting_pass`

# Links
- Request: `req_055_reduce_the_clustered_night_lighting_pass`
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)
