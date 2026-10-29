# city-jump 0.5.9

Release date: 2026-10-29 (planned; publication pending).

Prepared from main at `dadf283da86b8fcd1849ea903e698d0fb1cdeca6`.

## Features and visual improvements

- Explore the city in first-person POV with WASD/ZQSD or arrow keys, drag to look,
  Shift to move faster, and Escape to restore the previous view. The camera follows
  terrain without building collisions, and tilt-shift blur is disabled in POV.
  The bundled Demo save is also restored when missing.
  (`cfcb2fadbf3c33b004ad03d3a40296b8080a6f27`)
- Refine daytime lighting, bloom, glass reflections and streetlight pools. Add
  grouped room lighting and warm shop windows, subtle building height variation,
  clearer entrance paths and garden details. Flying impact debris, darker ruins
  and a dedicated kaiju fill light improve destruction and night visibility.
  (`594ba6fecf2dcc537e117ce42f8b5515569ea668`)
- Integrate the main-branch changes at the release baseline.
  (`dadf283da86b8fcd1849ea903e698d0fb1cdeca6`)

## Maintenance

- Match release versions literally when verifying the public bundle, and record
  the 0.5.8 deployment evidence.
  (`fa535615f39aa19863607c17db56981505b81ae9`)
- Record the 0.5.8 release validation evidence.
  (`6333e228fcecb0c7cda5036ee7d267269d279331`)

## Release preparation

Package and lockfile versions, the README badge and the static-site release
version/tag are aligned to 0.5.9. Security support remains on the 0.5.x line.
Publication, tagging and deployment are pending; this preparation does not record
release or deployment evidence for 0.5.9.
