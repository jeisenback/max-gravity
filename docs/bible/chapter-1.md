# Chapter 1: the hand

Status: draft for the owner's review, 2026-11-11. Most of it records the chapter as built (the code wins, `README.md`); the section "Where the hand reaches the world" is new, the owner's choice of 2026-11-11, and not built. Built on `shape.md`, `work.md`, `ship.md`, `ceres-coop.md`, `owners.md` and the people sheets.

## What it is

The hand signs on as a rating on Hester's ship and works to buy into the Ceres co-op. It is the chapter that is mostly spine (`shape.md`): who you are, who you work for, what you are saving for. It ends at Ceres, at the foot of the Ore Runner's ramp, with a member's share signed and most of it still owed (`ceres-coop.md`). It takes about 160 days in play (`ROADMAP.md`).

## Who is aboard

Seven, on Hester's Ice Hauler (`ship.md`):

- **Captain Hester Vance**, on a hire-purchase charter from Van Leeuwen & Co. (`people/hester.md`).
- **Ines Ferreira**, the pilot, and **Tomas Achebe**, the engineer: the officers, on Hester's articles at a day rate and six percent each (`people/ines.md`, `people/tomas.md`).
- **Cato Rahman**, the bosun: he runs the ratings and the rota and holds the first aid (`people/cato.md`).
- **The hand**, at the guns in the shipped build, and **two deckhands**: agency ratings on a day rate less the kit.

## The spine

1. **Signing on.** At Earth, through the hiring hall, on a rating's day rate and a recruitment debt of 9,000 (the hall's bond). The hand owes the hall before they can sign anything else.
2. **The work.** The ship runs contracts from named shippers on the freight boards (`js/contracts.js`) and, between them, ice runs to the outer Belt's rocks (`js/icerun.js`). The captain picks the runs. The hand's days are the post on a burn, the jobs and the bar ashore, and the people aboard.
3. **The hull on the apron.** From the second run Tomas walks past the Ore Runner, the hull he rebuilt three times, with her name painted over.
4. **The captain's two scenes.** Hester's trouble, then her secret, which the hand learns by trust or by accident.
5. **The offer.** When the hand's savings reach about half the buy-in, after the captain's scenes, Tomas says the Ceres co-op has bought her and is taking members, and that he will speak for you. The buy-in is set by the vote: 51,000 when a member speaks for you, 57,000 on a plain vote, 63,000 when nobody does. The offer stays open 84 days.
6. **Signing at Ceres.** The share is signed only at the co-op's office at Ceres. Cato signs on with you if he is aboard and alive; the others who think well of you come too.
7. **The close.** "A Member's Share", the look back, and the end of the chapter, which goes on into chapter two (`chapter-2.md`).

## What the hand does

- **Their post.** In a ship fight the hand runs the guns; the captain and the crew move by visible rules (`COMBAT.md`). The fights come in a teaching order (`js/fightladder.js`): a lone raider after the first run, a corsair after the third, and a veteran corsair as the set piece once the offer is open and the savings are there. Random contacts in between draw only from what has been met.
- **The deck.** Boarders on our deck, or her deck when she is crippled: the hand moves, acts and gives one order (`COMBAT.md`).
- **On a burn.** Downtime at the post, sittings with the crew, the crew's teaching of moves.
- **Ashore.** Jobs, the bar and its regulars, the dock official, the family visit, a room of one's own.
- **At the hatch.** One move at a port inspection, by post (`js/inspection.js`).
- **Through the captain.** Work elsewhere is pitched to the captain, who takes it or not by her regard for the hand. The mission arcs come this way.

## What it can cost

A fight can hurt the hand, kill a shipmate, or end the hand's story (the floor is 0 in the shipped build, `docs/superpowers/specs/2026-10-07-death-and-departure.md`). The captain can put the hand ashore. A shipmate who comes to dislike the hand walks off. The memorial keeps the dead.

## How the hand grows

A post line to about level 2, a pick or two, the first trait, and the kit (`progression.md`, chapter 1).

## Where the hand reaches the world

In the rest of the chapter the hand moves only their own people (`owners.md`, How far the player reaches). In three places they reach further, each by what they do, and each moves one minor power and leaves a mark that the world shows and chapter two reads.

The rules for all three:

- **The hand's own actions decide their part.** Carrying, speaking, signing, standing with someone or not. Nothing is decided for them by a roll they did not choose.
- **The world decides the rest.** The hand tips the outcome and never settles it alone (`shape.md`).
- **The mark is shown.** A news line, a port's unrest, a price that moves for a stretch, and a person or a power that remembers the ship.
- **No windfall.** None of the three pays the hand more than a run would, so the chapter's length holds.
- **Chapter two reads it.** Each mark is kept where chapter two can find it: on the record now, and as the power's standing once `owners.md` step 3 is built.

### The water at Pallas (the Guild Federation's arc)

What is built: the League Freight Hall's sealed crate for Wen Haraldsen at the Hollows, the refinery's own ledger of the water it has drawn beyond its share, and a vote on the draw at the refinery in six days. The hand's weight at the count (`leagueSide`) decides which way the Hollows' delegates go. Today it ends in a person, an item or a fee.

The mark:

