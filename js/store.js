/* ============================================================
   store.js — single source of truth (JT.store)
   localStorage-backed, pub/sub, undo, export/import.
   On every change it persists locally and (if enabled) pushes
   to the cloud via JT.sync.
   ============================================================ */
window.JT = window.JT || {};
JT.store = (function () {
  const u = JT.util;
  const KEY = 'jt_japan2027_v1';
  const HISTORY_MAX = 40;

  let state = null;
  const subs = new Set();
  const history = [];
  let suppressPush = false;   // true while applying remote updates

  /* ---------- load / persist ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = migrate(JSON.parse(raw)); }
      else { state = JT.data.seed(); persistLocal(); }
    } catch (e) {
      console.error('Load failed, seeding fresh', e);
      state = JT.data.seed();
    }
    return state;
  }

  function migrate(s) {
    const seed = JT.data.seed();
    // shallow-fill any missing top-level keys / settings so old saves keep working
    for (const k in seed) if (!(k in s)) s[k] = seed[k];
    s.settings = Object.assign({}, seed.settings, s.settings);
    s.settings.sync = Object.assign({}, seed.settings.sync, s.settings.sync);
    s.logistics = Object.assign({}, seed.logistics, s.logistics);
    s.meta = Object.assign({}, seed.meta, s.meta);
    return s;
  }

  function persistLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.error('Persist failed', e); JT.app && JT.app.toast('⚠️ Could not save locally (storage full?)', 'bad'); }
  }

  /* ---------- pub/sub ---------- */
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  function emit() { subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } }); }

  /* ---------- commit ---------- */
  // mutator(state) => void. Records undo snapshot, persists, pushes, emits.
  function commit(mutator, opts) {
    opts = opts || {};
    if (!opts.noHistory) {
      history.push(JSON.stringify(state));
      if (history.length > HISTORY_MAX) history.shift();
    }
    mutator(state);
    if (!opts.silentMeta) {
      state.meta.updatedAt = u.nowISO();
      state.meta.lastEditedBy = state.settings.userName || '';
    }
    persistLocal();
    if (!suppressPush && !opts.noPush && JT.sync) JT.sync.schedulePush();
    emit();
  }

  function undo() {
    if (!history.length) { JT.app && JT.app.toast('Nothing to undo'); return; }
    state = JSON.parse(history.pop());
    persistLocal();
    if (JT.sync) JT.sync.schedulePush();
    emit();
    JT.app && JT.app.toast('↩︎ Undone');
  }

  /* ---------- remote application (from cloud sync) ---------- */
  function applyRemote(remoteState) {
    suppressPush = true;
    try {
      // keep this device's local-only settings (identity/theme/sync creds)
      const localSettings = state.settings;
      state = migrate(remoteState);
      state.settings = Object.assign({}, state.settings, {
        userName: localSettings.userName,
        theme: localSettings.theme,
        sync: localSettings.sync
      });
      persistLocal();
      emit();
    } finally { suppressPush = false; }
  }

  /* ---------- generic collection helpers ----------
     path is a top-level array name: events, places, ideas, itinerary, expenses, deadlines, discovery
     or a logistics sub-array: 'logistics.flights' etc. */
  function arrAt(s, path) {
    if (path.indexOf('.') > -1) { const [a, b] = path.split('.'); return s[a][b]; }
    return s[path];
  }
  function add(path, item) {
    const it = JT.data.base(item);
    it.addedBy = state.settings.userName || '';
    commit(s => arrAt(s, path).unshift(it));
    return it.id;
  }
  function addRaw(path, item) { commit(s => arrAt(s, path).unshift(item)); }
  function update(path, id, patch) {
    commit(s => {
      const it = arrAt(s, path).find(x => x.id === id);
      if (it) { Object.assign(it, patch); if ('updatedAt' in it) it.updatedAt = u.nowISO(); }
    });
  }
  function remove(path, id) { commit(s => { const a = arrAt(s, path); const i = a.findIndex(x => x.id === id); if (i > -1) a.splice(i, 1); }); }
  function get(path, id) { return arrAt(state, path).find(x => x.id === id); }

  /* ---------- collaboration: votes & comments (work on any item w/ those fields) ---------- */
  function vote(path, id, dir) {
    const me = state.settings.userName || 'me';
    commit(s => {
      const it = arrAt(s, path).find(x => x.id === id); if (!it) return;
      it.votes = it.votes || {};
      if (it.votes[me] === dir) delete it.votes[me]; else it.votes[me] = dir;
    });
  }
  function addComment(path, id, text) {
    const me = state.settings.userName || 'someone';
    commit(s => {
      const it = arrAt(s, path).find(x => x.id === id); if (!it) return;
      it.comments = it.comments || [];
      it.comments.push({ by: me, text, at: u.nowISO() });
    });
  }

  /* ---------- settings / meta ---------- */
  function setSetting(patch) { commit(s => Object.assign(s.settings, patch), { silentMeta: true }); }
  function setMeta(patch) { commit(s => Object.assign(s.meta, patch)); }
  function setDay(date, patch) { commit(s => { s.days[date] = Object.assign({}, s.days[date], patch); }); }

  /* ---------- export / import / reset ---------- */
  function exportJSON() {
    return JSON.stringify(Object.assign({}, state, { _exportedAt: u.nowISO(), _app: 'japan2027-tracker' }), null, 2);
  }
  function importJSON(text, mode) {
    const incoming = JSON.parse(text);
    if (!incoming || !incoming.meta) throw new Error('That file does not look like a tracker export.');
    commit(s => {
      if (mode === 'merge') {
        ['events', 'places', 'ideas', 'itinerary', 'expenses', 'deadlines', 'discovery'].forEach(k => {
          const existing = new Set((s[k] || []).map(x => x.id));
          (incoming[k] || []).forEach(x => { if (!existing.has(x.id)) s[k].push(x); });
        });
        Object.assign(s.days, incoming.days || {});
      } else {
        const keepSettings = s.settings;
        Object.keys(incoming).forEach(k => { if (!k.startsWith('_')) s[k] = incoming[k]; });
        // keep this device's identity & sync creds on a full replace
        s.settings = Object.assign({}, incoming.settings, { userName: keepSettings.userName, sync: keepSettings.sync, theme: keepSettings.theme });
      }
    });
  }
  function reset() { commit(() => { state = JT.data.seed(); }, { noHistory: true }); persistLocal(); emit(); }

  return {
    get state() { return state; },
    load, subscribe, commit, undo, applyRemote,
    add, addRaw, update, remove, get,
    vote, addComment,
    setSetting, setMeta, setDay,
    exportJSON, importJSON, reset, persistLocal
  };
})();
