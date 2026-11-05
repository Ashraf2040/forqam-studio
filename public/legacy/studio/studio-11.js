
/* ===== SMSRV2: local-server prototype wiring v2 (versioned sync + deck sync) ===== */
// (network transport moved to /legacy/transport.js)

const SM_SERVER = '';

/* --- three-way merge: base = last synced, local = this device, server = fresh server state.
       Safe cases merge automatically; ambiguous or destructive conflicts BLOCK (throw SmMergeConflict). --- */
function smEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function smIsObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function smClone(x) { return x === undefined ? x : JSON.parse(JSON.stringify(x)); }
function SmMergeConflict(path) { this.path = path || ''; }
/* last-writer whitelist: EXACT schema paths only, never global key names.
       currentClass = view preference (root); _updatedAt = doc root stamp;
       questionFiles/<id>/ts = pack import stamp (Date.now at seed/import, not user data). */
const SM_LOCALWINS_PATHS = [/^\/currentClass$/, /^\/_updatedAt$/, /^\/questionFiles\/[^/]+\/ts$/];
function smLocalWins(p) { return SM_LOCALWINS_PATHS.some(r => r.test(p)); }
function smMerge3(base, local, server, path, force) {
    path = path || '';
    if (smEq(local, server)) return smClone(local);
    if (smEq(local, base)) return smClone(server);
    if (smEq(server, base)) return smClone(local);
    if (typeof base === 'number' && typeof local === 'number' && typeof server === 'number') {
        const r = base + (local - base) + (server - base);
        if (!isFinite(r) || r < 0) { if (force) return force === 'mine' ? local : server; throw new SmMergeConflict(path + ' (counter merge out of bounds)'); }
        return r;
    }
    if (base === undefined && smIsObj(local) && smIsObj(server)) base = {};
    if (base === undefined && Array.isArray(local) && Array.isArray(server)) base = [];
    if (smIsObj(base) && smIsObj(local) && smIsObj(server)) {
        const out = {}, keys = {};
        Object.keys(local).forEach(k => keys[k] = 1); Object.keys(server).forEach(k => keys[k] = 1);
        Object.keys(keys).forEach(k => {
            if (smLocalWins(path + '/' + k)) { out[k] = smClone(local[k] !== undefined ? local[k] : server[k]); return; }
            out[k] = smMerge3(base[k], local[k], server[k], path + '/' + k, force);
        });
        return out;
    }
    if (Array.isArray(base) && Array.isArray(local) && Array.isArray(server)) {
        const keyed = a => a.length > 0 && a.every(x => x && typeof x === 'object' && x.id != null);
        if (keyed(base) || keyed(local) || keyed(server)) {
            const bm = {}, lm = {}, smap = {};
            (base || []).forEach(x => { if (x && x.id != null) bm[x.id] = x; });
            (local || []).forEach(x => { if (x && x.id != null) lm[x.id] = x; });
            (server || []).forEach(x => { if (x && x.id != null) smap[x.id] = x; });
            const out = [];
            (server || []).forEach(x => {
                if (!x || x.id == null) return;
                if (!(x.id in lm)) {
                    if (!(x.id in bm)) out.push(x);
                    else if (!smEq(x, bm[x.id])) { if (force) { if (force === 'theirs') out.push(x); } else throw new SmMergeConflict(path + '/' + x.id + ' (edit vs delete)'); }
                } else out.push(smMerge3(bm[x.id], lm[x.id], x, path + '/' + x.id, force));
            });
            (local || []).forEach(x => {
                if (!x || x.id == null) return;
                if (!(x.id in smap) && !(x.id in bm)) out.push(x);
                else if (!(x.id in smap) && (x.id in bm) && !smEq(x, bm[x.id])) { if (force) { if (force === 'mine') out.push(x); } else throw new SmMergeConflict(path + '/' + x.id + ' (delete vs edit)'); }
            });
            return out;
        }
        const hasObj = a => a.some(x => x && typeof x === 'object');
        if (hasObj(base) || hasObj(local) || hasObj(server)) { if (force) return smClone(force === 'mine' ? local : server); throw new SmMergeConflict(path + ' (ambiguous object array without stable ids)'); }
        const inArr = (v, a) => a.some(y => smEq(y, v));
        const out = server.slice();
        local.forEach(v => { if (!inArr(v, base) && !inArr(v, out)) out.push(v); });
        return out.filter(v => !(inArr(v, base) && !inArr(v, local)));
    }
    if (force) return smClone(force === 'mine' ? local : server);
    throw new SmMergeConflict(path);
}
/* --- versioned document sync: compare-and-swap + idempotent mutation ids + rebase on conflict --- */
window.__smDoc = window.__smDoc || {};
function smNewMid() { try { return crypto.randomUUID(); } catch (e) { return 'm' + Date.now() + '-' + Math.random().toString(36).slice(2); } }
/* first load of the server copy failed (offline / 5xx): retry with back-off and hold back PUTs until it succeeds,
   otherwise the first save would be sent against version 0 and raise a false conflict */
