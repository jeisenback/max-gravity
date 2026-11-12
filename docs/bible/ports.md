# The ports

Status: approved by the owner on 2026-11-12 (#1099), with the open questions answered as below. It covers what the port view is, and Earth's port first, since the game starts there. `look.md` is how the burn view looks; this page is how a port is put together and what it looks like, and it takes the burn view's rules where they fit. Each place's own page in this bible is what fills its port.

## The port view

A port is drawn the way the ship is: a cutaway in a clean frame, the rooms as boxes in depth, warm light in a cold structure, and people on their own routines. The frame is the port authority's: the berth number, the lock's status, the local time. Inside it, the port is a working place that a few people own and many people rent.

What the view cuts through is the part of the port a crew uses: the berth and its lock, the way from the lock to the rest of the port, and the places along it where people eat, drink, hire, buy and sleep. It is not the whole port. A station shows a slice of it; a port on the ground shows a street or a concourse.

People on the view keep the hours of the place, not of the ship. A dock crew works its shifts, a stall opens and shuts, the bar fills when a shift ends. The hand and the ship's crew are among them while the ship is in, and the port's scenes start from where its people are: a regular at the bar, the clerk at the yard office, a main character at a stall.

The rules from `look.md` that carry over unchanged: cramped where space is paid for, every room a box in perspective, solid things showing their depth, things mounted the way real ones are, objects reading as the real thing, clutter that is someone's, wear that is plausible, warm light in a cold hull, nothing under 12 px, desktop only.

What a port adds:

1. **Who owns it shows.** A port is a business. The owner's marks are on what the owner controls: the lock, the meters, the lease plates on the stalls, the price boards. What a tenant owns is their own: a stall's awning, a bunk's photos, a bar's posters.
2. **Everything is paid for.** Air, water, power, berth time and a seat at the bar are metered or charged, and the meters are where people can see them.
3. **The port is older than the ship's visit.** Signs over signs, a stall that used to sell something else, a lease plate with a name scratched out.

## Earth: Lagos Ring

Earth's port, for a torch ship, is Lagos Ring (`lagos.md`). Torch ships do not light their drives inside Earth's traffic zone, so a tug brings the ship in to the Ring's hub and takes her out again. Everything to or from the ground goes by spaceplane between the hub and the Lagos launch platform. The hand signs on with Hester here.

The Ring is about four hundred metres across and turns one and a half times a minute: half a g on the rim, none at the hub. About six thousand people live on it. It belongs to Lagos Arcology's holding company, which charges for the air and the water and sets the rents, in Lagos scrip. Its police and its customs are the arcology's.

### What the view cuts through

From the ship's berth down to the rim, in the order a hand walks it:

1. **The berth, at the hub.** The dock is on the axis, where the Ring barely turns, and is weightless. The ship's lock meets the berth's collar. Handrails, a cargo net and a freight sled on its track; a tug's crew drinking from bulbs by the collar between jobs. The berth's meter on the wall counts the hours at the berth rate. The customs office is here, at the head of the berths, with the arcology's mark on its hatch.
2. **The spoke lift.** A car on a rail down one of the spokes, two hundred metres from the hub to the rim. Weight comes back on the way down; people sit for it and strap a bag between their feet. The car takes twelve, and at a shift change it runs full both ways.
3. **The rim.** A slice of it, about forty metres long, three levels deep. The floor of each level rises gently at both ends of the view, because the rim curves; over forty metres it rises about a metre. The outermost level is at half a g, the ones above it a little less.
   - **The market,** on the outermost level: bays rented in the wall, each a steel frame with a roll-down shutter, its lease plate on the frame and its permit card for the year in the corner, and a counter in front. What is inside is the tenant's: a hob and pans and a menu screen, parts bins and a lamp on an arm. A bay between tenants has its shutter down. No awnings: nothing on the Ring is built as if it were outside (the owner, 2026-11-12). Ngozi Achebe's food stall is here, feeding the yard shifts (`lagos.md`). A port in the floor at the market's middle shows the stars, and Earth going by every forty seconds.
   - **The bar,** the Gravity Well (`js/bar.js`), off the market: a long copper counter, travel posters from a dozen ports curling on the walls, and the drinks priced in scrip and in trade notes.
   - **The yard offices,** on the level above: the agencies' hiring boards for refit contracts, and the yard's own office where a ship's refit is signed.
   - **The clinic,** under contract, next to the yard offices.
   - **The bunkrooms,** on the top level: agency berths, three high, each held as long as its contract.

### Its people

- The dock crew at the hub and the tug crews, on the yard's shifts.
- Yard workers on contract from the mainland, in the bunkrooms between shifts, at the hiring boards between contracts.
- Leaseholders who run what the workers need: the stalls, the bar, a repair shop.
- The customs officers at the head of the berths, on the arcology's rota.
- Main characters with a reason to be here: Tomas, who worked the yard for most of twenty years, and his sister Ngozi at her stall.

The Ring keeps Lagos time. The lights on the rim go down at Lagos's night, and the yard works three shifts through it.

## What this changes in the game

Each is its own piece of work, once the owner has corrected this page:

- **Earth's port is the Ring, not an elevator.** The port's description (`SYSTEMS.earth`, `js/data.js:66`) and the Earth sign-on (`scene:sign-on`, `text.earth` and `away.earth` in `js/hiredscenes.js`: the queue at the foot of the elevator, the tide gates below) are rewritten for the Ring. The bible has no elevator, and these are the only places the game has one.
- **The port view for the Ring,** drawn to the rules above, with its people on routines as the crew are on the ship (`js/shiplife.js`).
- **The port's scenes from its people:** the bar, the day ashore, the jobs and the sign-on start from where someone is on the view.

## Later

- **Going down to the planet** (the owner, 2026-11-12): from the Ring, a spaceplane to the Lagos platform and into the arcology below, and so to the other Earth cities in this bible (Lisbon, Rotterdam, Chittagong). Not in the first port view.
- **The information a port carries** (prices, the boards, the missions, standing) stays on the pages for now. The view comes first; what the pages become follows from it.

## Settled with the owner

1. The view runs from the berth at the hub, down the spoke lift, to a slice of the rim.
2. The Earth start: the hand grew up in an arcology and comes up to the Ring on a spaceplane for the job, as the yard workers come up for a contract.
3. The bar keeps its name, the Gravity Well, and its copper counter.
