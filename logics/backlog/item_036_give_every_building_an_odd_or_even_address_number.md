## item_036_give_every_building_an_odd_or_even_address_number - Give every building an odd-or-even address number
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:52:30

# AI Context
- Summary: Address numbers come almost free from `BuildableCell`'s existing `segment`, `side` and `column`: odd one side, even the other, growing from the street's origin.
- Keywords: building, odd, even, address, number
- Use when: Computing or testing building address numbers in `src/sim`.
- Skip when: The work displays the address, persists it, or adds sub-numbering like 12A.

# Problem
- A building has no address, and the data to compute one already exists unused: `BuildableCell` carries its `segment`, its `side` and its `column` along that segment, and a parcel's cells all come from one segment.

# Scope
- In:
  - Address arithmetic in `src/sim`: the number grows with distance from the street's origin, odd on one side and even on the other, following the real-world convention.
  - Resolve a parcel to its street, its side and its distance along that street, reusing the cell data rather than recomputing geometry.
  - Unit tests: numbers increase along the street, the two sides never collide, and two parcels on the same street never share a number.
- Out:
  - Displaying the address -- that is the panel slice.
  - Persisting numbers: they are derived from position and recomputed, unlike the street name.
  - Address gaps, ranges, or sub-numbering (12A, 12B).

# Acceptance criteria
- AC1: Every parcel resolves to a number and a street, with odd on one side and even on the other, increasing from the street's origin.
- AC2: No two parcels on one street share an address, proven on the bundled Demo save.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Every parcel resolves to a number and a street, with odd on one side and even on the other, increasing from the street's origin.
- request-AC6 -> This backlog slice. Proof: AC2: No two parcels on one street share an address, proven on the bundled Demo save.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Primary task(s): `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
