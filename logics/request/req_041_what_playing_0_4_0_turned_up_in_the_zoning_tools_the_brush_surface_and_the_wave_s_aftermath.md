## req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath - What playing 0.4.0 turned up in the zoning tools, the brush surface and the wave's aftermath
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City simulation core
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Nine things from playing 0.4.0, in three groups: the zoning surface (a fill tool, a tool-choice panel, a brush that opens at its minimum), the wave's aftermath (a levelled city that says so, an evacuation that leaves, a barracks in rubble that stops firing), and two bare constants that shape how the game feels -- a bulldozer that waits a second for nothing and an opening treasury of $40,000.
- Keywords: zoning fill, tool choice panel, click-only brush, left drag camera, zone brush default, evacuate to new island, city levelled message, rubble battery, demolition delay, starting treasury
- Use when: changing the zoning tools, the pointer contract, the run's exit, what a wave does once buildings fall, or either of the two constants.
- Skip when: retuning the wave difficulty curve, the tree spray brush's default radius, how science converts to prestige, or middle- and right-drag camera control, all of which work.

# Needs
- Zoning a district you can already see the shape of takes one click, not a brush stroke that has to cover it.
- A brush starts at the size its own slider says it starts at.
- Evacuating leaves the island. It does not leave the player on it with the button that does.
- A city flattened to the ground says so, and the thing that flattened it does not simply vanish.
- A barracks in rubble does not fire, and does not hold the workers the buildings still standing need.
- Choosing which zoning tool you are holding is its own decision, in its own place, not another control on the row of options for the tool you were holding before.
- Holding the left button turns the camera. A brush that paints while held takes that away for as long as it is selected.
- A bulldozer takes what you clicked on when you click it.
- A run opens with enough money to build a city worth defending.

