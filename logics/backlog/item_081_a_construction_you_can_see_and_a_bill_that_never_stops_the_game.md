## item_081_a_construction_you_can_see_and_a_bill_that_never_stops_the_game - A construction you can see, and a bill that never stops the game
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:58:25

# AI Context
- Summary: The delivery slice for what the city shows and pays: a building that visibly rises with a live progress readout, a shorter stage, and building costs deducted without ever refusing a build.
- Keywords: construction, you, can, see, bill, never, stops, game
- Use when: Working on construction feedback, the building lifecycle, building prices, or the treasury.
- Skip when: You need the wave itself, or the consequences of a negative balance, which are later work.

# Problem
- `buildingStateScaleY` returns a flat 0.28 for the whole of `BUILDING_STAGE_SECONDS`, so a building under construction is a stub at a fixed height for sixty seconds and then it is finished. Nothing rises and nothing reads as a site.
- Selecting the parcel says "Construction" and nothing else -- no percentage, no time left -- and the state is only recomputed on the twenty-second demand step, so a readout would be stale even if it existed.
- Buildings cost nothing: `e1567fa` removed `buildingBuildCost`, the funding queue and the demolition refund, which were AC1 to AC3 of the money slice, from a request still marked Done at 100%.
- The queue is not wanted back. Refusing to build when the treasury is empty is a soft-lock, and the player who most needs to build is the one who just lost a wave.
- That removal left dead branches: `waiting` is unreachable in `src/sim/buildingLifecycle.ts` while `src/render/buildings.ts` still paints it, `stateLabel` still names it, and the money tooltip still reports a count that is always zero.

# Scope
- In:
  - Make a building rise progressively over its stage and read as a site rather than as a short finished building.
  - Derive construction progress from `startedAt` and the current time when it is read, so a selected parcel can show a live percentage and a countdown rather than a state refreshed three times a minute.
  - Show the progress on the selection panel, in the shape `Construction -- 42 % -- 12 s remaining`, and the same for a rebuild after a wave.
  - Bring `BUILDING_STAGE_SECONDS` down into the fifteen to thirty second range, as one constant for every kind.
  - Reinstate a per-building cost, deducted when construction starts, using the `allowDebt` path `Treasury.spend` already has -- a shortfall lets the balance go negative and refuses nothing.
  - Apply the same rule to roads: priced, deducted, never refused for lack of funds.
  - Rebuilding after a wave charges full price. A rebuild goes through the same construction path,
    so it is billed if construction is, and that is deliberate: a wave that flattens half the city
    and leaves the balance deeply negative is the most legible signal this game can produce, and it
    costs no code. The fraction -- charging half because the plot and foundations survived -- is the
    deferred knob if the negative spiral proves unfun, and the balance harness is what should decide
    it rather than taste.
  - Restore the demolition refund for buildings. `demolitionRefund` still exists and is still wired
    for roads in `src/render/drawTool.ts`; only the building call was deleted, so restoring the
    price restores the refund for one line.
  - Remove the branches the money removal left unreachable, or make them reachable again, so nothing paints a state that cannot happen.
  - Follow the repository's save convention rather than bumping a version: every new persisted field
    is optional with a default, which is how `city.run ?? createRun()` and `state.population ?? 12`
    already keep older saves loading. Confirm a save written before this still loads, that a building
    saved mid-construction resumes at its progress rather than restarting or completing, and that
    reloading does not charge its cost a second time.
- Out:
  - Per-kind construction durations, which are later work.
  - Construction materials, crews, or any resource a site consumes.
  - Consequences of a negative balance: debt, interest, maintenance, penalties, service decay.
  - Reinstating the funding queue or any refusal to build.

# Acceptance criteria
- AC1: A building under construction rises over its stage and is unmistakable from a finished one, rebuilds included.
- AC2: A selected parcel under construction shows its percentage and its remaining seconds, both live.
- AC3: The construction stage is between fifteen and thirty seconds.
- AC4: Building a building deducts its cost, and a treasury that cannot cover it goes negative rather than refusing -- proven by a test that builds from a negative balance.
- AC5: No unreachable building state remains painted, labelled or counted anywhere.
- AC6: A rebuild after a wave is charged like any construction, and demolishing a building returns half its price.
- AC7: An older save loads, and a building saved mid-construction resumes at its progress without being charged twice.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A building under construction rises over its stage and is unmistakable from a finished one, rebuilds included.
- request-AC9 -> This backlog slice. Proof: AC2: A selected parcel under construction shows its percentage and its remaining seconds, both live.
- request-AC10 -> This backlog slice. Proof: AC3: The construction stage is between fifteen and thirty seconds.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)
- Request: `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`
- Primary task(s): `task_031_make_the_wave_readable_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
