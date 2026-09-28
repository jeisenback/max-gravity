'use strict';

// DOM panels shown while landed on a planet, plus the game-over screen.
// Loaded before game.js; only calls into it at runtime.

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

  showEvent(ev, choices) {
    this.el.innerHTML = `
      <div class="event-body">
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
        <h1>Ship Destroyed</h1>
        <p>Your ${ship().name} breaks apart in a silent bloom of fire. The insurance company is not returning your calls.</p>
        <button data-action="load" class="primary">Load last save</button>
        <button data-action="newgame" data-arg="force">New game</button>
      </div>`;
    this.el.classList.remove('hidden', 'event');
  },

  render() {
    const st = G.state, p = this.planet, sys = system(), s = ship();
    const tabs = [
      ['port', 'Spaceport', true],
      ['trade', 'Commodity Exchange', p.services.includes('trade')],
      ['missions', 'Mission BBS', p.services.includes('missions')],
      ['shipyard', 'Shipyard', p.services.includes('shipyard')],
      ['crew', 'Crew', true],
    ];
    this.el.innerHTML = `
      <div class="hdr">
        <div>
          <h1>${p.name}</h1>
          <div class="sub" style="color:${GOV_COLORS[sys.gov]}">${sys.name} &middot; ${sys.gov}</div>
        </div>
        <div class="stats">
          Day ${st.day} &middot; ${s.name}<br>
          <b>${fmt(st.credits)} cr</b><br>
          Cargo ${cargoUsed()}/${s.cargo}t &middot; Berths ${berthsUsed()}/${s.berths} &middot; Mass ${st.fuel}/${s.fuel}
        </div>
      </div>
      <div class="tabs">
        ${tabs.map(([id, label, ok]) => `<button data-action="tab" data-arg="${id}" class="${this.tab === id ? 'active' : ''}" ${ok ? '' : 'disabled'}>${label}</button>`).join('')}
        <span class="spacer"></span>
        <button data-action="map">System Map</button>
        <button data-action="takeoff" class="primary">Take Off (T)</button>
      </div>
      <div class="body">${this.views[this.tab].call(this)}</div>`;
  },

  views: {
    port() {
      const st = G.state, s = ship(), p = this.planet;
      const fuelNeed = s.fuel - st.fuel, armorNeed = s.armor - st.armor;
      const canService = p.services.includes('refuel');
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
        <h3>Market news</h3>
        ${st.rumors.length ? st.rumors.map(r => `<div class="hint">${r.text} Until day ${r.until}.</div>`).join('') : '<p class="hint">Nothing new. Listen to the comms in transit.</p>'}
        <div class="foot"><button class="link" data-action="newgame">Start a new game</button></div>`;
    },

    trade() {
      const st = G.state, p = this.planet;
      const rows = COMMODITIES.map(c => {
        const pr = price(p, c.id), held = st.cargo[c.id] || 0;
        const tag = { L: 'low', M: 'med', H: 'high' }[p.prices[c.id]] || '';
        const best = bestSale(p, c.id);
        const avg = held ? Math.round(st.paid[c.id] / held) : 0;
        return `<tr>
          <td>${c.name}</td>
          <td class="num">${pr === null ? '--' : fmt(pr)} <span class="tag ${tag}">${tag}</span></td>
          <td class="num">${held}${held ? ` <span class="hint">@${fmt(avg)}</span>` : ''}</td>
          <td>${best ? `${best.planet.name} <span class="tag low">+${fmt(best.profit)}/t</span> <span class="hint">${best.days ? `${best.days}d` : 'local'}</span>` : '<span class="hint">--</span>'}</td>
          <td class="act">
            <button data-action="buy" data-arg="${c.id}" ${pr === null ? 'disabled' : ''}>Buy 1</button>
            <button data-action="buymax" data-arg="${c.id}" ${pr === null ? 'disabled' : ''}>Max</button>
            <button data-action="sell" data-arg="${c.id}" ${pr === null || !held ? 'disabled' : ''}>Sell 1</button>
            <button data-action="sellall" data-arg="${c.id}" ${pr === null || !held ? 'disabled' : ''}>All</button>
          </td>
        </tr>`;
      }).join('');
      return `
        ${this.tradeNote ? `<div class="note">${this.tradeNote}</div>` : ''}
        <table>
          <tr><th>Commodity</th><th class="num">Price/t</th><th class="num">Held</th><th>Best market (in range)</th><th></th></tr>
          ${rows}
        </table>
        <p class="hint">Free cargo space: ${cargoFree()}t. Best market is based on today's prices, which drift a little each day.</p>`;
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
      const mine = st.crew.map((id, i) => {
        const c = CREW[id];
        return `<div class="mission">
          <div><b>${c.name}</b> &middot; ${c.role}<div class="hint">${c.perk} Wage ${fmt(wage(id))} cr/day.</div></div>
          <button data-action="dismiss" data-arg="${i}">Dismiss</button>
        </div>`;
      }).join('');
      const forHire = Object.entries(CREW).filter(([id, c]) => c.home === here && !st.crew.includes(id)).map(([id, c]) => {
        const ok = berthsFree() > 0 && st.credits >= c.fee;
        return `<div class="mission">
          <div><b>${c.name}</b> &middot; ${c.role}<div class="hint">${c.bio}</div><div class="hint">${c.perk} Wage ${fmt(c.wage)} cr/day.</div></div>
          <button data-action="hire" data-arg="${id}" ${ok ? '' : 'disabled'}>Hire (${fmt(c.fee)} cr)</button>
        </div>`;
      }).join('');
      const elsewhere = Object.values(CREW).filter(c => c.home !== here).map(c => `${c.name} (${c.role}) at ${c.home}`);
      return `
        <h3>Your crew</h3>
        ${mine || '<p class="hint">Just you. Crew take a berth each and are paid daily wages in transit.</p>'}
        <p class="hint">Berths: ${berthsUsed()}/${ship().berths} used by crew and passengers.</p>
        <h3>Looking for work here</h3>
        ${forHire || '<p class="hint">Nobody in the bar is looking for a ship right now.</p>'}
        <h3>Word around the system</h3>
        <p class="hint">Spacers worth knowing: ${elsewhere.join('; ')}.</p>`;
    },

    shipyard() {
      const st = G.state, tradeIn = Math.round(ship().price * 0.6);
      const rows = Object.entries(SHIPS).filter(([, s]) => s.forSale).map(([id, s]) => {
        const cost = s.price - tradeIn, owned = id === st.shipId;
        const ok = !owned && st.credits >= cost && cargoUsed() <= s.cargo && berthsUsed() <= s.berths;
        return `<tr>
          <td><b>${s.name}</b><div class="hint">${s.desc}</div></td>
          <td class="num">${s.cargo}t</td>
          <td class="num">${s.berths}</td>
          <td class="num">${s.shields}/${s.armor}</td>
          <td class="num">${s.fuel}</td>
          <td class="num">${s.maxSpeed}</td>
          <td class="num">${s.guns}</td>
          <td class="num">${fmt(s.price)}</td>
          <td class="act">${owned ? '<i>Owned</i>' : `<button data-action="buyship" data-arg="${id}" ${ok ? '' : 'disabled'}>Buy (${fmt(cost)})</button>`}</td>
        </tr>`;
      }).join('');
      return `
        <table>
          <tr><th>Ship</th><th class="num">Cargo</th><th class="num">Berths</th><th class="num">Shd/Arm</th><th class="num">Mass</th><th class="num">Speed</th><th class="num">Guns</th><th class="num">Price</th><th></th></tr>
          ${rows}
        </table>
        <p class="hint">Your ${ship().name} is worth ${fmt(tradeIn)} cr as a trade-in.</p>`;
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
        <div><b>${m.title}</b><div class="hint">${where} &middot; pays ${fmt(m.pay)} cr &middot; due by day ${m.deadline}${need}</div></div>
        <button data-action="${action}" data-arg="${i}" ${blocked ? `disabled title="Not enough ${noCargo ? 'cargo space' : 'berths'}"` : ''}>${label}</button>
      </div>`;
    }).join('');
  },

  act(action, arg) {
    const st = G.state, p = this.planet, s = ship();
    switch (action) {
      case 'tab': this.tab = arg; this.tradeNote = null; break;
      case 'choose': this.showEventResult(G.transit.event.title, chooseEvent(Number(arg))); return;
      case 'continue': finishEvent(); return;
      case 'takeoff': takeOff(); return;
      case 'map': openMap(); return;
      case 'load': loadGame(); return;
      case 'newgame':
        if (arg === 'force' || confirm('Start a new game? Your current progress will be lost.')) newGame();
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
        const pr = price(p, arg);
        const max = Math.min(cargoFree(), Math.floor(st.credits / pr));
        const qty = action === 'buy' ? Math.min(1, max) : max;
        st.cargo[arg] = (st.cargo[arg] || 0) + qty;
        st.paid[arg] = (st.paid[arg] || 0) + qty * pr;
        st.credits -= qty * pr;
        this.tradeNote = null;
        break;
      }
      case 'sell':
      case 'sellall': {
        const held = st.cargo[arg], qty = action === 'sell' ? 1 : held;
        const income = qty * price(p, arg), cost = (st.paid[arg] || 0) * qty / held;
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
        st.missions.push(m);
        break;
      }
      case 'hire':
        st.credits -= CREW[arg].fee;
        st.crew.push(arg);
        break;
      case 'dismiss':
        st.crew.splice(Number(arg), 1);
        break;
      case 'abort':
        st.missions.splice(Number(arg), 1);
        break;
      case 'buyship': {
        const cost = SHIPS[arg].price - Math.round(s.price * 0.6);
        st.credits -= cost;
        st.shipId = arg;
        st.fuel = SHIPS[arg].fuel;
        st.armor = SHIPS[arg].armor;
        break;
      }
    }
    save();
    this.render();
  },
};

UI.el.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && !b.disabled) UI.act(b.dataset.action, b.dataset.arg);
});
