## item_051_paint_zones_and_make_the_zones_view_show_them - Paint zones, and make the Zones view show them
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:47:36

# AI Context
- Summary: Nothing paints an area today, and the `Zones` view shows the buildable grid rather than any player intent — the name promises something the game does not have.
- Keywords: paint, zones, view, show, them
- Use when: Adding the zoning brush to the toolbar, or making the Zones view show zones.
- Skip when: The work adds a separate zoning screen, a map mode, or zone statistics.

# Problem
- There is no way to express a zone: the build tools place roads and trees, and nothing paints an area.
- The `Zones` view shows which buildable cells are taken and which are open -- a geometry readout under a name that promises player intent.

# Scope
- In:
  - A zoning tool in the existing toolbar that paints an area with a zone kind and can clear it, following the tree spray's precedent for a brush that paints ground rather than placing an object.
  - Make the `Zones` view show the player's zones, keeping the taken-and-open grid readable underneath rather than replacing it.
  - Colours that are distinguishable without relying on hue alone, and that keep working across the day cycle.
  - Extend the browser interaction suite: paint a zone, see the buildings change, clear it, see them return.
- Out:
  - A separate zoning screen or a map mode.
  - Zone statistics, counters, or any readout beyond seeing the zones themselves.
  - Renaming or restructuring the other views.

# Acceptance criteria
- AC1: A zone can be painted and cleared from the toolbar, and the result is visible immediately.
- AC2: The Zones view shows the player's zones, with the buildable grid still readable.
- AC3: The browser interaction suite covers painting a zone, the buildings changing, and clearing it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A zone can be painted and cleared from the toolbar, and the result is visible immediately.
- request-AC5 -> This backlog slice. Proof: AC2: The Zones view shows the player's zones, with the buildable grid still readable.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_011_a_city_that_is_built_on_purpose`
- Architecture decision(s): (none yet)
- Request: `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`
- Primary task(s): `task_016_implement_zoning_as_the_player_s_second_decision`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
