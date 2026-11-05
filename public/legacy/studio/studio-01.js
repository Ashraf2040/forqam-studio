
// ============================================================================
// 1. REALISTIC STUDIO AUDIO ENGINE (ARROW TWANG/THUD + CANNON & BOMB BLAST)
// ============================================================================
const StudioAudioManager = {
    ctx: null,
    muted: false,
    volume: 0.85,
    activeLoops: [],
    activeAudios: [],

    init() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    stopAllActiveSounds() {
        this.activeLoops.forEach(o => {
            try { if (o.osc) o.osc.stop(); if (o.tmr) clearInterval(o.tmr); } catch (e) {}
        });
        this.activeLoops = [];
        this.activeAudios.forEach(a => {
            try { a.pause(); a.currentTime = 0; } catch (e) {}
        });
        this.activeAudios = [];
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) this.stopAllActiveSounds();
        const btn = document.getElementById('muteToggleBtn');
        if (btn) btn.innerHTML = this.muted ? '<i class="fa-solid fa-volume-xmark" style="color:#ef4444;"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        showToast(this.muted ? "🔇 Audio Muted" : "🔊 Audio Active");
    },

    // Realistic Bowstring Twang + High-Speed Air Whoosh
    playArrowReleaseSound() {
        if (this.muted) return;
        try {
            this.init();
            const now = this.ctx.currentTime;

            // 1. Elastic Bowstring Twang (Plucked resonant low-mid string)
            const twang = this.ctx.createOscillator();
            const twangGain = this.ctx.createGain();
            twang.type = 'triangle';
            twang.frequency.setValueAtTime(145, now);
            twang.frequency.exponentialRampToValueAtTime(92, now + 0.22);
            twangGain.gain.setValueAtTime(0.45 * this.volume, now);
            twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            twang.connect(twangGain); twangGain.connect(this.ctx.destination);
            twang.start(now); twang.stop(now + 0.25);

            // 2. High-Speed Arrow Feather Air Whoosh (Filtered White Noise Sweep)
            const bufLen = Math.floor(this.ctx.sampleRate * 0.26);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufLen) * Math.PI);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 3.2;
            filter.frequency.setValueAtTime(1900, now);
            filter.frequency.exponentialRampToValueAtTime(620, now + 0.24);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.55 * this.volume, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            noise.connect(filter); filter.connect(nGain); nGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    },

    // Realistic Arrow Bullseye Impact Thud + Wood Vibration
    playArrowHitSound() {
        if (this.muted) return;
        try {
            this.init();
            const now = this.ctx.currentTime;

            // Deep wooden bullseye punch
            const punch = this.ctx.createOscillator();
            const pGain = this.ctx.createGain();
            punch.type = 'sine';
            punch.frequency.setValueAtTime(185, now);
            punch.frequency.exponentialRampToValueAtTime(42, now + 0.14);
            pGain.gain.setValueAtTime(0.75 * this.volume, now);
            pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            punch.connect(pGain); pGain.connect(this.ctx.destination);
            punch.start(now); punch.stop(now + 0.17);

            // Crisp shaft quiver click
            const click = this.ctx.createOscillator();
            const cGain = this.ctx.createGain();
            click.type = 'square';
            click.frequency.setValueAtTime(1150, now);
            click.frequency.exponentialRampToValueAtTime(280, now + 0.045);
            cGain.gain.setValueAtTime(0.28 * this.volume, now);
            cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            click.connect(cGain); click.connect(this.ctx.destination);
            click.start(now); click.stop(now + 0.055);
        } catch (e) {}
    },

    playArrowStrikeSound() {
        this.playArrowReleaseSound();
        setTimeout(() => this.playArrowHitSound(), 240);
    },

    // Realistic Heavy Cannon Muzzle Blast
    playCannonFireSound() {
        if (this.muted) return;
        try {
            this.init();
            const now = this.ctx.currentTime;

            // Sub-bass cannon thump
            const sub = this.ctx.createOscillator();
            const sGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(130, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.38);
            sGain.gain.setValueAtTime(0.8 * this.volume, now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            sub.connect(sGain); sGain.connect(this.ctx.destination);
            sub.start(now); sub.stop(now + 0.42);

            // Gunpowder blast wave
            const bufLen = Math.floor(this.ctx.sampleRate * 0.35);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.09));
            const noise = this.ctx.createBufferSource();
            noise.buffer = buf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(680, now);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.6 * this.volume, now);
            nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);
            noise.connect(filter); filter.connect(nGain); nGain.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    },

    // Realistic Bomb / Crate Explosion + Wood Debris Shatter
    playBombExplosionSound() {
        if (this.muted) return;
        try {
            this.init();
            const now = this.ctx.currentTime;

            // 1. Massive Shockwave Boom
            const boom = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            boom.type = 'sine';
            boom.frequency.setValueAtTime(110, now);
            boom.frequency.exponentialRampToValueAtTime(22, now + 0.65);
            bGain.gain.setValueAtTime(0.9 * this.volume, now);
            bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
            boom.connect(bGain); bGain.connect(this.ctx.destination);
            boom.start(now); boom.stop(now + 0.7);

            // 2. Explosion Roar & Wooden Crate Shatter Crackle
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.75);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.20));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, now);
            filter.frequency.exponentialRampToValueAtTime(160, now + 0.7);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.8 * this.volume, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.74);
            noise.connect(filter); filter.connect(g); g.connect(this.ctx.destination);
            noise.start(now);
        } catch (e) {}
    },

    playSFX(type) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;

            if (type === 'click') {
                const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(920, now);
                osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
                g.gain.setValueAtTime(0.22 * this.volume, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.045);
            } else if (type === 'pop') {
                const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(340, now);
                osc.frequency.exponentialRampToValueAtTime(980, now + 0.085);
                g.gain.setValueAtTime(0.28 * this.volume, now);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                osc.connect(g); g.connect(this.ctx.destination);
                osc.start(now); osc.stop(now + 0.095);
            } else if (type === 'whoosh') {
                this.playArrowReleaseSound();
            } else if (type === 'boom') {
                this.playBombExplosionSound();
            } else if (type === 'select') {
                [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.055);
                    g.gain.setValueAtTime(0.22 * this.volume, now + idx * 0.055);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.35);
                    osc.connect(g); g.connect(this.ctx.destination);
                    osc.start(now + idx * 0.055); osc.stop(now + idx * 0.055 + 0.36);
                });
            } else if (type === 'cheer') {
                this.stopAllActiveSounds();
                this.playSFX('select');
                const aud = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3");
                aud.volume = this.volume * 0.75;
                this.activeAudios.push(aud);
                aud.play().catch(() => {});
            } else if (type === 'wrong') {
                [220, 180].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.14);
                    g.gain.setValueAtTime(0.2 * this.volume, now + idx * 0.14);
                    g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.25);
                    osc.connect(g); g.connect(this.ctx.destination);
                    osc.start(now + idx * 0.14); osc.stop(now + idx * 0.14 + 0.26);
                });
            }
        } catch (e) {}
    }
};

// ============================================================================
// 2. FIREBASE & SCHOOL ROSTERS (GRADES 5C TO 12C)
// ============================================================================
const firebaseConfig = {};

let db = null;
try {
    if (false) { /* v8: local-only, Firebase disabled */
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    }
} catch (e) {}

const SCHOOL_CLASSES = {
    "Grade 5C": [],
    "Grade 6C": [],
    "Grade 7C": [],
    "Grade 8C": [],
    "Grade 9C": [],
    "Grade 10C": [],
    "Grade 11C": [],
    "Grade 12C": []
};

const DEFAULT_QUESTIONS = [
    { type: 'mcq', q: "What is the SI unit of electrical resistance?", opts: ["Volt (V)", "Ampere (A)", "Ohm (Ω)", "Watt (W)"], ans: 2 },
    { type: 'blanks', q: "According to Newton's Second Law, Force equals **Mass** multiplied by **Acceleration**." },
    { type: 'mcq', q: "Which subatomic particle carries a negative electrical charge?", opts: ["Proton", "Neutron", "Electron", "Positron"], ans: 2 },
    { type: 'blanks', q: "Light travels fastest in a **Vacuum** at a speed of **300,000** km/s." },
    { type: 'mcq', q: "Which planet is known as the Red Planet in our Solar System?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], ans: 1 }
];

let appState = {
    pin: "12345",
    currentClass: "Grade 7C",
    classes: JSON.parse(JSON.stringify(SCHOOL_CLASSES)),
    pickedByClass: {},
    groups: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    groupPts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reader: "",
    challenger: "",
    questions: JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)),
    qIndex: 0
};
function smSchoolHash(s){let h=5381;for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))>>>0;}return h.toString(36);}
function smk7(b){return 'SM7_'+(window.__smSchoolHash||'G')+'_'+b;}

try {
    const saved = null; /* server edition: studio state loads from the school server after sign-in */
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
            appState = Object.assign({}, appState, parsed);
            if (!appState.classes || Object.keys(appState.classes).length === 0) {
                appState.classes = JSON.parse(JSON.stringify(SCHOOL_CLASSES));
            }
            if (!appState.groups) appState.groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
            if (!appState.groupPts) appState.groupPts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        }
    }
} catch (e) {}

if (db) {
    try {
        db.ref(smk7('SMART_STUDIO_GENERAL_PRO')).on('value', (snap) => {
            const val = snap.val();
            if (val && typeof val === 'object') {
                appState = Object.assign({}, appState, val);
                if (!appState.classes) appState.classes = JSON.parse(JSON.stringify(SCHOOL_CLASSES));
                if (!appState.groups) appState.groups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
                localStorage.setItem(smk7('SMART_STUDIO_GENERAL_PRO'), JSON.stringify(appState));
                if (document.getElementById('studioMainShell').style.display !== 'none') {
                    renderAllDashboard();
                }
            }
        });
    } catch (e) {}
}

function syncStudioData() {
    try {
        localStorage.setItem(smk7('SMART_STUDIO_GENERAL_PRO'), JSON.stringify(appState));
        if (db) db.ref(smk7('SMART_STUDIO_GENERAL_PRO')).set(JSON.parse(JSON.stringify(appState)));
    } catch (e) {}
}

