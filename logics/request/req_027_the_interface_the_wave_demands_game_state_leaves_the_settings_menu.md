## req_027_the_interface_the_wave_demands_game_state_leaves_the_settings_menu - The interface the wave demands: game state leaves the settings menu
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: prod_019 end to end: game state leaves the settings menu, the wave banner and the time controls take the top of the screen, the city strip carries what can kill you, the gauges open a ledger that shows the arithmetic, and the map gains the State view and the alerts.
- Keywords: interface, wave, demands, game, state, leaves, settings, menu
- Use when: Working on layout, readouts, the ledger, alerts, or anything about where information lives on screen.
- Skip when: You need a simulation rule -- what a number means belongs to prod_018.

# Needs
- Four slices will have added things to read by the time this lands, which is why it lands after
  them: laying out a screen before knowing what goes on it is how a screen gets laid out twice.
- The needs panel lives inside a menu that folds away. That was fine while it was decoration and
  is wrong now that it is the thing being played against.
- The ledger is what makes the rest honest: a rule returns the number and the terms that made it,
  and the panel displays what the calculation reported rather than recomputing it.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: The settings menu contains nothing a player needs during a wave.
- AC2: The wave banner and the time controls are permanent, and the compact city strip carries
  money, workers, food and what is short.
- AC3: Clicking the gauges opens a ledger: sources and sinks per resource, and formulas with this
  city's values substituted into them.
- AC4: No formula is written down twice -- the ledger displays terms the simulation reported.
- AC5: A State view colours buildings by why they are not working, and a district going dark
  raises a one-line alert.
- AC6: No permanent readout is added without another being removed or folded.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_019_an_interface_for_a_city_you_can_lose`
- Architecture decision(s): (none yet)

# References
- `src/sim/` -- the deterministic rules this slice adds to.
- `src/render/` -- where they become something on screen.
- `docs/performance.md` -- the budget every slice is measured against.

# Backlog
- `item_076_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`
