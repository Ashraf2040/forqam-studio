
// ===== merged build: data layer, sync, admin (no real names / PINs / admins in this file) =====
const SM_DEMO = { "DEMO CLASS": SCHOOL_CLASSES["DEMO CLASS"].slice() };
Object.keys(SCHOOL_CLASSES).forEach(k => delete SCHOOL_CLASSES[k]);   // filled at runtime from the device data
function smDBKey(){return smk7('SMART_PORTAL_GENERAL_DB');}
const smNorm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
let smApplying = false, smReady = false, smSeq = 0, smTm = null;

/* ---------- SMStore: the only place that reads/writes saved data ----------
   Shape (same as the portal): { [teacher]: { subject, currentClass, _v, _updatedAt,
        classes: { [className]: { students:[{id,name}], scores:{[studentId]:{[behaviorId]:count}}, history, ... } } } }
   Local adapter now; a server adapter (Supabase/Firebase) would implement the same methods.
   Safety rules: never write an empty roster over a non-empty one; every write bumps _v and _updatedAt;
   a backup is kept before bulk operations. */
const SMStore = {
    adapter: 'local',
    newId() { return Date.now() * 100 + (smSeq++ % 100); },
    countStudents(t) { return Object.values((t && t.classes) || {}).reduce((a, c) => a + ((c.students || []).length), 0); },
    countAwards(t) { let n = 0; Object.values((t && t.classes) || {}).forEach(c => Object.values(c.scores || {}).forEach(s => Object.values(s).forEach(v => n += v))); return n; },
    readAll() { try { return JSON.parse(getStore(smDBKey()) || '{}'); } catch (e) { return {}; } },
    backup(tag) { try { setStore(smk7('SGE_SM_BACKUP_' + (tag || 'LATEST')), getStore(smDBKey()) || '{}'); } catch (e) {} },
    saveTeacher(name, obj) {
        const stored = this.readAll()[name];
        if (stored && this.countStudents(stored) > 0 && this.countStudents(obj) === 0) { this.backup('BLOCKED_EMPTY'); return false; }
        obj._v = (obj._v || 0) + 1; obj._updatedAt = new Date().toISOString();
        globalData[name] = obj; setStore(smDBKey(), JSON.stringify(globalData)); return true;
    },
    saveAll() { setStore(smDBKey(), JSON.stringify(globalData)); }
};
function smRebuildSchool() {
    Object.keys(SCHOOL_CLASSES).forEach(k => delete SCHOOL_CLASSES[k]);
    Object.keys(globalData).forEach(t => {
        if (ADMINS.includes(t) || !(t in TEACHER_PINS)) return;
        const cl = globalData[t].classes || {};
        Object.keys(cl).forEach(c => { const set = SCHOOL_CLASSES[c] || (SCHOOL_CLASSES[c] = []); (cl[c].students || []).forEach(s => { if (!set.includes(s.name)) set.push(s.name); }); });
    });
}
function getTeacherRoleTitle(n) { return ADMINS.includes(n) ? 'Administrator' : 'Subject Teacher'; }
function populateAllSchoolClasses(tObj) {
    const base = Date.now(); if (!tObj.classes) tObj.classes = {};
    const demo = (currentTeacher === 'Teacher');
    const src = demo ? SM_DEMO : { "My Class": [] };
    Object.keys(src).forEach((c, ci) => { if (!tObj.classes[c]) tObj.classes[c] = { students: src[c].map((n, i) => ({ id: base + ci * 100 + i, name: n })), scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} }; });
    tObj.currentClass = Object.keys(tObj.classes)[0];
}
function smApplyRegistry(reg) {
    Object.keys(TEACHER_PINS).forEach(k => delete TEACHER_PINS[k]); ADMINS.length = 0; window.__smRoles = {};
    Object.keys(reg || {}).forEach(n => { TEACHER_PINS[n] = reg[n].pin; DEFAULT_TEACHER_SUBJECTS[n] = reg[n].subject || 'Science'; window.__smRoles[n] = reg[n].role || 'teacher'; if (reg[n].role === 'admin') ADMINS.push(n); });
}
function smRegOp(o) { window.parent.postMessage(Object.assign({ t: 'registryOp' }, o), '*'); }
function smDownload(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

/* ===== SMFULL1 v2: full local backup & tested restore (additive; SMPKG1 package flows unchanged). Strict allowlist of THIS edition's keys; credentials are NEVER included. ===== */
function smBackupKeys(){return [smk7('SMART_PORTAL_GENERAL_DB'), smk7('SMART_PORTAL_GENERAL_USER'), smk7('SMART_STUDIO_GENERAL_PRO'), 'SM7_SGE_SM_LAST_TEACHER', 'SM7_SGE_SM_BHV_FAB', smk7('SGE_SM_FT_LEVEL'), smk7('SGE_SM_PK_LEVEL'), smk7('SGE_SM_PRES_FOCUS'), smk7('SGE_SM_PRES_STATE'), smk7('SGE_SS_DECK_DELETED'), smk7('SGE_SS_DECK_SLIDE'), smk7('SGE_SS_GFX_Q'), smk7('SGE_SS_TC_NAMES')];}
const SM_SECRET_FIELDS = ['pin', 'password', 'passcode', 'secret', 'token'];
function smSafetyDb(){return smk7('SGE_SM_SAFETY_DB');}
const SM_BACKUP_MAX_BYTES = 524288000;
function smBlobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
function smDeepStripSecrets(v) {
    if (Array.isArray(v)) { for (const x of v) smDeepStripSecrets(x); return v; }
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) { if (SM_SECRET_FIELDS.indexOf(String(k).toLowerCase()) >= 0) { try { delete v[k]; } catch (e) {} } else smDeepStripSecrets(v[k]); } }
    return v;
}
function smStripLsValue(v) { try { const o = JSON.parse(v); smDeepStripSecrets(o); return JSON.stringify(o); } catch (e) { return v; } }
function smIdbAllRecs(dbName, store) { return new Promise((res) => { try { const r = indexedDB.open(dbName, 1); r.onupgradeneeded = () => { try { r.result.createObjectStore(store, { keyPath: 'id' }); } catch (e) {} }; r.onsuccess = () => { try { const q = r.result.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); } catch (e) { res([]); } }; r.onerror = () => res([]); } catch (e) { res([]); } }); }
function smIdbCursorKV(dbName, store) { return new Promise((res) => { try { const r = indexedDB.open(dbName, 1); r.onupgradeneeded = () => { try { r.result.createObjectStore(store); } catch (e) {} }; r.onsuccess = () => { const out = []; try { const q = r.result.transaction(store, 'readonly').objectStore(store).openCursor(); q.onsuccess = () => { const c = q.result; if (c) { out.push({ k: c.key, v: c.value }); c.continue(); } else res(out); }; q.onerror = () => res(out); } catch (e) { res(out); } }; r.onerror = () => res([]); } catch (e) { res([]); } }); }
function smIdbPut(dbName, store, rec, key) { return new Promise((res) => { try { const r = indexedDB.open(dbName, 1); r.onupgradeneeded = () => { try { r.result.createObjectStore(store, key === undefined ? { keyPath: 'id' } : undefined); } catch (e) {} }; r.onsuccess = () => { try { const tx = r.result.transaction(store, 'readwrite'); if (key === undefined) tx.objectStore(store).put(rec); else tx.objectStore(store).put(rec, key); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); } }; r.onerror = () => res(false); } catch (e) { res(false); } }); }
function smIdbOpenStore(dbName, store, keyPath) { return new Promise((res) => {
    try {
        const r0 = indexedDB.open(dbName);
        r0.onupgradeneeded = () => { try { if (!r0.result.objectStoreNames.contains(store)) r0.result.createObjectStore(store, keyPath ? { keyPath: keyPath } : undefined); } catch (e) {} };
        r0.onsuccess = () => { const db = r0.result; if (db.objectStoreNames.contains(store)) { res(db); return; } try { const v = db.version + 1; db.close(); const r2 = indexedDB.open(dbName, v); r2.onupgradeneeded = () => { try { r2.result.createObjectStore(store, keyPath ? { keyPath: keyPath } : undefined); } catch (e) {} }; r2.onsuccess = () => res(r2.result); r2.onerror = () => res(null); r2.onblocked = () => res(null); } catch (e) { res(null); } };
        r0.onerror = () => res(null);
    } catch (e) { res(null); }
}); }
async function smIdbPut2(dbName, store, rec, useKey, keyPath) { const db = await smIdbOpenStore(dbName, store, keyPath); if (!db) return false; return new Promise((res) => { const done = (ok) => { try { db.close(); } catch (e) {} res(ok); }; try { const tx = db.transaction(store, 'readwrite'); if (useKey === undefined) tx.objectStore(store).put(rec); else tx.objectStore(store).put(rec, useKey); tx.oncomplete = () => done(true); tx.onerror = () => done(false); tx.onabort = () => done(false); } catch (e) { done(false); } }); }
async function smIdbClear2(dbName, store, keyPath) { const db = await smIdbOpenStore(dbName, store, keyPath); if (!db) return false; return new Promise((res) => { const done = (ok) => { try { db.close(); } catch (e) {} res(ok); }; try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).clear(); tx.oncomplete = () => done(true); tx.onerror = () => done(false); tx.onabort = () => done(false); } catch (e) { done(false); } }); }
async function smSafetySnapshot() {
    try {
        const ls = {}; smBackupKeys().forEach(k => { const v = localStorage.getItem(k); if (v !== null) ls[k] = v; });
        const decks = await smIdbAllRecs(smk7('SGE_SS_DECKS_DB'), 'decks');
        const stateDb = await smIdbCursorKV(smk7('SGE_SS_STATE_DB'), 'kv');
        const okM = await smIdbPut2(smSafetyDb(), 'meta', { id: 'snapshot', ts: Date.now(), ls: ls, stateDb: stateDb }, undefined, 'id');
        const okC = await smIdbClear2(smSafetyDb(), 'decks', 'id');
        let okD = true; for (const d of (decks || [])) { if (!d || !d.id) continue; if (!(await smIdbPut2(smSafetyDb(), 'decks', d, undefined, 'id'))) okD = false; }
        return okM && okC && okD;
    } catch (e) { return false; }
}
async function smSafetyRead() {
    try {
        const db = await smIdbOpenStore(smSafetyDb(), 'meta', 'id'); if (!db) return null;
        const meta = await new Promise((res) => { try { const q = db.transaction('meta', 'readonly').objectStore('meta').get('snapshot'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } });
        if (!meta) return null;
        const db2 = await smIdbOpenStore(smSafetyDb(), 'decks', 'id');
        const decks = db2 ? await new Promise((res) => { try { const q = db2.transaction('decks', 'readonly').objectStore('decks').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); } catch (e) { res([]); } }) : [];
        return { ls: meta.ls || {}, stateDb: meta.stateDb || [], decks: decks || [] };
    } catch (e) { return null; }
}
async function smSafetyRollback() {
    const snap = await smSafetyRead(); if (!snap) return false;
    try { smBackupKeys().forEach(k => { try { if (Object.prototype.hasOwnProperty.call(snap.ls, k)) localStorage.setItem(k, snap.ls[k]); else localStorage.removeItem(k); } catch (e) {} }); } catch (e) {}
    try { await smIdbClear2(smk7('SGE_SS_DECKS_DB'), 'decks', 'id'); for (const d of snap.decks) { if (d && d.id) await smIdbPut2(smk7('SGE_SS_DECKS_DB'), 'decks', d, undefined, 'id'); } } catch (e) {}
    try { await smIdbClear2(smk7('SGE_SS_STATE_DB'), 'kv'); for (const r of snap.stateDb) { if (r) await smIdbPut2(smk7('SGE_SS_STATE_DB'), 'kv', r.v, r.k); } } catch (e) {}
    return true;
}
async function smFullBackup() {
    try {
        const ls = {};
        smBackupKeys().forEach(k => { const v = localStorage.getItem(k); if (v !== null) ls[k] = smStripLsValue(v); });
        let teachers = []; try { const t = JSON.parse(localStorage.getItem(smk7('SGE_SM_TEACHERS')) || '{}'); teachers = Object.keys(t).map(n => ({ name: n, subject: t[n].subject || 'Science', role: t[n].role || 'teacher' })); } catch (e) {}
        const deckRecs = await smIdbAllRecs(smk7('SGE_SS_DECKS_DB'), 'decks');
        const decks = []; for (const d of deckRecs) { if (!d || !d.id || !d.blob) continue; decks.push({ id: d.id, name: d.name || 'deck', mime: d.blob.type || 'application/octet-stream', b64: await smBlobToB64(d.blob) }); }
        const stateDb = await smIdbCursorKV(smk7('SGE_SS_STATE_DB'), 'kv');
        for (const rec of stateDb) { if (rec && rec.v && typeof rec.v === 'object') { try { rec.v = smDeepStripSecrets(JSON.parse(JSON.stringify(rec.v))); } catch (e) {} } }
        const pkg = { format: 'SMFULL1', version: 2, type: 'full-backup', app: 'SmartStudio+BehaviorPortal', exportedAt: new Date().toISOString(), identity: { teachers: teachers }, localStorage: ls, decks: decks, stateDb: stateDb, note: 'No PINs or credentials are included. After a restore, each teacher sets a new PIN at sign-in.' };
        smDownload('smartstudio_full_backup_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(pkg));
        showToast('Full backup saved (no PINs inside). Keep the file somewhere safe.', true);
    } catch (e) { alert('Backup failed: ' + e); }
}
function smValidateBackup(pkg) {
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) return 'file is not a backup object';
    if (!pkg.localStorage || typeof pkg.localStorage !== 'object' || Array.isArray(pkg.localStorage)) return 'missing data section';
    if (!Array.isArray(pkg.decks)) return 'missing deck list';
    if (!Array.isArray(pkg.stateDb)) return 'missing state section';
    if (!pkg.identity || !Array.isArray(pkg.identity.teachers)) return 'missing identity section';
    for (const t of pkg.identity.teachers) { if (!t || typeof t.name !== 'string' || !t.name.trim()) return 'invalid teacher entry'; }
    for (const d of pkg.decks) { if (!d || typeof d.id !== 'string' || !d.id || typeof d.b64 !== 'string' || (d.b64.length % 4 !== 0) || !/^[A-Za-z0-9+/]*={0,2}$/.test(d.b64)) return 'invalid or damaged deck data'; }
    for (const r of pkg.stateDb) { if (!r || typeof r !== 'object' || !('k' in r)) return 'invalid state entry'; }
    for (const k of Object.keys(pkg.localStorage)) { if (typeof pkg.localStorage[k] !== 'string') return 'invalid stored value'; }
    return null;
}
async function smRestoreBackupText(text) {
    if (typeof text !== 'string' || !text.length || text.length > SM_BACKUP_MAX_BYTES) return alert('This file is not a valid backup.');
    let pkg; try { pkg = JSON.parse(text); } catch (e) { return alert('This file is not a valid backup.'); }
    if (!pkg || pkg.format !== 'SMFULL1') return alert('This is not a full backup file. Use "Import roster" for teacher packages (SMPKG1).');
    const verr = smValidateBackup(pkg); if (verr) return alert('This backup file is damaged or incomplete (' + verr + '). Nothing was changed.');
    let deckBlobs; try { deckBlobs = pkg.decks.map(d => { const bin = atob(d.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return { id: d.id, name: d.name || 'deck', blob: new Blob([u], { type: d.mime || 'application/octet-stream' }) }; }); } catch (e) { return alert('This backup file has damaged deck data. Nothing was changed.'); }
    const tcount = pkg.identity.teachers.length, dcount = deckBlobs.length;
    const hasData = smBackupKeys().some(k => localStorage.getItem(k) !== null) || (await smIdbAllRecs(smk7('SGE_SS_DECKS_DB'), 'decks')).length > 0;
    if (!confirm('Restore the full backup from ' + (pkg.exportedAt || '?') + '?\nTeachers: ' + tcount + ', decks: ' + dcount + (hasData ? '\nCurrent data on this device will be replaced (a safety copy is kept first).' : '') + '\nPINs are never restored; each teacher sets a new PIN at sign-in.')) return;
    if (hasData) { const okSnap = await smSafetySnapshot(); if (!okSnap && !confirm('Could not create the automatic safety copy (device storage may be full). Continue without it?')) return; }
    let adminSkipped = 0;
    const prevRegistry = localStorage.getItem(smk7('SGE_SM_TEACHERS'));
    try {
        smBackupKeys().forEach(k => { if (Object.prototype.hasOwnProperty.call(pkg.localStorage, k)) localStorage.setItem(k, smStripLsValue(pkg.localStorage[k])); else localStorage.removeItem(k); });
        try { const cur = JSON.parse(localStorage.getItem(smk7('SGE_SM_TEACHERS')) || '{}'); pkg.identity.teachers.forEach(t => { if (t.role === 'admin') { if (!cur[t.name]) adminSkipped++; return; } if (!cur[t.name]) cur[t.name] = { pin: null, subject: t.subject || 'Science', role: 'teacher' }; }); localStorage.setItem(smk7('SGE_SM_TEACHERS'), JSON.stringify(cur)); } catch (e) {}
        for (const d of deckBlobs) { if (!(await smIdbPut(smk7('SGE_SS_DECKS_DB'), 'decks', { id: d.id, name: d.name, blob: d.blob }))) throw new Error('a presentation could not be written (device storage may be full)'); }
        for (const rec of pkg.stateDb) { const vv = (rec.v && typeof rec.v === 'object') ? smDeepStripSecrets(JSON.parse(JSON.stringify(rec.v))) : rec.v; if (!(await smIdbPut(smk7('SGE_SS_STATE_DB'), 'kv', vv, rec.k))) throw new Error('app state could not be written (device storage may be full)'); }
    } catch (e) {
        try { if (prevRegistry === null) localStorage.removeItem(smk7('SGE_SM_TEACHERS')); else localStorage.setItem(smk7('SGE_SM_TEACHERS'), prevRegistry); } catch (e2) {}
        const rb = await smSafetyRollback();
        if (rb) alert('Restore failed partway: ' + (e && e.message || e) + '\nYour previous data on this device was kept safe (restored from the automatic safety copy).');
        else alert('Restore failed partway: ' + (e && e.message || e) + '\nNo safety copy was available, so some data may be partly replaced.');
        return;
    }
    alert('Restore complete. Any teacher account that came from this backup needs a new PIN: on the sign-in screen, choose "Create my teacher profile" with the same name and set a new PIN.' + (adminSkipped ? '\n' + adminSkipped + ' admin profile(s) were not restored for security; create the admin again on this device if needed.' : ''));
    if (!window.__SM_TEST_NO_RELOAD) { try { window.parent.location.reload(); } catch (e) { location.reload(); } }
}
function smBackupMenu() {
    let ov = document.getElementById('smBackupOv');
    if (ov) { ov.style.display = 'flex'; return; }
    ov = document.createElement('div'); ov.id = 'smBackupOv';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;';
    ov.innerHTML = '<div style="background:#fff;border-radius:18px;padding:26px 24px;width:min(92vw,380px);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.3);">'
        + '<h3 style="margin:0 0 6px;font-size:18px;font-weight:900;color:#1e3a8a;"><i class="fa-solid fa-shield-halved"></i> Local Backup (this device)</h3>'
        + '<p style="margin:0 0 16px;color:#64748b;font-size:13px;font-weight:700;">Saves the classes, behavior records, question files and presentations cached on this device for the current school into one file. PINs are never included. This is not a full server backup: that is the private smproto.db file on the server computer (copy it while the server is stopped, and never send it to anyone).</p>'
        + '<button id="smBkExp" class="ctrl-btn" style="width:100%;background:#0ea5e9;margin-bottom:8px;"><i class="fa-solid fa-download"></i> Download full backup</button>'
        + '<button id="smBkImp" class="ctrl-btn" style="width:100%;background:#0d9488;margin-bottom:8px;"><i class="fa-solid fa-upload"></i> Restore from backup file</button>'
        + '<button id="smBkX" class="ctrl-btn" style="width:100%;background:#64748b;">Close</button>'
        + '<input type="file" id="smBkFile" accept=".json,application/json" style="display:none"></div>';
    document.body.appendChild(ov);
    ov.querySelector('#smBkX').onclick = () => { ov.style.display = 'none'; };
    ov.querySelector('#smBkExp').onclick = () => { ov.style.display = 'none'; smFullBackup(); };
    const f = ov.querySelector('#smBkFile');
    ov.querySelector('#smBkImp').onclick = () => { f.value = ''; f.click(); };
    f.onchange = () => { const file = f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => { ov.style.display = 'none'; smRestoreBackupText(String(r.result)); }; r.readAsText(file); };
}
window.smFullBackup = smFullBackup; window.smRestoreBackupText = smRestoreBackupText;
/* ===== SMSRV1: local-server prototype wiring (server edition test copy only). Server enforces; client mirrors. ===== */
// (network transport moved to /legacy/transport.js)

const SM_SERVER = '';
window.addEventListener('message', e => {
    const d = e.data; if (!d || d.t !== 'session') return;
    window.__smRole = d.role || 'teacher'; window.__smToken = d.token || ''; window.__smSchool = d.school || ''; window.__smSchoolHash = smSchoolHash(d.school || '');
    if (!window.__smToken) return;
    window.__smRoles = {}; Object.keys(d.registry || {}).forEach(n => { window.__smRoles[n] = (d.registry[n] && d.registry[n].role) || 'teacher'; });
    populateAllSchoolClasses = function (app) { if (app && typeof app === 'object' && !app.classes) app.classes = {}; };
    if (window.__smRole !== 'admin') {
        const blocked = function () { alert('Only the school admin can manage teacher accounts.'); };
        smRemoveTeacher = blocked; smCreateTeacher = blocked; smAddTeacher = blocked; smPickPackage = blocked;
        try { const mb = document.getElementById('smManageTeachersBox'); if (mb) mb.style.display = 'none'; } catch (e) {}
        try { const h4 = document.getElementById('smAllTeachersH4'); if (h4) h4.textContent = '4. All Teachers (Click a teacher to view their classes, students and reports):'; } catch (e) {}
    }
    if (window.__smRole === 'counselor') {
        try { const h4 = document.getElementById('smAllTeachersH4'); if (h4) h4.style.display = 'none'; } catch (e) {}
        try { const tt = document.querySelector('#adminDashboardView table.class-table'); if (tt) tt.style.display = 'none'; } catch (e) {}
        try { const h2 = document.querySelector('#adminDashboardView h2'); if (h2) h2.innerHTML = '<i class="fa-solid fa-heart" style="color:#0ea5e9;"></i> Counselor Reports Center'; } catch (e) {}
    }
    setTimeout(smServerLoad, 60);
});

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

function smPortalApply(merged) {
    if (!merged || typeof merged !== 'object' || !currentTeacher) return;
    const t = globalData[currentTeacher]; if (!t) return;
    Object.keys(t).forEach(k => { delete t[k]; });
    Object.assign(t, smClone(merged));
    appData = t;
    if (!appData.currentClass || !appData.classes[appData.currentClass]) appData.currentClass = Object.keys(appData.classes || {})[0] || null;
    try { smRefresh(); } catch (e) {}
}
window.__smDocResolvers = window.__smDocResolvers || {};
window.__smDocResolvers.portal = { url: SM_SERVER + '/api/portal/me', apply: smPortalApply, saveLocal: function () { try { saveGlobal(); } catch (e) {} } };
/* account login re-check: restores ONLY a stored pending conflict for the now-identified
   account. Never reloads server data, so a session rebroadcast can never clobber local edits. */
function smPendingRecheck() {
    try {
        if (window.__smRole !== 'teacher' || !currentTeacher) return;
        const st = window.__smDoc.portal = window.__smDoc.portal || { ver: 0, base: undefined, busy: false, pending: false, retries: 0 };
        const pend = smLoadPending('portal');
        const mine = pend && pend.local && (pend.acct || 'anon') === (window.__smT || currentTeacher || 'anon');
        if (!mine) {
            if (st.blocked) { st.blocked = false; const bb = document.getElementById('smConflictBar'); if (bb) bb.remove(); }
            return;
        }
        if (st.blocked) return;
        if (st.base !== undefined && (pend.version || 0) === (st.ver || 0) && !st.busy) {
            try { smDocPut('/api/portal/me', () => appData, smPortalApply, 'portal'); } catch (e) {}
        }
    } catch (e) {}
}
const smOrigDirectLogin = executeDirectLogin;
executeDirectLogin = function () {
    const r = smOrigDirectLogin.apply(this, arguments);
    setTimeout(() => { try { smPendingRecheck(); } catch (e) {} }, 1500);
    return r;
};
async function smServerLoad() {
    try { try { if (typeof currentTeacher !== 'undefined' && currentTeacher) window.__smT = currentTeacher; } catch (e) {}
        if (window.__smRole === 'teacher') {
            const r = await smApi(SM_SERVER + '/api/portal/me', { headers: { Authorization: 'Bearer ' + window.__smToken } });
            if (r.ok) { const j = await r.json();
                const st = window.__smDoc.portal = window.__smDoc.portal || { ver: 0, base: undefined, busy: false, pending: false, retries: 0 };
                st.notLoaded = false;
                let pend = smLoadPending('portal'); if (!pend) { try { pend = await smPendIdbGet('portal'); if (pend && pend.local) { try { localStorage.setItem(smPendKey('portal'), JSON.stringify(pend)); } catch (e) {} } } catch (e) {} }
                if (pend && pend.local && (pend.acct || 'anon') === (window.__smT || currentTeacher || 'anon')) {
                    if (j.data && pend.base === undefined) {
                        globalData[currentTeacher] = smClone(j.data);
                        st.ver = j.version || 0; st.base = smClone(j.data);
                        try { smClearPending('portal'); } catch (e) {}
                    } else if ((pend.version || 0) === (j.version || 0)) {
                        globalData[currentTeacher] = smClone(pend.local);
                        st.ver = j.version || 0; st.base = smClone(pend.base !== undefined ? pend.base : j.data);
                        st.replay = true;
                    } else {
                        try {
                            globalData[currentTeacher] = smMerge3(smClone(pend.base), smClone(pend.local), smClone(j.data), '', 'theirs');
                            st.ver = j.version || 0; st.base = smClone(j.data);
                            st.replay = true;
                        } catch (e) {
                            globalData[currentTeacher] = j.data || { subject: DEFAULT_TEACHER_SUBJECTS[currentTeacher] || 'Science', currentClass: null, classes: {} };
                            st.ver = j.version || 0; st.base = smClone(globalData[currentTeacher]);
                            st.blocked = true;
                        }
                    }
                } else {
                    globalData[currentTeacher] = j.data || { subject: DEFAULT_TEACHER_SUBJECTS[currentTeacher] || 'Science', currentClass: null, classes: {} };
                    st.ver = j.version || 0; st.base = smClone(globalData[currentTeacher]);
                }
                appData = globalData[currentTeacher];
                if (!appData.currentClass || !appData.classes[appData.currentClass]) appData.currentClass = Object.keys(appData.classes)[0] || null;
                try { setStore(smDBKey(), JSON.stringify(globalData)); } catch (e) {}
                if (st.blocked) { try { smShowConflictUi('portal'); } catch (e) {} }
                if (st.replay || st.dirtyBeforeLoad) { st.replay = false; st.dirtyBeforeLoad = false; try { smDocPut('/api/portal/me', () => appData, smPortalApply, 'portal'); } catch (e) {} }
                try { smRefresh(); } catch (e) {} openHomePortal();
            } else { smLoadRetry('portal', smServerLoad); }
        } else {
            const r = await smApi(SM_SERVER + '/api/school/portal', { headers: { Authorization: 'Bearer ' + window.__smToken } });
            if (r.ok) { const j = await r.json(); const data = j.data || {};
                Object.keys(data).forEach(n => { globalData[n] = data[n]; });
                Object.keys(data).forEach(n => { if (!(n in TEACHER_PINS)) { TEACHER_PINS[n] = null; DEFAULT_TEACHER_SUBJECTS[n] = data[n].subject || 'Science'; } });
                if (!ADMINS.includes(currentTeacher)) ADMINS.push(currentTeacher);
                try { setStore(smDBKey(), JSON.stringify(globalData)); } catch (e) {}
                smRebuildSchool(); try { buildAutocompleteList(); } catch (e) {}
                openAdminDashboard();
            }
        }
    } catch (e) { console.error('server load failed', e); }
}
function smAsk5(msg) { const v = (prompt(msg) || '').trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); if (!/^\d{5}$/.test(v)) { if (v) alert('PIN must be exactly 5 digits.'); return null; } return v; }

