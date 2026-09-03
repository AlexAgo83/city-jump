## item_127_move_road_drawing_into_the_layer_that_owns_the_city - Move road drawing into the layer that owns the city
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 15%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 16:03:12

# AI Context
- Summary: The imports point the right way, so no architecture test catches it. Must follow item_106, which rewrites the demolition path in these exact lines.
- Keywords: drawTool, application controller, graph mutation from render, pointer event feed
- Use when: moving road drawing out of render/, after item_106.
- Skip when: changing drawing rules, snapping, tool behaviour or the preview look.

# Problem
- src/render/drawTool.ts is an application controller in render/: it mutates the graph at :516, :523 and :537, spends money through injected callbacks at :566 and drives the undo history at :491. src/render/debugApi.ts:49 removes segments in a loop for the same reason.
- The architecture test cannot see this, because the imports point the right way.

# Scope
- In:
  - app/drawController.ts for the decisions and the mutations; render/drawTool.ts reduced to preview meshes and a pointer-event feed.
  - Must follow req_035 item_106, which rewrites the demolition path in these exact lines.
  - Extend the architecture test to assert that render/ does not mutate the graph, if that can be expressed without false positives.
- Out:
  - Changing the drawing rules, snapping or tool behaviour.
  - Changing the preview look.

# Acceptance criteria
- AC1: No module in render/ calls a graph mutator.
- AC2: Drawing, splitting, bulldozing, zoning and planting behave unchanged.
- AC3: npm run test:e2e passes, since this is pointer input.
- AC4: The undo pairing from req_035 item_106 still holds.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: No module in render/ calls a graph mutator.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)
- Request: `req_039_give_the_code_its_seams_back`
- Primary task(s): `task_041_orchestrate_the_structural_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
