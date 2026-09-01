## item_093_a_military_road_is_not_unlimited_free_firepower - A military road is not unlimited free firepower
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:19:49

# AI Context
- Summary: The delivery slice for the exploit: unzoned road frontage placing military parcels outside every limit, and batteries that fire unstaffed.
- Keywords: military, road, not, unlimited, free, firepower
- Use when: Working on `parcelsForDemand`'s unzoned path or on `batteriesForParcels`.
- Skip when: You need battery range, damage or reload, which the wave balance owns.

# Problem
- `parcelsForDemand` returns early for any parcel whose cells carry no zone, so unzoned road frontage bypasses every construction limit.
- That is the only path military parcels have ever taken: a military road's frontage. Giving painted military zones a limit closed one door and left the one everybody uses open.
- The harness's own first run fields eleven military parcels at population twelve.
- `batteriesForParcels` filters on kind alone and never consults staffing, while military demands eight workers a cell against a workforce of six -- so those eleven batteries fire at full damage with nobody in them.
- Together that is unlimited firepower for the price of a road, and it is what makes the recorded military measurement absurd.

# Scope
- In:
  - Keep unzoned frontage building -- the mixed-neighbourhood rule is deliberate and residential and commercial frontage should stay as it is.
  - Stop that path placing military parcels outside every limit. A limit on the road path, a staffing gate on batteries, or both -- settle it with the numbers in front of you rather than by picking the first that compiles.
  - Make a battery answer to staffing like every other building: an unstaffed military parcel is a building that does not work, and it should not shoot.
  - Check what this does to a city that was deliberately built around a military road, since that is the intended way to defend and it must stay viable.
  - Cover it with a test over the real filter at a population where the answer is unambiguous.
- Out:
  - Changing battery range, damage or reload, which the wave balance owns.
  - Placeable turrets, which the product brief rules out.
  - Reworking the mixed-neighbourhood rule for residential and commercial frontage.

# Acceptance criteria
- AC1: A military road no longer yields military parcels beyond any limit.
- AC2: An unstaffed military parcel does not fire.
- AC3: A city built around a military road can still defend itself, checked rather than assumed.
- AC4: The rule is covered by a test over the real filter.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A military road no longer yields military parcels beyond any limit.
- request-AC9 -> This backlog slice. Proof: AC2: An unstaffed military parcel does not fire.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)
- Request: `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`
- Primary task(s): `task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