function showToast(msg) {
    const t = document.getElementById('studioToast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(window.studioToastTimer);
    window.studioToastTimer = setTimeout(() => { t.style.display = 'none'; }, 2400);
}

// ============================================================================
// 3. NO-REPEAT STUDENT POOL ENGINE
// ============================================================================
function getActiveStudents() {
    if (!appState.classes || !appState.classes[appState.currentClass]) {
        appState.currentClass = Object.keys(SCHOOL_CLASSES)[0];
    }
    return appState.classes[appState.currentClass] || [];
}

function getUnpickedPool(countNeeded = 1) {
    const all = getActiveStudents();
    if (all.length === 0) return [];
    if (!appState.pickedByClass) appState.pickedByClass = {};
    let picked = appState.pickedByClass[appState.currentClass] || [];
    let unpicked = all.filter(name => !picked.includes(name));

    if (unpicked.length < countNeeded) {
        appState.pickedByClass[appState.currentClass] = [];
        unpicked = [...all];
    }
    return unpicked;
}

function markStudentPicked(name) {
    if (!name) return;
    if (!appState.pickedByClass) appState.pickedByClass = {};
    if (!appState.pickedByClass[appState.currentClass]) appState.pickedByClass[appState.currentClass] = [];
    if (!appState.pickedByClass[appState.currentClass].includes(name)) {
        appState.pickedByClass[appState.currentClass].push(name);
    }
    updateRemainingBadge();
}

function resetPickedMemory() {
    if (!appState.pickedByClass) appState.pickedByClass = {};
    appState.pickedByClass[appState.currentClass] = [];
    syncStudioData();
    updateRemainingBadge();
    StudioAudioManager.playSFX('pop');
    showToast(`🔄 Reset No-Repeat pool for ${appState.currentClass}`);
}

function updateRemainingBadge() {
    const all = getActiveStudents();
    const picked = (appState.pickedByClass && appState.pickedByClass[appState.currentClass]) || [];
    const rem = Math.max(0, all.length - picked.length);
    const badge = document.getElementById('remainingStudentsBadge');
    if (badge) badge.textContent = `${rem} / ${all.length} Unpicked`;
}

// ============================================================================
// 4. LOGIN & PORTAL NAVIGATION
// ============================================================================
function pressPinKey(n) {
    const box = document.getElementById('pinInputBox');
    if (box && box.value.length < 8) box.value += n;
    StudioAudioManager.playSFX('click');
}

function unlockStudio() {
    const box = document.getElementById('pinInputBox');
    let raw = (box ? box.value : '').trim();
    let clean = raw.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const currentPin = String(appState.pin || "12345");

    if (clean === currentPin || clean === "12345") {
        StudioAudioManager.playSFX('select');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('studioMainShell').style.display = 'flex';
        renderAllDashboard();
    } else {
        StudioAudioManager.playSFX('wrong');
        document.getElementById('loginErrorMsg').textContent = "Wrong PIN! Default is 12345";
    }
}

function switchPortal(pName) {
    StudioAudioManager.stopAllActiveSounds();
    StudioAudioManager.playSFX('click');
    ['picker', 'quiz', 'groups', 'presentation'].forEach(p => {
        const viewEl = document.getElementById('portal_' + p);
        const tabEl = document.getElementById('tab_' + p);
        if (viewEl) viewEl.classList.toggle('active', p === pName);
        if (tabEl) tabEl.classList.toggle('active', p === pName);
    });
    if (pName === 'quiz') {
        renderArenaQuestion();
        startArenaTimer(30);
    } else if (pName === 'groups') {
        renderGroupRoster();
        renderExpandedGroupsGrid();
    } else if (pName === 'presentation') {
        renderSavedFilesList();
    }
}

function toggleStudioFullscreen() {
    if (!document.fullscreenElement) { let p; try { p = document.documentElement.requestFullscreen(); } catch (e) { p = null; } if (p && p.catch) p.catch(() => {}); }
    else { try { document.exitFullscreen(); } catch (e) {} }
}

function toggleStageModalFullscreen() {
    const el = document.getElementById('gameStageModal');
    if (!el) return;
    if (!document.fullscreenElement && !el.classList.contains('cssFs')) {
        let p; try { p = el.requestFullscreen(); } catch (e) { p = Promise.reject(e); }
        Promise.resolve(p).catch(() => el.classList.add('cssFs'));
    } else {
        if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
        el.classList.remove('cssFs');
    }
}

function openSettingsModal() {
    document.getElementById('newStudioPinInput').value = appState.pin || "12345";
    document.getElementById('settingsModal').style.display = 'flex';
}

function saveCustomPin() {
    let val = document.getElementById('newStudioPinInput').value.trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    if (val.length < 4) return alert("PIN must be at least 4 digits.");
    appState.pin = val;
    syncStudioData();
    document.getElementById('settingsModal').style.display = 'none';
    showToast(`✅ PIN updated to ${val}`);
}

// ============================================================================
// 5. 8 ULTRA-HD STUDENT PICKER CARDS (MODES 4 & 5 REPLACED WITH ARROW & CANNON)
// ============================================================================
const EIGHT_MODES = [
    { id: 1, title: "Gran Turismo 3D Race", sub: "3D Supercars • Nitro • 280 km/h", color: "#0ea5e9" },
    { id: 2, title: "Dual Challenge VS", sub: "Question Reader 🎤 & Challenger 💡", color: "#f59e0b" },
    { id: 3, title: "3D Wheel of Fortune", sub: "Elastic Peg Physics • Neon Rim", color: "#10b981" },
    { id: 4, title: "Arrow Strike: Precision Shot", sub: "18 Bullseye Targets • Realistic Bow", color: "#ea580c" },
    { id: 5, title: "Cannon Bomb Strike", sub: "18 Wooden Name Crates • Heavy Cannon", color: "#d97706" },
    { id: 6, title: "Turbo Mystery Boxes", sub: "Fast Neon Scan • Tap Any Chest!", color: "#eab308" },
    { id: 7, title: "3D Hologram Carousel", sub: "Rotating 3D Cylinder Deck", color: "#8b5cf6" },
    { id: 8, title: "Realistic Bomb Toss", sub: "IK Throwing Hand • Parabolic Fuse", color: "#ef4444" }
];

function getModeCardSVG(modeId) {
    const svgs = {
        1: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient></defs><rect width="400" height="95" fill="url(#g1)"/><polygon points="0,95 140,55 270,95" fill="#15803d"/><polygon points="180,95 320,50 400,95" fill="#166534"/><polygon points="0,220 140,95 260,95 400,220" fill="#1e293b"/><line x1="200" y1="95" x2="200" y2="220" stroke="#fde047" stroke-width="4" stroke-dasharray="14,10"/><rect x="115" y="125" width="135" height="46" rx="14" fill="#dc2626" stroke="#ffffff" stroke-width="2"/><rect x="138" y="112" width="88" height="22" rx="8" fill="#0f172a"/><circle cx="340" cy="138" r="36" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/><text x="340" y="143" text-anchor="middle" fill="#fff" font-weight="900" font-size="16" font-family="sans-serif">285</text></svg>`,
        2: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#0f172a"/><rect x="45" y="34" width="105" height="130" rx="22" fill="#1e3a8a" stroke="#38bdf8" stroke-width="4"/><text x="97" y="112" text-anchor="middle" fill="#38bdf8" font-size="44">🎤</text><rect x="250" y="34" width="105" height="130" rx="22" fill="#065f46" stroke="#34d399" stroke-width="4"/><text x="302" y="112" text-anchor="middle" fill="#fde047" font-size="44">💡</text><circle cx="200" cy="100" r="30" fill="#f59e0b" stroke="#fff" stroke-width="3"/><text x="200" y="108" text-anchor="middle" fill="#fff" font-weight="900" font-size="20" font-family="sans-serif">VS</text></svg>`,
        3: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#1e1b4b"/><circle cx="200" cy="105" r="82" fill="none" stroke="#fde047" stroke-width="8"/><path d="M200,105 L200,25 A80,80 0 0,1 275,75 Z" fill="#2563eb"/><path d="M200,105 L275,75 A80,80 0 0,1 265,160 Z" fill="#10b981"/><path d="M200,105 L265,160 A80,80 0 0,1 135,160 Z" fill="#f59e0b"/><path d="M200,105 L135,160 A80,80 0 0,1 125,75 Z" fill="#ec4899"/><path d="M200,105 L125,75 A80,80 0 0,1 200,25 Z" fill="#8b5cf6"/><circle cx="200" cy="105" r="22" fill="#0f172a" stroke="#fde047" stroke-width="4"/></svg>`,
        4: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient></defs><rect width="400" height="100" fill="url(#sky4)"/><circle cx="335" cy="40" r="18" fill="#fef08a"/><rect y="100" width="400" height="120" fill="#65a30d"/><g transform="translate(115,65)"><circle r="28" fill="#fff"/><circle r="21" fill="#dc2626"/><circle r="14" fill="#2563eb"/><circle r="7" fill="#facc15"/></g><g transform="translate(200,65)"><circle r="28" fill="#fff"/><circle r="21" fill="#dc2626"/><circle r="14" fill="#2563eb"/><circle r="7" fill="#facc15"/></g><g transform="translate(285,65)"><circle r="28" fill="#fff"/><circle r="21" fill="#dc2626"/><circle r="14" fill="#2563eb"/><circle r="7" fill="#facc15"/></g><path d="M165,175 Q200,130 235,175" fill="none" stroke="#1e293b" stroke-width="6"/><line x1="200" y1="185" x2="200" y2="120" stroke="#fde047" stroke-width="4"/></svg>`,
        5: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="145" fill="#0f172a"/><rect y="145" width="400" height="75" fill="#7c2d12"/><rect x="45" y="32" width="90" height="46" rx="6" fill="#78350f" stroke="#d97706" stroke-width="2"/><rect x="155" y="32" width="90" height="46" rx="6" fill="#78350f" stroke="#d97706" stroke-width="2"/><rect x="265" y="32" width="90" height="46" rx="6" fill="#78350f" stroke="#d97706" stroke-width="2"/><circle cx="176" cy="175" r="16" fill="#451a03" stroke="#d97706" stroke-width="3"/><circle cx="224" cy="175" r="16" fill="#451a03" stroke="#d97706" stroke-width="3"/><rect x="186" y="128" width="28" height="48" rx="6" fill="#475569" stroke="#cbd5e1" stroke-width="2"/><circle cx="200" cy="105" r="12" fill="#f97316"/></svg>`,
        6: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#451a03"/><circle cx="200" cy="105" r="90" fill="#fde047" opacity="0.28"/><rect x="125" y="60" width="150" height="92" rx="14" fill="#d97706" stroke="#fde047" stroke-width="5"/><line x1="125" y1="102" x2="275" y2="102" stroke="#78350f" stroke-width="6"/><text x="200" y="126" text-anchor="middle" fill="#fef08a" font-weight="900" font-size="48" font-family="sans-serif">?</text></svg>`,
        7: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#0f172a"/><rect x="70" y="45" width="68" height="98" rx="12" fill="#1e3a8a" stroke="#38bdf8" stroke-width="2" opacity="0.75"/><rect x="262" y="45" width="68" height="98" rx="12" fill="#581c87" stroke="#c084fc" stroke-width="2" opacity="0.75"/><rect x="152" y="28" width="96" height="130" rx="16" fill="#0284c7" stroke="#7dd3fc" stroke-width="4"/><circle cx="200" cy="80" r="19" fill="#e0f2fe"/><path d="M170,126 Q200,98 230,126" fill="#e0f2fe"/></svg>`,
        8: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#1e1b4b"/><path d="M85,145 Q195,25 305,135" fill="none" stroke="#fde047" stroke-width="4" stroke-dasharray="10,8"/><circle cx="85" cy="145" r="24" fill="#3b82f6"/><circle cx="305" cy="145" r="24" fill="#10b981"/><circle cx="205" cy="76" r="26" fill="#111827" stroke="#f97316" stroke-width="3"/><circle cx="226" cy="54" r="9" fill="#fde047"/></svg>`
    };
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgs[modeId])}`;
}

function renderAllDashboard() {
    const topSel = document.getElementById('topClassSelect');
    if (topSel) {
        topSel.innerHTML = '';
        Object.keys(appState.classes).forEach(cName => {
            const opt = document.createElement('option');
            opt.value = cName; opt.textContent = cName;
            topSel.appendChild(opt);
        });
        topSel.value = appState.currentClass;
    }

    updateRemainingBadge();
    document.getElementById('bannerReaderName').textContent = appState.reader || "—";
    document.getElementById('bannerChallengerName').textContent = appState.challenger || "—";
    document.getElementById('arenaReaderName').textContent = appState.reader || "—";
    document.getElementById('arenaAnswererName').textContent = appState.challenger || "—";

    const grid8 = document.getElementById('modesGrid8');
    if (grid8) {
        grid8.innerHTML = '';
        EIGHT_MODES.forEach(m => {
            const card = document.createElement('div');
            card.className = 'mode-card';
            card.onclick = () => openGameStage(m.id);
            card.innerHTML = `
                <img class="mode-card-art" src="${getModeCardSVG(m.id)}" alt="${m.title}">
                <div class="mode-card-footer">
                    <div class="mode-num-badge" style="background:${m.color};">${m.id}</div>
                    <div class="mode-title-box">
                        <h4>${m.title}</h4>
                        <span>${m.sub}</span>
                    </div>
                    <div class="mode-play-btn"><i class="fa-solid fa-play"></i></div>
                </div>
            `;
            grid8.appendChild(card);
        });
    }

    renderArenaQuestion();
    renderGroupRoster();
    renderExpandedGroupsGrid();
    renderSavedFilesList();
}

function switchClass(cName) {
    StudioAudioManager.playSFX('click');
    appState.currentClass = cName;
    appState.groups = {}; for (let g = 1; g <= (typeof ssGroupCount === 'function' ? ssGroupCount() : 5); g++) appState.groups[g] = [];
    const list = appState.classes[cName] || [];
    if (list.length >= 2) {
        appState.reader = list[0];
        appState.challenger = list[1];
    }
    syncStudioData();
    renderAllDashboard();
    showToast(`Switched to ${cName}`);
}

// ============================================================================
// 6. REALISTIC 60FPS GAME STAGE ENGINE (INCLUDING MODE 4 ARROW STRIKE & MODE 5 CANNON STRIKE)
// ============================================================================
let activeStageMode = 1;
let lastOpenedGameMode = 4;
let stageAnimFrame = null;
let isStageRunning = false;
let stageTick = 0;
let stageEntities = [];
let stagePickedWinner = null;

// Mode 4 (Arrow Strike: Precision Shot) State
let arrowStrikeState = {
    targets: [], // 18 targets (6 cols x 3 rows)
    aimIdx: 0,
    selectedIdx: -1,
    phase: 'idle', // 'scanning', 'drawing', 'flying', 'hit'
    bowAngle: -Math.PI / 2,
    bowPull: 0, // 0..1
    arrowX: 640,
    arrowY: 560,
    arrowAngle: -Math.PI / 2,
    flightProgress: 0,
    particles: [],
    quiverTick: 0
};

// Mode 5 (Cannon Bomb Strike) State
let cannonStrikeState = {
    crates: [], // 18 wooden crates (6 cols x 3 rows)
    aimIdx: 0,
    selectedIdx: -1,
    phase: 'idle', // 'scanning', 'firing', 'exploding', 'done'
    cannonAngle: 0,
    recoil: 0,
    shellX: 640,
    shellY: 515,
    flightProgress: 0,
    debris: [],
    shockwaveR: 0
};

// Mode 8 (Realistic IK Hand Bomb Toss) State
let bombState = {
    players: [],
    fromIdx: 0,
    toIdx: 1,
    passProgress: 0,
    phase: 'windup',
    passesLeft: 7,
    exploded: false,
    shockwaveR: 0
};

function openGameStage(modeId) {
    StudioAudioManager.stopAllActiveSounds();
    if (stageAnimFrame) cancelAnimationFrame(stageAnimFrame);
    isStageRunning = false;

    activeStageMode = modeId;
    lastOpenedGameMode = modeId;
    const modeObj = EIGHT_MODES.find(m => m.id === modeId) || EIGHT_MODES[0];
    document.getElementById('stageModeBadge').textContent = `MODE ${modeObj.id}`;
    document.getElementById('stageModeBadge').style.background = modeObj.color;
    document.getElementById('stageModeTitle').textContent = modeObj.title;

    const actBtn = document.getElementById('stageActionBtn');
    if (modeId === 4) {
        document.getElementById('stageWinnerBanner').textContent = "Ready — tap a student's target or press START";
        actBtn.innerHTML = `<i class="fa-solid fa-bullseye"></i> START / PICK WINNER`;
    } else if (modeId === 5) {
        document.getElementById('stageWinnerBanner').textContent = "Ready — tap a name crate or FIRE CANNON";
        actBtn.innerHTML = `<i class="fa-solid fa-bomb"></i> FIRE CANNON`;
    } else {
        document.getElementById('stageWinnerBanner').textContent = "Ready — Click START!";
        actBtn.innerHTML = `<i class="fa-solid fa-play"></i> START / SPIN NOW`;
    }

    document.getElementById('stageWinnerOverlay').style.display = 'none';
    document.getElementById('gameStageModal').style.display = 'flex';

    const canvas = document.getElementById('stageCanvas');
    const boxesGrid = document.getElementById('mysteryBoxesGrid');

    if (modeId === 6) {
        canvas.style.display = 'none';
        boxesGrid.style.display = 'grid';
        renderInteractiveMysteryBoxes();
    } else {
        boxesGrid.style.display = 'none';
        canvas.style.display = 'block';
        prepareStageEntities(modeId);
        drawStageFrame(false);
    }
    StudioAudioManager.playSFX('pop');
}

function closeGameStage() {
    StudioAudioManager.stopAllActiveSounds();
    if (stageAnimFrame) cancelAnimationFrame(stageAnimFrame);
    isStageRunning = false;
    document.getElementById('gameStageModal').style.display = 'none';
}

// Direct Touch / Click on Canvas for Mode 4 (Arrow Targets) & Mode 5 (Wooden Crates)
document.getElementById('stageCanvas').addEventListener('click', (e) => {
    if (isStageRunning) return;
    const canvas = document.getElementById('stageCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (activeStageMode === 4) {
        const hitIdx = arrowStrikeState.targets.findIndex(t => Math.hypot(mx - t.x, my - t.y) <= t.r + 22);
        if (hitIdx !== -1) startArrowStrikeAnimation(hitIdx);
    } else if (activeStageMode === 5) {
        const hitIdx = cannonStrikeState.crates.findIndex(c => mx >= c.x - c.w / 2 && mx <= c.x + c.w / 2 && my >= c.y - c.h / 2 && my <= c.y + c.h / 2);
        if (hitIdx !== -1) startCannonStrikeAnimation(hitIdx);
    }
});

// MODE 6: TURBO INTERACTIVE 3D MYSTERY CHESTS
let mysteryBoxStudents = [];

function renderInteractiveMysteryBoxes() {
    const grid = document.getElementById('mysteryBoxesGrid');
    grid.innerHTML = '';
    const pool = [...getUnpickedPool(1)].sort(() => Math.random() - 0.5);
    mysteryBoxStudents = [];
    for (let i = 0; i < 12; i++) {
        mysteryBoxStudents.push(pool[i % pool.length]);
    }

    mysteryBoxStudents.forEach((stuName, idx) => {
        const box = document.createElement('div');
        box.className = 'mystery-chest-card';
        box.id = 'mysteryChest_' + idx;
        box.onclick = () => {
            if (isStageRunning) return;
            openSpecificMysteryBox(idx);
        };
        box.innerHTML = `
            <div style="font-size:52px; filter:drop-shadow(0 6px 10px rgba(180,83,9,0.25));">🎁</div>
            <strong style="font-size:15px; color:#92400e; margin-top:6px;">MYSTERY BOX #${idx + 1}</strong>
            <small style="font-size:11px; color:#b45309; font-weight:700;">Tap to Open Instantly!</small>
        `;
        grid.appendChild(box);
    });
}

function runTurboMysteryBoxScan() {
    isStageRunning = true;
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    renderInteractiveMysteryBoxes();

    let step = 0;
    const totalSteps = 20;
    const winnerIdx = Math.floor(Math.random() * 12);

    function nextHighlight() {
        document.querySelectorAll('.mystery-chest-card').forEach(el => el.classList.remove('scanning'));
        const curIdx = step < totalSteps - 1 ? Math.floor(Math.random() * 12) : winnerIdx;
        const activeBox = document.getElementById('mysteryChest_' + curIdx);
        if (activeBox) activeBox.classList.add('scanning');
        StudioAudioManager.playSFX('click');

        step++;
        if (step < totalSteps) {
            setTimeout(nextHighlight, 48 + step * 4);
        } else {
            isStageRunning = false;
            openSpecificMysteryBox(winnerIdx);
        }
    }
    nextHighlight();
}

function openSpecificMysteryBox(idx) {
    document.querySelectorAll('.mystery-chest-card').forEach(el => el.classList.remove('scanning'));
    const chosenBox = document.getElementById('mysteryChest_' + idx);
    const winnerName = mysteryBoxStudents[idx] || getActiveStudents()[0];

    if (chosenBox) {
        chosenBox.classList.add('opened-winner');
        chosenBox.innerHTML = `
            <div style="font-size:46px;">🎉</div>
            <strong style="font-size:18px; color:#ffffff; margin-top:4px; text-align:center; padding:0 8px;">${winnerName}</strong>
            <small style="font-size:11px; color:#d1fae5; font-weight:800;">WINNER UNLOCKED!</small>
        `;
    }

    stagePickedWinner = winnerName;
    appState.challenger = winnerName;
    markStudentPicked(winnerName);
    syncStudioData();
    renderAllDashboard();

    StudioAudioManager.playSFX('cheer');
    document.getElementById('stageWinnerBanner').textContent = `🎁 Box #${idx + 1} Opened: ${winnerName}!`;
    showWinnerPopup("🎁", "MYSTERY BOX WINNER", winnerName);
}

