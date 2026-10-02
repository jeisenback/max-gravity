'use strict';

// DOM panels shown while landed on a planet, plus the game-over screen.
// Loaded before game.js; only calls into it at runtime.

// Shared helpers (loaded first, so every later script can use them): esc makes text safe
// to show as HTML; store is localStorage that never throws (a blocked browser just
// forgets, and the game runs on).
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },  // false: storage blocked, session only
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
};

// Names the player types (captain, ship, outpost, heir) are shown as HTML, so
// they lose the characters that could make markup. Imported saves lose < and >
// in every string (Saves.import in menu.js).
const cleanName = s => String(s || '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
const stripTags = v => (typeof v === 'string' ? v.replace(/[<>]/g, '')
  : Array.isArray(v) ? v.map(stripTags)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stripTags(x)])) : v);

const UI = {
  el: document.getElementById('panel'),
  tab: 'port',
  planet: null,
  notes: [],

  openLanded(planet, notes) {
    this.planet = planet;
    this.notes = notes || [];
    this.tab = 'port';
    this.tradeNote = null;
    this.show();
  },

  show() {
    this.render();
    this.el.classList.remove('hidden', 'event');
  },

  // Accent color for the panel: the local faction's, or a neutral blue.
  setAccent(color) {
    this.el.style.setProperty('--accent', color || '#6fb0ff');
  },

  showEvent(ev, choices) {
    const where = G.mode === 'hail' ? 'Comms channel' : G.mode === 'transit' ? 'In transit' : G.state.planet;
    this.setAccent(G.mode === 'hail' ? '#6fb0ff' : G.mode === 'transit' ? '#9fb4ff' : GOV_COLORS[system().gov]);
    this.el.innerHTML = `
      <div class="event-body" role="dialog" aria-label="${ev.title}">
        <div class="eyebrow">${ev.via ? `${VIA_LABELS[ev.via]} &middot; ` : ''}${where}</div>
        <h1>${ev.title}</h1>
        <p>${ev.text}</p>
        <div class="choices">
          ${choices.map((c, i) => `<button data-action="choose" data-arg="${i}" ${c.can && !c.can() ? 'disabled' : ''}>${c.label}</button>`).join('')}
        </div>
      </div>`;
    this.el.classList.remove('hidden');
    this.el.classList.add('event');
  },

  showEventResult(title, text) {
    this.el.innerHTML = `
      <div class="event-body">
        <div class="eyebrow">${G.mode === 'hail' ? 'Comms channel' : G.mode === 'transit' ? 'In transit' : G.state.planet}</div>
        <h1>${title}</h1>
        <p>${text}</p>
        <div class="choices"><button data-action="continue" class="primary">Continue</button></div>
      </div>`;
  },

  hide() {
    this.el.classList.add('hidden');
  },

  showDead() {
    this.el.innerHTML = `
      <div class="dead">
        <div class="eyebrow">Transponder lost</div>
        <h1>Ship Destroyed</h1>
        <p>Captain ${captain().name}'s ${ship().name} breaks apart in a silent bloom of fire. The insurance company is not returning your calls.</p>
        <p class="hint">Your heir inherits the company, its ships, stakes, and outpost, and half of everything else.</p>
        <button data-action="heir" class="primary">Go on as your heir</button>
        <button data-action="load">Load last save</button>
        <button data-action="newgame" data-arg="force">New game</button>
      </div>`;
    this.el.classList.remove('hidden', 'event');
  },

  render() {
    const st = G.state, p = this.planet, sys = system(), s = ship();
    this.setAccent(GOV_COLORS[sys.gov]);
    this.el.innerHTML = `
      <div class="hdr">
        <div>
          <div class="eyebrow">Docked &middot; ${sys.name}</div>
          <h1>${p.name}</h1>
          <div class="sub" style="color:${GOV_COLORS[sys.gov]}">${sys.gov}</div>
        </div>
        <div class="stats">
          ${dateOf()} &middot; ${shipTitle()}, ${s.name}${hired() ? ` &middot; Capt. ${esc(hiredCaptain().first)} ${esc(hiredCaptain().last)}` : ''}<br>
          <b>${fmt(st.credits)} cr</b><br>
          Cargo ${cargoUsed()}/${s.cargo}t &middot; Berths ${berthsUsed()}/${s.berths} &middot; Mass ${st.fuel}/${s.fuel}
        </div>
      </div>
      <canvas id="vs" class="vs" aria-hidden="true"></canvas>
      ${bridgeKeys(p, this.tab)}
      ${Mods.filter('portBanner', '')}
      <div class="body">${this.views[this.tab].call(this)}</div>
      <div class="dock">
        ${Mods.filter('dockButtons', '')}
        <button data-action="map">System map</button>
        ${hired() ? `<button data-action="sail" class="primary">Sail with the captain${Touch.on ? '' : ' (T)'}</button>` : `<button data-action="takeoff" class="primary">Take off${Touch.on ? '' : ' (T)'}</button>`}
      </div>`;
  },

  conditionList(list, none) {
    if (!list.length) return none ? `<p class="hint">${none}</p>` : '';
    return list.map(c => `<div class="cond ${c.bad ? 'bad' : 'good'}">${c.text}</div>`).join('');
  },

  views: {
    company: () => companyView(),

    port() {
      const st = G.state, s = ship(), p = this.planet;
      const fuelNeed = s.fuel - st.fuel, armorNeed = s.armor - st.armor;
      const canService = p.services.includes('refuel') && !hired();  // a hired ship is topped up by the captain
      return `
        <p class="desc">${p.desc}</p>
        ${this.notes.map(n => `<div class="note">${n}</div>`).join('')}
        ${canService ? `
        <div class="row">
          <button data-action="refuel" ${fuelNeed > 0 ? '' : 'disabled'}>Refill reaction mass (${fmt(fuelNeed * FUEL_PRICE)} cr)</button>
          <button data-action="repair" ${armorNeed > 0 ? '' : 'disabled'}>Repair hull (${fmt(armorNeed * REPAIR_PRICE)} cr)</button>
        </div>` : ''}
        <h3>Active missions</h3>
        ${this.missionList(st.missions, 'abort', 'Abandon')}
        ${story().stage !== 0 ? `<h3>Story: Cold Water</h3><p class="desc">${storyObjective()}</p>${story().stage === 'end' ? '<div class="row"><button data-action="epilogue">Read the epilogue</button></div>' : ''}` : ''}
        ${journalHtml()}
        ${hired() || scopeOff('owner') ? '' : stakeOffer()}
        <h3>Standing</h3>
        <div class="standing">${FACTIONS.map(g => `<div><span style="color:${GOV_COLORS[g]}">${g === 'Pirate' ? 'Pirates' : g}</span> <b>${standingWord(repOf(g))}</b> <span class="hint">${repOf(g) > 0 ? '+' : ''}${repOf(g)}</span></div>`).join('')}</div>
        <h3>Local conditions</h3>
        ${this.conditionList(conditions(st.systemId), 'Nothing unusual. Trade is flowing normally.')}
        <h3>On the feeds</h3>
        ${feedHeadlines().map(l => `<div class="hint">${l}</div>`).join('')}
        <h3>News</h3>
        ${this.conditionList(Object.keys(SYSTEMS).filter(id => id !== st.systemId).flatMap(conditions)
          .filter((c, i, all) => all.findIndex(d => d.text === c.text) === i && !conditions(st.systemId).some(d => d.text === c.text)), '')}
        ${(st.news || []).map(n => `<div class="hint">${dateOf(n.day)}: ${n.text}</div>`).join('')}
        ${st.rumors.map(r => `<div class="hint">${r.text} Until ${dateOf(r.until)}.</div>`).join('')}
        ${!(st.news || []).length && !st.rumors.length ? '<p class="hint">Listen to the comms in transit for more.</p>' : ''}
        ${othersNewsHtml()}
        ${scopeOff('community') ? '' : communityHtml()}
        <p class="hint">New games, saves, and settings are in the Menu (below, or Esc in flight).</p>`;
    },

    trade() {
      const st = G.state, p = this.planet;
      const rows = COMMODITIES.map(c => {
        const pr = price(p, c.id), held = st.cargo[c.id] || 0;
        const tag = { L: 'low', M: 'med', H: 'high' }[p.prices[c.id]] || '';
        const best = bestSale(p, c.id);
        const avg = held ? Math.round((st.paid[c.id] || 0) / held) : 0;
        const mp = pr === null ? 0 : Math.round(pressure(p, c.id) * 100);
        const moved = Math.abs(mp) >= 3 ? ` <span class="hint">${mp > 0 ? `scarce +${mp}%` : `surplus ${mp}%`}</span>` : '';
        const off = pr === null ? 'disabled' : '', none = pr === null || !held ? 'disabled' : '';
        return `<div class="trow">
          <div class="tname">${c.name}</div>
          <div class="tprice">${pr === null ? '--' : `${fmt(pr)}<span class="mlabel"> cr/t</span>`} <span class="tag ${tag}">${tag}</span>${moved}</div>
          <div class="theld"><span class="mlabel">Held </span>${held}${held ? ` <span class="hint">@${fmt(avg)}</span>` : ''}</div>
          <div class="tbest">${best ? `<span class="mlabel">Sell at </span>${best.planet.name} <span class="tag low">+${fmt(best.profit)}/t</span> <span class="hint">${best.days ? `${best.days}d` : 'local'}</span>` : '<span class="hint">--</span>'}</div>
          <div class="tact">
            <button data-action="buy" data-arg="${c.id}" ${off}>Buy 1</button>
            <button data-action="buymax" data-arg="${c.id}" ${off}>Max</button>
            <button data-action="sell" data-arg="${c.id}" ${none}>Sell 1</button>
            <button data-action="sellall" data-arg="${c.id}" ${none}>All</button>
          </div>
        </div>`;
      }).join('');
      return `
        ${this.tradeNote ? `<div class="note">${this.tradeNote}</div>` : ''}
        <div class="trow thead"><div class="tname">Commodity</div><div class="tprice">Price/t</div><div class="theld">Held</div><div class="tbest">Best market (in range)</div><div class="tact"></div></div>
        ${rows}
        <p class="hint">Free cargo space: ${cargoFree()}t. Buying raises a market's price and selling lowers it; NPC haulers bring prices back as their deliveries arrive. Best market is based on today's prices.</p>`;
    },

    missions() {
      return `
        <h3>Available work</h3>
        ${this.missionList(G.offers, 'accept', 'Accept')}
        <h3>Active missions</h3>
        ${this.missionList(G.state.missions, 'abort', 'Abandon')}`;
    },

    crew() {
      const st = G.state, here = this.planet.name;
      const traits = c => (c.traits ? ` &middot; ${c.traits.map(t => TRAITS[t].adj).join(', ')}` : '');
      const skill = c => `${ROLE_NAMES[c.role]}, skill ${c.skill}/3`;
      const mine = st.crew.map((id, i) => {
        const c = person(id);
        const mood = CREW[id] ? '' : ` &middot; ${opinionWord(c.opinion)}`;
        return `<div class="mission">
          <div><b>${personLink(c)}</b>${(st.injured || {})[id] ? ' <span class="tag high">injured</span>' : ''} &middot; ${skill(c)}${traits(c)}${mood}
            <div class="hint">${CREW[id] ? c.perk : ROLE_PERKS[c.role](c.skill)} Wage ${fmt(wage(id))} cr/day.</div></div>
          ${hired() ? '' : `<button data-action="dismiss" data-arg="${i}">Dismiss</button>`}
        </div>`;
      }).join('');
      const unique = Object.entries(CREW).filter(([id, c]) => c.home === here && !st.crew.includes(id))
        .map(([id, c]) => ({ c, arg: id, bio: c.bio, perk: c.perk }));
      const locals = G.bar.map((c, i) => ({ c, arg: `bar:${i}`, bio: describe(c).replace(GOALS[c.goal], 'looking for a ship'), perk: ROLE_PERKS[c.role](c.skill) }));
      const forHire = hired() ? '' : [...unique, ...locals].map(({ c, arg, bio, perk }) => {
        const ok = berthsFree() > 0 && st.credits >= c.fee;
        return `<div class="mission">
          <div><b>${fullName(c)}</b> &middot; ${skill(c)}<div class="hint">${bio}</div><div class="hint">${perk} Wage ${fmt(c.wage)} cr/day.</div></div>
          ${arg.startsWith('bar:') ? interviewButton(arg.slice(4)) : ''}<button data-action="hire" data-arg="${arg}" ${ok ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button>
        </div>`;
      }).join('');
      const known = alivePeople().filter(p => p.opinion !== 0 && !st.crew.includes(p.id))
        .sort((a, b) => Math.abs(b.opinion) - Math.abs(a.opinion)).slice(0, 12)
        .map(p => `<div class="hint"><b>${personLink(p)}</b> (${opinionWord(p.opinion)}, ${p.ship ? `captain of the ${p.ship.name}, flies around ${SYSTEMS[p.haunt].name}` : p.location ? `last seen at ${p.location}` : 'whereabouts unknown'})${p.location === here ? ' <b>- here now</b>' : ''}: ${p.memories.length ? p.memories[p.memories.length - 1] : ''}</div>`).join('');
      const elsewhere = Object.values(CREW).filter(c => c.home !== here).map(c => `${c.name} (${ROLE_NAMES[c.role]}) at ${c.home}`);
      return `
        <h3>${hired() ? 'The crew' : 'Your crew'}</h3>
        ${mine || '<p class="hint">Just you. Crew take a berth each and are paid daily wages in transit.</p>'}
        ${hired() ? '' : `<p class="hint">Berths: ${berthsUsed()}/${ship().berths} used by crew and passengers. Unhappy crew will walk off the ship.</p>`}
        ${homeHtml()}
        ${bondsHtml()}
        ${hired() ? '' : `<h3>Looking for work here</h3>
        ${forHire || '<p class="hint">Nobody in the bar is looking for a ship right now.</p>'}`}
        <h3>People you know</h3>
        ${known || '<p class="hint">Nobody yet. Passengers and crew remember how you treated them.</p>'}
        <h3>Legends of the spaceways</h3>
        <p class="hint">${elsewhere.join('; ')}.</p>`;
    },

    shipyard() {
      const st = G.state, p = this.planet, gov = localGov(), standing = repOf(gov);
      const tradeIn = Math.round(SHIPS[st.shipId].price * 0.6);
      const govName = gov === 'Pirate' ? 'the pirates' : `the ${gov}`;
      let html = '';
      if (p.services.includes('shipyard')) {
        const rows = Object.entries(SHIPS).filter(([, s]) => s.forSale).map(([id, s]) => {
          const cost = s.price - tradeIn, owned = id === st.shipId, eff = shipStats(id);
          const locked = s.req && standing < s.req;
          const ok = !owned && !locked && st.credits >= cost && cargoUsed() <= eff.cargo && berthsUsed() <= eff.berths;
          return `<tr>
            <td><b>${s.name}</b><div class="hint">${s.desc}</div>${locked ? `<div class="hint">Needs Trusted standing with ${govName}.</div>` : ''}</td>
            <td class="num">${s.cargo}t</td>
            <td class="num">${s.berths}</td>
            <td class="num">${s.shields}/${s.armor}</td>
            <td class="num">${s.fuel}</td>
            <td class="num">${s.maxSpeed}</td>
            <td class="num">${s.guns}</td>
            <td class="num">${fmt(s.price)}</td>
            <td class="act">${owned ? '<i>Flying it</i>' : `<button data-action="buyship" data-arg="${id}" ${ok ? '' : 'disabled'}>Fly it (${fmt(cost)})</button>`}
              ${scopeOff('owner') ? '' : `<button data-action="cbuy" data-arg="${id}" ${!locked && st.credits >= s.price ? '' : 'disabled'}>For company (${fmt(s.price)})</button>`}</td>
          </tr>`;
        }).join('');
        html += `
          <h3>Ships</h3>
          <div class="scroll"><table>
            <tr><th>Ship</th><th class="num">Cargo</th><th class="num">Berths</th><th class="num">Shd/Arm</th><th class="num">Mass</th><th class="num">Speed</th><th class="num">Guns</th><th class="num">Price</th><th></th></tr>
            ${rows}
          </table></div>
          <p class="hint">Fly it: your ${SHIPS[st.shipId].name} is worth ${fmt(tradeIn)} cr as a trade-in, and your outfits move to the new ship. For company: the ship comes with a captain and runs a trade route for you (Company tab). Hull stats shown without outfits.</p>`;
      }
      if (p.services.includes('outfitter')) {
        const items = Object.entries(OUTFITS).filter(([, o]) => !o.pirate || gov === 'Pirate').map(([id, o]) => {
          const have = st.outfits[id] || 0, locked = o.req && standing < o.req;
          const ok = !locked && have < o.max && st.credits >= o.price && cargoFree() >= o.space;
          return `<div class="mission">
            <div><b>${o.name}</b> <span class="hint">${have}/${o.max} fitted</span>
              <div class="hint">${o.desc} ${o.space ? `Uses ${o.space}t of cargo space.` : ''} ${fmt(o.price)} cr.${locked ? ` Needs Trusted standing with ${govName}.` : ''}</div></div>
            <div class="row" style="margin:0">
              <button data-action="sellout" data-arg="${id}" ${have ? '' : 'disabled'}>Sell (${fmt(o.price / 2)})</button>
              <button data-action="buyout" data-arg="${id}" ${ok ? '' : 'disabled'}>Buy</button>
            </div>
          </div>`;
        }).join('');
        html += `
          <h3>Outfitter</h3>
          ${this.tradeNote ? `<div class="note">${this.tradeNote}</div>` : ''}
          ${items}
          ${torpedoShopHtml()}
          <p class="hint">Free cargo space: ${cargoFree()}t. Outfits sell back for half price.</p>`;
      }
      return html;
    },
  },

  missionList(list, action, label) {
    if (!list.length) return '<p class="hint">None.</p>';
    return list.map((m, i) => {
      const sid = m.destSystem || m.targetSystem;
      const where = sid === G.state.systemId ? 'Local' : `${SYSTEMS[sid].name}, ${travelDays(G.state.systemId, sid)} days away`;
      const noCargo = m.type === 'delivery' && cargoFree() < m.tons, noBerths = m.type === 'passenger' && berthsFree() < m.pax;
      const blocked = action === 'accept' && (noCargo || noBerths);
      const need = m.tons ? ` &middot; ${m.tons}t cargo` : m.pax ? ` &middot; ${m.pax} berth${m.pax > 1 ? 's' : ''}` : '';
      return `<div class="mission">
        <div><b>${m.title}</b>${m.blurb ? `<div class="hint">${m.blurb}</div>` : ''}<div class="hint">${where} &middot; pays ${fmt(m.pay)} cr &middot; due by ${dateOf(m.deadline)}${need}</div></div>
        <button data-action="${action}" data-arg="${i}" ${blocked || m.story ? `disabled title="${m.story ? 'Story passenger' : `Not enough ${noCargo ? 'cargo space' : 'berths'}`}"` : ''}>${label}</button>
      </div>`;
    }).join('');
  },

  act(action, arg) {
    if (hired() && OWNER_ACTIONS.includes(action)) return;  // not yours to do on the captain's ship
    const st = G.state, p = this.planet, s = ship();
    switch (action) {
      case 'tab': this.tab = arg; this.tradeNote = null; break;
      case 'station': this.tab = stationOf(this.tab).id === arg && this.tab !== 'person' ? this.tab : bridgeStation(arg, p); this.tradeNote = null; break;
      case 'choose': this.showEventResult(G.dialog.event.title, chooseEvent(Number(arg))); return;
      case 'continue': finishEvent(); return;
      case 'epilogue': openEvent(epilogueEvent()); return;
      case 'takeoff': takeOff(); return;
      case 'map': openMap(); return;
      case 'load': loadGame(); return;
      case 'newgame':  // from the death screen: the New game page of the title screen
        Menu.showTitle(); Menu.view = 'new'; Menu.render();
        return;
      case 'refuel': {
        const amt = Math.min(s.fuel - st.fuel, Math.floor(st.credits / FUEL_PRICE));
        st.fuel += amt; st.credits -= amt * FUEL_PRICE;
        break;
      }
      case 'repair': {
        const amt = Math.min(s.armor - st.armor, Math.floor(st.credits / REPAIR_PRICE));
        st.armor += amt; st.credits -= amt * REPAIR_PRICE;
        break;
      }
      case 'buy':
      case 'buymax': {
        let qty = action === 'buy' ? 1 : cargoFree();
        while (qty > 0 && tradeTotal(p, arg, qty, 1) > st.credits) qty--;
        qty = Math.min(qty, cargoFree());
        const cost = tradeTotal(p, arg, qty, 1);
        recordTrade(p, arg, qty, 1);
        st.cargo[arg] = (st.cargo[arg] || 0) + qty;
        st.paid[arg] = (st.paid[arg] || 0) + cost;
        st.credits -= cost;
        this.tradeNote = null;
        break;
      }
      case 'sell':
      case 'sellall': {
        const held = st.cargo[arg] || 0, qty = action === 'sell' ? 1 : held;
        if (!held || price(p, arg) === null) break;  // a double tap after the last ton went
        const income = tradeTotal(p, arg, qty, -1), cost = (st.paid[arg] || 0) * qty / held;
        recordTrade(p, arg, qty, -1);
        const profit = income - cost;
        st.cargo[arg] -= qty;
        st.paid[arg] -= cost;
        st.credits += income;
        const name = COMMODITIES.find(c => c.id === arg).name;
        this.tradeNote = `Sold ${qty}t of ${name} for ${fmt(income)} cr (${profit >= 0 ? `profit +${fmt(profit)}` : `loss ${fmt(-profit)}`} cr).`;
        break;
      }
      case 'accept': {
        const m = G.offers.splice(Number(arg), 1)[0];
        m.id = st.nextId++;
        if (m.person) {
          m.pid = registerPerson(m.person).id;
          delete m.person;
        }
        st.missions.push(m);
        break;
      }
      case 'hire': {
        const c = arg.startsWith('bar:') ? registerPerson(G.bar.splice(Number(arg.slice(4)), 1)[0]) : CREW[arg];
        st.credits -= c.fee;
        st.crew.push(c.id || arg);
        break;
      }
      case 'dismiss': {
        const [id] = st.crew.splice(Number(arg), 1);
        if (!CREW[id]) {
          st.people[id].location = p.name;
          like(st.people[id], -1, `You let me go at ${p.name}.`);
        }
        break;
      }
      case 'abort': {
        const [m] = st.missions.splice(Number(arg), 1);
        if (m.pid) {
          st.people[m.pid].location = p.name;
          like(st.people[m.pid], -3, `You dumped me at ${p.name}.`);
        }
        break;
      }
      case 'buyship': {
        const cost = SHIPS[arg].price - Math.round(s.price * 0.6);
        st.credits -= cost;
        st.shipId = arg;
        st.fuel = ship().fuel;
        st.armor = ship().armor;
        break;
      }
      case 'buyout': {
        const armor = ship().armor;
        st.credits -= OUTFITS[arg].price;
        st.outfits[arg] = (st.outfits[arg] || 0) + 1;
        st.armor += ship().armor - armor;  // new plating arrives intact
        this.tradeNote = `Fitted: ${OUTFITS[arg].name}.`;
        break;
      }
      case 'sellout': {
        st.outfits[arg] -= 1;
        const s2 = ship();
        if (cargoUsed() > s2.cargo || berthsUsed() > s2.berths) {
          st.outfits[arg] += 1;
          this.tradeNote = `Cannot remove the ${OUTFITS[arg].name}: clear some cargo or berths first.`;
          break;
        }
        st.credits += OUTFITS[arg].price / 2;
        st.armor = Math.min(st.armor, s2.armor);
        st.fuel = Math.min(st.fuel, s2.fuel);
        this.tradeNote = `Removed: ${OUTFITS[arg].name}.`;
        break;
      }
    }
    save();
    this.render();
  },
};

