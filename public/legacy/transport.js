// === Alforqan - Studio transport (Next.js API routes + NextAuth session cookie) ===
// Same smApi(path, opts) -> Promise<Response> contract as before. Requests go to this site's own
// /api/* routes; the signed-in session is the NextAuth HTTP-only cookie (no token is kept in JavaScript).
window.__smUserName = window.__smUserName || null;
window.__smSchoolId = window.__smSchoolId || null;
function smFetch(url, init, ms) {
  init = init || {};
  const ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const t = ac ? setTimeout(function () { try { ac.abort(); } catch (e) {} }, ms || 30000) : null;
  if (ac) init = Object.assign({}, init, { signal: ac.signal });
  return fetch(url, init).then(function (r) { if (t) clearTimeout(t); return r; },
                               function (e) { if (t) clearTimeout(t); throw e; });
}
window.addEventListener('message', function (e) {
  const d = e && e.data;
  if (d && d.t === 'session') {
    if (d.name) window.__smUserName = d.name;
    if (d.token && !window.__smToken) window.__smToken = d.token;
    if (d.school_id) window.__smSchoolId = d.school_id;
  }
});
function smOffline() {
  return new Response(JSON.stringify({ error: 'network error', offline: true }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
function smJ(obj, status) {
  return new Response(JSON.stringify(obj), { status: status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
async function smApiRaw(path, opts) {
  opts = opts || {};
  const method = (opts.method || 'GET').toUpperCase();
  const base = new URL('/', document.baseURI).href.replace(/\/$/, '');
  try {
    const init = { method: method, credentials: 'same-origin', cache: 'no-store' };
    if (opts.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = opts.body;
      init.headers = { 'Content-Type': 'application/json' };
    }
    return await smFetch(base + path, init, path.indexOf('/api/decks/') === 0 ? 180000 : 30000);
  } catch (e) {
    // NEVER report a network failure as success: callers treat r.ok as 'saved'.
    return smOffline();
  }
}

/* Session guard: a 401 on an authenticated call means the 12h session expired (or the PIN was
   reset / account removed). Say so loudly instead of failing silently - local data is kept and
   re-synced after signing in again. */
function smSessionExpired() {
  try {
    if (window.__smExpiredShown) return;
    window.__smExpiredShown = true;
    const bar = document.createElement('div');
    bar.id = 'smExpiredBar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100000;background:#991b1b;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font:700 14px/1.5 system-ui,Tahoma,sans-serif;direction:rtl;box-shadow:0 2px 8px rgba(0,0,0,.35)';
    const m = document.createElement('span');
    m.textContent = 'انتهت جلسة الدخول (أو تم تغيير الرقم السري). تعديلاتك محفوظة على هذا الجهاز ولن تضيع - سجّلي الدخول من جديد ليكتمل الحفظ على الخادم.';
    const b = document.createElement('button');
    b.textContent = 'تسجيل الدخول من جديد';
    b.style.cssText = 'padding:6px 14px;border:0;border-radius:6px;cursor:pointer;font-weight:bold;background:#fff;color:#991b1b';
    b.onclick = function () { try { if (window.parent && window.parent !== window) window.parent.postMessage({ t: 'signout' }, '*'); else location.reload(); } catch (e) { location.reload(); } };
    bar.appendChild(m); bar.appendChild(b);
    (document.body || document.documentElement).appendChild(bar);
  } catch (e) {}
}
async function smApi(path, opts) {
  let r;
  try { r = await smApiRaw(path, opts); }
  catch (e) { r = smOffline(); }
  try {
    if (r && r.status === 401 && window.__smToken && path !== '/api/login' && path !== '/api/enroll-school') smSessionExpired();
  } catch (e) {}
  return r;
}
// === end transport ===