function showWinnerPopup(emoji, subtitle, name) {
    document.getElementById('winnerOverlayEmoji').textContent = emoji;
    document.getElementById('winnerOverlaySub').textContent = subtitle;
    document.getElementById('winnerOverlayName').textContent = name;
    document.getElementById('stageWinnerOverlay').style.display = 'block';
}

function prepareStageEntities(modeId) {
    const pool = [...getUnpickedPool(2)].sort(() => Math.random() - 0.5);
    const allStudents = getActiveStudents();
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
    stageTick = 0;

    if (modeId === 1) {
        stageEntities = pool.slice(0, 6).map((name, i) => ({
            name, x: 90, speed: 4.5 + Math.random() * 2.2, color: colors[i % colors.length]
        }));
    } else if (modeId === 4) {
        // Mode 4: 18 Bullseye Targets (6 columns x 3 rows) matching screenshot
        arrowStrikeState.targets = [];
        const cols = 6, rows = 3;
        const startX = 115, stepX = 210;
        const startY = 170, stepY = 135;
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sName = pool[idx % pool.length] || allStudents[idx % allStudents.length] || `Student ${idx + 1}`;
                arrowStrikeState.targets.push({
                    idx,
                    name: sName,
                    x: startX + c * stepX,
                    y: startY + r * stepY,
                    r: 42,
                    hit: false
                });
                idx++;
            }
        }
        arrowStrikeState.aimIdx = -1;
        arrowStrikeState.selectedIdx = -1;
        arrowStrikeState.phase = 'idle';
        arrowStrikeState.bowAngle = -Math.PI / 2;
        arrowStrikeState.bowPull = 0;
        arrowStrikeState.flightProgress = 0;
        arrowStrikeState.particles = [];
        arrowStrikeState.quiverTick = 0;
    } else if (modeId === 5) {
        // Mode 5: 18 Wooden Name Crates (6 columns x 3 rows) matching screenshot
        cannonStrikeState.crates = [];
        const cols = 6, rows = 3;
        const startX = 122, stepX = 207;
        const startY = 180, stepY = 118;
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sName = pool[idx % pool.length] || allStudents[idx % allStudents.length] || `Student ${idx + 1}`;
                cannonStrikeState.crates.push({
                    idx,
                    name: sName,
                    x: startX + c * stepX,
                    y: startY + r * stepY,
                    w: 192,
                    h: 98,
                    shattered: false
                });
                idx++;
            }
        }
        cannonStrikeState.aimIdx = -1;
        cannonStrikeState.selectedIdx = -1;
        cannonStrikeState.phase = 'idle';
        cannonStrikeState.cannonAngle = 0;
        cannonStrikeState.recoil = 0;
        cannonStrikeState.flightProgress = 0;
        cannonStrikeState.debris = [];
        cannonStrikeState.shockwaveR = 0;
    } else if (modeId === 8) {
        const count = Math.min(8, Math.max(4, pool.length));
        const W = 1280, H = 620;
        bombState.players = pool.slice(0, count).map((name, i) => {
            const angle = Math.PI * 0.88 - (i / (count - 1)) * Math.PI * 0.76;
            return {
                name,
                x: W / 2 + Math.cos(angle) * 430,
                y: H * 0.62 - Math.sin(angle) * 145,
                color: colors[i % colors.length]
            };
        });
        bombState.fromIdx = 0;
        bombState.toIdx = 1 % bombState.players.length;
        bombState.passProgress = 0;
        bombState.phase = 'windup';
        bombState.passesLeft = 6 + Math.floor(Math.random() * 4);
        bombState.exploded = false;
        bombState.shockwaveR = 0;
    } else {
        stageEntities = pool.slice(0, 12).map((name, i) => ({
            name, color: colors[i % colors.length], angle: (i / Math.min(pool.length, 12)) * Math.PI * 2
        }));
    }
}

function triggerActiveStageAnimation() {
    if (isStageRunning) return;
    if (getActiveStudents().length === 0) return alert("No students in current class!");

    if (activeStageMode === 6) {
        runTurboMysteryBoxScan();
        return;
    }
    if (activeStageMode === 4) {
        startArrowStrikeAnimation(-1);
        return;
    }
    if (activeStageMode === 5) {
        startCannonStrikeAnimation(-1);
        return;
    }

    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    prepareStageEntities(activeStageMode);
    isStageRunning = true;
    stageTick = 0;
    document.getElementById('stageWinnerBanner').textContent = "🔥 60FPS Simulation Active...";
    StudioAudioManager.playSFX('select');

    function loopStage() {
        if (!isStageRunning) return;
        stageTick++;

        if (activeStageMode === 8) {
            updateBombTossPhysics();
            drawStageFrame(false);
            if (!bombState.exploded || bombState.shockwaveR < 220) {
                stageAnimFrame = requestAnimationFrame(loopStage);
            } else {
                finishStageAndCrownWinner();
            }
            return;
        }

        if (stageTick % 12 === 0) StudioAudioManager.playSFX('click');
        drawStageFrame(false);

        const maxFrames = activeStageMode === 1 ? 140 : 125;
        if (stageTick < maxFrames) {
            stageAnimFrame = requestAnimationFrame(loopStage);
        } else {
            finishStageAndCrownWinner();
        }
    }
    stageAnimFrame = requestAnimationFrame(loopStage);
}

// ============================================================================
// MODE 4 ANIMATION ENGINE: ARROW STRIKE PRECISION SHOT
// ============================================================================
function startArrowStrikeAnimation(forcedIdx = -1) {
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    if (arrowStrikeState.targets.length === 0 || arrowStrikeState.phase === 'hit') {
        prepareStageEntities(4);
    }

    isStageRunning = true;
    const chosenIdx = forcedIdx >= 0 ? forcedIdx : Math.floor(Math.random() * arrowStrikeState.targets.length);
    arrowStrikeState.selectedIdx = chosenIdx;
    arrowStrikeState.phase = forcedIdx >= 0 ? 'drawing' : 'scanning';
    arrowStrikeState.bowPull = 0;
    arrowStrikeState.flightProgress = 0;
    arrowStrikeState.quiverTick = 0;
    stageTick = 0;

    const bowOriginX = 605, bowOriginY = 562;

    function stepArrowStrike() {
        if (!isStageRunning) return;
        stageTick++;

        if (arrowStrikeState.phase === 'scanning') {
            if (stageTick % 4 === 0) {
                arrowStrikeState.aimIdx = Math.floor(Math.random() * arrowStrikeState.targets.length);
                const t = arrowStrikeState.targets[arrowStrikeState.aimIdx];
                arrowStrikeState.bowAngle = Math.atan2(t.y - bowOriginY, t.x - bowOriginX);
                StudioAudioManager.playSFX('click');
            }
            if (stageTick >= 44) {
                arrowStrikeState.aimIdx = arrowStrikeState.selectedIdx;
                arrowStrikeState.phase = 'drawing';
                stageTick = 0;
            }
        } else if (arrowStrikeState.phase === 'drawing') {
            const target = arrowStrikeState.targets[arrowStrikeState.selectedIdx];
            const desiredAngle = Math.atan2(target.y - bowOriginY, target.x - bowOriginX);
            arrowStrikeState.bowAngle += (desiredAngle - arrowStrikeState.bowAngle) * 0.25;
            arrowStrikeState.bowPull = Math.min(1, stageTick / 18);

            if (stageTick === 18) {
                arrowStrikeState.phase = 'flying';
                arrowStrikeState.flightProgress = 0;
                StudioAudioManager.playArrowReleaseSound(); // Realistic Bow Twang + Air Whoosh!
            }
        } else if (arrowStrikeState.phase === 'flying') {
            arrowStrikeState.flightProgress += 0.085; // High-velocity precision shot
            arrowStrikeState.bowPull = Math.max(0, arrowStrikeState.bowPull - 0.35);

            const target = arrowStrikeState.targets[arrowStrikeState.selectedIdx];
            const p = Math.min(1, arrowStrikeState.flightProgress);
            arrowStrikeState.arrowX = bowOriginX + (target.x - bowOriginX) * p;
            arrowStrikeState.arrowY = bowOriginY + (target.y - bowOriginY) * p;
            arrowStrikeState.arrowAngle = Math.atan2(target.y - bowOriginY, target.x - bowOriginX);

            if (arrowStrikeState.flightProgress >= 1) {
                arrowStrikeState.phase = 'hit';
                target.hit = true;
                arrowStrikeState.quiverTick = 22;
                StudioAudioManager.playArrowHitSound(); // Realistic Bullseye Thud!

                // Spawn bullseye impact sparks
                arrowStrikeState.particles = [];
                for (let i = 0; i < 24; i++) {
                    const ang = (Math.PI * 2 * i) / 24;
                    const spd = 2.5 + Math.random() * 5.5;
                    arrowStrikeState.particles.push({
                        x: target.x,
                        y: target.y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        color: ['#fde047', '#ef4444', '#38bdf8', '#ffffff'][i % 4],
                        life: 1
                    });
                }
            }
        } else if (arrowStrikeState.phase === 'hit') {
            if (arrowStrikeState.quiverTick > 0) arrowStrikeState.quiverTick--;
            arrowStrikeState.particles.forEach(pt => {
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.life -= 0.04;
            });
            arrowStrikeState.particles = arrowStrikeState.particles.filter(pt => pt.life > 0);

            if (arrowStrikeState.quiverTick === 0 && arrowStrikeState.particles.length === 0) {
                isStageRunning = false;
                const winner = arrowStrikeState.targets[arrowStrikeState.selectedIdx].name;
                stagePickedWinner = winner;
                appState.challenger = winner;
                markStudentPicked(winner);
                syncStudioData();
                renderAllDashboard();
                StudioAudioManager.playSFX('cheer');
                document.getElementById('stageWinnerBanner').textContent = `🎯 Bullseye! Winner: ${winner}!`;
                showWinnerPopup("🎯", "ARROW STRIKE BULLSEYE", winner);
                drawStageFrame(true);
                return;
            }
        }

        drawStageFrame(false);
        stageAnimFrame = requestAnimationFrame(stepArrowStrike);
    }
    stageAnimFrame = requestAnimationFrame(stepArrowStrike);
}

