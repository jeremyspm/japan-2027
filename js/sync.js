/* ============================================================
   sync.js — optional live cloud sync (JT.sync)
   Supabase as a dumb encrypted store. Data is encrypted IN THE
   BROWSER with a key derived from the shared passphrase (PBKDF2
   -> AES-GCM), so the row only ever holds ciphertext — the
   public anon key never exposes your plans.
   The whole app works with this turned OFF; this only adds
   real-time two-device sync when enabled in Settings.
   ============================================================ */
window.JT = window.JT || {};
JT.sync = (function () {
  const u = JT.util;
  const TABLE = 'trip_state';

  let client = null;
  let key = null;            // CryptoKey
  let cfg = null;            // {url,key,room,passphrase}
  let status = 'off';        // off | connecting | cloud | error
  let lastApplied = '';      // updated_at we last pulled
  let channel = null;
  let pollTimer = null;
  const pushSoon = u.debounce(() => doPush(), 900);

  /* ---------- base64 <-> bytes ---------- */
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  /* ---------- crypto ---------- */
  async function deriveKey(passphrase, saltBytes) {
    const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }
  async function encrypt(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    return b64(iv) + ':' + b64(ct);
  }
  async function decrypt(payload) {
    const [ivB, ctB] = payload.split(':');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB) }, key, unb64(ctB));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function setStatus(s, msg) { status = s; JT.app && JT.app.updateSyncPill && JT.app.updateSyncPill(s, msg); }

  function available() { return typeof window.supabase !== 'undefined' && window.supabase.createClient; }
  function secure() { return !!(crypto && crypto.subtle); }

  /* ---------- lifecycle ---------- */
  async function init() {
    teardown();
    const s = JT.store.state.settings.sync || {};
    if (!s.enabled) { setStatus('off'); return; }
    if (!available()) { setStatus('error', 'Sync library not loaded (offline?)'); return; }
    if (!secure()) { setStatus('error', 'Cloud sync needs https (GitHub Pages). Not available from a local file.'); return; }
    if (!s.url || !s.key || !s.room || !s.passphrase) { setStatus('error', 'Sync not fully configured'); return; }

    cfg = s;
    setStatus('connecting');
    try {
      client = window.supabase.createClient(s.url, s.key, { auth: { persistSession: false } });
      await firstReconcile();
      subscribeRealtime();
      startPolling();
      setStatus('cloud', 'Synced');
    } catch (e) {
      console.error('Sync init failed', e);
      setStatus('error', e.message || 'Sync failed');
    }
  }

  function teardown() {
    if (channel && client) { try { client.removeChannel(channel); } catch (e) {} }
    channel = null;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    client = null; key = null; cfg = null;
  }

  async function fetchRow() {
    const { data, error } = await client.from(TABLE).select('*').eq('room', cfg.room).maybeSingle();
    if (error) throw error;
    return data;
  }

  // On connect: pull remote if it exists & is newer, otherwise push local up.
  async function firstReconcile() {
    const row = await fetchRow();
    if (row && row.payload) {
      key = await deriveKey(cfg.passphrase, unb64(row.salt));
      let remote;
      try { remote = await decrypt(row.payload); }
      catch (e) { setStatus('error', 'Wrong passphrase? Could not decrypt.'); throw new Error('Decrypt failed — check the passphrase matches your friend\'s.'); }
      const remoteTime = remote.meta && remote.meta.updatedAt || row.updated_at;
      const localTime = JT.store.state.meta.updatedAt;
      if (!localTime || new Date(remoteTime) >= new Date(localTime)) {
        JT.store.applyRemote(remote);
      } else {
        await doPush();   // local is newer
      }
      lastApplied = row.updated_at || '';
    } else {
      // first device for this room — create salt + push
      const salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(cfg.passphrase, salt);
      await doPush(salt);
    }
  }

  function subscribeRealtime() {
    try {
      channel = client.channel('room:' + cfg.room)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: 'room=eq.' + cfg.room },
          () => pullIfNewer())
        .subscribe();
    } catch (e) { /* realtime optional; polling covers it */ }
  }
  function startPolling() {
    pollTimer = setInterval(() => pullIfNewer(), 25000);
  }

  async function pullIfNewer() {
    if (!client) return;
    try {
      const row = await fetchRow();
      if (!row || !row.payload) return;
      if (row.updated_at && row.updated_at === lastApplied) return;
      if (row.updated_by && row.updated_by === deviceTag()) { lastApplied = row.updated_at; return; }
      if (!key) key = await deriveKey(cfg.passphrase, unb64(row.salt));
      const remote = await decrypt(row.payload);
      JT.store.applyRemote(remote);
      lastApplied = row.updated_at || '';
      setStatus('cloud', 'Updated from ' + (remote.meta.lastEditedBy || 'cloud'));
    } catch (e) { console.warn('pull failed', e); }
  }

  // a stable per-device id (NOT the display name) so two people with the
  // same/blank name still see each other's updates. Used only to skip
  // re-pulling our OWN write; display uses meta.lastEditedBy.
  let _device = null;
  function deviceTag() {
    if (_device) return _device;
    try { _device = localStorage.getItem('jt_device'); if (!_device) { _device = 'dev_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('jt_device', _device); } }
    catch (e) { _device = 'dev_' + Math.random().toString(36).slice(2, 10); }
    return _device;
  }

  async function doPush(saltBytes) {
    if (!client || !key && !saltBytes) return;
    try {
      let salt = saltBytes;
      if (!salt) {
        // reuse existing salt from the row so both devices share a key
        const row = await fetchRow();
        if (row && row.salt) { salt = unb64(row.salt); if (!key) key = await deriveKey(cfg.passphrase, salt); }
        else { salt = crypto.getRandomValues(new Uint8Array(16)); key = await deriveKey(cfg.passphrase, salt); }
      } else { /* key already derived by caller */ }

      const payload = await encrypt(JT.store.state);
      const updated_at = new Date().toISOString();
      const { error } = await client.from(TABLE).upsert({
        room: cfg.room, salt: b64(salt), payload, updated_at, updated_by: deviceTag()
      }, { onConflict: 'room' });
      if (error) throw error;
      lastApplied = updated_at;
      setStatus('cloud', 'Synced');
    } catch (e) {
      console.error('push failed', e);
      setStatus('error', e.message || 'Push failed');
    }
  }

  function schedulePush() { if (status === 'cloud' || status === 'connecting') pushSoon(); }

  // quick connection test for the Settings panel
  async function test(s) {
    if (!available()) return { ok: false, msg: 'Supabase library not loaded.' };
    if (!secure()) return { ok: false, msg: 'Needs https (deploy to GitHub Pages first).' };
    try {
      const c = window.supabase.createClient(s.url, s.key, { auth: { persistSession: false } });
      const { error } = await c.from(TABLE).select('room').limit(1);
      if (error) return { ok: false, msg: error.message };
      return { ok: true, msg: 'Connected — table reachable.' };
    } catch (e) { return { ok: false, msg: e.message }; }
  }

  return { init, teardown, schedulePush, test, get status() { return status; }, available, secure };
})();
