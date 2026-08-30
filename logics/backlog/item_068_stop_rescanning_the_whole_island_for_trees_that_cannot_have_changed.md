## item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed - Stop rescanning the whole island for trees that cannot have changed
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 97%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:56:54

# AI Context
- Summary: The scenery is deterministic from a seeded index, the heightmap, the road mask and the plantings -- so a tree far from an edit cannot have changed, yet every road placed rescans ~8,600 candidate points plus every forest patch. Rung 3 exposure is worse here than for roads: a tree's position can be inside the region while the road suppressing it is outside, and a missing tree is far harder to notice than a missing road.
- Keywords: rescanning, whole, island, trees, cannot, changed
- Use when: Bounding the tree rebuild, or changing the scenery scan and road mask in `src/render/trees.ts`.
- Skip when: The work changes scenery rules, species mix, forest patches, spacing, instancing or shadows.

# Problem
- `trees.rebuild` rebuilds a road mask across every segment and then scans the entire 5400 m island on a 58 m step -- roughly 8,600 candidate points -- plus a denser pass over every forest patch, on every single road placed.
- None of that depends on the edit. The scenery is a deterministic function of a seeded index, the heightmap, the road mask and the player's plantings, and the heightmap only changes inside the dirty region -- so a tree on the far side of the island cannot have changed.
- The trap is `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` rung 3, and the trees are more exposed to it than the roads were: a tree is drawn as an instance whose position is inside the region while the road that suppresses it is outside, or the reverse. Preserving by one test and recomputing by another loses trees, and a missing tree is much harder to notice than a missing road.

# Scope
- In:
  - Bound the scenery scan to the region an edit touched, preserving the instances outside it rather than recomputing them.
  - One predicate for preserve and recompute, per `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` rung 3, and pad the region by whatever reach a road's suppression has -- the road mask reserves `width / 2 + setback + grid depth + 4`, which is well beyond the road itself.
  - Keep the road mask bounded too, or establish that rebuilding it whole is cheap enough to leave -- with the number, not the impression.
  - Hand-planted trees answer to none of the scenery rules and must survive untouched wherever they are.
  - Prove equivalence: a bounded rebuild and a full rebuild must produce the same set of trees, which is testable as a pure comparison over the deterministic scenery rather than by looking at the screen.
  - Report the before-and-after placement cost.
- Out:
  - Changing the scenery rules, the species mix, the forest patches or the spacing.
  - Changing how trees are instanced or shadowed.
  - The other three renderers.

# Acceptance criteria
- AC1: An edit no longer rescans the whole island; trees outside the affected region are preserved.
- AC2: A bounded rebuild and a full rebuild produce the same trees, proven by comparison rather than inspection.
- AC3: Preserve and recompute use one predicate, and the region is padded by the road mask's own reach.
- AC4: Hand-planted trees are never lost, wherever they stand, and the measured placement cost is lower.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: An edit no longer rescans the whole island; trees outside the affected region are preserved.
- request-AC5 -> This backlog slice. Proof: AC2: A bounded rebuild and a full rebuild produce the same trees, proven by comparison rather than inspection.
- request-AC6 -> This backlog slice. Proof: AC3: Preserve and recompute use one predicate, and the region is padded by the road mask's own reach.
- request-AC7 -> This backlog slice. Proof: AC4: Hand-planted trees are never lost, wherever they stand, and the measured placement cost is lower.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Primary task(s): `task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
