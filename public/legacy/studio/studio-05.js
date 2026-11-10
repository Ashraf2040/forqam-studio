
// ============================================================================
// SMART STUDIO v3 — REAL 3D ENGINE (Three.js) + PREMIUM CANVAS UPGRADES
// Appended override layer. PIN, rosters, Firebase config untouched.
// ============================================================================

const S3 = { active: false, mode: 0, renderer: null, scene: null, camera: null, onClick: null };
function ss3Avail() { return typeof THREE !== 'undefined'; }
function ss3IsMode(m) { return [1, 5, 6, 12].includes(m); }

function ss3Boot(mode) {
    ss3Teardown();
    const wrap = document.querySelector('.stage-viewport-wrap');
    if (!wrap) return false;
    const old = document.getElementById('stageCanvas3D');
    if (old) old.remove();
    const c = document.createElement('canvas');
    c.id = 'stageCanvas3D';
    c.width = 1280; c.height = 620;
    wrap.appendChild(c);
    document.getElementById('stageCanvas').style.display = 'none';
    document.getElementById('mysteryBoxesGrid').style.display = 'none';
    try {
        const r = new THREE.WebGLRenderer({ canvas: c, antialias: SS.quality === 'high' });
        r.setSize(1280, 620, false);
        r.setPixelRatio(SS.quality === 'high' ? Math.min(2, Math.max(1.75, window.devicePixelRatio || 1)) : 1);
        if (SS.quality === 'high') { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
        r.outputEncoding = THREE.sRGBEncoding;
        S3.renderer = r;
    } catch (e) { c.remove(); return false; }
    S3.scene = new THREE.Scene();
    S3.camera = new THREE.PerspectiveCamera(58, 1280 / 620, 0.1, 3000);
    S3.active = true; S3.mode = mode;
    c.onclick = (e) => {
        if (!S3.onClick) return;
        const rect = c.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        S3.onClick(mx, my);
    };
    return true;
}
function ss3Teardown() {
    if (S3.renderer) { try { S3.renderer.dispose(); S3.renderer.forceContextLoss(); } catch (e) {} }
    const c = document.getElementById('stageCanvas3D');
    if (c) c.remove();
    const h = document.querySelector('.ss3-hint'); if (h) h.remove();
    ss3RaceHudRemove();
    S3.active = false; S3.renderer = null; S3.scene = null; S3.camera = null; S3.onClick = null;
}
function ss3Hint(text) {
    let h = document.querySelector('.ss3-hint');
    if (!h) {
        h = document.createElement('div');
        h.className = 'ss3-hint';
        document.querySelector('.stage-viewport-wrap')?.appendChild(h);
    }
    h.textContent = text;
    clearTimeout(h._t);
    h._t = setTimeout(() => { h.style.display = 'none'; }, 5000);
    h.style.display = 'block';
}
function ss3Raycast(mx, my, meshes) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(mx, my), S3.camera);
    const hits = rc.intersectObjects(meshes, true);
    return hits.length ? hits[0] : null;
}
function ss3RoundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function ss3TextSprite(text, opts = {}) {
    const fs = opts.fontSize || 46, pad = 20;
    const cv = document.createElement('canvas');
    let c = cv.getContext('2d');
    const font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`;
    c.font = font;
    const tw = Math.ceil(c.measureText(text).width);
    cv.width = tw + pad * 2; cv.height = fs + pad * 2;
    c = cv.getContext('2d');
    if (opts.bg !== null) {
        c.fillStyle = opts.bg || 'rgba(15,23,42,0.88)';
        ss3RoundRectPath(c, 2, 2, cv.width - 4, cv.height - 4, 16); c.fill();
        if (opts.border) { c.lineWidth = 4; c.strokeStyle = opts.border; c.stroke(); }
    }
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 5; c.shadowOffsetY = 2;
    c.fillStyle = opts.fg || '#ffffff';
    c.fillText(text, cv.width / 2, cv.height / 2 + 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4; tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const h = opts.height || 1.1;
    sp.scale.set(h * (cv.width / cv.height), h, 1);
    return sp;
}
function ss3WoodTexture(base, dark) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = base || '#9a6a33'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 30; i++) {
        c.strokeStyle = `rgba(60,32,8,${0.06 + Math.random() * 0.14})`;
        c.lineWidth = 1 + Math.random() * 2.4;
        const y = Math.random() * 256;
        c.beginPath(); c.moveTo(0, y);
        c.bezierCurveTo(70, y + Math.random() * 9 - 4.5, 180, y + Math.random() * 9 - 4.5, 256, y + Math.random() * 7 - 3.5);
        c.stroke();
    }
    for (let p = 1; p < 3; p++) { c.fillStyle = dark || 'rgba(50,26,6,0.55)'; c.fillRect(0, p * 85, 256, 4); }
    // corner brackets
    c.fillStyle = 'rgba(40,40,46,0.85)';
    [[6, 6], [234, 6], [6, 234], [234, 234]].forEach(([x, y]) => { c.fillRect(x, y, 16, 16); });
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    return t;
}
function ss3NamePlateTexture(name, opts = {}) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const c = cv.getContext('2d');
    // brushed dark plate
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#3a2a14'); g.addColorStop(0.5, '#241a0c'); g.addColorStop(1, '#3a2a14');
    c.fillStyle = g; ss3RoundRectPath(c, 4, 4, 504, 120, 18); c.fill();
    c.strokeStyle = '#c9a227'; c.lineWidth = 5; c.stroke();
    let fs = opts.fontSize || 56;
    const name2 = String(name);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    do {
        c.font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`;
        if (c.measureText(name2).width <= 470 || fs <= 22) break;
        fs -= 3;
    } while (fs > 22);
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 6; c.shadowOffsetY = 3;
    c.fillStyle = opts.fg || '#ffd75e';
    c.fillText(name2, 256, 68);
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
    return t;
}
function ss3DisposeScene() {
    if (!S3.scene) return;
    S3.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
            });
        }
    });
    S3.scene = new THREE.Scene();
}

// ---------- v3 extra sounds (realistic synthesized) ----------
(function ss3AudioPatch() {
    const AM = StudioAudioManager;
    const _origStop = AM.stopAllActiveSounds.bind(AM);
    AM.stopAllActiveSounds = function () {
        _origStop();
        if (AM._engine) {
            try { AM._engine.osc.stop(); AM._engine.sub.stop(); AM._engine.noise.stop(); } catch (e) {}
            AM._engine = null;
        }
    };
    AM.startEngine = function () {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx || this._engine) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 58;
            const sub = this.ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = 29;
            const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2.5;
            const g = this.ctx.createGain(); g.gain.value = 0.0;
            osc.connect(lp); sub.connect(lp); lp.connect(g); g.connect(this.ctx.destination);
            const bufLen = this.ctx.sampleRate * 1.2;
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
            const noise = this.ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
            const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
            const ng = this.ctx.createGain(); ng.gain.value = 0.0;
            noise.connect(bp); bp.connect(ng); ng.connect(this.ctx.destination);
            osc.start(now); sub.start(now); noise.start(now);
            g.gain.linearRampToValueAtTime(0.16 * this.volume, now + 0.6);
            ng.gain.linearRampToValueAtTime(0.05 * this.volume, now + 0.8);
            this._engine = { osc, sub, noise, lp, g, ng };
        } catch (e) {}
    };
    AM.setEnginePower = function (p) { // p 0..1
        if (!this._engine || this.muted) return;
        try {
            const t = this.ctx.currentTime;
            this._engine.osc.frequency.setTargetAtTime(58 + p * 85, t, 0.15);
            this._engine.sub.frequency.setTargetAtTime(29 + p * 42, t, 0.15);
            this._engine.lp.frequency.setTargetAtTime(520 + p * 1600, t, 0.2);
            this._engine.ng.gain.setTargetAtTime((0.04 + p * 0.06) * this.volume, t, 0.3);
        } catch (e) {}
    };
    AM.stopEngine = function () {
        if (!this._engine) return;
        try {
            const t = this.ctx.currentTime, e = this._engine;
            e.g.gain.linearRampToValueAtTime(0, t + 0.5);
            e.ng.gain.linearRampToValueAtTime(0, t + 0.4);
            setTimeout(() => { try { e.osc.stop(); e.sub.stop(); e.noise.stop(); } catch (e2) {} }, 650);
        } catch (e) {}
        this._engine = null;
    };
    AM.playSplashSound = function (big) {
        if (this.muted) return;
        try {
            this.init(); const now = this.ctx.currentTime;
            const dur = big ? 0.55 : 0.3;
            const bufLen = Math.floor(this.ctx.sampleRate * dur);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * (big ? 0.12 : 0.06)));
            const n = this.ctx.createBufferSource(); n.buffer = buf;
            const f = this.ctx.createBiquadFilter(); f.type = 'bandpass';
            f.frequency.setValueAtTime(big ? 1400 : 1900, now);
            f.frequency.exponentialRampToValueAtTime(500, now + dur);
            f.Q.value = 1.1;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime((big ? 0.7 : 0.4) * this.volume, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + dur);
            n.connect(f); f.connect(g); g.connect(this.ctx.destination);
            n.start(now);
            if (big) { // low plop
                const o = this.ctx.createOscillator(), og = this.ctx.createGain();
                o.type = 'sine'; o.frequency.setValueAtTime(300, now); o.frequency.exponentialRampToValueAtTime(70, now + 0.18);
                og.gain.setValueAtTime(0.5 * this.volume, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                o.connect(og); og.connect(this.ctx.destination); o.start(now); o.stop(now + 0.22);
            }
        } catch (e) {}
    };
    AM.playServoSound = function (durMs) {
        if (this.muted) return;
        try {
            this.init(); const now = this.ctx.currentTime, dur = (durMs || 600) / 1000;
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.type = 'sawtooth'; o.frequency.value = 210;
            const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
            lfo.frequency.value = 22; lg.gain.value = 26;
            lfo.connect(lg); lg.connect(o.frequency);
            const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.06 * this.volume, now + 0.05);
            g.gain.setValueAtTime(0.06 * this.volume, now + dur - 0.06);
            g.gain.linearRampToValueAtTime(0.0001, now + dur);
            o.connect(f); f.connect(g); g.connect(this.ctx.destination);
            o.start(now); lfo.start(now); o.stop(now + dur); lfo.stop(now + dur);
        } catch (e) {}
    };
    AM.playChimeSound = function () {
        if (this.muted) return;
        try {
            this.init(); const now = this.ctx.currentTime;
            [1046.5, 1318.5, 1568, 2093].forEach((fq, i) => {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = 'sine'; o.frequency.value = fq;
                g.gain.setValueAtTime(0.0001, now + i * 0.09);
                g.gain.linearRampToValueAtTime(0.22 * this.volume, now + i * 0.09 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.8);
                o.connect(g); g.connect(this.ctx.destination);
                o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.85);
            });
        } catch (e) {}
    };
    AM.playPageFlipSound = function () {
        if (this.muted) return;
        try {
            this.init(); const now = this.ctx.currentTime;
            const bufLen = Math.floor(this.ctx.sampleRate * 0.16);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / bufLen) * Math.PI);
            const n = this.ctx.createBufferSource(); n.buffer = buf;
            const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(900, now);
            f.frequency.exponentialRampToValueAtTime(3200, now + 0.15);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.3 * this.volume, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
            n.connect(f); f.connect(g); g.connect(this.ctx.destination);
            n.start(now);
        } catch (e) {}
    };
    AM.playReelSound = function () { // fishing reel clicking
        if (this.muted) return;
        try {
            this.init(); const now = this.ctx.currentTime;
            for (let i = 0; i < 7; i++) {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain();
                o.type = 'square'; o.frequency.value = 2300 + Math.random() * 300;
                g.gain.setValueAtTime(0.07 * this.volume, now + i * 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.03);
                o.connect(g); g.connect(this.ctx.destination);
                o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.035);
            }
        } catch (e) {}
    };
})();
// ============================================================================
// MODE 1 v3: TURBO HIGHWAY RACERS — real 3D chase-cam highway racer (Three.js)
// ============================================================================
function ss3RoadTexture() {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
    const c = cv.getContext('2d');
    c.fillStyle = '#3a3f46'; c.fillRect(0, 0, 256, 512);
    // asphalt noise
    for (let i = 0; i < 900; i++) {
        c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.02 + Math.random() * 0.05})`;
        c.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    }
    // edge lines
    c.fillStyle = '#f8fafc'; c.fillRect(8, 0, 7, 512); c.fillRect(241, 0, 7, 512);
    // center double yellow
    c.fillStyle = '#fbbf24'; c.fillRect(122, 0, 5, 512); c.fillRect(132, 0, 5, 512);
    // lane dashes (2 lanes each way → dashes at 1/4 and 3/4)
    c.fillStyle = '#e2e8f0';
    [64, 192].forEach(x => { c.fillRect(x - 3, 20, 6, 90); c.fillRect(x - 3, 276, 6, 90); });
    const t = new THREE.CanvasTexture(cv);
    t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
    return t;
}
function ss3CheckerTexture() {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
    const c = cv.getContext('2d');
    for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) {
        c.fillStyle = (x + y) % 2 ? '#0f172a' : '#f8fafc';
        c.fillRect(x * 8, y * 8, 8, 8);
    }
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    return t;
}
function ss3BuildCar(color) {
    const g = new THREE.Group();
    const paint = new THREE.MeshPhongMaterial({ color, shininess: 110, specular: 0x777777 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x14181d, shininess: 40 });
    const glass = new THREE.MeshPhongMaterial({ color: 0x10202f, shininess: 190, specular: 0xbbddff });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.44, 4.4), paint); hull.position.y = 0.56; g.add(hull);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.3, 1.2), paint); nose.position.set(0, 0.48, 2.45); g.add(nose);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.3, 1.25), paint); deck.position.set(0, 0.88, -1.5); g.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 1.9), glass); cab.position.set(0, 0.98, 0.1); g.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 1.55), paint); roof.position.set(0, 1.24, 0.05); g.add(roof);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.42), dark); wing.position.set(0, 1.22, -2.1); g.add(wing);
    [-0.72, 0.72].forEach(x => { const st = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.14), dark); st.position.set(x, 1.04, -2.1); g.add(st); });
    [-0.68, 0.68].forEach(x => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.07), new THREE.MeshPhongMaterial({ color: 0x550000, emissive: 0xff2417, emissiveIntensity: 1.0 }));
        tl.position.set(x, 0.74, -2.22); g.add(tl);
    });
    const dif = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 0.1), dark); dif.position.set(0, 0.35, -2.22); g.add(dif);
    g.userData.flames = [];
    [-0.34, 0.34].forEach(x => {
        const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.2, 12), new THREE.MeshPhongMaterial({ color: 0x999999, shininess: 150 }));
        ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.35, -2.26); g.add(ex);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.0, 10), new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.9 }));
        fl.rotation.x = Math.PI / 2 + Math.PI; fl.position.set(x, 0.35, -2.75); fl.visible = false; g.add(fl);
        g.userData.flames.push(fl);
    });
    g.userData.wheels = [];
    const wg = new THREE.CylinderGeometry(0.37, 0.37, 0.3, 18);
    const rg = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 10);
    [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]].forEach(([x, z]) => {
        const w = new THREE.Mesh(wg, dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.37, z); w.castShadow = true; g.add(w);
        const r = new THREE.Mesh(rg, new THREE.MeshPhongMaterial({ color: 0xd4d4d4, shininess: 140 })); r.rotation.z = Math.PI / 2; r.position.set(x, 0.37, z); g.add(r);
        g.userData.wheels.push(w, r);
    });
    hull.castShadow = true; cab.castShadow = true; deck.castShadow = true;
    return g;
}
function ss3BuildRaceScene() {
    ss3DisposeScene();
    const scene = S3.scene;
    scene.background = new THREE.Color(0x8ecfee);
    scene.fog = new THREE.Fog(0xaad8ef, 70, 340);
    scene.add(new THREE.HemisphereLight(0xd8ecff, 0x3d5a2e, 0.95));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.25);
    sun.position.set(-40, 70, -30);
    if (SS.quality === 'high') {
        sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
        sun.shadow.camera.far = 400;
    }
    scene.add(sun);
    const sunSprite = ss3TextSprite('☀️', { bg: null, fontSize: 90, height: 26 });
    sunSprite.position.set(-70, 62, 240); scene.add(sunSprite);
    // sea left + beach
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 1600), new THREE.MeshPhongMaterial({ color: 0x1d86c9, shininess: 160, specular: 0xaaeeff }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(-215, -0.05, 700); scene.add(sea);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(47, 1600), new THREE.MeshLambertMaterial({ color: 0xe6d3a3 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(-31.5, -0.02, 700); scene.add(sand);
    // grass right
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(346, 1600), new THREE.MeshLambertMaterial({ color: 0x4f9e45 }));
    grass.rotation.x = -Math.PI / 2; grass.position.set(182, -0.04, 700); grass.receiveShadow = true; scene.add(grass);
    // road
    const roadTex = ss3RoadTexture(); roadTex.repeat.set(1, 130);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(17, 1600), new THREE.MeshLambertMaterial({ map: roadTex }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 700); road.receiveShadow = true;
    scene.add(road);
    S3.roadTex = roadTex;
    // guard rails right + lamp posts + billboards
    const railMat = new THREE.MeshPhongMaterial({ color: 0xb8bec6, shininess: 90 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1600), railMat);
    rail.position.set(9.6, 0.85, 700); scene.add(rail);
    const rail2 = rail.clone(); rail2.position.x = -9.6; scene.add(rail2);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x6b7280 });
    for (let z = 0; z < 1500; z += 90) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), postMat);
        p.position.set(9.6, 0.4, z); scene.add(p);
        const p2 = p.clone(); p2.position.x = -9.6; scene.add(p2);
    }
    // container yard + cranes on the right (like the reference)
    const contCols = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6];
    for (let z = 60; z < 1400; z += 120) {
        const stack = 1 + Math.floor(Math.random() * 3);
        for (let s = 0; s < stack; s++) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 12), new THREE.MeshLambertMaterial({ color: contCols[Math.floor(Math.random() * contCols.length)] }));
            box.position.set(34 + Math.random() * 30, 1.5 + s * 3.05, z + Math.random() * 40);
            scene.add(box);
        }
    }
    for (let z = 150; z < 1400; z += 320) { // cranes
        const cm = new THREE.MeshLambertMaterial({ color: 0xf5c542 });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 30, 2.4), cm); tower.position.set(80, 15, z); scene.add(tower);
        const jib = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 34), cm); jib.position.set(68, 29, z); scene.add(jib);
    }
    // overhead gantry signs
    for (let z = 130; z < 1400; z += 260) {
        const gm = new THREE.MeshLambertMaterial({ color: 0x9aa2ab });
        const pa = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), gm); pa.position.set(-8.6, 4.5, z); scene.add(pa);
        const pb = pa.clone(); pb.position.x = 8.6; scene.add(pb);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.6, 0.6), gm); bar.position.set(0, 8.8, z); scene.add(bar);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 0.25), new THREE.MeshLambertMaterial({ color: 0x0b6e4f }));
        sign.position.set(0, 7.2, z); scene.add(sign);
    }
    // finish gantry
    const TRACK = 900;
    const ck = ss3CheckerTexture();
    const fin = new THREE.Mesh(new THREE.BoxGeometry(18.4, 1.9, 0.3), new THREE.MeshBasicMaterial({ map: ck }));
    fin.position.set(0, 8.2, TRACK); scene.add(fin);
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 9.5, 0.7), new THREE.MeshLambertMaterial({ color: 0xd1d5db }));
    fp.position.set(-8.8, 4.7, TRACK); scene.add(fp);
    const fp2 = fp.clone(); fp2.position.x = 8.8; scene.add(fp2);
    const finLabel = ss3TextSprite('🏁 FINISH', { bg: 'rgba(15,23,42,0.9)', fg: '#fde047', height: 2.4, fontSize: 54 });
    finLabel.position.set(0, 10.6, TRACK); scene.add(finLabel);

    // cars
    const pool = ssShuffleArr(getUnpickedPool(2));
    const lanes = [-6.3, -3.8, -1.3, 1.3, 3.8, 6.3];
    const cars = [];
    const n = Math.min(6, pool.length);
    for (let i = 0; i < n; i++) {
        const mesh = ss3BuildCar(pool[i] ? 0 : 0);
        scene.add(mesh);
        const label = ss3TextSprite(pool[i], { bg: 'rgba(15,23,42,0.88)', height: 2.1, fontSize: 48 });
        scene.add(label);
        cars.push({ name: pool[i], colorIdx: i, lane: lanes[i], prog: 0, mesh, label, wob: Math.random() * 6.28 });
    }
    S3.raceCars = cars; S3.trackLen = TRACK;
    S3.camera.position.set(0, 3.6, -14);
    S3.camera.lookAt(0, 1.1, 30);
}
function ss3RacePrepare(modeId) {
    const cols = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const pool = ssShuffleArr(getUnpickedPool(2));
    const names = pool.slice(0, Math.min(6, pool.length));
    ssG = { mode: 1, names, winnerIdx: Math.floor(Math.random() * names.length), phase: 'idle', parts: [] };
    ss3BuildRaceScene();
    // paint cars + speeds after build
    S3.raceCars.forEach((car, i) => {
        const colHex = parseInt(cols[i % cols.length].slice(1), 16);
        car.mesh.traverse(o => { if (o.material && o.material.shininess === 110) o.material.color.setHex(colHex); });
        car.baseSpeed = (i === ssG.winnerIdx) ? 3.35 : 2.55 + Math.random() * 0.55;
    });
    ssG.items = S3.raceCars;
    ss3RaceHudBuild();
}
function ss3RaceStep() {
    const g = ssG, t = stageTick;
    const cars = S3.raceCars;
    if (!cars) return;
    if (t === 2) StudioAudioManager.startEngine();
    let leader = 0, minProg = Infinity;
    cars.forEach((car, i) => {
        const burst = 1 + 0.16 * Math.sin(t * 0.06 + car.wob) + (Math.random() * 0.06);
        car.prog += car.baseSpeed * burst;
        // rubber-band: keep the race tight, winner edges ahead at the end
        leader = Math.max(leader, car.prog);
    });
    const winC = cars[g.winnerIdx];
    if (winC.prog < leader && leader >= S3.trackLen - 90) winC.prog = leader + 0.6;
    leader = Math.max(leader, winC.prog);
    cars.forEach(car => { if (car.prog < minProg) minProg = car.prog; });
    ss3RaceCamera(false);
    StudioAudioManager.setEnginePower(Math.min(1, leader / 260));
    cars.forEach((car, i) => {
        const weave = Math.sin(t * 0.02 + car.wob * 2) * 0.45;
        car.mesh.position.set(car.lane + weave, 0, car.prog);
        car.mesh.rotation.z = Math.sin(t * 0.05 + car.wob) * 0.02;
        car.mesh.userData.wheels.forEach(w => { w.rotation.x += 0.32; });
        car.mesh.userData.flames.forEach(f => {
            f.visible = true;
            f.scale.set(1, 0.7 + Math.random() * 0.7, 1);
            f.material.color.setHex(Math.random() < 0.5 ? 0x66d9ff : 0x3b82f6);
        });
        car.label.position.set(car.mesh.position.x, 3.5, car.prog);
    });
    if (S3.roadTex) S3.roadTex.offset.y = -(S3.camera.position.z * 0.08 % 1);
    ss3RaceHudUpdate(leader >= S3.trackLen ? g.names[g.winnerIdx] : null);
    if (leader >= S3.trackLen) {
        StudioAudioManager.stopEngine();
        ssCrownWinner(g.names[g.winnerIdx], '🏎️', 'HIGHWAY RACE CHAMPION', `🏁 Winner: ${g.names[g.winnerIdx]}!`);
    }
}
// ---- v4: elevated wide broadcast camera that always frames the whole pack + progress HUD ----
function ss3RaceCamera(snap) {
    const cars = S3.raceCars; if (!cars || !cars.length) return;
    let mn = Infinity, mx = -Infinity;
    cars.forEach(c => { const z = c.mesh.position.z; if (z < mn) mn = z; if (z > mx) mx = z; });
    const span = Math.max(0, mx - mn);
    const T = S3.trackLen;
    // look a bit ahead of the leader; in the last stretch include the finish gantry
    let aheadZ = mx + 12;
    if (mx > T - 150) aheadZ = Math.max(aheadZ, Math.min(T + 6, mx + 70));
    const camZ = mn - 11 - span * 0.25 - (mx > T - 150 ? 5 : 0);
    const camY = 7 + span * 0.1;
    const k = snap ? 1 : 0.22;
    const cam = S3.camera;
    cam.position.x += (0 - cam.position.x) * k;
    cam.position.y += (camY - cam.position.y) * k;
    cam.position.z += (camZ - cam.position.z) * k;
    S3._lookZ = (S3._lookZ === undefined || snap) ? aheadZ : S3._lookZ + (aheadZ - S3._lookZ) * 0.14;
    cam.fov = 62; cam.updateProjectionMatrix();
    cam.lookAt(0, 0.5, S3._lookZ);
}
function ss3RaceHudBuild() {
    ss3RaceHudRemove();
    const wrap = document.querySelector('.stage-viewport-wrap'); if (!wrap || !S3.raceCars) return;
    const cols = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const h = document.createElement('div'); h.id = 'raceHud';
    h.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:6;font-family:inherit;';
    const esc = x => String(x).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    h.innerHTML = `
      <div id="raceStand" style="position:absolute;left:12px;top:12px;background:rgba(15,23,42,.82);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:8px 12px;min-width:190px;color:#fff;font-weight:800;font-size:14px;line-height:1.55"></div>
      <div id="raceWinBanner" style="display:none;position:absolute;left:50%;top:14px;transform:translateX(-50%);background:linear-gradient(90deg,#f59e0b,#fde047);color:#1e293b;padding:10px 28px;border-radius:14px;font-weight:900;font-size:26px;box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:nowrap"></div>
      <div style="position:absolute;left:3%;right:3%;bottom:12px;height:132px;background:rgba(15,23,42,.8);border:1px solid rgba(255,255,255,.18);border-radius:14px;">
        <div style="position:absolute;left:14px;right:66px;top:0;bottom:0">
          <div style="position:absolute;left:0;top:3px;font-size:11px;color:#cbd5e1;font-weight:800">START</div>
          <div id="raceMiniDots" style="position:absolute;left:0;right:0;top:18px;bottom:6px"></div>
        </div>
        <div style="position:absolute;right:14px;top:4px;bottom:4px;width:44px;border-left:4px dashed #fde047;text-align:center;color:#fde047;font-weight:900;font-size:11px;padding-left:2px"><div style="font-size:26px;line-height:1.1;margin-top:34px">🏁</div>FINISH</div>
      </div></div>`;
    wrap.appendChild(h);
    const dots = h.querySelector('#raceMiniDots');
    S3.raceCars.forEach((c, i) => {
        const d = document.createElement('div'); d.className = 'raceDot'; d.dataset.i = i;
        d.style.cssText = `position:absolute;left:0;top:${i * 18}px;width:0;height:0;`;
        d.innerHTML = `<div style="position:absolute;left:-8px;top:0;width:16px;height:16px;border-radius:50%;background:${cols[i % 6]};border:2px solid #fff"></div>
        <div style="position:absolute;left:12px;top:0;line-height:16px;font-size:12px;font-weight:800;color:#fff;white-space:nowrap;text-shadow:0 1px 3px #000">${esc(c.name)}</div>`;
        dots.appendChild(d);
    });
    ss3RaceHudUpdate(null);
}
function ss3RaceHudRemove() { const o = document.getElementById('raceHud'); if (o) o.remove(); }
function ss3RaceHudUpdate(winner) {
    const h = document.getElementById('raceHud'); if (!h || !S3.raceCars) return;
    const cols = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const T = S3.trackLen;
    const esc = x => String(x).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const order = S3.raceCars.map((c, i) => ({ c, i })).sort((a, b) => b.c.prog - a.c.prog);
    h.querySelector('#raceStand').innerHTML = '<div style="font-size:11px;color:#94a3b8;letter-spacing:1px">LIVE STANDINGS</div>' +
        order.map((o, r) => `<div><span style="color:#fde047">${r + 1}.</span> <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cols[o.i % 6]};margin:0 5px"></span>${esc(o.c.name)}</div>`).join('');
    const lead = Math.min(1, Math.max(...S3.raceCars.map(c => c.prog)) / T);
    const wDots = h.querySelector('#raceMiniDots'); const W = Math.max(200, (wDots.clientWidth || 700) - 150);
    h.querySelectorAll('.raceDot').forEach(d => { const c = S3.raceCars[+d.dataset.i]; d.style.left = (Math.min(1, c.prog / T) * W) + 'px'; });
    const wb = h.querySelector('#raceWinBanner');
    if (winner) { wb.style.display = 'block'; wb.textContent = '🏆 WINNER: ' + winner; }
    else wb.style.display = 'none';
}
function ss3RaceIdle() {
    const t = ssTm();
    if (!S3.raceCars) return;
    S3.raceCars.forEach((car, i) => {
        car.mesh.position.set(car.lane, 0, 12 + i * 9);
        car.label.position.set(car.lane, 3.5, 12 + i * 9);
    });
    ss3RaceCamera(true);
    ss3RaceHudUpdate(null);
    S3.renderer.render(S3.scene, S3.camera);
}
function ss3RaceRender() {
    if (isStageRunning) ss3RaceStep();
    S3.renderer.render(S3.scene, S3.camera);
}
// ============================================================================
// MODE 5 v3: CANNON BOMB STRIKE — real 3D cannon & crates (Three.js)
// ============================================================================
const csV3 = { crates: [], barrel: null, muzzle: null, shell: null, debris: [], smoke: [], ring: null, flash: null, phase: 'idle', aimIdx: -1, selectedIdx: -1, t: 0, shellP: 0, shellFrom: null, shellTo: null, shake: 0 };

