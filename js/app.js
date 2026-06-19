/* ============================================================
   app.js — bootstrap, navigation, theme + shared UI helpers
   (modal / toast / formModal / confirm / choose). Loaded last.
   ============================================================ */
window.JT = window.JT || {};
JT.app = (function () {
  const u = JT.util, el = u.el;
  const S = () => JT.store.state;

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'events', label: 'Events', icon: '🎫', badge: () => S().events.filter(e => e.dateStatus === 'tbd' || e.watch).length },
    { key: 'lists', label: 'Lists', icon: '🗺️' },
    { key: 'ideas', label: 'Ideas', icon: '💡' },
    { key: 'itinerary', label: 'Itinerary', icon: '🗓️' },
    { key: 'budget', label: 'Budget', icon: '💴' },
    { key: 'map', label: 'Map', icon: '📍' },
    { key: 'discovery', label: 'Discovery', icon: '✨' },
    { key: 'logistics', label: 'Logistics', icon: '🧳' },
    { key: 'settings', label: 'Settings', icon: '⚙️' }
  ];
  const BOTTOM = ['dashboard', 'events', 'lists', 'itinerary'];

  let route = 'dashboard';

  /* ---------------- bootstrap ---------------- */
  function init() {
    JT.store.load();
    setTheme(S().settings.theme || 'dark', true);
    try { route = localStorage.getItem('jt_route') || 'dashboard'; } catch (e) {}
    if (!JT.views[route]) route = 'dashboard';

    buildNav();
    wireChrome();
    JT.store.subscribe(render);
    render();

    // cloud sync: apply baked-in config (js/config.js), then connect or prompt for the passphrase
    maybeApplyConfig();
    const sy = S().settings.sync || {};
    if (sy.enabled && sy.url && sy.passphrase) {
      if (JT.sync.available()) JT.sync.init();
      else window.addEventListener('load', () => JT.sync.init());
    } else if (sy.url && sy.key && sy.room && !sy.passphrase) {
      updateSyncPill('off');
      setTimeout(promptPassphrase, 500);
    } else { updateSyncPill('off'); }
  }

  // Merge committed sync config (project URL/key/room) in if the user hasn't set their own.
  function maybeApplyConfig() {
    const cfg = window.JT_CONFIG && window.JT_CONFIG.sync;
    if (!cfg || !cfg.url) return;
    const sy = S().settings.sync || {};
    if (!sy.url) JT.store.setSetting({ sync: Object.assign({}, sy, { url: cfg.url, key: cfg.key, room: cfg.room }) });
  }

  // First-run prompt: user just enters the shared passphrase to go live.
  function promptPassphrase() {
    const inp = el('input', { type: 'text', placeholder: 'Shared passphrase', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const connect = () => {
      const p = inp.value.trim(); if (!p) { inp.focus(); return; }
      JT.store.setSetting({ sync: Object.assign({}, S().settings.sync, { passphrase: p, enabled: true }) });
      closeModal(); JT.sync.init(); toast('Connecting to your shared trip…');
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });
    openModal({
      title: '🔐 Connect to your shared trip',
      body: el('div', {}, [
        el('p.muted', { text: 'Enter the passphrase you and your friend share to sync this trip live. You can also do this later in Settings → Cloud sync.' }),
        inp
      ]),
      footer: [el('button.btn.ghost', { onclick: closeModal }, 'Later'), el('button.btn.primary', { onclick: connect }, 'Connect')]
    });
    setTimeout(() => inp.focus(), 60);
  }

  function buildNav() {
    const nav = document.getElementById('nav'); u.clear(nav);
    NAV.forEach(n => {
      const badge = n.badge ? n.badge() : 0;
      nav.appendChild(el('button.nav-btn', { dataset: { route: n.key }, onclick: () => navigate(n.key) }, [
        el('span.ico', { text: n.icon }), el('span', { text: n.label }), badge ? el('span.badge', { text: badge }) : null
      ]));
    });
    const bn = document.getElementById('bottomnav'); u.clear(bn);
    BOTTOM.forEach(k => { const n = NAV.find(x => x.key === k); bn.appendChild(el('button.bn', { dataset: { route: k }, onclick: () => navigate(k) }, [el('span.ico', { text: n.icon }), el('span', { text: n.label })])); });
    bn.appendChild(el('button.bn', { onclick: toggleSidebar }, [el('span.ico', { text: '☰' }), el('span', { text: 'More' })]));
  }

  function wireChrome() {
    document.getElementById('theme-toggle').onclick = () => setTheme(S().settings.theme === 'dark' ? 'light' : 'dark');
    document.getElementById('menu-btn').onclick = toggleSidebar;
    document.getElementById('quick-capture').onclick = quickCapture;
    document.getElementById('sync-pill').onclick = () => navigate('settings');
    // keyboard: / focus search, esc close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) {
        const s = document.querySelector('input.search'); if (s) { e.preventDefault(); s.focus(); }
      }
    });
  }

  function toggleSidebar() {
    const sb = document.getElementById('sidebar'), app = document.getElementById('app');
    sb.classList.toggle('open'); app.classList.toggle('nav-open');
    if (app.classList.contains('nav-open')) app.onclick = (e) => { if (e.target === app || e.target.id === 'app') { sb.classList.remove('open'); app.classList.remove('nav-open'); } };
  }

  /* ---------------- navigation / render ---------------- */
  function navigate(r) {
    if (!JT.views[r]) return;
    route = r;
    try { localStorage.setItem('jt_route', r); } catch (e) {}
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('app').classList.remove('nav-open');
    render();
    document.getElementById('view').scrollTo ? window.scrollTo(0, 0) : null;
  }

  function render() {
    const view = document.getElementById('view');
    u.clear(view);
    try { JT.views[route].render(view); }
    catch (e) { console.error(e); view.appendChild(el('div.warnbox', { text: 'Something went wrong rendering this view: ' + e.message })); }
    // active states
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.route === route));
    document.querySelectorAll('.bn').forEach(b => b.classList.toggle('active', b.dataset.route === route));
    // refresh nav badges
    document.querySelectorAll('.nav-btn').forEach(b => { const n = NAV.find(x => x.key === b.dataset.route); if (n && n.badge) { const old = b.querySelector('.badge'); if (old) old.remove(); const v = n.badge(); if (v) b.appendChild(el('span.badge', { text: v })); } });
    // countdowns
    const cd = u.countdownLabel(S().meta.startDate);
    const txt = cd.n === 'today' ? 'Today!' : (typeof cd.n === 'number' ? cd.n + ' ' + cd.unit + ' to go' : 'set dates');
    document.getElementById('brand-countdown').textContent = txt;
    document.getElementById('topbar-countdown').textContent = (typeof cd.n === 'number' ? cd.n + 'd' : '');
  }

  /* ---------------- theme ---------------- */
  function setTheme(t, quiet) {
    document.documentElement.setAttribute('data-theme', t);
    document.getElementById('theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
    if (!quiet) JT.store.setSetting({ theme: t });
  }

  /* ---------------- sync pill ---------------- */
  function updateSyncPill(status, msg) {
    const pill = document.getElementById('sync-pill'); if (!pill) return;
    pill.classList.remove('cloud', 'error');
    const map = { off: '● Local only', connecting: '◌ Connecting…', cloud: '● ' + (msg || 'Cloud synced'), error: '● ' + (msg || 'Sync error') };
    pill.textContent = map[status] || status;
    if (status === 'cloud') pill.classList.add('cloud');
    if (status === 'error') pill.classList.add('error');
    const line = document.getElementById('sync-status-line'); if (line && status !== 'cloud') line.textContent = 'Status: ' + (map[status] || status);
  }

  /* ---------------- quick capture ---------------- */
  function quickCapture() {
    const ta = el('textarea', { placeholder: 'Paste a link or jot an idea…', rows: 3 });
    openModal({
      title: '⚡ Quick capture', body: ta,
      footer: [el('button.btn.ghost', { onclick: closeModal }, 'Cancel'), el('button.btn.primary', { onclick: () => { if (ta.value.trim()) { JT.store.add('ideas', { text: ta.value.trim(), status: 'inbox' }); toast('Saved to Ideas', 'good'); } closeModal(); } }, 'Save idea')]
    });
    setTimeout(() => ta.focus(), 50);
  }

  /* ---------------- modal core ---------------- */
  function openModal(opts) {
    const root = document.getElementById('modal-root'); u.clear(root);
    const modal = el('div.modal' + (opts.wide ? '.wide' : ''), {}, [
      el('div.modal-h', {}, [el('h2', { text: opts.title || '' }), el('button.icon-btn', { onclick: closeModal, title: 'Close' }, '✕')]),
      el('div.modal-b', {}, opts.body),
      opts.footer ? el('div.modal-f', {}, opts.footer) : null
    ]);
    const overlay = el('div.modal-overlay', { onclick: (e) => { if (e.target === overlay) closeModal(); } }, modal);
    root.appendChild(overlay);
    return { close: closeModal };
  }
  function closeModal() { u.clear(document.getElementById('modal-root')); }

  function confirm(message, onYes) {
    openModal({
      title: 'Please confirm', body: el('p', { text: message }),
      footer: [el('button.btn.ghost', { onclick: closeModal }, 'Cancel'), el('button.btn.danger', { onclick: () => { closeModal(); onYes(); } }, 'Yes, do it')]
    });
  }
  function choose(title, options) {
    openModal({ title, body: el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, options.map(o => el('button.btn', { style: 'justify-content:flex-start', onclick: () => { closeModal(); o.fn(); } }, o.label))) });
  }

  /* ---------------- form modal ---------------- */
  function formModal(opts) {
    const refs = {};
    const grid = el('div.form-grid');
    (opts.fields || []).forEach(f => {
      const id = 'f_' + f.key;
      let control;
      const t = f.type || 'text';
      if (t === 'textarea') control = el('textarea', { id, value: f.value != null ? f.value : '', placeholder: f.placeholder || '' });
      else if (t === 'select') {
        control = el('select', { id });
        (f.options || []).forEach((o, i) => control.appendChild(el('option', { value: o, selected: String(f.value) === String(o) ? 'selected' : null, text: (f.optionLabels && f.optionLabels[i] != null) ? f.optionLabels[i] : (o === '' ? '—' : o) })));
      } else if (t === 'checkbox') {
        control = el('input', { id, type: 'checkbox' }); if (f.value) control.checked = true;
      } else {
        control = el('input', { id, type: t === 'tags' ? 'text' : t, value: f.value != null ? f.value : '', placeholder: f.placeholder || '', step: f.step, min: f.min });
      }
      refs[f.key] = { control, type: t };
      const wrap = el('div.field' + (f.full ? '.full' : ''), {});
      if (t === 'checkbox') wrap.appendChild(el('label.check-row', {}, [control, el('span', { text: f.label })]));
      else { wrap.appendChild(el('label', { for: id, text: f.label })); wrap.appendChild(control); }
      if (f.hint) wrap.appendChild(el('span.hint', { text: f.hint }));
      grid.appendChild(wrap);
    });

    function collect() {
      const v = {};
      for (const k in refs) { const r = refs[k]; v[k] = r.type === 'checkbox' ? r.control.checked : r.control.value; }
      return v;
    }
    const save = () => { const r = opts.onSave(collect()); if (r !== false) closeModal(); };
    openModal({
      title: opts.title, wide: opts.wide, body: grid,
      footer: [el('button.btn.ghost', { onclick: closeModal }, 'Cancel'), el('button.btn.primary', { onclick: save }, '💾 Save')]
    });
    grid.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); save(); } });
    setTimeout(() => { const first = grid.querySelector('input,select,textarea'); if (first) first.focus(); }, 50);
  }

  /* ---------------- toast ---------------- */
  function toast(msg, type) {
    const root = document.getElementById('toast-root');
    const t = el('div.toast' + (type ? '.' + type : ''), { text: msg });
    root.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2500);
  }

  return { init, navigate, render, setTheme, toast, openModal, closeModal, confirm, choose, formModal, updateSyncPill };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', JT.app.init);
else JT.app.init();
