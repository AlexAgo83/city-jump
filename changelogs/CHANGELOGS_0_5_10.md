# city-jump 0.5.10

Release date: 2026-10-31 (planned; publication pending).

Prepared from main at `61fc66f580bada9b8e46987f8f6164df4e71c94c`.

## Fixes

- Extract HUD styles into `src/ui/hud.css`, linked from `index.html` and emitted
  by Vite as a fingerprinted stylesheet. This prevents HUD style changes from
  leaving stale CSP hashes while retaining `style-src 'self'`. (#12)

## Maintenance

- Align package and lockfile versions, the README badge and the static-site release
  version/tag to 0.5.10, and index these release notes. Security support remains
  on the 0.5.x line.

## Release preparation

Publication, tagging and deployment are pending. This preparation does not record
release or deployment evidence for 0.5.10. Before deployment, the release workflow
requires the tag to match the package version and successful CI on the release
commit.