function ss3CratePositions(n) {
    // adaptive grid: cols x rows covering x -15..15, z -34..-10
    const cols = Math.min(n, Math.max(3, Math.ceil(Math.sqrt(n * 2.6))));
    const rows = Math.ceil(n / cols);
    const pos = [];
    const w = 30, d = 24;
    for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const rowCount = Math.min(cols, n - r * cols);
        const offX = (cols - rowCount) * (w / cols) / 2;
        pos.push({
            x: -w / 2 + offX + (c + 0.5) * (w / cols),
            z: -11 - (r + 0.5) * (d / rows)
        });
    }
    return pos;
}
function ss3BuildCannonScene() {
    ss3DisposeScene();
    const scene = S3.scene;
    scene.background = new THREE.Color(0xf7b26a);
    scene.fog = new THREE.Fog(0xf7c489, 55, 220);
    scene.add(new THREE.HemisphereLight(0xffe0b3, 0x5a3a1a, 0.85));
    const sun = new THREE.DirectionalLight(0xffe9c4, 1.3);
    sun.position.set(25, 40, 30);
    if (SS.quality === 'high') {
        sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
        sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.far = 200;
    }
    scene.add(sun);
    // sun disc + warm sky glow
    const sunSp = ss3TextSprite('🌇', { bg: null, fontSize: 90, height: 24 });
    sunSp.position.set(38, 26, -120); scene.add(sunSp);
    // distant dunes
    const duneMat = new THREE.MeshLambertMaterial({ color: 0xcf9250 });
    for (let i = 0; i < 5; i++) {
        const dune = new THREE.Mesh(new THREE.SphereGeometry(26 + i * 8, 16, 10), duneMat);
        dune.scale.y = 0.22;
        dune.position.set(-70 + i * 38, -1, -95 - (i % 2) * 25);
        scene.add(dune);
    }
    // sandy ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshLambertMaterial({ color: 0xd9a860 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true;
    scene.add(ground);
    // wooden platform under cannon
    const woodTex = ss3WoodTexture();
    const plat = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.5, 5.4), new THREE.MeshLambertMaterial({ map: woodTex }));
    plat.position.set(0, 0.25, 8); plat.receiveShadow = true; plat.castShadow = true;
    scene.add(plat);

    // ---- modern field cannon ----
    const cannon = new THREE.Group();
    const metal = new THREE.MeshPhongMaterial({ color: 0x3d4756, shininess: 130, specular: 0x9aa7bb });
    const metalDark = new THREE.MeshPhongMaterial({ color: 0x232a34, shininess: 90, specular: 0x556070 });
    const brass = new THREE.MeshPhongMaterial({ color: 0xc9a227, shininess: 160, specular: 0xffe9a0 });
    // axle + modern wheels (rubber tire + alloy rim)
    [-2.1, 2.1].forEach(x => {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.42, 14, 26), new THREE.MeshPhongMaterial({ color: 0x17191d, shininess: 25 }));
        tire.position.set(x, 1.35, 8); tire.castShadow = true; cannon.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 20), new THREE.MeshPhongMaterial({ color: 0xc7ced8, shininess: 170, specular: 0xffffff }));
        rim.rotation.z = Math.PI / 2; rim.position.set(x, 1.35, 8); cannon.add(rim);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 12), metalDark);
        hub.rotation.z = Math.PI / 2; hub.position.set(x, 1.35, 8); cannon.add(hub);
    });
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.4, 10), metalDark);
    axle.rotation.z = Math.PI / 2; axle.position.set(0, 1.35, 8); cannon.add(axle);
    // trail legs (modern split trail)
    [-0.8, 0.8].forEach(x => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 4.6), metal);
        leg.position.set(x, 0.65, 10.6); leg.rotation.x = 0.12; leg.castShadow = true; cannon.add(leg);
        const spade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), metalDark);
        spade.position.set(x, 0.28, 12.7); cannon.add(spade);
    });
    // barrel assembly (pivot)
    const pivot = new THREE.Group(); pivot.position.set(0, 1.7, 8); pivot.rotation.order = 'YXZ';
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 6.4, 22), metal);
    barrel.rotation.x = Math.PI / 2; barrel.position.z = -2.6; barrel.castShadow = true;
    pivot.add(barrel);
    // barrel highlight sleeve + thermal jacket rings
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 22), metalDark);
        ring.rotation.x = Math.PI / 2; ring.position.z = -1.6 - i * 1.5; pivot.add(ring);
    }
    // muzzle brake
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 22), metalDark);
    muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -5.9; pivot.add(muzzle);
    const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.3, 18), new THREE.MeshPhongMaterial({ color: 0x0c0f14, shininess: 60 }));
    muzzleTip.rotation.x = Math.PI / 2; muzzleTip.position.z = -6.4; pivot.add(muzzleTip);
    // breech + brass details
    const breech = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.5), metalDark);
    breech.position.z = 0.6; breech.castShadow = true; pivot.add(breech);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 10, 22), brass);
    trim.position.z = -0.6; pivot.add(trim);
    // gun shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.7, 0.14), new THREE.MeshPhongMaterial({ color: 0x46536a, shininess: 100, specular: 0x8899aa, side: THREE.DoubleSide }));
    shield.position.set(0, 0.5, 0.9); pivot.add(shield);
    cannon.add(pivot);
    scene.add(cannon);
    csV3.pivot = pivot;
    // muzzle world-position helper
    csV3.muzzleTipLocal = new THREE.Vector3(0, 0, -6.4);

    // shell
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshPhongMaterial({ color: 0x1b222c, shininess: 190, specular: 0xcccccc }));
    shell.visible = false; scene.add(shell);
    csV3.shell = shell;
    // muzzle flash light + sprite
    const flash = new THREE.PointLight(0xffaa33, 0, 40); scene.add(flash);
    csV3.flash = flash;
    // shockwave ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0 }));
    ring.rotation.x = -Math.PI / 2; scene.add(ring);
    csV3.ring = ring;

    // camera
    S3.camera.position.set(0, 6.2, 21);
    S3.camera.lookAt(0, 2.2, -14);
    csV3.debris = []; csV3.smoke = [];
}
function ss3CannonBuildCrates() {
    // clear old
    csV3.crates.forEach(c => { S3.scene.remove(c.group); });
    csV3.crates = [];
    const woodTex = ss3WoodTexture('#a9763b');
    const students = cannonStrikeState.crates; // state array from prepareStageEntities(5)
    const pos = ss3CratePositions(students.length);
    students.forEach((st, i) => {
        const grp = new THREE.Group();
        const boxMat = new THREE.MeshLambertMaterial({ map: woodTex });
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.0, 2.0), boxMat);
        box.position.y = 1.0; box.castShadow = true; box.receiveShadow = true;
        grp.add(box);
        // gold name plate facing the camera (+z)
        const plate = new THREE.Mesh(
            new THREE.PlaneGeometry(2.8, 0.72),
            new THREE.MeshBasicMaterial({ map: ss3NamePlateTexture(st.name), transparent: true })
        );
        plate.position.set(0, 1.15, 1.02); grp.add(plate);
        grp.position.set(pos[i].x, 0, pos[i].z);
        grp.userData = { idx: i, name: st.name, box };
        S3.scene.add(grp);
        csV3.crates.push({ group: grp, name: st.name, idx: i, shattered: false, baseY: 0 });
    });
    // click raycast
    S3.onClick = (mx, my) => {
        if (isStageRunning || csV3.phase === 'done') return;
        const hit = ss3Raycast(mx, my, csV3.crates.filter(c => !c.shattered).map(c => c.group));
        if (hit) {
            let g = hit.object;
            while (g && g.userData.idx === undefined) g = g.parent;
            if (g) startCannonStrikeAnimation(g.userData.idx);
        }
    };
}
function ss3CannonAimAt(idx, lerp) {
    const target = csV3.crates[idx];
    if (!target) return;
    const tp = target.group.position;
    const pv = csV3.pivot.position;
    const dx = tp.x - pv.x, dz = tp.z - pv.z;
    const yaw = Math.atan2(-dx, -dz);
    const dist = Math.hypot(dx, dz);
    const pitch = Math.atan2((target.baseY + 1.15) - pv.y, dist); // exact: barrel line passes through the crate
    csV3.pivot.rotation.y += (yaw - csV3.pivot.rotation.y) * lerp;
    csV3.pivot.rotation.x += (pitch - csV3.pivot.rotation.x) * lerp;
    csV3.pivot.updateMatrixWorld(true);
}
function ss3CannonMuzzleWorld() {
    return csV3.pivot.localToWorld(csV3.muzzleTipLocal.clone());
}
function ss3SpawnSmoke(x, y, z, big) {
    const s = ss3TextSprite('💨', { bg: null, fontSize: 40, height: big ? 2.2 : 1.3 });
    s.material.opacity = 0.75;
    s.position.set(x, y, z);
    S3.scene.add(s);
    csV3.smoke.push({ sp: s, life: 1 });
}
function ss3CannonExplode(target) {
    target.shattered = true;
    const p = target.group.position;
    // debris: flying wooden planks
    for (let i = 0; i < 26; i++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.5 + Math.random() * 0.5, 0.14, 0.3),
            new THREE.MeshLambertMaterial({ color: [0x9a6a33, 0x7c5222, 0xb9834a][i % 3] }));
        d.position.set(p.x, 1.2, p.z);
        const a = Math.random() * Math.PI * 2;
        d.userData = {
            vx: Math.cos(a) * (2 + Math.random() * 5), vy: 4 + Math.random() * 6, vz: Math.sin(a) * (2 + Math.random() * 5),
            rx: Math.random() * 0.4, ry: Math.random() * 0.4, life: 1
        };
        d.castShadow = true;
        S3.scene.add(d);
        csV3.debris.push(d);
    }
    // remove crate with flash
    S3.scene.remove(target.group);
    csV3.flash.position.set(p.x, 2.2, p.z);
    csV3.flash.intensity = 60;
    csV3.ring.position.set(p.x, 0.25, p.z);
    csV3.ring.scale.set(1, 1, 1);
    csV3.ring.material.opacity = 0.95;
    csV3.shake = 0.8;
    for (let i = 0; i < 8; i++) ss3SpawnSmoke(p.x + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, p.z + (Math.random() - 0.5) * 3, true);
    StudioAudioManager.playBombExplosionSound();
}
function ss3CannonRender() {
    const st = cannonStrikeState, tm = ssTm();
    if (!csV3.pivot) return;
    // idle: crates gentle glow pulse on scan target
    csV3.crates.forEach((c, i) => {
        if (c.shattered) return;
        if (csV3.phase === 'scanning' && i === csV3.aimIdx) {
            const k = 1 + Math.sin(tm * 0.4) * 0.05;
            c.group.scale.set(k, k, k);
            c.group.position.y = c.baseY + 0.15 + Math.abs(Math.sin(tm * 0.4)) * 0.3;
        } else {
            c.group.scale.set(1, 1, 1);
            c.group.position.y = c.baseY;
        }
    });
    // recoil recovery
    if (csV3.recoil > 0) { csV3.recoil *= 0.85; csV3.pivot.position.z = 8 + csV3.recoil; }
    // flash decay
    if (csV3.flash.intensity > 0) csV3.flash.intensity *= 0.82;
    // ring expand
    if (csV3.ring.material.opacity > 0.01) {
        csV3.ring.scale.multiplyScalar(1.16);
        csV3.ring.material.opacity *= 0.9;
    } else csV3.ring.material.opacity = 0;
    // smoke drift
    csV3.smoke.forEach(s => { s.life -= 0.012; s.sp.position.y += 0.05; s.sp.material.opacity = Math.max(0, s.life) * 0.7; const k = 1 + (1 - s.life) * 0.05; s.sp.scale.multiplyScalar(1.012); });
    csV3.smoke = csV3.smoke.filter(s => { if (s.life <= 0) { S3.scene.remove(s.sp); return false; } return true; });
    // debris physics
    csV3.debris.forEach(d => {
        d.position.x += d.userData.vx * 0.16; d.position.y += d.userData.vy * 0.16; d.position.z += d.userData.vz * 0.16;
        d.userData.vy -= 0.35;
        if (d.position.y < 0.1) { d.position.y = 0.1; d.userData.vy *= -0.35; d.userData.vx *= 0.7; d.userData.vz *= 0.7; }
        d.rotation.x += d.userData.rx; d.rotation.y += d.userData.ry;
        d.userData.life -= 0.012;
    });
    csV3.debris = csV3.debris.filter(d => { if (d.userData.life <= 0) { S3.scene.remove(d); return false; } return true; });
    // camera shake + subtle sway
    const shx = csV3.shake > 0.02 ? (Math.random() - 0.5) * csV3.shake : 0;
    const shy = csV3.shake > 0.02 ? (Math.random() - 0.5) * csV3.shake : 0;
    csV3.shake *= 0.9;
    S3.camera.position.set(shx + Math.sin(tm * 0.008) * 0.3, 6.2 + shy, 21);
    S3.camera.lookAt(0, 2.2, -14);
    S3.renderer.render(S3.scene, S3.camera);
}
// Mode 5 v3 animation engine (replaces startCannonStrikeAnimation)
function startCannonStrikeAnimation(forcedIdx = -1) {
    if (!ss3Avail() || !S3.active || S3.mode !== 5) { window._ssV2.cannon(forcedIdx); return; }
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    if (cannonStrikeState.crates.length === 0 || csV3.phase === 'done') {
        prepareStageEntities(5);
    }
    isStageRunning = true;
    csV3.selectedIdx = forcedIdx >= 0 ? forcedIdx : Math.floor(Math.random() * csV3.crates.length);
    cannonStrikeState.selectedIdx = csV3.selectedIdx;
    csV3.phase = forcedIdx >= 0 ? 'aiming' : 'scanning';
    csV3.t = 0; csV3.scanTicks = 0;
    stageTick = 0;
    document.getElementById('stageWinnerBanner').textContent = "🔥 Cannon simulation active...";
    StudioAudioManager.playSFX('select');

    function step() {
        if (!isStageRunning || S3.mode !== 5) return;
        stageTick++; csV3.t++;
        if (csV3.phase === 'scanning') {
            if (csV3.t % 5 === 0) {
                csV3.aimIdx = Math.floor(Math.random() * csV3.crates.length);
                ss3CannonAimAt(csV3.aimIdx, 1);
                StudioAudioManager.playSFX('click');
            }
            if (csV3.t >= 46) { csV3.phase = 'aiming'; csV3.t = 0; }
        } else if (csV3.phase === 'aiming') {
            ss3CannonAimAt(csV3.selectedIdx, 0.16);
            if (csV3.t >= 26) {
                csV3.phase = 'firing'; csV3.t = 0; csV3.shellP = 0;
                csV3.pivot.position.z = 8; ss3CannonAimAt(csV3.selectedIdx, 1); // lock aim exactly on target
                csV3.recoil = 1.1;
                csV3.shellFrom = ss3CannonMuzzleWorld();
                const tp = csV3.crates[csV3.selectedIdx].group.position;
                csV3.shellTo = new THREE.Vector3(tp.x, 1.15, tp.z + 1.0); // front face of the crate, on the barrel line
                csV3.shell.position.copy(csV3.shellFrom);
                csV3.shell.visible = true;
                const mp = ss3CannonMuzzleWorld();
                csV3.flash.position.copy(mp); csV3.flash.intensity = 50;
                for (let i = 0; i < 4; i++) ss3SpawnSmoke(mp.x + (Math.random() - 0.5), mp.y + (Math.random() - 0.5), mp.z + (Math.random() - 0.5), false);
                StudioAudioManager.playCannonFireSound();
            }
        } else if (csV3.phase === 'firing') {
            csV3.shellP += 0.05;
            const p = Math.min(1, csV3.shellP);
            const a = csV3.shellFrom, b = csV3.shellTo;
            csV3.shell.position.set(
                a.x + (b.x - a.x) * p,
                a.y + (b.y - a.y) * p, // straight along the barrel line
                a.z + (b.z - a.z) * p
            );
            if (Math.random() < 0.7) ss3SpawnSmoke(csV3.shell.position.x, csV3.shell.position.y, csV3.shell.position.z, false);
            if (p >= 1) {
                csV3.shell.visible = false;
                csV3.phase = 'exploding'; csV3.t = 0;
                ss3CannonExplode(csV3.crates[csV3.selectedIdx]);
            }
        } else if (csV3.phase === 'exploding') {
            if (csV3.t >= 78) {
                csV3.phase = 'done';
                isStageRunning = false;
                const winner = csV3.crates[csV3.selectedIdx].name;
                stagePickedWinner = winner;
                appState.challenger = winner;
                markStudentPicked(winner);
                syncStudioData();
                renderAllDashboard();
                StudioAudioManager.playSFX('cheer');
                document.getElementById('stageWinnerBanner').textContent = `💥 Direct Hit! Winner: ${winner}!`;
                showWinnerPopup("💥", "CANNON STRIKE WINNER", winner);
                return;
            }
        }
        ss3CannonRender();
        stageAnimFrame = requestAnimationFrame(step);
    }
    stageAnimFrame = requestAnimationFrame(step);
}
// ============================================================================
// MODE 6 v3: TURBO MYSTERY CHESTS — real 3D treasure chests scene (Three.js)
// ============================================================================
const mbV3 = { chests: [], scanT: 0, scanning: false, hopIdx: -1, opened: false, openAnim: null, dust: null, spot: null };