function smLoadRetry(key, fn) {
    try {
        const st = window.__smDoc[key] = window.__smDoc[key] || { ver: 0, base: undefined, busy: false, pending: false, retries: 0 };
        st.notLoaded = true;
        const t = (window.__smLoadTry = window.__smLoadTry || {}); t[key] = (t[key] || 0) + 1;
        if (t[key] <= 8) setTimeout(fn, Math.min(30000, 2000 * t[key]));
    } catch (e) {}
}
async function smDocPut(path, getCur, applyMerged, verKey) {
    const st = window.__smDoc[verKey] = window.__smDoc[verKey] || { ver: 0, base: undefined, busy: false, pending: false, retries: 0, blocked: false, blockedNotified: false };
    if (st.blocked) return;
    if (st.notLoaded) { st.dirtyBeforeLoad = true; return; }
    if (st.busy) { st.pending = true; return; }
    st.busy = true;
    const _putStarted = Date.now();
    let ok = false;
    const mid = smNewMid();
    try {
        let ancestor = st.base, ver = st.ver;
        for (let attempt = 0; attempt < 4; attempt++) {
            const cur = smClone(getCur());
            if (cur && typeof cur === 'object') delete cur.pin;
            const r = await smApi(SM_SERVER + path, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.__smToken }, body: JSON.stringify({ data: cur, base_version: ver, mutation_id: mid }) });
            if (r.ok) {
                const j = await r.json();
                st.ver = j.version; st.base = smClone(cur); ok = true; st.retries = 0; st.blocked = false; st.blockedNotified = false;
                try { const _pp = smLoadPending(verKey); if (_pp && (_pp.at || 0) <= _putStarted) smClearPending(verKey); } catch (e) {}
                break;
            }
            if (r.status === 409) {
                const j = await r.json();
                if (j && j.quota) {
                    if (!st.quotaNotified) {
                        st.quotaNotified = true;
                        try { if (typeof smShellToast === 'function') smShellToast('⚠️ حد ملفات الأسئلة ٥ ملفات — الملف الزائد محفوظ على هذا الجهاز فقط. احذف ملفًا من المكتبة ليستأنف التزامن.'); else if (typeof showToast === 'function') showToast('⚠️ حد ملفات الأسئلة ٥ ملفات — الملف الزائد محفوظ على هذا الجهاز فقط.'); } catch (x) {}
                    }
                    break;
                }
                const serverData = j.data === null || j.data === undefined ? undefined : j.data;
                let merged;
                try { merged = smMerge3(ancestor, cur, serverData); }
                catch (e) {
                    if (e instanceof SmMergeConflict) {
                        st.blocked = true;
                        smSavePending(verKey, { path: path, at: Date.now(), acct: (window.__smT || window.currentTeacher || 'anon'), local: smClone(cur), server: smClone(serverData), base: smClone(ancestor), version: ver, errPath: e.path || '' });
                        try { smShowConflictUi(verKey); } catch (x) {}
                        try { console.warn('SMOKEP|syncBlocked|INFO|' + path + ' at ' + (e.path || 'root')); } catch (x) {}
                        if (!st.blockedNotified) {
                            st.blockedNotified = true;
                            try { if (typeof showToast === 'function') showToast('⚠️ A conflicting change was kept on this device only - sync paused for safety'); } catch (x) {}
                        }
                        break;
                    }
                    throw e;
                }
                ancestor = serverData; ver = j.version || 0;
                try { applyMerged(merged); } catch (e) { try { console.warn("SMOKEP|applyMergedErr|" + verKey + "|" + (e && e.message)); } catch (x) {} }
                continue;
            }
            break;
        }
    } catch (e) {}
    st.busy = false;
    if (st.blocked) return;
    if (st.pending) { st.pending = false; setTimeout(() => smDocPut(path, getCur, applyMerged, verKey), 500); }
    else if (!ok) { st.retries = (st.retries || 0) + 1; if (st.retries <= 5) setTimeout(() => smDocPut(path, getCur, applyMerged, verKey), 3000); }
}

