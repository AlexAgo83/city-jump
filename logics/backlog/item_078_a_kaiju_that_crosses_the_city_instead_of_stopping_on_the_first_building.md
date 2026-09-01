## item_078_a_kaiju_that_crosses_the_city_instead_of_stopping_on_the_first_building - A kaiju that crosses the city instead of stopping on the first building
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:24:02

# AI Context
- Summary: The delivery slice that turns the attack into a loop: the kaiju keeps choosing the nearest living building, attacking takes time, and the wave ends on a death rather than on a single loss.
- Keywords: kaiju, crosses, city, instead, stopping, first, building
- Use when: Working on the kaiju's targeting, the attack duration, or when a wave ends.
- Skip when: You need the missile rendering, the balance numbers, or anything about money.

# Problem
- `updateWave` in `src/app/app.ts` ends the wave with `finishWave("breached")` the moment any parcel falls inside the 25 m destruction radius. One building is the whole attack.
- `planKaiju` fixes `landing -> coast -> target` at wave start and `kaijuPositionAt` walks that polyline forever, so even without the end-of-wave rule the monster would stand still on a ruin.
- Destruction is instantaneous on contact, so steps four through seven of the intended loop -- attack until it falls, choose again, walk again -- have nowhere to happen.
- The bait strategy the product brief describes cannot exist while the target is chosen once.

# Scope
- In:
  - Replace the fixed path with a loop in `src/sim/kaiju.ts`: from the current position, take the nearest living building, walk to it, attack it until it is destroyed, then choose again while alive.
  - Keep the landing and the coast approach: they are the arrival and they read well.
  - Give the attack a duration, and expose the progress of it so a renderer can show a building being worked on rather than blinking out.
  - Move the end-of-wave rule: held when the kaiju's hit points reach zero, breached when the last living building is gone.
  - Keep the existing destruction path -- `rubble.destroy`, `buildingLifecycle.rebuild`, the dirty-box repaint -- and call it from the new loop rather than beside it.
  - Keep `src/sim/kaiju.ts` pure and replayable from a seed with no Babylon, per `adr_002_keep_simulation_independent_from_babylon_and_the_browser`, as the original attack slice's AC5 already requires.
- Out:
  - Target preferences by building kind, density seeking, or several kaiju behaviours.
  - Pathfinding around obstacles -- straight lines between targets are enough.
  - Balance numbers, which are their own slice.
  - Any change to what rubble is or how a destroyed parcel repaints.

# Acceptance criteria
- AC1: The kaiju destroys several buildings in one wave, choosing the nearest living one from its current position each time.
- AC2: A building takes a visible span of time to fall rather than vanishing on contact.
- AC3: The wave ends only on the kaiju's death or on the last building's, proven from a seed in a headless test.
- AC4: The targeting loop is deterministic and replays identically from the same seed with no renderer present.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The kaiju destroys several buildings in one wave, choosing the nearest living one from its current position each time.
- request-AC2 -> This backlog slice. Proof: AC2: A building takes a visible span of time to fall rather than vanishing on contact.
- request-AC3 -> This backlog slice. Proof: AC3: The wave ends only on the kaiju's death or on the last building's, proven from a seed in a headless test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_020_a_wave_the_player_can_actually_watch`
- Architecture decision(s): (none yet)
- Request: `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`
- Primary task(s): `task_031_make_the_wave_readable_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
