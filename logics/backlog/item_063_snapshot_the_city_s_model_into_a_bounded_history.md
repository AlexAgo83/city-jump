## item_063_snapshot_the_city_s_model_into_a_bounded_history - Snapshot the city's model into a bounded history
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A bounded history of `CitySave` snapshots in `src/sim`, built on the existing serialize/restore rather than a second representation of a city. Snapshots before an operation log: less code, and the memory ceiling gets measured and marked with a `ponytail:` comment naming the upgrade path rather than assumed either way.
- Keywords: snapshot, city, model, bounded, history
- Use when: Building or changing the undo history structure.
- Skip when: The work wires the history to the tools, adds UI or keyboard bindings, or persists history across a reload.

# Problem
- Nothing records what the city was a moment ago. The graph, the plantings and the zones are mutated in place by every tool, and the previous state is simply overwritten.
- The obvious cheap answer -- keep `CitySave` snapshots -- has a cost nobody has measured: a large city is a large payload, and an unbounded stack of them is a memory leak with a friendly name.
- The obvious clever answer -- a log of invertible operations -- is a lot more code and a standing tax on every future edit, which has to arrive with its own inverse.

# Scope
- In:
  - A history in `src/sim` holding snapshots of the city model, with undo and redo as pure operations over it, unit-tested with no scene.
  - Build it on `serializeCity` and `restoreCity` rather than a parallel representation, so it inherits the all-or-nothing replay and cannot introduce a second definition of what a city is.
  - A stated bound on the history depth, and a measurement of what that bound costs in memory on a city the size of the bundled Demo -- recorded, not guessed.
  - Discard the redo branch when a new change arrives, so the history is a line and not a tree.
  - Mark the snapshot approach with a `ponytail:` comment naming its ceiling and the operation-log upgrade path, so the next person meets the reasoning rather than the surprise.
  - Unit tests: undo returns the previous city exactly, redo returns the one after it, a new change discards the redo branch, and the history never exceeds its bound.
- Out:
  - Wiring the history to the tools, which is the next slice.
  - Any UI or keyboard binding.
  - Persisting history across a reload.

# Acceptance criteria
- AC1: Undo and redo are pure operations over a bounded history, unit-tested without a scene.
- AC2: The history is built on the existing serialize and restore rather than a second representation of a city.
- AC3: A new change discards the redo branch.
- AC4: The depth bound is stated and the memory it costs at that bound is measured on a Demo-sized city.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Undo and redo are pure operations over a bounded history, unit-tested without a scene.
- request-AC5 -> This backlog slice. Proof: AC2: The history is built on the existing serialize and restore rather than a second representation of a city.
- request-AC7 -> This backlog slice. Proof: AC3: A new change discards the redo branch.

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
