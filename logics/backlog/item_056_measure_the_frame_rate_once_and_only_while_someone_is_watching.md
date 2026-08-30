## item_056_measure_the_frame_rate_once_and_only_while_someone_is_watching - Measure the frame rate once, and only while someone is watching
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: One smoothed frame-rate value that both the on-screen counter and `measureFps` read, sampled only while the counter is on. A per-frame reciprocal is unreadable, so the display cadence is slower than the sample cadence, and the smoothing is a pure function with unit tests.
- Keywords: measure, frame, rate, once, only, while, someone, watching
- Use when: Adding or changing frame-rate measurement in `src/render/debugApi.ts` or the per-frame hooks in `src/app/app.ts`.
- Skip when: The work draws anything on screen, adds settings UI, or introduces frame-time history, percentiles or graphs.

# Problem
- The frame rate is measured today only inside `measureFps` in `src/render/debugApi.ts`, which counts frames over a fixed window at the request of a script and then stops. There is nothing a continuously displayed counter can read.
- A number recomputed as the reciprocal of each frame's delta is unreadable: it changes faster than the eye can settle and turns a steady 60 into flicker.
- A counter that keeps sampling while it is switched off is a cost with no reader, in exactly the part of the code the project has just spent a request making cheaper.

# Scope
- In:
  - One frame-rate measurement, smoothed, that both the on-screen counter and `measureFps` read -- so the figure the player sees and the figure the suite asserts cannot disagree.
  - Update the displayed value on a slower cadence than it is sampled, chosen so the number is readable rather than twitching.
  - Start and stop the sampling with the setting, so nothing runs while the counter is hidden.
  - Keep the smoothing pure and unit-tested: feeding a sequence of frame deltas to a function and asserting the value it settles on needs no scene, and belongs beside the other `src/` unit tests.
  - Confirm `measureFps` still returns what `scripts/interact.mjs` and the visual suite expect.
- Out:
  - Anything drawn on screen, and any settings UI.
  - Frame-time history, percentiles, or a graph.
  - Changing what the existing performance checks assert.

# Acceptance criteria
- AC1: One measurement feeds both the counter and `measureFps`, proven by them agreeing.
- AC2: The smoothing is a pure function with unit tests over a sequence of frame deltas.
- AC3: With the counter off, no per-frame sampling work runs.
- AC4: The existing performance checks in the interaction and visual suites still pass unchanged.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: One measurement feeds both the counter and `measureFps`, proven by them agreeing.
- request-AC6 -> This backlog slice. Proof: AC2: The smoothing is a pure function with unit tests over a sequence of frame deltas.
- request-AC7 -> This backlog slice. Proof: AC3: With the counter off, no per-frame sampling work runs.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_013_a_city_that_tells_you_what_it_costs_to_draw`
- Architecture decision(s): (none yet)
- Request: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
- Primary task(s): `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
