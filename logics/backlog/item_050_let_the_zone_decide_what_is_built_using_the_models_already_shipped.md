## item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped - Let the zone decide what is built, using the models already shipped
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `buildingParcels` picks a footprint by what fits; the seam to constrain it already exists as `LOW_RISE_SIZES` for pedestrian roads, and a zone is the same mechanism driven by the player.
- Keywords: let, zone, decide, built, models, already, shipped
- Use when: Making a zone constrain the footprints and heights a block may use, with the shipped model library only.
- Skip when: The work generates new building models, adds a style dimension to the generator, or introduces demand.

# Problem
- `buildingParcels` chooses a footprint from `PARCEL_SIZES` by what fits, and the renderer loads the model matching that size; the player's intention has no way in.
- The mechanism to constrain it already exists and is driven by the wrong thing: `LOW_RISE_SIZES` narrows the allowed sizes when the road is pedestrian.

# Scope
- In:
  - Extend that same constraint so a block's allowed footprints and heights come from its zone when it has one -- dense and tall where the player asked for that, low and sparse where they did not.
  - Try this with the existing library first: silhouette and density are what read from a playing camera, and the shipped models already vary in both.
  - Leave unzoned land on exactly today's behaviour, so an existing city is untouched.
  - If the existing models genuinely cannot make two zones look different from a normal camera, stop and record that as a finding rather than growing this slice into an asset project.
  - Unit tests: a zoned block draws only from its zone's allowed sizes; an unzoned block behaves as before.
- Out:
  - Generating new building models or adding a style dimension to the generator.
  - Buildings changing after they are placed.
  - Any notion of demand deciding whether a plot fills at all.

# Acceptance criteria
- AC1: Two areas zoned differently produce visibly different buildings from a normal playing camera, with no new assets.
- AC2: Unzoned land produces exactly what it produces today, verified against the bundled Demo save.
- AC3: If new assets prove unavoidable, that conclusion is recorded as a finding with its evidence, and this slice stops there.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Two areas zoned differently produce visibly different buildings from a normal playing camera, with no new assets.
- request-AC3 -> This backlog slice. Proof: AC2: Unzoned land produces exactly what it produces today, verified against the bundled Demo save.
- request-AC7 -> This backlog slice. Proof: AC3: If new assets prove unavoidable, that conclusion is recorded as a finding with its evidence, and this slice stops there.

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
