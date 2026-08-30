## prod_016_a_city_you_can_change_your_mind_about - A city you can change your mind about
> Date: 2026-08-30
> Status: Settled
> Related request: `req_019_let_the_player_take_back_the_last_thing_they_did`
> Related backlog: `item_063_snapshot_the_city_s_model_into_a_bounded_history`
> Related task: `task_021_let_the_player_take_back_the_last_thing_they_did`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-30 18:17:01

# Overview
city-jump is careful, hand-shaped work -- a curve takes three considered clicks -- and it has no undo. One misplaced bulldoze and the only recovery is to redraw from memory or reload and lose everything since the last autosave. The model already knows how to snapshot and restore itself all-or-nothing, so the machinery is nearly free; the work is deciding what one step is, and making sure nothing in the program is still pointing at a road that stopped existing.

```mermaid
flowchart TB
    Edit[Any city change: road, bulldoze, plant, spray, zone] --> Gesture{One gesture = one entry}
    Gesture -->|press to release| Snap["serializeCity snapshot, pushed before the change"]
    Snap --> Hist[(Bounded history, redo branch discarded on new change)]
    Refused[Refused change] -.->|no entry| Hist
    Hist -->|undo / redo| Restore["restoreCity, all-or-nothing"]
    Restore --> Renum[replayCity renumbers every node id]
    Renum --> Clear[Selection, follow camera, pending draw: cleared or re-resolved]
    Restore --> Full[Full rebuild, then autosave]
    Full -.->|must not push a new entry| Hist
```

# Goals
- A mistake costs one keystroke, not five minutes of redrawing.
- One gesture undoes in one press, whatever that gesture planted or painted.
- Nothing in the program survives an undo still pointing at something that is gone.
- The simplest thing that works ships first, with its ceiling written down.
- Undo touches the city and leaves the view alone.

# Non-goals
- A named or browsable history, a timeline, or restore points.
- Undoing settings, camera moves, the sun hour, or view switches.
- Undo across a page reload, or history carried in a save or a share link.
- Collaborative or multi-user editing history.
- An operation log with per-edit inverses, unless snapshots are measured and found wanting.
- Changing what any of the build tools do.

# Scope and guardrails
- In: undo and redo over the city model -- graph, plantings and zones -- from the toolbar and the keyboard.
- In: the gesture boundaries that make a spray burst or a zone stroke one step.
- Out: a browsable history, a timeline, or restore points; undoing settings, camera or the sun hour.
- Out: history across a reload, or history carried in a save or a share link.

# Key product decisions
- Snapshots before an operation log: the model already serialises and restores all-or-nothing, so the cheap answer ships first and its ceiling is measured and written down.
- The undoable thing is a change to the model, never a change to the meshes -- the graph is the source of truth.
- A load is not an edit: every path that replaces the whole city clears the history.

# Success signals
- A misplaced bulldoze costs one keystroke, not five minutes of redrawing.
- One gesture undoes in one press, whatever it planted or painted.
- Nothing survives an undo still pointing at a road that stopped existing.

# References
- Product back-reference: `item_063_snapshot_the_city_s_model_into_a_bounded_history`
- Task back-reference: `task_021_let_the_player_take_back_the_last_thing_they_did`