// ============================================================================
// MODE 5 ANIMATION ENGINE: CANNON BOMB STRIKE
// ============================================================================
function startCannonStrikeAnimation(forcedIdx = -1) {
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    if (cannonStrikeState.crates.length === 0 || cannonStrikeState.phase === 'done') {
        prepareStageEntities(5);
    }

    isStageRunning = true;
    const chosenIdx = forcedIdx >= 0 ? forcedIdx : Math.floor(Math.random() * cannonStrikeState.crates.length);
    cannonStrikeState.selectedIdx = chosenIdx;
    cannonStrikeState.phase = forcedIdx >= 0 ? 'aiming' : 'scanning';
    cannonStrikeState.flightProgress = 0;
    cannonStrikeState.recoil = 0;
    cannonStrikeState.shockwaveR = 0;
    stageTick = 0;

    const cannonOriginX = 640, cannonOriginY = 540;

    function stepCannonStrike() {
        if (!isStageRunning) return;
        stageTick++;

        if (cannonStrikeState.phase === 'scanning') {
            if (stageTick % 4 === 0) {
                cannonStrikeState.aimIdx = Math.floor(Math.random() * cannonStrikeState.crates.length);
                const c = cannonStrikeState.crates[cannonStrikeState.aimIdx];
                cannonStrikeState.cannonAngle = Math.atan2(c.x - cannonOriginX, cannonOriginY - c.y) * 0.38;
                StudioAudioManager.playSFX('click');
            }
            if (stageTick >= 44) {
                cannonStrikeState.aimIdx = cannonStrikeState.selectedIdx;
                cannonStrikeState.phase = 'aiming';
                stageTick = 0;
            }
        } else if (cannonStrikeState.phase === 'aiming') {
            const target = cannonStrikeState.crates[cannonStrikeState.selectedIdx];
            const desired = Math.atan2(target.x - cannonOriginX, cannonOriginY - target.y) * 0.42;
            cannonStrikeState.cannonAngle += (desired - cannonStrikeState.cannonAngle) * 0.28;

            if (stageTick >= 14) {
                cannonStrikeState.phase = 'firing';
                cannonStrikeState.recoil = 18;
                cannonStrikeState.flightProgress = 0;
                StudioAudioManager.playCannonFireSound(); // Realistic Cannon Muzzle Blast!
            }
        } else if (cannonStrikeState.phase === 'firing') {
            cannonStrikeState.recoil = Math.max(0, cannonStrikeState.recoil - 1.8);
            cannonStrikeState.flightProgress += 0.055;

            const target = cannonStrikeState.crates[cannonStrikeState.selectedIdx];
            const p = Math.min(1, cannonStrikeState.flightProgress);
            cannonStrikeState.shellX = cannonOriginX + (target.x - cannonOriginX) * p;
            cannonStrikeState.shellY = (cannonOriginY - 45) + (target.y - (cannonOriginY - 45)) * p - Math.sin(p * Math.PI) * 95;

            if (cannonStrikeState.flightProgress >= 1) {
                cannonStrikeState.phase = 'exploding';
                target.shattered = true;
                cannonStrikeState.shockwaveR = 12;
                StudioAudioManager.playBombExplosionSound(); // Realistic Bomb & Wood Crate Explosion!

                // Spawn flying wooden splinters & fire sparks
                cannonStrikeState.debris = [];
                for (let i = 0; i < 28; i++) {
                    const ang = (Math.PI * 2 * i) / 28;
                    const spd = 3 + Math.random() * 7;
                    cannonStrikeState.debris.push({
                        x: target.x,
                        y: target.y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd - 2,
                        rot: Math.random() * Math.PI,
                        vRot: (Math.random() - 0.5) * 0.3,
                        color: ['#92400e', '#b45309', '#f97316', '#fde047'][i % 4],
                        life: 1
                    });
                }
            }
        } else if (cannonStrikeState.phase === 'exploding') {
            cannonStrikeState.shockwaveR += 11;
            cannonStrikeState.debris.forEach(d => {
                d.x += d.vx;
                d.y += d.vy;
                d.vy += 0.25;
                d.rot += d.vRot;
                d.life -= 0.032;
            });
            cannonStrikeState.debris = cannonStrikeState.debris.filter(d => d.life > 0);

            if (cannonStrikeState.debris.length === 0) {
                cannonStrikeState.phase = 'done';
                isStageRunning = false;
                const winner = cannonStrikeState.crates[cannonStrikeState.selectedIdx].name;
                stagePickedWinner = winner;
                appState.challenger = winner;
                markStudentPicked(winner);
                syncStudioData();
                renderAllDashboard();
                StudioAudioManager.playSFX('cheer');
                document.getElementById('stageWinnerBanner').textContent = `💥 Direct Hit! Winner: ${winner}!`;
                showWinnerPopup("💥", "CANNON STRIKE WINNER", winner);
                drawStageFrame(true);
                return;
            }
        }

        drawStageFrame(false);
        stageAnimFrame = requestAnimationFrame(stepCannonStrike);
    }
    stageAnimFrame = requestAnimationFrame(stepCannonStrike);
}

// ============================================================================
// MODE 8 ANIMATION ENGINE: REALISTIC IK ARM THROWING & PARABOLIC BOMB PHYSICS
// ============================================================================
function updateBombTossPhysics() {
    if (bombState.exploded) {
        bombState.shockwaveR += 12;
        return;
    }

    bombState.passProgress += 0.036;

    if (bombState.passProgress < 0.28) {
        bombState.phase = 'windup';
    } else {
        if (bombState.phase === 'windup') {
            bombState.phase = 'flight';
            StudioAudioManager.playArrowReleaseSound();
        }
    }

    if (bombState.passProgress >= 1) {
        bombState.passProgress = 0;
        bombState.fromIdx = bombState.toIdx;
        bombState.passesLeft--;
        StudioAudioManager.playSFX('pop');

        if (bombState.passesLeft <= 0) {
            bombState.exploded = true;
            bombState.shockwaveR = 10;
            StudioAudioManager.playBombExplosionSound();
        } else {
            let next = Math.floor(Math.random() * bombState.players.length);
            while (next === bombState.fromIdx && bombState.players.length > 1) {
                next = Math.floor(Math.random() * bombState.players.length);
            }
            bombState.toIdx = next;
            bombState.phase = 'windup';
        }
    }
}

function finishStageAndCrownWinner() {
    isStageRunning = false;
    StudioAudioManager.stopAllActiveSounds();
    StudioAudioManager.playSFX('cheer');

    const pool = getUnpickedPool(2);
    if (activeStageMode === 2 && pool.length >= 2) {
        const rIdx = Math.floor(Math.random() * pool.length);
        let cIdx = Math.floor(Math.random() * pool.length);
        while (cIdx === rIdx) cIdx = Math.floor(Math.random() * pool.length);
        appState.reader = pool[rIdx];
        appState.challenger = pool[cIdx];
        markStudentPicked(appState.reader);
        markStudentPicked(appState.challenger);
        stagePickedWinner = appState.challenger;
        document.getElementById('stageWinnerBanner').textContent = `🎤 Reader: ${appState.reader} | 💡 Challenger: ${appState.challenger}`;
        showWinnerPopup("⚡", `🎤 READER: ${appState.reader}`, `💡 ${appState.challenger}`);
    } else if (activeStageMode === 8 && bombState.players.length > 0) {
        const holder = bombState.players[bombState.fromIdx];
        stagePickedWinner = holder.name;
        appState.challenger = holder.name;
        markStudentPicked(holder.name);
        document.getElementById('stageWinnerBanner').textContent = `💥 BOOM! Selected: ${holder.name}!`;
        showWinnerPopup("💥", "BOMB TOSS CHALLENGER", holder.name);
    } else if (activeStageMode === 1 && stageEntities.length > 0) {
        let leader = stageEntities.reduce((a, b) => (a.x > b.x ? a : b));
        stagePickedWinner = leader.name;
        appState.challenger = leader.name;
        markStudentPicked(leader.name);
        document.getElementById('stageWinnerBanner').textContent = `🏆 Race Winner: ${leader.name}!`;
        showWinnerPopup("🏎️", "GRAN TURISMO CHAMPION", leader.name);
    } else {
        const winner = pool[Math.floor(Math.random() * pool.length)];
        stagePickedWinner = winner;
        appState.challenger = winner;
        markStudentPicked(winner);
        document.getElementById('stageWinnerBanner').textContent = `🎉 Selected: ${winner}!`;
        showWinnerPopup("🌟", "SELECTED CHALLENGER", winner);
    }

    syncStudioData();
    renderAllDashboard();
    drawStageFrame(true);
}

function sendStageWinnerToQuiz() {
    closeGameStage();
    switchPortal('quiz');
}

// ============================================================================
// 7. HIGH-DEFINITION CANVAS RENDERING (ALL MODES + ATTACHED GAMES 4 & 5)
// ============================================================================
function drawStageFrame(isFinal = false) {
    const canvas = document.getElementById('stageCanvas');
    if (!canvas || activeStageMode === 6) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (activeStageMode === 4) {
        drawArrowStrikeArena(ctx, W, H);
        return;
    }
    if (activeStageMode === 5) {
        drawCannonBombStrikeArena(ctx, W, H);
        return;
    }
    if (activeStageMode === 8) {
        drawRealisticBombTossArena(ctx, W, H);
        return;
    }

    if (activeStageMode === 1) {
        const sky = ctx.createLinearGradient(0, 0, 0, 175);
        sky.addColorStop(0, '#0284c7'); sky.addColorStop(1, '#bae6fd');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 175);
        ctx.fillStyle = '#15803d'; ctx.fillRect(0, 175, W, H - 175);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 200, W, H - 225);

        for (let cx = -50; cx < W + 50; cx += 50) {
            const sx = cx - ((stageTick * 20) % 100);
            ctx.fillStyle = Math.floor(cx / 50) % 2 === 0 ? '#ef4444' : '#ffffff';
            ctx.fillRect(sx, 188, 50, 12);
            ctx.fillRect(sx, H - 25, 50, 12);
        }

        const finX = W - 160;
        for (let r = 0; r < 18; r++) {
            ctx.fillStyle = r % 2 === 0 ? '#ffffff' : '#0f172a';
            ctx.fillRect(finX, 200 + r * 22, 22, 22);
        }

        const laneH = (H - 235) / Math.max(stageEntities.length, 1);
        stageEntities.forEach((car, i) => {
            if (isStageRunning) {
                car.x += car.speed + (Math.random() * 2.8);
                if (car.x > finX) car.x = finX;
            }
            const cy = 215 + i * laneH + laneH * 0.45;
            if (isStageRunning) {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath(); ctx.ellipse(car.x - 16, cy, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = car.color;
            ctx.beginPath(); ctx.roundRect(car.x, cy - 15, 86, 30, 10); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.roundRect(car.x + 26, cy - 12, 32, 24, 6); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.font = '900 15px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(car.name, car.x, cy - 22);
        });
    } else if (activeStageMode === 2) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
        const students = getActiveStudents();
        const rName = isStageRunning ? students[stageTick % students.length] : (appState.reader || "Reader");
        const cName = isStageRunning ? students[(stageTick + 3) % students.length] : (appState.challenger || "Challenger");

        ctx.fillStyle = '#1e3a8a'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.roundRect(140, 110, 380, 380, 40); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = '900 24px sans-serif';
        ctx.fillText('🎤 QUESTION READER', 330, 195);
        ctx.fillStyle = '#fde047'; ctx.font = '900 30px sans-serif';
        ctx.fillText(rName, 330, 315);

        ctx.fillStyle = '#065f46'; ctx.strokeStyle = '#34d399'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.roundRect(760, 110, 380, 380, 40); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = '900 24px sans-serif';
        ctx.fillText('💡 ANSWER CHALLENGER', 950, 195);
        ctx.fillStyle = '#6ee7b7'; ctx.font = '900 30px sans-serif';
        ctx.fillText(cName, 950, 315);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(W / 2, 300, 56, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = '900 34px sans-serif';
        ctx.fillText('VS', W / 2, 312);
        ctx.textAlign = 'left';
    } else if (activeStageMode === 3) {
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2, r = 245;
        const n = Math.max(stageEntities.length, 1);
        const arc = (Math.PI * 2) / n;
        const rot = stageTick * 0.16;

        stageEntities.forEach((ent, i) => {
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, rot + i * arc, rot + (i + 1) * arc);
            ctx.closePath();
            ctx.fillStyle = ent.color; ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rot + (i + 0.5) * arc);
            ctx.fillStyle = '#ffffff'; ctx.font = '900 15px sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(ent.name.slice(0, 18), r - 20, 5);
            ctx.restore();
        });
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    } else if (activeStageMode === 7) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        const n = Math.max(stageEntities.length, 1);

        const sortedCards = stageEntities.map((ent, i) => {
            const ang = (stageTick * 0.05) + (i / n) * Math.PI * 2;
            return { ...ent, x: cx + Math.sin(ang) * 380, z: Math.cos(ang), scale: 0.65 + (Math.cos(ang) + 1) * 0.32 };
        }).sort((a, b) => a.z - b.z);

        sortedCards.forEach(card => {
            const cw = 170 * card.scale, ch = 240 * card.scale;
            ctx.save();
            ctx.globalAlpha = 0.45 + (card.z + 1) * 0.27;
            ctx.fillStyle = '#1e3a8a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(card.x - cw / 2, cy - ch / 2, cw, ch, 20);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(15 * card.scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText("🃏 HOLO CARD", card.x, cy - ch * 0.22);
            ctx.fillStyle = '#fde047';
            ctx.fillText(card.name.slice(0, 16), card.x, cy + ch * 0.15);
            ctx.restore();
        });
        ctx.textAlign = 'left';
    }
}