# Context
- Five needs from playing 0.4.0. Two are confirmed defects in the wave, one of them affecting combat balance; two are product decisions about tools and run flow; one is a one-line default with a pairing that has already drifted once. They are gathered because four of the five are about what happens after the kaiju lands, and the fifth shares the zoning surface with the first.
- Zoning is keyed by lot, not by ground. src/sim/zones.ts documents why at length: a zone stamped on an eight-metre grid of its own was never aligned with the lots it was meant to zone, so paint appeared on the grass with an empty grid over it. Zones.paintLots takes lots; there is no ground grid to flood any more. Any fill works on the lot list, which is `currentBuildableCells`.
- A purely geometric flood fill is the wrong shape for this. Lots along a continuous street frontage touch, and frontages meet around a block, so one click on a connected city would zone most of it. BuildableCell already carries the structure a stop rule needs -- segment, side, block, column and row (src/sim/slots.ts:40-44) -- and src/sim/slots.ts:165 already keys a run of lots as `${cell.segment}:${cell.side}:${cell.block}`. Decide the contiguity rule against that, not against corner geometry.
- The fill must behave like a paint bucket, not a spill: it fills from the clicked lot across lots that share that lot's current zoning, and stops where the zoning differs. Filling regardless of what is already there would let one click overwrite a district the player spent a minute painting, with a single undo entry as the only way back.
- Whatever the fill covers, it commits the way the brush commits: `zones.paintLots` then `painted()`, which repaints the zone overlay without rebuilding terrain, trees, roads, traffic and signals over the dirty box. src/render/drawTool.ts:143-149 records what happens when a zone change takes the ordinary commit path -- the trees blinked as they were torn down and put back under the brush.
- The zone brush already records undo correctly (src/render/drawTool.ts:555-560), but passes `true` to `afterChange` unconditionally, so a stroke that changed nothing still costs an undo step. A fill covering a district is a much bigger single action, so it must report whether it actually changed anything.
- index.html:449 declares the zone brush as `min="8" max="96" step="8" value="32"`, so it opens at four times its own minimum. src/render/drawTool.ts:103-108 keeps ZONE_RADIUS equal to that default by hand and its comment records the last time the two diverged: the tool painted at the tree brush's radius while the slider read something else. Moving the default without addressing the pairing sets that up to happen again.
- src/ui/controls.ts:287-289 already pushes the slider's value into the tool at bind time for exactly this reason. The cheap fix is to make the constant derive from the input rather than match it, so there is one number and no convention to remember. `#spray-radius` (index.html:438, min 16, value 45) has the same shape and is deliberately not in scope: the request is about the zone brush.
- Evacuating does not start a new run, by construction. src/app/app.ts:774-782 banks the science onto the profile through `carryScience`, autosaves, ends the run and says "Start a new run when you are ready." The new island is a second, separate click on `#new-run`, which sits in `#between-runs` (index.html:477-482) and is hidden until the run has ended. The player therefore confirms twice -- "Evacuate this run?" then "Leave for a new island?" -- to do one thing.
- The science itself is already carried correctly and must not be touched: `carryScience` (src/sim/run.ts:73-75) adds the run's science to profile prestige only for an evacuation, `writeProfile` persists it, and a fresh run resets `run.science` through `createRun`. The question is only whether evacuating lands the player on a new island or on a between-runs panel.
- If evacuation is made to open a new island directly, the between-runs panel is where prestige is spent on upgrades, so it cannot simply be skipped -- the player would evacuate straight past the shop the science was banked for. Decide where the upgrade step lives before wiring the two together.
- A city flattened to the ground does vanish the kaiju, and this is confirmed. src/app/app.ts:621 finishes the wave as breached the moment no building has a state other than "rebuilding", and `finishWave` calls `clearWaveVisuals`, which is `kaiju.hide()` (src/app/waveLoop.ts:63-67). The banner then reads "Wave breached" for three seconds -- the same words as a wave that broke through and left the city standing.
- Nothing in the sim makes the kaiju leave. src/sim/kaiju.ts:59 goes to mode "idle" and stops moving when it runs out of targets; it is the app that hides the mesh. So the choice is a product one: either the kaiju is shown walking back out and the message covers it, or it is hidden as now and the message says the city was levelled.
- The run also limps on rather than ending. `settleWaveOutcome` (src/app/waveLoop.ts:21-26) ends a breached run only through `endIfPopulationZero`, evaluated against the population at that instant, which is still well above zero the moment the last building falls. So the player is left on an empty island with a run that has not ended and no city to rebuild from.
- A destroyed military building keeps firing, and this is a live defect. src/app/app.ts:589 builds the batteries from `currentParcels`, while the kaiju picks its targets from `livingBuildings` -- statuses whose state is not "rebuilding" (src/app/app.ts:577). A destroyed lot moves to state "rebuilding" (src/sim/buildingLifecycle.ts:101) but stays in `currentParcels`, and `batteriesForParcels` filters only on kind and staffing (src/sim/batteries.ts:19).
- It is worse than a stray gun. `allocateWorkforce` knows nothing about building state -- it deals on kind, frontage and depth alone -- "military" is first in its PRIORITY list (src/sim/workforce.ts:14), and `BuildingLifecycle.rebuild` preserves the lot's `staffed` flag (src/sim/buildingLifecycle.ts:101), which `wasStaffed` then uses to keep it at the front of the queue. A flattened barracks fires and holds the workers the surviving lots are being refused.
- Fix it where the batteries are chosen, not by changing the workforce priority: the guns should come from the lots that are standing, the same list the kaiju already targets. The `wasStaffed` hint exists to stop the staffing flickering (src/sim/workforce.ts:28-37) and must keep working.
- This changes combat balance: the city loses firepower the moment a barracks falls, and gains back the workforce it was holding. `npm run scenarios` currently reports 31 of 31 waves held inside the 13-85 s / 4-21 salvo band, so re-run it and treat a move outside that band as part of this work rather than a surprise.
- The zoning tool choice has nowhere to go. `#zone-options` (index.html:440-451) is one row holding the five zone kinds, the brush slider and the price output; adding a brush-or-fill switch to it puts the choice of tool on the same line as that tool's settings. `#select-view-options` (index.html:393-399) already shows the idiom for a group of exclusive choices -- a `.segmented` radio group with `role="group"` -- so this is a layout decision with a pattern already in the repo, not a new component.
- The brushes paint while the left button is held (src/render/drawTool.ts:669-674: POINTERMOVE paints when `leftPointerDown`), and that is precisely why the camera cannot be dragged with the left button while a brush is selected. src/render/drawTool.ts:740 calls `setCameraDrag(next !== "spray" && next !== "zone")`, which strips button 0 from the camera's pointer inputs for the duration; the ponytail comment at :711-717 records the trade -- "drop one button from the existing input, rather than detaching the camera" -- and says middle and right drags still orbit.
- So making the brushes click-only is the same change as giving the left drag back: with nothing painting on a held drag, `setCameraDrag` has nothing to suppress and the special case goes away. The release path already distinguishes the two cases -- `sprayed` at src/render/drawTool.ts:689 exists only so a drag that painted does not also fire a burst on release, and CLICK_SLOP guards the rest.
- A click-only brush changes what an undo entry covers. Today a stroke is one entry: `beforeChange` fires on the first burst of a drag (src/render/drawTool.ts:417, :430) and `afterChange` on release (:690). Per click, each press is its own entry, which is the honest mapping but means a district painted click by click costs a click's worth of undo each time. Decide that deliberately rather than inheriting it.
- The bulldozer's delay is a constant, not slow code. src/render/drawTool.ts:32 sets `DEMOLITION_MS = 1_000` and `scheduleDemolition` (:625-641) defers every road, building and utility demolition by that second. Nothing waits on it: there is no demolition animation, `src/render/rubble.ts` only draws the rubble a kaiju leaves, and the target highlight is switched off at the click (:500-501). So the player clicks, the feedback disappears, and the road stands for a second.
- It was introduced in 15c3f6c "Add delayed demolition refunds" with no comment and no recorded reason -- a bare magic number in a file where every other deliberate simplification carries a `ponytail:` and its revision condition. Find out whether it was buying anything before removing it; if it was, that reason belongs at the declaration.
- The delay also makes a demolition droppable. c06edbf "Guard deferred demolitions" added the `graph.revision !== revision` check at src/render/drawTool.ts:629, so any road edit inside that second silently cancels the pending demolition. That guard is correct for a deferred commit and becomes unnecessary if the commit is immediate.
- A run opens with $40,000 (src/sim/economy.ts:6). Against the costs that money meets -- roads charged per metre (src/sim/economy.ts:186-189) and buildings from $60 to $190 per cell (:191-194) -- that is the constraint the player feels first.
- Raising it is not a one-line change in isolation. The "Starter grant" prestige upgrade adds $10,000 for 6 prestige (src/sim/run.ts:45-48), which is a quarter of the opening treasury today and a tenth of it at $100,000, so the upgrade's worth moves with the base. And money is a binding constraint in the balance runs: `npm run scenarios` reports treasuries from $1,158 to $28,735 across its seeds, so the opening figure feeds the band directly.
- Two of these nine are pure constants -- the opening treasury and the demolition delay -- and neither has a recorded reason today. Whatever they end up being, the number that is chosen gets its reason written where it is declared, per the convention CONTRIBUTING.md already states.

