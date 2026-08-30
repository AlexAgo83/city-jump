## item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers - Decide the world grid, the streetlights and the signals on their numbers
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 92%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:56:54

# AI Context
- Summary: Three renderers, three separate decisions, each made on the measurement rather than on how expensive the source looks. The world grid is free when hidden and ~900,000 vectors when not; the streetlights already solved light churn but never the lamp meshes; signals re-run every cycle and remake every mast. Leaving one whole is a valid outcome if the number says so -- recorded, with a comment where the next reader meets it.
- Keywords: decide, world, grid, streetlights, signals, numbers
- Use when: Bounding or deciding against bounding the world grid, streetlight or signal rebuilds.
- Skip when: The work changes lamp spacing, signal timing, the cycle model, the grid's appearance, or extends beyond these three.

# Problem
- The world grid allocates on the order of 900,000 `Vector3` and rebuilds a whole line system every rebuild while it is visible, and returns immediately while it is not. It is therefore free almost always and very expensive exactly when a player is using it to line a road up.
- The streetlights walk every segment, compute per-segment trims and place every lamp on every rebuild. The lights themselves already avoid churn -- `rebuildLights` only creates or disposes the difference in count, after that cost seconds per road drawn -- but the lamp meshes never got the same treatment.
- The signals dispose every mast and re-run `signalCycle` for every junction in the city, both proportional to the junction count rather than to the edit.
- All three are cheaper than the trees, and at least one of them may be cheap enough that changing it is not worth the risk of rung 3. Deciding that by feel is how this chain would go wrong.

# Scope
- In:
  - Take each of the three separately, and let the first slice's measurement decide: bound it to the region, or leave it whole and record the number that justifies leaving it.
  - For the world grid, consider whether it needs rebuilding at all when the heightmap under it did not change -- it is a function of the heightmap alone, and an edit outside its visible extent changes nothing.
  - For the streetlights, the lamp meshes are the target; the light objects already have their answer and it must not be disturbed.
  - For the signals, note that a cycle depends on the arms meeting a junction, so an edit that adds an arm changes a junction the edit's box may not obviously contain -- the padding has to account for that.
  - Anything bounded uses one predicate for dispose and recreate, and leaves behind a check that fails without the fix.
  - Anything left whole is recorded as a decision with its measurement, in the closeout and as a comment where the next reader will meet it.
- Out:
  - Changing lamp spacing, signal timing, the cycle model, or the grid's appearance.
  - Extending this to any renderer outside these three.
  - Optimising by drawing less.

# Acceptance criteria
- AC1: Each of the three is either bounded to the region an edit touched or left whole with a recorded measurement justifying it.
- AC2: Anything bounded disposes and recreates on one predicate and has a check that fails without the fix.
- AC3: A partial rebuild matches a full rebuild for every renderer changed.
- AC4: The Demo city is visually unchanged, the final placement cost is recorded, and the full gate passes.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Each of the three is either bounded to the region an edit touched or left whole with a recorded measurement justifying it.
- request-AC5 -> This backlog slice. Proof: AC2: Anything bounded disposes and recreates on one predicate and has a check that fails without the fix.
- request-AC6 -> This backlog slice. Proof: AC3: A partial rebuild matches a full rebuild for every renderer changed.
- request-AC8 -> This backlog slice. Proof: AC4: The Demo city is visually unchanged, the final placement cost is recorded, and the full gate passes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Primary task(s): `task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
