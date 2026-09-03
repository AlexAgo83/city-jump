# Shared Link Threat Model

Shared city links keep `city-jump` static: the city travels in the URL fragment, not through a
server. That makes every link untrusted local input.

## Boundaries

- No server receives, stores, shortens, scans, or validates a city.
- The fragment is never sent to Render, but browser extensions, screenshots, chat previews, and
  the receiver can still see it.
- A shared city is a snapshot. It is not a live document and it carries no identity.

## Required Controls

- Accept only a `#city=` fragment. Do not use query strings for city data.
- Refuse a fragment above 12,000 characters before decoding.
- Cap decompressed JSON at 96 KB while streaming.
- Run the decoded city through `parseCity`; never replay unchecked JSON.
- Render every value from a loaded city with `textContent` or equivalent node properties, never
  `innerHTML`.
- Keep `parseCity`'s newer-build refusal distinct from malformed input.
- Quantise only the shared payload. Local saves keep full precision.
- Refuse over-limit cities with a message that says the city is too large for a link.

## Out Of Scope

- Link shortening, galleries, cloud saves, remix history, accounts, telemetry, and moderation.
- User-generated assets or executable content.

Any feature crossing those lines needs a new decision and a new review before implementation.