/* ---------- sync with Studio (one shared roster) ---------- */
function smSnap() { const c = {}; Object.keys(appData.classes).forEach(k => c[k] = appData.classes[k].students.map(s => s.name)); return { classes: c, cur: appData.currentClass }; }
function smPush() { if (!smReady || smApplying || !appData || isAdminImpersonating) return; clearTimeout(smTm); smTm = setTimeout(() => { if (isAdminImpersonating) return; const o = smSnap(); window.parent.postMessage({ t: 'portalChanged', classes: o.classes, cur: o.cur }, '*'); }, 100); }
function smRefresh() { try { buildAutocompleteList(); } catch (e) {} try { initAnalyticsScopeDropdowns(); } catch (e) {} try { if (document.getElementById('mainView').style.display !== 'none') renderClass(); else if (document.getElementById('homePortalView').style.display !== 'none') renderHomePortal(); } catch (e) {} }
function smApply(sn) {
    if (!appData || !sn || !sn.classes || isAdminImpersonating) return; const keys = Object.keys(sn.classes); if (!keys.length) return;
    smApplying = true;
    try {
        try { if (!getStore(smk7('SGE_SM_PREMERGE_PORTAL'))) setStore(smk7('SGE_SM_PREMERGE_PORTAL'), getStore(smDBKey()) || '{}'); } catch (e) {}
        const C = appData.classes;
        keys.forEach(k => {
            if (!C[k]) { const ex = Object.keys(C).find(n => smNorm(n) === smNorm(k)); if (ex) { C[k] = C[ex]; delete C[ex]; } }
            if (!C[k]) C[k] = { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} };
            const old = C[k].students.slice(), used = new Set(), out = [];
            sn.classes[k].forEach(nm => { const f = old.find(s => !used.has(s.id) && smNorm(s.name) === smNorm(nm)); if (f) { used.add(f.id); out.push(f); } else out.push({ id: SMStore.newId(), name: nm }); });
            C[k].students = out;
        });
        /* roster deletions flow portal -> studio only (class management UI lives in the portal);
           never let a studio snapshot delete portal classes - a stale studio doc would wipe
           classes the device has not seen (e.g. classes added by the admin or another device). */
        if (sn.cur && C[sn.cur]) appData.currentClass = sn.cur; if (!C[appData.currentClass]) appData.currentClass = Object.keys(C)[0];
        saveGlobal(); smRefresh();
    } finally { smApplying = false; }
}
const _smSave = saveGlobal;
saveGlobal = function () {
    if (isReadOnlyView()) return;
    if (currentTeacher && appData) { if (!SMStore.saveTeacher(currentTeacher, appData)) { try { showToast('Not saved: an empty roster cannot replace existing data (backup kept).', true); } catch (e) {} return; } smRebuildSchool(); }
    if (!smApplying) smPush();
};

