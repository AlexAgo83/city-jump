## item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone - Make one gesture one step, and leave nothing pointing at what is gone
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:17:01

# AI Context
- Summary: `replayCity` renumbers nodes on every restore, so every `NodeId`/`SegmentId` in the program is stale after an undo -- the selection, the follow-camera target and any pending draw all have to be cleared or re-resolved. And a spray burst is eight trees while a zone stroke is many paint events: both coalesce into one entry on the press/release boundary the brushes already have.
- Keywords: gesture, step, leave, nothing, pointing, gone
- Use when: Recording history entries at the points the city model changes, or handling identity across a restore.
- Skip when: The work builds the history structure itself, adds the toolbar or keyboard controls, or derives a dirty region from a snapshot diff -- a full rebuild is correct here.

# Problem
- `replayCity` renumbers nodes as it replays, so every `NodeId` and `SegmentId` held anywhere in the program is stale the moment a restore happens. The selection in `src/render/drawTool.ts` holds a segment, the follow camera in `src/app/app.ts` holds a closure over a mover, and a half-drawn curve holds two snapped nodes.
- A spray burst plants eight trees in one press and a zone-brush stroke fires paint after paint across one drag. Recorded naively, taking back one gesture costs the player eleven presses.
- Undo has to record before the change, not after, and only for changes that actually happened -- a refused segment must not leave an entry behind.

# Scope
- In:
  - Record a history entry at every point the city model changes: `commitSegment`, bulldoze, roundabout toggle, plant, clear, spray, zone paint and zone clear -- all of which already funnel through `onCommitted` or the nature callbacks in `src/render/drawTool.ts`.
  - Coalesce a continuous gesture into one entry: a spray burst and a zone stroke each open on press and close on release, following the same `lastSprayed` / pointer-up boundary the brushes already have.
  - Record nothing when a change was refused, so a rejected road leaves no entry.
  - On undo or redo, clear or re-resolve everything holding an id: the selection, the follow-camera target, and any pending draw stage.
  - Clear the history on every path that replaces the whole city rather than editing it: `loadCity` from the save picker, the autosave restore at startup, the bundled Demo seed, and a share-link import. A load is not an edit, and undoing across one hands the player a city they never had open.
- Route undo through the existing rebuild and autosave path, and make sure a restored state does not itself push a new history entry.
  - Leave the view alone: sun hour, camera, World settings and select view are untouched by undo.
  - Extend `scripts/interact.mjs`: draw and undo, spray and undo once, paint a zone stroke and undo once, and select a road then undo the road that carried the selection.
- Out:
  - The history structure itself, which is the previous slice.
  - The toolbar and keyboard controls, which are the next one.
  - Deriving a dirty region from the difference between two snapshots -- a full rebuild is correct, and this slice takes it.

# Acceptance criteria
- AC1: Every way the city can change produces exactly one history entry, and a refused change produces none.
- AC2: A spray burst and a single zone-brush stroke each undo in one press.
- AC3: After an undo nothing holds a stale node or segment id -- the selection, the follow camera and any pending draw are cleared or re-resolved, proven by undoing the road a selection was standing on.
- AC4: Undo leaves the sun hour, the camera and the settings exactly as they were.
- AC5: Loading a city -- from the picker, the autosave, the Demo seed or a share link -- clears the history, proven by a test that loads and then finds nothing to undo.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Every way the city can change produces exactly one history entry, and a refused change produces none.
- request-AC3 -> This backlog slice. Proof: AC2: A spray burst and a single zone-brush stroke each undo in one press.
- request-AC4 -> This backlog slice. Proof: AC3: After an undo nothing holds a stale node or segment id -- the selection, the follow camera and any pending draw are cleared or re-resolved, proven by undoing the road a selection was standing on.
- request-AC6 -> This backlog slice. Proof: AC4: Undo leaves the sun hour, the camera and the settings exactly as they were.
- request-AC10 -> This backlog slice. Proof: AC5: Loading a city -- from the picker, the autosave, the Demo seed or a share link -- clears the history, proven by a test that loads and then finds nothing to undo.

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

# Tasks
- `task_021_let_the_player_take_back_the_last_thing_they_did`

# Notes
- Task `task_021_let_the_player_take_back_the_last_thing_they_did` was finished via `logics-manager flow finish task` on 2026-08-30.
