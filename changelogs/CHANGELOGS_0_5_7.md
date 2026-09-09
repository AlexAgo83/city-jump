# city-jump 0.5.7

Prepared on 2026-09-09. Distinct building facades, a richer vehicle fleet and
articulated pedestrians that can be selected and followed.

Residential and commercial buildings now have distinct facade families across
148 models: balconies, loggias, brickwork and pitched roofs for homes; storefronts,
awnings and broad glazing for shops and offices. Authored trim and glass colours
survive loading. The urban asset library drops from 23.38 to 13.20 MiB.

Traffic uses twelve detailed low-poly vehicle models. Fire engines and police cars
appear rarely, with alternating blue lightbars that pause with the simulation.
Vehicle geometry now updates completely across all colour variants and existing
instances when GLBs finish loading.

Pedestrians have six articulated profiles and 24 colour variants, with specialist
accessories and walking animations that stop at crossings. The Select tool shows
their profile and current street and offers Orbit and Follow, just like vehicles.
Following ends cleanly when the selected pedestrian is removed.

Validation covers the complete local CI gate, model loading and geometry budgets,
spawn frequency, beacon animation, pedestrian selection and follow behaviour,
and the browser interaction suite. Updated catalogues show the buildings,
pedestrians and vehicle fleet, including day, night and mobile checks.
