# Chapter 2: the co-op

Status: approved by the owner on 2026-11-07 (#891). Built on `shape.md`, `ceres-coop.md`, `work.md` and `ship.md`. Amended by the owner on 2026-11-11: the hand is the co-op's captain, on a registry's endorsement, and the four masters of the lender's pool are people met in the war, not aboard.

## What it is

The hand has bought into the Ceres Crew Co-operative and signed for a member's share in the Ore Runner (`ceres-coop.md`). Chapter one ended there. Chapter two is the co-op's: the view moves from the hand to the hull the hand is a member of. The player flies, trades and fights the Ore Runner, and every big decision goes to the members' meeting, where the hand is one of five votes. The hand is still a member, with a share, a vote and a debt of about 93,000 on the share to pay down out of their earnings, and the endings still read the hand's own record.

It has two halves. In the first the hand learns to be a member: the meetings, the votes, the runs that pay the share down. In the second the rumblings of an owners' war (`the-fuel-war.md`) reach the Belt, the co-op's lender starts setting the terms, and the votes get hard. The war itself breaks out in chapter three. It ends in one vote that decides what becomes of the co-op, and where the hand stands in chapter three.

## Who is aboard

Six: the five members and the pilot.

- **Five members**, each with a share and a vote:
  - **the hand;**
  - **Tomas**, who rebuilt her three times on her last owner's account;
  - **Cato**, who saved his buy-in for years and was waiting for a hull to sign on to with others (`ceres-coop.md`);
  - **Bexa**, the older hand. She pulled dead ships into Ceres on a salvage tug for twenty years and wants to bring home one that everybody else gave up on. The Ore Runner is that ship, and it is why she bought in;
  - **Pax**, the young member. A renter's child from the Warren, on the ice crews from sixteen until a coupling failed. A co-op berth was what Warren children hope for; Pax fought for this one, and wants a ship where nobody gets hurt on their watch.
- **The captain is the hand.** The lender would not lend against a hull without a licensed master it approved, or a registry its insurer accepts. The co-op registers the Ore Runner with the small Belt station registry Hester's ship sails under (`ship.md`), the members vote the hand to the bridge, and the hand takes that registry's master's endorsement. It is legal on the registry's ships and worthless at the better ports, which refuse the Ore Runner a berth or look harder at her (`jurisdictions.md`). It is the hand's first paper (`progression.md`, layer 5). The registry sells it for a fee to anyone who asks; a captain who trusts the hand vouches for them instead, and the lender, reading a vouched captain, eases the co-op's terms (`chapter-1.md`, Hester's regard). On the bridge the hand decides; in port the meeting does.
- **Ines**, hired as the pilot on a wage, not a member. She left Hester's ship to come with Tomas, Cato and the hand. She flies on a cheap registry's endorsement (`README.md`, decision 12), which is good only on a hull under that registry. The co-op's registration is the one her endorsement needs, so she can fly the Ore Runner; a real licence would free her, and the co-op, of the registry.

The Ore Runner's refit adds a bunk for the pilot to her five berths.

## What is the co-op's

- **The hull**, for the player to carry out: the course, the burn, the trade and the fights, as the owner game plays them.
- **The books**, open to the player: what the hull earns, the loan, the running costs, and what is left for the members.
- **The meeting**, in port, where the big decisions go: which run the hull takes, who joins, how to answer the lender, and in the middle of the chapter, whether to make Ines a member or put the co-op behind her licence. The player proposes, and the members vote, the hand among them. A vote that goes against the player stands, and the hull takes the run the members chose.
- **The hand's share**, and the debt on it: what the hull earns pays the loan and the running costs first, then the members, and the hand's part pays down the rest of the share.

What is not the co-op's: the terms in a bad year (the lender's). The lender's terms limit what the player may load and which lanes they may fly.

## The meeting and the vote

Status of this section: draft for the owner's review, 2026-11-14 (#1216). It is the one new kind of system in chapter 2.

**Who votes.** The members: five at the start (the hand, Tomas, Cato, Bexa and Pax), more if the meeting takes one in (Ines mid-chapter; a recruit). One member, one vote. A motion carries on more than half of the votes cast; a tie fails, and what was there before stands. A member away from the ship votes by message, a day late.

**What the meeting decides, and what the bridge does.** The meeting decides what the co-op commits to: which run the hull takes, who joins, how to answer the lender, and the last vote. The bridge decides how: the course, the burn, the fight. These are questions put to `role()` (`js/role.js`): what the co-op may trade and pay for is the meeting's, and the hand holds the bridge on the members' vote. A captain who goes against a vote they lost can be voted off the bridge at the next meeting.

**How a member votes.** Each member weighs a motion by:

1. **Their want.** Bexa the hull kept flying, Pax nobody hurt, Cato the co-op kept whole, Tomas the money home (The second half, below). A motion that serves it pulls them; one that cuts across it pushes them away.
2. **The hand.** Their opinion of the hand (`js/people.js`), when the hand argues for the motion: a friend leans the hand's way, a grudge leans against.
3. **Each other.** Bonds (`st.bonds`, `js/social.js`): a member close to another leans their way, and rivals split (#142).
4. **Their nature.** Traits (`TRAITS`, `js/people.js`): a brave member takes the risky run, a careful one does not.

The want comes first and is strongest; the others tip a member who is close. So a member who loves the hand still votes against a run that cuts across their want, unless the hand has given them a reason.

**What the hand can do.**

- **Before the meeting:** talk to the members on the burn (their offers, `burn.md`), learn where each stands, and give a member a reason: a promise, a favour, a share of the risk taken on. A promise made is kept or broken on the record.
- **At the meeting:** propose a motion, argue for it (the hand's own check, by their post's stat and the word), back another member's, or stay out of it and let the meeting choose.
- **What the player sees:** each member's lean, as far as the hand knows it. A member the hand is close to says where they stand; for the others the hand has a guess, and it can be wrong.

**When the meeting splits.** A vote that goes against the player stands, and the hull takes the run the members chose. A member who loses a vote on their want thinks less of whoever carried it. A member who loses on their want three times leaves at the next port, and sells their share back.

**The last vote.** The lender's offer (The end, below) is put the same way, with the whole chapter behind it: every promise kept or broken, every opinion and bond as they stand. Its outcome sets chapter 3 (`chapter-3.md`).

## The first half: paying her off

- The runs come from the boards at each port, and the meeting votes on which to take. The player proposes a run, argues for it, backs a member's, or lets the meeting choose, and the members remember.
- Each run pays down the share. A risky run pays more and costs more if it goes wrong.
- The owners' war rumbles: on the feeds, in the bars, in insurance and freight rates, in lanes that close for a week and open again.

## The second half: the squeeze

- The rumblings reach the Belt: lawsuits, a price war, Ballast Security's ships on "escort" contracts. The lender, financing one side and reading the minutes, starts setting the terms: which cargo, which lanes, what members are paid.
- The votes get hard. Members want different things: Bexa the hull kept flying, Pax nobody hurt, Cato the co-op kept whole, Tomas the money home to his sister.
- The lender's pool of masters, each now on a bridge or waiting for one on a side of the war, cross the co-op's path in port and on the lanes:
  - **Aron Saran** (`people/saran.md`), careful, by the book, master of a freighter under charter to Tycho, where his wife works;
  - **Ama Kessler** (`people/kessler.md`), the lender's placement master, on another of the co-op's hulls, who reports to the house and says so;
  - **Tavi Mensah** (`people/mensah.md`), a Belt master who flew Kaur's tankers for ten years, ashore at Ceres between bridges;
  - **Noor Belanger** (`people/belanger.md`), a former Ballast convoy master with a mark on her licence, whom Ballast takes back for its convoys.

  Each pulls the co-op toward someone in the war. They are the characters written new for this chapter.
- People from the war cross the co-op's path: **Yelena**, a hired gun on a convoy for one of the owners, met beside the co-op or against it, and someone who could be recruited; **Ruben**, on the networks one side of the war depends on, as an informant, a risk or a cause.

## The end: one vote

At the height of the squeeze the lender puts an offer to the members. The meeting votes. The hand's vote counts, and so do the members the hand has won or lost over the chapter. There are three outcomes, and each sets where the hand stands in chapter three (`shape.md`; outlined in `chapter-3.md`):

- **Hold:** the co-op keeps the hull and its independence, at a price. Chapter three is the **organiser's**.
- **Charter:** the Ore Runner is signed over to the lender's side before the war breaks. Chapter three is the **master's**.
- **Sell:** the hull is sold and the members scatter. Chapter three is **outside**.

The chapter can also end the run early, as any chapter can: the hand dies, or is ruined, or walks away (`shape.md`, Endings).

## What carries over from chapter one

- Tomas, Cato and Ines, with their stories, their sittings and their opinion of the hand.
- Opinion carries as it stands; nothing resets at the chapter's start. Goodwill needs keeping up: a high opinion fades by one every 14 days the hand does nothing for that person, down to friend and no further, and never for someone loyal (`OPINION_FADE`, js/people.js). A grudge does not fade; it stays until the hand puts it right. So a friend from chapter one starts chapter two leaning the hand's way but not a sure vote, and a wrong done in chapter one has to be mended on purpose before the last vote.
- The hand's room, if they have one, and the crew's family lines and stories by place (#871, #885).
- The record, for the endings: who lived, who was promised what, who was let down.

Hester's ship goes on without the hand, and is not part of this chapter.

## The cast

Status of this section: draft for the owner's review, 2026-11-14 (#1230). The tiers, threads and pools are `cast.md`'s. The sheets are in `people/`.

### Main: the people aboard

Everyone aboard has an arc: an introduction and a fate that always open, and middles and a late beat that come as offers (`cast.md`). Bexa and Pax are new, with full arcs; Tomas, Cato and Ines carry on from chapter 1 with shorter ones, two or three beats on what chapter 2 does to their wants.

| Who | Their want (`people/`) | Arc, in outline |
|---|---|---|
| **Bexa** | the ship everybody gave up on, kept flying | *Introduction:* the day she says a found crew's names aloud, and the hand is there. *Middles:* a lead on the wreck she has always wanted (the second hull of chapter 4, the organiser's); the lender's man noticing she is the easiest vote. *Late:* the charter would keep her flying, and she knows what it would cost the others. *Fate:* a tow that goes wrong, as her father's did. |
| **Pax** | nobody hurt on their watch; to stop flinching | *Introduction:* the range scores, and the flinch nobody else sees. *Middles:* Femi, their brother, wanting a berth on a co-op hull; the clinic bill they took on that was not theirs. *Late:* the war asks them to fight for someone else, and they will not. *Fate:* a fight where someone is hurt on their watch, or is not. |
| **Tomas** | Ngozi's arrears cleared, then a lease of his own on the ring | *Middles:* the share's payments against the money home; a ring lease coming free. *Late:* whichever outcome of the last vote pays Ngozi. |
| **Cato** | the co-op kept whole, the people he brought kept together | *Middles:* a member wavering, and Cato asking the hand to help keep them. *Late:* the last vote as the thing he built being decided. |
| **Ines** | her licence back, and the lawsuit dropped | *Middles:* the mid-chapter vote, member or licence; Kessler's offer of a real licence through the house. *Late:* the charter as the road to her licence, and what it asks of the others. |

The hand's own arc is the hand's: the share, the bridge, the record.

### How each tends to vote

The meeting's rule is above (The meeting and the vote): a member weighs their want first, then the hand, their bonds and their nature. On the last vote that leaves the chapter balanced, with two to win:

| Member | Leans to | Against | What can turn them |
|---|---|---|---|
| Bexa | Charter: it keeps her flying | Sell | a hold that still keeps her flying: a refinance, a fair-terms promise (`chapter-3.md`, the hold's price) |
| Pax | Hold, or Sell if the war has hurt someone | Charter: fighting for someone else | a hold that keeps the co-op out of the fighting |
| Cato | Hold | Sell | very little; a co-op that cannot hold may be better sold than chartered, to him |
| Tomas | whichever pays home: Charter's wage, or Sell's share money for the lease | the one that leaves Ngozi short | the hand putting the money home first: a promise, a loan, a run |
| Ines (if a member) | Charter, if it brings her licence; Hold if she has it already | Sell | her licence won some other way |

So Cato is the hand's surest ally for a hold, Bexa and Ines the lender's, and Tomas and Pax the swing.

### Recurring: met in the war

The four masters of the lender's pool, each pulling toward a side: Aron Saran (Tycho), Ama Kessler (the house), Tavi Mensah (Kaur and the rocks), Noor Belanger (Ballast). And two who can be recruited, each a member the meeting could vote in: Yelena (with Ballast, turnable if she sees Ballast bench a crew) and Ruben (on the open band, Kaur's useful man and Ballast's target). Their threads run into chapter 3 on every path (`chapter-3.md`).

### Regulars and passing

- **The co-op's people at Ceres:** Kettle, its founder; the members of its other four hulls; its office, where the share was signed. A pool of regulars by `cast.md`'s rule, written with Ceres's regulars (#1212).
- **The rocks and freeholds** the co-op supplies: their people as regulars by place, met again on every run there.
- **Passing:** the dock crews, the rocks' people, the war's crews; any of them promotable.

### What carries over from chapter 1, by person

| From chapter 1 | In chapter 2 |
|---|---|
| Tomas, Cato, Ines | aboard, if they came with the hand at Ceres (`chapter-1.md`, the signing) and are alive; opinion as it stands (above) |
| A main character who died | on the memorial; their seat open, and a recruit voted in to fill it |
| One who stayed with Hester | away: heard of, met in port, possibly returning |
| Hester | away: her ship goes on without the hand, and she can be heard of or met |
| The arcs' contacts (Wen Haraldsen, Odile Marchetti, Hob Strand, Mirela Sandoval) | recurring, tagged to their power, shaped by the chapter 1 marks |
| Port regulars and the dock officials | regulars by place, as they were |
| The family | the hand's own thread, as it was |

## Assumptions to confirm

- Chapter two has two halves: paying the share down, then the lender's squeeze as an owners' war rumbles; the war breaks out in chapter three.
- The view is the co-op's: the player is the Ore Runner's captain and flies, trades and fights her, and the big decisions go to the members' vote, which can overrule the player.
- The hand holds the bridge on the master's endorsement of the registry Hester's ship sails under, voted by the members; the lender accepts the registry in place of an approved master.
- The four masters of the lender's pool are met in the war, each leaning to a side, and none is aboard.
- The five members are the hand, Tomas, Cato, Bexa and Pax; Ines comes as the hired pilot, and her membership or licence is a vote mid-chapter.
- The Ore Runner's refit adds a bunk for the pilot, so six are aboard.
- Yelena and Ruben come in through the war, as people to meet and possibly recruit.
- The chapter ends in one vote on the lender's offer, with three outcomes: hold, charter or sell.
- The meeting: one member one vote, more than half carries, a tie fails; a member weighs their want first, then the hand, their bonds and their nature; three losses on their want and a member leaves.
- Hester's ship is not part of the chapter.
- Opinion carries over as it stands: goodwill fades to friend without upkeep, grudges stay until mended.
- Everyone aboard has an arc; Bexa and Pax full ones, Tomas, Cato and Ines shorter ones on their wants. On the last vote Cato leans hold, Bexa and Ines charter, Tomas and Pax swing.
- Bexa's and Pax's Ceres homes (the station, the Warren) stand; Yelena's home is a hub dome and Ruben's an outer dome at the edge (`mars.md` names no domes; their sheets say so).
