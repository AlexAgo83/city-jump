## item_087_a_run_panel_that_carries_what_the_player_is_playing_with - A run panel that carries what the player is playing with
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:46:36

# AI Context
- Summary: The delivery slice for the play screen: the web moves to between runs, the permanent readouts obey the rule the interface slice set, and the two destructive controls stop being one stray click away.
- Keywords: run, panel, carries, player, playing
- Use when: Working on the run panel, what is permanent on screen, or the evacuate and hardcore controls.
- Skip when: You need what the upgrades do, which is the other slice.

# Problem
- `#run-panel` is `position: fixed` with no hidden state and carries a wave counter, a science counter, a prestige counter, a hardcore checkbox, an Evacuate button and nine upgrade buttons wrapping across up to 560 pixels of the play screen.
- The interface slice immediately before it decided that no permanent readout is added without another being removed or folded. Six permanent elements were added and nothing was folded.
- Prestige cannot change during a run -- science becomes prestige only through `carryScience` on evacuation -- so for most of a run the web is not merely ineffective but unspendable, and still on screen throughout.
- Evacuate ends the run on a single click with no confirmation, and the hardcore checkbox decides whether a defeat deletes the run's save while being toggleable at any moment during that run.

# Scope
- In:
  - Move the prestige web to where prestige is earned and spent: between runs, on the screen that follows an evacuation or precedes a new run.
  - Reduce the permanent panel to what a player uses while playing, and apply the interface slice's own rule -- anything that stays permanent displaces something that was.
  - Put a confirmation in front of ending a run, in the shape the app already uses for a refusal or a destructive choice.
  - Take the hardcore checkbox off the play screen. Where it lands is settled by the end-to-end
    request's Gameplay settings section, which supersedes this slice's earlier wording about
    'where a run begins' -- that slice moves it in, this one only stops it being here. Do not
    build a second home for it.
  - Check the interaction script still drives what it needs to drive, since it clicks these controls.
  - Keep every readout reachable -- this is about what is permanent, not about hiding the run's state.
- Out:
  - What the upgrades do, which is the other slice.
  - A general menu or settings framework.
  - Restyling the panel beyond what moving things out of it requires.
  - Changing how evacuation or defeat resolves.

# Acceptance criteria
- AC1: The prestige web is not on the play screen and is reachable between runs.
- AC2: The permanent run readouts obey the rule that nothing is added permanently without something being folded.
- AC3: Ending a run requires a confirmation.
- AC4: Hardcore is no longer toggleable from the play screen, its new home is the Gameplay settings
  section rather than a second one invented here, and the browser interaction suite still passes.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The prestige web is not on the play screen and is reachable between runs.
- request-AC5 -> This backlog slice. Proof: AC2: The permanent run readouts obey the rule that nothing is added permanently without something being folded.
- request-AC6 -> This backlog slice. Proof: AC3: Ending a run requires a confirmation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_022_a_purchase_screen_is_not_a_play_screen`
- Architecture decision(s): (none yet)
- Request: `req_031_a_panel_that_sells_nothing_nine_upgrades_with_no_effect_permanently_on_the_play_screen`
- Primary task(s): `task_033_make_the_prestige_web_real_and_take_it_off_the_play_screen`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