/* --- durable pending conflicts: a blocked change is stored on this device and re-surfaced
       after reload; teacher resolves it with an explicit keep-mine / keep-other choice. --- */
function smPendKey(verKey) { const acct = window.__smT || window.currentTeacher || 'anon'; try { return smk7('SGE_PEND_' + verKey + '_' + acct); } catch (e) { return 'SM7_PEND_' + verKey + '_' + acct; } }
function smSavePending(verKey, p) { try { localStorage.setItem(smPendKey(verKey), JSON.stringify(p)); } catch (e) {} try { smPendIdbPut(verKey, p); } catch (e) {} }
function smLoadPending(verKey) { try { const s = localStorage.getItem(smPendKey(verKey)); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
/* durable pend mirror: IndexedDB commits land far sooner than buffered localStorage writes, narrowing the hard-crash loss window. All mirror writes are serialized through one in-page queue so a later clear can never be overwritten by an earlier queued put. */
function smPendIdbOpen() { return new Promise(function (res) { try { const rq = indexedDB.open(smk7('SGE_PEND_IDB'), 1); rq.onupgradeneeded = function () { try { rq.result.createObjectStore('pend'); } catch (e) {} }; rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { res(null); }; rq.onblocked = function () { res(null); }; } catch (e) { res(null); } }); }
function smPendIdbKey(verKey) { const acct = window.__smT || window.currentTeacher || 'anon'; return verKey + '|' + acct; }
function smPendIdbEnqueue(job) { try { const q = window.__smPendIdbQ = (window.__smPendIdbQ || Promise.resolve()); const n = q.then(function () { return job(); }, function () { return job(); }); window.__smPendIdbQ = n.catch(function () {}); } catch (e) {} }
function smPendIdbPut(verKey, p) { smPendIdbEnqueue(async function () { try { const db = await smPendIdbOpen(); if (!db) return; await new Promise(function (res) { try { const tx = db.transaction('pend', 'readwrite'); tx.objectStore('pend').put(p, smPendIdbKey(verKey)); tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); }; tx.onabort = function () { res(); }; } catch (e) { res(); } }); try { db.close(); } catch (e) {} } catch (e) {} }); }
function smPendIdbDel(verKey) { smPendIdbEnqueue(async function () { try { const db = await smPendIdbOpen(); if (!db) return; await new Promise(function (res) { try { const tx = db.transaction('pend', 'readwrite'); tx.objectStore('pend').delete(smPendIdbKey(verKey)); tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); }; tx.onabort = function () { res(); }; } catch (e) { res(); } }); try { db.close(); } catch (e) {} } catch (e) {} }); }
async function smPendIdbGet(verKey) { try { const db = await smPendIdbOpen(); if (!db) return null; const v = await new Promise(function (res) { try { const tx = db.transaction('pend', 'readonly'); const g = tx.objectStore('pend').get(smPendIdbKey(verKey)); g.onsuccess = function () { res(g.result || null); }; g.onerror = function () { res(null); }; } catch (e) { res(null); } }); try { db.close(); } catch (e) {} return v; } catch (e) { return null; } }
function smClearPending(verKey) { try { localStorage.removeItem(smPendKey(verKey)); } catch (e) {} try { smPendIdbDel(verKey); } catch (e) {} }
function smShowConflictUi(verKey) {
    try {
        const ex = document.getElementById('smConflictBar'); if (ex) ex.remove();
        const bar = document.createElement('div');
        bar.id = 'smConflictBar';
        bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#7c2d12;color:#fff;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:14px;direction:rtl;box-shadow:0 -2px 8px rgba(0,0,0,.3)';
        const msg = document.createElement('span');
        msg.textContent = 'يوجد تعديل متعارض من جهاز آخر. تعديلك محفوظ على هذا الجهاز والمزامنة متوقفة حتى تختار:';
        const bMine = document.createElement('button'); bMine.textContent = 'احتفظ بتعديلي';
        const bTheirs = document.createElement('button'); bTheirs.textContent = 'احتفظ بالتعديل الآخر';
        bMine.style.cssText = 'padding:6px 14px;border:0;border-radius:6px;cursor:pointer;font-weight:bold;background:#16a34a;color:#fff';
        bTheirs.style.cssText = 'padding:6px 14px;border:0;border-radius:6px;cursor:pointer;font-weight:bold;background:#fff;color:#7c2d12';
        bMine.onclick = () => smResolveConflict(verKey, 'mine');
        bTheirs.onclick = () => smResolveConflict(verKey, 'theirs');
        bar.appendChild(msg); bar.appendChild(bMine); bar.appendChild(bTheirs);
        document.body.appendChild(bar);
    } catch (e) {}
}
async function smResolveConflict(verKey, choice) {
    const st = window.__smDoc[verKey]; if (!st) return;
    const pend = smLoadPending(verKey);
    const info = (window.__smDocResolvers || {})[verKey]; if (!info) return;
    const done = () => { const b = document.getElementById('smConflictBar'); if (b) b.remove(); st.blocked = false; st.blockedNotified = false; };
    if (!pend) { done(); return; }
    let fresh, freshVer = 0;
    try {
        const r0 = await smApi(info.url, { headers: { Authorization: 'Bearer ' + window.__smToken } });
        const j0 = await r0.json();
        fresh = (j0.data === null || j0.data === undefined) ? undefined : j0.data; freshVer = j0.version || 0;
    } catch (e) { try { showToast('⚠️ تعذر الوصول للخادم، حاول مرة أخرى'); } catch (x) {} return; }
    /* rebase: merge the device's kept doc with the LATEST server doc; the teacher's choice wins
       only at the conflicted paths - unrelated newer changes from other devices merge in. */
    let merged;
    try { merged = smMerge3(pend.base, pend.local, fresh, '', choice); }
    catch (e) { merged = (choice === 'mine') ? smClone(pend.local) : smClone(fresh); }
    if (choice === 'theirs' && smEq(merged, fresh)) {
        try { info.apply(smClone(fresh)); } catch (e) {}
        smClearPending(verKey); st.ver = freshVer; st.base = smClone(fresh); done();
        try { info.saveLocal(); } catch (e) {}
        try { showToast('تم الاحتفاظ بالتعديل الآخر'); } catch (e) {}
        return;
    }
    try {
        const r = await smApi(info.url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.__smToken },
            body: JSON.stringify({ base_version: freshVer, mutation_id: smNewMid(), data: merged }) });
        if (r.status === 409) {
            /* server moved again after the choice: do NOT retry blindly - re-pend with the fresh snapshots */
            const jj = await r.json().catch(() => ({}));
            smSavePending(verKey, { path: pend.path, at: Date.now(), local: smClone(merged), server: (jj.data === undefined ? smClone(fresh) : jj.data), base: smClone(fresh), version: jj.version || freshVer, errPath: pend.errPath || '' });
            try { showToast('⚠️ تغيرت البيانات من جهاز آخر أثناء الحل - راجع التعارض مرة أخرى'); } catch (x) {}
            return;
        }
        if (!r.ok) { try { showToast('⚠️ تعذر الحفظ، حاول مرة أخرى'); } catch (x) {} return; }
        const j = await r.json();
        try { info.apply(smClone(merged)); } catch (e) {}
        smClearPending(verKey); st.ver = j.version || freshVer; st.base = smClone(merged); done();
        try { info.saveLocal(); } catch (e) {}
        try { showToast(choice === 'mine' ? '✅ تم حفظ تعديلك' : 'تم الاحتفاظ بالتعديل الآخر'); } catch (e) {}
    } catch (e) { try { showToast('⚠️ تعذر الحفظ، حاول مرة أخرى'); } catch (x) {} }
}

