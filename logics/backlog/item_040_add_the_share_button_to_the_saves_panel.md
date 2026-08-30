## item_040_add_the_share_button_to_the_saves_panel - Add the Share button to the saves panel
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 11:40:20

# AI Context
- Summary: The saves panel has Save, Load and Delete and no way to hand a city to anyone; a city over the link ceiling must refuse rather than emit a link that breaks for the receiver.
- Keywords: add, share, button, saves, panel
- Use when: Adding or changing the Share button in `index.html` and `bindSaves` in `src/ui/controls.ts`.
- Skip when: The work is the encoding itself, the import flow, or a redesign of the saves panel.

# Problem
- The saves panel offers Save, Load and Delete and no way to give a city to anyone else.
- A city too large for a usable link must not produce one anyway: the failure would land on the receiver, who has no way to understand it.

# Scope
- In:
  - A Share button beside the existing three in `index.html`, wired in `bindSaves`, that encodes the selected city, builds the fragment link, and copies it to the clipboard, confirming through the existing toast.
  - Refuse above the ceiling with a message that says the city is too large to share by link and roughly why.
  - Word the button and its title so it reads as copying a snapshot link, not as publishing or as a live share.
  - Follow the panel's existing `window.prompt` / `window.confirm` idiom; introduce no dialog system.
- Out:
  - The encoding itself, which is the previous slice.
  - The import side, which is the next one.
  - Redesigning the saves panel.

# Acceptance criteria
- AC1: Sharing the selected city puts a working link on the clipboard and says so; Save, Load and Delete are unchanged.
- AC2: A city over the ceiling produces an explanation and no link.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Sharing the selected city puts a working link on the clipboard and says so; Save, Load and Delete are unchanged.
- request-AC2 -> This backlog slice. Proof: AC2: A city over the ceiling produces an explanation and no link.
- request-AC7 -> This backlog slice. Proof: AC1: Sharing the selected city puts a working link on the clipboard and says so; Save, Load and Delete are unchanged. (The suite's share-arrive-import round trip is proved by item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link.)

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