UI.el.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && !b.disabled) {
    Mods.emit('uiClick', b.dataset.action, b.dataset.arg);
    if (Mods.act(b.dataset.action, b.dataset.arg)) { save(); if (G.mode === 'landed' && !G.dialog && !G.paused) UI.render(); } else UI.act(b.dataset.action, b.dataset.arg);
  }
});

// The panel is rebuilt with innerHTML, which drops keyboard focus to the page. Put it
// back on the button that was used (or the nearest useful one) so Tab and Enter keep
// working. Not while flying: Space fires the guns and would press a focused button.
{
  let last = null;
  UI.el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) last = { at: performance.now(), action: b.dataset.action, arg: b.dataset.arg, id: b.id };
  }, true);
  new MutationObserver(() => {
    const a = document.activeElement;
    if (!last || performance.now() - last.at > 300 || (a && a !== document.body)) return;
    if (!G.paused && ['flight', 'departing'].includes(G.mode)) return;
    const buttons = [...UI.el.querySelectorAll('button:not(:disabled)')];
    const same = buttons.find(b => (last.id && b.id === last.id) || (last.action && b.dataset.action === last.action && b.dataset.arg === last.arg));
    const target = same || UI.el.querySelector('.tabs button.active') || buttons[0];
    if (target) target.focus({ preventScroll: true });
  }).observe(UI.el, { childList: true });
}
