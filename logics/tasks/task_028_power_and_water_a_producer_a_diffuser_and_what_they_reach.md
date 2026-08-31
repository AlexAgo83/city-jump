## task_028_power_and_water_a_producer_a_diffuser_and_what_they_reach - Power and water: a producer, a diffuser and what they reach
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:04:49

# AI Context
- Summary: Implementing the second placement verb: a producer, a network on the roads, and a diffuser with a radius.
- Keywords: power, water, producer, diffuser, they, reach
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It gives the kaiju something to break that costs more than the building it broke.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `sim/utilities.ts`: a producer, a diffuser with a radius, and a network solved over road
      segments that carry power or water. Pure, tested from a seed.
- [ ] 2. `sim/roadTypes.ts` and the save: carrying power or water is a property of a segment, which
      is what keeps this out of a second graph. Option B stays unbuilt.
- [ ] 3. A Build tool in the dock, with a catalogue, prices and a coverage preview while placing.
- [ ] 4. Per-district needs: water for homes and farms, power for industry and the military, both
      for commerce. A building missing one is idle and says which.
- [ ] 5. A Utilities view beside Zones and Traffic: coverage circles and which roads carry what.
- [ ] 6. A diffuser destroyed puts its district out, and raises the one-line alert the interface
      brief allows facts to raise.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_075_power_and_water_a_producer_a_diffuser_and_what_they_reach`

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
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_026_power_and_water_a_producer_a_diffuser_and_what_they_reach`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
