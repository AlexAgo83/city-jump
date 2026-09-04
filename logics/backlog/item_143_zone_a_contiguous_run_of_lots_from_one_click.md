## item_143_zone_a_contiguous_run_of_lots_from_one_click - Zone a contiguous run of lots from one click
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Zoning a district the roads already define means dragging a round brush across it. Zoning is keyed by lot, and BuildableCell already carries the segment, side and block a fill needs to know where to stop.
- Keywords: fill tool, paint bucket, lot contiguity, segment side block, paintLots, zone overlay commit
- Use when: adding a zoning tool, or deciding what makes two lots contiguous.
- Skip when: the brush itself, a rectangle or lasso selection, or the ordinary dirty-box commit path that tears down the trees under it.

# Problem
- Zoning a district that the roads already define means dragging a round brush over it, at a radius that either overshoots into the next block or needs several passes.
- Zoning is keyed by lot, not by ground (src/sim/zones.ts), so a fill works on the lot list -- `currentBuildableCells` -- and not on any grid of its own.
- A purely geometric flood fill would run across the whole connected city from one click. BuildableCell already carries segment, side, block, column and row (src/sim/slots.ts:40-44), and slots.ts:165 already keys a run of lots by segment, side and block.

# Scope
- In:
  - A fill tool the player picks instead of the brush, not a replacement for it.
  - A recorded contiguity rule, decided against the structure BuildableCell already carries rather than against corner geometry.
  - Paint-bucket semantics: fill from the clicked lot across lots sharing its current zoning, and stop where the zoning differs.
  - Commit through `zones.paintLots` then `painted()`, and one undo entry that is only recorded when something changed.
- Out:
  - Removing or changing the brush.
  - A rectangle or lasso selection.
  - Letting the fill take the ordinary dirty-box commit path, which tears down and replaces the trees under it (src/render/drawTool.ts:143-149).

# Acceptance criteria
- One click fills a contiguous run of lots, and the rule that bounds it is recorded where a reader will meet it.
- The fill is one tool choice among the zoning tools; the brush still works as it did.
- A fill does not change lots whose zoning differs from the clicked lot's.
- A fill is one undo entry, and a fill that changed nothing records none.
- Filling does not disturb the trees, terrain, roads, traffic or signals under it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: One click fills a contiguous run of lots, and the rule that bounds it is recorded where a reader will meet it.
- request-AC2 -> This backlog slice. Proof: The fill is one tool choice among the zoning tools; the brush still works as it did.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: Medium
- Rationale: The feature asked for, but it needs a contiguity rule settled first and nothing is broken while the brush still works.