function ss3BuildChest(color) {
    const g = new THREE.Group();
    const wood = new THREE.MeshPhongMaterial({ map: ss3WoodTexture('#8a5a28'), shininess: 24 });
    const gold = new THREE.MeshPhongMaterial({ color: 0xd4af37, shininess: 190, specular: 0xfff2b0, emissive: 0x332200, emissiveIntensity: 0.4 });
    // base
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 1.55), wood);
    base.position.y = 0.575; base.castShadow = true; base.receiveShadow = true;
    g.add(base);
    // gold bands on base
    [-0.75, 0.75].forEach(x => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.18, 1.6), gold);
        band.position.set(x, 0.575, 0); g.add(band);
    });
    // lid pivot at back-top edge
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.15, -0.775);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 1.55), wood);
    lid.position.set(0, 0.21, 0.775); lid.castShadow = true;
    lidPivot.add(lid);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.775, 0.775, 2.3, 20, 1, false, Math.PI / 2, Math.PI), wood);
    dome.rotation.z = Math.PI / 2; dome.rotation.y = Math.PI / 2;
    dome.position.set(0, 0.42, 0.775); dome.scale.set(1, 1, 0.55);
    lidPivot.add(dome);
    [-0.75, 0.75].forEach(x => {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 1.58), gold);
        band.position.set(x, 0.21, 0.775); lidPivot.add(band);
    });
    g.add(lidPivot);
    // lock plate
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.12), gold);
    lock.position.set(0, 1.0, 0.82); g.add(lock);
    const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10), new THREE.MeshPhongMaterial({ color: 0x1a1208 }));
    keyhole.rotation.x = Math.PI / 2; keyhole.position.set(0, 1.02, 0.85); g.add(keyhole);
    g.userData.lidPivot = lidPivot;
    // inner glow light (off)
    const glow = new THREE.PointLight(0xffd75e, 0, 8);
    glow.position.set(0, 1.4, 0); g.add(glow);
    g.userData.glow = glow;
    // light beam cone (hidden)
    const beam = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 4.6, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.set(0, 3.2, 0);
    g.add(beam);
    g.userData.beam = beam;
    return g;
}
function ss3BuildChestScene() {
    ss3DisposeScene();
    const scene = S3.scene;
    scene.background = new THREE.Color(0x241608);
    scene.fog = new THREE.Fog(0x241608, 40, 130);
    // warm ambient + spot from above
    scene.add(new THREE.HemisphereLight(0xffe6b8, 0x2a1808, 0.5));
    const spot = new THREE.SpotLight(0xffe2a0, 1.6, 120, Math.PI / 3.4, 0.45, 1.2);
    spot.position.set(0, 34, 6);
    if (SS.quality === 'high') { spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); }
    spot.target.position.set(0, 0, -4);
    scene.add(spot); scene.add(spot.target);
    mbV3.spot = spot;
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35); rim.position.set(-20, 14, -30); scene.add(rim);
    // wooden stage floor
    const floorTex = ss3WoodTexture('#6b4423', 'rgba(30,16,4,0.6)');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 200), new THREE.MeshPhongMaterial({ map: floorTex, shininess: 18 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);
    // gold coins scattered
    const coinMat = new THREE.MeshPhongMaterial({ color: 0xffd75e, shininess: 200, specular: 0xfff7cc });
    for (let i = 0; i < 40; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14), coinMat);
        coin.position.set((Math.random() - 0.5) * 44, 0.03, 4 + Math.random() * 10 - 22);
        coin.rotation.y = Math.random() * 3;
        scene.add(coin);
    }
    // floating dust particles
    if (SS.quality === 'high') {
        const dc = document.createElement('canvas'); dc.width = dc.height = 32;
        const dc2 = dc.getContext('2d');
        const grad = dc2.createRadialGradient(16, 16, 1, 16, 16, 15);
        grad.addColorStop(0, 'rgba(255,230,150,0.9)'); grad.addColorStop(1, 'rgba(255,230,150,0)');
        dc2.fillStyle = grad; dc2.fillRect(0, 0, 32, 32);
        const dt = new THREE.CanvasTexture(dc);
        const N = 120, pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 40; }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dt, size: 0.35, transparent: true, opacity: 0.7, depthWrite: false }));
        scene.add(pts);
        mbV3.dust = pts;
    }
    // chests grid: one per student
    const students = ssShuffleArr(getActiveStudents());
    mysteryBoxStudents = students;
    const n = students.length;
    const cols = Math.min(n, Math.max(3, Math.ceil(Math.sqrt(n * 2.1))));
    const rows = Math.ceil(n / cols);
    const W = Math.min(46, cols * 7.4), D = Math.min(30, rows * 7.6);
    mbV3.chests = [];
    for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const rowCount = Math.min(cols, n - r * cols);
        const offX = (cols - rowCount) * (W / cols) / 2;
        const chest = ss3BuildChest();
        chest.position.set(-W / 2 + offX + (c + 0.5) * (W / cols), 0, -6 - (r + 0.5) * (D / rows) + 4);
        chest.rotation.y = (Math.random() - 0.5) * 0.14;
        const sc = Math.min(1.15, 7.0 / (W / cols));
        chest.scale.set(sc, sc, sc);
        chest.userData.idx = i;
        scene.add(chest);
        mbV3.chests.push(chest);
    }
    S3.camera.position.set(0, 15.5, 17);
    S3.camera.lookAt(0, 0, -3);
    mbV3.opened = false; mbV3.scanning = false; mbV3.openAnim = null; mbV3.hopIdx = -1;
    S3.onClick = (mx, my) => {
        if (isStageRunning || mbV3.opened) return;
        const hit = ss3Raycast(mx, my, mbV3.chests);
        if (hit) {
            let g = hit.object;
            while (g && g.userData.idx === undefined) g = g.parent;
            if (g) openSpecificMysteryBox(g.userData.idx);
        }
    };
}
function ss3ChestRender() {
    const tm = ssTm();
    // dust drift
    if (mbV3.dust) {
        const arr = mbV3.dust.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
            arr[i + 1] += 0.008;
            arr[i] += Math.sin(tm * 0.01 + i) * 0.002;
            if (arr[i + 1] > 14) arr[i + 1] = 0;
        }
        mbV3.dust.geometry.attributes.position.needsUpdate = true;
    }
    if (mbV3.spot) spotSway(mbV3.spot, tm);
    function spotSway(s, t2) { s.position.x = Math.sin(t2 * 0.006) * 5; }
    mbV3.chests.forEach((ch, i) => {
        if (mbV3.openAnim && mbV3.openAnim.idx === i) return;
        // breathing idle
        const k = 1 + Math.sin(tm * 0.03 + i * 1.3) * 0.012;
        const baseSc = ch.userData.baseSc || (ch.userData.baseSc = ch.scale.x);
        if (mbV3.hopIdx === i) {
            ch.position.y = Math.abs(Math.sin(tm * 0.35)) * 0.55;
            ch.userData.glow.intensity = 2.2;
            ch.rotation.y += 0.02;
        } else {
            ch.position.y = 0;
            ch.userData.glow.intensity = 0;
            ch.scale.set(baseSc * k, baseSc * k, baseSc * k);
        }
    });
    // open animation
    const oa = mbV3.openAnim;
    if (oa) {
        oa.t++;
        const ch = mbV3.chests[oa.idx];
        const p = Math.min(1, oa.t / 42);
        const ease = 1 - Math.pow(1 - p, 3);
        ch.userData.lidPivot.rotation.x = -ease * 1.92;
        ch.userData.glow.intensity = ease * 3.4;
        ch.userData.beam.material.opacity = ease * 0.5;
        ch.userData.beam.rotation.y += 0.03;
        if (oa.t > 26 && oa.nameSprite) {
            const np = Math.min(1, (oa.t - 26) / 40);
            const ne = 1 - Math.pow(1 - np, 3);
            oa.nameSprite.position.y = 1.2 + ne * 3.6;
            const s0 = oa.baseNameScale;
            oa.nameSprite.scale.set(s0.x * (0.3 + ne * 0.7), s0.y * (0.3 + ne * 0.7), 1);
            oa.nameSprite.material.opacity = ne;
        }
        // sparkles
        if (oa.t > 20 && Math.random() < 0.5 && SS.quality === 'high') {
            const sp = ss3TextSprite('✨', { bg: null, fontSize: 34, height: 0.8 });
            sp.position.set(ch.position.x + (Math.random() - 0.5) * 2.4, 1 + Math.random() * 2.4, ch.position.z + (Math.random() - 0.5) * 2);
            S3.scene.add(sp);
            (oa.sparks = oa.sparks || []).push({ sp, life: 1 });
        }
        if (oa.sparks) oa.sparks.forEach(s => { s.life -= 0.02; s.sp.position.y += 0.05; s.sp.material.opacity = Math.max(0, s.life); });
        if (oa.t >= 96) {
            mbV3.openAnim = null;
            isStageRunning = false;
            StudioAudioManager.playSFX('cheer');
            document.getElementById('stageWinnerBanner').textContent = `🎁 Chest opened: ${oa.name}!`;
            showWinnerPopup("🎁", "MYSTERY CHEST WINNER", oa.name);
        }
    }
    S3.camera.position.x = Math.sin(tm * 0.005) * 1.4;
    S3.camera.lookAt(0, 0.6, -3);
    S3.renderer.render(S3.scene, S3.camera);
}
// v3 mystery flow (replaces emoji-card version)
function renderInteractiveMysteryBoxes() {
    if (S3.active && S3.mode === 6) return; // 3D scene already built
    window._ssV2.renderMystery();
}
function runTurboMysteryBoxScan() {
    if (!(S3.active && S3.mode === 6)) return window._ssV2.runMystery();
    if (mbV3.opened) { prepareStageEntities(6); }
    isStageRunning = true;
    mbV3.scanning = true;
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    document.getElementById('stageWinnerBanner').textContent = "⚡ Turbo scan running...";
    let step = 0;
    const totalSteps = 22;
    const winnerIdx = Math.floor(Math.random() * mbV3.chests.length);
    function hop() {
        if (!isStageRunning) return;
        mbV3.hopIdx = step < totalSteps - 1 ? Math.floor(Math.random() * mbV3.chests.length) : winnerIdx;
        StudioAudioManager.playSFX('click');
        step++;
        if (step < totalSteps) setTimeout(hop, 60 + step * 9);
        else {
            mbV3.hopIdx = -1; mbV3.scanning = false;
            openSpecificMysteryBox(winnerIdx);
        }
    }
    hop();
}
function openSpecificMysteryBox(idx) {
    if (!(S3.active && S3.mode === 6)) return window._ssV2.openBox(idx);
    if (mbV3.opened) return;
    mbV3.opened = true;
    const ch = mbV3.chests[idx];
    const name = mysteryBoxStudents[idx] || getActiveStudents()[0];
    const nameSprite = ss3TextSprite(name, { bg: 'rgba(120,53,15,0.92)', fg: '#ffe27a', border: '#ffd75e', height: 1.5, fontSize: 52 });
    nameSprite.position.set(ch.position.x, 1.2, ch.position.z + 0.4);
    nameSprite.material.opacity = 0;
    S3.scene.add(nameSprite);
    mbV3.openAnim = { idx, t: 0, name, nameSprite, baseNameScale: nameSprite.scale.clone() };
    StudioAudioManager.playChimeSound();
    stagePickedWinner = name;
    appState.challenger = name;
    markStudentPicked(name);
    syncStudioData();
    renderAllDashboard();
}
// ============================================================================
// MODE 12 v3: PRIZE CLAW MACHINE — real 3D arcade cabinet (Three.js)
// ============================================================================
const clV3 = { caps: [], claw: null, cable: null, carriage: null, bulbs: [], chuteGlow: null, namePop: null };