let __smPortalTimer = null;
const smOrigSaveGlobal = saveGlobal;
saveGlobal = function () {
    smOrigSaveGlobal();
    try { if (typeof currentTeacher !== 'undefined' && currentTeacher) window.__smT = currentTeacher; } catch (e) {}
    if (window.__smRole === 'teacher' && window.__smToken && currentTeacher && appData) {
        clearTimeout(__smPortalTimer);
        __smPortalTimer = setTimeout(() => {
            smDocPut('/api/portal/me', () => appData, smPortalApply, 'portal');
        }, 800);
        try { const _ps = (window.__smDoc = window.__smDoc || {}).portal || {}; if (_ps.base !== undefined) smSavePending('portal', { path: '/api/portal/me', at: Date.now(), acct: (window.__smT || currentTeacher || 'anon'), local: smClone(appData), base: smClone(_ps.base), version: _ps.ver || 0 }); } catch (e) {}
    }
};

function smFlushPortalSync() { try { if (__smPortalTimer) { clearTimeout(__smPortalTimer); __smPortalTimer = null; if (window.__smRole === 'teacher' && window.__smToken && currentTeacher && appData) smDocPut('/api/portal/me', () => appData, smPortalApply, 'portal'); } } catch (e) {} }
window.addEventListener('pagehide', smFlushPortalSync);
function smResumePortal() {
    try {
        { const s0 = window.__smDoc && window.__smDoc.portal; if (s0 && s0.notLoaded && typeof smServerLoad === 'function') { smServerLoad(); return; } }
        if (window.__smRole === 'teacher' && window.__smToken && typeof currentTeacher !== 'undefined' && currentTeacher && appData && typeof smLoadPending === 'function' && smLoadPending('portal')) {
            const s = window.__smDoc && window.__smDoc.portal;
            if (s && !s.busy && !s.blocked) { s.retries = 0; smDocPut('/api/portal/me', () => appData, smPortalApply, 'portal'); }
        }
    } catch (e) {}
}
window.addEventListener('online', smResumePortal);
setInterval(smResumePortal, 30000);
document.addEventListener('visibilitychange', function () { try { if (document.visibilityState === 'hidden') smFlushPortalSync(); } catch (e) {} });

