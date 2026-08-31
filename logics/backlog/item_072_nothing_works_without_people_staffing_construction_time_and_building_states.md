## item_072_nothing_works_without_people_staffing_construction_time_and_building_states - Nothing works without people: staffing, construction time and building states
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:29

# AI Context
- Summary: The delivery slice for staffing from one shared workforce, construction time, and a building whose state reads on the map.
- Keywords: nothing, works, people, staffing, construction, time, building, states
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- The keystone: without it, building is free and the game is a painting exercise.

# Scope
- In:
  - A workforce derived from population, and a demand per non-residential parcel.
  - Binary staffing: staffed and working, or standing and idle.
  - Construction time, and the same for a rebuild.
  - Map states: scaffolding, unlit and idle, rubble under repair.
- Out:
  - Money, food, materials, utilities -- each is its own slice.

# Acceptance criteria
- AC1: The backlog slice stays bounded for nothing works without people: staffing, construction time and building states.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: the workforce and its demand; proven by `sim/workforce.ts` unit tests from a fixed seed.
- request-AC2 -> This backlog slice. Proof: the building lifecycle on the map; proven by an interaction check reading instance state.
- request-AC3 -> This backlog slice. Proof: determinism; proven by replaying the same seed twice with no renderer.
- request-AC4 -> This backlog slice. Proof: a district going idle being visible; proven by an interaction check plus a screenshot.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_023_nothing_works_without_people_staffing_construction_time_and_building_states`
- Primary task(s): `task_025_nothing_works_without_people_staffing_construction_time_and_building_states`

# Priority
- Priority: High
- Rationale: The keystone: without it, building is free and the game is a painting exercise.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_025_nothing_works_without_people_staffing_construction_time_and_building_states`
