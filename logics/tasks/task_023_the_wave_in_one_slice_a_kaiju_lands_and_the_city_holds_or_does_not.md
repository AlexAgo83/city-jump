## task_023_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not - The wave, in one slice: a kaiju lands and the city holds or does not
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implementing the first attack: a wave clock, a kaiju that lands and walks, batteries that fire, and a banner that says how it went.
- Keywords: wave, slice, kaiju, lands, city, holds, does, not
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It answers the question the other seven slices depend on.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `sim/wave.ts`: the clock, the countdown, and a threat fixed when a wave starts. Pure,
      tested from a seed, no renderer.
- [ ] 2. `sim/kaiju.ts`: the landing edge (random, away from the bridge), the nearest coast point,
      the nearest building, and the position at time t. Pure, tested from a seed.
- [ ] 3. `scripts/gen_kaiju.py` beside `gen_buildings.py`: the model, exported as GLB into
      `public/`, its manifest entry, and the architecture test that shipped models are declared.
- [ ] 4. `render/kaiju.ts`: the mesh, the gait articulated in code, the shadow, and the walk driven
      by the sim's position.
- [ ] 5. Destruction: buildings removed on contact through the existing path, leaving rubble, the
      dirty region repainted, and undo refusing to reach back across a wave.
- [ ] 6. Batteries: every military parcel, one range, damage by area, fixed reload, missiles with a
      travel time that always hit; the kaiju's hit points equal to the threat.
- [ ] 7. The banner: threat against firepower before, held or breached after, with the report the
      brief describes.
- [ ] 8. Measure a wave against the reference city and record it in `perf/history.jsonl`; a wave
      that does not fit the budget in `docs/performance.md` is a finding, not a footnote.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_070_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: implemented and validated here.
- request-AC2 -> This task. Proof: implemented and validated here.
- request-AC3 -> This task. Proof: implemented and validated here.
- request-AC4 -> This task. Proof: implemented and validated here.
- request-AC5 -> This task. Proof: implemented and validated here.
- request-AC6 -> This task. Proof: implemented and validated here.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, `npm run test:e2e` locally (browser coverage is local -- see
  `CONTRIBUTING.md`), and `npm run perf -- --city perf/cities/ma-ville.json` before and after.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