/* ---------- packages (export / import files) ---------- */
function smExportPackage() {
    if (!appData) return; const t = globalData[currentTeacher];
    if (SMStore.countStudents(t) === 0) return alert('Nothing to export yet.');
    smDownload('behavior-package_' + currentTeacher.replace(/[^\w\-]+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ format: 'SMPKG1', type: 'teacher', teacher: currentTeacher, subject: t.subject, exportedAt: new Date().toISOString(), data: t }));
    showToast('Package saved. Send the file to your admin.');
}
function smExportRoster(name) {
    const t = globalData[name]; if (!t) return alert('No data for this teacher on this device.');
    const c = {}; Object.keys(t.classes || {}).forEach(k => c[k] = t.classes[k].students.map(s => s.name));
    smDownload('roster-package_' + name.replace(/[^\w\-]+/g, '_') + '.json', JSON.stringify({ format: 'SMPKG1', type: 'roster', teacher: name, exportedAt: new Date().toISOString(), classes: c }));
}
function smPickPackage() { const f = document.getElementById('smPkgFile'); f.value = ''; f.onchange = () => { const file = f.files[0]; if (!file) return; const r = new FileReader(); r.onload = () => smOnPackage(String(r.result)); r.readAsText(file); }; f.click(); }
function smOnPackage(text) {
    let pkg; try { pkg = JSON.parse(text); } catch (e) { return alert('This file is not a valid package.'); }
    if (!pkg || pkg.format !== 'SMPKG1') return alert('This file is not an Alforqan - Studio / Portal package.');
    const realUser = isAdminImpersonating ? adminRealName : currentTeacher, isAdm = ADMINS.includes(realUser);
    if (pkg.type === 'teacher') {
        if (!isAdm) return alert('Teacher packages can only be imported by an admin.');
        const d = pkg.data; if (!d || !d.classes || SMStore.countStudents(d) === 0) return alert('Package is empty. Nothing imported.');
        const name = String(pkg.teacher || '').trim(); if (!name || ADMINS.includes(name)) return alert('Invalid teacher name in package.');
        const msg = 'Import "' + name + '": ' + Object.keys(d.classes).length + ' classes, ' + SMStore.countStudents(d) + ' students, ' + SMStore.countAwards(d) + ' behavior actions.';
        if (TEACHER_PINS[name]) { const cur = globalData[name]; if (!confirm(msg + '\n\nThis REPLACES the current data of this teacher on this device (' + SMStore.countStudents(cur) + ' students, ' + SMStore.countAwards(cur) + ' actions). A backup is kept. Continue?')) return; }
        else {
            if (!confirm(msg + '\n\nThis teacher is not on this device yet. Add them?')) return;
            const pin = smAsk5('Set a 5-digit PIN for ' + name + ':'); if (!pin) return;
            TEACHER_PINS[name] = pin; DEFAULT_TEACHER_SUBJECTS[name] = pkg.subject || d.subject || 'Science'; smRegOp({ op: 'add', name: name, pin: pin, subject: pkg.subject || d.subject || 'Science', role: 'teacher' });
        }
        SMStore.backup('BEFORE_IMPORT'); d._v = (d._v || 0) + 1; d._updatedAt = new Date().toISOString(); d.subject = pkg.subject || d.subject || 'Science';
        globalData[name] = d; SMStore.saveAll(); smRebuildSchool(); openAdminDashboard(); showToast('Imported ' + name);
    } else if (pkg.type === 'roster') {
        if (isAdm) return alert('Roster packages are for teachers. Open it in the teacher account.');
        if (!appData || !pkg.classes) return; let ac = 0, as = 0; smApplying = true;
        try {
            Object.keys(pkg.classes).forEach(c => {
                if (!appData.classes[c]) { appData.classes[c] = { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} }; ac++; }
                const have = new Set(appData.classes[c].students.map(s => smNorm(s.name)));
                pkg.classes[c].forEach(n => { if (!have.has(smNorm(n))) { appData.classes[c].students.push({ id: SMStore.newId(), name: n }); have.add(smNorm(n)); as++; } });
            });
        } finally { smApplying = false; }
        saveGlobal(); smRefresh(); alert('Roster imported: ' + ac + ' new classes, ' + as + ' new students. Nothing was removed.');
    } else alert('Unknown package type.');
}
function smAddTeacher() {
    const name = (prompt('Name for the new account:') || '').trim(); if (!name) return; if (TEACHER_PINS[name]) return alert('This name already exists.');
    let role = (prompt('Role: teacher or counselor', 'teacher') || 'teacher').trim().toLowerCase();
    if (!['teacher', 'counselor'].includes(role)) role = 'teacher';
    const pin = smAsk5('Choose a 5-digit PIN for ' + name + ':'); if (!pin) return;
    let subj = 'Administration';
    if (role === 'teacher') { subj = (prompt('Subject (' + ALL_SUBJECTS.join(', ') + '):', 'Science') || 'Science').trim(); if (!ALL_SUBJECTS.includes(subj)) subj = 'Science'; }
    if (role === 'counselor') subj = 'Counseling';
    TEACHER_PINS[name] = pin; DEFAULT_TEACHER_SUBJECTS[name] = subj; if (role === 'admin') ADMINS.push(name);
    window.__smRoles = window.__smRoles || {}; window.__smRoles[name] = role;
    smRegOp({ op: 'add', name: name, pin: pin, subject: subj, role: role }); openAdminDashboard(); showToast('Added ' + name + ' (' + role + ').');
}
function smRemoveTeacher(name) {
    if (name === currentTeacher || name === adminRealName) return alert('You cannot remove the account you are signed in with.');
    const t = globalData[name];
    if (!confirm('Remove teacher "' + name + '" and all their classes and records on this device?\n(' + SMStore.countStudents(t) + ' students, ' + SMStore.countAwards(t) + ' actions). A backup copy is kept.')) return;
    SMStore.backup('BEFORE_REMOVE'); delete globalData[name]; delete TEACHER_PINS[name]; SMStore.saveAll(); smRegOp({ op: 'remove', name: name }); smRebuildSchool(); openAdminDashboard(); showToast('Removed ' + name, true);
}
function smAdminAddClass(tName) {
    const c = (prompt('New class name for ' + tName + ' (e.g. 5C):') || '').trim(); if (!c) return;
    const t = globalData[tName] || (globalData[tName] = { subject: DEFAULT_TEACHER_SUBJECTS[tName] || 'Science', classes: {}, currentClass: '' });
    t.classes = t.classes || {};
    if (t.classes[c]) return alert('This class already exists for ' + tName + '.');
    t.classes[c] = { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} };
    smRegOp({ op: 'addClass', teacher: tName, className: c }); openAdminDashboard(); showToast('Class ' + c + ' added for ' + tName + ' - it syncs to their account.');
}
function smAdminSetSubject(tName) {
    const cur = (globalData[tName] && globalData[tName].subject) || DEFAULT_TEACHER_SUBJECTS[tName] || 'Science';
    const subj = (prompt('Subject for ' + tName + ' (' + ALL_SUBJECTS.join(', ') + '):', cur) || '').trim(); if (!subj) return;
    if (!ALL_SUBJECTS.includes(subj)) return alert('Unknown subject. Choose from: ' + ALL_SUBJECTS.join(', '));
    DEFAULT_TEACHER_SUBJECTS[tName] = subj; if (globalData[tName]) globalData[tName].subject = subj;
    smRegOp({ op: 'setSubject', name: tName, subject: subj }); openAdminDashboard(); showToast('Subject set for ' + tName + '.');
}
function smAdminResetPin(tName) {
    const pin = smAsk5('New 5-digit PIN for ' + tName + ':'); if (!pin) return;
    smRegOp({ op: 'resetPin', name: tName, pin: pin }); showToast('PIN reset for ' + tName + '. Their old sessions are signed out.');
}
function smNavExtras(nav) {
    const isAdm = ADMINS.includes(isAdminImpersonating ? adminRealName : currentTeacher);
    const mk = (html, bg, fn, auto) => { const b = document.createElement('button'); b.className = 'nav-btn'; b.style.background = bg; if (auto) b.style.marginLeft = 'auto'; b.innerHTML = html; b.onclick = fn; nav.appendChild(b); };
    const first = !nav.querySelector('[style*="margin-left"]');
    if (window.__smRole !== 'counselor') mk('<i class="fa-solid fa-gamepad"></i> Alforqan - Studio', '#7c3aed', () => window.parent.postMessage({ t: 'goto', to: 'studio' }, '*'), first);
    if (!isAdm) { mk('<i class="fa-solid fa-file-export"></i> Export package', '#0ea5e9', smExportPackage); mk('<i class="fa-solid fa-file-arrow-down"></i> Import roster', '#0d9488', smPickPackage); }
    if (!window.__smRole || window.__smRole === 'admin' || window.__smRole === 'teacher') { mk('<i class="fa-solid fa-shield-halved"></i> Backup', '#475569', smBackupMenu); } mk('<i class="fa-solid fa-right-from-bracket"></i> Sign out', '#ef4444', () => window.parent.postMessage({ t: 'signout' }, '*'));
}