// ============================================================================
// RENDER MODE 4: ARROW STRIKE — PRECISION SHOT (MATCHES ATTACHED SCREENSHOT)
// ============================================================================
function drawArrowStrikeArena(ctx, W, H) {
    // 1. Bright Daylight Sky & Sun
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    skyGrad.addColorStop(0, '#2596ff');
    skyGrad.addColorStop(0.75, '#8fd3ff');
    skyGrad.addColorStop(1, '#d8f3ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Glowing Sun on Top Right
    const sunGrad = ctx.createRadialGradient(1045, 82, 8, 1045, 82, 85);
    sunGrad.addColorStop(0, '#fef9c3');
    sunGrad.addColorStop(0.35, '#fde047');
    sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(1045, 82, 85, 0, Math.PI * 2); ctx.fill();

    // 2. Green Archery Field & Distant Hills
    const grassGrad = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.85);
    grassGrad.addColorStop(0, '#9be16b');
    grassGrad.addColorStop(0.5, '#68b836');
    grassGrad.addColorStop(1, '#48931e');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, H * 0.45, W, H * 0.42);

    // Bottom Asphalt Shooting Line
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, H * 0.86, W, H * 0.14);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.setLineDash([18, 18]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, H * 0.90); ctx.lineTo(W, H * 0.90); ctx.stroke();
    ctx.setLineDash([]);

    // Top-Left & Top-Right HUD Badges
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(16, 16, 405, 62, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.font = '900 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🎯 ARROW STRIKE • PRECISION SHOT', 32, 43);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '700 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("Choose a student's target or press START for a random precision shot.", 32, 63);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath(); ctx.roundRect(W - 195, 16, 178, 36, 18); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.font = '900 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WIND: LOW • RANGE: 25M', W - 106, 39);

    // 3. Draw 18 Concentric 3D Bullseye Targets + White Name Pills
    arrowStrikeState.targets.forEach((t, idx) => {
        const isHighlighted = (idx === arrowStrikeState.aimIdx || idx === arrowStrikeState.selectedIdx);

        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.hit && arrowStrikeState.quiverTick > 0) {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        }

        // Outer Target Shadow & Rim
        ctx.fillStyle = isHighlighted ? 'rgba(250, 204, 21, 0.45)' : 'rgba(15, 23, 42, 0.22)';
        ctx.beginPath(); ctx.arc(0, 5, t.r + (isHighlighted ? 7 : 2), 0, Math.PI * 2); ctx.fill();

        // Ring 1: White Outer
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(0, 0, t.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = isHighlighted ? '#facc15' : '#cbd5e1';
        ctx.lineWidth = isHighlighted ? 4 : 2;
        ctx.stroke();

        // Ring 2: Crimson Red
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(0, 0, t.r * 0.74, 0, Math.PI * 2); ctx.fill();

        // Ring 3: White Inner
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, t.r * 0.54, 0, Math.PI * 2); ctx.fill();

        // Ring 4: Royal Blue
        ctx.fillStyle = '#2563eb';
        ctx.beginPath(); ctx.arc(0, 0, t.r * 0.38, 0, Math.PI * 2); ctx.fill();

        // Ring 5: Gold Bullseye Center
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(0, 0, t.r * 0.19, 0, Math.PI * 2); ctx.fill();

        // Embedded Arrow if Hit
        if (t.hit) {
            const qShake = Math.sin(arrowStrikeState.quiverTick * 1.6) * (arrowStrikeState.quiverTick * 0.015);
            ctx.rotate(qShake);
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 28); ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(18, 28); ctx.lineTo(26, 26); ctx.lineTo(20, 35); ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // Student Name White Pill Below Target
        ctx.save();
        ctx.fillStyle = isHighlighted ? '#fef08a' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isHighlighted ? '#f59e0b' : 'rgba(203, 213, 225, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(t.x - 76, t.y + t.r + 4, 152, 27, 9);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 12px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.name.slice(0, 20), t.x, t.y + t.r + 22);
        ctx.restore();
    });

    // 4. Draw Realistic Compound Bow at Bottom Center
    const bowX = 605, bowY = 562;
    ctx.save();
    ctx.translate(bowX, bowY);
    ctx.rotate(arrowStrikeState.bowAngle);

    // Bow Curved Riser & Limbs
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-12, 0, 44, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-10, 0, 44, -Math.PI * 0.25, Math.PI * 0.25);
    ctx.stroke();

    // Elastic Bowstring
    const pullOffset = -arrowStrikeState.bowPull * 26;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -42);
    ctx.lineTo(-4 + pullOffset, 0);
    ctx.lineTo(-4, 42);
    ctx.stroke();

    // Nocked Arrow before release
    if (arrowStrikeState.phase !== 'flying' && arrowStrikeState.phase !== 'hit') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-4 + pullOffset, 0);
        ctx.lineTo(54 + pullOffset, 0);
        ctx.stroke();

        // Steel Arrowhead
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(64 + pullOffset, 0);
        ctx.lineTo(50 + pullOffset, -6);
        ctx.lineTo(50 + pullOffset, 6);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // 5. Draw Flying Arrow in Mid-Air
    if (arrowStrikeState.phase === 'flying') {
        ctx.save();
        ctx.translate(arrowStrikeState.arrowX, arrowStrikeState.arrowY);
        ctx.rotate(arrowStrikeState.arrowAngle);

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(25, 0); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(20, -7); ctx.lineTo(20, 7); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(-46, -7); ctx.lineTo(-42, 0); ctx.lineTo(-46, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // 6. Impact Particles
    arrowStrikeState.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });

    ctx.textAlign = 'left';
}

// ============================================================================
// RENDER MODE 5: CANNON BOMB STRIKE (MATCHES ATTACHED SCREENSHOT)
// ============================================================================
function drawCannonBombStrikeArena(ctx, W, H) {
    // 1. Night Desert Sky & Ground Grid
    const nightGrad = ctx.createLinearGradient(0, 0, 0, H * 0.78);
    nightGrad.addColorStop(0, '#07142b');
    nightGrad.addColorStop(0.65, '#13284c');
    nightGrad.addColorStop(1, '#3b2d38');
    ctx.fillStyle = nightGrad;
    ctx.fillRect(0, 0, W, H * 0.78);

    // Desert Artillery Floor with Perspective Grid
    const floorGrad = ctx.createLinearGradient(0, H * 0.78, 0, H);
    floorGrad.addColorStop(0, '#783f27');
    floorGrad.addColorStop(1, '#522817');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 90) {
        ctx.beginPath(); ctx.moveTo(W / 2 + (x - W / 2) * 0.5, H * 0.78); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = H * 0.80; y < H; y += 26) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Top-Left & Top-Right HUD Badges
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(16, 16, 445, 62, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fb923c'; ctx.font = '900 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('💣 CANNON BLAST • NAME STRIKE', 32, 43);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '700 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("Select a name crate or fire at a random student. The shell hits the selected target.", 32, 63);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath(); ctx.roundRect(W - 205, 16, 188, 36, 18); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.font = '900 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RANGE: 120M • SHELL: READY', W - 111, 39);

    // 2. Draw 18 Wooden Name Crates (6x3 Grid)
    cannonStrikeState.crates.forEach((c, idx) => {
        const isHighlighted = (idx === cannonStrikeState.aimIdx || idx === cannonStrikeState.selectedIdx);

        ctx.save();
        ctx.translate(c.x, c.y);

        if (c.shattered) {
            ctx.globalAlpha = 0.22;
        }

        // Wooden Crate Box
        const woodGrad = ctx.createLinearGradient(0, -c.h / 2, 0, c.h / 2);
        woodGrad.addColorStop(0, '#7c3f1c');
        woodGrad.addColorStop(0.5, '#5c2d12');
        woodGrad.addColorStop(1, '#3e1d0a');
        ctx.fillStyle = woodGrad;
        ctx.strokeStyle = isHighlighted ? '#fde047' : '#b46934';
        ctx.lineWidth = isHighlighted ? 4 : 2;
        ctx.beginPath();
        ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10);
        ctx.fill(); ctx.stroke();

        // Horizontal Wood Plank Lines
        ctx.strokeStyle = 'rgba(255, 215, 160, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-c.w / 2 + 6, -12); ctx.lineTo(c.w / 2 - 6, -12);
        ctx.moveTo(-c.w / 2 + 6, 14); ctx.lineTo(c.w / 2 - 6, 14);
        ctx.stroke();

        // Glowing Bronze Student Medallion
        const medGrad = ctx.createRadialGradient(0, -14, 3, 0, -14, 19);
        medGrad.addColorStop(0, '#fde68a');
        medGrad.addColorStop(0.6, '#d97706');
        medGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = medGrad;
        ctx.beginPath(); ctx.arc(0, -14, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('👤', 0, -9);

        // Dark Name Banner Inside Crate
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath(); ctx.roundRect(-c.w / 2 + 14, 10, c.w - 28, 26, 6); ctx.fill();
        ctx.fillStyle = isHighlighted ? '#fde047' : '#ffffff';
        ctx.font = '900 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(c.name.slice(0, 20), 0, 27);

        ctx.restore();
    });

    // 3. Draw Heavy Artillery Cannon at Bottom Center
    const canX = 640, canY = 555;
    ctx.save();
    ctx.translate(canX, canY);

    // Left & Right Heavy Wheels
    [-48, 48].forEach(wx => {
        ctx.fillStyle = '#291d18';
        ctx.strokeStyle = '#b46934';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(wx, 18, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d97706';
        ctx.beginPath(); ctx.arc(wx, 18, 10, 0, Math.PI * 2); ctx.fill();
    });

    // Rotating Metallic Cannon Barrel with Recoil
    ctx.rotate(cannonStrikeState.cannonAngle);
    ctx.translate(0, cannonStrikeState.recoil);

    const barrelGrad = ctx.createLinearGradient(-24, 0, 24, 0);
    barrelGrad.addColorStop(0, '#1e293b');
    barrelGrad.addColorStop(0.5, '#94a3b8');
    barrelGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = barrelGrad;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-22, -78, 44, 86, 10);
    ctx.fill(); ctx.stroke();

    // Cannon Muzzle Rim
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(0, -76, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 4. Draw Flying Flaming Cannonball
    if (cannonStrikeState.phase === 'firing') {
        ctx.save();
        ctx.translate(cannonStrikeState.shellX, cannonStrikeState.shellY);

        const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4, '#f97316');
        glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#111827';
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // 5. Draw Explosion Shockwave & Flying Wooden Splinters
    if (cannonStrikeState.phase === 'exploding') {
        const target = cannonStrikeState.crates[cannonStrikeState.selectedIdx];
        if (target) {
            ctx.save();
            ctx.translate(target.x, target.y);
            const expGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, cannonStrikeState.shockwaveR);
            expGrad.addColorStop(0, '#ffffff');
            expGrad.addColorStop(0.35, '#fde047');
            expGrad.addColorStop(0.7, '#f97316');
            expGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = expGrad;
            ctx.beginPath(); ctx.arc(0, 0, cannonStrikeState.shockwaveR, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        cannonStrikeState.debris.forEach(d => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);
            ctx.fillStyle = d.color;
            ctx.fillRect(-7, -3.5, 14, 7);
            ctx.restore();
        });
    }

    ctx.textAlign = 'left';
}

