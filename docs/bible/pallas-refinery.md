# Pallas Refinery

Status: approved by the owner on 2026-11-04. Built on `economy.md`, `work.md` and `jurisdictions.md`.

## The place

The smelters along Pallas's spine, glowing in the black, feeding slag into the casting bays. The shifts change on the hour. The refinery buys ore from the Belt and sells metal on, and everything on the main deck belongs to the company that owns it.

## Who owns it

One refining company owns the refinery, the main deck and the company store, as one corporate space: its rules, its security, its currency at the store. It is the only refinery within a week's burn, so the prospectors sell to it at its price.

## Staff and contract

The refinery has two kinds of worker. Staff are salaried: engineers, metallurgists, shift supervisors, on the company's books with a flat on the main deck, a pension and a contract that renews. The shift crews are on contracts of a year or two, hired through an agency. Their berth, food and kit are deducted from their pay, and anything else comes from the company store, on an account against the next pay.

## Living there

The staff flats are on the main deck, near the offices, quiet and warm. The contract crews live in shift blocks by the smelters, and the families who stay longer move out to the Hollows. The company store sells the only luxuries within a week's burn, at prices that are almost fair.

## Its places

Status of this section: draft for the owner's review, 2026-11-14 (#1246), bringing the place in line with `places.md`, `regulars.md`, `powers-people.md`, `trade-goods.md` and the code (`js/data.js`, `js/bar.js`).

**Who owns it, in the code's terms.** The refinery is a company works (`places.md`), owned by Pallas Smelting (`powers-people.md`), and sits in the Guild Federation's space (`js/data.js`): the bloc's law at the lock, the company's everywhere past it.

| Inner place | At Pallas | Whose | Where |
|---|---|---|---|
| **Berth** | the company's pads along the spine | the company's | the spine |
| **Customs** | the Guild Federation's check at the lock, then company security's | the bloc's; the company's | the lock |
| **Market** | the trade floor where the refinery sells metal and buys what the works needs | the company's | the main deck |
| **Bar** | the Slag Heap, tables cut from old casting molds, a jacket on the wall for every crew that lost someone (`js/bar.js`) | the company's | by the shift blocks |
| **Store** | the company store, the only luxuries within a week's burn, on account | the company's | the main deck |
| **Clinic** | the works' clinic, burns every day | the company's | the main deck |
| **Lodging** | staff flats on the main deck; the shift blocks by the smelters | the company's | the main deck; the smelters |
| **Hiring** | the agency's desk for the shift crews | the agency's | the main deck |
| **Shipper's office** | the refinery's own freight desk (`js/contracts.js`) | the company's | the main deck |
| **Chapel** | the works' shrine, where the line's dead are read out | private | by the shift blocks |
| **Security** | company security (Severin Moth, `powers-people.md`) | the company's | throughout |

There is no yard: a ship that needs work goes to Ceres.

**Its people's places.** The Slag Heap's stools and the store's counter hold the regulars (`regulars.md`, Pallas Refinery); the board's director, security and the water plant's engineer are in the offices and on the main deck (`powers-people.md`).

**Its law.** The Guild Federation inspects; with no yard here, Pallas does not license machine parts (the owner, 2026-11-14), and taxes nothing at the dock. The company's security reads every manifest again for anything it did not license.

**Its trade.** The refinery makes refined metals, priced low, and wants machine parts, electronics, food and water, priced high (`js/data.js`): it runs on what it cannot make.

**Its hours.** The shifts change on the hour, and the Slag Heap fills and empties with them.

**In the story.** The water at Pallas (`chapter-1.md`) is counted here, at the vote on the refinery's draw, in the board's room on the main deck. In chapter 2 the refinery treats the Ore Runner as the ship that was at the count.

## Growing up here

**In a staff family.** A child of a salaried refinery family, raised in a company flat on the main deck, schooled at the company school with the other staff children. They can tell you what a ton of refined nickel fetches and what a smelter costs to restart, and they've never had an account at the store. Who is missed: a parent who supervises a shift. Why they leave: the company would hire them, and they want to know whether anyone else would. What they hope for: a post they got on their own, or to come back to the refinery as staff on their own terms.

**On contract.** A child of a shift-crew family on contracts through the agency, raised in the shift blocks by the smelters, with the company store's account always one pay behind. They know the shift bell better than their own name. Who is missed: a parent on the smelter line. Why they leave: the account never quite clears, and the agency offered them a berth on a ship instead. What they hope for: to clear the family's account at the store, or a staff post with a flat and a pension.

## Assumptions to confirm

- One refining company owns the refinery, the main deck and the store, as a corporate space.
- Staff are salaried with a company flat and a pension; shift crews are on agency contracts with deductions.
- Contract families keep an account at the company store against the next pay.