/* ---------- messages from the shell / Studio ---------- */
window.parent.postMessage({ t: 'portalLoaded' }, '*');
window.addEventListener('message', e => {
    const d = e.data; if (!d || !d.t) return;
    if (d.t === 'session') {
        try { window.__smSchoolHash = smSchoolHash(d.school || ''); } catch (e) {}
        smApplyRegistry(d.registry);
        try { const sel = document.getElementById('loginTeacherSelect'); sel.innerHTML = '<option value="' + d.name + '"></option>'; sel.value = d.name; sel.options[0].textContent = d.name; document.getElementById('loginPinInput').value = d.pin; executeDirectLogin(); } catch (x) { console.error(x); }
        smRebuildSchool(); smReady = true; window.parent.postMessage({ t: 'ready', who: 'portal' }, '*');
    } else if (d.t === 'registry') { smApplyRegistry(d.registry); }
    else if (d.t === 'needSnapshot' && appData) { const o = smSnap(); window.parent.postMessage({ t: 'portalSnapshot', classes: o.classes, cur: o.cur }, '*'); }
    else if (d.t === 'studioSnapshot') smApply(d);
    else if (d.t === 'topReq') {
        try {
            if (!appData) return window.parent.postMessage({ t: 'topRes', ok: false, list: [] }, '*');
            const cn = appData.currentClass, cls = appData.classes[cn], sts = (cls && cls.students) || [];
            const ranked = sts.map(s => { const st = calculateStats(s.id); return { name: s.name, pos: st.positiveCount, neg: st.negativeCount, netScore: st.netScore, perc: st.percentage, hasData: st.hasData }; }).filter(x => x.hasData && x.perc >= 90 && x.netScore > 0);
            ranked.sort(compareTopStudentsByNetScore);
            window.parent.postMessage({ t: 'topRes', ok: true, cls: cn, list: ranked.slice(0, 10).map(x => ({ name: x.name, net: x.netScore, pos: x.pos, neg: x.neg, perc: x.perc })) }, '*');
        } catch (err) { window.parent.postMessage({ t: 'topRes', ok: false, list: [] }, '*'); }
    }
    else if (d.t === 'pctReq') {
        try {
            if (!appData) return window.parent.postMessage({ t: 'pctRes', ok: false, list: [] }, '*');
            const cn = appData.currentClass, cls = appData.classes[cn], sts = (cls && cls.students) || [];
            window.parent.postMessage({ t: 'pctRes', ok: true, cls: cn, list: sts.map((s, i) => { const st = calculateStats(s.id); return { i: i, n: s.name, p: st.percentage, d: st.hasData }; }) }, '*');
        } catch (err) { window.parent.postMessage({ t: 'pctRes', ok: false, list: [] }, '*'); }
    }
    else if (d.t === 'award') {
        const reply = (ok, msg) => window.parent.postMessage({ t: 'awardResult', ok: ok, msg: msg }, '*');
        try {
            if (!appData || isAdminImpersonating) return reply(false, 'Sign-in session not ready.');
            const cls = appData.classes[d.cls] || appData.classes[Object.keys(appData.classes).find(n => smNorm(n) === smNorm(d.cls))];
            if (!cls) return reply(false, 'Class "' + d.cls + '" not found.');
            let s = cls.students[d.idx]; if (!s || smNorm(s.name) !== smNorm(d.student)) s = cls.students.find(x => smNorm(x.name) === smNorm(d.student));
            if (!s) return reply(false, 'Student not found: ' + d.student);
            const beh = behaviors.find(x => x.id === d.behaviorId); if (!beh) return reply(false, 'Unknown behavior.');
            if (!cls.scores) cls.scores = {}; if (!cls.scores[s.id]) cls.scores[s.id] = {};
            cls.scores[s.id][beh.id] = (cls.scores[s.id][beh.id] || 0) + 1; smApplying = true; saveGlobal(); smApplying = false; smRefresh();
            reply(true, s.name + ': +1 ' + beh.title);
        } catch (err) { smApplying = false; reply(false, 'Could not save: ' + err.message); }
    }
});
