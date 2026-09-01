## item_080_a_fight_long_enough_to_have_a_shape_and_a_harness_that_can_prove_it - A fight long enough to have a shape, and a harness that can prove it
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:26:11

# AI Context
- Summary: The delivery slice for combat length: hit points, damage, reload and wave scaling retuned together, and a balance harness rewritten to drive the real simulation instead of a random number.
- Keywords: fight, long, enough, shape, harness, can, prove
- Use when: Working on wave balance numbers or on `scripts/balance.mjs`.
- Skip when: You need the kaiju's behaviour, the missile rendering, or the run economy above the wave.

# Problem
- 600 hit points against a 4x3 military parcel's 144 damage every 2.5 seconds is four salvos and about ten seconds. A competent first defence deletes the wave before the player has found it.
- Raising hit points alone would make the fight longer and no more legible: the numbers that matter are hit points, damage per parcel cell, reload, and how a wave scales after the first.
- `scripts/balance.mjs` imports nothing from `src/`. Its defence score is `0.44 + rnd() * 0.42`, so `balance/history.jsonl` records the behaviour of a random number generator and the run slice's AC6 cites it as evidence.
- Without a harness on the real simulation, any new balance is an opinion and the next change to the numbers silently invalidates it.

# Scope
- In:
  - Retune `WAVE_STARTING_VALUES` as a set so a competent first defence runs roughly twenty to forty seconds and five to eight significant salvos.
  - Revisit how a wave scales after the first, so later waves stay in a readable band rather than collapsing to the same ten seconds with bigger numbers.
  - Rewrite `scripts/balance.mjs` to drive the actual wave simulation from `src/` -- the kaiju loop, the batteries, the clock -- and report combat duration and salvo count alongside the run distribution.
  - Record the retained numbers and the reasoning in the closeout, so the next change to them starts from a stated intent.
  - Run the harness after the retune and keep the recorded figures in `balance/history.jsonl`.
- Out:
  - Wave special abilities, resistances, or several kaiju types.
  - Changing the science or prestige economy the run slice settled.
  - Performance gating the harness in CI.

# Acceptance criteria
- AC1: A competent first defence takes roughly twenty to forty seconds and five to eight significant salvos to kill the first kaiju.
- AC2: The retune covers hit points, damage, reload and wave scaling together, with the chosen numbers and their reasoning documented.
- AC3: `npm run balance` drives the real wave simulation from `src/` and reports combat duration and salvo count.
- AC4: A recorded harness run in `balance/history.jsonl` shows the duration target met.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A competent first defence takes roughly twenty to forty seconds and five to eight significant salvos to kill the first kaiju.
- request-AC7 -> This backlog slice. Proof: AC2: The retune covers hit points, damage, reload and wave scaling together, with the chosen numbers and their reasoning documented.

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
