
// ===== v8: LOCAL-ONLY DATA, BACKUP/RESTORE, DAILY CONTENT FETCH =====
const SS_CONTENT_BASE = './content/';
// --- 1. second copy of the data inside IndexedDB (in case browser clears localStorage) ---
function ssStateDb() { return new Promise((res, rej) => { const r = indexedDB.open(smk7('SGE_SS_STATE_DB'), 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function ssStatePut(k, v) { return ssStateDb().then(db => new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; })); }
function ssStateGet(k) { return ssStateDb().then(db => new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); })); }
(function () {
    const _sync = syncStudioData;
    syncStudioData = function () {
        try { localStorage.setItem(smk7('SMART_STUDIO_GENERAL_PRO'), JSON.stringify(appState)); } catch (e) { console.warn('localStorage full', e); }
        try { ssStatePut('appState', JSON.parse(JSON.stringify(appState))); } catch (e) {}
    };
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    // recovery: browser lost localStorage but IndexedDB still has the copy
    setTimeout(async () => {
        try {
            if (false) { /* server edition: never resurrect stale device backup state; server is the source */
                const copy = await ssStateGet('appState');
                if (copy) { appState = Object.assign({}, appState, copy); syncStudioData(); renderAllDashboard(); showToast('♻️ Restored your data from the device backup'); }
            } else { ssStatePut('appState', JSON.parse(localStorage.getItem(smk7('SMART_STUDIO_GENERAL_PRO')))); }
        } catch (e) {}
    }, 1200);
})();
// --- 2. backup / restore / one-time cloud import ---
function ssDownloadBackup() {
    syncStudioData();
    const blob = new Blob([JSON.stringify({ format: 'smartstudio-backup-v1', saved: new Date().toISOString(), appState })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'SmartStudio_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    showToast('💾 Backup file saved to Downloads');
}
function ssRestoreBackup(ev) {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
        try {
            const d = JSON.parse(r.result); const st = d.appState || d;
            if (!st || typeof st !== 'object' || !st.classes) throw new Error('bad');
            if (!(await SSD.confirm('Restore backup', 'Replace the data on this device with the backup file?\n(A copy of current data is kept in the device backup.)', { danger: true, okLabel: 'Restore now' }))) return;
            ssStatePut('before-restore', JSON.parse(JSON.stringify(appState)));
            appState = Object.assign({}, appState, st); syncStudioData(); renderAllDashboard(); showToast('✅ Backup restored');
        } catch (e) { showToast('⚠️ Not a valid backup file'); }
        ev.target.value = '';
    };
    r.readAsText(f);
}
function ssLoadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function ssImportFromOldCloud() { showToast('Use Restore backup file instead'); }
(function () {
    const card = document.querySelector('#settingsModal .studio-modal-card');
    if (!card) return;
    const box = document.createElement('div');
    box.style.cssText = 'margin-top:16px; padding-top:12px; border-top:1.5px dashed #cbd5e1; text-align:left;';
    box.innerHTML = '<div style="font-weight:900; color:#1e40af; margin-bottom:8px;">💾 Data on this device</div>' +
        '<div style="font-size:12px; color:#64748b; font-weight:600; margin-bottom:8px;">Rosters, scores and question files are saved only on this device. Save a backup file now and then.</div>';
    const mk = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-mini-btn load'; b.style.cssText = 'margin:3px 4px 3px 0;'; b.textContent = label; b.onclick = fn; return b; };
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain'; inp.style.display = 'none'; inp.onchange = ssRestoreBackup;
    box.appendChild(mk('💾 Save backup file', ssDownloadBackup));
    box.appendChild(mk('📂 Restore backup file', () => inp.click()));
    
    box.appendChild(inp);
    const info = document.createElement('div'); info.id = 'ssContentInfo'; info.style.cssText = 'font-size:11.5px; color:#94a3b8; font-weight:700; margin-top:6px;';
    info.textContent = SS_CONTENT_BASE ? 'Daily content source: ' + SS_CONTENT_BASE : 'Daily content source: not set';
    box.appendChild(info);
    card.appendChild(box);
})();
// --- 3. daily content from the content site (packs + decks) ---
async function ssFetchContent(manual) {
    if (!SS_CONTENT_BASE) { if (manual) showToast('ℹ️ No content source set'); return; }
    try {
        const base = SS_CONTENT_BASE.replace(/\/?$/, '/');
        const idx = await (await fetch(base + 'index.json?t=' + Date.now(), { cache: 'no-store' })).json();
        let nq = 0, nd = 0;
        for (const day of (idx.days || [])) {
            let pk; try { pk = await (await fetch(base + day + '/pack.json?t=' + Date.now(), { cache: 'no-store' })).json(); } catch (e) { continue; }
            nq += ssSeedPacks(pk.packs || [], true);
            const have = (await ssIdbAll()).map(r => r.id);
            for (const d of (pk.decks || [])) {
                if (!d.id || have.indexOf(d.id) !== -1 || ssDeckTomb().indexOf(d.id) !== -1) continue;
                try {
                    const resp = await fetch(base + day + '/' + d.file);
                    if (!resp.ok) continue;
                    await ssIdbPut({ id: d.id, name: d.name, blob: await resp.blob() }); nd++;
                } catch (e) {}
            }
        }
        await ssDecksToLibrary();
        if (nq || nd) showToast('📦 New content: ' + nq + ' question file(s), ' + nd + ' presentation(s)');
        else if (manual) showToast('✅ Already up to date');
    } catch (e) { if (manual) showToast('⚠️ Could not reach the content site (offline?)'); }
}
(function () {
    const sec = document.getElementById('ssMergeAllBtn');
    if (sec) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-mini-btn load'; b.style.marginRight = '6px';
        b.textContent = '🔄 Get today\'s content'; b.onclick = () => ssFetchContent(true);
        sec.parentElement.insertBefore(b, sec);
    }
    setTimeout(() => ssFetchContent(false), 3500);
})();