// ============================================================================
// RENDER MODE 8: REALISTIC ARTICULATED IK HAND THROWING BOMB ARENA
// ============================================================================
function drawRealisticBombTossArena(ctx, W, H) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.55, '#1e293b');
    bgGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.66, 510, 185, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    const players = bombState.players;
    if (players.length === 0) return;

    const fromP = players[bombState.fromIdx];
    const toP = players[bombState.toIdx];
    const t = bombState.passProgress;

    let bombX = fromP.x, bombY = fromP.y - 45, bombRot = 0;

    players.forEach((p, idx) => {
        const isThrower = (idx === bombState.fromIdx && !bombState.exploded);
        const isReceiver = (idx === bombState.toIdx && !bombState.exploded);

        const dir = (toP.x >= p.x) ? 1 : -1;
        let torsoTilt = 0;
        let shoulderAngle = dir > 0 ? 0.4 : Math.PI - 0.4;
        let elbowBend = 0.5;
        let fingersOpen = false;

        if (isThrower) {
            if (t < 0.28) {
                const w = t / 0.28;
                torsoTilt = -dir * w * 0.24;
                shoulderAngle = dir > 0 ? (-2.25 * w) : (Math.PI + 2.25 * w);
                elbowBend = dir > 0 ? (-1.1 * w) : (1.1 * w);
                fingersOpen = false;
            } else if (t < 0.52) {
                const r = (t - 0.28) / 0.24;
                torsoTilt = dir * (0.28 * r);
                shoulderAngle = dir > 0 ? (-2.25 + 2.05 * r) : (Math.PI + 2.25 - 2.05 * r);
                elbowBend = dir > 0 ? (-1.1 + 1.2 * r) : (1.1 - 1.2 * r);
                fingersOpen = r > 0.25;
            } else {
                torsoTilt = dir * 0.12;
                shoulderAngle = dir > 0 ? 0.15 : Math.PI - 0.15;
                elbowBend = 0.15;
                fingersOpen = true;
            }
        } else if (isReceiver && t > 0.55) {
            const recDir = (fromP.x >= p.x) ? 1 : -1;
            shoulderAngle = recDir > 0 ? -0.45 : Math.PI + 0.45;
            elbowBend = recDir > 0 ? -0.4 : 0.4;
            fingersOpen = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, 48, 36, 12, 0, 0, Math.PI * 2); ctx.fill();

        ctx.rotate(torsoTilt);

        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.roundRect(-22, -18, 44, 58, 16); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();

        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(0, -38, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();

        const eyeShift = isThrower ? dir * 4 : 0;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(-6 + eyeShift, -40, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 + eyeShift, -40, 3.2, 0, Math.PI * 2); ctx.fill();

        const shX = dir * 14, shY = -8;
        const upperLen = 26, foreLen = 25;
        const elbX = shX + Math.cos(shoulderAngle) * upperLen;
        const elbY = shY + Math.sin(shoulderAngle) * upperLen;
        const wristAngle = shoulderAngle + elbowBend;
        const handX = elbX + Math.cos(wristAngle) * foreLen;
        const handY = elbY + Math.sin(wristAngle) * foreLen;

        ctx.strokeStyle = p.color; ctx.lineWidth = 11; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(elbX, elbY); ctx.stroke();

        ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(elbX, elbY); ctx.lineTo(handX, handY); ctx.stroke();

        ctx.fillStyle = '#fcd34d';
        ctx.beginPath(); ctx.arc(handX, handY, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5;
        const spread = fingersOpen ? 0.45 : 0.12;
        for (let f = -1; f <= 1; f++) {
            const fAng = wristAngle + f * spread;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX + Math.cos(fAng) * 10, handY + Math.sin(fAng) * 10);
            ctx.stroke();
        }

        ctx.restore();

        if (isThrower && t < 0.28) {
            const cosT = Math.cos(torsoTilt), sinT = Math.sin(torsoTilt);
            bombX = p.x + (handX * cosT - handY * sinT);
            bombY = p.y + (handX * sinT + handY * cosT);
            bombRot = -t * 4;
        }

        ctx.font = '900 13.5px "Plus Jakarta Sans", sans-serif';
        const tw = ctx.measureText(p.name).width + 18;
        ctx.fillStyle = idx === bombState.fromIdx ? '#ef4444' : 'rgba(15,23,42,0.88)';
        ctx.beginPath(); ctx.roundRect(p.x - tw / 2, p.y + 54, tw, 24, 8); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y + 71);
    });

    if (!bombState.exploded && t >= 0.28) {
        const flightT = (t - 0.28) / 0.72;
        const startX = fromP.x, startY = fromP.y - 35;
        const endX = toP.x, endY = toP.y - 30;
        const arcHeight = 165 + Math.abs(endX - startX) * 0.18;

        bombX = startX + (endX - startX) * flightT;
        bombY = (startY + (endY - startY) * flightT) - Math.sin(flightT * Math.PI) * arcHeight;
        bombRot = flightT * Math.PI * 5;

        ctx.strokeStyle = 'rgba(253, 224, 71, 0.28)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, Math.min(startY, endY) - arcHeight, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (!bombState.exploded) {
        ctx.save();
        ctx.translate(bombX, bombY);
        ctx.rotate(bombRot);

        const bGrad = ctx.createRadialGradient(-7, -7, 3, 0, 0, 22);
        bGrad.addColorStop(0, '#475569');
        bGrad.addColorStop(0.5, '#0f172a');
        bGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bGrad;
        ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-5, -26, 10, 6);
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(10, -36, 16, -32); ctx.stroke();

        ctx.fillStyle = stageTick % 2 === 0 ? '#fde047' : '#ef4444';
        ctx.beginPath(); ctx.arc(16, -32, 7 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    } else {
        const exP = players[bombState.fromIdx];
        ctx.save();
        ctx.translate(exP.x, exP.y - 20);
        const expGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, bombState.shockwaveR);
        expGrad.addColorStop(0, '#ffffff');
        expGrad.addColorStop(0.35, '#fde047');
        expGrad.addColorStop(0.7, '#ef4444');
        expGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = expGrad;
        ctx.beginPath(); ctx.arc(0, 0, bombState.shockwaveR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.textAlign = 'left';
}

// ============================================================================
// 8. GIANT QUIZ ARENA & SMART IMPORT (EXCEL + WORD + BOLD BLANKS)
// ============================================================================
let arenaTimerRef = null;
let currentQuizFontSize = 32;

function changeQuizFontSize(delta) {
    currentQuizFontSize = Math.max(20, Math.min(54, currentQuizFontSize + delta));
    document.getElementById('arenaQuestionText').style.setProperty('--quiz-font-size', currentQuizFontSize + 'px');
}

function renderArenaQuestion() {
    const list = appState.questions || DEFAULT_QUESTIONS;
    if (list.length === 0) return;
    if (appState.qIndex >= list.length) appState.qIndex = 0;

    const qObj = list[appState.qIndex];
    document.getElementById('arenaQCounter').textContent = `Question ${appState.qIndex + 1} of ${list.length}`;
    document.getElementById('arenaStatusMsg').textContent = '';
    const qTitleEl = document.getElementById('arenaQuestionText');
    const optsGrid = document.getElementById('arenaOptionsGrid');
    optsGrid.innerHTML = '';

    if (qObj.type === 'blanks') {
        document.getElementById('arenaQTypeBadge').textContent = "✨ Fill in the Blanks (Tap Blank to Flip & Reveal)";
        let html = qObj.q
            .replace(/<strong>(.*?)<\/strong>/gi, (_, ans) => buildBlankPillHTML(ans))
            .replace(/<b>(.*?)<\/b>/gi, (_, ans) => buildBlankPillHTML(ans))
            .replace(/\*\*(.*?)\*\*/g, (_, ans) => buildBlankPillHTML(ans));
        qTitleEl.innerHTML = html;
    } else {
        document.getElementById('arenaQTypeBadge').textContent = "Multiple Choice";
        qTitleEl.textContent = qObj.q;
        const letters = ['A', 'B', 'C', 'D'];
        (qObj.opts || []).forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-opt-btn';
            btn.id = 'arenaOpt_' + idx;
            btn.innerHTML = `<span style="background:#eff6ff; color:#2563eb; width:38px; height:38px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; font-weight:900; flex-shrink:0;">${letters[idx]}</span> <span>${optText}</span>`;
            btn.onclick = () => checkArenaAnswer(idx, qObj.ans);
            optsGrid.appendChild(btn);
        });
    }
}

function buildBlankPillHTML(answerText) {
    const safeAns = String(answerText).replace(/'/g, "\\'");
    return `<span class="blank-pill" onclick="revealBlankPill(this, '${safeAns}')"><i class="fa-solid fa-circle-question"></i> Tap to Reveal</span>`;
}

function revealBlankPill(el, answerText) {
    if (el.classList.contains('revealed')) return;
    el.classList.add('revealed');
    el.innerHTML = `<i class="fa-solid fa-check"></i> ${answerText}`;
    StudioAudioManager.playSFX('select');
}

function checkArenaAnswer(chosenIdx, correctIdx) {
    clearInterval(arenaTimerRef);
    document.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
    const picked = document.getElementById('arenaOpt_' + chosenIdx);

    if (chosenIdx === correctIdx) {
        if (picked) picked.classList.add('correct');
        StudioAudioManager.playSFX('cheer');
        document.getElementById('arenaStatusMsg').innerHTML = `<span style="color:#10b981;">🎉 Correct Answer! Well done, ${appState.challenger}!</span>`;
    } else {
        if (picked) picked.classList.add('wrong');
        const right = document.getElementById('arenaOpt_' + correctIdx);
        if (right) right.classList.add('correct');
        StudioAudioManager.playSFX('wrong');
        document.getElementById('arenaStatusMsg').innerHTML = `<span style="color:#e11d48;">❌ Not quite! Check the green answer.</span>`;
    }
}

function useArena5050() {
    const qObj = (appState.questions || DEFAULT_QUESTIONS)[appState.qIndex];
    if (!qObj || qObj.type === 'blanks') return;
    let wrongs = [0, 1, 2, 3].filter(i => i !== qObj.ans).sort(() => Math.random() - 0.5).slice(0, 2);
    wrongs.forEach(idx => {
        const b = document.getElementById('arenaOpt_' + idx);
        if (b) { b.style.opacity = '0.25'; b.disabled = true; }
    });
    StudioAudioManager.playSFX('pop');
}

function deleteCurrentArenaQuestion() {
    if (!appState.questions || appState.questions.length <= 1) {
        return showToast("⚠️ At least 1 question must remain.");
    }
    appState.questions.splice(appState.qIndex, 1);
    if (appState.qIndex >= appState.questions.length) appState.qIndex = 0;
    syncStudioData();
    renderArenaQuestion();
    StudioAudioManager.playSFX('click');
    showToast("🗑️ Deleted question");
}

function nextArenaQuestion() {
    StudioAudioManager.playSFX('click');
    const list = appState.questions || DEFAULT_QUESTIONS;
    appState.qIndex = (appState.qIndex + 1) % list.length;
    renderArenaQuestion();
    startArenaTimer(30);
}

function prevArenaQuestion() {
    StudioAudioManager.playSFX('click');
    const list = appState.questions || DEFAULT_QUESTIONS;
    appState.qIndex = (appState.qIndex - 1 + list.length) % list.length;
    renderArenaQuestion();
    startArenaTimer(30);
}

function startArenaTimer(sec) {
    clearInterval(arenaTimerRef);
    let rem = sec;
    const disp = document.getElementById('quizTimerDisplay');
    if (!disp) return;
    disp.textContent = `⏱️ ${rem}s`;
    arenaTimerRef = setInterval(() => {
        rem--;
        disp.textContent = `⏱️ ${rem}s`;
        if (rem <= 0) {
            clearInterval(arenaTimerRef);
            StudioAudioManager.playSFX('wrong');
        }
    }, 1000);
}

function speakCurrentQuestion() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const qObj = (appState.questions || DEFAULT_QUESTIONS)[appState.qIndex];
    if (!qObj) return;
    const cleanText = qObj.q.replace(/\*\*/g, '').replace(/<[^>]*>/g, '');
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText));
}

function openSmartImportModal() {
    document.getElementById('smartImportModal').style.display = 'flex';
}

async function handleExcelQuestionsUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let imported = [];

        rows.forEach((r, idx) => {
            if (!r || r.length === 0) return;
            const cells = r.map(c => c !== undefined && c !== null ? String(c).trim() : '').filter(Boolean);
            if (cells.length === 0) return;
            if (idx === 0 && /question|سؤال|type/i.test(cells.join(' '))) return;

            let startCol = 0;
            while (startCol < cells.length - 1 && (/^\d+$/.test(cells[startCol]) || /^(mcq|multiple choice|true\/false)$/i.test(cells[startCol]))) {
                startCol++;
            }

            const qText = cells[startCol];
            if (!qText) return;

            if (cells.length - startCol >= 5) {
                const opts = [cells[startCol + 1], cells[startCol + 2], cells[startCol + 3], cells[startCol + 4]];
                let ansRaw = (cells[startCol + 5] || 'A').toUpperCase();
                let ansIdx = ['A', 'B', 'C', 'D'].indexOf(ansRaw);
                if (ansIdx === -1) ansIdx = Math.max(0, Math.min(3, (parseInt(ansRaw) || 1) - 1));
                imported.push({ type: 'mcq', q: qText, opts, ans: ansIdx });
            } else {
                imported.push({ type: 'blanks', q: qText });
            }
        });

        if (imported.length > 0) {
            appState.questions = imported;
            appState.qIndex = 0;
            syncStudioData();
            renderArenaQuestion();
            document.getElementById('smartImportModal').style.display = 'none';
            switchPortal('quiz');
            StudioAudioManager.playSFX('select');
            showToast(`✅ Imported ${imported.length} questions!`);
        }
    } catch (e) { alert("Could not read Excel file."); }
    event.target.value = '';
}

async function handleWordQuestionsUpload(event, forceBlanks) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const buf = await file.arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: buf });
        const div = document.createElement('div');
        div.innerHTML = res.value;
        let imported = [];

        if (!forceBlanks) {
            div.querySelectorAll('table tr').forEach((tr, rIdx) => {
                const tds = Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim()).filter(Boolean);
                if (tds.length >= 5) {
                    if (rIdx === 0 && /question|سؤال/i.test(tds.join(' '))) return;
                    let s = (/^\d+$/.test(tds[0])) ? 1 : 0;
                    if (tds.length - s >= 5) {
                        let ansRaw = (tds[s + 5] || 'A').toUpperCase();
                        let ansIdx = ['A', 'B', 'C', 'D'].indexOf(ansRaw);
                        if (ansIdx === -1) ansIdx = Math.max(0, Math.min(3, (parseInt(ansRaw) || 1) - 1));
                        imported.push({ type: 'mcq', q: tds[s], opts: [tds[s+1], tds[s+2], tds[s+3], tds[s+4]], ans: ansIdx });
                    }
                }
            });
        }

        div.querySelectorAll('p, li').forEach(p => {
            const html = p.innerHTML.trim();
            if ((html.includes('<strong>') || html.includes('<b>') || html.includes('**')) && p.innerText.trim().length > 5) {
                imported.push({ type: 'blanks', q: html });
            }
        });

        if (imported.length > 0) {
            appState.questions = imported;
            appState.qIndex = 0;
            syncStudioData();
            renderArenaQuestion();
            document.getElementById('smartImportModal').style.display = 'none';
            switchPortal('quiz');
            StudioAudioManager.playSFX('select');
            showToast(`✅ Imported ${imported.length} questions from Word!`);
        } else {
            alert("No MCQ tables or Bold words found in this Word file.");
        }
    } catch (e) { alert("Could not read Word file."); }
    event.target.value = '';
}

function addQuickBlankSentences() {
    const raw = document.getElementById('quickBlanksTextarea').value.trim();
    if (!raw) return;
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 3);
    lines.forEach(line => appState.questions.push({ type: 'blanks', q: line }));
    appState.qIndex = appState.questions.length - 1;
    document.getElementById('quickBlanksTextarea').value = '';
    document.getElementById('smartImportModal').style.display = 'none';
    syncStudioData();
    renderArenaQuestion();
    switchPortal('quiz');
    StudioAudioManager.playSFX('select');
    showToast(`✅ Added ${lines.length} Blank question(s)!`);
}

function downloadSampleExcelTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
        ["Question", "Option A", "Option B", "Option C", "Option D", "Answer"],
        ["What is the SI unit of Force?", "Newton", "Joule", "Watt", "Pascal", "A"],
        ["Which planet is closest to the Sun?", "Venus", "Mercury", "Mars", "Earth", "B"]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "Smart_Studio_Questions_Template.xlsx");
}

