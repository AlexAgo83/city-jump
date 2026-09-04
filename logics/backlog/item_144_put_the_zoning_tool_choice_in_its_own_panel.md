## item_144_put_the_zoning_tool_choice_in_its_own_panel - Put the zoning tool choice in its own panel
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
- Summary: `#zone-options` is one row holding the zone kinds, the brush slider and the price, so a brush-or-fill switch added to it would put the choice of tool on the same line as that tool's settings.
- Keywords: zone-options row, tool choice panel, segmented group, select-view-options idiom, action dock
- Use when: adding a control that chooses a tool rather than configuring one.
- Skip when: redesigning the toolbar or action dock, and moving the zone kinds or brush slider out of their row.

# Problem
- `#zone-options` (index.html:440-451) is a single row carrying the five zone kinds, the brush size slider and the price output. A brush-or-fill switch added to it would put the choice of tool on the same line as that tool's settings.
- The choice of which tool you are holding is a different kind of decision from how that tool is configured, and the row gives it no place to be.

# Scope
- In:
  - A separate panel, above the selected tool's options, holding the zoning tool choice.
  - Reuse of the `.segmented` `role="group"` idiom that `#select-view-options` (index.html:393-399) already uses for exclusive choices.
- Out:
  - Redesigning `#toolbar`, `#action-dock` or `#action-palette` beyond adding this panel.
  - Moving the zone kinds, the brush slider or the price output out of their row.

# Acceptance criteria
- The zoning tool choice sits in its own panel above the tool's options.
- It uses the existing group idiom rather than a new component.
- The panel appears and hides with the zoning tools, like the option rows it sits above.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: The zoning tool choice sits in its own panel above the tool's options.

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
- Rationale: Small and self-contained, but it is the panel the fill's own switch will live in, so it lands just before the fill.