function smStudioApply(merged) {
    if (!merged || typeof merged !== 'object') return;
    Object.keys(appState).forEach(k => { delete appState[k]; });
    Object.assign(appState, smClone(merged));
    try { renderAllDashboard(); } catch (e) {}
}
window.__smDocResolvers = window.__smDocResolvers || {};
window.__smDocResolvers.studio = { url: SM_SERVER + '/api/studio/me', apply: smStudioApply, saveLocal: function () { try { syncStudioData(); } catch (e) {} } };
window.smServerStudioLoad = async function () {
    if (window.__smRole !== 'teacher' || !window.__smToken) return;
    /* roster race guard: if the Behavior Portal already pushed the shared roster, the studio's own
       server copy is stale for classes/currentClass - never let it overwrite the merged roster. */
    const __rs = window.__smRosterMerged ? { classes: smClone(appState.classes || {}), currentClass: appState.currentClass } : null;
    try {
        const r = await smApi(SM_SERVER + '/api/studio/me', { headers: { Authorization: 'Bearer ' + window.__smToken } });
        if (!r.ok) { smLoadRetry('studio', window.smServerStudioLoad); return; } const j = await r.json();
        const st = window.__smDoc.studio = window.__smDoc.studio || { ver: 0, base: undefined, busy: false, pending: false, retries: 0 };
        st.notLoaded = false;
        let pend = smLoadPending('studio'); if (!pend) { try { pend = await smPendIdbGet('studio'); if (pend && pend.local) { try { localStorage.setItem(smPendKey('studio'), JSON.stringify(pend)); } catch (e) {} } } catch (e) {} }
        if (pend && pend.local && window.__smT && (pend.acct || 'anon') === (window.__smT || 'anon')) {
            if (j.data && pend.base === undefined) {
                try { Object.keys(appState).forEach(k => { delete appState[k]; }); Object.assign(appState, smClone(j.data)); } catch (e) {}
                st.ver = j.version || 0; st.base = smClone(appState); if (st.base && typeof st.base === 'object') delete st.base.pin;
                try { smClearPending('studio'); } catch (e) {}
            } else if ((pend.version || 0) === (j.version || 0)) {
                try { Object.keys(appState).forEach(k => { delete appState[k]; }); Object.assign(appState, smClone(pend.local)); } catch (e) {}
                st.ver = j.version || 0; st.base = smClone(pend.base !== undefined ? pend.base : j.data);
                st.replay = true;
            } else {
                try {
                    const _m = smMerge3(smClone(pend.base), smClone(pend.local), smClone(j.data), '', 'theirs');
                    Object.keys(appState).forEach(k => { delete appState[k]; }); Object.assign(appState, _m);
                    st.ver = j.version || 0; st.base = smClone(j.data);
                    st.replay = true;
                } catch (e) {
                    if (j.data) { try { Object.keys(appState).forEach(k => { delete appState[k]; }); Object.assign(appState, smClone(j.data)); } catch (e2) {} }
                    st.ver = j.version || 0; st.base = smClone(appState); if (st.base && typeof st.base === 'object') delete st.base.pin;
                    st.blocked = true;
                }
            }
        } else {
            st.ver = j.version || 0;
            if (j.data) { try { Object.assign(appState, j.data); } catch (e) {} }
            st.base = smClone(appState); if (st.base && typeof st.base === 'object') delete st.base.pin;
        }
        if (__rs && __rs.classes && Object.keys(__rs.classes).length) { try { appState.classes = __rs.classes; if (__rs.currentClass) appState.currentClass = __rs.currentClass; } catch (e) {} }
        try { renderAllDashboard(); } catch (e) {}
        try { smOrigSyncStudioData(); } catch (e) {}
        if (st.replay || st.dirtyBeforeLoad) { st.replay = false; st.dirtyBeforeLoad = false; try { smDocPut('/api/studio/me', () => appState, smStudioApply, 'studio'); } catch (e) {} }
    } catch (e) {}
};
let __smStudioTimer = null;
const smOrigSyncStudioData = syncStudioData;
syncStudioData = function () {
    smOrigSyncStudioData();
    if (window.__smRole === 'teacher' && window.__smToken) {
        clearTimeout(__smStudioTimer); __smStudioTimer = setTimeout(() => {
            smDocPut('/api/studio/me', () => appState, smStudioApply, 'studio');
        }, 800);
        try { const _ss = (window.__smDoc = window.__smDoc || {}).studio || {}; if (_ss.base !== undefined) smSavePending('studio', { path: '/api/studio/me', at: Date.now(), acct: (window.__smT || 'anon'), local: smClone(appState), base: smClone(_ss.base), version: _ss.ver || 0 }); } catch (e) {}
    }
};
function smFlushStudioSync() { try { if (__smStudioTimer) { clearTimeout(__smStudioTimer); __smStudioTimer = null; if (window.__smRole === 'teacher' && window.__smToken) smDocPut('/api/studio/me', () => appState, smStudioApply, 'studio'); } } catch (e) {} }
window.addEventListener('pagehide', smFlushStudioSync);
/* resume: retries used to stop after ~15s offline; now reconnect (or a 30s heartbeat) re-sends any unsynced local journal */
function smResumeStudio() {
    try {
        { const s0 = window.__smDoc && window.__smDoc.studio; if (s0 && s0.notLoaded && window.smServerStudioLoad) { window.smServerStudioLoad(); return; } }
        if (window.__smRole === 'teacher' && window.__smToken && typeof smLoadPending === 'function' && smLoadPending('studio')) {
            const s = window.__smDoc && window.__smDoc.studio;
            if (s && !s.busy && !s.blocked) { s.retries = 0; smDocPut('/api/studio/me', () => appState, smStudioApply, 'studio'); }
        }
        if (typeof smDeckSync === 'function') smDeckSync();
    } catch (e) {}
}
window.addEventListener('online', smResumeStudio);
setInterval(smResumeStudio, 30000);
document.addEventListener('visibilitychange', function () { try { if (document.visibilityState === 'hidden') smFlushStudioSync(); } catch (e) {} });

