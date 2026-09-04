## item_145_make_the_brushes_click_only_and_give_the_left_drag_back_to_the_camera - Make the brushes click-only and give the left drag back to the camera
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:04:12

# AI Context
- Summary: The brushes paint while the left button is held, which is exactly why the tool strips button 0 from the camera. Click-only painting removes the reason for the special case and gives the left drag back.
- Keywords: click-only brush, setCameraDrag, leftPointerDown, POINTERMOVE, undo granularity, CLICK_SLOP
- Use when: changing the pointer contract for a tool, or anything that takes an input away from the camera.
- Skip when: middle- and right-drag camera control and the road drawing gestures, which are click-to-click already.

# Problem
- The brushes paint while the left button is held (src/render/drawTool.ts:669-674), which is why src/render/drawTool.ts:740 strips button 0 from the camera's pointer inputs whenever a brush is selected. The ponytail comment at :711-717 records the trade it was making.
- The player therefore loses left-drag camera orbit for as long as a brush tool is held, which is the ordinary way of turning the view.
- Making the brushes click-only removes the reason for the special case: with nothing painting on a held drag, there is nothing for `setCameraDrag` to suppress.

# Scope
- In:
  - The spray and zone brushes commit per click, not on a held drag.
  - Removal of the camera-button special case now that nothing needs it.
  - A deliberate decision about what one undo entry covers once a stroke is no longer a gesture (today `beforeChange` fires on the first burst of a drag and `afterChange` on release).
- Out:
  - Middle- and right-drag camera control, which already works.
  - The road drawing gestures, which are click-to-click already.
  - CLICK_SLOP and the release-path logic beyond what the change makes dead.

# Acceptance criteria
- No brush paints while the left button is held; each press paints once.
- A left drag turns the camera with every tool selected, and no tool takes a button off the camera.
- What a single undo entry covers is recorded, and undoing after painting behaves that way.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: No brush paints while the left button is held; each press paints once.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: High
- Rationale: The player loses left-drag camera control for as long as a brush is held, on every zoning or planting action.