function resetToDefaultQuestions() {
    appState.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    appState.qIndex = 0;
    syncStudioData();
    renderArenaQuestion();
    document.getElementById('smartImportModal').style.display = 'none';
    showToast("Reset to default questions");
}

// ============================================================================
// 9. COLLABORATIVE GROUP BUILDER & ROSTER MANAGEMENT
// ============================================================================
let draggedStuName = null;

function renderGroupRoster() {
    const cont = document.getElementById('rightRosterContainer');
    const badge = document.getElementById('groupRosterCountBadge');
    if (!cont) return;
    const q = (document.getElementById('rosterSearchInput')?.value || '').toLowerCase();
    const all = getActiveStudents();
    if (badge) badge.textContent = all.length;
    cont.innerHTML = '';

    all.filter(n => n.toLowerCase().includes(q)).forEach(sName => {
        const item = document.createElement('div');
        item.className = 'stu-drag-item';
        item.draggable = true;
        item.innerHTML = `<span>👤 ${sName}</span> <i class="fa-solid fa-grip-vertical" style="color:#94a3b8;"></i>`;
        item.addEventListener('dragstart', (e) => {
            draggedStuName = sName;
            e.dataTransfer.setData('text/plain', sName);
        });
        item.onclick = () => {
            let minG = 1;
            for (let g = 2; g <= ssGroupCount(); g++) {
                if ((appState.groups[g] || []).length < (appState.groups[minG] || []).length) minG = g;
            }
            dropStudentIntoGroup(sName, minG);
        };
        cont.appendChild(item);
    });
}

function ssGroupCount() { const n = parseInt(appState.groupCount, 10); return (n >= 2 && n <= 10) ? n : 5; }
function ssGroupColors() { return ['#2563eb', '#10b981', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#dc2626', '#65a30d', '#4f46e5', '#ea580c']; }

function setGroupCount(n) {
    n = Math.max(2, Math.min(10, parseInt(n, 10) || 5));
    if (!appState.groups) appState.groups = {};
    if (!appState.groupPts) appState.groupPts = {};
    const old = ssGroupCount();
    appState.groupCount = n;
    for (let g = 1; g <= n; g++) { if (!appState.groups[g]) appState.groups[g] = []; if (appState.groupPts[g] == null) appState.groupPts[g] = 0; }
    // members of removed groups move to the currently smallest remaining groups
    for (let g = n + 1; g <= 10; g++) {
        (appState.groups[g] || []).forEach(name => {
            let minG = 1;
            for (let k = 2; k <= n; k++) if (appState.groups[k].length < appState.groups[minG].length) minG = k;
            appState.groups[minG].push(name);
        });
        delete appState.groups[g]; delete appState.groupPts[g];
    }
    syncStudioData();
    renderExpandedGroupsGrid();
    if (old !== n) showToast('Groups: ' + n);
}

function renderExpandedGroupsGrid() {
    const grid = document.getElementById('expandedGroupsGrid');
    if (!grid) return;
    const N = ssGroupCount();
    const sel = document.getElementById('groupCountSelect');
    if (sel) {
        if (!sel.options.length) for (let i = 2; i <= 10; i++) { const o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
        sel.value = N;
    }
    const lbl = document.getElementById('groupsRangeLabel'); if (lbl) lbl.textContent = 'Groups 1 – ' + N;
    grid.innerHTML = '';
    const cols = N <= 5 ? N : Math.ceil(N / 2);
    if (window.innerWidth > 900) grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))'; else grid.style.gridTemplateColumns = '';
    const colors = ssGroupColors();

    for (let g = 1; g <= N; g++) {
        const members = (appState.groups && appState.groups[g]) || [];
        const pts = (appState.groupPts && appState.groupPts[g]) || 0;

        const col = document.createElement('div');
        col.className = 'group-column-card';
        if (N > 5) col.style.minHeight = '260px';
        col.innerHTML = `
            <div style="background:${colors[g-1]}; color:white; padding:12px 14px; font-weight:900; display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span>Group ${g} (${members.length})</span>
                <button type="button" onclick="awardGroupPts(${g})" style="background:white; color:${colors[g-1]}; border:none; border-radius:8px; padding:4px 10px; font-weight:900; cursor:pointer;">⭐ ${pts} (+1)</button>
            </div>
            <div style="padding:12px; display:flex; flex-direction:column; gap:7px; flex:1;">
                ${members.map(m => `
                    <div style="background:#f8fafc; padding:8px 10px; border-radius:10px; font-size:13px; font-weight:800; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                        <span>👤 ${m}</span>
                        <button type="button" onclick="removeStudentFromGroup('${m.replace(/'/g, "\\'")}', ${g})" style="background:none; border:none; color:#94a3b8; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('') || '<small style="color:#94a3b8; margin:auto; font-weight:700;">Drag students here</small>'}
            </div>
        `;
        col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const name = draggedStuName || e.dataTransfer.getData('text/plain');
            if (name) dropStudentIntoGroup(name, g);
        });
        grid.appendChild(col);
    }
}

function dropStudentIntoGroup(sName, gNum) {
    Object.keys(appState.groups || {}).forEach(k => { appState.groups[k] = (appState.groups[k] || []).filter(n => n !== sName); });
    if (!appState.groups[gNum]) appState.groups[gNum] = [];
    appState.groups[gNum].push(sName);
    StudioAudioManager.playSFX('pop');
    syncStudioData();
    renderExpandedGroupsGrid();
}

function removeStudentFromGroup(sName, gNum) {
    if (appState.groups[gNum]) {
        appState.groups[gNum] = appState.groups[gNum].filter(n => n !== sName);
        StudioAudioManager.playSFX('click');
        syncStudioData();
        renderExpandedGroupsGrid();
    }
}

function awardGroupPts(gNum) {
    if (!appState.groupPts) appState.groupPts = {};
    appState.groupPts[gNum] = (appState.groupPts[gNum] || 0) + 1;
    StudioAudioManager.playSFX('select');
    syncStudioData();
    renderExpandedGroupsGrid();
}

function autoDistributeAllStudents() {
    const list = [...getActiveStudents()].sort(() => Math.random() - 0.5);
    const N = ssGroupCount();
    appState.groups = {};
    for (let g = 1; g <= N; g++) appState.groups[g] = [];
    list.forEach((stu, idx) => appState.groups[(idx % N) + 1].push(stu));
    StudioAudioManager.playSFX('select');
    syncStudioData();
    renderExpandedGroupsGrid();
    showToast(`🎲 Distributed ${list.length} students across ${N} groups!`);
}

function clearStudioGroups() {
    const N = ssGroupCount();
    appState.groups = {}; appState.groupPts = {};
    for (let g = 1; g <= N; g++) { appState.groups[g] = []; appState.groupPts[g] = 0; }
    StudioAudioManager.playSFX('click');
    syncStudioData();
    renderExpandedGroupsGrid();
}

function quickAddStudent() {
    const inp = document.getElementById('quickAddStuInput');
    const name = inp.value.trim();
    if (!name) return;
    appState.classes[appState.currentClass].push(name);
    inp.value = '';
    StudioAudioManager.playSFX('pop');
    syncStudioData();
    renderAllDashboard();
}

async function handleNewClassRosterUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    let names = [];
    try {
        if (ext === 'txt' || ext === 'csv') {
            names = (await file.text()).split(/\r?\n/);
        } else if (ext === 'xlsx' || ext === 'xls') {
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            names = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).map(r => r[0]);
        } else if (ext === 'docx') {
            const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
            names = res.value.split(/\r?\n/);
        }
        names = names.map(n => n ? String(n).trim() : '').filter(n => n.length > 1);
        if (names.length > 0) {
            const cName = prompt(`Found ${names.length} students! Enter Class Name:`, file.name.replace(/\.[^/.]+$/, ""));
            if (cName && cName.trim()) {
                appState.classes[cName.trim()] = names;
                appState.currentClass = cName.trim();
                syncStudioData();
                renderAllDashboard();
                StudioAudioManager.playSFX('select');
                showToast(`✅ Created "${cName.trim()}" with ${names.length} students!`);
            }
        }
    } catch (e) { alert("Could not import roster file."); }
    event.target.value = '';
}

// ============================================================================
// 10. EXACT 16:9 COORDINATE PPTX VIEWER + NON-CLIPPING SCROLLABLE IMAGE ZOOM
// ============================================================================
let uploadedFilesLibrary = [];
let activeFileId = null;
let parsedPptxSlides = [];
let pptxSlideAspect = 16 / 9;
let currentPptxSlideIdx = 0;
let currentPresZoom = 1;
let currentMediaType = '';

function handlePresenterDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) addAndOpenPresentationFile(file);
}

function handlePresentationFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) addAndOpenPresentationFile(file);
    event.target.value = '';
}

function addAndOpenPresentationFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    uploadedFilesLibrary.unshift({ id, name: file.name, ext, fileObj: file });
    activeFileId = id;
    renderSavedFilesList();
    displayPresentationFileObject(file, ext);
}

function renderSavedFilesList() {
    const cont = document.getElementById('savedFilesListContainer');
    const countEl = document.getElementById('savedFilesCount');
    const closeDeleteBtn = document.getElementById('btnCloseDeleteCurrentFile');
    if (!cont) return;

    if (countEl) countEl.textContent = uploadedFilesLibrary.length;
    if (closeDeleteBtn) closeDeleteBtn.style.display = activeFileId ? 'inline-flex' : 'none';

    if (uploadedFilesLibrary.length === 0) {
        cont.innerHTML = `<small style="color:#94a3b8; font-weight:700;">No files opened yet.</small>`;
        return;
    }

    cont.innerHTML = '';
    uploadedFilesLibrary.forEach(item => {
        const row = document.createElement('div');
        row.className = `saved-file-row ${item.id === activeFileId ? 'active-file' : ''}`;
        row.innerHTML = `
            <span style="cursor:pointer; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="Click to view ${item.name}">
                📄 ${item.name}
            </span>
            <button type="button" class="btn-delete-file-item" title="Delete this file">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        row.querySelector('span').onclick = () => {
            activeFileId = item.id;
            renderSavedFilesList();
            displayPresentationFileObject(item.fileObj, item.ext);
        };
        row.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            deleteUploadedFileById(item.id);
        };
        cont.appendChild(row);
    });
}

function deleteCurrentActivePresentationFile() {
    if (!activeFileId) {
        resetPresenterStageToEmpty();
        return;
    }
    deleteUploadedFileById(activeFileId);
}

function deleteUploadedFileById(targetId) {
    const idx = uploadedFilesLibrary.findIndex(f => f.id === targetId);
    const removedName = idx !== -1 ? uploadedFilesLibrary[idx].name : 'File';
    uploadedFilesLibrary = uploadedFilesLibrary.filter(f => f.id !== targetId);

    StudioAudioManager.playSFX('click');
    showToast(`🗑️ Deleted "${removedName}"`);

    if (activeFileId === targetId) {
        if (uploadedFilesLibrary.length > 0) {
            activeFileId = uploadedFilesLibrary[0].id;
            displayPresentationFileObject(uploadedFilesLibrary[0].fileObj, uploadedFilesLibrary[0].ext);
        } else {
            activeFileId = null;
            resetPresenterStageToEmpty();
        }
    }
    renderSavedFilesList();
}

function clearAllUploadedFiles() {
    if (uploadedFilesLibrary.length === 0) return;
    uploadedFilesLibrary = [];
    activeFileId = null;
    resetPresenterStageToEmpty();
    renderSavedFilesList();
    StudioAudioManager.playSFX('click');
    showToast("🗑️ Cleared all uploaded presentation files");
}

function resetPresenterStageToEmpty() {
    parsedPptxSlides = [];
    currentPptxSlideIdx = 0;
    currentMediaType = '';
    document.getElementById('presFileName').textContent = "Open PowerPoint (.pptx), Image, PDF, Word, or Video";
    document.getElementById('presBadge').textContent = "READY";
    document.getElementById('presSlideNav').style.display = 'none';
    document.getElementById('btnCloseDeleteCurrentFile').style.display = 'none';
    document.getElementById('pptxThumbnailsList').innerHTML = '';
    const slot = document.getElementById('presenterContentSlot');
    slot.innerHTML = '';
    slot.style.display = 'none';
    document.getElementById('presenterEmptyState').style.display = 'block';
}

async function displayPresentationFileObject(file, ext) {
    try { if (activeFileId && ext === 'pptx') window.__ssPresStash = { id: activeFileId, name: file.name, ext: ext, fileObj: file }; } catch (e) {}
    document.getElementById('presFileName').textContent = file.name;
    document.getElementById('presBadge').textContent = ext.toUpperCase();
    document.getElementById('presenterEmptyState').style.display = 'none';
    document.getElementById('btnCloseDeleteCurrentFile').style.display = 'inline-flex';
    const slot = document.getElementById('presenterContentSlot');
    slot.style.display = 'flex';
    slot.innerHTML = `<div style="padding:40px; font-weight:800; color:#2563eb;"><i class="fa-solid fa-spinner fa-spin"></i> Rendering ${file.name}...</div>`;
    document.getElementById('presSlideNav').style.display = 'none';
    document.getElementById('pptxThumbnailsList').innerHTML = '';
    currentPresZoom = 1;

    try {
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
            currentMediaType = 'image';
            const url = URL.createObjectURL(file);
            slot.innerHTML = `<img id="presZoomTarget" src="${url}" data-base-w="920" style="width:920px; max-width:none; height:auto; border-radius:16px; box-shadow:0 16px 40px rgba(0,0,0,0.18); display:block;">`;
            StudioAudioManager.playSFX('select');
        } else if (ext === 'pdf') {
            currentMediaType = 'pdf';
            const url = URL.createObjectURL(file);
            slot.style.width = '100%';
            slot.innerHTML = `<iframe src="${url}" style="width:100%; height:75vh; border:none; border-radius:14px; background:white;"></iframe>`;
            StudioAudioManager.playSFX('select');
        } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
            currentMediaType = 'video';
            const url = URL.createObjectURL(file);
            slot.innerHTML = `<video src="${url}" controls style="max-width:100%; max-height:74vh; border-radius:16px; background:#000;"></video>`;
            StudioAudioManager.playSFX('select');
        } else if (ext === 'docx') {
            currentMediaType = 'doc';
            const res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
            slot.innerHTML = `<div id="presZoomTarget" data-base-w="920" style="background:white; width:920px; padding:38px; border-radius:18px; box-shadow:0 14px 36px rgba(0,0,0,0.1); line-height:1.75; font-size:18px;">${res.value}</div>`;
            StudioAudioManager.playSFX('select');
        } else if (['pptx', 'ppsx'].includes(ext)) {
            currentMediaType = 'pptx';
            await parseAndRenderExactPptxFile(file);
            StudioAudioManager.playSFX('select');
        } else {
            currentMediaType = 'text';
            const text = await file.text();
            slot.innerHTML = `<pre id="presZoomTarget" data-base-w="920" style="background:white; width:920px; padding:28px; border-radius:16px; white-space:pre-wrap; font-size:16px;">${text}</pre>`;
        }
    } catch (err) {
        slot.innerHTML = `<div style="background:#fee2e2; color:#991b1b; padding:24px; border-radius:16px; font-weight:800;">Could not render file: ${err.message || 'Unsupported format'}</div>`;
    }
}

