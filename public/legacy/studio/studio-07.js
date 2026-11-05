
// ===== v7: PRELOADED PRESENTATIONS (kept on this device in IndexedDB; delete them like any file) =====
const SS_BUILTIN_DECKS = [];
const SS_DECK_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
function ssIdb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open(smk7('SGE_SS_DECKS_DB'), 1);
        r.onupgradeneeded = () => r.result.createObjectStore('decks', { keyPath: 'id' });
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
}
function ssIdbAll() { return ssIdb().then(db => new Promise((res, rej) => { const q = db.transaction('decks').objectStore('decks').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); })); }
function ssIdbPut(rec) { return ssIdb().then(db => new Promise((res, rej) => { const t = db.transaction('decks', 'readwrite'); t.objectStore('decks').put(rec); t.oncomplete = res; t.onerror = () => rej(t.error); })); }
function ssIdbDel(id) { return ssIdb().then(db => new Promise((res) => { const t = db.transaction('decks', 'readwrite'); t.objectStore('decks').delete(id); t.oncomplete = res; t.onerror = res; })); }
function ssDeckTomb() { try { return JSON.parse(localStorage.getItem(smk7('SGE_SS_DECK_DELETED')) || '[]'); } catch (e) { return []; } }
function ssDeckTombAdd(id) { const t = ssDeckTomb(); if (t.indexOf(id) === -1) t.push(id); try { localStorage.setItem(smk7('SGE_SS_DECK_DELETED'), JSON.stringify(t)); } catch (e) {} }
function ssDeckTombRemove(ids) { const t = ssDeckTomb().filter(x => ids.indexOf(x) === -1); try { localStorage.setItem(smk7('SGE_SS_DECK_DELETED'), JSON.stringify(t)); } catch (e) {} }
function ssB64Blob(b64, mime) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
async function ssAddDecks(decks, quiet) {
    let added = 0;
    try {
        const have = (await ssIdbAll()).map(r => r.id);
        for (const d of decks || []) {
            if (!d || !d.id || !d.b64 || have.indexOf(d.id) !== -1 || ssDeckTomb().indexOf(d.id) !== -1) continue;
            const blob = ssB64Blob(d.b64, SS_DECK_MIME);
            await ssIdbPut({ id: d.id, name: d.name, blob });
            have.push(d.id); added++;
        }
        await ssDecksToLibrary();
        if (added && !quiet) showToast('📽️ Added ' + added + ' presentation(s) to the viewer');
    } catch (e) { console.error(e); }
    return added;
}
async function ssDecksToLibrary() {
    const recs = await ssIdbAll();
    let changed = false;
    recs.forEach(r => {
        if (ssDeckTomb().indexOf(r.id) !== -1) return;
        const id = 'deck_' + r.id;
        if (uploadedFilesLibrary.some(f => f.id === id)) return;
        const file = new File([r.blob], r.name, { type: r.blob.type || SS_DECK_MIME });
        uploadedFilesLibrary.push({ id, name: r.name, ext: (r.name.split('.').pop() || 'pptx').toLowerCase(), fileObj: file });
        changed = true;
    });
    if (changed) renderSavedFilesList();
}
(function () {
    const _del = deleteUploadedFileById;
    deleteUploadedFileById = function (id) {
        if (String(id).indexOf('deck_') === 0) { const raw = id.slice(5); ssDeckTombAdd(raw); ssIdbDel(raw); }
        return _del(id);
    };
    const _clr = clearAllUploadedFiles;
    clearAllUploadedFiles = function () {
        uploadedFilesLibrary.filter(f => String(f.id).indexOf('deck_') === 0).forEach(f => { const raw = f.id.slice(5); ssDeckTombAdd(raw); ssIdbDel(raw); });
        return _clr();
    };
    // daily pack import also accepts decks
    const _imp = ssImportPackFile;
    ssImportPackFile = function (ev) {
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = async () => {
            try {
                const d = JSON.parse(r.result);
                const packs = Array.isArray(d) ? d : (d.packs || []);
                const decks = Array.isArray(d) ? [] : (d.decks || []);
                if (Array.isArray(appState.deletedPacks)) appState.deletedPacks = appState.deletedPacks.filter(id => !packs.some(p => p.id === id));
                ssDeckTombRemove(decks.map(x => x.id));
                const n = ssSeedPacks(packs, !!decks.length);
                const m = await ssAddDecks(decks, true);
                if (decks.length) showToast('📦 Added ' + n + ' question file(s) and ' + m + ' presentation(s)');
                else if (!n) showToast('ℹ️ Pack already in the library');
            } catch (e) { showToast('⚠️ Not a valid pack file'); }
            ev.target.value = '';
        };
        r.readAsText(f);
    };
    const inp = document.querySelector('#smartImportModal input[accept*="json"]');
    if (inp) inp.onchange = ssImportPackFile;
    [800, 4000].forEach(t => setTimeout(() => ssAddDecks(SS_BUILTIN_DECKS, true), t));
})();
