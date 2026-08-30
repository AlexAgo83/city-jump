## req_019_let_the_player_take_back_the_last_thing_they_did - Let the player take back the last thing they did
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:17:00

# AI Context
- Summary: There is no undo: one bulldoze and five minutes of hand-shaped road is gone. The model already snapshots and restores itself all-or-nothing through `serializeCity`/`restoreCity`, so the machinery is nearly free. The work is deciding what one step is -- a spray burst and a zone stroke must each undo in one press -- and clearing every holder of a node or segment id, because `replayCity` renumbers on every restore.
- Keywords: let, player, take, back, last, thing, they, did
- Use when: Adding undo/redo, or anything that records or restores city model state across an edit.
- Skip when: The work adds a browsable history or timeline, undoes settings/camera/sun, persists history across a reload, or carries it in a save or share link.

# Needs
- There is no undo. Bulldoze a road the player spent five minutes shaping and it is gone -- the only recovery is to draw it again from memory, or reload and lose everything since the last autosave.
- Every other tool a person builds with has this, and its absence is felt hardest exactly where the game is strongest: the roads are careful, hand-shaped work, and the bulldozer is one click.
- The refusal messages already tell the player when something *cannot* be done. Nothing helps them when something could be done and should not have been -- which is the more common mistake.
- The autosave makes this worse rather than better: it writes two seconds after a mistake, so the wrong city is the saved city before the player has finished regretting it.

# Context
- The graph is the source of truth (`adr_001_keep_the_road_graph_as_the_source_of_truth`) and everything on screen is derived from it, so the thing to undo is a change to the model -- graph, plantings and zones -- and never a change to the meshes.
- The whole of that model already serialises and restores. `serializeCity(graph, plantings, zones, terrain, hour)` produces a `CitySave` and `restoreCity(graph, plantings, zones, save)` replays one all-or-nothing, dry-running into throwaway state first. A stack of snapshots is therefore almost no new code, and it is the shape to try before anything cleverer. The alternative -- a log of invertible operations -- is less memory and considerably more code, and every new kind of edit has to teach it a new inverse. Start with snapshots, measure, and record the ceiling with a `ponytail:` comment naming the upgrade path.
- The trap is identity. `replayCity` renumbers as it replays: it builds an `ids` map from saved node id to newly allocated node id, so **every `NodeId` and `SegmentId` in the program is stale after a restore**. Anything holding one across an undo has to be dropped or re-resolved -- the selection in `src/render/drawTool.ts`, the follow-camera target in `src/app/app.ts`, and any pending draw stage.
- What counts as one step is a design decision, not an implementation detail. A road placed, a segment bulldozed, a roundabout toggled and a tree planted are each obviously one. A spray burst plants eight trees, and a zone brush stroke fires many paint events across one drag -- both must coalesce into a single undoable step, or the player presses undo eleven times to take back one gesture. This is the same coalescing problem the brushes already solve for cost.
- An undo is a full model replacement, so it forces a full rebuild -- `rebuild()` with no dirty box. That is correct and it is the expensive path. Whether the affected region can be derived from the difference between two snapshots is worth asking, but correctness comes first and a full rebuild is always right.
- Undo changes the city, not the view. The sun hour, the camera, the World toggles and the select view are settings, not city data, and pressing undo must not move them. The terrain preset sits on the boundary: it is carried in the save but is not chosen in the UI any more, so it changes only on load.
- The autosave has to follow. `scheduleAutosave` runs at the end of every rebuild, so an undo that goes through the normal rebuild path is persisted for free -- but a state restored by undo must not itself become a new undo entry, or the stack never unwinds.
- Loading a city is not an edit, and the history must say so. Four paths replace the whole city without the player having built anything: the save picker's Load, the autosave restore at startup, the bundled Demo seed, and a share link imported from the URL fragment. Each of those starts a new city, so each clears the history -- undoing across a load would hand the player a city they never had open. State it and test it; a history that survives a load is the kind of bug that is only found by someone losing work.
- There is no keyboard shortcut infrastructure. `src/app/app.ts` registers one `keydown` listener for the camera's arrow keys; Esc is handled in `src/render/drawTool.ts`. A Ctrl/Cmd+Z binding joins that, and must not fire while the player is typing into a prompt or a save-name field.

# Acceptance criteria
- AC1: The player can undo the last change they made to the city, and redo it again, from the toolbar and from the keyboard.
- AC2: Undo covers every way the city can change: a road drawn, a road bulldozed, a roundabout toggled, a tree planted or cleared, a spray burst, and a zone painted or cleared.
- AC3: One gesture is one step -- a spray burst and a single zone-brush stroke each undo in one press, not once per tree or per pointer event.
- AC4: Undo never leaves a stale reference behind: the selection, the follow camera and any pending draw survive an undo or are cleared, and never point at something that no longer exists.
- AC5: Redo is available only until the player makes a new change, at which point the redo branch is discarded.
- AC6: Undo and redo change the city and nothing else -- the sun hour, the camera and the settings are untouched.
- AC10: Loading a city clears the history -- from the save picker, the autosave restore, the Demo seed or a share link -- so undo can never reach back past the city the player currently has open.
- AC7: The history has a stated bound, and the memory it costs at that bound is measured rather than assumed.
- AC8: The undo and redo controls say when there is nothing to undo or redo, rather than doing nothing silently.
- AC9: The browser interaction suite covers drawing, undoing, redoing, and undoing a brush stroke in one press; `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_016_a_city_you_can_change_your_mind_about`
- Architecture decision(s): (none yet)

# References
- src/sim/save.ts
- src/sim/graph.ts
- src/render/drawTool.ts
- src/app/app.ts
- src/ui/controls.ts
- src/ui/hud.ts
- index.html
- scripts/interact.mjs
- logics/runbook/run_006_change_what_a_save_contains_without_losing_the_player_s_city.md
- logics/architecture/adr_001_keep_the_road_graph_as_the_source_of_truth.md
- logics/roadmap/road_001_city_jump_playable_city.md

# Backlog
- `item_063_snapshot_the_city_s_model_into_a_bounded_history`
- `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`
- `item_065_put_undo_and_redo_where_the_player_will_reach_for_them`
