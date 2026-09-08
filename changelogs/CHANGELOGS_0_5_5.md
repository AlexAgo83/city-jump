# city-jump 0.5.5

Prepared on 2026-09-08. Fixes kaiju rendering in production.

The production Content Security Policy blocked the temporary `blob:` image URLs
Babylon uses for textures embedded in the kaiju GLB. The model could not finish
loading, although local development tests passed without that policy.

The image policy now permits `blob:` alongside same-origin and data images. Script,
connection and other policy directives are unchanged. An architecture regression
check protects the embedded-texture requirement.

Validation covers the local CI gate, browser interactions under the production CSP,
GitHub CI on the release commit and the deployed site. Release evidence is recorded
in `logics/release/evidence.jsonl`.
