/* ============================================================
   util.js — small helpers shared across the app (JT.util)
   ============================================================ */
window.JT = window.JT || {};
JT.util = (function () {

  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const nowISO = () => new Date().toISOString();

  /* ---- DOM ---- */
  // el('div.card#x', {onclick}, [children|strings])
  function el(sel, attrs, kids) {
    const m = sel.match(/^([a-z0-9]+)/i);
    const tag = m ? m[1] : 'div';
    const node = document.createElement(tag);
    const id = sel.match(/#([\w-]+)/); if (id) node.id = id[1];
    const cls = sel.match(/\.([\w.-]+)/g); if (cls) node.className = cls.map(c => c.slice(1)).join(' ');
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') for (const d in v) node.dataset[d] = v[d];
      else node.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(k => {
      if (k == null || k === false) return;
      node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    });
    return node;
  }
  const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---- Dates / countdowns ---- */
  const DAY = 86400000;
  function parseDate(s) { if (!s) return null; const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; }
  function fmtDate(s, opts) {
    const d = parseDate(s); if (!d) return '';
    return d.toLocaleDateString(undefined, opts || { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtDateLong(s) { return fmtDate(s, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
  function dowShort(s) { const d = parseDate(s); return d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : ''; }
  // whole days from today (local midnight) to the date
  function daysUntil(s) {
    const d = parseDate(s); if (!d) return null;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const t1 = new Date(d); t1.setHours(0, 0, 0, 0);
    return Math.round((t1 - t0) / DAY);
  }
  function countdownLabel(s) {
    const n = daysUntil(s); if (n == null) return { n: '–', unit: '', cls: '' };
    if (n < 0) return { n: Math.abs(n), unit: 'days ago', cls: 'past' };
    if (n === 0) return { n: 'today', unit: '', cls: 'warn' };
    if (n === 1) return { n: 1, unit: 'day', cls: 'warn' };
    return { n, unit: 'days', cls: n <= 30 ? 'warn' : '' };
  }
  // list of YYYY-MM-DD strings between two inclusive
  function dateRange(startISO, endISO) {
    const out = []; const s = parseDate(startISO), e = parseDate(endISO);
    if (!s || !e) return out;
    for (let d = new Date(s); d <= e; d = new Date(d.getTime() + DAY)) out.push(d.toISOString().slice(0, 10));
    return out;
  }
  function relTime(iso) {
    const d = parseDate(iso); if (!d) return '';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return fmtDate(iso, { month: 'short', day: 'numeric' });
  }

  /* ---- Money ---- */
  function money(n, cur) {
    if (n == null || n === '' || isNaN(n)) return '—';
    cur = cur || 'JPY';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: cur === 'JPY' ? 0 : 2 }).format(n); }
    catch (e) { return (cur === 'JPY' ? '¥' : '') + Number(n).toLocaleString(); }
  }

  /* ---- misc ---- */
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const by = (key) => (a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0);
  const tagList = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const isUrl = (s) => /^https?:\/\/\S+$/i.test(String(s || '').trim());
  function domainOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function readFile(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
  }

  return {
    uid, nowISO, el, clear, escapeHtml,
    parseDate, fmtDate, fmtDateLong, dowShort, daysUntil, countdownLabel, dateRange, relTime,
    money, debounce, by, tagList, isUrl, domainOf, download, readFile, DAY
  };
})();