- **The Hollows carry the vote.** The refinery's draw is cut. Pallas's unrest falls, the news says the Hollows won the count, and the water price at Pallas rises for a stretch while the refinery buys what it can no longer draw. The Hollows remember the ship; the refining company does too.
- **The refinery keeps its draw.** The Hollows go short. Pallas's unrest rises, the news says the draw stands, and the Hollows remember who was at the count.

Who remembers: the Hollows (a minor power, a line family's tunnels) and the refining company (a minor power, the refinery's owner). In chapter two the Hollows are a haven to the co-op or a closed door, and the refinery's board treats the Ore Runner as the ship that was at the count.

### The air at Eros (the Dome Pact's arc)

What is built: Odile Marchetti's audit of the air the domes' levy pays for in the sealed half of Eros Old Town, and Hob Strand, the town's air steward, who has been sending that air to the living half's cisterns. The hand walks the corridors or does not, and signs the count as it is or does not (`concordSide`).

The mark:

- **The audit stands.** The levy stops paying for the sealed half. The families in the closed corridors lose the air they were living on, Eros's unrest rises, and the news says the domes have cut the levy for Old Town. The town trust closes another corridor. The Dome Pact's auditors remember the ship well.
- **It does not stand.** The steward's air goes on. Nothing is in the news, which is the point. The closed half remembers the ship, and the steward pays the fee.

Who remembers: the town trust and the closed half (minor powers), and the Dome Pact. In chapter two the closed half is somewhere the co-op can trade quietly, or a door shut.

### The Ice Haulers' Strike

The Belt's ice haulers strike against the price the buyers at Ceres pay for ice, Kaur's buying office first among them. It is the strike `work.md` says is news across the Belt. Hester's ship hauls ice between contracts, so the strike asks her ship to stop, and she cannot afford to: one bad quarter loses her the charter. It comes once, on a burn into the Belt after about day 20, by the Guild's broadcast on the band, and it lasts about a month.

What the hand can do, each a choice of their own:

- **Stand with it.** Ask Hester to haul no ice until it is settled. She hears the hand by her regard, and says no in figures; Cato and Tomas can be talked round to say it with the hand. If she agrees, the ship takes only contracts for the month, and the hand's savings are slower.
- **Carry for it.** The Guild's organiser at Ceres asks the hand to carry supplies out to the strikers' families in the Warren and on the picket ships: medicine, food, parts, in a few tons of the hand's own space under a tarp in the hold. It is against her insurer's terms. If Hester finds out, it is the hand's trouble, and she can put them ashore.
- **Keep out of it.** Do the work and say nothing. The ship hauls ice through the picket at Ceres, as most ships do.
- **Cross it openly.** Take the buyers' bonus for hauling during the strike. It is a scab's pay, and the Guild keeps the names.

How it ends is the world's, tipped by the hand: the strike's own dice, how many ships stood with it, and what the hand carried and said. Three ends:

- **The Guild wins.** The buyers raise the ice price. Water is dearer across the Belt for a stretch, the news says the strike won, and Ceres's unrest falls. The Guild remembers who stood with it.
- **A deadlock.** The haulers go back at the old price, with promises. Nothing changes in the prices. The buyers remember who carried for the strike.
- **It breaks.** The haulers go back for less. Ceres's unrest rises. The Guild remembers who crossed it.

Who remembers: the Ice Haulers' Guild (a minor power, one of the trades), the strikers' families in the Warren (where Pax's family rents, `people/pax.md`), and Kaur's buying office, which notices a ship's name and nothing more in chapter one. In chapter two the Guild is the first union the co-op meets, and Kaur's office is the first major power that knows the ship.

The old strike (`js/stories/ice-strike.js`, full build) is the source to check, not to copy. It was written for an owner with a ship and a fund, paid 30,000 to 80,000 cr, used a customs cutter mid-burn that the world no longer has, and ended on the old powers' wars. Its organiser's name is taken by two other people in the bible, and is chosen again.

## What the game changes to fit

In order, each its own piece of work:

1. **The two arcs' marks.** Effect lines on the end scenes of the League and Concord arcs (`js/stories/arc-league.js`, `arc-concord.js`): `unrest`, `news`, a price that moves for a stretch at the port, and a quality for what is remembered. The effects exist in the storylet engine except the price, which needs one.
2. **The strike for the hand.** Its scenes rewritten for a rating on Hester's ship, in the voice; the four choices above; the supplies in the hand's own space, with Hester's finding out as one of the stakes (`js/stakes.js`); the three ends without the wars; no windfall. Switched on in the shipped build (it is a storyline today, off in the narrow scope).
3. **The record.** Each mark kept on the hand's record as a quality now, and read as the minor power's standing once `owners.md` step 3 is built.
4. **The soak.** The chapter's length and pay held to their bands with the three in play (`npm run soak`).

## Assumptions to confirm

- The chapter as built: seven aboard, the spine above, about 160 days, the fights in a teaching order.
- Three places where the hand reaches the world: the water at Pallas, the air at Eros, and the strike; each moves one minor power, is decided in part by the hand's own actions and in part by the world, shows its mark, pays no windfall, and is read in chapter two.
- The strike is against the ice buyers at Ceres, Kaur's office first among them; it comes after about day 20 and lasts about a month.
- The Compact's licence arc stays a personal one, with no mark on the world.