/* --- deck sync: union of immutable decks + tombstone deletes, event-driven --- */
async function smBlobToB64(blob) {
    const buf = await blob.arrayBuffer(); const u = new Uint8Array(buf);
    let bin = ''; for (let i = 0; i < u.length; i += 32768) bin += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(bin);
}
function smShellToast(msg) {
    try {
        let t = document.getElementById('smShellToast');
        if (!t) {
            t = document.createElement('div'); t.id = 'smShellToast';
            t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:14px 22px;border-radius:14px;font:700 15px/1.6 system-ui,Tahoma,sans-serif;z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,.4);max-width:min(560px,92vw);text-align:center;direction:rtl;display:none';
            document.body.appendChild(t);
        }
        t.textContent = msg; t.style.display = 'block';
        clearTimeout(window.__smShellToastT);
        window.__smShellToastT = setTimeout(() => { t.style.display = 'none'; }, 8000);
    } catch (e) {}
}
function smDeckQuotaBlocked() { try { return JSON.parse(localStorage.getItem(smk7('SGE_SS_DECK_QBLOCK')) || '[]'); } catch (e) { return []; } }
function smDeckQuotaBlockedSet(t) { try { localStorage.setItem(smk7('SGE_SS_DECK_QBLOCK'), JSON.stringify(t)); } catch (e) {} }
function smDeckQuotaBlockedAdd(id) { const t = smDeckQuotaBlocked(); if (t.indexOf(id) === -1) { t.push(id); smDeckQuotaBlockedSet(t); } }
function smDeckQuotaBlockedDrop(id) { smDeckQuotaBlockedSet(smDeckQuotaBlocked().filter(x => x !== id)); }
function smDeckReadded() { try { return JSON.parse(localStorage.getItem(smk7('SGE_SS_DECK_READDED')) || '[]'); } catch (e) { return []; } }
function smDeckReaddedSet(t) { try { localStorage.setItem(smk7('SGE_SS_DECK_READDED'), JSON.stringify(t)); } catch (e) {} }
function smDeckReaddedDrop(id) { smDeckReaddedSet(smDeckReadded().filter(x => x !== id)); }
let __smDeckTimer = null, __smDeckBusy = false, __smDeckAgain = false;
function smDeckSyncSoon() { clearTimeout(__smDeckTimer); __smDeckTimer = setTimeout(smDeckSync, 1000); }
window.smDeckSync = async function () {
    if (window.__smRole !== 'teacher' || !window.__smToken) return;
    if (__smDeckBusy) { __smDeckAgain = true; return; }
    __smDeckBusy = true;
    try {
        const H = { Authorization: 'Bearer ' + window.__smToken };
        const lr = await smApi(SM_SERVER + '/api/decks', { headers: H });
        if (!lr.ok) return;
        const remote = (await lr.json()).decks || [];
        const rmap = {}; remote.forEach(d => rmap[d.id] = d);
        if (remote.filter(d => !d.deleted).length < 5) { smDeckQuotaBlockedSet([]); window.__smDeckQuotaToasted = false; }
        const tombs = ssDeckTomb();
        for (const id of tombs) {
            if (rmap[id] && !rmap[id].deleted) {
                try { await smApi(SM_SERVER + '/api/decks/' + encodeURIComponent(id), { method: 'DELETE', headers: H }); rmap[id].deleted = true; } catch (e) {}
            }
        }
        const recs = await ssIdbAll();
        const readded = smDeckReadded();
        for (const r of recs) {
            if (tombs.indexOf(r.id) !== -1) continue;
            if (smDeckQuotaBlocked().indexOf(r.id) !== -1) continue;
            if (!rmap[r.id] || (rmap[r.id].deleted && readded.indexOf(r.id) !== -1)) {
                // new deck, or explicit local re-import of a school-deleted deck (never a passive copy)
                try {
                    const b64 = await smBlobToB64(r.blob);
                    const pr = await smApi(SM_SERVER + '/api/decks/' + encodeURIComponent(r.id), { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + window.__smToken }, body: JSON.stringify({ name: r.name, b64: b64 }) });
                    if (pr.ok) { rmap[r.id] = { id: r.id, deleted: false }; smDeckReaddedDrop(r.id); smDeckQuotaBlockedDrop(r.id); }
                    else if (pr.status === 409) {
                        smDeckQuotaBlockedAdd(r.id);
                        if (!window.__smDeckQuotaToasted) { window.__smDeckQuotaToasted = true; smShellToast('⚠️ مكتبة العروض على الخادم ممتلئة (٥ ملفات). الملف "' + r.name + '" محفوظ على هذا الجهاز فقط — احذف ملفًا من المكتبة ليتزامن.'); }
                    }
                } catch (e) {}
            }
        }
        let pulled = false;
        for (const d of remote) {
            if (d.deleted) { await ssIdbDel(d.id); smDeckReaddedDrop(d.id); continue; }
            if (tombs.indexOf(d.id) !== -1) continue;
            if (!recs.some(r => r.id === d.id)) {
                try {
                    const g = await smApi(SM_SERVER + '/api/decks/' + encodeURIComponent(d.id), { headers: H });
                    if (!g.ok) continue; const gj = await g.json();
                    await ssIdbPut({ id: gj.id, name: gj.name, blob: ssB64Blob(gj.b64, SS_DECK_MIME) });
                    pulled = true;
                } catch (e) {}
            }
        }
        if (pulled) await ssDecksToLibrary();
    } catch (e) {}
    __smDeckBusy = false;
    if (__smDeckAgain) { __smDeckAgain = false; smDeckSyncSoon(); }
};
(function () {
    const _put = ssIdbPut, _del = ssIdbDel, _add = ssAddDecks;
    ssIdbPut = function (rec) { const p = _put(rec); if (!__smDeckBusy) smDeckSyncSoon(); return p; };
    ssIdbDel = function (id) { const p = _del(id); if (!__smDeckBusy) smDeckSyncSoon(); return p; };
    ssAddDecks = function (decks, quiet) {
        const t = smDeckReadded();
        (decks || []).forEach(d => { if (d && d.id && t.indexOf(d.id) === -1) t.push(d.id); });
        smDeckReaddedSet(t);
        return _add.apply(this, arguments);
    };
    (function boot() { if (window.__smToken) { if (window.__smRole === 'teacher') smDeckSync(); return; } setTimeout(boot, 1500); })();
})();
