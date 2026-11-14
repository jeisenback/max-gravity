# Chapter 2: the co-op

Status: approved by the owner on 2026-11-07 (#891). Built on `shape.md`, `ceres-coop.md`, `work.md` and `ship.md`. Amended by the owner on 2026-11-11: the hand is the co-op's captain, on a registry's endorsement, and the four masters of the lender's pool are people met in the war, not aboard.

## What it is

The hand has bought into the Ceres Crew Co-operative and signed for a member's share in the Ore Runner (`ceres-coop.md`). Chapter one ended there. Chapter two is the co-op's: the view moves from the hand to the hull the hand is a member of. The player flies, trades and fights the Ore Runner, and every big decision goes to the members' meeting, where the hand is one of five votes. The hand is still a member, with a share, a vote and a debt of about 93,000 on the share to pay down out of their earnings, and the endings still read the hand's own record.

It has two halves. In the first the hand learns to be a member: the meetings, the votes, the runs that pay the share down. In the second the rumblings of an owners' war (`the-fuel-war.md`) reach the Belt, the co-op's lender starts setting the terms, and the votes get hard. The war itself breaks out in chapter three. It ends in one vote that decides what becomes of the co-op, and where the hand stands in chapter three.

## Who is aboard

Six: the five members and the pilot. Who they are is drawn, as chapter 1's pair is (`drawCastPair`, `js/cast.js`), so the chapter is written for slots and not for names (the owner, 2026-11-14; The cast, below). The list here is the usual narrow run: an Earth start, Ines and Tomas drawn, Hester's ship with Cato.

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

**Who votes.** The members: five at the start (drawn: Who is aboard, above), more if the meeting takes one in (the hired pilot mid-chapter; a recruit). One member, one vote. A motion carries on more than half of the votes cast; a tie fails, and what was there before stands. A member away from the ship votes by message, a day late.

**What the meeting decides, and what the bridge does.** The meeting decides what the co-op commits to: which run the hull takes, who joins, how to answer the lender, and the last vote. The bridge decides how: the course, the burn, the fight. These are questions put to `role()` (`js/role.js`): what the co-op may trade and pay for is the meeting's, and the hand holds the bridge on the members' vote. A captain who goes against a vote they lost can be voted off the bridge at the next meeting.

**How a member votes.** Each member weighs a motion by:

1. **Their want.** Each main character's own (The cast, below): in the usual narrow run Bexa the hull kept flying, Pax nobody hurt, Cato the co-op kept whole, Tomas the money home. A motion that serves it pulls them; one that cuts across it pushes them away.
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
- The votes get hard. Members want different things (in the usual narrow run): Bexa the hull kept flying, Pax nobody hurt, Cato the co-op kept whole, Tomas the money home to his sister.
- The lender's pool of masters, each now on a bridge or waiting for one on a side of the war, cross the co-op's path in port and on the lanes:
  - **Aron Saran** (`people/saran.md`), careful, by the book, master of a freighter under charter to Tycho, where his wife works;
  - **Ama Kessler** (`people/kessler.md`), the lender's placement master, on another of the co-op's hulls, who reports to the house and says so;
  - **Tavi Mensah** (`people/mensah.md`), a Belt master who flew Kaur's tankers for ten years, ashore at Ceres between bridges;
  - **Noor Belanger** (`people/belanger.md`), a former Ballast convoy master with a mark on her licence, whom Ballast takes back for its convoys.

  Each pulls the co-op toward someone in the war. They are the characters written new for this chapter.
- People from the war cross the co-op's path, the two main characters not yet met (The cast, below); in the usual narrow run **Yelena**, a hired gun on a convoy for one of the owners, met beside the co-op or against it, and someone who could be recruited; **Ruben**, on the networks one side of the war depends on, as an informant, a risk or a cause.

## The end: one vote

At the height of the squeeze the lender puts an offer to the members. The meeting votes. The hand's vote counts, and so do the members the hand has won or lost over the chapter. There are three outcomes, and each sets where the hand stands in chapter three (`shape.md`; outlined in `chapter-3.md`):

- **Hold:** the co-op keeps the hull and its independence, at a price. Chapter three is the **organiser's**.
- **Charter:** the Ore Runner is signed over to the lender's side before the war breaks. Chapter three is the **master's**.
- **Sell:** the hull is sold and the members scatter. Chapter three is **outside**.

The chapter can also end the run early, as any chapter can: the hand dies, or is ruined, or walks away (`shape.md`, Endings).

## What carries over from chapter one

- Chapter 1's pair and the first officer, if they came and are alive (in the usual narrow run Tomas, Ines and Cato), with their stories, their sittings and their opinion of the hand.
- Opinion carries as it stands; nothing resets at the chapter's start. Goodwill needs keeping up: a high opinion fades by one every 14 days the hand does nothing for that person, down to friend and no further, and never for someone loyal (`OPINION_FADE`, js/people.js). A grudge does not fade; it stays until the hand puts it right. So a friend from chapter one starts chapter two leaning the hand's way but not a sure vote, and a wrong done in chapter one has to be mended on purpose before the last vote.
- The hand's room, if they have one, and the crew's family lines and stories by place (#871, #885).
- The record, for the endings: who lived, who was promised what, who was let down.

Hester's ship goes on without the hand, and is not part of this chapter.

## The cast

Status of this section: draft for the owner's review, 2026-11-14 (#1230). The tiers, threads and pools are `cast.md`'s; the sheets are in `people/`.

### Slots, drawn from the pool

Chapter 1 draws two of the six main characters (Ines, Tomas, Yelena, Ruben, Bexa, Pax), of different posts and weighted to the start's culture, and the captain brings a first officer (Hester's is Cato; the full build's other captains bring Ansel, Ilsa or Pilar, `js/captains/`). Chapter 2 is written for slots that the run fills:

| Slot | Filled by | In the usual narrow run |
|---|---|---|
| Chapter 1's pair | the two drawn, if they came at Ceres and are alive; members, except Ines, who comes as the hired pilot | Tomas a member, Ines the hired pilot |
| The first officer | the captain's, if they came | Cato |
| New members at Ceres | from the four not drawn, enough to make five members; those whose sheet places them at Ceres first | Bexa and Pax |
| The hired pilot | Ines, wherever she is (her cheap registry's endorsement is her story); if she is dead or stayed with the captain, an agency pilot | Ines |
| The war's recruits | the main characters still not met | Yelena and Ruben |

So nobody is met twice, and every run meets all six main characters by the end of the chapter, aboard or in the war. A seat left by someone who died or stayed with the captain is filled from the same draw.

### Where each is, if not drawn in chapter 1

| Main character | In chapter 2, if not met yet | Slot it fits |
|---|---|---|
| Bexa | at Ceres, buying in with twenty years of tug savings (`people/bexa.md`) | a new member |
| Pax | at Ceres, a Warren renter's child fighting for a berth (`people/pax.md`) | a new member |
| Tomas | at Ceres on the yard's contracts, the welder who rebuilt the Ore Runner (`ceres-coop.md`) | a new member |
| Ines | flying the house's ferry contracts in the Belt, on Kessler's books, and taking the Ore Runner's berth | the hired pilot |
| Yelena | a gunner with Ballast on "escort" contracts (`people/yelena.md`) | the war; recruitable |
| Ruben | the relay keeper of the open band (`people/ruben.md`) | the war; recruitable |

A main character drawn in chapter 1 is where chapter 1 left them, and their sheet's chapter 2 place does not apply.

### Arcs

Everyone aboard has an arc: an introduction and a fate that always open, middles and a late beat that come as offers (`cast.md`). A main character met new in chapter 2 has a full arc; one carried from chapter 1 a shorter one, two or three beats on what chapter 2 does to their want. Each of the six has both written, so any draw is covered.

| Who | Their want (`people/`) | Arc as a new member, in outline |
|---|---|---|
| **Bexa** | the ship everybody gave up on, kept flying | the day she says a found crew's names aloud; a lead on the wreck she has always wanted (the organiser's second hull, chapter 4); the lender's man noticing she is the easiest vote; *fate:* a tow that goes wrong, as her father's did |
| **Pax** | nobody hurt on their watch | the range scores and the flinch; Femi, their brother, wanting a co-op berth; the war asking them to fight for someone else; *fate:* a fight where someone is hurt on their watch, or is not |
| **Tomas** | Ngozi's arrears cleared, then a lease of his own | the hull he rebuilt three times, his now in part; the share's payments against the money home; a ring lease coming free; *fate:* the plant, as in chapter 1 |
| **Ines** | her licence back, the lawsuit dropped | the member-or-licence vote; Kessler's offer of a real licence through the house; the charter as the road to it; *fate:* an approach flown by hand |
| **Yelena** | a ship where nobody is left on the bench | turned from Ballast after it benches a crew; a gunner who wants to captain; *fate:* a fight she will not leave |
| **Ruben** | every rock on one open band | the band kept up from the Ore Runner; Kaur's money and Ballast's hunt; *fate:* the band traced to the ship |

The first officers' chapter 2 arcs are shorter still, on their wants: Cato the co-op kept whole; Ansel a safe retirement; Ilsa command of her own; Pilar respect, not a note on her file.

### How each tends to vote on the last vote

The meeting's rule is above (The meeting and the vote): their want first, then the hand, their bonds and their nature.

| Who | Leans to | Against | What can turn them |
|---|---|---|---|
| Bexa | Charter: it keeps her flying | Sell | a hold that still keeps her flying |
| Pax | Hold, or Sell if the war has hurt someone | Charter | a hold that keeps the co-op out of the fighting |
| Tomas | whichever pays home | the one that leaves Ngozi short | the money home put first |
| Ines | Charter, if it brings her licence | Sell | her licence won some other way |
| Yelena | Hold: everyone plays | Charter (Ballast's side) | a charter to a side that does not bench crews |
| Ruben | Hold, or Sell to keep the band free | Charter (Tycho's side wants the band shut) | a hold that carries the band |
| Cato | Hold | Sell | very little |
| Ansel | Sell: take the money and retire | Hold | a hold with the risk off him |
| Ilsa | Charter: a licensed bridge is command | Sell | command offered in a hold |
| Pilar | Sell: outside, where the rules thin | Charter | a hold that leaves her be |

**The draw keeps the meeting open.** The new members at Ceres are drawn weighted so that the meeting is not all one way at the start: at least one member leaning each way of hold and charter. In the usual narrow run that gives Cato toward a hold, Bexa and Ines toward a charter, and Tomas and Pax the swing.

### Recurring: met in the war

The four masters of the lender's pool, each pulling toward a side: Aron Saran (Tycho), Ama Kessler (the house), Tavi Mensah (Kaur and the rocks), Noor Belanger (Ballast). In the full build they can also be chapter 1's captain (`js/captains/`): one who was is met as the hand's old captain, not new. And the war's recruits (the slot above), each a member the meeting could vote in. Their threads run into chapter 3 on every path (`chapter-3.md`).

### Regulars and passing

- **The co-op's people at Ceres:** Kettle, its founder; the members of its other four hulls; its office, where the share was signed. A pool of regulars by `cast.md`'s rule, written with Ceres's regulars (#1212).
- **The rocks and freeholds** the co-op supplies: their people as regulars by place, met again on every run there.
- **Passing:** the dock crews, the rocks' people, the war's crews; any of them promotable.

### What carries over from chapter 1, by person

| From chapter 1 | In chapter 2 |
|---|---|
| The pair and the first officer | aboard, if they came at Ceres (`chapter-1.md`, the signing) and are alive; opinion as it stands (above) |
| One who died | on the memorial; their seat filled from the draw |
| One who stayed with the captain | away: heard of, met in port, possibly returning |
| The captain | away: her ship goes on without the hand, and she can be heard of or met |
| The arcs' contacts (Wen Haraldsen, Odile Marchetti, Hob Strand, Mirela Sandoval) | recurring, tagged to their power, shaped by the chapter 1 marks |
| Port regulars and the dock officials | regulars by place, as they were |
| The family | the hand's own thread, as it was |

## Assumptions to confirm

- Chapter two has two halves: paying the share down, then the lender's squeeze as an owners' war rumbles; the war breaks out in chapter three.
- The view is the co-op's: the player is the Ore Runner's captain and flies, trades and fights her, and the big decisions go to the members' vote, which can overrule the player.
- The hand holds the bridge on the master's endorsement of the registry Hester's ship sails under, voted by the members; the lender accepts the registry in place of an approved master.
- The four masters of the lender's pool are met in the war, each leaning to a side, and none is aboard.
- Who is aboard is drawn: chapter 1's pair and the first officer if they came, new members at Ceres from the main characters not yet met, a hired pilot, and the rest met in the war; the usual narrow run is the hand, Tomas, Cato, Bexa and Pax, with Ines as the hired pilot, and her membership or licence a vote mid-chapter.
- The Ore Runner's refit adds a bunk for the pilot, so six are aboard.
- The main characters not aboard come in through the war (in the usual narrow run Yelena and Ruben), as people to meet and possibly recruit; every run meets all six by the chapter's end.
- The chapter ends in one vote on the lender's offer, with three outcomes: hold, charter or sell.
- The meeting: one member one vote, more than half carries, a tie fails; a member weighs their want first, then the hand, their bonds and their nature; three losses on their want and a member leaves.
- Hester's ship is not part of the chapter.
- Opinion carries over as it stands: goodwill fades to friend without upkeep, grudges stay until mended.
- Each of the six main characters has a full arc as a new member and a short one carried from chapter 1; the first officers have short ones. The draw at Ceres keeps the meeting open, at least one member leaning each way.
- Bexa's and Pax's Ceres homes (the station, the Warren) stand; Yelena's home is a hub dome and Ruben's an outer dome at the edge (`mars.md` names no domes; their sheets say so).
