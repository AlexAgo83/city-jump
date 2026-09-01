## item_090_a_gameplay_section_in_settings_hardcore_pacifist_instant_build_free_build - A Gameplay section in settings: hardcore, pacifist, instant build, free build
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:58:25

# AI Context
- Summary: The delivery slice for the Gameplay settings section: hardcore moved off the play screen, a pacifist switch, instant construction and free building.
- Keywords: gameplay, section, settings, hardcore, pacifist, instant, build, free
- Use when: Working on the settings menu, the gameplay switches, or how a run records its rules.
- Skip when: You need the harness or the balance measurement.

# Problem
- The settings menu has rows for World, Look, Sun and Camera and nothing for how the game plays.
- Hardcore -- which decides whether a defeat deletes the run's save -- sits on the play screen and can be toggled at any point during the run it governs.
- There is no way to build a city without a clock running against it. A city builder whose monster cannot be switched off has one mode.
- Construction time and build cost are exactly what someone testing the rest of the game wants to skip, and skipping them currently means editing constants.

# Scope
- In:
  - A Gameplay section in the settings menu, in the same row shape the existing sections use.
  - Move hardcore into it. This supersedes the run-panel request's wording about 'where a run begins'; that slice should note the move rather than making it too.
  - A kaiju spawn switch: off makes a pacifist city builder. Say plainly what stops accruing when it is off -- science, prestige, wave progression -- rather than leaving them silently inert.
  - An instant construction switch and a separate free-building switch, each built after the thing it switches exists: costs come back in the legibility request's construction slice, and the construction stage is shortened there too.
  - Carry the switches with the run so a saved game resumes with the same rules, and honour them in
    the headless harness so a scenario can be played with construction instant, costs off, or no
    kaiju. Persist them the way this repository already persists new state -- optional fields with
    defaults, no version bump -- so a save written before the switches existed loads with them off.
  - Keep the interface slice's rule intact: none of these is needed during a wave, which is why the settings menu is the right home for them.
- Out:
  - Difficulty tiers, scoring, achievements or modifiers built on top of these switches.
  - A general settings framework -- these are rows in the menu that already exists.
  - Changing what hardcore does.
  - New switches beyond these four.

# Acceptance criteria
- AC1: The settings menu has a Gameplay section carrying hardcore, kaiju spawn, instant construction and free building.
- AC2: Hardcore is no longer on the play screen.
- AC3: With the kaiju spawn off no wave arrives, and what stops accruing is stated in the interface rather than silently inert.
- AC4: Instant construction and free building each do what they say, and each is covered by a test.
- AC5: The switches survive a save and a reload, and the headless harness honours them.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The settings menu has a Gameplay section carrying hardcore, kaiju spawn, instant construction and free building.
- request-AC7 -> This backlog slice. Proof: AC2: Hardcore is no longer on the play screen.
- request-AC8 -> This backlog slice. Proof: AC3: With the kaiju spawn off no wave arrives, and what stops accruing is stated in the interface rather than silently inert.
- request-AC9 -> This backlog slice. Proof: AC4: Instant construction and free building each do what they say, and each is covered by a test.
- request-AC10 -> This backlog slice. Proof: AC5: The switches survive a save and a reload, and the headless harness honours them.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_023_a_game_that_plays_itself_once_before_anyone_believes_it`
- Architecture decision(s): (none yet)
- Request: `req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable`
- Primary task(s): `task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
