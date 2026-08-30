## item_038_open_the_detail_panel_on_a_building_or_a_car - Open the detail panel on a building or a car
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
- Summary: The select tool covers roads, roundabouts and trees but not buildings or cars; both resolve through the existing ground-pick nearest-match rather than by making meshes pickable.
- Keywords: open, detail, panel, building, car
- Use when: Extending `SelectionInfo`, the selection resolver in `src/render/drawTool.ts`, or `showSelection` in `src/ui/hud.ts`.
- Skip when: The work makes buildings or cars pickable meshes, follows a car with the camera, or redesigns the panel.

# Problem
- The select tool covers roads, roundabouts and trees; the two things a player looks at most are not selectable.
- Buildings are thin instances with `isPickable = false` and cars move every frame, so mesh picking is the expensive route.

# Scope
- In:
  - Extend `SelectionInfo` and the selection resolver (`bulldozeTarget`, used by `selectAt`) with a building and a vehicle case, resolved by nearest match against the picked ground point -- the same mechanism the tool already uses for roads, trees and roundabouts.
  - Show the building's address and whatever the panel can honestly say about it (type, footprint), and for a car what it is and the street it is on.
  - Show the street name in the existing road case too, now that there is one.
  - Keep the panel's existing behaviour: it closes on clicking the terrain, and the road eyedropper still works.
- Out:
  - Making buildings or cars pickable meshes.
  - Following a selected car with the camera, or any new interaction beyond opening the panel.
  - Redesigning the panel's markup or styling beyond the new rows.

# Acceptance criteria
- AC1: Clicking a building opens the panel with its address; clicking a car opens it for that vehicle.
- AC2: A road's panel now shows its street name, and the existing road, roundabout and tree cases behave as before.
- AC3: Selection still resolves through the ground pick, with no mesh made pickable that was not before.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Clicking a building opens the panel with its address; clicking a car opens it for that vehicle.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Primary task(s): `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
