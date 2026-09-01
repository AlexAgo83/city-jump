## item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it - A defence that can actually be fielded, and a city that grows enough to staff it
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:41:59

# AI Context
- Summary: The delivery slice for a defendable first wave: three staffed batteries, a fight held in 20-40 seconds over 5-8 salvos, and a population that grows enough to man it.
- Keywords: defence, can, actually, fielded, city, grows, enough, staff
- Use when: Working on military parcel sizing, workforce demand, the workforce fraction, or population growth.
- Skip when: You need kaiju hit points, reload or damage per cell, which are already in target.

# Problem
- `allowedSizes` forces military into `INDUSTRIAL_SIZES`, whose smallest member is 1x4. `workforceDemand` charges military eight workers a cell. So the smallest possible battery costs 32 workers.
- `workforceFromPopulation` returns half the population, so a battery requires a population of 64.
- `growth` is `jobs * 0.03 * day`, which moves a city of 12 to 12.1 across the 134 seconds before the first wave. The population needed is never approached.
- The result is zero batteries in every mode, a playthrough whose own combat runs to its 90-second cap with 0 salvos, and every balance figure in the game measured on a city of twelve that never changes.

# Scope
- In:
  - Make the first wave answerable, to a stated outcome: a city that zoned a military district fields at least three staffed batteries, and its own fight is held in 20 to 40 seconds over 5 to 8 salvos.
  - The levers are yours and none is mandated: the minimum parcel size military may occupy, the eight workers a cell it demands, the half-of-population workforce fraction, whether a partly staffed battery fires at reduced damage, and the growth rate. Pick deliberately, and record which levers moved and why.
  - Population growth is the lever with the widest blast radius and probably the real answer, since every other balance figure is currently taken on a city that does not change. Whatever is chosen, growth stays capped by housing and gated by food.
  - Do not touch the kaiju's hit points, reload or damage per cell -- those are inside their target already. This slice changes what the city can bring, not what it faces.
  - Check the composition, not the parts: after each lever moves, run the harness and read the battery count, the population, the salvo count and the verdict together. Two individually correct changes producing zero batteries is the defect this slice exists to undo.
  - Record the chosen numbers and the levers rejected, so the next change starts from a stated intent.
- Out:
  - Kaiju hit points, reload, damage per parcel cell, or wave scaling.
  - New building kinds, new resources, or difficulty settings.
  - What the harness reports, which is the next slice.

# Acceptance criteria
- AC1: A playthrough that zoned a military district fields at least three staffed batteries at its first wave.
- AC2: That playthrough's own fight is held, lasts 20 to 40 seconds and takes 5 to 8 salvos.
- AC3: Population at the first wave is sufficient to staff that defence, and growth is still capped by housing and gated by food.
- AC4: The levers moved and the levers rejected are both recorded, with their numbers.

# Post-review balance record
- The first pass reached three batteries by moving three military levers the same way: one worker a
  cell (below commercial's four and industrial's six), a demand limit of `population / 10` (six times
  looser than housing) and a workforce of the whole population. The number was met and the survival
  brief's premise was inverted -- the military became the cheap, most permitted choice.
- Re-tuned by sweeping the two levers that carry the premise, measured through `npm run balance`:

  | workers/cell | limit | batteries | combat | salvos |
  |---|---|---|---|---|
  | 1 | /16 | 2.7 | 22.7 s | 6.3 |
  | 1 | /24 | 2.5 | 24.7 s | 6.8 |
  | 2 | /24 | 2.8 | 28.0 s | 7.7 |
  | **3** | **/24** | **3.0** | **22.8 s** | **6.3** |
  | 4 | /24 | 2.8 | 24.0 s | 6.7 |
  | 5 | /24 | 2.5 | 26.0 s | 7.2 |
  | 7 | /24 | 2.2 | 30.0 s | 8.2 |
  | 8 | /24 | 2.3 | 28.8 s | 7.8 |

- Retained: three workers a cell, limit `population / 24`. It is the highest workforce price that
  still fields three batteries inside the twenty-to-forty-second and five-to-eight-salvo targets;
  above it the count falls and the salvos leave the band. Held 6/6 across seeds, population 126.1,
  treasury $16,050 on the paid run.
- The trade-off the brief asks for is measurable at these numbers: the barracks take 62% of the
  workforce, five of twenty-one farms are staffed and no shop is.
- Left open deliberately: military costs less per cell than commercial (4) and industrial (6). The
  wave's arrival scales with the city, so a city cannot grow past roughly 130 people before its first
  wave, which caps what a barracks can be made to cost. Raising it further is a wave-timing question,
  not a workforce one, and belongs to whoever revisits the threat rate.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A playthrough that zoned a military district fields at least three staffed batteries at its first wave.
- request-AC2 -> This backlog slice. Proof: AC2: That playthrough's own fight is held, lasts 20 to 40 seconds and takes 5 to 8 salvos.
- request-AC3 -> This backlog slice. Proof: AC3: Population at the first wave is sufficient to staff that defence, and growth is still capped by housing and gated by food.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Primary task(s): `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them`

# Notes
- Task `task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them` was finished via `logics-manager flow finish task` on 2026-09-01.