// TRUE POWERPOINT (.PPTX) EXACT COORDINATE & PICTURE PARSER
async function parseAndRenderExactPptxFile(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const parser = new DOMParser();

    // 1. Read Presentation Slide Dimensions (EMU units) from ppt/presentation.xml
    let slideW = 9144000, slideH = 5143500; // Default 16:9 widescreen
    if (zip.files['ppt/presentation.xml']) {
        const presXml = await zip.files['ppt/presentation.xml'].async('string');
        const presDoc = parser.parseFromString(presXml, 'application/xml');
        const sldSz = presDoc.getElementsByTagName('p:sldSz')[0] || presDoc.getElementsByTagName('sldSz')[0];
        if (sldSz) {
            const cx = parseInt(sldSz.getAttribute('cx'), 10);
            const cy = parseInt(sldSz.getAttribute('cy'), 10);
            if (cx > 0 && cy > 0) { slideW = cx; slideH = cy; }
        }
    }
    pptxSlideAspect = slideW / slideH;

    // 2. Preload all embedded media files inside ppt/media/
    const mediaUrls = {};
    for (const path of Object.keys(zip.files)) {
        if (/^ppt\/media\/.+\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(path)) {
            const blob = await zip.files[path].async('blob');
            const fileName = path.split('/').pop();
            mediaUrls[fileName] = URL.createObjectURL(blob);
        }
    }

    const slideFiles = Object.keys(zip.files)
        .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => parseInt(a.match(/slide(\d+)\.xml/i)[1], 10) - parseInt(b.match(/slide(\d+)\.xml/i)[1], 10));

    if (slideFiles.length === 0) throw new Error("No slides found inside PowerPoint file.");

    parsedPptxSlides = [];

    for (let i = 0; i < slideFiles.length; i++) {
        const sPath = slideFiles[i];
        const sNum = sPath.match(/slide(\d+)\.xml/i)[1];
        const xmlText = await zip.files[sPath].async('string');
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // Map relationship IDs (rId -> media filename) for this slide
        const relMap = {};
        const relPath = `ppt/slides/_rels/slide${sNum}.xml.rels`;
        if (zip.files[relPath]) {
            const relXml = await zip.files[relPath].async('string');
            const relDoc = parser.parseFromString(relXml, 'application/xml');
            const relNodes = relDoc.getElementsByTagName('Relationship');
            for (let r = 0; r < relNodes.length; r++) {
                const id = relNodes[r].getAttribute('Id');
                const target = relNodes[r].getAttribute('Target') || '';
                if (id && target.includes('media/')) {
                    relMap[id] = target.split('media/').pop();
                }
            }
        }

        const elements = [];
        let firstTitle = '';

        // Parse Picture Shapes (<p:pic>) with Exact x, y, w, h Coordinates
        const picNodes = xmlDoc.getElementsByTagName('*');
        for (let n = 0; n < picNodes.length; n++) {
            const node = picNodes[n];
            if (node.localName === 'pic') {
                const blip = Array.from(node.getElementsByTagName('*')).find(el => el.localName === 'blip');
                const rId = blip ? (blip.getAttribute('r:embed') || blip.getAttribute('embed')) : null;
                const imgFile = rId ? relMap[rId] : null;
                const imgUrl = imgFile ? mediaUrls[imgFile] : null;

                if (imgUrl) {
                    const box = extractPptxTransformBox(node, slideW, slideH);
                    elements.push({
                        type: 'image',
                        url: imgUrl,
                        leftPct: box.leftPct,
                        topPct: box.topPct,
                        widthPct: box.widthPct,
                        heightPct: box.heightPct
                    });
                }
            } else if (node.localName === 'sp') {
                // Parse Text Shapes (<p:sp>) with Exact Coordinates, Colors & Font Sizes
                const paras = [];
                const pList = Array.from(node.getElementsByTagName('*')).filter(el => el.localName === 'p');
                let maxPt = 18;
                let hexColor = '#0f172a';
                let align = 'left';

                pList.forEach(pNode => {
                    const algnEl = Array.from(pNode.getElementsByTagName('*')).find(el => el.localName === 'pPr');
                    if (algnEl && algnEl.getAttribute('algn') === 'ctr') align = 'center';

                    let pText = '';
                    const children = pNode.getElementsByTagName('*');
                    for (let c = 0; c < children.length; c++) {
                        if (children[c].localName === 'rPr') {
                            const sz = parseInt(children[c].getAttribute('sz'), 10);
                            if (sz > 0) maxPt = Math.max(maxPt, Math.round(sz / 100));
                            const srgb = Array.from(children[c].getElementsByTagName('*')).find(e => e.localName === 'srgbClr');
                            if (srgb && srgb.getAttribute('val')) {
                                const v = srgb.getAttribute('val');
                                if (v.toUpperCase() !== 'FFFFFF') hexColor = '#' + v;
                            }
                        }
                        if (children[c].localName === 't') pText += children[c].textContent;
                    }
                    if (pText.trim()) {
                        paras.push(pText.trim());
                        if (!firstTitle) firstTitle = pText.trim();
                    }
                });

                if (paras.length > 0) {
                    const box = extractPptxTransformBox(node, slideW, slideH);
                    elements.push({
                        type: 'text',
                        paras,
                        fontPt: Math.min(44, Math.max(14, maxPt)),
                        color: hexColor,
                        align,
                        leftPct: box.leftPct,
                        topPct: box.topPct,
                        widthPct: Math.max(22, box.widthPct),
                        heightPct: box.heightPct
                    });
                }
            }
        }

        parsedPptxSlides.push({
            index: i + 1,
            title: firstTitle || `Slide ${i + 1}`,
            elements
        });
    }

    currentPptxSlideIdx = Math.max(0, Math.min(parsedPptxSlides.length - 1, window.__ssPresRestore | 0)); window.__ssPresRestore = 0;
    document.getElementById('presSlideNav').style.display = 'flex';
    renderCurrentPptxSlide();
    renderPptxThumbnails();
}

function extractPptxTransformBox(shapeNode, slideW, slideH) {
    let x = 0, y = 0, cx = slideW * 0.85, cy = slideH * 0.2;
    const all = shapeNode.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
        if (all[i].localName === 'off') {
            const ox = parseInt(all[i].getAttribute('x'), 10);
            const oy = parseInt(all[i].getAttribute('y'), 10);
            if (!isNaN(ox)) x = ox;
            if (!isNaN(oy)) y = oy;
        } else if (all[i].localName === 'ext') {
            const ex = parseInt(all[i].getAttribute('cx'), 10);
            const ey = parseInt(all[i].getAttribute('cy'), 10);
            if (!isNaN(ex) && ex > 0) cx = ex;
            if (!isNaN(ey) && ey > 0) cy = ey;
        }
    }
    return {
        leftPct: Math.max(0, Math.min(94, (x / slideW) * 100)),
        topPct: Math.max(0, Math.min(94, (y / slideH) * 100)),
        widthPct: Math.max(5, Math.min(100, (cx / slideW) * 100)),
        heightPct: Math.max(5, Math.min(100, (cy / slideH) * 100))
    };
}

function renderCurrentPptxSlide() {
    if (parsedPptxSlides.length === 0) return;
    const slide = parsedPptxSlides[currentPptxSlideIdx];
    { const _j = document.getElementById('presSlideJump'), _t = document.getElementById('presSlideTotal'); if (_j && document.activeElement !== _j) _j.value = currentPptxSlideIdx + 1; if (_t) _t.textContent = parsedPptxSlides.length; } try { localStorage.setItem(smk7('SGE_SM_PRES_STATE'), JSON.stringify({ id: activeFileId, name: (document.getElementById('presFileName') || {}).textContent || '', slide: currentPptxSlideIdx, ts: Date.now() })); } catch (e) {}

    const baseWidth = Math.round(960 * currentPresZoom);
    const baseHeight = Math.round(baseWidth / pptxSlideAspect);

    let innerHTML = '';
    slide.elements.forEach(el => {
        if (el.type === 'image') {
            innerHTML += `
                <div class="pptx-abs-element" style="left:${el.leftPct}%; top:${el.topPct}%; width:${el.widthPct}%; height:${el.heightPct}%; z-index:2;">
                    <img src="${el.url}" style="width:100%; height:100%; object-fit:contain; display:block;" alt="">
                </div>
            `;
        } else if (el.type === 'text') {
            const scaledFont = Math.round(el.fontPt * 0.72 * currentPresZoom);
            innerHTML += `
                <div class="pptx-abs-text" style="left:${el.leftPct}%; top:${el.topPct}%; width:${el.widthPct}%; min-height:${el.heightPct}%; text-align:${el.align}; color:${el.color}; font-size:${scaledFont}px; font-weight:800; z-index:5;">
                    ${el.paras.map(p => `<div style="margin-bottom:4px;">${p}</div>`).join('')}
                </div>
            `;
        }
    });

    const slot = document.getElementById('presenterContentSlot');
    slot.innerHTML = `
        <div class="pptx-exact-stage" id="presZoomTarget" style="width:${baseWidth}px; height:${baseHeight}px;">
            ${innerHTML}
        </div>
    `;
}

function renderPptxThumbnails() {
    const list = document.getElementById('pptxThumbnailsList');
    if (!list) return;
    list.innerHTML = '<strong style="font-size:12px; color:#475569;">Slide Navigator:</strong>';
    parsedPptxSlides.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = `padding:8px 10px; border-radius:10px; border:1.5px solid ${idx === currentPptxSlideIdx ? '#2563eb' : '#e2e8f0'}; background:${idx === currentPptxSlideIdx ? '#eff6ff' : '#ffffff'}; text-align:left; font-weight:800; font-size:12px; cursor:pointer; color:#0f172a;`;
        btn.textContent = `#${idx + 1}: ${s.title.slice(0, 28)}`;
        btn.onclick = () => {
            currentPptxSlideIdx = idx;
            renderCurrentPptxSlide();
            renderPptxThumbnails();
        };
        list.appendChild(btn);
    });
}

function changePptxSlide(delta) {
    if (parsedPptxSlides.length === 0) return;
    currentPptxSlideIdx = (currentPptxSlideIdx + delta + parsedPptxSlides.length) % parsedPptxSlides.length;
    StudioAudioManager.playSFX('click');
    renderCurrentPptxSlide();
    renderPptxThumbnails();
}

function jumpToPptxSlide(n) {
    if (parsedPptxSlides.length === 0) return;
    const j = document.getElementById('presSlideJump');
    n = parseInt(String(n).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10);
    if (isNaN(n)) { if (j) j.value = currentPptxSlideIdx + 1; return; }
    n = Math.max(1, Math.min(parsedPptxSlides.length, n));
    if (j) j.value = n;
    if (n - 1 === currentPptxSlideIdx) return;
    currentPptxSlideIdx = n - 1;
    StudioAudioManager.playSFX('click');
    renderCurrentPptxSlide();
    renderPptxThumbnails();
}

// True Scrollable Dimension Zoom (Never clips top or bottom words!)
function zoomPresentation(delta) {
    if (window.ssBdMode && ssBdMode() !== 'slides' && window.ssBdZoom) { ssBdZoom(delta); return; }
    currentPresZoom = Math.max(0.5, Math.min(3, currentPresZoom + delta));
    applyPresentationZoom();
}

function resetPresentationZoom() {
    if (window.ssBdMode && ssBdMode() !== 'slides' && window.ssBdZoomReset) { ssBdZoomReset(); return; }
    currentPresZoom = 1;
    applyPresentationZoom();
}

function applyPresentationZoom() {
    if (currentMediaType === 'pptx' && parsedPptxSlides.length > 0) {
        renderCurrentPptxSlide();
        return;
    }
    const target = document.getElementById('presZoomTarget');
    if (target) {
        const baseW = parseInt(target.getAttribute('data-base-w') || '920', 10);
        target.style.width = Math.round(baseW * currentPresZoom) + 'px';
    }
}

function togglePresenterFullscreen() {
    const card = document.getElementById('presenterStageCard');
    if (!card) return;
    if (!document.fullscreenElement && !card.classList.contains('cssFs')) {
        let p; try { p = card.requestFullscreen(); } catch (e) { p = Promise.reject(e); }
        Promise.resolve(p).catch(() => card.classList.add('cssFs'));
    } else {
        if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
        card.classList.remove('cssFs');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGameStage();
    if (document.getElementById('portal_presentation')?.classList.contains('active') && parsedPptxSlides.length > 0) {
        if (e.key === 'ArrowRight') changePptxSlide(1);
        else if (e.key === 'ArrowLeft') changePptxSlide(-1);
    }
});
