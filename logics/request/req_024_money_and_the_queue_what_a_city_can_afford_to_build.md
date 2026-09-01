## req_024_money_and_the_queue_what_a_city_can_afford_to_build - Money and the queue: what a city can afford to build
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 06:31:05

# AI Context
- Summary: Money as the build meter: roads priced by the metre, buildings priced to build, a city that raises what it can afford and queues the rest, rebuilding allowed to go negative, and demolition that takes time and returns half.
- Keywords: money, queue, city, can, afford, build
- Use when: Working on prices, the treasury, the build queue, or demolition.
- Skip when: You need what money is spent *on* to produce anything -- that is the food and materials slice.

# Needs
- Workers limit what runs; they do not limit what gets built, and with waves to prepare for the
  rate of building is exactly what needs a meter.
- The player zones an intention rather than ordering a building, so nobody may be billed for
  something they did not order: the city builds what it can pay for and the rest waits, visibly.
- Rebuilding may push the balance below zero and only new work waits, because a city recovers from
  a bad wave by definition; what it cannot do while recovering is expand.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: Roads cost by the metre and buildings cost to build; both prices are shown before the
  click, and what cannot be afforded looks unavailable.
- AC2: The city raises what the treasury covers and queues the rest, and the queue is readable --
  how many are going up, how many are waiting for funds.
- AC3: Rebuilding after a wave proceeds even into a negative balance, and while the balance is
  negative nothing new starts.
- AC4: Demolishing a building or a road takes time and returns half its cost.
- AC5: Income comes from population tax and from trade in staffed commercial parcels.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)

# References
- `src/sim/` -- the deterministic rules this slice adds to.
- `src/render/` -- where they become something on screen.
- `docs/performance.md` -- the budget every slice is measured against.

# Backlog
- `item_073_money_and_the_queue_what_a_city_can_afford_to_build`
