## item_155_give_the_two_effects_their_settings_toggles - Give the two effects their settings toggles
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Everything in this project that costs frames can be switched off. UiSettings is a flat object of optional localStorage keys, so the toggles need no new machinery -- only a decision about which toolbar row they belong to.
- Keywords: UiSettings, effect toggle, Look row, World row, persisted default, off means not stepped
- Use when: adding a settings toggle for something that costs frames.
- Skip when: quality sliders, reorganising the other toolbar rows, and changing how UiSettings is read or written.

# Problem
- The explosion and the fire cost frames, and everything else in this project that costs frames can be switched off -- `show-decor`, `show-shadows`, `show-lights`, the four `fx-*` toggles, the frame cap.
- `UiSettings` (src/ui/saves.ts:81-103) is a flat object of optional keys in localStorage, so new keys are backward compatible and an absent key falls back to its default. No new machinery is needed.
- Which row they belong to is a real choice: `Look` holds the visual effects, `World` holds what is drawn. It should be decided once for both toggles.

# Scope
- In:
  - A toggle for each effect, in the row the decision picks, wired through controls.ts and persisted in UiSettings.
  - Off meaning nothing is drawn and nothing is stepped, not merely hidden.
  - A recorded default for each.
- Out:
  - A quality slider or per-effect intensity.
  - Reorganising the other toolbar rows.
  - Changing how UiSettings is read or written.

# Acceptance criteria
- Each effect has a toggle, and the choice survives a reload.
- With an effect off, nothing for it is drawn or stepped.
- The row both toggles live in was chosen deliberately, and the reason is recorded.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: Each effect has a toggle, and the choice survives a reload.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Primary task(s): `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`

# Priority
- Priority: Medium
- Rationale: It cannot land before there are two effects to switch off, and it is cheap once they exist.
