## task_023_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not - The wave, in one slice: a kaiju lands and the city holds or does not
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:13:51
> Owner: Codex

# AI Context
- Summary: Implementing the first attack: a wave clock, a kaiju that lands and walks, batteries that fire, and a banner that says how it went.
- Keywords: wave, slice, kaiju, lands, city, holds, does, not
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It answers the question the other seven slices depend on.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [x] 1. `sim/wave.ts`: the clock, the countdown, and a threat fixed when a wave starts. Pure,
      tested from a seed, no renderer.
- [x] 2. `sim/kaiju.ts`: the landing edge (random, away from the bridge), the nearest coast point,
      the nearest building, and the position at time t. Pure, tested from a seed.
- [x] 3. `scripts/gen_kaiju.py` beside `gen_buildings.py`: the model, exported as GLB into
      `public/`, its manifest entry, and the architecture test that shipped models are declared.
- [x] 4. `render/kaiju.ts`: the mesh, the gait articulated in code, the shadow, and the walk driven
      by the sim's position.
- [x] 5. Destruction: buildings removed on contact through the existing path, leaving rubble, the
      dirty region repainted, and undo refusing to reach back across a wave.
- [x] 6. Batteries: every military parcel, one range, damage by area, fixed reload, missiles with a
      travel time that always hit; the kaiju's hit points equal to the threat.
- [x] 7. The zone brush: five businesses plus Clear, `parcelKind` reduced to "painted wins, else
      the road decides", and the saves that carry the three kinds it lost in 0.3.0.
- [ ] 7b. The edge marker and the target highlight.
- [x] 8. The banner: threat against firepower before, held or breached after, with the report the
      brief describes.
- [ ] 9. Measure a wave against the reference city and record it in `perf/history.jsonl`; a wave
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
- request-AC1 -> This task. Proof: the wave clock and the countdown; proven by `sim/wave.ts` unit tests from a fixed seed.
- request-AC2 -> This task. Proof: destruction and the graph surviving it; proven by unit tests plus an interaction check that undo refuses to reach across a wave.
- request-AC3 -> This task. Proof: batteries derived from military parcels; proven by unit tests over a city with parcels of several sizes.
- request-AC4 -> This task. Proof: the kaiju's hit points and the banner's verdict; proven by an interaction check that runs a wave end to end.
- request-AC5 -> This task. Proof: `sim/kaiju.ts` purity; proven by tests that import it with no Babylon and replay the same seed twice.
- request-AC6 -> This task. Proof: the zone brush and the painted-beats-road rule; proven by unit tests on `parcelKind` and an interaction check on the palette.
- request-AC7 -> This task. Proof: the edge marker and the target highlight; proven by an interaction check during a live wave.
- request-AC8 -> This task. Proof: the frame budget; proven by a `npm run perf` run recorded in `perf/history.jsonl`.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, `npm run test:e2e` locally (browser coverage is local -- see
  `CONTRIBUTING.md`), and `npm run perf -- --city perf/cities/ma-ville.json` before and after.
- 2026-08-31 partial wave: `npm test`, `npm run test:e2e`, and `npm run ci` passed. Focused unit
  pass covered `src/sim/wave.test.ts`, `src/sim/kaiju.test.ts`, `src/sim/zones.test.ts`,
  `src/sim/slots.test.ts`, and `src/sim/save.test.ts`.
- 2026-08-31 reference perf baseline recorded with `npm run perf -- --city perf/cities/ma-ville.json`:
  overview 120 fps, district 117 fps, street 104 fps, rebuild 581 ms.
- 2026-08-31 kaiju-render wave: `/Applications/Blender.app/Contents/MacOS/Blender -b -P
  scripts/gen_kaiju.py`, `npm run test:e2e`, and `npm run ci` passed. Reference perf recorded with
  `npm run perf -- --city perf/cities/ma-ville.json`: overview 120 fps, district 114 fps, street
  104 fps, rebuild 554 ms.
- 2026-08-31 destruction wave: `npm run test:e2e` and `npm run ci` passed. Reference perf recorded
  with `npm run perf -- --city perf/cities/ma-ville.json`: overview 120 fps, district 120 fps,
  street 99 fps, rebuild 582 ms.
- 2026-08-31 batteries/banner wave: focused `npm test -- src/sim/wave.test.ts
  src/sim/batteries.test.ts`, `npm run typecheck`, `npm run test:e2e`, and `npm run ci` passed.
  Reference perf with `npm run perf -- --city perf/cities/ma-ville.json` first exposed a per-frame
  HUD update regression at overview 92 fps, district 77 fps, street 85 fps, rebuild 671 ms; after
  the no-op HUD guard, the recorded result is overview 120 fps, district 105 fps, street 104 fps,
  rebuild 578 ms.

# Report
- Started development. Added pure wave countdown constants/clock, pure kaiju landing/path replay,
  and the zone prerequisite: all five businesses plus Clear, painted cells beating the road default,
  and saves accepting the restored zone kinds.
- Added the generated kaiju GLB and manifest, the render/kaiju loader with simple articulated gait,
  shadows, app wiring from the pure sim position, and an e2e debug check that forces a wave and
  verifies the mesh appears.
- Added persistent rubble: a kaiju contact removes the parcel from derived buildings, paints rubble,
  saves/restores it, clears undo, and repaints the affected region. E2e covers rubble plus undo
  refusal across the wave.
- Added military batteries, missile trails, kaiju HP damage, wave firepower text, and held/breached
  banner states. E2e covers the active, held, and breached banners.
- Not yet implemented: edge marker/target highlight and final wave performance recording.

# Links
- Context pack: `logics/context-packs/the-wave-in-one-slice.json` -- the bounded reading for this
  chain, including both briefs and the roadmap.
- Request: `req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
