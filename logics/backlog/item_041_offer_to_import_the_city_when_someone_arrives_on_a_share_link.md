## item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link - Offer to import the city when someone arrives on a share link
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Arriving on a share link must offer an import rather than overwrite what the receiver already has, handle a name collision, and strip the fragment so a reload does not re-prompt.
- Keywords: offer, import, city, someone, arrives, share, link
- Use when: Handling a share fragment at startup, the import and collision prompts, or the share round trip in `scripts/interact.mjs`.
- Skip when: The work auto-imports without asking, adds a gallery or history, or changes autosave and resume behaviour.

# Problem
- A link is useless unless arriving on it does something, and importing must never silently overwrite the city the receiver already has -- theirs may be the only copy.
- Left in the address bar, the fragment re-triggers the prompt on every reload.

# Scope
- In:
  - On startup, detect a share fragment, decode it, and offer to import the named city; then offer to load it, leaving the receiver's current work alone unless they say yes.
  - On a name collision, let the player overwrite or keep both under a different name.
  - Remove the fragment from the address bar after handling it, so a reload does not ask again.
  - Surface a refusal in the receiver's language of the problem: too large, malformed, or made by a newer version of the game -- never a bare failure.
  - Extend the browser interaction suite with the round trip: share, arrive, import, and get the same city back.
- Out:
  - Auto-importing or auto-loading without asking.
  - A gallery, a history of received links, or any record of who shared what.
  - Changing the autosave or resume behaviour beyond leaving it untouched.

# Acceptance criteria
- AC1: Arriving on a share link offers the import by name, handles a name collision with overwrite or keep-both, and only loads the city if the player agrees.
- AC2: After handling, the fragment is gone from the address bar and a reload does not re-prompt.
- AC3: A malformed, over-large or newer-version link is refused with a message naming the reason, and the receiver's own cities are untouched.
- AC4: The browser interaction suite covers share, arrive, import, and confirms the imported city matches.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Arriving on a share link offers the import by name, handles a name collision with overwrite or keep-both, and only loads the city if the player agrees.
- request-AC5 -> This backlog slice. Proof: AC2: After handling, the fragment is gone from the address bar and a reload does not re-prompt.
- request-AC7 -> This backlog slice. Proof: AC3: A malformed, over-large or newer-version link is refused with a message naming the reason, and the receiver's own cities are untouched.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_008_a_city_you_can_hand_to_someone_else`
- Architecture decision(s): (none yet)
- Request: `req_011_share_a_city_as_a_link_that_needs_no_server`
- Primary task(s): `task_013_implement_sharing_a_city_by_link`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
