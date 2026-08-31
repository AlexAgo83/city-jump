## req_021_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not - The wave, in one slice: a kaiju lands and the city holds or does not
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The vertical slice of an attack, hardcoded: a countdown, a kaiju that lands at a random coast and walks at the nearest building, military parcels that fire on a reload, destruction that leaves rubble, and a banner that says held or breached. It exists to answer whether a wave is worth watching before anything is built to serve one.
- Keywords: wave, slice, kaiju, lands, city, holds, does, not
- Use when: Building or reviewing the first attack, the kaiju's model and gait, or the fight between batteries and a wave.
- Skip when: You need the economy, the run, prestige, or any number that a balance harness should be producing.

# Needs
- A city that cannot be lost is a drawing tool. Before the economy, the runs and the prestige that
  `prod_018` describes are built, one wave has to exist and be watched, because everything else in
  that brief is worth building only if this is worth watching.
- Nothing in this slice is a number anyone should defend: the threat, the reload, the range and the
  kaiju's speed are constants chosen to make one wave playable in a minute. The balance harness is
  a later slice and these values are its input, not its output.
- The pieces it needs already exist in some form. A kaiju walks a polyline the way a car does, it
  destroys the way the bulldozer does, and the destruction repaints through the dirty-region
  rebuild. What has to be written is the wave clock, the fight, and the monster itself.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: A countdown runs to a wave; when it lands a kaiju arrives at a random map edge away from
  the bridge, makes for the nearest point of the coast and then for the building nearest to it.
- AC2: The kaiju destroys buildings on contact, leaving rubble; the city's graph, saves and undo
  history stay coherent through it, and undo cannot take back what the wave did.
- AC3: Every military parcel that exists is a battery: one range for all, damage per salvo
  proportional to the parcel's area, firing on a fixed reload while the kaiju is in range.
- AC4: The kaiju has hit points equal to the announced threat and dies when they run out; a banner
  shows threat against the city's firepower before the wave and says held or breached after it.
- AC5: `sim/kaiju.ts` is pure and covered by tests that run with no renderer, from a fixed seed:
  where it lands, what it targets, where it is at time t.
- AC6: A wave runs inside the frame budget `docs/performance.md` records for the reference city,
  measured rather than asserted.

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
- `item_070_the_wave_in_one_slice_a_kaiju_lands_and_the_city_holds_or_does_not`
