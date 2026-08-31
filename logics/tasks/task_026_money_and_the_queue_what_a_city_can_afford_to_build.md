## task_026_money_and_the_queue_what_a_city_can_afford_to_build - Money and the queue: what a city can afford to build
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 88%
> Progress: 78%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 00:57:33
> Owner: Codex

# AI Context
- Summary: Implementing prices, a treasury, a build queue, and a demolition that gives half back.
- Keywords: money, queue, city, can, afford, build
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- Meters expansion, which the wave needs to be able to outpace.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [x] 1. `sim/economy.ts`: a treasury, income from population tax and staffed commerce, and a cost
      table for roads by the metre and buildings by kind and size. Pure, tested from a seed.
- [x] 2. The draw tool prices a road before it is committed and refuses what cannot be paid for,
      through the refusal path that already exists for too steep and too short.
- [x] 3. A build queue: a zoned parcel that cannot be paid for waits, and the queue is readable --
      how many rising, how many waiting for funds.
- [x] 4. Rebuilding after a wave proceeds into a negative balance; while it is negative nothing new
      starts. This is the rule with teeth, and it needs its own test.
- [ ] 5. Demolition takes time and returns half, for buildings and for roads.
- [x] 6. The city strip shows money and its rate; prices appear on the tools that spend it.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_073_money_and_the_queue_what_a_city_can_afford_to_build`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: prices before the click and refusal after it; proven by an interaction check on a road and a zone.
- request-AC2 -> This task. Proof: the queue and its readout; proven by unit tests on the queue and an interaction check on the line.
- request-AC3 -> This task. Proof: rebuilding into a negative balance while new work waits; proven by its own unit test.
- request-AC4 -> This task. Proof: demolition taking time and returning half; proven by unit tests.
- request-AC5 -> This task. Proof: income from tax and trade; proven by `sim/economy.ts` unit tests from a fixed seed.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- 2026-09-01: `npx vitest run src/sim/economy.test.ts src/sim/save.test.ts src/sim/share.test.ts src/ui/saves.test.ts src/sim/rules.test.ts` passed.
- 2026-09-01: `npm run test:e2e` passed.
- 2026-09-01: `npm run ci` passed.
- 2026-09-01: `npm exec -- vitest run src/sim/buildingLifecycle.test.ts src/sim/economy.test.ts src/sim/save.test.ts src/render/buildings.test.ts` passed.
- 2026-09-01: `npm run test:e2e` passed after adding the queue HUD interaction check.
- 2026-09-01: `npm run ci` passed.
- 2026-09-01: `npm exec -- vitest run src/sim/buildingLifecycle.test.ts src/sim/rubble.test.ts src/sim/economy.test.ts` passed.
- 2026-09-01: `npm run test:e2e` passed with the debt-backed rebuilding interaction check.
- 2026-09-01: `npm run ci` passed.
- 2026-09-01: `npm run test:e2e` passed with the zone building price readout check.
- 2026-09-01: `npm run ci` passed.

# Report
- 2026-09-01: Added pure treasury, income, road cost and building cost rules.
- 2026-09-01: Roads now show a metre price, spend treasury money on commit, and refuse valid road draws when the treasury cannot pay.
- 2026-09-01: City saves now carry money; older saves load with the starting treasury.
- 2026-09-01: Buildings now spend from the treasury before rising; unaffordable parcels wait and the HUD reports rising and waiting counts.
- 2026-09-01: Wave-damaged buildings now enter rebuilding, spend even into debt, keep rubble visible during the work, and leave new builds waiting while money is negative.
- 2026-09-01: Zone tools now show the minimum building price, alongside the existing road metre price and city money strip.
- 2026-09-01: Not yet built: delayed demolition/refund.

# Links
- Request: `req_024_money_and_the_queue_what_a_city_can_afford_to_build`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
