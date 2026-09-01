## item_089_a_threat_the_city_generates_and_a_military_that_is_measured_against_it - A threat the city generates, and a military that is measured against it
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 14:39:38

# AI Context
- Summary: The delivery slice for the two balance questions nobody has asked: how fast a city brings the wave on itself, and whether the military it can afford matches the kaiju that arrives.
- Keywords: threat, city, generates, military, measured, against
- Use when: Working on wave timing, threat generation, or the military-versus-threat measurement.
- Skip when: You need combat duration or hit points, which the legibility request owns.

# Problem
- `nextWaveAtSeconds` is sixty and never moves, so a sprawling city and a consolidated one face the same kaiju at the same moment and neither choice is priced.
- The threat itself is a constant six hundred hit points derived from nothing about the city.
- Nobody has measured the other side: battery damage scales with parcel area, a military parcel demands eight workers a cell -- the highest cost in the game -- and it is unknown whether a reasonably played city arrives at its first wave over-armed, under-armed, or unable to field a battery at all.
- Without the measurement, every balance decision in this game is taken by feel, and the harness that was supposed to prevent that generated its own random numbers.

# Scope
- In:
  - Make wave arrival depend on threat the city generates by existing and growing, rather than on a fixed countdown, and keep the countdown readable so the player can still see it coming.
  - Design it alongside the threat scaling the loop-closure request owns: that one makes the threat depend on the city, this one makes the arrival depend on accumulated threat, and they are one rule from two sides.
  - Measure, across seeds and through the playthrough harness, what military a reasonably played city can afford, staff and place by its first wave, against the kaiju that arrives.
  - Report the gap rather than closing it by hand -- if a competent city cannot field a battery in time, that is the finding, and the retune belongs where combat balance is owned.
  - Extend the existing balance harness rather than building a second one; if the legibility request has already rewritten it, build on that.
  - Record the numbers and the reasoning so the next change starts from a stated intent.
  - This is the one persisted field in the whole corpus that is not additive: accumulated threat
    changes what `nextWaveAtSeconds` means, so an older save cannot be read by defaulting a missing
    field. Decide what a save written before this becomes -- a fresh accumulator, or a value derived
    from the city it describes -- and say so, rather than letting it default into a wave that never
    arrives or arrives at once.
- Out:
  - Retuning combat duration, hit points or reload, which the legibility request owns.
  - A second balance harness.
  - New wave types or abilities.
  - Difficulty tiers.

# Acceptance criteria
- AC1: A wave arrives on accumulated threat the city generated, and the countdown to it stays readable.
- AC2: Sprawling and consolidating produce measurably different wave timings.
- AC3: The military a city can field by its first wave is measured against the threat across seeds, and the gap is reported.
- AC4: There is one balance harness, extended rather than duplicated, and the numbers chosen are written down.
- AC5: A save written before accumulated threat existed loads into a stated, deliberate wave schedule.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: `src/sim/wave.ts` accumulates threat and keeps `nextWaveAtSeconds` readable; `src/sim/wave.test.ts` covers arrival and countdown.
- request-AC5 -> This backlog slice. Proof: `src/sim/wave.test.ts` proves sprawling and consolidated cities reach different first-wave times; `npm run balance` reports military gap across six playthrough seeds.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_023_a_game_that_plays_itself_once_before_anyone_believes_it`
- Architecture decision(s): (none yet)
- Request: `req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable`
- Primary task(s): `task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
