# Generated crew sittings by place and circumstance (#871, first slice)

Status: draft for the owner's review, 2026-11-03.

## Goal

Replace the shared sitting templates for the generated crew with whole scenes written for one place and one circumstance. This first slice covers the places the bible already has: Lisbon, Lagos, Rotterdam and Chittagong, and Ceres. The other places follow in their own issues.

## Decisions (the owner's, 2026-11-03)

1. **Scope A, a first slice.** This issue builds the modules and writes them for the four arcologies and Ceres. Crew from places not yet written keep the old templates for now. #871 stays open as the umbrella, and a follow-up issue lists the places still to write.
2. **The visit and the room by place.** A module is the three sittings for one place and circumstance. The visit home and the room scenes are written once per place.
3. **Two circumstances per place**, from the approved bible pages ("a good start"; more may follow):

| Place | `lisbon` | `lagos` | `rotterdam` | `chittagong` | `ceres` |
|---|---|---|---|---|---|
| 1 | `wall`: a lower-tier lease family on the sea wall's rota | `mainland`: a mainland family renting by the month | `southbank`: a south-bank port family on a lease tied to port work | `hills`: a family renting by the week in the hill settlements | `member`: a co-op family, a member's child |
| 2 | `oldcity`: renting a room by the week in the old city | `ring`: a contract yard worker on Lagos Ring | `polders`: a family that lost its lease, living in the given-up polders | `floors`: a lower-floors household whose lease a rating's pay holds | `renter`: a non-member renting on the station, the Warren crowd |

## The draw (`js/family.js`)

- **When.** The first time a generated crew member's story starts, they draw an origin, kept as `p.origin`, for example `'lisbon:wall'`. Old saves draw it the same way.
- **From what.**
  - A home of `Earth` draws one of the four cities, evenly, then one of its two circumstances, evenly.
  - A home of `Ceres Station` draws `ceres` and one of its two circumstances.
  - Any other home (Luna, Mercury, Mars, the other Belt bodies) draws nothing, and keeps the templates.
- **Its dice.** The story's own draw, so no other draw in the game moves.
- **The list.** A small table names the cities and their circumstances, `ORIGINS = { lisbon: ['wall', 'oldcity'], ... }`, with the home each city draws from. Adding a place is an entry here and its lines, with no change to code.

## The lookup

- **Sittings.** `sitLines(p, beat)` tries, in order:
  - the cast character's own lines (`family:<cast>-<beat>`), as now;
  - the module's (`family:<city>-<circumstance>-<beat>`);
  - the old template (`story-<beat>`).
- **The visit and the room.** They use the same lookup by city: `family:visit-home-<city>`, `family:room-offer-<city>` and `family:room-return-<city>`, falling back to the shared scenes.
- **The story's fields.** `home`, `rel`, `left` and `hope` stay on the person, because other scenes read them (letters home, the favour, the look-back). Each module sets them in its table (`fields: { rel, left, hope, homeDetail }`), so the rest of the game agrees with the sittings.

## The writing

- **The bible first.** Each city's page gets a "Growing up here" section for its two circumstances: the household, the rent, the work, who is missed, why people leave, and what they hope for. The owner reviews all five before any scene is written.
- **Each module** has three sittings: home, picture and hope.
  - Each has two or three openings, and two choices with their results, as today.
  - The lines are whole, with no placeholder but `{n}`.
  - They name the place's real streets, rooms and work, following `docs/bible/voice.md`, rule 13 above all.
- **Each city** gets one visit home (the meal at the family's table) and its room scenes (the offer, and the return by gap and count).
- **In all:** 10 modules (30 sittings), 5 visits and 5 room sets.

## Tests

- **The draw.**
  - An Earth crew member draws one of the four cities and one of its circumstances.
  - A Ceres crew member draws Ceres.
  - A Luna, Mars or other Belt crew member draws none.
  - The origin is kept, and survives a save and a load. An old save draws it when the story starts.
- **The lookup.** A cast character's lines come first, then the module's, then the template.
- **No blanks.** A module's lines have no placeholder but `{n}`.
- **Every line is read.** The scene player plays each module's sittings, and each city's visit and room scenes, so `tests/scenelines.test.js` covers them.
- **The full set.** Pins and goldens are rewritten with every diff read, and the effects pin should not move. Then `npm test`, `npm run test:editor` and `npm run coverage -- --check`.

## Out of scope

- The places not yet in the bible: Luna, Mercury, Mars's domes, the other Belt stations and the outer moons. One follow-up issue lists them.
- More circumstances for these five places.
- The everyday-life section of the bible.
- The main characters' own sittings, which are already their own.