function ss3BuildClawScene() {
    ss3DisposeScene();
    const scene = S3.scene;
    scene.background = new THREE.Color(0x0b1c2c);
    scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x0a1a26, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(8, 14, 12);
    if (SS.quality === 'high') { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); }
    scene.add(key);
    const inner = new THREE.PointLight(0x66d9ff, 1.1, 26); inner.position.set(0, 6.6, 0); scene.add(inner);

    const frameMat = new THREE.MeshPhongMaterial({ color: 0x0e7490, shininess: 120, specular: 0x99e6ff });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x123, shininess: 40 });
    // floor of pit
    const pit = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 7.6), new THREE.MeshPhongMaterial({ color: 0x155e75, shininess: 60 }));
    pit.position.y = -0.2; pit.receiveShadow = true; scene.add(pit);
    // back wall
    const back = new THREE.Mesh(new THREE.BoxGeometry(11, 9, 0.3), new THREE.MeshPhongMaterial({ color: 0x0c4a6e, shininess: 40 }));
    back.position.set(0, 4.3, -3.65); scene.add(back);
    // glass front + sides
    const glassMat = new THREE.MeshPhongMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.13, shininess: 200, specular: 0xffffff, side: THREE.DoubleSide });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(11, 8.4), glassMat); front.position.set(0, 4.2, 3.8); scene.add(front);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 8.4), glassMat); left.rotation.y = Math.PI / 2; left.position.set(-5.5, 4.2, 0); scene.add(left);
    const right = left.clone(); right.position.x = 5.5; scene.add(right);
    // corner posts + top marquee
    [[-5.5, -3.65], [5.5, -3.65], [-5.5, 3.8], [5.5, 3.8]].forEach(([x, z]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 9.2, 0.42), frameMat);
        post.position.set(x, 4.3, z); post.castShadow = true; scene.add(post);
    });
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(11.8, 1.35, 8.3), frameMat);
    marquee.position.y = 9.15; marquee.castShadow = true; scene.add(marquee);
    const mLabel = ss3TextSprite('🕹️ PRIZE CLAW', { bg: 'rgba(8,47,73,0.95)', fg: '#7dd3fc', border: '#38bdf8', height: 1.15, fontSize: 52 });
    mLabel.position.set(0, 9.2, 4.2); scene.add(mLabel);
    // marquee bulbs
    clV3.bulbs = [];
    for (let i = 0; i < 9; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
        b.position.set(-4.4 + i * 1.1, 8.42, 3.95);
        scene.add(b); clV3.bulbs.push(b);
    }
    // prize chute (front-left)
    const chute = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.9, 1.6), darkMat);
    chute.position.set(-4.1, 0.95, 2.9); scene.add(chute);
    const chuteGlow = new THREE.PointLight(0xffd75e, 0, 7); chuteGlow.position.set(-4.1, 1.4, 3.2); scene.add(chuteGlow);
    clV3.chuteGlow = chuteGlow;
    const chuteLabel = ss3TextSprite('PRIZE', { bg: null, fg: '#7dd3fc', height: 0.55, fontSize: 40 });
    chuteLabel.position.set(-4.1, 1.15, 3.75); scene.add(chuteLabel);
    // rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(10, 0.28, 0.5), new THREE.MeshPhongMaterial({ color: 0x64748b, shininess: 110 }));
    rail.position.set(0, 7.6, 0); scene.add(rail);
    // carriage + cable + claw
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.6, 0.95), new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 130 }));
    carriage.position.set(0, 7.25, 0); carriage.castShadow = true; scene.add(carriage);
    clV3.carriage = carriage;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), new THREE.MeshPhongMaterial({ color: 0xdbe4ec }));
    scene.add(cable); clV3.cable = cable;
    const claw = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshPhongMaterial({ color: 0xe2e8f0, shininess: 170, specular: 0xffffff }));
    claw.add(hub);
    claw.userData.prongs = [];
    for (let p = 0; p < 3; p++) {
        const pivot = new THREE.Group();
        const ang = p * Math.PI * 2 / 3;
        pivot.rotation.y = ang;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.15, 8), new THREE.MeshPhongMaterial({ color: 0xf1f5f9, shininess: 180, specular: 0xffffff }));
        arm.position.set(0.42, -0.5, 0); arm.rotation.z = 0.5;
        pivot.add(arm);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.85, 8), new THREE.MeshPhongMaterial({ color: 0xf8fafc, shininess: 180 }));
        tip.position.set(0.83, -1.18, 0); tip.rotation.z = -0.55;
        pivot.add(tip);
        claw.add(pivot);
        claw.userData.prongs.push(pivot);
    }
    scene.add(claw); clV3.claw = claw;
    // capsules: 12 two-tone gashapon balls
    clV3.caps = [];
    const names = ssG.names || [];
    for (let i = 0; i < names.length; i++) {
        const grp = new THREE.Group();
        const col = new THREE.Color(['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#f472b6', '#4ade80', '#fb923c', '#38bdf8'][i % 12]);
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: col.clone().multiplyScalar(1.15), shininess: 160, specular: 0xdddddd, transparent: true, opacity: 0.92 }));
        const bot = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhongMaterial({ color: col.clone().multiplyScalar(0.7), shininess: 90 }));
        grp.add(top); grp.add(bot);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.615, 0.045, 8, 24), new THREE.MeshPhongMaterial({ color: 0xf8fafc, shininess: 120 }));
        band.rotation.x = Math.PI / 2; grp.add(band);
        grp.castShadow = true;
        const r = Math.floor(i / 6), c = i % 6;
        // v4: big readable name tags, staggered in 3 height tiers per row so they never overlap
        const tier = [0, 2, 1, 3, 0, 2][c] || 0;
        const label = ss3TextSprite(names[i], { bg: 'rgba(8,47,73,0.96)', fg: '#ffffff', border: '#' + col.getHexString(), height: 0.62, fontSize: 52 });
        const ly = (r ? 1.4 : 3.3) + tier * 0.68;
        label.position.y = ly;
        label.material.depthTest = false; label.renderOrder = 20;
        grp.add(label);
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, ly - 0.32, 0)]);
        const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: col.clone(), depthTest: false })); ln.renderOrder = 19;
        grp.add(ln);
        grp.position.set(-4.1 + c * 1.65 + (r ? 0.8 : 0), 0.62, -1.9 + r * 2.2);
        grp.userData = { idx: i, baseY: 0.62, baseX: grp.position.x, baseZ: grp.position.z };
        scene.add(grp);
        clV3.caps.push(grp);
    }
    S3.camera.position.set(0, 5.4, 15.4);
    S3.camera.lookAt(0, 3.9, 0);
    clV3.namePop = null;
}
function ss3ClawPose(x, y, grab) {
    clV3.carriage.position.x = x;
    clV3.claw.position.set(x, y, clV3.claw.position.z);
    // cable between carriage bottom (7.0) and claw hub
    const topY = 6.95, len = Math.max(0.2, topY - y);
    clV3.cable.position.set(x, y + len / 2, clV3.claw.position.z);
    clV3.cable.scale.y = len;
    const openA = 0.62 - grab * 0.5;
    clV3.claw.userData.prongs.forEach(p => { p.rotation.z = 0; p.rotation.x = 0; p.children[0].rotation.z = 0.5 + openA * 0.7; p.children[1].rotation.z = -0.55 - openA * 0.5; });
}
function ss3ClawStep() {
    const g = ssG, t = stageTick;
    const cap = clV3.caps[g.winnerIdx];
    if (!cap) return;
    const tx = cap.userData.baseX, tz = cap.userData.baseZ;
    clV3.claw.position.z += (tz - clV3.claw.position.z) * 0.2;
    if (t === 2) StudioAudioManager.playServoSound(700);
    if (t < 50) { // move over target
        const cx = clV3.carriage.position.x;
        ss3ClawPose(cx + (tx - cx) * 0.09, 6.3, 0);
    } else if (t < 92) { // descend
        if (t === 50) StudioAudioManager.playServoSound(800);
        const p = (t - 50) / 42;
        const e = p * p * (3 - 2 * p);
        ss3ClawPose(tx, 6.3 - e * (6.3 - (cap.userData.baseY + 0.9)), 0);
    } else if (t < 112) { // close + grab
        const gr = Math.min(1, (t - 92) / 18);
        ss3ClawPose(tx, cap.userData.baseY + 0.9, gr);
        if (gr >= 1 && !g.grabbed) { g.grabbed = true; StudioAudioManager.playSFX('pop'); }
    } else if (t < 155) { // lift with sway
        if (t === 112) StudioAudioManager.playServoSound(900);
        const p = (t - 112) / 43;
        const e = p * p * (3 - 2 * p);
        ss3ClawPose(tx, cap.userData.baseY + 0.9 + e * 4.6, 1);
        if (g.grabbed) {
            cap.position.set(clV3.claw.position.x, clV3.claw.position.y - 1.55, clV3.claw.position.z);
            cap.rotation.z = Math.sin(t * 0.16) * 0.16 * (1 - p * 0.5);
        }
    } else if (t < 198) { // carry to chute
        if (t === 155) StudioAudioManager.playServoSound(900);
        const cx = clV3.carriage.position.x;
        ss3ClawPose(cx + (-4.1 - cx) * 0.07, clV3.claw.position.y, 1);
        clV3.claw.position.z += (2.6 - clV3.claw.position.z) * 0.08;
        if (g.grabbed) {
            cap.position.set(clV3.claw.position.x, clV3.claw.position.y - 1.55, clV3.claw.position.z);
            cap.rotation.z = Math.sin(t * 0.14) * 0.1;
        }
    } else if (t === 198) { // release into chute
        g.grabbed = false; g.dropped = true; g.dropV = 0;
        StudioAudioManager.playSFX('pop');
        clV3.chuteGlow.intensity = 3;
    }
    if (g.dropped) {
        g.dropV += 0.05;
        cap.position.y -= g.dropV;
        cap.rotation.z *= 0.9;
        if (cap.position.y < 0.7) { cap.position.y = 0.7; g.dropV = 0; g.dropped = false; }
    }
    if (t === 210) {
        const name = g.names[g.winnerIdx];
        clV3.namePop = ss3TextSprite('🏆 ' + name, { bg: 'rgba(120,53,15,0.94)', fg: '#ffe27a', border: '#ffd75e', height: 1.6, fontSize: 54 });
        clV3.namePop.position.set(-4.1, 2.6, 3.4);
        S3.scene.add(clV3.namePop);
        StudioAudioManager.playChimeSound();
    }
    if (t >= 235) {
        ssCrownWinner(g.names[g.winnerIdx], '🕹️', 'CLAW MACHINE WINNER', `🕹️ Claw grabbed: ${g.names[g.winnerIdx]}!`);
    }
}
function ss3ClawRender() {
    const tm = ssTm();
    clV3.bulbs.forEach((b, i) => {
        const on = (Math.floor(tm * 0.12) + i) % 2 === 0;
        b.material.color.setHex(on ? 0xffe27a : 0x8a6d1f);
    });
    clV3.caps.forEach((cp, i) => {
        if (cp === clV3.caps[ssG.winnerIdx] && (ssG.grabbed || ssG.dropped)) return;
        if (!isStageRunning) cp.position.y = cp.userData.baseY + Math.sin(tm * 0.05 + i * 1.4) * 0.05;
    });
    if (clV3.namePop) {
        clV3.namePop.position.y = 2.6 + Math.sin(tm * 0.06) * 0.18;
        const s = 1 + Math.sin(tm * 0.08) * 0.05;
        clV3.namePop.scale.set(clV3.namePop.scale.x, clV3.namePop.scale.y, 1);
    }
    if (clV3.chuteGlow.intensity > 0) clV3.chuteGlow.intensity *= 0.985;
    if (!isStageRunning) { // gentle idle sway of claw
        const y = 6.3 + Math.sin(tm * 0.02) * 0.1;
        ss3ClawPose(Math.sin(tm * 0.015) * 2.4, y, 0);
    }
    S3.camera.position.x = Math.sin(tm * 0.006) * 0.9;
    S3.camera.lookAt(0, 3.6, 0);
    S3.renderer.render(S3.scene, S3.camera);
}
// ============================================================================
// MODE 13 v3: FISHING FRENZY — film-like canvas: cast, nibble, strike, reel
// ============================================================================
function ssFishPrepare(modeId) {
    const W = 1280, H = 620;
    const pool = ssShuffleArr(getUnpickedPool(2));
    const cols = ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6', '#ef4444', '#eab308', '#06b6d4'];
    const names = pool.slice(0, Math.min(8, pool.length));
    ssG = {
        mode: 13, names, winnerIdx: Math.floor(Math.random() * names.length),
        phase: 'idle', parts: [], ripples: [],
        hook: { x: W * 0.5, y: 100 }, bobber: { x: 0, y: 0, vx: 0, vy: 0, state: 'held' },
        rodBend: 0, fishOn: false
    };
    ssG.items = names.map((nm, i) => ({
        name: nm, color: cols[i % cols.length],
        x: 140 + Math.random() * (W - 280), y: H * 0.55 + Math.random() * H * 0.3,
        dir: Math.random() < 0.5 ? -1 : 1, speed: 0.5 + Math.random() * 0.6,
        ph: Math.random() * 6.28, wiggle: 0
    }));
}
function ssFishStep() {
    const g = ssG, t = stageTick, W = 1280, H = 620;
    const waterY = H * 0.42;
    const fish = g.items[g.winnerIdx];
    const rodTip = { x: 268, y: waterY - 96 };
    const b = g.bobber;
    if (t === 1) { // cast!
        b.state = 'flying';
        b.x = rodTip.x; b.y = rodTip.y;
        const tx = Math.min(Math.max(fish.x, W * 0.3), W * 0.86);
        b.vx = (tx - rodTip.x) / 36; b.vy = -7.5;
        g.castTx = tx;
        StudioAudioManager.playSFX('whoosh');
    }
    if (b.state === 'flying') {
        b.x += b.vx; b.y += b.vy; b.vy += 0.45;
        if (b.y >= waterY + 4) {
            b.y = waterY + 4; b.state = 'floating';
            StudioAudioManager.playSplashSound(false);
            g.ripples.push({ x: b.x, y: waterY, r: 4, a: 0.8 });
            for (let i = 0; i < 12; i++) g.parts.push({ x: b.x, y: waterY, vx: (Math.random() - 0.5) * 5, vy: -1 - Math.random() * 3.4, life: 1, color: '#e0f2fe' });
        }
    } else if (b.state === 'floating') {
        b.y = waterY + 4 + Math.sin(t * 0.12) * 2.4;
        // winner fish swims toward bobber
        if (t > 40 && t < 88) {
            const dx = b.x - fish.x;
            fish.dir = dx > 0 ? 1 : -1;
            fish.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.9);
            fish.speed = 0;
            fish.wiggle = 1;
        }
        // nibbles
        if ((t >= 62 && t < 68) || (t >= 76 && t < 82)) {
            b.y = waterY + 8; g.ripples.push({ x: b.x, y: waterY, r: 3, a: 0.7 });
        }
        if (t === 88) { // STRIKE
            b.state = 'hooked'; g.fishOn = true; g.rodBend = 1;
            fish.y = waterY + 30;
            StudioAudioManager.playSplashSound(true);
            StudioAudioManager.playReelSound();
            g.ripples.push({ x: b.x, y: waterY, r: 8, a: 1 });
            for (let i = 0; i < 22; i++) g.parts.push({ x: b.x, y: waterY, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5, life: 1, color: '#bae6fd' });
        }
    } else if (b.state === 'hooked') {
        // fight: fish resists, pulled toward boat
        const targetX = 300;
        const pull = 0.021 + Math.max(0, 0.02 * Math.sin(t * 0.3));
        b.x += (targetX - b.x) * pull;
        fish.x = b.x + Math.sin(t * 0.35) * 26 * Math.max(0.15, (b.x - targetX) / 500);
        fish.y = waterY + 26 + Math.abs(Math.sin(t * 0.3)) * 14;
        fish.wiggle = 2;
        b.y = waterY + 2;
        g.rodBend = 0.7 + Math.sin(t * 0.3) * 0.3;
        if (t % 9 === 0) { StudioAudioManager.playReelSound(); g.ripples.push({ x: fish.x, y: waterY, r: 5, a: 0.6 }); }
        if (t % 14 === 0) StudioAudioManager.playSplashSound(false);
        if (Math.abs(b.x - targetX) < 26) { b.state = 'lifting'; g.liftT = 0; }
    } else if (b.state === 'lifting') {
        g.liftT++;
        const p = Math.min(1, g.liftT / 34);
        const e = p * p * (3 - 2 * p);
        b.x = 300 - e * 26;
        b.y = (waterY + 2) - e * (waterY - 40);
        fish.x = b.x; fish.y = b.y + 16; fish.wiggle = 3;
        g.rodBend = 1 - e * 0.4;
        if (p >= 1 && !g.crowned) {
            g.crowned = true;
            StudioAudioManager.playChimeSound();
            ssCrownWinner(g.names[g.winnerIdx], '🎣', 'FISHING WINNER', `🎣 Caught! Winner: ${g.names[g.winnerIdx]}!`);
        }
    }
    // ambient fish
    g.items.forEach((f, i) => {
        if (i === g.winnerIdx && t > 40) return;
        if (f.dir !== 0) {
            f.x += f.dir * f.speed;
            if (f.x < 100) { f.x = 100; f.dir = 1; }
            if (f.x > W - 100) { f.x = W - 100; f.dir = -1; }
        }
    });
    g.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.035; });
    g.parts = g.parts.filter(p => p.life > 0);
    g.ripples.forEach(r => { r.r += 1.6; r.a -= 0.02; });
    g.ripples = g.ripples.filter(r => r.a > 0);
}
function ssDrawFish(ctx, f, tm, outOfWater) {
    const wig = Math.sin(tm * (0.3 + f.wiggle * 0.14) + f.ph) * (4 + f.wiggle * 2.5);
    const fy = f.y + (outOfWater ? 0 : Math.sin(tm * 0.06 + f.ph) * 5);
    const dir = f.dir >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(f.x, fy);
    if (outOfWater) ctx.rotate(Math.sin(tm * 0.5) * 0.5 - 0.4);
    else ctx.scale(dir, 1);
    // tail
    ctx.fillStyle = ssHexCol(f.color, 0.85);
    ctx.beginPath(); ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(-44, -14 + wig, -50, -16 + wig);
    ctx.quadraticCurveTo(-44, 0, -50, 16 + wig);
    ctx.quadraticCurveTo(-40, 10 + wig * 0.5, -30, 0); ctx.fill();
    // body
    const bg = ctx.createRadialGradient(-6, -9, 3, 0, 0, 38);
    bg.addColorStop(0, ssHexCol(f.color, 1.5)); bg.addColorStop(0.55, f.color); bg.addColorStop(1, ssHexCol(f.color, 0.62));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 18, 0, 0, Math.PI * 2); ctx.fill();
    // belly shine
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 8, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    // dorsal + pectoral fins
    ctx.fillStyle = ssHexCol(f.color, 0.9);
    ctx.beginPath(); ctx.moveTo(-8, -15); ctx.quadraticCurveTo(4, -30, 16, -14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, 6); ctx.quadraticCurveTo(8, 20 + wig * 0.4, 16, 8); ctx.closePath(); ctx.fill();
    // gill line
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(12, 0, 11, -1.1, 1.1); ctx.stroke();
    // scales shimmer
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(-12 + s * 10, -2, 3.4, 0, Math.PI * 2); ctx.fill(); }
    // eye
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(20, -4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(21.5, -4, 3.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(22.6, -5.2, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return fy;
}
function ssDrawFishingV3(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    const waterY = H * 0.42;
    // sky: golden-blue gradient
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, waterY, [[0, '#7dd3fc'], [0.6, '#bae6fd'], [1, '#fef3c7']]);
    ctx.fillRect(0, 0, W, waterY);
    // sun + glow
    ctx.fillStyle = ssRg(ctx, W - 150, 56, 8, 90, [[0, 'rgba(254,249,195,1)'], [0.4, 'rgba(253,224,71,0.6)'], [1, 'rgba(253,224,71,0)']]);
    ctx.beginPath(); ctx.arc(W - 150, 56, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(W - 150, 56, 30, 0, Math.PI * 2); ctx.fill();
    ssCloud(ctx, ((tm * 0.3 + 300) % (W + 260)) - 130, 52, 0.85, 0.95);
    ssCloud(ctx, ((tm * 0.18 + 900) % (W + 260)) - 130, 108, 0.6, 0.85);
    // distant hills
    ctx.fillStyle = 'rgba(125,211,252,0.6)';
    for (let i = -1; i < 6; i++) {
        const mx = i * 300 - (tm * 0.06 % 300);
        ctx.beginPath(); ctx.moveTo(mx, waterY); ctx.lineTo(mx + 150, waterY - 70); ctx.lineTo(mx + 300, waterY); ctx.closePath(); ctx.fill();
    }
    // underwater
    ctx.fillStyle = ssLg(ctx, 0, waterY, 0, H, [[0, '#56c8f5'], [0.35, '#0e9bd8'], [0.75, '#0369a1'], [1, '#082f49']]);
    ctx.fillRect(0, waterY, W, H - waterY);
    // light rays
    if (SS.quality === 'high') {
        ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = '#e0f7ff';
        for (let i = 0; i < 6; i++) {
            const rx = 140 + i * 200 + Math.sin(tm * 0.013 + i) * 34;
            ctx.beginPath(); ctx.moveTo(rx, waterY); ctx.lineTo(rx + 110, H); ctx.lineTo(rx - 30, H); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    // seabed
    ctx.fillStyle = ssLg(ctx, 0, H - 52, 0, H, [[0, '#ecd096'], [1, '#c2a05e']]);
    ctx.beginPath(); ctx.moveTo(0, H - 34);
    for (let x = 0; x <= W; x += 80) ctx.quadraticCurveTo(x + 40, H - 52 - Math.sin(x * 0.02) * 10, x + 80, H - 34);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // seaweed + rocks
    for (let i = 0; i < 7; i++) {
        const sx = 110 + i * 180;
        const sway = Math.sin(tm * 0.04 + i) * 9;
        ctx.strokeStyle = i % 2 ? '#15803d' : '#22c55e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, H - 36);
        ctx.quadraticCurveTo(sx + sway, H - 92, sx + sway * 1.7, H - 138); ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    [[300, 8], [760, 12], [1080, 7]].forEach(([rx, rr]) => {
        ctx.beginPath(); ctx.ellipse(rx, H - 34, rr * 2.2, rr, 0, Math.PI, 0); ctx.fill();
    });
    // fish
    g.items.forEach((f, i) => {
        const hooked = g.fishOn && i === g.winnerIdx;
        const fy = ssDrawFish(ctx, f, tm, hooked && g.bobber.state === 'lifting');
        f.cy = fy;
        if (!hooked) ssNameTag(ctx, f.name, f.x, fy + 30, 'rgba(8,47,73,0.85)');
    });
    // bubbles
    if (SS.quality === 'high' && Math.random() < 0.12) g.parts.push({ x: Math.random() * W, y: H - 60, vx: 0, vy: -0.8 - Math.random(), life: 0.6, color: 'rgba(224,242,254,0.5)', bubble: true });
    // particles / bubbles
    g.parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.bubble ? 3.2 : 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    });
    // ripples on surface
    g.ripples.forEach(r => {
        ctx.strokeStyle = `rgba(224,242,254,${Math.max(0, r.a)})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(r.x, waterY + 3, r.r * 2.2, r.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    });
    // surface wave band
    ctx.strokeStyle = 'rgba(240,249,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
        const y = waterY + Math.sin(x * 0.028 + tm * 0.09) * 3.6;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // glints
    if (SS.quality === 'high') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 14; i++) {
            const gx = (i * 173 + tm * 2.1) % W;
            const gy = waterY + 8 + (i % 3) * 9 + Math.sin(tm * 0.1 + i) * 2;
            ctx.fillRect(gx, gy, 8, 1.6);
        }
    }
    // boat
    const boatX = 150;
    ctx.save();
    ctx.translate(0, Math.sin(tm * 0.05) * 2);
    ctx.fillStyle = ssLg(ctx, 0, waterY - 6, 0, waterY + 30, [[0, '#a16207'], [1, '#713f12']]);
    ctx.beginPath(); ctx.moveTo(boatX - 105, waterY - 6); ctx.lineTo(boatX + 105, waterY - 6);
    ctx.lineTo(boatX + 68, waterY + 28); ctx.lineTo(boatX - 68, waterY + 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#854d0e'; ctx.fillRect(boatX - 105, waterY - 11, 210, 9);
    // boy: legs, body (vest), head with cap, arm holding rod
    ctx.fillStyle = '#1e3a8a'; ssRR(ctx, boatX + 18, waterY - 26, 26, 22, 7); ctx.fill(); // legs seated
    ctx.fillStyle = '#f97316'; ssRR(ctx, boatX + 12, waterY - 52, 30, 30, 9); ctx.fill(); // vest
    ctx.fillStyle = '#fcd9b8'; ctx.beginPath(); ctx.arc(boatX + 27, waterY - 62, 12, 0, Math.PI * 2); ctx.fill(); // head
    ctx.fillStyle = '#dc2626'; // cap
    ctx.beginPath(); ctx.arc(boatX + 27, waterY - 66, 12, Math.PI, 0); ctx.fill();
    ctx.fillRect(boatX + 25, waterY - 68, 22, 5);
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(boatX + 32, waterY - 61, 1.7, 0, Math.PI * 2); ctx.fill(); // eye
    // rod with bend
    const bend = g.rodBend * 26;
    const base = { x: boatX + 40, y: waterY - 48 }, tip = { x: 268, y: waterY - 96 + bend };
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + 60, base.y - 40 + bend * 0.6, tip.x, tip.y); ctx.stroke();
    // arm
    ctx.strokeStyle = '#fcd9b8'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(boatX + 22, waterY - 44); ctx.lineTo(base.x + 6, base.y - 2); ctx.stroke();
    // fishing line
    const b = g.bobber;
    if (b.state !== 'held') {
        const taut = (b.state === 'hooked');
        ctx.strokeStyle = 'rgba(241,245,249,0.9)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
        if (taut) ctx.lineTo(b.x, b.y);
        else ctx.quadraticCurveTo((tip.x + b.x) / 2, Math.max(tip.y, b.y) + 26, b.x, b.y);
        ctx.stroke();
    }
    // bobber
    if (b.state === 'floating' || b.state === 'hooked' || b.state === 'lifting' || b.state === 'flying') {
        ctx.save(); ctx.translate(b.x, b.y);
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.fillRect(-1.4, -12, 2.8, 5);
        ctx.restore();
    }
    ctx.restore();
    // hooked name tag above fish when lifting
    if (g.fishOn) {
        const f = g.items[g.winnerIdx];
        ssNameTag(ctx, f.name, f.x, f.y - 44, 'rgba(120,53,15,0.92)', '#ffe27a');
    }
}
// ============================================================================
// MODE 16 v3: MAGIC BOOK OF KNOWLEDGE — candle-lit library, flipping pages
// ============================================================================
function ssBookPrepare(modeId) {
    const pool = ssShuffleArr(getUnpickedPool(2));
    const names = pool.slice(0, Math.min(10, pool.length));
    ssG = {
        mode: 16, names, winnerIdx: Math.floor(Math.random() * names.length),
        phase: 'idle', parts: [], flips: [], currentName: '?', glow: 0, flipQueue: []
    };
}
function ssBookStep() {
    const g = ssG, t = stageTick;
    // flip schedule: accelerating-then-easing page flips, last lands on winner
    const schedule = [14, 38, 66, 98, 136, 182];
    const k = schedule.indexOf(t);
    if (k >= 0) {
        const isLast = k === schedule.length - 1;
        const ni = isLast ? g.winnerIdx : Math.floor(Math.random() * g.names.length);
        g.flips.push({ p: 0, name: g.names[ni], last: isLast });
        StudioAudioManager.playPageFlipSound();
    }
    g.flips.forEach(f => {
        f.p += f.last ? 0.014 : 0.035;
        if (f.p >= 1 && !f.settled) { f.settled = true; g.currentName = f.name; if (f.last) g.glow = 1; }
    });
    g.flips = g.flips.filter(f => !f.settled || f.last);
    // sparkles when final page lands
    if (g.glow > 0 && Math.random() < 0.4) {
        g.parts.push({ x: 640 + (Math.random() - 0.5) * 420, y: 380 + (Math.random() - 0.5) * 120, vx: (Math.random() - 0.5) * 1.2, vy: -0.6 - Math.random() * 1.2, life: 1 });
    }
    g.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.012; });
    g.parts = g.parts.filter(p => p.life > 0);
    if (g.glow > 0 && stageTick > 236) {
        ssCrownWinner(g.names[g.winnerIdx], '📖', 'CHOSEN BY THE BOOK OF KNOWLEDGE', `📖 The Book chose: ${g.names[g.winnerIdx]}!`);
    }
}
function ssDrawBookV3(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    // candle-lit library backdrop
    ctx.fillStyle = ssRg(ctx, W * 0.78, H * 0.3, 40, 900, [[0, '#5b3a1a'], [0.45, '#2e1c0d'], [1, '#120a04']]);
    ctx.fillRect(0, 0, W, H);
    // bookshelves
    for (let s = 0; s < 3; s++) {
        const sy = 60 + s * 90;
        ctx.fillStyle = '#241407'; ctx.fillRect(30, sy, 250, 78);
        ctx.fillStyle = '#3a2410'; ctx.fillRect(30, sy + 70, 250, 8);
        for (let b = 0; b < 12; b++) {
            const bh = 44 + ((b * 37 + s * 13) % 22);
            ctx.fillStyle = ['#7f1d1d', '#1e3a8a', '#14532d', '#78350f', '#4c1d95'][((b + s) % 5)];
            ctx.fillRect(40 + b * 20, sy + 70 - bh, 15, bh);
        }
    }
    for (let s = 0; s < 3; s++) {
        const sy = 70 + s * 88;
        ctx.fillStyle = '#241407'; ctx.fillRect(W - 280, sy, 250, 74);
        ctx.fillStyle = '#3a2410'; ctx.fillRect(W - 280, sy + 66, 250, 8);
        for (let b = 0; b < 12; b++) {
            const bh = 40 + ((b * 29 + s * 17) % 24);
            ctx.fillStyle = ['#78350f', '#7f1d1d', '#0c4a6e', '#365314', '#581c87'][((b + s * 2) % 5)];
            ctx.fillRect(W - 270 + b * 20, sy + 66 - bh, 15, bh);
        }
    }
    // floating dust
    if (SS.quality === 'high') {
        ctx.fillStyle = 'rgba(255,220,150,0.35)';
        for (let i = 0; i < 26; i++) {
            const dx = (i * 197 + tm * 0.35) % W;
            const dy = (i * 89 + Math.sin(tm * 0.01 + i) * 40 + 200) % H;
            ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, Math.PI * 2); ctx.fill();
        }
    }
    // desk
    ctx.fillStyle = ssLg(ctx, 0, H * 0.68, 0, H, [[0, '#4a2c12'], [1, '#2a1808']]);
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
    // candle (right)
    const cx0 = W - 150, cy0 = H * 0.68 - 66;
    ctx.fillStyle = ssRg(ctx, cx0, cy0 - 30, 4, 130, [[0, 'rgba(255,200,90,0.55)'], [1, 'rgba(255,200,90,0)']]);
    ctx.beginPath(); ctx.arc(cx0, cy0 - 30, 130, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5e9c8'; ssRR(ctx, cx0 - 11, cy0, 22, 66, 5); ctx.fill();
    const fl = 1 + Math.sin(tm * 0.35) * 0.14;
    ctx.fillStyle = ssRg(ctx, cx0, cy0 - 26 * fl, 1, 26 * fl, [[0, '#fff7cc'], [0.5, '#fbbf24'], [1, 'rgba(249,115,22,0)']]);
    ctx.beginPath(); ctx.ellipse(cx0, cy0 - 20 * fl, 8, 20 * fl, 0, 0, Math.PI * 2); ctx.fill();

    // ---- the open book ----
    const bx = W / 2, by = H * 0.56, bw = 470, bh = 260;
    // magic glow under book
    const glowK = g.glow + (isStageRunning ? 0.25 : 0.12);
    ctx.fillStyle = ssRg(ctx, bx, by + 40, 20, 340, [[0, `rgba(255,215,94,${0.35 * glowK + 0.1})`], [1, 'rgba(255,215,94,0)']]);
    ctx.beginPath(); ctx.ellipse(bx, by + 60, 340, 130, 0, 0, Math.PI * 2); ctx.fill();
    // cover
    ssSh(ctx, 26, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = ssLg(ctx, bx - bw / 2, by, bx + bw / 2, by, [[0, '#5b21b6'], [0.5, '#7c3aed'], [1, '#4c1d95']]);
    ssRR(ctx, bx - bw / 2 - 16, by - 14, bw + 32, bh + 34, 16); ctx.fill();
    ssNoSh(ctx);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 4;
    ssRR(ctx, bx - bw / 2 - 16, by - 14, bw + 32, bh + 34, 16); ctx.stroke();
    // pages (left & right)
    const pageGrad = ssLg(ctx, bx - bw / 2, by, bx + bw / 2, by, [[0, '#f5e9c8'], [0.5, '#fbf3dc'], [1, '#f0e2bc']]);
    ctx.fillStyle = pageGrad;
    ctx.beginPath();
    ctx.moveTo(bx, by + 6);
    ctx.quadraticCurveTo(bx - bw * 0.26, by - 16, bx - bw / 2, by + 4);
    ctx.lineTo(bx - bw / 2, by + bh);
    ctx.quadraticCurveTo(bx - bw * 0.26, by + bh + 18, bx, by + bh + 6);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx, by + 6);
    ctx.quadraticCurveTo(bx + bw * 0.26, by - 16, bx + bw / 2, by + 4);
    ctx.lineTo(bx + bw / 2, by + bh);
    ctx.quadraticCurveTo(bx + bw * 0.26, by + bh + 18, bx, by + bh + 6);
    ctx.closePath(); ctx.fill();
    // spine shadow
    ctx.fillStyle = ssLg(ctx, bx - 26, 0, bx + 26, 0, [[0, 'rgba(120,80,20,0)'], [0.5, 'rgba(120,80,20,0.35)'], [1, 'rgba(120,80,20,0)']]);
    ctx.fillRect(bx - 26, by, 52, bh + 12);
    // text lines on left page (decor)
    ctx.strokeStyle = 'rgba(120,85,40,0.4)'; ctx.lineWidth = 3;
    for (let l = 0; l < 6; l++) {
        ctx.beginPath(); ctx.moveTo(bx - bw / 2 + 30, by + 40 + l * 30);
        ctx.lineTo(bx - 40 - (l % 3) * 18, by + 40 + l * 30); ctx.stroke();
    }
    // current settled name on right page
    ctx.textAlign = 'center';
    if (g.currentName && g.currentName !== '?') {
        ctx.save();
        if (g.glow > 0) { ctx.shadowColor = '#ffd75e'; ctx.shadowBlur = 26 * g.glow; }
        ctx.fillStyle = g.glow > 0 ? '#b45309' : '#6b4423';
        let fs = 40;
        ctx.font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`;
        while (ctx.measureText(g.currentName).width > bw / 2 - 60 && fs > 20) { fs -= 2; ctx.font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`; }
        ctx.fillText(g.currentName, bx + bw / 4, by + bh / 2);
        ctx.restore();
    } else {
        ctx.fillStyle = '#8a6a3a'; ctx.font = '900 34px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('?', bx + bw / 4, by + bh / 2);
    }
    // flipping pages
    g.flips.forEach(f => {
        if (f.settled) return;
        const p = f.p;
        const halfW = bw / 2;
        const sx = Math.cos(p * Math.PI); // 1 → -1
        ctx.save();
        ctx.translate(bx, by + 4);
        ctx.scale(Math.max(-1, Math.min(1, sx)) || 0.001, 1);
        ctx.fillStyle = '#fdf6e0';
        ssRR(ctx, 0, 0, halfW - 8, bh + 2, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(120,85,40,0.35)'; ctx.lineWidth = 2;
        ssRR(ctx, 0, 0, halfW - 8, bh + 2, 6); ctx.stroke();
        if (Math.abs(sx) > 0.35) {
            ctx.fillStyle = '#6b4423'; ctx.textAlign = 'center';
            let fs2 = 30;
            ctx.font = `900 ${fs2}px "Plus Jakarta Sans", "Cairo", sans-serif`;
            while (ctx.measureText(f.name).width > halfW - 60 && fs2 > 16) { fs2 -= 2; ctx.font = `900 ${fs2}px "Plus Jakarta Sans", "Cairo", sans-serif`; }
            ctx.fillText(f.name, (halfW - 8) / 2, bh / 2);
        }
        ctx.restore();
    });
    // golden sparkles
    g.parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    });
    // title ribbon
    ctx.fillStyle = 'rgba(36,20,7,0.8)';
    ssRR(ctx, bx - 230, 30, 460, 44, 12); ctx.fill();
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ssRR(ctx, bx - 230, 30, 460, 44, 12); ctx.stroke();
    ctx.fillStyle = '#ffd75e'; ctx.font = '900 22px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('📖 MAGIC BOOK OF KNOWLEDGE', bx, 60);
}
// ============================================================================
// v3 OVERRIDES: routing, stage open/close, adaptive grids, question library
// ============================================================================
function prepareStageEntities(modeId) {
    SS.raceDust = []; SS.csSmoke = []; SS.btSmoke = []; SS.btDebris = [];
    SS.csShook = false; SS.btBoomDone = false; SS.embers = [];
    if (modeId !== 4) ssNameTag.maxW = null;
    if (modeId === 1 && S3.active && S3.mode === 1) { ss3RacePrepare(1); return; }
    if (modeId === 4) {
        // every student exactly once, adaptive grid (fixes repeated names)
        const students = ssShuffleArr(getActiveStudents());
        const n = Math.max(1, students.length);
        const cols = Math.min(n, Math.max(3, Math.ceil(Math.sqrt(n * 2.4))));
        const rows = Math.ceil(n / cols);
        const stepX = 1130 / cols, startX = 75 + stepX / 2;
        const stepY = Math.min(150, 520 / rows), startY = 44 + stepY / 2;
        const rr = Math.max(20, Math.min(44, stepX * 0.27, (stepY - 60) / 2));
        ssNameTag.maxW = stepX - 6;   // v18: name tags never overlap their neighbours
        arrowStrikeState.targets = students.map((name, i) => {
            const r = Math.floor(i / cols), c = i % cols;
            const rowCount = Math.min(cols, n - r * cols);
            const offX = (cols - rowCount) * stepX / 2;
            return { idx: i, name, x: startX + offX + c * stepX, y: startY + r * stepY, r: rr, hit: false };
        });
        arrowStrikeState.aimIdx = -1; arrowStrikeState.selectedIdx = -1;
        arrowStrikeState.phase = 'idle'; arrowStrikeState.bowAngle = -Math.PI / 2;
        arrowStrikeState.bowPull = 0; arrowStrikeState.flightProgress = 0;
        arrowStrikeState.particles = []; arrowStrikeState.quiverTick = 0;
        return;
    }
    if (modeId === 5) {
        // every student exactly once, adaptive grid (fixes repeated names)
        const students = ssShuffleArr(getActiveStudents());
        const n = Math.max(1, students.length);
        const cols = Math.min(n, Math.max(3, Math.ceil(Math.sqrt(n * 2.4))));
        const rows = Math.ceil(n / cols);
        const stepX = 1160 / cols, startX = 60 + stepX / 2;
        const stepY = Math.min(118, 330 / rows), startY = 125 + stepY / 2;
        cannonStrikeState.crates = students.map((name, i) => {
            const r = Math.floor(i / cols), c = i % cols;
            const rowCount = Math.min(cols, n - r * cols);
            const offX = (cols - rowCount) * stepX / 2;
            return {
                idx: i, name,
                x: startX + offX + c * stepX, y: startY + r * stepY,
                w: Math.min(192, stepX * 0.9), h: Math.min(96, stepY * 0.8),
                shattered: false
            };
        });
        cannonStrikeState.aimIdx = -1; cannonStrikeState.selectedIdx = -1;
        cannonStrikeState.phase = 'idle'; cannonStrikeState.cannonAngle = 0;
        cannonStrikeState.recoil = 0; cannonStrikeState.flightProgress = 0;
        cannonStrikeState.debris = []; cannonStrikeState.shockwaveR = 0;
        csV3.phase = 'idle'; csV3.t = 0; csV3.selectedIdx = -1; csV3.aimIdx = -1;
        if (S3.active && S3.mode === 5) { ss3BuildCannonScene(); ss3CannonBuildCrates(); }
        return;
    }
    if (modeId === 6 && S3.active && S3.mode === 6) { ss3BuildChestScene(); return; }
    if (modeId >= 9) { ssPrepareNew(modeId); return; }
    window._ssOrig.prepare(modeId);
}
function ssPrepareNew(modeId) {
    if (modeId === 1) { ss3RacePrepare(modeId); return; }
    if (modeId === 12) {
        const pool = ssShuffleArr(getUnpickedPool(2));
        const names = pool.slice(0, Math.min(12, pool.length));
        ssG = { mode: 12, names, winnerIdx: Math.floor(Math.random() * names.length), phase: 'idle', parts: [], grabbed: false, dropped: false, dropV: 0 };
        if (S3.active && S3.mode === 12) ss3BuildClawScene();
        return;
    }
    if (modeId === 13) { ssFishPrepare(modeId); return; }
    if (modeId === 16) { ssBookPrepare(modeId); return; }
    window._ssV2.prepareNew(modeId);
}
function ssStepNew() {
    if (ssG.mode === 1) return;                 // race logic lives in the 3D render
    if (ssG.mode === 12) return ss3ClawStep();
    if (ssG.mode === 13) return ssFishStep();
    if (ssG.mode === 16) return ssBookStep();
    window._ssV2.stepNew();
}
function triggerActiveStageAnimation() {
    if (isStageRunning) return;
    if (getActiveStudents().length === 0) return alert("No students in current class!");
    if (activeStageMode === 1 && S3.active && S3.mode === 1) { ssRunNewMode(null); return; }
    if (activeStageMode === 7) { ssHoloStart(); return; }
    window._ssV2.trigger();
}
function drawStageFrame(isFinal = false) {
    if (S3.active) {
        if (S3.mode === 1) { ss3RaceRender(); return; }
        if (S3.mode === 5) { if (!isStageRunning) ss3CannonRender(); return; }
        if (S3.mode === 6) { ss3ChestRender(); return; }
        if (S3.mode === 12) { ss3ClawRender(); return; }
    }
    if (activeStageMode === 13 || activeStageMode === 16) {
        const canvas = document.getElementById('stageCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.save(); ctx.clearRect(0, 0, W, H); ssShake(ctx);
        if (activeStageMode === 13) ssDrawFishingV3(ctx, W, H); else ssDrawBookV3(ctx, W, H);
        ctx.restore();
        if (isFinal) ssDrawConfetti(ctx, W, H);
        ctx.textAlign = 'left';
        return;
    }
    window._ssV2.draw(isFinal);
}
function ssIdleLoop() {
    const modal = document.getElementById('gameStageModal');
    const keep3d = (typeof S3 !== 'undefined' && S3.active && S3.mode === 6);
    if (modal && modal.style.display !== 'none' && ((!isStageRunning && !ssFinalFxRunning) || keep3d)) {
        SS.idleT++;
        drawStageFrame(false);
    } else {
        SS.idleT++;
    }
    requestAnimationFrame(ssIdleLoop);
}
function openGameStage(modeId) {
    HOLO.active = false; HOLO.focus = 0;
    StudioAudioManager.stopAllActiveSounds();
    if (stageAnimFrame) cancelAnimationFrame(stageAnimFrame);
    isStageRunning = false;

    activeStageMode = modeId;
    lastOpenedGameMode = modeId;
    const modeObj = EIGHT_MODES.find(m => m.id === modeId) || EIGHT_MODES[0];
    const pos = EIGHT_MODES.findIndex(m => m.id === modeId) + 1;
    document.getElementById('stageModeBadge').textContent = `MODE ${pos > 0 ? pos : modeObj.id}`;
    document.getElementById('stageModeBadge').style.background = modeObj.color;
    document.getElementById('stageModeTitle').textContent = modeObj.title;

    const actBtn = document.getElementById('stageActionBtn');
    const labels = {
        1: '<i class="fa-solid fa-flag-checkered"></i> START RACE',
        4: '<i class="fa-solid fa-bullseye"></i> START / PICK WINNER',
        5: '<i class="fa-solid fa-bomb"></i> FIRE CANNON',
        6: '<i class="fa-solid fa-wand-magic-sparkles"></i> START TURBO SCAN',
        12: '<i class="fa-solid fa-up-down"></i> LOWER THE CLAW',
        13: '<i class="fa-solid fa-fish"></i> CAST THE LINE',
        16: '<i class="fa-solid fa-book-open"></i> OPEN THE BOOK'
    };
    actBtn.innerHTML = labels[modeId] || '<i class="fa-solid fa-play"></i> START / SPIN NOW';
    const banners = {
        1: "Ready — press START RACE!",
        4: "Ready — tap a student's target or press START",
        5: "Ready — tap a name crate or FIRE CANNON",
        6: "Ready — tap a chest or START TURBO SCAN",
        12: "Ready — LOWER THE CLAW!",
        13: "Ready — CAST THE LINE!",
        16: "Ready — OPEN THE BOOK!"
    };
    document.getElementById('stageWinnerBanner').textContent = banners[modeId] || "Ready — Click START!";

    document.getElementById('stageWinnerOverlay').style.display = 'none';
    document.getElementById('gameStageModal').style.display = 'flex';

    const canvas = document.getElementById('stageCanvas');
    const boxesGrid = document.getElementById('mysteryBoxesGrid');

    if (ss3IsMode(modeId) && ss3Avail() && ss3Boot(modeId)) {
        canvas.style.display = 'none';
        boxesGrid.style.display = 'none';
        prepareStageEntities(modeId);
        drawStageFrame(false);
    } else {
        ss3Teardown();
        if (modeId === 6) {
            canvas.style.display = 'none';
            boxesGrid.style.display = 'grid';
            window._ssV2.renderMystery();
        } else {
            boxesGrid.style.display = 'none';
            canvas.style.display = 'block';
            prepareStageEntities(modeId);
            drawStageFrame(false);
        }
    }
    StudioAudioManager.playSFX('pop');
}
function closeGameStage() {
    window._ssV2.close();
    StudioAudioManager.stopEngine && StudioAudioManager.stopEngine();
    ss3Teardown();
}
// ---------- mode registry updates ----------
EIGHT_MODES.push({ id: 16, title: "Magic Book of Knowledge", sub: "Enchanted Pages Pick the Reader", color: "#d4a017" });
(function ss3Retitle() {
    const t = {
        1: ["Turbo Highway Racers", "3D Chase Cam • Real Engine Roar"],
        5: ["Cannon Bomb Strike 3D", "Class Crates • Modern Field Cannon"],
        6: ["Turbo Mystery Chests 3D", "Real 3D Chests • Magical Reveal"],
        12: ["Prize Claw Machine 3D", "Real Arcade Cabinet • Smooth Claw"],
        13: ["Fishing Frenzy", "Cinematic Cast • Strike • Reel"]
    };
    EIGHT_MODES.forEach(m => { if (t[m.id]) { m.title = t[m.id][0]; m.sub = t[m.id][1]; } });
})();
function getModeCardSVG(modeId) {
    if (modeId === 16) {
        const svg = `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#241608"/><circle cx="200" cy="110" r="80" fill="#d4af37" opacity="0.25"/><path d="M200,60 Q150,45 105,60 L105,165 Q150,150 200,165 Z" fill="#f5e9c8"/><path d="M200,60 Q250,45 295,60 L295,165 Q250,150 200,165 Z" fill="#fbf3dc"/><path d="M200,60 L200,165" stroke="#c9b78a" stroke-width="4"/><text x="152" y="120" text-anchor="middle" font-size="34">📖</text><text x="248" y="118" text-anchor="middle" font-size="26" font-weight="900" fill="#b45309" font-family="sans-serif">A+</text><circle cx="90" cy="45" r="3" fill="#ffd75e"/><circle cx="320" cy="60" r="2.5" fill="#ffd75e"/><circle cx="300" cy="170" r="3" fill="#ffd75e"/></svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
    return window._ssV2.cardSVG(modeId);
}
// sequential card numbers (no gap after removing Slots)
const _ssV2RenderAll = window._ssV2.renderAll;
function renderAllDashboard() {
    _ssV2RenderAll();
    document.querySelectorAll('#modesGrid8 .mode-num-badge').forEach((b, i) => { b.textContent = i + 1; });
}
// ---------- question library persistence (auto-snapshot, confirm delete) ----------
function ssAutoSnapshotCurrentQs() {
    try {
        const cur = appState.questions || [];
        if (!cur.length) return;
        const sig = JSON.stringify(cur);
        if (sig === JSON.stringify(DEFAULT_QUESTIONS)) return;
        if (ssQFiles().some(f => JSON.stringify(f.questions) === sig)) return;
        const nm = (ssQSourceName() && ssQSourceName() !== 'Default Questions') ? ssQSourceName() : 'Classroom Questions';
        if (ssSaveQFile(nm, cur) !== false) showToast('💾 Current questions auto-saved to your library');
    } catch (e) {}
}
function ssQSourceChanged() {
    const sel = document.getElementById('ssQSourceSelect');
    if (!sel) return;
    const v = sel.value;
    if (v === '__current') return;
    ssAutoSnapshotCurrentQs();
    if (v === '__merge_all') ssMergeAllQFiles();
    else if (v === '__default') resetToDefaultQuestions();
    else ssLoadQFile(v);
    ssRenderQSelect();
}
function resetToDefaultQuestions() { ssAutoSnapshotCurrentQs(); window._ssV2.resetDef(); }
function ssLoadQFile(id) { ssAutoSnapshotCurrentQs(); window._ssV2.loadQFile(id); }
function ssMergeQFile(id) { ssAutoSnapshotCurrentQs(); window._ssV2.mergeQFile(id); }
function ssMergeAllQFiles() { ssAutoSnapshotCurrentQs(); window._ssV2.mergeAll(); }
async function ssDeleteQFile(id) {
    const f = ssQFiles().find(x => x.id === id);
    if (!f) return;
    if (!(await SSD.confirm('Delete question file', `Delete "${f.name}" permanently?\nThis cannot be undone.`, { danger: true, okLabel: 'Delete forever' }))) return;
    window._ssV2.delQFile(id);
}
// ============================================================================
// v3 PPTX VIEWER — high-fidelity: theme colors, backgrounds, per-run fonts,
// exact pt sizing, shape fills, bullets, rotation, placeholder inheritance
// ============================================================================
function pptxKids(node, name) { return Array.from(node.children || []).filter(e => e.localName === name); }
function pptxFirst(node, name) { const k = pptxKids(node, name); return k.length ? k[0] : null; }
function pptxEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function parseAndRenderExactPptxFile(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const parser = new DOMParser();
    const NS = (n) => n; // localName matching

    // ---- slide size ----
    let slideW = 9144000, slideH = 5143500, sizeFound = false;
    {   // v16: find presentation.xml whatever the case/path/prefix, and read sldSz by local name
        const presKey = Object.keys(zip.files).find(k => /^\.?\/?ppt\/presentation\.xml$/i.test(k.replace(/\\/g, '/')));
        if (presKey) {
            try {
                const presDoc = parser.parseFromString(await zip.files[presKey].async('string'), 'application/xml');
                const sldSz = Array.from(presDoc.getElementsByTagName('*')).find(e => e.localName === 'sldSz');
                if (sldSz) {
                    const cx = parseInt(sldSz.getAttribute('cx'), 10), cy = parseInt(sldSz.getAttribute('cy'), 10);
                    if (cx > 0 && cy > 0) { slideW = cx; slideH = cy; sizeFound = true; }
                }
            } catch (e) { console.warn('sldSz parse', e); }
        }
    }
    pptxSlideAspect = slideW / slideH;

    // ---- theme colors + fonts ----
    const theme = { dk1: '000000', lt1: 'FFFFFF', dk2: '1F497D', lt2: 'EEECE1', accent1: '4F81BD', accent2: 'C0504D', accent3: '9BBB59', accent4: '8064A2', accent5: '4BACC6', accent6: 'F79646', hlink: '0000FF', folHlink: '800080', majorFont: 'Calibri', minorFont: 'Calibri' };
    const themePath = Object.keys(zip.files).find(k => /^ppt\/theme\/theme\d+\.xml$/i.test(k));
    if (themePath) {
        const tDoc = parser.parseFromString(await zip.files[themePath].async('string'), 'application/xml');
        const scheme = Array.from(tDoc.getElementsByTagName('*')).find(e => e.localName === 'clrScheme');
        if (scheme) {
            Array.from(scheme.children).forEach(slot => {
                const srgb = pptxFirst(slot, 'srgbClr'), sys = pptxFirst(slot, 'sysClr');
                const val = srgb ? srgb.getAttribute('val') : (sys ? (sys.getAttribute('lastClr') || sys.getAttribute('val')) : null);
                if (val) theme[slot.localName] = val;
            });
        }
        const fontScheme = Array.from(tDoc.getElementsByTagName('*')).find(e => e.localName === 'fontScheme');
        if (fontScheme) {
            const mj = pptxFirst(fontScheme, 'majorFont'), mn = pptxFirst(fontScheme, 'minorFont');
            if (mj && pptxFirst(mj, 'latin')) theme.majorFont = pptxFirst(mj, 'latin').getAttribute('typeface') || theme.majorFont;
            if (mn && pptxFirst(mn, 'latin')) theme.minorFont = pptxFirst(mn, 'latin').getAttribute('typeface') || theme.minorFont;
        }
    }
    const schemeColor = (name) => {
        const map = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
        const key = map[name] || name;
        return theme[key] || null;
    };
    // resolve a solidFill element → css color
    function resolveFill(fillEl) {
        if (!fillEl) return null;
        const srgb = pptxFirst(fillEl, 'srgbClr');
        if (srgb) return '#' + srgb.getAttribute('val');
        const scheme = pptxFirst(fillEl, 'schemeClr');
        if (scheme) {
            let hex = schemeColor(scheme.getAttribute('val'));
            if (!hex) return null;
            let r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
            const lumMod = pptxFirst(scheme, 'lumMod'), lumOff = pptxFirst(scheme, 'lumOff');
            if (lumMod) { const k = parseInt(lumMod.getAttribute('val'), 10) / 100000; r *= k; g *= k; b *= k; }
            if (lumOff) { const k = parseInt(lumOff.getAttribute('val'), 10) / 100000; r += 255 * k; g += 255 * k; b += 255 * k; }
            const tint = pptxFirst(scheme, 'tint'), shade = pptxFirst(scheme, 'shade');
            if (tint) { const k = parseInt(tint.getAttribute('val'), 10) / 100000; r = r * k + 255 * (1 - k); g = g * k + 255 * (1 - k); b = b * k + 255 * (1 - k); }
            if (shade) { const k = parseInt(shade.getAttribute('val'), 10) / 100000; r *= k; g *= k; b *= k; }
            const cl = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
            return '#' + cl(r) + cl(g) + cl(b);
        }
        const sys = pptxFirst(fillEl, 'sysClr');
        if (sys) return '#' + (sys.getAttribute('lastClr') || '000000');
        return null;
    }

    // ---- media ----
    const mediaUrls = {};
    for (const path of Object.keys(zip.files)) {
        if (/^ppt\/media\/.+\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(path)) {
            mediaUrls[path.split('/').pop()] = URL.createObjectURL(await zip.files[path].async('blob'));
        }
    }
    async function readRels(relPath) {
        const map = {};
        if (zip.files[relPath]) {
            const relDoc = parser.parseFromString(await zip.files[relPath].async('string'), 'application/xml');
            Array.from(relDoc.getElementsByTagName('Relationship')).forEach(r => {
                map[r.getAttribute('Id')] = r.getAttribute('Target') || '';
            });
        }
        return map;
    }
    const normPath = (base, target) => {
        // base like 'ppt/slides/slide1.xml', target like '../slideLayouts/slideLayout1.xml'
        const parts = base.split('/'); parts.pop();
        target.split('/').forEach(p => { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); });
        return parts.join('/');
    };
    let GT = null; // v4: active group transform (child space -> slide space)
    function extractXfrm(node, sW, sH) {
        const spPr = pptxFirst(node, 'spPr') || pptxFirst(node, 'grpSpPr') || node;
        const xfrm = pptxFirst(spPr, 'xfrm');
        if (!xfrm) return null;
        const off = pptxFirst(xfrm, 'off'), ext = pptxFirst(xfrm, 'ext');
        if (!off || !ext) return null;
        const b = {
            x: parseInt(off.getAttribute('x') || '0', 10), y: parseInt(off.getAttribute('y') || '0', 10),
            cx: parseInt(ext.getAttribute('cx') || '0', 10), cy: parseInt(ext.getAttribute('cy') || '0', 10),
            rot: parseInt(xfrm.getAttribute('rot') || '0', 10) / 60000,
            flipH: xfrm.getAttribute('flipH') === '1', flipV: xfrm.getAttribute('flipV') === '1'
        };
        if (GT) { b.x = GT.ox + b.x * GT.sx; b.y = GT.oy + b.y * GT.sy; b.cx *= GT.sx; b.cy *= GT.sy; }
        return b;
    }
    function pptxColorCss(fillEl) {
        const base = resolveFill(fillEl); if (!base) return null;
        const clr = pptxFirst(fillEl, 'srgbClr') || pptxFirst(fillEl, 'schemeClr') || pptxFirst(fillEl, 'sysClr');
        const al = clr ? pptxFirst(clr, 'alpha') : null;
        if (!al) return base;
        const a = Math.max(0, Math.min(1, parseInt(al.getAttribute('val'), 10) / 100000));
        const r = parseInt(base.substr(1, 2), 16), g = parseInt(base.substr(3, 2), 16), b = parseInt(base.substr(5, 2), 16);
        return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    }
    function pptxBackground(spPr) {
        const sf = pptxFirst(spPr, 'solidFill');
        const gf = pptxFirst(spPr, 'gradFill');
        // only direct children count (a:ln has its own solidFill)
        const direct = (n) => Array.from(spPr.children).find(e => e.localName === n);
        const dsf = direct('solidFill'), dgf = direct('gradFill');
        if (dgf) {
            const gsLst = pptxFirst(dgf, 'gsLst');
            const stops = gsLst ? pptxKids(gsLst, 'gs').map(gs => `${pptxColorCss(gs) || '#fff'} ${(parseInt(gs.getAttribute('pos') || '0', 10) / 1000).toFixed(1)}%`) : [];
            if (stops.length >= 2) {
                const lin = pptxFirst(dgf, 'lin'), path = pptxFirst(dgf, 'path');
                if (path) return `radial-gradient(circle at center, ${stops.join(', ')})`;
                const ang = lin ? parseInt(lin.getAttribute('ang') || '0', 10) / 60000 : 90;
                return `linear-gradient(${(ang + 90).toFixed(1)}deg, ${stops.join(', ')})`;
            }
            return null;
        }
        if (dsf) return pptxColorCss(dsf);
        return null;
    }
    const pct = (box, sW, sH) => ({
        leftPct: (box.x / sW) * 100, topPct: (box.y / sH) * 100,
        widthPct: (box.cx / sW) * 100, heightPct: (box.cy / sH) * 100, rot: box.rot || 0,
        flipH: !!box.flipH, flipV: !!box.flipV
    });

    // parse a part (slide / layout / master) for placeholder boxes + background
    async function parsePart(path) {
        if (!zip.files[path]) return null;
        const doc = parser.parseFromString(await zip.files[path].async('string'), 'application/xml');
        const rels = await readRels(path.split('/').slice(0, -1).join('/') + '/_rels/' + path.split('/').pop() + '.rels');
        const ph = {};
        let bg = null;
        const all = Array.from(doc.getElementsByTagName('*'));
        // background
        const bgPr = all.find(e => e.localName === 'bgPr');
        const bgRef = all.find(e => e.localName === 'bgRef');
        if (bgPr) {
            const sf = pptxFirst(bgPr, 'solidFill');
            const blipFill = pptxFirst(bgPr, 'blipFill');
            if (sf) bg = { type: 'color', color: resolveFill(sf) };
            else if (blipFill) {
                const blip = pptxFirst(blipFill, 'blip');
                const rid = blip ? (blip.getAttribute('r:embed') || blip.getAttribute('embed')) : null;
                const tgt = rid ? rels[rid] : null;
                if (tgt && tgt.includes('media/')) bg = { type: 'image', url: mediaUrls[tgt.split('media/').pop()] };
            }
        } else if (bgRef) {
            const sf = pptxFirst(bgRef, 'schemeClr') ? bgRef : null;
            if (sf) bg = { type: 'color', color: resolveFill(bgRef) };
        }
        // placeholders
        Array.from(doc.getElementsByTagName('p:sp')).forEach(sp => {
            const phEl = Array.from(sp.getElementsByTagName('*')).find(e => e.localName === 'ph');
            if (!phEl) return;
            const type = phEl.getAttribute('type') || 'body';
            const idx = phEl.getAttribute('idx') || '0';
            const box = extractXfrm(sp, slideW, slideH);
            if (box) ph[type + '|' + idx] = box;
            if (!ph[type]) ph[type] = box;
        });
        return { ph, bg, doc, rels };
    }

    const slideFiles = Object.keys(zip.files)
        .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
        .sort((a, b) => parseInt(a.match(/slide(\d+)\.xml/i)[1], 10) - parseInt(b.match(/slide(\d+)\.xml/i)[1], 10));
    if (slideFiles.length === 0) throw new Error("No slides found inside PowerPoint file.");

    // master (shared fallback)
    const masterPath = Object.keys(zip.files).find(k => /^ppt\/slideMasters\/slideMaster\d+\.xml$/i.test(k));
    const master = masterPath ? await parsePart(masterPath) : null;

    parsedPptxSlides = [];
    for (let i = 0; i < slideFiles.length; i++) {
        const sPath = slideFiles[i];
        const part = await parsePart(sPath);
        const doc = part.doc, rels = part.rels;
        // layout for this slide
        let layout = null;
        const layRel = Object.keys(rels).find(k => rels[k].includes('slideLayout'));
        if (layRel) layout = await parsePart(normPath(sPath, rels[layRel]));
        const bg = part.bg || (layout && layout.bg) || (master && master.bg) || { type: 'color', color: '#FFFFFF' };

        const elements = [];
        let firstTitle = '';

        // ================= v17: richer PowerPoint parsing =================
        const phOf = (sp) => Array.from(sp.getElementsByTagName('*')).find(e => e.localName === 'ph');
        function partPhList(part) {
            if (!part) return [];
            if (!part._phl) {
                part._phl = [];
                Array.from(part.doc.getElementsByTagName('*')).forEach(n => {
                    if (n.localName !== 'sp') return;
                    const ph = phOf(n); if (!ph) return;
                    part._phl.push({ type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx') || '0', sp: n });
                });
            }
            return part._phl;
        }
        const normT = (t) => (t === 'ctrTitle' ? 'title' : t === 'subTitle' ? 'body' : t);
        function findPhSp(part, type, idx) {
            const list = partPhList(part); if (!list.length) return null;
            let m = null;
            if (idx !== '0') m = list.find(q => q.idx === idx);
            if (!m) m = list.find(q => normT(q.type) === normT(type));
            return m ? m.sp : null;
        }
        const lstOf = (sp) => { const tb = pptxFirst(sp, 'txBody'); return tb ? pptxFirst(tb, 'lstStyle') : null; };
        function masterTx(kind) { return master ? (Array.from(master.doc.getElementsByTagName('*')).find(e => e.localName === kind) || null) : null; }
        function fontName(tf, isTitle) {
            if (!tf) return isTitle ? theme.majorFont : theme.minorFont;
            if (/^\+mj/i.test(tf)) return theme.majorFont;
            if (/^\+mn/i.test(tf)) return theme.minorFont;
            return tf;
        }
        function readLvl(el) {
            if (!el) return null;
            const o = {};
            if (el.getAttribute('algn')) o.algn = el.getAttribute('algn');
            if (el.getAttribute('marL') != null) o.marL = parseInt(el.getAttribute('marL'), 10);
            if (el.getAttribute('indent') != null) o.indent = parseInt(el.getAttribute('indent'), 10);
            if (el.getAttribute('rtl') != null) o.rtl = el.getAttribute('rtl') === '1';
            const d = pptxFirst(el, 'defRPr');
            if (d) {
                if (d.getAttribute('sz')) o.sz = parseInt(d.getAttribute('sz'), 10) / 100;
                if (d.getAttribute('b') != null) o.b = d.getAttribute('b') === '1';
                if (d.getAttribute('i') != null) o.i = d.getAttribute('i') === '1';
                const f = pptxFirst(d, 'solidFill'); if (f) { const c = pptxColorCss(f); if (c) o.color = c; }
                const lt = pptxFirst(d, 'latin'); if (lt && lt.getAttribute('typeface')) o.fam = lt.getAttribute('typeface');
            }
            if (pptxFirst(el, 'buNone')) o.bu = '';
            else { const bc = pptxFirst(el, 'buChar'); if (bc) o.bu = bc.getAttribute('char') || '•'; else if (pptxFirst(el, 'buAutoNum')) o.bu = '•'; }
            const spc = (name) => { const n = pptxFirst(el, name); if (!n) return undefined; const pt = pptxFirst(n, 'spcPts'), pc = pptxFirst(n, 'spcPct'); if (pt) return { pt: parseInt(pt.getAttribute('val'), 10) / 100 }; if (pc) return { pct: parseInt(pc.getAttribute('val'), 10) / 100000 }; return undefined; };
            const ln = pptxFirst(el, 'lnSpc');
            if (ln) { const pc = pptxFirst(ln, 'spcPct'), pt = pptxFirst(ln, 'spcPts'); if (pc) o.lineH = parseInt(pc.getAttribute('val'), 10) / 100000; else if (pt) o.linePt = parseInt(pt.getAttribute('val'), 10) / 100; }
            const sb = spc('spcBef'); if (sb) o.spcBef = sb;
            const sa = spc('spcAft'); if (sa) o.spcAft = sa;
            return o;
        }
        function readRun(rPr) {
            const o = {}; if (!rPr) return o;
            if (rPr.getAttribute('sz')) o.sz = parseInt(rPr.getAttribute('sz'), 10) / 100;
            if (rPr.getAttribute('b') != null) o.b = rPr.getAttribute('b') === '1';
            if (rPr.getAttribute('i') != null) o.i = rPr.getAttribute('i') === '1';
            if (rPr.getAttribute('u')) o.u = rPr.getAttribute('u') !== 'none';
            if (rPr.getAttribute('strike') && rPr.getAttribute('strike') !== 'noStrike') o.strike = true;
            if (rPr.getAttribute('baseline')) o.base = parseInt(rPr.getAttribute('baseline'), 10);
            const f = pptxFirst(rPr, 'solidFill'); if (f) { const c = pptxColorCss(f); if (c) o.color = c; }
            const lt = pptxFirst(rPr, 'latin'); if (lt && lt.getAttribute('typeface')) o.fam = lt.getAttribute('typeface');
            return o;
        }
        function parseParas(txBody, lvlStyle, opt) {
            const paras = [];
            const fontScale = opt.fontScale || 1;
            pptxKids(txBody, 'p').forEach(p => {
                const pPr = pptxFirst(p, 'pPr');
                const lvl = pPr && pPr.getAttribute('lvl') ? (parseInt(pPr.getAttribute('lvl'), 10) || 0) : 0;
                const ls = lvlStyle(Math.min(8, lvl));
                const own = readLvl(pPr) || {};
                const g = (k) => own[k] !== undefined ? own[k] : ls[k];
                const defR = readRun(pPr ? pptxFirst(pPr, 'defRPr') : null);
                let bullet = g('bu'); bullet = bullet ? bullet : null;
                let marL = g('marL') || 0, indent = g('indent') || 0;
                if (bullet && !marL && !indent) { marL = 342900; indent = -342900; }
                const runs = [];
                function pushRun(rPr, text) {
                    if (!text) return;
                    const rs = readRun(rPr);
                    const pick = (k) => rs[k] !== undefined ? rs[k] : (defR[k] !== undefined ? defR[k] : ls[k]);
                    let sz = pick('sz'); if (sz == null) sz = opt.defSz;
                    runs.push({ text, sz: sz * fontScale, bold: !!pick('b'), italic: !!pick('i'), underline: !!rs.u, strike: !!rs.strike, color: pick('color') || opt.defColor, fam: fontName(pick('fam'), opt.isTitle), base: rs.base || 0 });
                }
                Array.from(p.children).forEach(ch => {
                    if (ch.localName === 'r') { const t = pptxFirst(ch, 't'); pushRun(pptxFirst(ch, 'rPr'), t ? t.textContent : ''); }
                    else if (ch.localName === 'br') { pushRun(pptxFirst(ch, 'rPr'), '\n'); }
                    else if (ch.localName === 'fld') { const t = pptxFirst(ch, 't'); pushRun(pptxFirst(ch, 'rPr'), t ? t.textContent : ''); }
                });
                let blank = false;
                if (!runs.length) {
                    const er = readRun(pptxFirst(p, 'endParaRPr'));
                    const sz = (er.sz != null ? er.sz : (ls.sz != null ? ls.sz : opt.defSz)) * fontScale;
                    runs.push({ text: ' ', sz, bold: false, italic: false, underline: false, strike: false, color: opt.defColor, fam: fontName(null, opt.isTitle), base: 0 });
                    blank = true;
                }
                const al = g('algn') || '';
                paras.push({ runs, blank, align: al === 'ctr' ? 'center' : al === 'r' ? 'right' : al === 'just' ? 'justify' : 'left', bullet, marL, indent, lineH: g('lineH') || null, linePt: g('linePt') || null, spcBef: g('spcBef'), spcAft: g('spcAft'), rtl: !!g('rtl') });
            });
            return paras;
        }
        function emitTextShape(sp, boxOverride) {
            const txBody = pptxFirst(sp, 'txBody');
            if (!txBody) return false;
            const bodyPr = pptxFirst(txBody, 'bodyPr');
            const phEl = phOf(sp);
            const phType = phEl ? (phEl.getAttribute('type') || 'body') : null;
            const phIdx = phEl ? (phEl.getAttribute('idx') || '0') : null;
            const isTitle = phType === 'title' || phType === 'ctrTitle';
            const layoutSp = phEl ? findPhSp(layout, phType, phIdx) : null;
            const masterSp = phEl ? findPhSp(master, phType, phIdx) : null;
            const bpOf = (n) => { if (!n) return null; const tb = pptxFirst(n, 'txBody'); return tb ? pptxFirst(tb, 'bodyPr') : null; };
            const bps = [bodyPr, bpOf(layoutSp), bpOf(masterSp)];
            const battr = (n) => { for (const b of bps) if (b && b.getAttribute(n) != null) return b.getAttribute(n); return null; };
            const anchor = battr('anchor') || 't';
            const num = (n, d) => { const v = battr(n); return v == null ? d : (parseInt(v, 10) || 0); };
            const ins = { l: num('lIns', 91440), t: num('tIns', 45720), r: num('rIns', 91440), b: num('bIns', 45720) };
            const noWrap = battr('wrap') === 'none';
            const autofit = bodyPr ? pptxFirst(bodyPr, 'normAutofit') : null;
            const fontScale = autofit && autofit.getAttribute('fontScale') ? parseInt(autofit.getAttribute('fontScale'), 10) / 100000 : 1;
            const stl = pptxFirst(sp, 'style'); const fr = stl ? pptxFirst(stl, 'fontRef') : null;
            const styleColor = fr ? resolveFill(fr) : null;
            const kind = phEl ? (isTitle ? 'titleStyle' : (phType === 'dt' || phType === 'ftr' || phType === 'sldNum') ? 'otherStyle' : 'bodyStyle') : 'otherStyle';
            const ownLst = [pptxFirst(txBody, 'lstStyle'), layoutSp ? lstOf(layoutSp) : null, masterSp ? lstOf(masterSp) : null];
            const mTx = masterTx(kind);
            const lvlStyle = (lvl) => {
                const out = {}; const key = 'lvl' + (lvl + 1) + 'pPr';
                const merge = (c) => { const o = c ? readLvl(pptxFirst(c, key)) : null; if (o) Object.keys(o).forEach(k => { if (out[k] === undefined) out[k] = o[k]; }); };
                ownLst.forEach(merge);
                if (styleColor && !phEl && out.color === undefined) out.color = styleColor;
                merge(mTx);
                return out;
            };
            const paras = parseParas(txBody, lvlStyle, { fontScale, isTitle, defSz: isTitle ? 44 : 18, defColor: styleColor || ('#' + theme.dk1) });
            if (!paras.some(q => !q.blank)) return false;
            if (!firstTitle) { const t = paras.filter(q => !q.blank).map(q => q.runs.map(r => r.text).join('')).join(' ').trim(); if (t) firstTitle = t; }
            let box = boxOverride || extractXfrm(sp, slideW, slideH);
            if (!box && phEl) { const sv = GT; GT = null; box = (layoutSp && extractXfrm(layoutSp, slideW, slideH)) || (masterSp && extractXfrm(masterSp, slideW, slideH)) || null; GT = sv; }
            elements.push(Object.assign({ type: 'text', paras, anchor, ins, noWrap, z: elements.length }, box ? pct(box, slideW, slideH) : { leftPct: 8, topPct: 30, widthPct: 84, heightPct: 40, rot: 0 }));
            return true;
        }
        function picGeom(spPr) {
            const g = spPr ? pptxFirst(spPr, 'prstGeom') : null;
            const prst = g ? (g.getAttribute('prst') || 'rect') : 'rect';
            let adj = null;
            if (g) { const av = pptxFirst(g, 'avLst'); const gd = av ? pptxFirst(av, 'gd') : null; if (gd) { const m = /val\s+(-?\d+)/.exec(gd.getAttribute('fmla') || ''); if (m) adj = parseInt(m[1], 10); } }
            return { prst, adj };
        }
        function lineOf(spPr, node, force) {
            const ln = Array.from(spPr.children).find(e => e.localName === 'ln');
            if (ln && pptxFirst(ln, 'noFill')) return null;
            let color = null;
            if (ln) { const lsf = pptxFirst(ln, 'solidFill'); if (lsf) color = pptxColorCss(lsf); }
            if (!color) {
                const stl = pptxFirst(node, 'style'); const lr = stl ? pptxFirst(stl, 'lnRef') : null;
                if (lr && (force || ln || parseInt(lr.getAttribute('idx') || '0', 10) > 0)) color = resolveFill(lr);
            }
            if (!color) return null;
            const d = ln ? pptxFirst(ln, 'prstDash') : null, te = ln ? pptxFirst(ln, 'tailEnd') : null, he = ln ? pptxFirst(ln, 'headEnd') : null;
            return { color, w: ln ? parseInt(ln.getAttribute('w') || '9525', 10) : 9525, dash: d ? d.getAttribute('val') : 'solid',
                tail: te && te.getAttribute('type') && te.getAttribute('type') !== 'none' ? te.getAttribute('type') : null,
                head: he && he.getAttribute('type') && he.getAttribute('type') !== 'none' ? he.getAttribute('type') : null };
        }
        function blipUrl(holder) {
            const blip = Array.from(holder.getElementsByTagName('*')).find(el => el.localName === 'blip');
            const rid = blip ? (blip.getAttribute('r:embed') || blip.getAttribute('embed')) : null;
            const tgt = rid ? rels[rid] : null;
            return tgt && tgt.includes('media/') ? mediaUrls[tgt.split('media/').pop()] : null;
        }
        function cropOf(holder) {
            const sr = Array.from(holder.getElementsByTagName('*')).find(el => el.localName === 'srcRect');
            if (!sr) return null;
            const v = (n) => (parseInt(sr.getAttribute(n) || '0', 10) || 0) / 100000;
            return { l: v('l'), t: v('t'), r: v('r'), b: v('b') };
        }
        function emitPic(pic, boxOverride) {
            const url = blipUrl(pic); if (!url) return;
            const box = boxOverride || extractXfrm(pic, slideW, slideH); if (!box) return;
            const spPr = Array.from(pic.children).find(e => e.localName === 'spPr');
            const gm = picGeom(spPr);
            elements.push(Object.assign({ type: 'image', url, crop: cropOf(pic), shape: gm.prst, adj: gm.adj, line: spPr ? lineOf(spPr, pic) : null, z: elements.length }, pct(box, slideW, slideH), { wEmu: box.cx, hEmu: box.cy }));
        }
        function emitShapeFill(sp, boxOverride) {
            const spPr = Array.from(sp.children).find(e => e.localName === 'spPr');
            if (!spPr) return;
            const direct = (n) => Array.from(spPr.children).find(e => e.localName === n);
            const gm = picGeom(spPr);
            const bf = direct('blipFill');
            if (bf) {   // picture-filled shape (e.g. photo inside a circle)
                const url = blipUrl(bf); const box0 = boxOverride || extractXfrm(sp, slideW, slideH);
                if (url && box0) { elements.push(Object.assign({ type: 'image', url, crop: cropOf(bf), shape: gm.prst, adj: gm.adj, line: lineOf(spPr, sp), z: elements.length }, pct(box0, slideW, slideH), { wEmu: box0.cx, hEmu: box0.cy })); return; }
            }
            let bg = direct('noFill') ? null : pptxBackground(spPr);
            if (!bg && !direct('noFill') && !direct('solidFill') && !direct('gradFill') && !direct('pattFill')) {
                const stl = pptxFirst(sp, 'style'); const fr = stl ? pptxFirst(stl, 'fillRef') : null;
                if (fr && parseInt(fr.getAttribute('idx') || '0', 10) > 0) bg = resolveFill(fr);
            }
            const line = lineOf(spPr, sp);
            if (!bg && !line) return;
            let shadow = null;
            const eff = direct('effectLst');
            const sh = eff ? pptxFirst(eff, 'outerShdw') : null;
            if (sh) {
                const blur = parseInt(sh.getAttribute('blurRad') || '0', 10), dist = parseInt(sh.getAttribute('dist') || '0', 10), dir = parseInt(sh.getAttribute('dir') || '0', 10) / 60000 * Math.PI / 180;
                shadow = { blur, dx: Math.cos(dir) * dist, dy: Math.sin(dir) * dist, color: pptxColorCss(sh) || 'rgba(0,0,0,0.3)' };
            }
            const box = boxOverride || extractXfrm(sp, slideW, slideH);
            if (!box) return;
            elements.push(Object.assign({ type: 'shape', color: bg || 'transparent', shape: gm.prst, adj: gm.adj, line, shadow, z: elements.length }, pct(box, slideW, slideH), { wEmu: box.cx, hEmu: box.cy }));
        }
        function emitLine(node) {
            const spPr = Array.from(node.children).find(e => e.localName === 'spPr'); if (!spPr) return;
            const box = extractXfrm(node, slideW, slideH); if (!box) return;
            const ln = lineOf(spPr, node, true) || { color: '#64748b', w: 9525, dash: 'solid', tail: null, head: null };
            elements.push(Object.assign({ type: 'line', line: ln, z: elements.length }, pct(box, slideW, slideH)));
        }
        const hexA = (hex, a) => { const r = parseInt(hex.substr(1, 2), 16), g2 = parseInt(hex.substr(3, 2), 16), b2 = parseInt(hex.substr(5, 2), 16); return `rgba(${r},${g2},${b2},${a})`; };
        function emitTable(gf) {
            const tbl = Array.from(gf.getElementsByTagName('*')).find(e => e.localName === 'tbl'); if (!tbl) return;
            const box = extractXfrm(gf, slideW, slideH); if (!box) return;
            const grid = pptxFirst(tbl, 'tblGrid');
            const cols = grid ? pptxKids(grid, 'gridCol').map(c => parseInt(c.getAttribute('w') || '0', 10)) : [];
            const tblPr = pptxFirst(tbl, 'tblPr');
            const firstRow = !!(tblPr && tblPr.getAttribute('firstRow') === '1'), band = !!(tblPr && tblPr.getAttribute('bandRow') === '1');
            const hasStyle = !!(tblPr && pptxFirst(tblPr, 'tableStyleId'));
            const acc = '#' + theme.accent1;
            const oTx = masterTx('otherStyle');
            const lvl0 = (lvl) => (oTx ? readLvl(pptxFirst(oTx, 'lvl' + (lvl + 1) + 'pPr')) : null) || {};
            const rows = [];
            pptxKids(tbl, 'tr').forEach((tr, ri) => {
                const cells = [];
                pptxKids(tr, 'tc').forEach(tc => {
                    const tcPr = pptxFirst(tc, 'tcPr');
                    let fill = null, hdr = false, defColor = '#' + theme.dk1;
                    if (tcPr) { const sf = pptxFirst(tcPr, 'solidFill'); if (sf) fill = pptxColorCss(sf); }
                    if (!fill && hasStyle) {
                        if (firstRow && ri === 0) { fill = acc; defColor = '#ffffff'; hdr = true; }
                        else fill = hexA(acc, band ? (ri % 2 === 1 ? 0.22 : 0.10) : 0.10);
                    }
                    const bd = (n) => { const l = tcPr ? pptxFirst(tcPr, n) : null; if (!l || pptxFirst(l, 'noFill')) return null; const sf = pptxFirst(l, 'solidFill'); return sf ? { color: pptxColorCss(sf), w: Math.max(1, parseInt(l.getAttribute('w') || '12700', 10)) } : null; };
                    const txBody = pptxFirst(tc, 'txBody');
                    const paras = txBody ? parseParas(txBody, lvl0, { isTitle: false, defSz: 18, defColor }) : [];
                    if (hdr) paras.forEach(q => q.runs.forEach(r => { r.bold = true; }));
                    const ma = (n, d) => { const v = tcPr ? tcPr.getAttribute(n) : null; return v == null ? d : (parseInt(v, 10) || 0); };
                    cells.push({ paras, fill, hdr, span: parseInt(tc.getAttribute('gridSpan') || '1', 10), rspan: parseInt(tc.getAttribute('rowSpan') || '1', 10),
                        skip: tc.getAttribute('hMerge') === '1' || tc.getAttribute('vMerge') === '1', anchor: tcPr && tcPr.getAttribute('anchor') || 't',
                        mar: { l: ma('marL', 91440), r: ma('marR', 91440), t: ma('marT', 45720), b: ma('marB', 45720) },
                        bl: bd('lnL'), br: bd('lnR'), bt: bd('lnT'), bb: bd('lnB'), styled: hasStyle });
                });
                rows.push({ h: parseInt(tr.getAttribute('h') || '370840', 10), cells });
            });
            if (!rows.length) return;
            elements.push(Object.assign({ type: 'table', cols, rows, z: elements.length }, pct(box, slideW, slideH), { wEmu: box.cx, hEmu: box.cy }));
            if (!firstTitle) { const t = rows[0].cells.map(c => c.paras.map(q => q.runs.map(r => r.text).join('')).join(' ')).join(' ').trim(); if (t) firstTitle = t; }
        }
        function walkShapes(container, grpOffset) {
            Array.from(container.children).forEach(node => {
                if (node.localName === 'sp') {
                    const spPrN = Array.from(node.children).find(e => e.localName === 'spPr');
                    const gN = spPrN ? pptxFirst(spPrN, 'prstGeom') : null, prN = gN ? gN.getAttribute('prst') : '';
                    if (/^(line|straightConnector1)$/.test(prN)) emitLine(node);
                    else { emitShapeFill(node); emitTextShape(node); }
                } else if (node.localName === 'cxnSp') {
                    emitLine(node);
                } else if (node.localName === 'graphicFrame') {
                    emitTable(node);
                } else if (node.localName === 'pic') {
                    emitPic(node);
                } else if (node.localName === 'grpSp') {
                    // v4: real group transform (child coordinate space -> slide space)
                    const gpr = pptxFirst(node, 'grpSpPr');
                    const gx = gpr ? pptxFirst(gpr, 'xfrm') : null;
                    const saved = GT;
                    if (gx) {
                        const off = pptxFirst(gx, 'off'), ext = pptxFirst(gx, 'ext'), co = pptxFirst(gx, 'chOff'), ce = pptxFirst(gx, 'chExt');
                        if (off && ext && co && ce) {
                            let bx = parseInt(off.getAttribute('x') || '0', 10), by = parseInt(off.getAttribute('y') || '0', 10);
                            let bw = parseInt(ext.getAttribute('cx') || '0', 10), bh = parseInt(ext.getAttribute('cy') || '0', 10);
                            if (saved) { bx = saved.ox + bx * saved.sx; by = saved.oy + by * saved.sy; bw *= saved.sx; bh *= saved.sy; }
                            const cw = parseInt(ce.getAttribute('cx') || '0', 10) || bw, ch = parseInt(ce.getAttribute('cy') || '0', 10) || bh;
                            const sx = bw / cw, sy = bh / ch;
                            GT = { sx, sy, ox: bx - parseInt(co.getAttribute('x') || '0', 10) * sx, oy: by - parseInt(co.getAttribute('y') || '0', 10) * sy };
                        }
                    }
                    walkShapes(node, null);
                    GT = saved;
                }
            });
        }
        const cSld = pptxFirst(doc.documentElement, 'cSld') || doc.documentElement;
        const spTree = pptxFirst(cSld, 'spTree') || cSld;
        walkShapes(spTree, null);

        parsedPptxSlides.push({ index: i + 1, title: firstTitle || `Slide ${i + 1}`, elements, bg, slideW, slideH });
    }
    // v16: if the slide size was missing/wrong, shapes land outside the slide (only half of it shows). Detect it from the content and rescale.
    (function fixSlideSize() {
        const els = []; parsedPptxSlides.forEach(sl => sl.elements.forEach(e => els.push(e)));
        if (!els.length) return;
        const ext = els.map(e => Math.max(e.leftPct + e.widthPct, e.topPct + e.heightPct)).sort((a, b) => a - b);
        const outside = els.filter(e => e.leftPct + e.widthPct / 2 > 100.5 || e.topPct + e.heightPct / 2 > 100.5).length / els.length;
        const q = ext[Math.min(ext.length - 1, Math.floor(ext.length * 0.97))];
        if (!(q > 101 && (!sizeFound || outside >= 0.15))) return;
        let k = Math.min(4, q / 100);
        [4 / 3, 1.5, 2, 1.2].forEach(c => { if (Math.abs(k - c) / c < 0.04) k = c; });
        parsedPptxSlides.forEach(sl => {
            sl.slideW *= k; sl.slideH *= k;
            sl.elements.forEach(e => { e.leftPct /= k; e.topPct /= k; e.widthPct /= k; e.heightPct /= k; });
        });
        console.info('[pptx] slide size corrected x' + k.toFixed(3));
    })();
    currentPptxSlideIdx = Math.max(0, Math.min(parsedPptxSlides.length - 1, window.__ssPresRestore | 0)); window.__ssPresRestore = 0;
    document.getElementById('presSlideNav').style.display = 'flex';
    const _es = document.getElementById('presenterEmptyState'); if (_es) _es.style.display = 'none';
    const _slot = document.getElementById('presenterContentSlot'); if (_slot) _slot.style.display = 'flex';
    renderCurrentPptxSlide();
    renderPptxThumbnails();
}

function renderCurrentPptxSlide() {
    if (parsedPptxSlides.length === 0) return;
    const slide = parsedPptxSlides[currentPptxSlideIdx];
    { const _j = document.getElementById('presSlideJump'), _t = document.getElementById('presSlideTotal'); if (_j && document.activeElement !== _j) _j.value = currentPptxSlideIdx + 1; if (_t) _t.textContent = parsedPptxSlides.length; } try { localStorage.setItem(smk7('SGE_SM_PRES_STATE'), JSON.stringify({ id: activeFileId, name: (document.getElementById('presFileName') || {}).textContent || '', slide: currentPptxSlideIdx, ts: Date.now() })); } catch (e) {}

    // v4: lay the slide out at a fixed logical size, then scale the WHOLE slide (text, shapes, images) to fit the viewer
    const baseWidth = 1280;
    const baseHeight = Math.round(baseWidth / pptxSlideAspect);
    const pxPerPt = baseWidth / ((slide.slideW || 9144000) / 12700);

    let bgCss = 'background:#ffffff;';
    if (slide.bg) {
        if (slide.bg.type === 'color' && slide.bg.color) bgCss = `background:${slide.bg.color};`;
        else if (slide.bg.type === 'image' && slide.bg.url) bgCss = `background:url('${slide.bg.url}') center/cover no-repeat #ffffff;`;
    }

    let innerHTML = '';
    slide.elements.forEach((el, zi) => {
        const posCss = `left:${el.leftPct}%; top:${el.topPct}%; width:${el.widthPct}%; z-index:${zi + 2};`;
        const rotCss = el.rot ? ` transform:rotate(${el.rot}deg);` : '';
        if (el.type === 'image') {
            innerHTML += `<div class="pptx-abs-element" style="${posCss} height:${el.heightPct}%;${rotCss}"><img src="${el.url}" style="width:100%; height:100%; object-fit:fill; display:block;" alt=""></div>`;
        } else if (el.type === 'shape') {
            const pxPerEmu = baseWidth / (slide.slideW || 9144000);
            let radius = '';
            if (el.shape === 'ellipse') radius = 'border-radius:50%;';
            else if (el.shape && /^round/i.test(el.shape)) {
                const a = (el.adj == null ? 16667 : el.adj) / 100000;
                radius = `border-radius:${(Math.min(el.wEmu || 0, el.hEmu || 0) * a * pxPerEmu).toFixed(1)}px;`;
            }
            const bd = el.line ? `border:${Math.max(1, el.line.w * pxPerEmu).toFixed(1)}px solid ${el.line.color};` : '';
            const shd = el.shadow ? `box-shadow:${(el.shadow.dx * pxPerEmu).toFixed(1)}px ${(el.shadow.dy * pxPerEmu).toFixed(1)}px ${(el.shadow.blur * pxPerEmu).toFixed(1)}px ${el.shadow.color};` : '';
            innerHTML += `<div class="pptx-abs-element" style="${posCss} height:${el.heightPct}%; background:${el.color}; ${radius}${bd}${shd}${rotCss}"></div>`;
        } else if (el.type === 'text') {
            const justify = el.anchor === 'ctr' ? 'center' : el.anchor === 'b' ? 'flex-end' : 'flex-start';
            const parasHtml = el.paras.map(p => {
                const runsHtml = p.runs.map(r => {
                    if (r.text === '\n') return '<br>';
                    const st = `font-size:${(r.sz * pxPerPt).toFixed(1)}px; color:${r.color}; ${r.bold ? 'font-weight:700;' : 'font-weight:400;'} ${r.italic ? 'font-style:italic;' : ''} ${r.underline ? 'text-decoration:underline;' : ''} font-family:'${pptxEsc(r.fam || 'Calibri')}', Arial, sans-serif;`;
                    return `<span style="${st}">${pptxEsc(r.text)}</span>`;
                }).join('');
                const padL = p.marL ? (p.marL / 12700 * pxPerPt).toFixed(1) + 'px' : '0';
                const hang = p.indent ? (p.indent / 12700 * pxPerPt).toFixed(1) + 'px' : '0';
                const lh = p.lineH ? `line-height:${p.lineH.toFixed(2)};` : 'line-height:1.22;';
                const bulletSpan = p.bullet ? `<span style="position:absolute; left:${padL}; margin-left:${hang}; color:${(p.runs[0] && p.runs[0].color) || 'inherit'}; font-size:${p.runs[0] ? (p.runs[0].sz * pxPerPt).toFixed(1) : 16}px;">${pptxEsc(p.bullet)}</span>` : '';
                const style = `position:relative; text-align:${p.align}; ${lh} padding-left:${padL}; text-indent:${hang}; margin:0 0 0.35em 0;`;
                return `<div style="${style}">${bulletSpan}${runsHtml}</div>`;
            }).join('');
            innerHTML += `<div class="pptx-abs-text" style="${posCss} min-height:${el.heightPct}%; display:flex; flex-direction:column; justify-content:${justify};${rotCss}"><div style="width:100%;">${parasHtml}</div></div>`;
        }
    });

    const slot = document.getElementById('presenterContentSlot');
    const vp = slot.parentElement;
    const availW = Math.max(200, (vp ? vp.clientWidth : 960) - 48);
    const availH = Math.max(150, (vp ? vp.clientHeight : 600) - 48);
    const fit = Math.min(availW / baseWidth, availH / baseHeight);
    const sc = Math.max(0.05, fit * currentPresZoom);
    slot.innerHTML = `
        <div id="presScaleBox" style="width:${Math.round(baseWidth * sc)}px; height:${Math.round(baseHeight * sc)}px; position:relative; flex-shrink:0; margin:0 auto;">
            <div class="pptx-exact-stage" id="presZoomTarget" style="width:${baseWidth}px; height:${baseHeight}px; ${bgCss} box-shadow:0 18px 46px rgba(0,0,0,0.22); border-radius:0; overflow:hidden; position:absolute; left:0; top:0; transform:scale(${sc}); transform-origin:0 0; transition:none;">
                ${innerHTML}
            </div>
        </div>
    `;
}
window.addEventListener('resize', () => { if (typeof currentMediaType !== 'undefined' && currentMediaType === 'pptx' && parsedPptxSlides.length) renderCurrentPptxSlide(); });
document.addEventListener('fullscreenchange', () => { setTimeout(() => { if (typeof currentMediaType !== 'undefined' && currentMediaType === 'pptx' && parsedPptxSlides.length) renderCurrentPptxSlide(); }, 120); });
// ============================================================================
// v3 INIT
// ============================================================================
(function ssInitV3() {
    // version badge
    const badge = document.getElementById('ssVersionBadge');
    if (badge) badge.textContent = 'Alforqan - Studio v8 • Real 3D • 15 Games • Q-Library';

    // drag & drop question files anywhere on the quiz arena (they persist until YOU delete them)
    const quizPortal = document.getElementById('portal_quiz');
    if (quizPortal) {
        quizPortal.addEventListener('dragover', (e) => { e.preventDefault(); });
        quizPortal.addEventListener('drop', (e) => {
            e.preventDefault();
            const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!f) return;
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            try {
                if (['xlsx', 'xls', 'csv'].includes(ext)) {
                    window._ssV2.excelUp({ target: { files: [f], value: '' } });
                } else if (ext === 'docx') {
                    window._ssV2.wordUp({ target: { files: [f], value: '' } }, false);
                } else {
                    showToast('📄 Drop an Excel (.xlsx) or Word (.docx) questions file');
                }
            } catch (err) {}
        });
    }

    // one-time protection: snapshot any live unsaved question set
    setTimeout(() => { try { ssAutoSnapshotCurrentQs(); ssRenderQSelect(); } catch (e) {} }, 2500);
    setTimeout(() => { try { ssAutoSnapshotCurrentQs(); ssRenderQSelect(); } catch (e) {} }, 7000);

    renderAllDashboard();
})();
// v3 late fixes (these redeclarations win)
function ss3RaceRender() {
    if (isStageRunning) {
        if (ssG.phase === 'idle') ssG.phase = 'racing';
        ss3RaceStep();
        S3.renderer.render(S3.scene, S3.camera);
    } else if (ssG.mode === 1 && ssG.phase === 'idle') {
        ss3RaceIdle();
    } else {
        S3.renderer.render(S3.scene, S3.camera);
    }
}

// ============================================================================
// v5: MODE 1 — TOP-DOWN GRAN TURISMO RACE (2D canvas, whole track visible)
// ============================================================================
const TD = { cars: [], names: [], phase: 'idle', t: 0, bg: null, trail: null, parts: [], conf: [], scroll: 0, winner: null, winT: 0, flash: 0 };
const TD_COLS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const TD_W = 1280, TD_H = 620, TD_S = 2;
const TD_ROAD_T = 108, TD_ROAD_B = 566, TD_START = 46, TD_FIN = 1120, TD_LEN = 104, TD_CW = 44;
function tdSeed(n) { let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function tdBuildBg() {
    const c = document.createElement('canvas'); c.width = TD_W * TD_S; c.height = TD_H * TD_S;
    const g = c.getContext('2d'); g.scale(TD_S, TD_S);
    const r = tdSeed(77);
    // sky
    let sk = g.createLinearGradient(0, 0, 0, 64); sk.addColorStop(0, '#0b79c2'); sk.addColorStop(1, '#bfe6fb');
    g.fillStyle = sk; g.fillRect(0, 0, TD_W, 66);
    // sun glow
    let sg = g.createRadialGradient(150, 40, 4, 150, 40, 70); sg.addColorStop(0, 'rgba(255,248,200,.95)'); sg.addColorStop(1, 'rgba(255,248,200,0)');
    g.fillStyle = sg; g.fillRect(60, 0, 180, 80);
    // distant hills
    g.fillStyle = '#6fb1d6'; g.beginPath(); g.moveTo(0, 62);
    for (let x = 0; x <= TD_W; x += 40) g.lineTo(x, 40 + Math.sin(x * 0.011) * 10 + Math.sin(x * 0.03) * 4); g.lineTo(TD_W, 62); g.fill();
    // grandstand with crowd
    g.fillStyle = '#1f2937'; g.fillRect(0, 44, TD_W, 24);
    for (let x = 0; x < TD_W; x += 6) for (let y = 47; y < 66; y += 5) {
        const hue = Math.floor(r() * 360); g.fillStyle = `hsl(${hue},70%,${55 + r() * 20}%)`;
        g.beginPath(); g.arc(x + 2 + r() * 2, y + r(), 1.9, 0, 7); g.fill();
    }
    g.fillStyle = '#334155'; g.fillRect(0, 66, TD_W, 4);
    // grass top
    let gr = g.createLinearGradient(0, 70, 0, TD_ROAD_T - 16); gr.addColorStop(0, '#15803d'); gr.addColorStop(1, '#22c55e');
    g.fillStyle = gr; g.fillRect(0, 70, TD_W, TD_ROAD_T - 16 - 70);
    for (let x = 0; x < TD_W; x += 48) { g.fillStyle = (x / 48) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(x, 70, 48, TD_ROAD_T - 86); }
    // grass bottom
    let gb = g.createLinearGradient(0, TD_ROAD_B + 16, 0, TD_H); gb.addColorStop(0, '#22c55e'); gb.addColorStop(1, '#14532d');
    g.fillStyle = gb; g.fillRect(0, TD_ROAD_B + 16, TD_W, TD_H - TD_ROAD_B - 16);
    for (let x = 0; x < TD_W; x += 48) { g.fillStyle = (x / 48) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(x, TD_ROAD_B + 16, 48, 40); }
    // asphalt
    let as = g.createLinearGradient(0, TD_ROAD_T, 0, TD_ROAD_B); as.addColorStop(0, '#2a313d'); as.addColorStop(0.5, '#323a47'); as.addColorStop(1, '#262c37');
    g.fillStyle = as; g.fillRect(0, TD_ROAD_T, TD_W, TD_ROAD_B - TD_ROAD_T);
    for (let i = 0; i < 14000; i++) {
        const v = r(); g.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.10)';
        const s = r() < 0.9 ? 1 : 2; g.fillRect(r() * TD_W, TD_ROAD_T + r() * (TD_ROAD_B - TD_ROAD_T), s, s);
    }
    for (let i = 0; i < 22; i++) { // patches
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)';
        g.beginPath(); g.ellipse(r() * TD_W, TD_ROAD_T + r() * (TD_ROAD_B - TD_ROAD_T), 50 + r() * 120, 10 + r() * 22, 0, 0, 7); g.fill();
    }
    // road shoulder shadows
    let sh = g.createLinearGradient(0, TD_ROAD_T, 0, TD_ROAD_T + 14); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(0, TD_ROAD_T, TD_W, 14);
    sh = g.createLinearGradient(0, TD_ROAD_B - 14, 0, TD_ROAD_B); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = sh; g.fillRect(0, TD_ROAD_B - 14, TD_W, 14);
    // start grid line
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(TD_START + TD_LEN + 14, TD_ROAD_T, 5, TD_ROAD_B - TD_ROAD_T);
    // finish line (checkered, 2 columns)
    const rows = Math.round((TD_ROAD_B - TD_ROAD_T) / 14), rh = (TD_ROAD_B - TD_ROAD_T) / rows;
    for (let i = 0; i < rows; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#0f172a' : '#f8fafc'; g.fillRect(TD_FIN + j * 14, TD_ROAD_T + i * rh, 14, rh + 0.5); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(TD_FIN + 42, TD_ROAD_T, 10, TD_ROAD_B - TD_ROAD_T);
    // tyre walls + run-off
    for (let x = 0; x < TD_W; x += 22) {
        [TD_ROAD_T - 30, TD_ROAD_B + 24].forEach(y => {
            g.fillStyle = '#111827'; g.beginPath(); g.ellipse(x + 11, y + 7, 10, 6, 0, 0, 7); g.fill();
            g.fillStyle = (x / 22) % 2 ? '#e5e7eb' : '#ef4444'; g.beginPath(); g.ellipse(x + 11, y + 7, 6, 3, 0, 0, 7); g.fill();
        });
    }
    // finish gantry sign
    g.fillStyle = '#0f172a'; g.fillRect(TD_FIN + 6, 72, 6, TD_ROAD_T - 72); g.fillRect(TD_FIN + 36, 72, 6, TD_ROAD_T - 72);
    g.fillStyle = '#fde047'; g.beginPath(); g.roundRect(TD_FIN - 34, 66, 112, 28, 8); g.fill();
    g.fillStyle = '#0f172a'; g.font = '900 16px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center'; g.fillText('🏁 FINISH', TD_FIN + 22, 86);
    return c;
}
function tdPrepare() {
    const canvas = document.getElementById('stageCanvas');
    if (canvas.width !== TD_W * TD_S) { canvas.width = TD_W * TD_S; canvas.height = TD_H * TD_S; }
    const pool = ssShuffleArr(getUnpickedPool(2));
    const names = pool.slice(0, Math.min(6, pool.length));
    const n = Math.max(names.length, 1);
    const laneH = (TD_ROAD_B - TD_ROAD_T) / n;
    const winnerIdx = Math.floor(Math.random() * n);
    ssG = { mode: 1, names, winnerIdx, phase: 'idle', parts: [] };
    TD.names = names; TD.phase = 'idle'; TD.t = 0; TD.parts = []; TD.conf = []; TD.scroll = 0; TD.winner = null; TD.winT = 0; TD.flash = 0;
    TD.laneH = laneH;
    if (!TD.bg) TD.bg = tdBuildBg();
    TD.trail = document.createElement('canvas'); TD.trail.width = TD_W * TD_S; TD.trail.height = TD_H * TD_S;
    TD.cars = names.map((nm, i) => ({
        name: nm, color: TD_COLS[i % TD_COLS.length], lane: i, cy: TD_ROAD_T + laneH * (i + 0.5),
        prog: 0, wob: Math.random() * 6.28, base: (i === winnerIdx) ? 1.0 : 0.86 + Math.random() * 0.13, v: 0, finishedAt: 0
    }));
    ssG.items = TD.cars;
}
function tdCarX(car) { return TD_START + car.prog * (TD_FIN - TD_LEN - TD_START); }
function tdCarY(car) { return car.cy + (TD.phase === 'race' || TD.phase === 'done' ? Math.sin(TD.t * 0.03 + car.wob * 2) * Math.min(5, TD.laneH * 0.07) : 0); }
function tdStep() {
    const t = TD.t;
    if (TD.phase === 'count') {
        if (t === 1 || t === 31 || t === 61) StudioAudioManager.playSFX('click');
        if (t >= 90) { TD.phase = 'race'; ssG.phase = 'racing'; StudioAudioManager.playSFX('select'); try { StudioAudioManager.startEngine(); } catch (e) {} }
        return;
    }
    if (TD.phase === 'race') {
        const AVG = 1 / 520; // ~9 seconds at 60fps
        let leader = 0;
        TD.cars.forEach((c, i) => {
            const burst = 1 + 0.22 * Math.sin(t * 0.045 + c.wob) + Math.random() * 0.08;
            const boost = (i === ssG.winnerIdx) ? 1.07 : 1;
            const dv = AVG * c.base * burst * boost;
            c.v = dv; c.prog += dv; leader = Math.max(leader, c.prog);
        });
        const w = TD.cars[ssG.winnerIdx];
        if (w.prog < leader && leader >= 0.86) w.prog = leader + 0.0008;
        leader = Math.max(leader, w.prog);
        try { StudioAudioManager.setEnginePower(Math.min(1, 0.3 + leader)); } catch (e) {}
        if (leader >= 1) {
            TD.cars.forEach(c => { if (c.prog > 1) c.prog = 1; });
            w.prog = 1; TD.phase = 'done'; TD.winner = w.name; TD.winT = 0; TD.flash = 1;
            ssG.phase = 'done';
            try { StudioAudioManager.stopEngine(); } catch (e) {}
            for (let k = 0; k < 160; k++) TD.conf.push({ x: TD_FIN + 20 + (Math.random() - 0.5) * 80, y: TD_ROAD_T + Math.random() * 200, vx: (Math.random() - 0.5) * 9 - 3, vy: -3 - Math.random() * 7, r: 3 + Math.random() * 4, rot: Math.random() * 6, col: ['#fde047', '#ef4444', '#3b82f6', '#22c55e', '#ec4899', '#fff'][k % 6], life: 1 });
            ssCrownWinner(w.name, '🏎️', 'GRAN TURISMO CHAMPION', `🏁 Winner: ${w.name}!`);
        }
        return;
    }
    if (TD.phase === 'done') { // others roll over the line
        TD.cars.forEach(c => { if (c.prog < 1) { c.prog = Math.min(1, c.prog + 0.0016 * (0.6 + c.base * 0.5)); c.v = 0.0016; } else c.v = 0; });
    }
}
// ---- top-down car ----
function tdShade(hex, f) { return ssHexCol(hex, f); }
function tdCar(g, x, cy, color, number, boost, hl) {
    const L = TD_LEN, Wd = TD_CW, top = cy - Wd / 2;
    g.save(); g.translate(x, cy);
    // shadow
    g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.roundRect(-L / 2 + 3, -Wd / 2 + 6, L, Wd, 14); g.fill();
    // wheels
    g.fillStyle = '#0b0f17';
    [[-L / 2 + 14, -1], [-L / 2 + 14, 1], [L / 2 - 26, -1], [L / 2 - 26, 1]].forEach(([wx, s]) => {
        g.beginPath(); g.roundRect(wx - 10, s < 0 ? -Wd / 2 - 3 : Wd / 2 - 8, 20, 11, 3); g.fill();
        g.fillStyle = '#374151'; g.fillRect(wx - 6, s < 0 ? -Wd / 2 - 1 : Wd / 2 - 6, 12, 2); g.fillStyle = '#0b0f17';
    });
    // rear wing
    g.fillStyle = tdShade(color, 0.55); g.beginPath(); g.roundRect(-L / 2 - 3, -Wd / 2 - 1, 11, Wd + 2, 3); g.fill();
    g.fillStyle = '#0b0f17'; g.fillRect(-L / 2 - 3, -Wd / 2 - 1, 3, Wd + 2);
    // body
    const bg = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
    bg.addColorStop(0, tdShade(color, 1.4)); bg.addColorStop(0.5, color); bg.addColorStop(1, tdShade(color, 0.6));
    g.fillStyle = bg; g.beginPath();
    g.moveTo(-L / 2 + 8, -Wd / 2 + 2); g.lineTo(L / 2 - 30, -Wd / 2 + 1);
    g.quadraticCurveTo(L / 2 - 8, -Wd / 2 + 4, L / 2, -6); g.lineTo(L / 2, 6);
    g.quadraticCurveTo(L / 2 - 8, Wd / 2 - 4, L / 2 - 30, Wd / 2 - 1);
    g.lineTo(-L / 2 + 8, Wd / 2 - 2); g.quadraticCurveTo(-L / 2 - 1, 0, -L / 2 + 8, -Wd / 2 + 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.5; g.stroke();
    // racing stripes
    g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(-L / 2 + 8, -4, L - 20, 3); g.fillRect(-L / 2 + 8, 1.5, L - 20, 3);
    // side mirrors
    g.fillStyle = tdShade(color, 0.7); g.fillRect(6, -Wd / 2 - 3, 7, 4); g.fillRect(6, Wd / 2 - 1, 7, 4);
    // cabin
    g.fillStyle = '#0c1220'; g.beginPath(); g.roundRect(-14, -Wd / 2 + 6, 38, Wd - 12, 9); g.fill();
    const gl = g.createLinearGradient(-14, 0, 24, 0); gl.addColorStop(0, 'rgba(125,211,252,.35)'); gl.addColorStop(0.6, 'rgba(14,165,233,.15)'); gl.addColorStop(1, 'rgba(186,230,253,.45)');
    g.fillStyle = gl; g.beginPath(); g.roundRect(-12, -Wd / 2 + 8, 34, Wd - 16, 7); g.fill();
    g.fillStyle = tdShade(color, 0.9); g.beginPath(); g.roundRect(-6, -Wd / 2 + 12, 18, Wd - 24, 5); g.fill();
    // number disc
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-26, 0, 8, 0, 7); g.fill();
    g.fillStyle = '#0f172a'; g.font = '900 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(number), -26, 1); g.textBaseline = 'alphabetic';
    // headlights + tail lights
    g.fillStyle = '#fef9c3'; g.beginPath(); g.ellipse(L / 2 - 4, -Wd / 2 + 9, 4, 3, 0, 0, 7); g.ellipse(L / 2 - 4, Wd / 2 - 9, 4, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#ff2d2d'; g.fillRect(-L / 2 + 6, -Wd / 2 + 5, 3, 7); g.fillRect(-L / 2 + 6, Wd / 2 - 12, 3, 7);
    // gloss
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(26, -Wd / 2 + 8, 16, 3, 0, 0, 7); g.fill();
    if (hl) { g.strokeStyle = '#fde047'; g.lineWidth = 3; g.shadowColor = '#fde047'; g.shadowBlur = 22; g.beginPath(); g.roundRect(-L / 2 - 2, -Wd / 2 - 3, L + 4, Wd + 6, 14); g.stroke(); }
    g.restore();
}
function tdTag(g, text, x, y, gold) {
    g.font = '800 17px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center';
    const w = g.measureText(text).width + 22;
    g.fillStyle = gold ? 'rgba(250,204,21,.96)' : 'rgba(10,15,28,.82)';
    g.beginPath(); g.roundRect(x - w / 2, y - 14, w, 24, 9); g.fill();
    g.strokeStyle = gold ? '#fff7c2' : 'rgba(255,255,255,.28)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = gold ? '#1e293b' : '#fff'; g.fillText(text, x, y + 3);
}
function tdRender() {
    const canvas = document.getElementById('stageCanvas'); if (!canvas) return;
    if (canvas.width !== TD_W * TD_S) tdPrepare();
    if (!TD.cars.length || !TD.bg) tdPrepare();
    const running = isStageRunning;
    if (running && TD.phase === 'idle') { TD.phase = 'count'; TD.t = 0; }
    if (running || TD.phase === 'done') { TD.t++; tdStep(); } else TD.t++;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(TD.bg, 0, 0);
    ctx.setTransform(TD_S, 0, 0, TD_S, 0, 0);
    const g = ctx, t = TD.t;
    const racing = TD.phase === 'race';
    const lead = TD.cars.reduce((m, c) => Math.max(m, c.prog), 0);
    const spd = racing ? 10 : (TD.phase === 'done' ? 3 : 0.4);
    TD.scroll += spd;
    // moving asphalt texture streaks
    g.save(); g.beginPath(); g.rect(0, TD_ROAD_T, TD_W, TD_ROAD_B - TD_ROAD_T); g.clip();
    if (racing || TD.phase === 'done') {
        g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 2;
        for (let k = 0; k < 26; k++) { const yy = TD_ROAD_T + ((k * 53) % (TD_ROAD_B - TD_ROAD_T)); const xx = ((k * 211 - TD.scroll * (1.2 + (k % 3) * 0.3)) % (TD_W + 200) + TD_W + 200) % (TD_W + 200) - 100; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + 70 + (k % 4) * 20, yy); g.stroke(); }
    }
    // rubber marks layer
    g.drawImage(TD.trail, 0, 0, TD_W, TD_H);
    // lane dashes (scrolling)
    g.strokeStyle = 'rgba(248,250,252,.55)'; g.lineWidth = 3; g.setLineDash([30, 28]); g.lineDashOffset = TD.scroll % 58;
    for (let i = 1; i < TD.cars.length; i++) { const ly = TD_ROAD_T + i * TD.laneH; g.beginPath(); g.moveTo(0, ly); g.lineTo(TD_FIN, ly); g.stroke(); }
    g.setLineDash([]);
    g.restore();
    // curbs (scroll)
    for (let cx = -60; cx < TD_W + 60; cx += 60) {
        const sx = cx - (TD.scroll % 120);
        g.fillStyle = Math.floor((cx) / 60) % 2 === 0 ? '#ef4444' : '#f8fafc';
        g.fillRect(sx, TD_ROAD_T - 16, 60, 16); g.fillRect(sx, TD_ROAD_B, 60, 16);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(sx, TD_ROAD_T - 3, 60, 3); g.fillRect(sx, TD_ROAD_B + 13, 60, 3);
    }
    // trail marks & particles
    const tg = TD.trail.getContext('2d'); tg.setTransform(TD_S, 0, 0, TD_S, 0, 0);
    const order = [...TD.cars].sort((a, b) => b.prog - a.prog);
    // cars (back to front by y for overlap; lanes don't overlap)
    TD.cars.forEach((car, i) => {
        const x = tdCarX(car) + TD_LEN / 2, y = tdCarY(car);
        const moving = (racing || (TD.phase === 'done' && car.prog < 1));
        if (moving) {
            const rx = x - TD_LEN / 2 + 10;
            tg.fillStyle = 'rgba(0,0,0,.05)'; tg.fillRect(rx - 6, y - TD_CW / 2 + 2, 10, 3); tg.fillRect(rx - 6, y + TD_CW / 2 - 5, 10, 3);
            if (Math.random() < 0.55) TD.parts.push({ x: x - TD_LEN / 2 - 4, y: y + (Math.random() - 0.5) * TD_CW * 0.8, vx: -2.5 - Math.random() * 3, vy: (Math.random() - 0.5) * 0.8, life: 1, r: 3 + Math.random() * 4, type: 's' });
            if (Math.random() < 0.3) TD.parts.push({ x: x - TD_LEN / 2 - 6, y: y + (Math.random() < .5 ? -1 : 1) * 10, vx: -4 - Math.random() * 4, vy: (Math.random() - 0.5) * 2, life: 1, r: 1.6, type: 'k', col: Math.random() < 0.5 ? '#fde047' : '#fb923c' });
            // motion blur streaks
            const sl = 70 + 220 * Math.min(1, (car.v || 0) / (1 / 380));
            const sg = g.createLinearGradient(x - TD_LEN / 2 - sl, 0, x - TD_LEN / 2, 0);
            sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, car.color + 'aa');
            g.fillStyle = sg; g.beginPath(); g.roundRect(x - TD_LEN / 2 - sl, y - TD_CW * 0.36, sl, TD_CW * 0.72, 10); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.6;
            for (let k = 0; k < 3; k++) { const yy = y + (k - 1) * 13 + Math.sin(t * 0.7 + k + i) * 2; const l = 60 + ((t * 13 + k * 37 + i * 19) % 90); g.beginPath(); g.moveTo(x - TD_LEN / 2 - 12, yy); g.lineTo(x - TD_LEN / 2 - 12 - l, yy); g.stroke(); }
            // nitro flame
            const fl = 26 + Math.random() * 26;
            const fg = g.createLinearGradient(x - TD_LEN / 2 - fl, 0, x - TD_LEN / 2 + 2, 0);
            fg.addColorStop(0, 'rgba(59,130,246,0)'); fg.addColorStop(0.55, '#38bdf8'); fg.addColorStop(1, '#fef08a');
            g.fillStyle = fg; g.beginPath(); g.moveTo(x - TD_LEN / 2 + 2, y - 7); g.quadraticCurveTo(x - TD_LEN / 2 - fl * 0.5, y - 4, x - TD_LEN / 2 - fl, y); g.quadraticCurveTo(x - TD_LEN / 2 - fl * 0.5, y + 4, x - TD_LEN / 2 + 2, y + 7); g.fill();
        }
        const isLeader = racing && order[0] === car && car.prog > 0.02;
        const isWin = TD.phase === 'done' && car.name === TD.winner;
        if (TD.phase === 'done' && !isWin) g.globalAlpha = 0.72;
        tdCar(g, x, y, car.color, i + 1, moving, isWin);
        g.globalAlpha = 1;
    });
    // particles
    TD.parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.type === 's' ? 0.035 : 0.06;
        if (p.type === 's') { g.fillStyle = `rgba(210,215,225,${Math.max(0, p.life) * 0.4})`; g.beginPath(); g.arc(p.x, p.y, p.r + (1 - p.life) * 8, 0, 7); g.fill(); }
        else { g.fillStyle = p.col; g.globalAlpha = Math.max(0, p.life); g.fillRect(p.x, p.y, 3, 2); g.globalAlpha = 1; }
    });
    TD.parts = TD.parts.filter(p => p.life > 0);
    if (TD.parts.length > 400) TD.parts.splice(0, TD.parts.length - 400);
    // name tags (always on top, clear)
    TD.cars.forEach((car, i) => {
        const x = tdCarX(car) + TD_LEN / 2, y = tdCarY(car);
        const isLeader = (racing || TD.phase === 'done') && order[0] === car && car.prog > 0.02;
        const pos = order.indexOf(car) + 1;
        const label = (racing || TD.phase === 'done') ? `${pos}. ${car.name}` : car.name;
        const ty = y - TD_CW / 2 - 12 < TD_ROAD_T + 10 ? y + TD_CW / 2 + 22 : y - TD_CW / 2 - 10;
        tdTag(g, label, Math.min(Math.max(x, 110), TD_FIN - 40), ty, isLeader || (TD.phase === 'done' && car.name === TD.winner));
    });
    // countdown lights
    if (TD.phase === 'count') {
        const n = 3 - Math.floor(TD.t / 30);
        const cx = 640, cy = 330;
        g.fillStyle = 'rgba(8,12,24,.72)'; g.beginPath(); g.roundRect(cx - 150, cy - 70, 300, 140, 22); g.fill();
        for (let k = 0; k < 3; k++) { g.fillStyle = (3 - k) >= n ? '#ef4444' : '#3f1d1d'; g.shadowColor = '#ef4444'; g.shadowBlur = (3 - k) >= n ? 22 : 0; g.beginPath(); g.arc(cx - 70 + k * 70, cy - 12, 24, 0, 7); g.fill(); g.shadowBlur = 0; }
        g.fillStyle = '#fff'; g.font = '900 24px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center'; g.fillText(n > 0 ? 'GET READY  ' + n : 'GO!', cx, cy + 48);
    } else if (TD.phase === 'race' && TD.t < 150 + 90) {
        const a = Math.max(0, 1 - (TD.t - 90) / 50);
        if (a > 0) { g.globalAlpha = a; g.fillStyle = '#22c55e'; g.font = '900 110px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center'; g.shadowColor = '#000'; g.shadowBlur = 18; g.fillText('GO!', 640, 360); g.shadowBlur = 0; g.globalAlpha = 1; }
    }
    // idle hint
    if (TD.phase === 'idle') {
        g.fillStyle = 'rgba(8,12,24,.65)'; g.beginPath(); g.roundRect(440, 20, 400, 34, 12); g.fill();
        g.fillStyle = '#fde047'; g.font = '800 17px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center'; g.fillText('🏎️ On the grid - press START RACE', 640, 43);
    }
    // winner banner + confetti
    if (TD.phase === 'done') {
        TD.winT++;
        const s = Math.min(1, TD.winT / 14);
        g.save(); g.translate(640, 37); g.scale(0.7 + 0.3 * s, 0.7 + 0.3 * s); g.globalAlpha = s;
        g.font = '900 26px "Plus Jakarta Sans", sans-serif'; g.textAlign = 'center';
        const txt = '🏆 WINNER: ' + TD.winner, w = g.measureText(txt).width + 56;
        g.fillStyle = '#facc15'; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 16; g.beginPath(); g.roundRect(-w / 2, -24, w, 48, 16); g.fill(); g.shadowBlur = 0;
        g.fillStyle = '#1e293b'; g.fillText(txt, 0, 9); g.restore();
        TD.conf.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.rot += 0.2; p.life -= 0.006; });
        TD.conf = TD.conf.filter(p => p.life > 0 && p.y < TD_H + 10);
        TD.conf.forEach(p => { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); });
        if (TD.flash > 0) { g.fillStyle = `rgba(255,255,255,${TD.flash * 0.5})`; g.fillRect(0, 0, TD_W, TD_H); TD.flash -= 0.06; }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
}
function tdRun() {
    if (isStageRunning) return;
    if (getActiveStudents().length === 0) return alert("No students in current class!");
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    tdPrepare();
    isStageRunning = true; stageTick = 0;
    document.getElementById('stageWinnerBanner').textContent = "🔥 Race in progress...";
    StudioAudioManager.playSFX('select');
    function loop() {
        if (!isStageRunning) return;
        // Game pace: run extra simulation steps per frame (speed > 1)
        let steps = 1;
        try { steps = Math.max(1, Math.round(ssGetPace())); } catch (e) {}
        for (let i = 0; i < steps && isStageRunning; i++) {
            stageTick++;
            drawStageFrame(false);
        }
        if (!isStageRunning) return;
        stageAnimFrame = requestAnimationFrame(loop);
    }
    stageAnimFrame = requestAnimationFrame(loop);
}
// ---- routing: mode 1 is now the top-down 2D race; 3D modes 5, 6, 12 unchanged ----
function ss3IsMode(m) { return [5, 6, 12].includes(m); }
(function tdWire() {
    const prevPrep = prepareStageEntities, prevTrig = triggerActiveStageAnimation, prevDraw = drawStageFrame, prevOpen = openGameStage, prevClose = closeGameStage;
    prepareStageEntities = function (m) { if (m === 1) { tdPrepare(); return; } prevPrep(m); };
    triggerActiveStageAnimation = function () { if (activeStageMode === 1) { tdRun(); return; } prevTrig(); };
    drawStageFrame = function (f) { if (activeStageMode === 1) { tdRender(); return; } prevDraw(f); };
    const resetCv = () => { const c = document.getElementById('stageCanvas'); if (c && c.width !== 1280) { c.width = 1280; c.height = 620; } };
    openGameStage = function (m) { if (m !== 1) resetCv(); return prevOpen(m); };
    closeGameStage = function () { const r = prevClose(); resetCv(); return r; };
    EIGHT_MODES.forEach(m => { if (m.id === 1) { m.title = "Gran Turismo Race"; m.sub = "Top-Down Track • Nitro • Engine Roar"; } });
})();

// ============================================================================
// v5 PPTX VIEWER FIX: robust fit-to-viewer + text wrapping/auto-fit inside boxes
// ============================================================================
(function pptxV5() {
    const st = document.createElement('style');
    st.textContent = `
    .presenter-grid { grid-template-columns: minmax(0, 1fr) 340px !important; }
    .presenter-stage-card { min-width: 0 !important; max-width: 100%; }
    .presenter-viewport { min-width: 0 !important; max-width: 100%; }
    #presenterContentSlot { max-width: 100%; }
    .pptx-abs-text { overflow: visible; white-space: normal !important; word-break: normal; overflow-wrap: anywhere; }
    .pptx-abs-text > div { max-width: 100%; }
    @media (max-width: 1100px) { .presenter-grid { grid-template-columns: minmax(0, 1fr) !important; } }`;
    document.head.appendChild(st);
    const prevRender = renderCurrentPptxSlide;
    function fitStage() {
        const slot = document.getElementById('presenterContentSlot'); if (!slot) return;
        const box = document.getElementById('presScaleBox'), stage = document.getElementById('presZoomTarget');
        if (!box || !stage) return;
        const vp = slot.parentElement, card = document.getElementById('presenterStageCard');
        const prevDisp = box.style.display; box.style.display = 'none';   // v16: measure the viewport without the slide inflating it
        const rect = vp.getBoundingClientRect();
        const full = !!document.fullscreenElement || (card && card.classList.contains('cssFs'));
        const cw = Math.min(vp.clientWidth || 9999, card ? card.clientWidth || 9999 : 9999, window.innerWidth);
        let ch = vp.clientHeight || 9999;
        box.style.display = prevDisp;
        if (!full) ch = Math.min(ch, Math.max(240, window.innerHeight - Math.max(0, rect.top) - 16));
        const pad = full ? 12 : 24;
        const baseW = 1280, baseH = Math.round(baseW / pptxSlideAspect);
        const availW = Math.max(160, cw - pad * 2), availH = Math.max(120, ch - pad * 2);
        const fit = Math.min(availW / baseW, availH / baseH);
        const sc = Math.max(0.05, fit * currentPresZoom);
        box.style.width = Math.round(baseW * sc) + 'px'; box.style.height = Math.round(baseH * sc) + 'px';
        stage.style.transform = `scale(${sc})`; stage.style.transformOrigin = '0 0';
        box.style.margin = '0 auto';
    }
    function shrinkText() {
        const stage = document.getElementById('presZoomTarget'); if (!stage) return;
        stage.querySelectorAll('.pptx-abs-text').forEach(t => {
            const inner = t.firstElementChild; if (!inner) return;
            inner.style.zoom = ''; inner.style.width = ''; inner.style.maxWidth = 'none';
            const stH = stage.offsetHeight; const mh = parseFloat(t.style.minHeight) || 0;
            const boxH = mh ? Math.max(20, stH * mh / 100) : t.clientHeight;
            const ssc = stage.getBoundingClientRect().width / stage.offsetWidth || 1;
            const over = () => inner.getBoundingClientRect().height / ssc > boxH * 1.04 + 4;
            if (!over()) return;
            let lo = 0.3, hi = 1;
            for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; inner.style.zoom = mid; inner.style.width = (100 / mid) + '%'; if (over()) hi = mid; else lo = mid; }
            inner.style.zoom = lo; inner.style.width = (100 / lo) + '%';   // v16: widen the zoomed block so centered/right text isn't pushed sideways
        });
    }
    function clampBoxes() {
        const stage = document.getElementById('presZoomTarget'); if (!stage) return;
        const W = stage.offsetWidth, H = stage.offsetHeight;
        stage.querySelectorAll('.pptx-abs-text').forEach(t => {
            if (t.offsetLeft + t.offsetWidth > W + 1 && t.offsetLeft >= 0) t.style.width = Math.max(40, W - t.offsetLeft) + 'px';
        });
    }
    renderCurrentPptxSlide = function () {
        prevRender();
        try { fitStage(); clampBoxes(); shrinkText(); } catch (e) { console.error('pptxV5', e); }
    };
    if (window.ResizeObserver) {
        const vp = document.querySelector('.presenter-viewport');
        if (vp) { let rafId = 0; new ResizeObserver(() => { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; if (typeof currentMediaType !== 'undefined' && currentMediaType === 'pptx' && parsedPptxSlides.length) { try { fitStage(); } catch (e) {} } }); }).observe(vp); }
    }
})();

