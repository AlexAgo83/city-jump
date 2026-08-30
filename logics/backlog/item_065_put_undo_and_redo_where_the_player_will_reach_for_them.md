## item_065_put_undo_and_redo_where_the_player_will_reach_for_them - Put undo and redo where the player will reach for them
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:37:13

# AI Context
- Summary: Toolbar controls plus Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, joining the one existing `keydown` handler in `src/app/app.ts`, inert while a text field or browser prompt has focus. Nothing to undo says so through `showRefusal` rather than failing silently.
- Keywords: put, undo, redo, player, reach, them
- Use when: Adding the undo/redo controls or their keyboard shortcuts.
- Skip when: The work adds a history list or timeline, a shortcuts screen, rebinding, or restructures the toolbar.

# Problem
- There is nowhere to press. The toolbar holds tools and settings, and the only keyboard bindings in the app are the camera's arrow keys in `src/app/app.ts` and Esc in `src/render/drawTool.ts`.
- A control that does nothing when there is nothing to undo is indistinguishable from a broken one, which is the same class of silence `run_007_the_code_says_it_drew_it_and_the_screen_disagrees` is about.
- A global Ctrl+Z that fires while someone is typing a save name or answering a prompt takes back a road instead of a character.

# Scope
- In:
  - Undo and redo controls in the toolbar in `index.html`, wired through `src/ui/controls.ts` like every other control.
  - Ctrl+Z and Ctrl+Shift+Z, with the Cmd equivalents on macOS, joining the existing `keydown` handling -- and inert while a text field or a browser prompt has focus.
  - Disable or refuse clearly when there is nothing to undo or redo, using the existing `showRefusal` path rather than a silent no-op.
  - Extend `scripts/interact.mjs` for the button and the shortcut, both directions.
  - Check the toolbar still lays out at the narrow widths the existing media query covers.
- Out:
  - A visible history list, a timeline, or restore points.
  - Rebinding, a shortcuts screen, or any other keyboard shortcut.
  - Changing the toolbar's structure beyond adding the two controls.

# Acceptance criteria
- AC1: Undo and redo are reachable from the toolbar and from Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
- AC2: The shortcut does not fire while a text field or a browser prompt has focus.
- AC3: With nothing to undo or redo the controls say so rather than doing nothing silently.
- AC4: The browser interaction suite covers both controls and both shortcuts, and the toolbar still lays out at narrow widths.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Undo and redo are reachable from the toolbar and from Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
- request-AC8 -> This backlog slice. Proof: AC2: The shortcut does not fire while a text field or a browser prompt has focus.
- request-AC9 -> This backlog slice. Proof: AC3: With nothing to undo or redo the controls say so rather than doing nothing silently.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_016_a_city_you_can_change_your_mind_about`
- Architecture decision(s): (none yet)
- Request: `req_019_let_the_player_take_back_the_last_thing_they_did`
- Primary task(s): `task_021_let_the_player_take_back_the_last_thing_they_did`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
