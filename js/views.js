/* ============================================================
   views.js — every screen (JT.views.<name>.render(container))
   Uses helpers from app.js (modal/toast/formModal/confirm).
   ============================================================ */
window.JT = window.JT || {};
JT.views = JT.views || {};
(function () {
  const u = JT.util, el = u.el, D = JT.data;
  const S = () => JT.store.state;
  const app = () => JT.app;

  // in-memory UI state (filters, open panels) — survives re-renders
  const ui = {
    listType: 'all', listCity: 'all', listStatus: 'all', listQ: '',
    evtCat: 'all', evtStatus: 'all', evtQ: '',
    logTab: 'flights', discCity: 'all', discType: 'all'
  };
  const expanded = new Set(); // item ids with comments open

  /* ---------------- shared bits ---------------- */
  function who(name) { return name || S().settings.userName || 'You'; }
  function names() {
    const a = S().settings.userName || 'You';
    const b = S().settings.partnerName || 'Friend';
    return { a, b };
  }
  function head(title, sub, actions) {
    return el('div.view-head', {}, [
      el('div.titles', {}, [el('h1', { text: title }), sub ? el('p', { text: sub }) : null]),
      actions ? el('div.actions', {}, actions) : null
    ]);
  }
  function chip(text, cls) { return el('span.chip' + (cls ? '.' + cls : ''), { text }); }
  function empty(icon, text, cta) {
    return el('div.empty', {}, [el('span.ico', { text: icon }), el('div', { text }), cta ? el('div', { style: 'margin-top:12px' }, cta) : null]);
  }
  function linkify(text) {
    const span = el('span');
    String(text).split(/(\s+)/).forEach(tok => {
      if (u.isUrl(tok)) span.appendChild(el('a', { href: tok, target: '_blank', rel: 'noopener', text: u.domainOf(tok) || tok }));
      else span.appendChild(document.createTextNode(tok));
    });
    return span;
  }
  function tagsRow(tags) {
    if (!tags || !tags.length) return null;
    return el('div.tags', {}, tags.map(t => chip('#' + t, 'tag')));
  }
  function addedBy(item) {
    const bits = [];
    if (item.addedBy) bits.push('added by ' + item.addedBy);
    if (item.updatedAt) bits.push(u.relTime(item.updatedAt));
    return bits.length ? el('span.added-by', { text: bits.join(' · ') }) : null;
  }

  // votes + comments footer for any collection item
  function collabBar(path, item) {
    const votes = item.votes || {};
    const me = S().settings.userName || 'me';
    const up = Object.values(votes).filter(v => v === 'up').length;
    const down = Object.values(votes).filter(v => v === 'down').length;
    const cN = (item.comments || []).length;
    const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
    const row = el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, [
      el('div.votes', {}, [
        el('button.vote-btn' + (votes[me] === 'up' ? '.on-up' : ''), { onclick: () => JT.store.vote(path, item.id, 'up'), title: 'Want to do this' }, '👍 ' + (up || '')),
        el('button.vote-btn' + (votes[me] === 'down' ? '.on-down' : ''), { onclick: () => JT.store.vote(path, item.id, 'down'), title: 'Not keen' }, '👎 ' + (down || ''))
      ]),
      el('button.vote-btn', { onclick: () => { expanded.has(item.id) ? expanded.delete(item.id) : expanded.add(item.id); app().render(); } }, '💬 ' + (cN || 'comment')),
      addedBy(item)
    ]);
    wrap.appendChild(row);
    if (expanded.has(item.id)) {
      const box = el('div.comments');
      (item.comments || []).forEach(c => box.appendChild(
        el('div.comment', {}, [el('span.who', { text: c.by + ': ' }), linkify(c.text), ' ', el('span.when', { text: u.relTime(c.at) })])
      ));
      const input = el('input', { placeholder: 'Write a comment…', onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) { JT.store.addComment(path, item.id, input.value.trim()); } } });
      box.appendChild(el('div', { style: 'display:flex;gap:6px' }, [input, el('button.btn.sm', { onclick: () => { if (input.value.trim()) JT.store.addComment(path, item.id, input.value.trim()); } }, 'Send')]));
      wrap.appendChild(box);
    }
    return wrap;
  }

  function iconBtn(icon, title, fn) { return el('button.icon-btn', { title, onclick: fn }, icon); }
  function homeApprox(jpy) {
    const r = S().settings.jpyRate || 0;
    if (!r || !jpy) return '';
    return ' (' + u.money(jpy / r, S().settings.homeCurrency) + ')';
  }

  /* ====================================================================
     DASHBOARD
     ==================================================================== */
  JT.views.dashboard = {
    render(c) {
      const s = S();
      c.appendChild(head('Dashboard', s.meta.tripName, [
        el('button.btn.sm', { onclick: () => app().navigate('settings') }, '⚙️ Trip settings')
      ]));

      // hero countdown
      const cd = u.countdownLabel(s.meta.startDate);
      c.appendChild(el('div.countdown-hero', {}, [
        el('div', {}, [
          el('div.muted', { text: 'Trip starts ' + (s.meta.startDate ? u.fmtDateLong(s.meta.startDate) : '— set a date') }),
          el('div.big', { html: cd.n === 'today' ? 'Today! 🎉' : (typeof cd.n === 'number' ? cd.n + ' <small style="font-size:1rem">' + cd.unit + ' to go</small>' : '—') }),
          s.meta.endDate ? el('small', { text: 'Through ' + u.fmtDate(s.meta.endDate, { month: 'long', day: 'numeric' }) + ' · ' + u.dateRange(s.meta.startDate, s.meta.endDate).length + ' days' }) : null
        ]),
        el('div', { style: 'font-size:54px' }, '🗻')
      ]));

      // Lunar New Year overlap warning
      const lny = u.daysUntil('2027-02-06');
      if (inTrip('2027-02-06')) c.appendChild(el('div.warnbox', { style: 'margin-bottom:18px' }, '⚠️ Your dates overlap Lunar New Year (Feb 6, 2027) — peak crowds & prices, especially in Hokkaido. The ~Feb 12–22 window avoids the worst.'));

      // stat row
      const tbd = s.events.filter(e => e.dateStatus === 'tbd' || e.watch).length;
      const ticketsToBuy = s.events.filter(e => e.ticketStatus && e.ticketStatus !== 'na' && e.ticketStatus !== 'Have tickets' && e.priority === 'must').length;
      c.appendChild(el('div.stat-row', {}, [
        stat(s.events.length, 'Events tracked', 'events'),
        stat(tbd, 'On watch / TBD', 'events'),
        stat(s.places.length, 'Saved places', 'lists'),
        stat(s.itinerary.filter(x => x.date).length, 'Itinerary slots', 'itinerary'),
        stat(openTasks(), 'Open to-dos', 'logistics')
      ]));

      const grid = el('div.grid.cols-2');

      // Upcoming deadlines
      const dlCard = el('div.card.pad-lg');
      dlCard.appendChild(el('div.card-h', {}, [el('h3', { text: '⏳ Upcoming deadlines' }), el('button.btn.sm.ghost', { onclick: () => app().navigate('logistics') }, 'Checklist →')]));
      const deadlines = collectDeadlines().slice(0, 8);
      if (!deadlines.length) dlCard.appendChild(el('p.muted', { text: 'No upcoming deadlines.' }));
      deadlines.forEach(d => {
        const cd2 = u.countdownLabel(d.date);
        dlCard.appendChild(el('div.deadline', {}, [
          el('div.cd' + (cd2.cls ? ' ' + cd2.cls : ''), { style: cd2.cls === 'warn' ? 'color:var(--warn)' : (cd2.cls === 'past' ? 'color:var(--text-faint)' : ''), html: (typeof cd2.n === 'number' ? '<strong>' + cd2.n + '</strong>' : cd2.n) + '<small>' + (cd2.unit || u.fmtDate(d.date)) + '</small>' }),
          el('div.body', {}, [el('div.t', { text: d.title }), el('div.d', { text: (d.detail || '') })]),
          d.kindIcon ? el('span', { text: d.kindIcon, style: 'font-size:18px' }) : null
        ]));
      });
      grid.appendChild(dlCard);

      // Watchlist (events to keep an eye on)
      const wlCard = el('div.card.pad-lg');
      wlCard.appendChild(el('div.card-h', {}, [el('h3', { text: '👀 Waiting on announcements' }), el('button.btn.sm.ghost', { onclick: () => app().navigate('events') }, 'Events →')]));
      const watch = s.events.filter(e => e.dateStatus === 'tbd' || e.watch);
      if (!watch.length) wlCard.appendChild(el('p.muted', { text: 'Nothing on the watchlist yet.' }));
      watch.slice(0, 8).forEach(e => {
        wlCard.appendChild(el('div.deadline', {}, [
          el('div', { style: 'font-size:20px;min-width:28px;text-align:center' }, catIcon(e.category)),
          el('div.body', {}, [
            el('div.t', { text: e.title }),
            el('div.d', { text: (e.dateStatus === 'tbd' ? 'Date TBD' : dateText(e)) + (e.city ? ' · ' + e.city : '') })
          ]),
          e.priority === 'must' ? chip('must', 'accent') : null
        ]));
      });
      grid.appendChild(wlCard);

      c.appendChild(grid);

      // Next up in itinerary
      const next = s.itinerary.filter(x => x.date && u.daysUntil(x.date) >= 0).sort(u.by('date'));
      if (next.length) {
        const nc = el('div.card.pad-lg', { style: 'margin-top:14px' });
        nc.appendChild(el('div.card-h', {}, [el('h3', { text: '🗓️ Next up' }), el('button.btn.sm.ghost', { onclick: () => app().navigate('itinerary') }, 'Itinerary →')]));
        next.slice(0, 5).forEach(slot => nc.appendChild(el('div.deadline', {}, [
          el('div.cd', { html: '<strong>' + u.fmtDate(slot.date, { month: 'short', day: 'numeric' }) + '</strong><small>' + u.dowShort(slot.date) + '</small>' }),
          el('div.body', {}, [el('div.t', { text: (slot.time ? slot.time + ' · ' : '') + slot.title })])
        ])));
        c.appendChild(nc);
      }
    }
  };
  function stat(n, label, nav) { return el('div.stat', { style: 'cursor:pointer', onclick: () => app().navigate(nav) }, [el('div.n', { text: n }), el('div.l', { text: label })]); }
  function openTasks() { const l = S().logistics; return l.checklist.filter(x => !x.done).length + l.packing.filter(x => !x.done).length + S().deadlines.filter(d => !d.done).length; }
  function inTrip(date) { const a = S().meta.startDate, b = S().meta.endDate; if (!a || !b) return false; return date >= a && date <= b; }

  // merge explicit deadlines + event ticket deadlines, future first
  function collectDeadlines() {
    const out = [];
    S().deadlines.filter(d => !d.done && d.date).forEach(d => out.push({ date: d.date, title: d.title, detail: d.detail, kindIcon: kindIcon(d.kind) }));
    S().events.forEach(e => {
      if (e.lotteryClose) out.push({ date: e.lotteryClose, title: 'Lottery closes: ' + e.title, detail: 'Enter before this date.', kindIcon: '🎫' });
      if (e.resultDate) out.push({ date: e.resultDate, title: 'Lottery results: ' + e.title, detail: '', kindIcon: '🎫' });
      if (e.paymentDeadline) out.push({ date: e.paymentDeadline, title: 'PAY by: ' + e.title, detail: 'Forfeit if you miss the payment window.', kindIcon: '💳' });
      if (e.dateStatus === 'confirmed' && e.dateStart) out.push({ date: e.dateStart, title: e.title, detail: e.venue || e.city || '', kindIcon: catIcon(e.category) });
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return out.filter(d => u.parseDate(d.date) >= today).sort(u.by('date'));
  }
  function kindIcon(k) { return ({ booking: '🏨', tickets: '🎫', transport: '🚄', warning: '⚠️', info: 'ℹ️' })[k] || '📌'; }
  function catIcon(c) { return ({ festival: '🎎', concert: '🎤', 'anime/idol': '🌸', 'gaming/esports': '🎮', sports: '🥋', other: '⭐' })[c] || '⭐'; }
  function dateText(e) { if (!e.dateStart) return 'Date TBD'; if (e.dateEnd && e.dateEnd !== e.dateStart) return u.fmtDate(e.dateStart) + ' – ' + u.fmtDate(e.dateEnd); return u.fmtDateLong(e.dateStart); }

  /* ====================================================================
     EVENTS  (the headline feature)
     ==================================================================== */
  JT.views.events = {
    render(c) {
      c.appendChild(head('Events & Tickets', 'Track events whose dates you\'re waiting on — and walk Japan\'s lottery → purchase pipeline.', [
        el('button.btn.primary', { onclick: () => editEvent(null) }, '＋ Add event')
      ]));

      // toolbar
      const tb = el('div.toolbar');
      tb.appendChild(filterSel(['all', ...D.EVENT_CATEGORIES], ui.evtCat, v => { ui.evtCat = v; app().render(); }, 'Category'));
      tb.appendChild(filterSel(['all', 'tbd', 'window', 'confirmed'], ui.evtStatus, v => { ui.evtStatus = v; app().render(); }, 'Date status'));
      const search = el('input.search', { placeholder: '🔍 Search events…', value: ui.evtQ, oninput: (e) => { ui.evtQ = e.target.value; renderList(); } });
      tb.appendChild(search);
      c.appendChild(tb);

      const listWrap = el('div');
      c.appendChild(listWrap);
      renderList();

      function renderList() {
        u.clear(listWrap);
        let evs = S().events.slice();
        if (ui.evtCat !== 'all') evs = evs.filter(e => e.category === ui.evtCat);
        if (ui.evtStatus !== 'all') evs = evs.filter(e => e.dateStatus === ui.evtStatus);
        if (ui.evtQ) { const q = ui.evtQ.toLowerCase(); evs = evs.filter(e => (e.title + ' ' + (e.venue || '') + ' ' + (e.city || '') + ' ' + (e.notes || '')).toLowerCase().includes(q)); }
        // sort: must-do first, then by date (tbd last)
        const pr = { must: 0, high: 1, maybe: 2 };
        evs.sort((a, b) => (pr[a.priority] ?? 3) - (pr[b.priority] ?? 3) || (a.dateStart || '9999').localeCompare(b.dateStart || '9999'));
        if (!evs.length) { listWrap.appendChild(empty('🎫', 'No events match. Add the ones you\'re waiting on!', el('button.btn.primary', { onclick: () => editEvent(null) }, '＋ Add event'))); return; }
        evs.forEach(e => listWrap.appendChild(eventCard(e)));
      }
    }
  };

  function eventCard(e) {
    const card = el('div.item');
    const dstChip = e.dateStatus === 'tbd' ? chip('Date TBD', 'warn') : e.dateStatus === 'window' ? chip('Window', 'blue') : chip('Confirmed', 'good');
    card.appendChild(el('div.item-top', {}, [
      el('div', { style: 'font-size:24px' }, catIcon(e.category)),
      el('div.item-grow', {}, [
        el('div.item-title', {}, [e.title, ' ', e.watch ? chip('👀 watch', 'accent') : null]),
        el('div.item-sub', { text: [dateText(e), e.venue, e.city].filter(Boolean).join(' · ') })
      ]),
      el('div.item-actions', {}, [
        iconBtn('✏️', 'Edit', () => editEvent(e)),
        e.dateStatus === 'confirmed' && e.dateStart ? iconBtn('🗓️', 'Add to itinerary', () => { addToItinerary({ title: e.title, date: e.dateStart, refType: 'event', refId: e.id }); app().toast('Added to itinerary'); }) : null,
        iconBtn('🗑️', 'Delete', () => app().confirm('Delete “' + e.title + '”?', () => JT.store.remove('events', e.id)))
      ])
    ]));

    const meta = el('div.item-meta', {}, [
      chip(e.category, ''), dstChip,
      e.priority ? chip(e.priority, e.priority === 'must' ? 'accent' : '') : null
    ]);
    card.appendChild(meta);

    // ticket pipeline
    if (e.ticketStatus && e.ticketStatus !== 'na') {
      const idx = D.TICKET_STATES.indexOf(e.ticketStatus);
      const lost = e.ticketStatus === 'Lost';
      const pipe = el('div.pipe');
      D.TICKET_STATES.forEach((st, i) => {
        let cls = 'step';
        if (st === e.ticketStatus) cls += lost ? ' lost' : ' cur';
        else if (i < idx && !(lost && i >= 3)) cls += ' done';
        pipe.appendChild(el('span.' + cls.split(' ').join('.'), { text: st, style: 'cursor:pointer', onclick: () => JT.store.update('events', e.id, { ticketStatus: st }) }));
      });
      card.appendChild(pipe);
      // ticket deadlines
      const tl = [];
      if (e.lotteryClose) tl.push('Lottery closes ' + u.fmtDate(e.lotteryClose) + ' (' + cdMini(e.lotteryClose) + ')');
      if (e.resultDate) tl.push('Results ' + u.fmtDate(e.resultDate));
      if (e.paymentDeadline) tl.push('Pay by ' + u.fmtDate(e.paymentDeadline) + ' (' + cdMini(e.paymentDeadline) + ')');
      if (e.pricePer) tl.push(u.money(e.pricePer, 'JPY') + ' × ' + (e.qty || 1));
      if (tl.length) card.appendChild(el('div.item-meta', {}, tl.map(t => chip(t, t.indexOf('Pay by') === 0 ? 'bad' : ''))));
    }

    if (e.notes) card.appendChild(el('div.item-sub', {}, linkify(e.notes)));
    const links = [];
    if (e.ticketUrl) links.push(el('a', { href: e.ticketUrl, target: '_blank', rel: 'noopener', text: '🎟️ Tickets' }));
    if (e.source) links.push(el('a', { href: e.source, target: '_blank', rel: 'noopener', text: '🔗 Source' }));
    if (e.owner) links.push(el('span.muted', { text: '👤 ' + e.owner }));
    if (links.length) card.appendChild(el('div.item-meta', {}, links));
    card.appendChild(collabBar('events', e));
    return card;
  }
  function cdMini(date) { const n = u.daysUntil(date); return n == null ? '' : n < 0 ? Math.abs(n) + 'd ago' : n + 'd'; }

  function editEvent(e) {
    const isNew = !e;
    e = e || {};
    app().formModal({
      title: isNew ? 'Add event' : 'Edit event', wide: true,
      fields: [
        { key: 'title', label: 'Event name *', full: true, value: e.title },
        { key: 'category', label: 'Category', type: 'select', options: D.EVENT_CATEGORIES, value: e.category || 'concert' },
        { key: 'priority', label: 'Priority', type: 'select', options: D.PRIORITIES, value: e.priority || 'high' },
        { key: 'dateStatus', label: 'Date status', type: 'select', options: D.DATE_STATES, value: e.dateStatus || 'tbd', hint: 'tbd = waiting on announcement' },
        { key: 'watch', label: 'On watchlist (ping me when announced)', type: 'checkbox', value: e.watch },
        { key: 'dateStart', label: 'Date / start', type: 'date', value: e.dateStart },
        { key: 'dateEnd', label: 'End (if multi-day)', type: 'date', value: e.dateEnd },
        { key: 'city', label: 'City', type: 'select', options: D.CITIES, value: e.city || 'Tokyo' },
        { key: 'venue', label: 'Venue', value: e.venue },
        { key: 'ticketStatus', label: 'Ticket status', type: 'select', options: ['na', ...D.TICKET_STATES], value: e.ticketStatus || 'na', hint: 'na = no ticket needed (e.g. a free festival)' },
        { key: 'qty', label: 'Tickets needed', type: 'number', value: e.qty != null ? e.qty : 2 },
        { key: 'lotteryOpen', label: 'Lottery opens', type: 'date', value: e.lotteryOpen },
        { key: 'lotteryClose', label: 'Lottery closes (deadline)', type: 'date', value: e.lotteryClose },
        { key: 'resultDate', label: 'Results announced', type: 'date', value: e.resultDate },
        { key: 'paymentDeadline', label: 'Payment deadline', type: 'date', value: e.paymentDeadline },
        { key: 'pricePer', label: 'Price per ticket (¥)', type: 'number', value: e.pricePer },
        { key: 'owner', label: 'Who\'s handling it', value: e.owner, hint: 'e.g. who enters the lottery' },
        { key: 'ticketUrl', label: 'Ticket link', full: true, value: e.ticketUrl, placeholder: 'https://ib.eplus.jp/…' },
        { key: 'source', label: 'Source / reference link', full: true, value: e.source },
        { key: 'notes', label: 'Notes', type: 'textarea', full: true, value: e.notes }
      ],
      onSave: (v) => {
        if (!v.title) { app().toast('Give it a name', 'bad'); return false; }
        v.qty = +v.qty || 0; v.pricePer = v.pricePer === '' ? '' : +v.pricePer;
        if (isNew) JT.store.add('events', v); else JT.store.update('events', e.id, v);
        app().toast(isNew ? 'Event added' : 'Saved', 'good');
      }
    });
  }

  /* ====================================================================
     LISTS  (sightseeing / food / nightlife / activities)
     ==================================================================== */
  JT.views.lists = {
    render(c) {
      c.appendChild(head('Lists', 'Sightseeing, food, nightlife & activities — your wishlist by city.', [
        el('button.btn.primary', { onclick: () => editPlace(null, ui.listType === 'all' ? 'sightseeing' : ui.listType) }, '＋ Add place')
      ]));

      // type tabs
      const seg = el('div.seg', { style: 'margin-bottom:14px' });
      [['all', 'All', '📋']].concat(D.PLACE_TYPES.map(t => [t.key, t.label, t.icon])).forEach(([k, label, ic]) => {
        const count = k === 'all' ? S().places.length : S().places.filter(p => p.type === k).length;
        seg.appendChild(el('button' + (ui.listType === k ? '.active' : ''), { onclick: () => { ui.listType = k; app().render(); } }, ic + ' ' + label + (count ? ' (' + count + ')' : '')));
      });
      c.appendChild(seg);

      // filters
      const tb = el('div.toolbar');
      tb.appendChild(filterSel(['all', ...D.CITIES], ui.listCity, v => { ui.listCity = v; app().render(); }, 'City'));
      tb.appendChild(filterSel(['all', ...D.PLACE_STATUS], ui.listStatus, v => { ui.listStatus = v; app().render(); }, 'Status'));
      tb.appendChild(el('input.search', { placeholder: '🔍 Search…', value: ui.listQ, oninput: (e) => { ui.listQ = e.target.value; renderList(); } }));
      c.appendChild(tb);

      const wrap = el('div'); c.appendChild(wrap);
      renderList();

      function renderList() {
        u.clear(wrap);
        let ps = S().places.slice();
        if (ui.listType !== 'all') ps = ps.filter(p => p.type === ui.listType);
        if (ui.listCity !== 'all') ps = ps.filter(p => p.city === ui.listCity);
        if (ui.listStatus !== 'all') ps = ps.filter(p => p.status === ui.listStatus);
        if (ui.listQ) { const q = ui.listQ.toLowerCase(); ps = ps.filter(p => (p.title + ' ' + (p.note || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q)); }
        if (!ps.length) { wrap.appendChild(empty('🗺️', 'Nothing here yet. Add places, or grab ideas from Discovery.', el('button.btn', { onclick: () => app().navigate('discovery') }, '✨ Browse Discovery'))); return; }
        // group by city
        const byCity = {};
        ps.forEach(p => { (byCity[p.city || 'Other'] = byCity[p.city || 'Other'] || []).push(p); });
        Object.keys(byCity).sort().forEach(city => {
          wrap.appendChild(el('h2', { style: 'margin:18px 0 8px;font-size:1rem;color:var(--text-dim)', text: city }));
          byCity[city].forEach(p => wrap.appendChild(placeCard(p)));
        });
      }
    }
  };

  function placeCard(p) {
    const t = D.PLACE_TYPES.find(x => x.key === p.type) || { icon: '📍', label: p.type };
    const card = el('div.item');
    card.appendChild(el('div.item-top', {}, [
      el('div', { style: 'font-size:22px' }, t.icon),
      el('div.item-grow', {}, [
        el('div.item-title', { text: p.title }),
        p.jp ? el('div.item-sub', { text: p.jp }) : null,
        p.note ? el('div.item-sub', {}, linkify(p.note)) : null
      ]),
      el('div.item-actions', {}, [
        iconBtn('🗓️', 'Add to itinerary', () => { addToItinerary({ title: p.title, date: '', refType: 'place', refId: p.id }); app().toast('Added to itinerary parking lot'); }),
        iconBtn('✏️', 'Edit', () => editPlace(p)),
        iconBtn('🗑️', 'Delete', () => app().confirm('Delete “' + p.title + '”?', () => JT.store.remove('places', p.id)))
      ])
    ]));
    const meta = el('div.item-meta', {}, [
      chip(t.label, ''), statusChip(p.status),
      p.reserve ? chip('📅 reserve ahead', 'warn') : null,
      p.hours ? chip('🕒 ' + p.hours, '') : null,
      p.price ? chip(p.price, '') : null
    ]);
    card.appendChild(meta);
    if (p.tags && p.tags.length) card.appendChild(tagsRow(p.tags));
    const links = [];
    if (p.url) links.push(el('a', { href: p.url, target: '_blank', rel: 'noopener', text: '🔗 ' + (u.domainOf(p.url) || 'link') }));
    if (p.jp || p.address) links.push(el('a', { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((p.jp || p.title) + ' ' + (p.address || p.city || '')), target: '_blank', rel: 'noopener', text: '📍 Maps' }));
    if (links.length) card.appendChild(el('div.item-meta', {}, links));
    // status quick-cycle
    card.appendChild(el('div.item-meta', {}, D.PLACE_STATUS.map(st => el('span', { class: 'chip' + (p.status === st ? ' blue' : ''), style: 'cursor:pointer', onclick: () => JT.store.update('places', p.id, { status: st }) }, st))));
    card.appendChild(collabBar('places', p));
    return card;
  }
  function statusChip(s) { return chip(s || 'idea', s === 'visited' ? 'good' : s === 'scheduled' ? 'blue' : ''); }

  function editPlace(p, defType) {
    const isNew = !p; p = p || {};
    app().formModal({
      title: isNew ? 'Add place' : 'Edit place', wide: true,
      fields: [
        { key: 'title', label: 'Name *', full: true, value: p.title },
        { key: 'type', label: 'Type', type: 'select', options: D.PLACE_TYPES.map(t => t.key), value: p.type || defType || 'sightseeing' },
        { key: 'city', label: 'City', type: 'select', options: D.CITIES, value: p.city || 'Tokyo' },
        { key: 'status', label: 'Status', type: 'select', options: D.PLACE_STATUS, value: p.status || 'idea' },
        { key: 'price', label: 'Price band', value: p.price, placeholder: '¥ / ¥¥ / ¥¥¥' },
        { key: 'hours', label: 'Hours / closed day', value: p.hours, placeholder: 'e.g. closed Mon' },
        { key: 'reserve', label: 'Needs reservation', type: 'checkbox', value: p.reserve },
        { key: 'jp', label: 'Japanese name', value: p.jp, hint: 'show to taxi drivers / staff' },
        { key: 'address', label: 'Address', full: true, value: p.address },
        { key: 'url', label: 'Link', full: true, value: p.url, placeholder: 'Tabelog / official / Instagram…' },
        { key: 'tags', label: 'Tags', type: 'tags', full: true, value: (p.tags || []).join(', '), hint: 'comma-separated, e.g. rainy-day, must-do' },
        { key: 'note', label: 'Notes', type: 'textarea', full: true, value: p.note }
      ],
      onSave: (v) => {
        if (!v.title) { app().toast('Give it a name', 'bad'); return false; }
        v.tags = u.tagList(v.tags);
        if (isNew) JT.store.add('places', v); else JT.store.update('places', p.id, v);
        app().toast(isNew ? 'Added' : 'Saved', 'good');
      }
    });
  }

  /* ====================================================================
     IDEAS (inbox)
     ==================================================================== */
  JT.views.ideas = {
    render(c) {
      c.appendChild(head('Idea Inbox', 'Dump anything — links, screenshots-as-links, half-thoughts. Triage later.', []));
      const add = el('div.card', { style: 'margin-bottom:16px' });
      const input = el('textarea', { placeholder: 'Paste an Instagram/TikTok/blog link or jot an idea, then press ⏎ or Add…', rows: 2, onkeydown: (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doAdd(); } });
      add.appendChild(input);
      add.appendChild(el('div', { style: 'display:flex;justify-content:flex-end;margin-top:8px' }, el('button.btn.primary', { onclick: doAdd }, '＋ Add idea')));
      c.appendChild(add);
      function doAdd() { const t = input.value.trim(); if (!t) return; JT.store.add('ideas', { text: t, status: 'inbox' }); input.value = ''; app().toast('Captured', 'good'); }

      const wrap = el('div'); c.appendChild(wrap);
      const ideas = S().ideas;
      if (!ideas.length) { wrap.appendChild(empty('💡', 'No ideas yet.')); return; }
      ideas.forEach(it => {
        const card = el('div.item');
        card.appendChild(el('div.item-top', {}, [
          el('div', { style: 'font-size:20px' }, '💡'),
          el('div.item-grow', {}, linkify(it.text)),
          el('div.item-actions', {}, [
            el('button.btn.sm', { onclick: () => promote(it) }, '➜ Promote'),
            iconBtn('✏️', 'Edit', () => app().formModal({ title: 'Edit idea', fields: [{ key: 'text', label: 'Idea', type: 'textarea', full: true, value: it.text }], onSave: v => JT.store.update('ideas', it.id, v) })),
            iconBtn('🗑️', 'Delete', () => JT.store.remove('ideas', it.id))
          ])
        ]));
        card.appendChild(collabBar('ideas', it));
        wrap.appendChild(card);
      });
    }
  };
  function promote(idea) {
    app().choose('Promote idea to…', [
      { label: '⛩️ A place (sightseeing/food/etc.)', fn: () => { const guessUrl = (idea.text.match(/https?:\/\/\S+/) || [])[0]; editPlace({ title: idea.text.replace(/https?:\/\/\S+/, '').trim().slice(0, 80) || 'New place', url: guessUrl, note: idea.text }); JT.store.remove('ideas', idea.id); } },
      { label: '🎫 An event', fn: () => { editEvent({ title: idea.text.slice(0, 80), notes: idea.text }); JT.store.remove('ideas', idea.id); } },
      { label: '🗓️ An itinerary slot', fn: () => { addToItinerary({ title: idea.text.slice(0, 80), date: '' }); JT.store.remove('ideas', idea.id); app().toast('Added to itinerary parking lot'); } }
    ]);
  }

  /* ====================================================================
     ITINERARY (day-by-day)
     ==================================================================== */
  const drag = { id: null };
  JT.views.itinerary = {
    render(c) {
      const s = S();
      c.appendChild(head('Itinerary', 'Drag items onto a day, or use the date menu. Confirmed events drop in automatically.', [
        el('button.btn.primary', { onclick: () => editSlot(null) }, '＋ Add to plan')
      ]));
      if (!s.meta.startDate || !s.meta.endDate) { c.appendChild(el('div.infobox', {}, ['Set your trip dates in ', el('a', { class: 'linklike', onclick: () => app().navigate('settings') }, 'Settings'), ' to lay out days.'])); }

      // Parking lot (unscheduled)
      const parked = s.itinerary.filter(x => !x.date);
      const lot = el('div.day.parking');
      lot.appendChild(el('div.day-h', {}, [el('span.date', { text: '🅿️ Unscheduled' }), el('span.base', { text: parked.length + ' item(s) — drag into a day' })]));
      const lotBody = dayBody('', parked);
      lot.appendChild(lotBody);
      c.appendChild(lot);

      // Days
      const dates = u.dateRange(s.meta.startDate, s.meta.endDate);
      dates.forEach(date => {
        const slots = s.itinerary.filter(x => x.date === date).sort(u.by('time'));
        const dayMeta = s.days[date] || {};
        const day = el('div.day');
        const mins = slots.reduce((a, x) => a + (+x.durationMin || 0), 0);
        const head2 = el('div.day-h', {}, [
          el('span.date', { text: u.fmtDate(date, { month: 'short', day: 'numeric' }) }),
          el('span.dow', { text: u.fmtDate(date, { weekday: 'long' }) }),
          mins > 720 ? chip('busy day · ' + Math.round(mins / 60) + 'h', 'warn') : (mins ? chip(Math.round(mins / 60) + 'h planned', '') : null),
          el('span.base', {}, [
            '🏨 ',
            el('span', { class: 'linklike', onclick: () => app().formModal({ title: 'Day notes — ' + u.fmtDate(date), fields: [{ key: 'base', label: 'Where you\'re staying', value: dayMeta.base }, { key: 'note', label: 'Day note / reminders', type: 'textarea', full: true, value: dayMeta.note }], onSave: v => JT.store.setDay(date, v) }), text: dayMeta.base || 'set base' })
          ])
        ]);
        day.appendChild(head2);
        if (dayMeta.note) day.appendChild(el('div', { style: 'padding:8px 16px 0;color:var(--text-dim);font-size:.85rem' }, '📝 ' + dayMeta.note));
        day.appendChild(dayBody(date, slots));
        c.appendChild(day);
      });
    }
  };

  function dayBody(date, slots) {
    const body = el('div.day-body', {
      ondragover: (e) => { e.preventDefault(); body.classList.add('dragover'); },
      ondragleave: () => body.classList.remove('dragover'),
      ondrop: (e) => { e.preventDefault(); body.classList.remove('dragover'); if (drag.id) { JT.store.update('itinerary', drag.id, { date }); drag.id = null; } }
    });
    if (!slots.length) body.appendChild(el('div.muted', { style: 'font-size:.84rem;padding:4px 0', text: date ? 'Nothing planned — drag here or use ＋' : 'Empty' }));
    slots.forEach(slot => body.appendChild(slotRow(slot)));
    return body;
  }
  function slotRow(slot) {
    const row = el('div.slot', { draggable: 'true', ondragstart: () => { drag.id = slot.id; row.classList.add('dragging'); }, ondragend: () => row.classList.remove('dragging') });
    row.appendChild(el('span.time', { text: slot.time || '—' }));
    const refIcon = slot.refType === 'event' ? '🎫 ' : slot.refType === 'place' ? '📍 ' : '';
    row.appendChild(el('div', { style: 'flex:1;min-width:0' }, [
      el('div', { style: slot.done ? 'text-decoration:line-through;opacity:.6' : '', html: refIcon + u.escapeHtml(slot.title) + (slot.durationMin ? ' <small class="muted">' + slot.durationMin + 'm</small>' : '') }),
      slot.note ? el('div.item-sub', {}, linkify(slot.note)) : null
    ]));
    row.appendChild(el('div.item-actions', {}, [
      iconBtn(slot.done ? '↩︎' : '✓', 'Toggle done', () => JT.store.update('itinerary', slot.id, { done: !slot.done })),
      iconBtn('✏️', 'Edit', () => editSlot(slot)),
      iconBtn('🗑️', 'Remove', () => JT.store.remove('itinerary', slot.id))
    ]));
    return row;
  }
  function editSlot(slot) {
    const isNew = !slot; slot = slot || {};
    const dates = u.dateRange(S().meta.startDate, S().meta.endDate);
    app().formModal({
      title: isNew ? 'Add to plan' : 'Edit slot',
      fields: [
        { key: 'title', label: 'What *', full: true, value: slot.title },
        { key: 'date', label: 'Day', type: 'select', options: ['', ...dates], optionLabels: ['(unscheduled)', ...dates.map(d => u.fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' }))], value: slot.date || '' },
        { key: 'time', label: 'Time', type: 'time', value: slot.time },
        { key: 'durationMin', label: 'Duration (min)', type: 'number', value: slot.durationMin },
        { key: 'note', label: 'Note', type: 'textarea', full: true, value: slot.note }
      ],
      onSave: (v) => {
        if (!v.title) { app().toast('Add a title', 'bad'); return false; }
        v.durationMin = +v.durationMin || 0;
        if (isNew) JT.store.addRaw('itinerary', Object.assign(D.base({}), v, { done: false })); else JT.store.update('itinerary', slot.id, v);
      }
    });
  }
  function addToItinerary(obj) { JT.store.addRaw('itinerary', Object.assign(D.base({}), { time: '', durationMin: 0, note: '', done: false }, obj)); }

  /* ====================================================================
     BUDGET
     ==================================================================== */
  JT.views.budget = {
    render(c) {
      const s = S(); const { a, b } = names();
      c.appendChild(head('Budget', 'Estimate costs, split with your friend, settle up.', [
        el('button.btn.primary', { onclick: () => editExpense(null) }, '＋ Add expense')
      ]));

      const total = s.expenses.reduce((t, e) => t + (+e.amountJPY || 0), 0);
      const cap = +s.settings.budgetCapJPY || 0;

      // summary
      const sum = el('div.bd-summary');
      sum.appendChild(bdStat('Total', u.money(total, 'JPY') + homeApprox(total)));
      if (cap) { const rem = cap - total; sum.appendChild(bdStat('Budget left', u.money(rem, 'JPY'), rem < 0 ? 'bad' : 'good')); }
      // per-category
      const byCat = {};
      s.expenses.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + (+e.amountJPY || 0));
      const topCat = Object.entries(byCat).sort((x, y) => y[1] - x[1])[0];
      if (topCat) sum.appendChild(bdStat('Biggest: ' + topCat[0], u.money(topCat[1], 'JPY')));
      c.appendChild(sum);

      if (cap) { const pct = Math.min(100, Math.round(total / cap * 100)); c.appendChild(el('div.bar', { style: 'margin-bottom:16px' }, el('span', { style: 'width:' + pct + '%;background:' + (total > cap ? 'var(--bad)' : 'var(--accent)') }))); }

      // settle-up
      let aPaid = 0, bPaid = 0, aShare = 0, bShare = 0;
      s.expenses.forEach(e => {
        const amt = +e.amountJPY || 0;
        if (e.paidBy === 'b') bPaid += amt; else aPaid += amt;
        if (e.split === 'a') aShare += amt; else if (e.split === 'b') bShare += amt; else { aShare += amt / 2; bShare += amt / 2; }
      });
      const netA = aPaid - aShare;
      let settle;
      if (Math.abs(netA) < 1) settle = '✅ All square — nobody owes anyone.';
      else if (netA > 0) settle = '💰 ' + b + ' owes ' + a + ' ' + u.money(Math.round(netA), 'JPY') + homeApprox(netA);
      else settle = '💰 ' + a + ' owes ' + b + ' ' + u.money(Math.round(-netA), 'JPY') + homeApprox(-netA);
      c.appendChild(el('div.settle', { style: 'margin-bottom:18px' }, settle));

      // table
      if (!s.expenses.length) { c.appendChild(empty('🧾', 'No expenses yet.')); return; }
      const tbl = el('table.tbl');
      tbl.appendChild(el('thead', {}, el('tr', {}, ['Item', 'Category', 'Paid by', 'Split', 'Amount', ''].map((h, i) => el(i >= 4 ? 'th.num' : 'th', { text: h })))));
      const tb = el('tbody');
      s.expenses.slice().sort(u.by('category')).forEach(e => {
        tb.appendChild(el('tr', {}, [
          el('td', {}, [e.label, ' ', e.paid ? chip('paid', 'good') : '']),
          el('td', { text: e.category }),
          el('td', { text: e.paidBy === 'b' ? b : a }),
          el('td', { text: e.split === 'a' ? a + ' only' : e.split === 'b' ? b + ' only' : '50/50' }),
          el('td.num', { text: u.money(e.amountJPY, 'JPY') }),
          el('td.num', {}, [iconBtn('✏️', 'Edit', () => editExpense(e)), iconBtn('🗑️', 'Delete', () => JT.store.remove('expenses', e.id))])
        ]));
      });
      tbl.appendChild(tb);
      tbl.appendChild(el('tfoot', {}, el('tr', {}, [el('td', { colspan: 4, text: 'Total' }), el('td.num', { html: '<strong>' + u.money(total, 'JPY') + '</strong>' }), el('td')])));
      c.appendChild(el('div.card', { style: 'overflow-x:auto' }, tbl));
    }
  };
  function bdStat(l, v, cls) { return el('div.stat', {}, [el('div.n', { style: 'font-size:1.25rem' + (cls ? ';color:var(--' + cls + ')' : ''), text: v }), el('div.l', { text: l })]); }
  function editExpense(e) {
    const isNew = !e; e = e || {}; const { a, b } = names();
    app().formModal({
      title: isNew ? 'Add expense' : 'Edit expense',
      fields: [
        { key: 'label', label: 'Item *', full: true, value: e.label },
        { key: 'category', label: 'Category', type: 'select', options: D.EXPENSE_CATEGORIES, value: e.category || 'Food' },
        { key: 'amount', label: 'Amount', type: 'number', value: e.amountJPY, },
        { key: 'cur', label: 'Currency', type: 'select', options: ['JPY', S().settings.homeCurrency], value: 'JPY', hint: 'home converts at your saved rate' },
        { key: 'paidBy', label: 'Paid by', type: 'select', options: ['a', 'b'], optionLabels: [a, b], value: e.paidBy || 'a' },
        { key: 'split', label: 'Split', type: 'select', options: ['even', 'a', 'b'], optionLabels: ['50 / 50', a + ' only', b + ' only'], value: e.split || 'even' },
        { key: 'paid', label: 'Already paid', type: 'checkbox', value: e.paid }
      ],
      onSave: (v) => {
        if (!v.label) { app().toast('Name it', 'bad'); return false; }
        let amt = +v.amount || 0;
        if (v.cur !== 'JPY') amt = Math.round(amt * (S().settings.jpyRate || 1));
        const data = { label: v.label, category: v.category, amountJPY: amt, paidBy: v.paidBy, split: v.split, paid: v.paid };
        if (isNew) JT.store.add('expenses', data); else JT.store.update('expenses', e.id, data);
      }
    });
  }

  /* ====================================================================
     MAP
     ==================================================================== */
  let mapObj = null;
  JT.views.map = {
    render(c) {
      c.appendChild(head('Map', 'All your saved places, color-coded. Locate any that are missing pins.', [
        el('button.btn.sm', { id: 'geo-btn', onclick: geocodeMissing }, '📍 Locate missing')
      ]));
      if (typeof L === 'undefined') { c.appendChild(el('div.warnbox', {}, 'Map library didn\'t load (you may be offline). Reconnect and reopen this tab.')); return; }
      c.appendChild(el('div', {}, [
        el('div.map-legend', {}, D.PLACE_TYPES.map(t => el('span.chip', {}, [el('span.dot', { style: 'background:' + typeColor(t.key) }), ' ' + t.label])).concat(el('span.chip', {}, [el('span.dot', { style: 'background:' + typeColor('event') }), ' Events'])))
      ]));
      const mapEl = el('div#map'); c.appendChild(mapEl);
      const counts = el('p.muted', { style: 'margin-top:10px' }); c.appendChild(counts);

      // defer init until element is in DOM
      setTimeout(() => {
        mapObj = L.map(mapEl, { scrollWheelZoom: true }).setView([36.2, 138.2], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapObj);
        const pts = [];
        S().places.forEach(p => { if (p.lat && p.lng) pts.push(marker(p.lat, p.lng, typeColor(p.type), p.title, (D.PLACE_TYPES.find(t => t.key === p.type) || {}).label + ' · ' + (p.city || ''))); });
        S().events.forEach(e => { if (e.lat && e.lng) pts.push(marker(e.lat, e.lng, typeColor('event'), e.title, e.venue || e.city || '')); });
        if (pts.length) { const g = L.featureGroup(pts).addTo(mapObj); mapObj.fitBounds(g.getBounds().pad(0.2)); }
        const missing = S().places.filter(p => !p.lat).length;
        counts.textContent = pts.length + ' pinned · ' + missing + ' place(s) without a pin (use “Locate missing”).';
      }, 60);

      function marker(lat, lng, color, title, sub) {
        const m = L.circleMarker([lat, lng], { radius: 8, color: '#0008', weight: 1, fillColor: color, fillOpacity: .9 });
        m.bindPopup('<strong>' + u.escapeHtml(title) + '</strong><br><small>' + u.escapeHtml(sub || '') + '</small>');
        return m;
      }
    }
  };
  function typeColor(t) { return ({ sightseeing: '#4aa8ff', food: '#f0b429', nightlife: '#e0556b', misc: '#36c98f', event: '#a06bff' })[t] || '#888'; }
  async function geocodeMissing() {
    const btn = document.getElementById('geo-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Locating…'; }
    const todo = S().places.filter(p => !p.lat);
    if (!todo.length) { app().toast('Everything is already located'); if (btn) { btn.disabled = false; btn.textContent = '📍 Locate missing'; } return; }
    let done = 0;
    for (const p of todo) {
      try {
        const q = [p.jp || p.title, p.address, p.city, 'Japan'].filter(Boolean).join(', ');
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q));
        const j = await r.json();
        if (j && j[0]) { JT.store.update('places', p.id, { lat: +j[0].lat, lng: +j[0].lon }); done++; }
      } catch (e) { /* skip */ }
      if (btn) btn.textContent = 'Locating… ' + done + '/' + todo.length;
      await new Promise(r => setTimeout(r, 1100)); // respect OSM usage policy
    }
    app().toast('Located ' + done + ' place(s)', 'good');
    app().render();
  }

  /* ====================================================================
     DISCOVERY
     ==================================================================== */
  JT.views.discovery = {
    render(c) {
      c.appendChild(head('Discovery', 'Curated Japan-Feb picks + smart nudges. Add anything to your lists.', [
        el('button.btn.sm', { onclick: () => editDiscovery(null) }, '＋ Add a pick')
      ]));

      // Smart suggestions
      const sug = suggestions();
      if (sug.length) {
        const card = el('div.card.pad-lg', { style: 'margin-bottom:18px' });
        card.appendChild(el('div.card-h', {}, el('h3', { text: '✨ Suggestions for you' })));
        sug.forEach(s2 => card.appendChild(el('div.deadline', {}, [
          el('div', { style: 'font-size:18px;min-width:26px;text-align:center' }, s2.icon),
          el('div.body', {}, [el('div.t', { text: s2.title }), el('div.d', { text: s2.detail })]),
          s2.cta ? el('button.btn.sm', { onclick: s2.cta.fn }, s2.cta.label) : null
        ])));
        c.appendChild(card);
      }

      // filters
      const tb = el('div.toolbar');
      tb.appendChild(filterSel(['all', ...[...new Set(S().discovery.map(d => d.city))]], ui.discCity, v => { ui.discCity = v; app().render(); }, 'City'));
      tb.appendChild(filterSel(['all', ...D.PLACE_TYPES.map(t => t.key)], ui.discType, v => { ui.discType = v; app().render(); }, 'Type'));
      c.appendChild(tb);

      let items = S().discovery.slice();
      if (ui.discCity !== 'all') items = items.filter(d => d.city === ui.discCity);
      if (ui.discType !== 'all') items = items.filter(d => d.type === ui.discType);
      const grid = el('div.grid.cols-2');
      const savedTitles = new Set(S().places.map(p => p.title.toLowerCase()));
      items.forEach(d => {
        const t = D.PLACE_TYPES.find(x => x.key === d.type) || { icon: '📍', label: d.type };
        const already = savedTitles.has(d.title.toLowerCase());
        const card = el('div.card', {}, [
          el('div.card-h', {}, [el('h3', { html: t.icon + ' ' + u.escapeHtml(d.title) }), chip(d.city, '')]),
          el('p.muted', { style: 'margin:0 0 10px', text: d.note }),
          d.tags && d.tags.length ? tagsRow(d.tags) : null,
          el('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [
            already ? chip('✓ in your list', 'good') : el('button.btn.sm.primary', { onclick: () => { JT.store.add('places', { title: d.title, type: d.type, city: d.city, note: d.note, tags: d.tags, status: 'shortlisted' }); app().toast('Added to your list', 'good'); app().render(); } }, '＋ Add to list'),
            el('button.btn.sm', { onclick: () => { JT.store.add('ideas', { text: d.title + ' — ' + d.note, status: 'inbox' }); app().toast('Saved to ideas'); } }, '💡 Idea')
          ])
        ]);
        grid.appendChild(card);
      });
      c.appendChild(grid);
    }
  };
  function suggestions() {
    const out = []; const s = S();
    // empty days
    const dates = u.dateRange(s.meta.startDate, s.meta.endDate);
    const planned = new Set(s.itinerary.filter(x => x.date).map(x => x.date));
    const emptyDay = dates.find(d => !planned.has(d));
    if (emptyDay) {
      const base = (s.days[emptyDay] || {}).base || '';
      const city = D.CITIES.find(ci => base.includes(ci.split(' ')[0])) || 'Tokyo';
      const pick = s.discovery.find(d => d.city === city) || s.discovery[0];
      out.push({ icon: '🗓️', title: u.fmtDate(emptyDay, { weekday: 'long', month: 'short', day: 'numeric' }) + ' is empty', detail: pick ? 'Idea: ' + pick.title + ' (' + pick.city + ')' : 'Add something from Discovery below.', cta: pick ? { label: 'Plan it', fn: () => { addToItinerary({ title: pick.title, date: emptyDay }); app().toast('Added'); app().navigate('itinerary'); } } : null });
    }
    // near a saved place: city you already have places in but few of a type
    const cityCounts = {}; s.places.forEach(p => cityCounts[p.city] = (cityCounts[p.city] || 0) + 1);
    const topCity = Object.entries(cityCounts).sort((x, y) => y[1] - x[1])[0];
    if (topCity) {
      const more = s.discovery.find(d => d.city === topCity[0] && !s.places.some(p => p.title.toLowerCase() === d.title.toLowerCase()));
      if (more) out.push({ icon: '📍', title: 'More in ' + topCity[0], detail: 'You\'re building up ' + topCity[0] + '. Try: ' + more.title, cta: { label: 'Add', fn: () => { JT.store.add('places', { title: more.title, type: more.type, city: more.city, note: more.note, tags: more.tags, status: 'shortlisted' }); app().toast('Added', 'good'); } } });
    }
    // must-do events without tickets
    const risky = s.events.find(e => e.priority === 'must' && e.ticketStatus && e.ticketStatus !== 'na' && e.ticketStatus !== 'Have tickets');
    if (risky) out.push({ icon: '🎫', title: 'Must-do without tickets yet', detail: risky.title + ' — status: ' + risky.ticketStatus, cta: { label: 'Open', fn: () => app().navigate('events') } });
    return out;
  }
  function editDiscovery(d) {
    const isNew = !d; d = d || {};
    app().formModal({
      title: isNew ? 'Add a pick' : 'Edit pick',
      fields: [
        { key: 'title', label: 'Name *', full: true, value: d.title },
        { key: 'city', label: 'City', type: 'select', options: D.CITIES, value: d.city || 'Tokyo' },
        { key: 'type', label: 'Type', type: 'select', options: D.PLACE_TYPES.map(t => t.key), value: d.type || 'sightseeing' },
        { key: 'tags', label: 'Tags', type: 'tags', full: true, value: (d.tags || []).join(', ') },
        { key: 'note', label: 'Why / note', type: 'textarea', full: true, value: d.note }
      ],
      onSave: v => { v.tags = u.tagList(v.tags); if (!v.title) return false; if (isNew) JT.store.addRaw('discovery', Object.assign({ id: u.uid('ds') }, v)); else JT.store.update('discovery', d.id, v); }
    });
  }

  /* ====================================================================
     LOGISTICS
     ==================================================================== */
  JT.views.logistics = {
    render(c) {
      c.appendChild(head('Logistics', 'Flights, lodging, transport, documents, packing & to-dos.', []));
      const tabs = [['flights', '✈️ Flights'], ['lodging', '🏨 Lodging'], ['transport', '🚄 Transport'], ['documents', '📄 Documents'], ['packing', '🎒 Packing'], ['checklist', '✅ Checklist']];
      const seg = el('div.seg', { style: 'margin-bottom:16px;display:flex;flex-wrap:wrap' });
      tabs.forEach(([k, l]) => seg.appendChild(el('button' + (ui.logTab === k ? '.active' : ''), { onclick: () => { ui.logTab = k; app().render(); } }, l)));
      c.appendChild(seg);
      ({ flights: logFlights, lodging: logLodging, transport: logTransport, documents: logDocuments, packing: logPacking, checklist: logChecklist }[ui.logTab])(c);
    }
  };

  function addBtn(label, fn) { return el('div', { style: 'margin-bottom:14px' }, el('button.btn.primary', { onclick: fn }, label)); }

  function logFlights(c) {
    c.appendChild(addBtn('＋ Add flight', () => editLog('flights', null, [
      { key: 'airline', label: 'Airline' }, { key: 'flightNo', label: 'Flight #' },
      { key: 'from', label: 'From' }, { key: 'to', label: 'To' },
      { key: 'depart', label: 'Departs', type: 'datetime-local' }, { key: 'arrive', label: 'Arrives', type: 'datetime-local' },
      { key: 'confirmation', label: 'Confirmation #' }, { key: 'costJPY', label: 'Cost (¥)', type: 'number' }
    ])));
    const items = S().logistics.flights;
    if (!items.length) return c.appendChild(empty('✈️', 'No flights yet.'));
    items.slice().sort(u.by('depart')).forEach(f => c.appendChild(logCard('flights', f, (f.airline || '') + ' ' + (f.flightNo || ''), [
      [f.from, f.to].filter(Boolean).join(' → '),
      f.depart ? '🛫 ' + f.depart.replace('T', ' ') : '', f.confirmation ? '#' + f.confirmation : '', f.costJPY ? u.money(f.costJPY, 'JPY') : ''
    ], () => editLog('flights', f))));
  }
  function logLodging(c) {
    c.appendChild(el('div.warnbox', { style: 'margin-bottom:12px' }, '🏨 Sapporo / Hokkaido sells out ~6 months ahead for Snow-Festival week. Book by ~Sept 2026.'));
    c.appendChild(addBtn('＋ Add stay', () => editLog('lodging', null, [
      { key: 'name', label: 'Hotel / place', full: true }, { key: 'city', label: 'City', type: 'select', options: D.CITIES },
      { key: 'checkIn', label: 'Check-in', type: 'date' }, { key: 'checkOut', label: 'Check-out', type: 'date' },
      { key: 'address', label: 'Address', full: true }, { key: 'confirmation', label: 'Confirmation #' },
      { key: 'costJPY', label: 'Cost (¥)', type: 'number' }, { key: 'link', label: 'Booking link', full: true }
    ])));
    const items = S().logistics.lodging;
    if (!items.length) return c.appendChild(empty('🏨', 'No lodging yet.'));
    items.slice().sort(u.by('checkIn')).forEach(l => c.appendChild(logCard('lodging', l, l.name, [
      l.city, l.checkIn ? u.fmtDate(l.checkIn) + ' → ' + u.fmtDate(l.checkOut) : '', l.confirmation ? '#' + l.confirmation : '', l.costJPY ? u.money(l.costJPY, 'JPY') : ''
    ], () => editLog('lodging', l), l.link)));
  }
  function logTransport(c) {
    c.appendChild(el('div.infobox', { style: 'margin-bottom:12px' }, 'ℹ️ Nationwide JR Pass usually isn\'t worth it for a city loop. For a Sapporo trip, compare the JR East–South Hokkaido Pass (~¥35,370) vs flights + individual tickets. IC card tip: top up Mobile Suica with Mastercard/Amex, not Visa, in Apple Wallet.'));
    c.appendChild(addBtn('＋ Add transport', () => editLog('transport', null, [
      { key: 'kind', label: 'Type', type: 'select', options: ['Shinkansen', 'JR / Regional pass', 'Domestic flight', 'IC card', 'Rental car', 'Bus', 'Other'] },
      { key: 'detail', label: 'Detail', full: true }, { key: 'date', label: 'Date', type: 'date' },
      { key: 'confirmation', label: 'Confirmation #' }, { key: 'costJPY', label: 'Cost (¥)', type: 'number' }
    ])));
    const items = S().logistics.transport;
    if (!items.length) return c.appendChild(empty('🚄', 'No transport yet.'));
    items.slice().sort(u.by('date')).forEach(t => c.appendChild(logCard('transport', t, (t.kind || 'Transport') + (t.detail ? ' — ' + t.detail : ''), [
      t.date ? u.fmtDate(t.date) : '', t.confirmation ? '#' + t.confirmation : '', t.costJPY ? u.money(t.costJPY, 'JPY') : ''
    ], () => editLog('transport', t))));
  }
  function logDocuments(c) {
    c.appendChild(el('div.infobox', { style: 'margin-bottom:12px' }, '📄 This vault stores notes & links (e.g. a private cloud link to passport scans, insurance PDF, e-tickets). Avoid pasting raw secrets here.'));
    c.appendChild(addBtn('＋ Add document', () => editLog('documents', null, [
      { key: 'label', label: 'Label *', full: true }, { key: 'link', label: 'Link', full: true }, { key: 'note', label: 'Note', type: 'textarea', full: true }
    ])));
    const items = S().logistics.documents;
    if (!items.length) return c.appendChild(empty('📄', 'No documents yet.'));
    items.forEach(d => c.appendChild(logCard('documents', d, d.label, [d.note], () => editLog('documents', d), d.link)));
  }
  function logPacking(c) { simpleChecklist(c, 'packing', '🎒', 'packing item'); }
  function logChecklist(c) { simpleChecklist(c, 'checklist', '✅', 'to-do'); }
  function simpleChecklist(c, sub, icon, noun) {
    const path = 'logistics.' + sub; const items = S().logistics[sub];
    const input = el('input', { placeholder: 'Add a ' + noun + '…', onkeydown: e => { if (e.key === 'Enter' && input.value.trim()) { JT.store.addRaw(path, sub === 'packing' ? { id: u.uid('pk'), text: input.value.trim(), done: false } : { id: u.uid('ck'), text: input.value.trim(), done: false }); input.value = ''; } } });
    c.appendChild(el('div', { style: 'display:flex;gap:8px;margin-bottom:14px' }, [input, el('button.btn.primary', { onclick: () => { if (input.value.trim()) { JT.store.addRaw(path, { id: u.uid(sub), text: input.value.trim(), done: false }); input.value = ''; } } }, 'Add')]));
    const done = items.filter(i => i.done).length;
    c.appendChild(el('div.bar', { style: 'margin-bottom:14px' }, el('span', { style: 'width:' + (items.length ? Math.round(done / items.length * 100) : 0) + '%' })));
    c.appendChild(el('p.muted', { style: 'margin-top:-6px', text: done + ' / ' + items.length + ' done' }));
    items.forEach(it => c.appendChild(el('div.item', { style: 'flex-direction:row;align-items:center;gap:10px' }, [
      el('input', { type: 'checkbox', checked: it.done, style: 'width:auto', onchange: () => JT.store.update(path, it.id, { done: !it.done }) }),
      el('div.item-grow', { style: it.done ? 'text-decoration:line-through;opacity:.55' : '', text: it.text }),
      iconBtn('🗑️', 'Delete', () => JT.store.remove(path, it.id))
    ])));
  }
  function logCard(sub, item, title, lines, editFn, link) {
    const path = 'logistics.' + sub;
    return el('div.item', {}, [
      el('div.item-top', {}, [
        el('div.item-grow', {}, [el('div.item-title', { text: title || '(untitled)' }), el('div.item-meta', {}, lines.filter(Boolean).map(t => chip(t, '')))]),
        el('div.item-actions', {}, [link ? el('a.btn.sm', { href: link, target: '_blank', rel: 'noopener' }, '🔗') : null, iconBtn('✏️', 'Edit', editFn), iconBtn('🗑️', 'Delete', () => JT.store.remove(path, item.id))])
      ])
    ]);
  }
  function editLog(sub, item, fields) {
    const isNew = !item; item = item || {};
    if (!fields) { /* derive from existing keys not used */ }
    app().formModal({
      title: (isNew ? 'Add ' : 'Edit ') + sub.slice(0, -1), wide: fields.length > 4,
      fields: fields.map(f => Object.assign({}, f, { value: item[f.key] })),
      onSave: v => {
        ['costJPY'].forEach(k => { if (k in v) v[k] = v[k] === '' ? '' : +v[k]; });
        if (isNew) JT.store.addRaw('logistics.' + sub, Object.assign({ id: u.uid(sub) }, v)); else JT.store.update('logistics.' + sub, item.id, v);
      }
    });
  }

  /* ====================================================================
     SETTINGS
     ==================================================================== */
  JT.views.settings = {
    render(c) {
      const s = S();
      c.appendChild(head('Settings', 'Identity, trip dates, cloud sync & your data.', []));

      // Identity & trip
      const id = settingCard('🧭 Trip & identity');
      field(id, 'Your name', el('input', { value: s.settings.userName, placeholder: 'You', onchange: e => JT.store.setSetting({ userName: e.target.value }) }), 'Used for “added by”, comments & expense split.');
      field(id, 'Friend\'s name', el('input', { value: s.settings.partnerName, placeholder: 'Friend', onchange: e => JT.store.setSetting({ partnerName: e.target.value }) }));
      field(id, 'Trip name', el('input', { value: s.meta.tripName, onchange: e => JT.store.setMeta({ tripName: e.target.value }) }));
      const dr = el('div', { style: 'display:flex;gap:10px' }, [
        el('input', { type: 'date', value: s.meta.startDate, onchange: e => JT.store.setMeta({ startDate: e.target.value }) }),
        el('input', { type: 'date', value: s.meta.endDate, onchange: e => JT.store.setMeta({ endDate: e.target.value }) })
      ]);
      field(id, 'Trip dates (start / end)', dr, 'Default is a placeholder Feb 2027 window — adjust freely.');
      c.appendChild(id);

      // Money
      const mc = settingCard('💴 Money');
      field(mc, 'Home currency', el('input', { value: s.settings.homeCurrency, onchange: e => JT.store.setSetting({ homeCurrency: e.target.value.toUpperCase().slice(0, 3) }) }), 'ISO code, e.g. USD, GBP, AUD.');
      field(mc, 'JPY per 1 ' + s.settings.homeCurrency, el('input', { type: 'number', value: s.settings.jpyRate, onchange: e => JT.store.setSetting({ jpyRate: +e.target.value || 0 }) }), 'Used to show home-currency estimates. ~150 mid-2026.');
      field(mc, 'Budget cap (¥, optional)', el('input', { type: 'number', value: s.settings.budgetCapJPY || '', onchange: e => JT.store.setSetting({ budgetCapJPY: +e.target.value || 0 }) }));
      c.appendChild(mc);

      // Appearance
      const ap = settingCard('🎨 Appearance');
      field(ap, 'Theme', el('div.seg', {}, [['dark', '🌙 Dark'], ['light', '☀️ Light']].map(([k, l]) => el('button' + (s.settings.theme === k ? '.active' : ''), { onclick: () => app().setTheme(k) }, l))));
      c.appendChild(ap);

      // Cloud sync
      c.appendChild(syncCard());

      // Data
      const dc = settingCard('💾 Your data');
      dc.appendChild(el('p.muted', { text: 'Everything lives in this browser unless cloud sync is on. Export to back up or to hand off to your friend manually.' }));
      dc.appendChild(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
        el('button.btn', { onclick: () => u.download('japan2027-' + new Date().toISOString().slice(0, 10) + '.json', JT.store.exportJSON()) }, '⬇️ Export JSON'),
        el('button.btn', { onclick: importFlow }, '⬆️ Import JSON'),
        el('button.btn.danger', { onclick: () => app().confirm('Reset EVERYTHING to the starter data? This cannot be undone (export first!).', () => { JT.store.reset(); app().toast('Reset to starter data'); app().navigate('dashboard'); }) }, '♻️ Reset')
      ]));
      c.appendChild(dc);

      const about = settingCard('ℹ️ About');
      about.appendChild(el('p.muted', { html: 'Japan 2027 Trip Tracker — a static, offline-first app you host on GitHub Pages. See <span class="kbd">README.md</span> for deploy & sync setup. Press <span class="kbd">/</span> to search.' }));
      c.appendChild(about);
    }
  };

  function settingCard(title) { const card = el('div.card.pad-lg', { style: 'margin-bottom:16px' }); card.appendChild(el('h3', { text: title, style: 'margin-bottom:12px' })); return card; }
  function field(card, label, control, hint) { card.appendChild(el('div.field', {}, [el('label', { text: label }), control, hint ? el('span.hint', { text: hint }) : null])); }

  function syncCard() {
    const s = S().settings.sync;
    const card = settingCard('☁️ Cloud sync (optional)');
    card.appendChild(el('p.muted', { html: 'Off by default. Turn on to share live with your friend — both open the same URL, enter the same passphrase, and edits sync in real time. Your data is encrypted in the browser, so the public key never exposes your plans. Setup steps are in <span class="kbd">README.md</span>.' }));
    const enable = el('label.check-row', { style: 'margin-bottom:12px' }, [el('input', { type: 'checkbox', checked: s.enabled, onchange: e => { JT.store.setSetting({ sync: Object.assign({}, S().settings.sync, { enabled: e.target.checked }) }); if (e.target.checked) JT.sync.init(); else JT.sync.teardown(); app().updateSyncPill(JT.sync.status); } }), el('span', { text: 'Enable cloud sync' })]);
    card.appendChild(enable);

    const grid = el('div');
    const mk = (key, label, hint, type) => {
      const inp = el('input', { type: type || 'text', value: s[key] || '', placeholder: label, onchange: e => JT.store.setSetting({ sync: Object.assign({}, S().settings.sync, { [key]: e.target.value }) }) });
      field(grid, label, inp, hint);
    };
    mk('url', 'Supabase Project URL', 'https://xxxx.supabase.co');
    mk('key', 'Supabase anon/publishable key', 'Safe to expose — data is encrypted client-side.');
    mk('room', 'Room name', 'Any shared word, e.g. "jeremy-japan". Both use the same one.');
    mk('passphrase', 'Shared passphrase', 'The encryption secret. DM it to your friend — never put it in the repo.', 'text');
    card.appendChild(grid);

    const statusLine = el('div.muted', { style: 'margin:8px 0', id: 'sync-status-line', text: 'Status: ' + JT.sync.status });
    card.appendChild(statusLine);
    card.appendChild(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      el('button.btn', { onclick: async () => { statusLine.textContent = 'Testing…'; const r = await JT.sync.test(S().settings.sync); statusLine.textContent = (r.ok ? '✅ ' : '❌ ') + r.msg; } }, '🔌 Test connection'),
      el('button.btn.primary', { onclick: () => { JT.store.setSetting({ sync: Object.assign({}, S().settings.sync, { enabled: true }) }); JT.sync.init(); app().toast('Connecting…'); setTimeout(() => app().render(), 1500); } }, '☁️ Save & connect')
    ]));
    return card;
  }

  function importFlow() {
    const inp = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
    inp.addEventListener('change', async () => {
      if (!inp.files[0]) return;
      const text = await u.readFile(inp.files[0]);
      app().choose('Import — how?', [
        { label: '🔀 Merge (add new items, keep mine)', fn: () => doImport(text, 'merge') },
        { label: '♻️ Replace everything', fn: () => doImport(text, 'replace') }
      ]);
    });
    document.body.appendChild(inp); inp.click(); inp.remove();
    function doImport(text, mode) { try { JT.store.importJSON(text, mode); app().toast('Imported', 'good'); app().navigate('dashboard'); } catch (e) { app().toast('Import failed: ' + e.message, 'bad'); } }
  }

  /* ---------------- small shared form helper ---------------- */
  function filterSel(options, current, onChange, label) {
    const sel = el('select', { onchange: e => onChange(e.target.value), title: label, style: 'width:auto' });
    options.forEach(o => sel.appendChild(el('option', { value: o, selected: o === current ? 'selected' : null, text: (label && o === 'all' ? 'All ' + label.toLowerCase() : o) })));
    return sel;
  }

})();
