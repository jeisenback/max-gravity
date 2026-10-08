# Places

The places the narrow build's chapter touches: four systems and the four home arcologies of the cast. More are added when a scene needs them. The code's facts (the government, the pirate level, the descriptions) are in `SYSTEMS` in `js/data.js` and are not copied here. A `Divergence:` line names an id in `derived.md`.

### place.earth

- Source: `SYSTEMS.earth` in `js/data.js` (Earth and Luna), government Earth Coalition.
- Day there: Customs queues at the foot of the orbital elevator, noodle stalls along the queue, and shipping clerks who stamp by the tier of the hull.
- Work: Freight up the cable, license desks, wall rotas in the coastal arcologies.
- Sound and smell: Frying oil and wet concrete; the tide gates, which sound at the turn.
- Custom: A queue is kept by the berth book, and a clerk will not stamp a book with a lapsed license until the holder has stood their shift.
- Divergence: `derived.earth-basic`. Drop the headline population and the assistance; a person's standing is their license and their owed shifts.
- Use in scenes: A hand shows the berth book at a window and is asked what is owed on it.
- Status: from code (js/data.js) for the elevator and the queues; the custom is confirmed (owner, 2026-10-08)

### place.mars

- Source: `SYSTEMS.mars` in `js/data.js` (Mars and Phobos Yards), government Mars Republic.
- Day there: Domed cities in the Mariner Valley under a butterscotch sky; a dome council posts its air accounts in the market hall.
- Work: Dome maintenance, engineering at Phobos Yards, coffee.
- Sound and smell: Green things and hot metal inside the dome; the click of the airlock count.
- Custom: A newcomer is asked which dome and which air share before they are asked their name.
- Divergence: `derived.power-triangle`. The dome and its air share come before the Republic.
- Use in scenes: A Martian quotes a dome rule at a captain and offers to show the page.
- Status: from code (js/data.js) for the domes and the engineering; the custom is confirmed (owner, 2026-10-08)

### place.ceres

- Source: `SYSTEMS.ceres` in `js/data.js` (Ceres Station and Ring Nine), government Belt Collective.
- Day there: Corridors that curve upward, hydroponic troughs, and a hand-lettered notice of the day's water allotment on every wall.
- Work: Water, ore, the valves.
- Sound and smell: The knock of a pipe being tapped before it is opened; hot oil and ginger at Ring Nine.
- Custom: Strangers are fed at Ring Nine before they are asked their business (from the code). A household is named by its hatch number.
- Divergence: `derived.belter-people`. Drop the physique and the single people; a person is from a hatch, the Warren and a deck.
- Use in scenes: A Ceres hand taps a pipe before they speak; a stranger is given a bowl before a question.
- Status: from code (js/data.js) for Ring Nine's custom and the allotment notices; the hatch and the pipe-tap are confirmed (owner, 2026-10-08)

### place.jupiter

- Source: `SYSTEMS.jupiter` in `js/data.js` (Ganymede and Europa), government Independent.
- Day there: Ganymede is terraces under mirror arrays, worked under a lease; Europa is a dock of white hoses over an ice shell, run by the Water Authority.
- Work: Food from Ganymede, water from Europa.
- Sound and smell: Irrigation booms; the hum of the ice underfoot at Europa.
- Custom: On Ganymede a lease is inherited, and a buyer is shown the terrace's ledger before the terrace. On Europa a worker touches a blue enamel pin when the water price is named (from the code).
- Divergence: `derived.ganymede-breadbasket`. Ganymede is a leasehold, and the farmers are wary of the lease agent.
- Use in scenes: A farmer on Ganymede asks to see your bill of lading before your face.
- Status: from code (js/data.js) for the arrays, the hoses and the pin; the lease is confirmed (owner, 2026-10-08)

### place.rotterdam-arcology

- Source: the `home` field in `js/captains/hester.js`.
- Day there: A district of locks and ledgers; households keep a wall book for the tide gates.
- Work: The gates, the harbor accounts, bank offices on the upper tiers.
- Sound and smell: Diesel from the barges that still run, and the gate bell.
- Custom: A debt is entered in the household's wall book beside the shift it was borrowed against.
- Use in scenes: Hester writes a figure in the notebook the way her grandmother wrote it in the wall book.
- Status: confirmed by the owner on 2026-10-08

### place.lisbon-arcology

- Source: the `home` field and `story.homeDetail` for Ines in `js/cast.js`: "the ferry pads at dawn, the harbor bell, and an ocean you could hear from the arcology at night".
- Day there: Ferry pads at dawn, the license board in a harbor office.
- Work: The Lisbon to Luna ferry.
- Sound and smell: The harbor bell and the ocean.
- Custom: A pilot's stamp is kept in the license book, and a stamp is pressed in front of the board.
- Use in scenes: Ines will not say the name of the board; she says the date of the appeal.
- Status: from code (js/cast.js) for the pads, the bell and the ocean; the stamp is confirmed (owner, 2026-10-08)

### place.lagos-ring

- Source: the `home` field and `story.homeDetail` for Tomas in `js/cast.js`: "ring gravity you could hang a bucket on, the weld shops going at shift change, and a market you could smell from the dock".
- Day there: Weld shops at shift change, a market on the dock side.
- Work: Dockyard welding, stalls.
- Sound and smell: Weld arcs and a market, on the same breath.
- Custom: A shop keeps a hull's history in a book that moves with the hull, not with the owner.
- Use in scenes: Tomas asks to see a hull's book before he asks its name.
- Status: from code (js/cast.js) for the ring, the shops and the market; the hull book is confirmed (owner, 2026-10-08)

### place.chittagong-arcology

- Source: the `home` field in `js/captains/cato.js` and `story.homeDetail` for Cato: "a flat above a cargo exchange where the lift ran all night and nobody in the building kept the same shift".
- Day there: A cargo exchange on the ground floor and flats above it.
- Work: The exchange, the lift, hold gangs.
- Sound and smell: The lift running all night.
- Custom: A stairwell keeps a shared list of who is on which shift, so that someone is always awake on every landing.
- Use in scenes: Cato writes a name on the back of the watch bill the way the stairwell wrote it on the landing wall.
- Status: from code (js/captains/cato.js) for the flat and the lift; the stairwell list is confirmed (owner, 2026-10-08)