# Acceptance criteria
- A fill tool zones a contiguous run of lots from one click, bounded by a recorded rule, and the brush is still there to choose instead.
- A fill only replaces the zoning the clicked lot had, records one undo entry, and records none when it changed nothing.
- The zone brush opens at the minimum of its own slider, and the tool's radius and the input's range cannot diverge without something failing.
- Evacuating ends on a new island with the science banked, and the prestige upgrades are still reachable at the point they are meant to be spent.
- A city destroyed to the last building says that is what happened, distinctly from an ordinary breach, and the run's own state matches what the player is looking at.
- A building in rubble contributes no battery and holds no workforce, and the staffing of the lots still standing does not flicker.
- npm run scenarios stays inside its reported band, or the new band is recorded with its reason.
- Choosing between the zoning tools happens in its own panel above the selected tool's options, using the group idiom the repo already has.
- No brush paints on a held drag; a left drag turns the camera with every tool selected, and the camera no longer has a button taken off it.
- A bulldoze takes effect when the player clicks, or the delay carries a recorded reason at its declaration.
- The opening treasury is the figure the operator chose, its reason is recorded at the declaration, and the prestige grant's worth against it is deliberate.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)

# References
- index.html
- src/app/app.ts
- src/app/waveLoop.ts
- src/render/drawTool.ts
- src/sim/batteries.ts
- src/sim/buildingLifecycle.ts
- src/sim/economy.ts
- src/sim/kaiju.ts
- src/sim/run.ts
- src/sim/slots.ts
- src/sim/workforce.ts
- src/sim/zones.ts
- src/ui/controls.ts
- src/ui/runPanel.ts

# Backlog
- `item_143_zone_a_contiguous_run_of_lots_from_one_click`
- `item_144_put_the_zoning_tool_choice_in_its_own_panel`
- `item_145_make_the_brushes_click_only_and_give_the_left_drag_back_to_the_camera`
- `item_146_open_the_zone_brush_at_the_minimum_of_its_own_slider`
- `item_147_make_evacuating_leave_the_island`
- `item_148_say_that_the_city_was_levelled_and_decide_what_happens_to_the_kaiju`
- `item_149_stop_a_barracks_in_rubble_from_firing_and_from_holding_its_workers`
- `item_150_drop_the_second_the_bulldozer_waits_for_nothing`
- `item_151_open_a_run_with_a_treasury_that_can_build_a_city`
