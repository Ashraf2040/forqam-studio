
// ============================================================================
// SMART STUDIO v9 — per-game Players panel (select who plays / reset names)
// ============================================================================
const SS9 = { open: false, bypass: false, panel: null };
(function ss9Players() {
    const _gas = getActiveStudents;
    getActiveStudents = function () {
        const all = _gas();
        if (!SS9.open || SS9.bypass) return all;
        const ex = ss9Excluded();
        return ex.length ? all.filter(n => !ex.includes(n)) : all;
    };
    const _urb = updateRemainingBadge;
    updateRemainingBadge = function () { SS9.bypass = true; try { _urb(); } finally { SS9.bypass = false; } };
    const _open = openGameStage, _close = closeGameStage;
    openGameStage = function (m) { SS9.open = true; _open(m); ss9PlayersLabel(); };
    closeGameStage = function () { SS9.open = false; ss9ClosePanel(); _close(); };
    // button in the stage top bar
    const right = document.querySelector('#gameStageModal .stage-top-bar > div:last-child');
    if (right) {
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'ss9PlayersBtn';
        b.style.cssText = 'background:rgba(255,255,255,0.14); color:white; border:1px solid rgba(255,255,255,0.3); padding:7px 12px; border-radius:10px; font-weight:800; font-size:12px; cursor:pointer;';
        b.onclick = ss9TogglePanel;
        b.innerHTML = '👥 Players';
        right.insertBefore(b, right.firstChild);
    }
    const st = document.createElement('style');
    st.textContent = `
    #ss9Panel{position:fixed;inset:0;z-index:200000;background:rgba(2,6,23,.62);display:none;align-items:center;justify-content:center;}
    #ss9Panel .box{width:min(860px,94vw);max-height:88vh;overflow:auto;background:#0f172a;border:1.5px solid #38bdf8;border-radius:22px;padding:20px 22px;color:#e2e8f0;box-shadow:0 30px 80px rgba(0,0,0,.6);font-family:"Plus Jakarta Sans",sans-serif;}
    #ss9Panel h3{margin:0 0 4px 0;font-size:20px;font-weight:900;color:#fff}
    #ss9Panel .sub{font-size:13px;color:#94a3b8;margin-bottom:12px}
    #ss9Panel .row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
    #ss9Panel .btn{border:none;border-radius:11px;padding:9px 14px;font-weight:800;font-size:13px;cursor:pointer;color:#fff;background:#334155}
    #ss9Panel .btn.go{background:linear-gradient(135deg,#10b981,#059669)}
    #ss9Panel .btn.warn{background:#b45309}
    #ss9Panel .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
    #ss9Panel .chip{padding:10px 12px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;user-select:none;border:2px solid #10b981;background:rgba(16,185,129,.16);color:#d1fae5;display:flex;gap:8px;align-items:center}
    #ss9Panel .chip.off{border-color:#475569;background:#1e293b;color:#64748b;text-decoration:line-through}
    #ss9Panel .cnt{font-weight:900;color:#fde047;font-size:14px}
    `;
    document.head.appendChild(st);
})();
function ss9Key() { return (appState.currentClass || '') + '|' + activeStageMode; }
function ss9Excluded() {
    if (!appState.playersOff) appState.playersOff = {};
    return appState.playersOff[ss9Key()] || [];
}
function ss9AllNames() { SS9.bypass = true; try { return getActiveStudents().slice(); } finally { SS9.bypass = false; } }
function ss9PlayersLabel() {
    const b = document.getElementById('ss9PlayersBtn');
    if (!b) return;
    const all = ss9AllNames(), ex = ss9Excluded().filter(n => all.includes(n));
    b.innerHTML = '👥 Players ' + (all.length - ex.length) + '/' + all.length;
}
function ss9TogglePanel() {
    if (isStageRunning) { showToast('Wait for the round to finish, then change players'); return; }
    if (SS9.panel && SS9.panel.style.display === 'flex') { ss9ClosePanel(true); return; }
    ss9OpenPanel();
}
function ss9OpenPanel() {
    if (!SS9.panel) {
        SS9.panel = document.createElement('div'); SS9.panel.id = 'ss9Panel';
        document.body.appendChild(SS9.panel);
    }
    SS9.panel.style.display = 'flex';
    ss9RenderPanel();
}
function ss9RenderPanel() {
    const all = ss9AllNames(), ex = ss9Excluded();
    const modeObj = EIGHT_MODES.find(m => m.id === activeStageMode) || {};
    const playing = all.filter(n => !ex.includes(n)).length;
    SS9.panel.innerHTML = `<div class="box">
      <h3>👥 Who is playing in: ${modeObj.title || 'this game'}</h3>
      <div class="sub">Tap a name to include or exclude it from <b>this game only</b>. The class roster does not change.</div>
      <div class="row">
        <span class="cnt">${playing} of ${all.length} playing</span>
        <button class="btn" onclick="ss9SelAll(true)">Select all</button>
        <button class="btn" onclick="ss9SelAll(false)">Clear all</button>
        <button class="btn warn" onclick="ss9ResetNames()">↺ Reset names (everyone back in)</button>
        <button class="btn go" onclick="ss9ClosePanel(true)">Done ✔</button>
      </div>
      <div class="grid">${all.map(n => `<div class="chip ${ex.includes(n) ? 'off' : ''}" data-n="${encodeURIComponent(n)}" onclick="ss9Toggle(this)"><span>${ex.includes(n) ? '⬜' : '✅'}</span>${n.replace(/</g, '&lt;')}</div>`).join('')}</div>
    </div>`;
}
function ss9Save(ex) {
    if (!appState.playersOff) appState.playersOff = {};
    appState.playersOff[ss9Key()] = ex;
    try { syncStudioData(); } catch (e) {}
}
function ss9Toggle(el) {
    const n = decodeURIComponent(el.dataset.n), ex = ss9Excluded().slice();
    const i = ex.indexOf(n); if (i >= 0) ex.splice(i, 1); else ex.push(n);
    ss9Save(ex); ss9RenderPanel(); ss9PlayersLabel();
}
function ss9SelAll(on) { ss9Save(on ? [] : ss9AllNames()); ss9RenderPanel(); ss9PlayersLabel(); }
function ss9ResetNames() {
    ss9Save([]);
    if (!appState.pickedByClass) appState.pickedByClass = {};
    appState.pickedByClass[appState.currentClass] = [];
    ss9RenderPanel(); ss9PlayersLabel();
    try { updateRemainingBadge(); } catch (e) {}
    showToast('↺ Names reset: everyone is back in this game');
}
function ss9ClosePanel(apply) {
    if (SS9.panel) SS9.panel.style.display = 'none';
    if (apply === true && SS9.open) { openGameStage(activeStageMode); }
}

// ============================================================================
// v9 PRIZE CLAW MACHINE — gantry, hinged 3-finger grip, swing, release, chute physics
// ============================================================================
const clv9 = { sx: 0, sz: 0, svx: 0, svz: 0, px: 0, pz: 0, ball: null, rail: null, tray: null };
function ss9ClawBin(scene) {
    const wallMat = new THREE.MeshPhongMaterial({ color: 0x0b3a5a, transparent: true, opacity: 0.55, shininess: 90 });
    const metal = new THREE.MeshPhongMaterial({ color: 0x1e3a52, shininess: 80 });
    const gold = new THREE.MeshPhongMaterial({ color: 0xffd75e, emissive: 0x6b4f00, shininess: 120 });
    const X = -4.1, Z = 2.7;
    // sloped floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 3.4), metal);
    floor.position.set(X, 0.5, Z); floor.rotation.x = 0.2; scene.add(floor);
    [[-1.3, 0.15, 3.3, 0], [1.3, 0.15, 3.3, 0]].forEach(([dx, w, d]) => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), wallMat); w1.position.set(X + dx, 1.2, Z - 0.1); scene.add(w1);
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.6, 0.15), wallMat); back.position.set(X, 1.25, Z - 1.7); scene.add(back);
    // exit tray outside the glass
    const tray = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 1.7), gold); tray.position.set(X, 0.16, 5.0); scene.add(tray);
    const rimF = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 0.14), gold); rimF.position.set(X, 0.45, 5.85); scene.add(rimF);
    [-1.3, 1.3].forEach(dx => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 1.7), gold); r.position.set(X + dx, 0.45, 5.0); scene.add(r); });
    // little door flap hint at the glass line
    const flap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.08), new THREE.MeshPhongMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.3 }));
    flap.position.set(X, 0.9, 3.82); scene.add(flap);
    const lbl = ss3TextSprite('PRIZE', { bg: 'rgba(8,47,73,0.95)', fg: '#7dd3fc', border: '#38bdf8', height: 0.6, fontSize: 40 });
    lbl.position.set(X, 2.35, 3.0); scene.add(lbl);
    const glow = new THREE.PointLight(0xffd75e, 0, 9); glow.position.set(X, 1.4, 4.4); scene.add(glow);
    clV3.chuteGlow = glow;
}
function ss9BuildClawFingers(claw) {
    // hinged fingers: upper arm + forearm, closes around a ball of radius 0.62
    claw.userData.fingers = [];
    const fm = new THREE.MeshPhongMaterial({ color: 0xf1f5f9, shininess: 190, specular: 0xffffff });
    const pm = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 60 });
    for (let k = 0; k < 3; k++) {
        const pivot = new THREE.Group(); pivot.rotation.y = k * Math.PI * 2 / 3;
        const sh = new THREE.Group(); sh.position.set(0.3, 0, 0); pivot.add(sh);
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.8, 10), fm); up.position.set(0, -0.4, 0); sh.add(up);
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), pm); knee.position.set(0, -0.8, 0); sh.add(knee);
        const el = new THREE.Group(); el.position.set(0, -0.8, 0); sh.add(el);
        const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.97, 10), fm); lo.position.set(0, -0.485, 0); el.add(lo);
        const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshPhongMaterial({ color: 0xef4444, shininess: 40 })); pad.position.set(0, -0.97, 0); el.add(pad);
        claw.add(pivot); claw.userData.fingers.push({ sh, el });
    }
}
function ss9ClawFingerPose(c) { // c: 0 open .. 1 closed
    const r = Math.PI / 180;
    const phi1 = (45 - 17 * c) * r;             // upper arm angle from vertical (outward)
    const phi2 = (-8 + 20 * c) * r;             // forearm inward angle
    clV3.claw.userData.fingers.forEach(f => { f.sh.rotation.z = phi1; f.el.rotation.z = -phi2 - phi1; });
}
function ss9ClawPose(x, z, y, c) {
    // gantry bridge (z) + carriage (x); claw hangs on the cable with a damped swing
    clv9.px = x; clv9.pz = z;
    clv9.rail.position.z = z; clV3.carriage.position.set(x, 7.25, z);
    const hx = x + clv9.sx, hz = z + clv9.sz;
    clV3.claw.position.set(hx, y, hz);
    clV3.claw.rotation.z = -clv9.sx * 0.12; clV3.claw.rotation.x = clv9.sz * 0.12;
    const A = new THREE.Vector3(x, 6.95, z), B = new THREE.Vector3(hx, y + 0.3, hz);
    const d = B.clone().sub(A), len = Math.max(0.05, d.length());
    clV3.cable.position.copy(A.clone().add(B).multiplyScalar(0.5));
    clV3.cable.scale.set(1, len, 1);
    clV3.cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    ss9ClawFingerPose(c);
}
function ss9Swing(dvx, dvz) { // pendulum update: acceleration of the carriage pushes the claw
    clv9.svx += -dvx * 0.55 - clv9.sx * 0.04 - clv9.svx * 0.05;
    clv9.svz += -dvz * 0.55 - clv9.sz * 0.04 - clv9.svz * 0.05;
    clv9.sx += clv9.svx; clv9.sz += clv9.svz;
}
function ss9Ease(p) { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); }
function ss9ClawStep() {
    const g = ssG, t = stageTick, cap = clV3.caps[g.winnerIdx];
    if (!cap) return;
    const R = 0.62, HANG = 1.25;
    const tx = cap.userData.baseX, tz = cap.userData.baseZ, ty = cap.userData.baseY;
    const BX = -4.1, BZ = 2.7, REL_Y = 4.7;
    if (!g.v9) { g.v9 = { sx0: clv9.px, sz0: clv9.pz, y0: 6.3, c: 0, vy: 0, vz: 0, bounces: 0, settled: false, x: 0, z: 0 }; clv9.sx = clv9.sz = clv9.svx = clv9.svz = 0; }
    const v = g.v9, ox = clv9.px, oz = clv9.pz;
    let x = clv9.px, z = clv9.pz, y = clV3.claw.position.y, c = v.c;
    if (t === 2) StudioAudioManager.playServoSound(700);
    if (t < 55) {                                   // 1. gantry travels over the prize
        const e = ss9Ease(t / 55); x = v.sx0 + (tx - v.sx0) * e; z = v.sz0 + (tz - v.sz0) * e; y = 6.3; c = 0;
    } else if (t < 120) {                           // 2. cable lowers the open claw
        if (t === 55) StudioAudioManager.playServoSound(800);
        const e = ss9Ease((t - 55) / 65); y = 6.3 - e * (6.3 - (ty + HANG)); x = tx; z = tz; c = 0;
    } else if (t < 152) {                           // 3. fingers close around the capsule
        c = ss9Ease((t - 120) / 32); y = ty + HANG; x = tx; z = tz;
        if (t === 150) { g.grabbed = true; StudioAudioManager.playSFX('pop'); }
    } else if (t < 168) {                           // 4. squeeze, small settle
        c = 1; y = ty + HANG + Math.sin((t - 152) / 16 * Math.PI) * 0.06; x = tx; z = tz;
    } else if (t < 228) {                           // 5. lift
        if (t === 168) StudioAudioManager.playServoSound(900);
        const e = ss9Ease((t - 168) / 60); y = ty + HANG + e * (REL_Y - HANG - ty + 0.4); x = tx; z = tz; c = 1;
    } else if (t < 318) {                           // 6. carry to the prize chute
        if (t === 228) StudioAudioManager.playServoSound(900);
        const e = ss9Ease((t - 228) / 90); x = tx + (BX - tx) * e; z = tz + (BZ - tz) * e; y = REL_Y + 0.4; c = 1;
    } else if (t < 338) {                           // 7. hang still over the chute
        x = BX; z = BZ; y = REL_Y + 0.4; c = 1;
    } else if (t < 358) {                           // 8. open the fingers: capsule is released
        x = BX; z = BZ; y = REL_Y + 0.4; c = 1 - ss9Ease((t - 338) / 20);
        if (t === 346 && g.grabbed) {
            g.grabbed = false; g.dropped = true; v.vy = 0; v.vz = 0; v.x = BX; v.z = BZ;
            cap.position.set(BX + clv9.sx, y - HANG, BZ + clv9.sz); v.px = cap.position.x; v.pz = cap.position.z;
            StudioAudioManager.playSFX('pop');
        }
    } else { x = BX; z = BZ; y = Math.min(6.3, REL_Y + 0.4 + ss9Ease((t - 358) / 50) * 1.4); c = 0; }
    ss9Swing(x - ox, z - oz);
    ss9ClawPose(x, z, y, c); v.c = c;
    // held capsule hangs inside the fingers and swings with the claw
    if (g.grabbed) {
        cap.position.set(clV3.claw.position.x, clV3.claw.position.y - HANG, clV3.claw.position.z);
        cap.rotation.z = -clv9.sx * 0.18; cap.rotation.x = clv9.sz * 0.18;
    }
    // free fall + bounces + roll down the slope into the tray
    if (g.dropped) {
        const slope = 0.2, G = 0.024;
        v.vy -= G; cap.position.y += v.vy;
        const zz = cap.position.z;
        const floorTop = (zz < 4.05) ? (0.5 + (2.7 - zz) * -0.0 + 0.09 - (zz - 2.7) * 0.2) : 0.26;
        const rest = floorTop + R * (zz < 4.05 ? 1 / Math.cos(slope) : 1);
        if (cap.position.y <= rest) {
            cap.position.y = rest;
            if (Math.abs(v.vy) > 0.05 && v.bounces < 3) {
                v.vy = -v.vy * 0.42; v.bounces++; StudioAudioManager.playSFX('click');
                cap.rotation.z += (Math.random() - 0.5) * 0.4;
            } else v.vy = 0;
            if (zz < 4.05) v.vz += 0.0045; else v.vz *= 0.93;   // roll down the slope, then slow in the tray
            if (v.bounces >= 2 || v.vy === 0) v.vz = Math.min(0.2, v.vz);
            cap.position.z = Math.min(5.15, zz + v.vz);
            cap.rotation.x += v.vz / R;
            if (zz >= 5.15) v.vz = 0;
            if (v.vz > 0.2) v.vz = 0.2;
            if (cap.position.z >= 4.6 && Math.abs(v.vz) < 0.012 && !v.settled && v.vy === 0) {
                v.settled = true; v.settleT = t;
                clV3.chuteGlow.intensity = 3;
                clV3.namePop = ss3TextSprite('🏆 ' + g.names[g.winnerIdx], { bg: 'rgba(120,53,15,0.94)', fg: '#ffe27a', border: '#ffd75e', height: 1.6, fontSize: 54 });
                clV3.namePop.position.set(BX, 2.8, 4.9); S3.scene.add(clV3.namePop);
                StudioAudioManager.playChimeSound();
            }
        }
    }
    if (v.settled && t >= v.settleT + 55 && !g.crowned) {
        g.crowned = true;
        ssCrownWinner(g.names[g.winnerIdx], '🕹️', 'CLAW MACHINE WINNER', `🕹️ Claw grabbed: ${g.names[g.winnerIdx]}!`);
    }
    if (t > 900 && !g.crowned) { g.crowned = true; ssCrownWinner(g.names[g.winnerIdx], '🕹️', 'CLAW MACHINE WINNER', `🕹️ Claw grabbed: ${g.names[g.winnerIdx]}!`); }
}
function ss9ClawRender() {
    const tm = ssTm();
    clV3.bulbs.forEach((b, i) => { b.material.color.setHex(((Math.floor(tm * 0.12) + i) % 2 === 0) ? 0xffe27a : 0x8a6d1f); });
    clV3.caps.forEach((cp, i) => {
        if (cp === clV3.caps[ssG.winnerIdx] && (ssG.grabbed || ssG.dropped || (ssG.v9 && stageTick > 100))) return;
        if (!isStageRunning) cp.position.y = cp.userData.baseY + Math.sin(tm * 0.05 + i * 1.4) * 0.04;
    });
    if (clV3.namePop) clV3.namePop.position.y = 2.8 + Math.sin(tm * 0.06) * 0.15;
    if (clV3.chuteGlow.intensity > 0) clV3.chuteGlow.intensity *= 0.985;
    if (!isStageRunning && !ssG.v9) { // idle patrol of the gantry
        const px = Math.sin(tm * 0.015) * 2.4, pz = Math.sin(tm * 0.011) * 1.2 - 0.6;
        const ox = clv9.px, oz = clv9.pz;
        ss9Swing(px - ox, pz - oz); ss9ClawPose(px, pz, 6.3 + Math.sin(tm * 0.02) * 0.08, 0);
    }
    S3.camera.position.x = Math.sin(tm * 0.006) * 0.9;
    S3.camera.position.z = 14.6; S3.camera.position.y = 5.3;
    S3.camera.lookAt(0, 4.2, 0);
    if (window.__cam) { S3.camera.position.set(...window.__cam.p()); S3.camera.lookAt(...window.__cam.l()); }
    S3.renderer.render(S3.scene, S3.camera);
}

function ss9BuildClawScene() {
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
    ss9ClawBin(scene);
    // rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(10, 0.28, 0.5), new THREE.MeshPhongMaterial({ color: 0x64748b, shininess: 110 }));
    rail.position.set(0, 7.6, 0); scene.add(rail); clv9.rail = rail;
    // carriage + cable + claw
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.6, 0.95), new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 130 }));
    carriage.position.set(0, 7.25, 0); carriage.castShadow = true; scene.add(carriage);
    clV3.carriage = carriage;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), new THREE.MeshPhongMaterial({ color: 0xdbe4ec }));
    scene.add(cable); clV3.cable = cable;
    const claw = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshPhongMaterial({ color: 0xe2e8f0, shininess: 170, specular: 0xffffff }));
    claw.add(hub);
    ss9BuildClawFingers(claw);
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
    clv9.px = 0; clv9.pz = 0; clv9.sx = clv9.sz = clv9.svx = clv9.svz = 0; ss9ClawPose(0, -0.6, 6.3, 0);
}

function ss9FishStep() {
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
            b.state = 'hooked'; g.fishOn = true; g.rodBend = 1; g.rodJit = -14; g.fight = null;
            fish.y = waterY + 30;
            StudioAudioManager.playSplashSound(true);
            StudioAudioManager.playReelSound();
            g.ripples.push({ x: b.x, y: waterY, r: 8, a: 1 });
            for (let i = 0; i < 22; i++) g.parts.push({ x: b.x, y: waterY, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5, life: 1, color: '#bae6fd' });
        }
    } else if (b.state === 'hooked') {
        // ---- v9: realistic fight: runs, rests, head-shakes, one leap, line tension ----
        const F = g.fight || (g.fight = { ft: 0, dist0: Math.max(140, b.x - 300), dist: Math.max(140, b.x - 300), depth: 150, jumpT: -1, jumped: false, tension: 0.6, reel: 0 });
        F.ft++;
        const CYC = 72, RUN = 22, RUNLEN = 40;
        const cyc = F.ft % CYC;
        const prog = 1 - F.dist / F.dist0;
        const net = F.dist0 / 2.6;
        const reelRate = (net + RUNLEN) / (CYC - RUN);
        let tension, shake = 0;
        if (F.jumpT >= 0) {                                  // leap out of the water
            F.jumpT++;
            const p = F.jumpT / 40;
            fish.y = waterY - Math.sin(Math.min(1, p) * Math.PI) * 92;
            fish.rot = -0.9 + p * 1.8;
            tension = 0.12;
            if (F.jumpT === 1) { StudioAudioManager.playSplashSound(true); for (let i = 0; i < 18; i++) g.parts.push({ x: fish.x - 30, y: waterY, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, life: 1, color: '#e0f2fe' }); g.ripples.push({ x: fish.x - 30, y: waterY, r: 8, a: 1 }); }
            if (F.jumpT >= 40) { F.jumpT = -1; StudioAudioManager.playSplashSound(true); g.ripples.push({ x: fish.x - 30, y: waterY, r: 8, a: 1 }); for (let i = 0; i < 18; i++) g.parts.push({ x: fish.x - 30, y: waterY, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, life: 1, color: '#e0f2fe' }); }
            F.dist += 0.4;
        } else {
            if (cyc < RUN) {                                // fish runs away: line peels off, rod bends hard
                const s = Math.sin(cyc / RUN * Math.PI);
                F.dist += (RUNLEN / RUN) * 1.55 * s;
                tension = 0.7 + 0.3 * s;
                F.reel = 0.25;
                if (cyc === 1) { StudioAudioManager.playReelSound(); }
                shake = 0.5;
            } else {                                         // fish tires: angler reels in against head-shakes
                const u = (cyc - RUN) / (CYC - RUN);
                F.dist -= reelRate * (0.9 + 0.1 * Math.sin(u * Math.PI)) ;
                tension = 0.46 + 0.16 * Math.sin(F.ft * 0.5) ;
                F.reel = 1;
                shake = 1 - prog * 0.5;
                if (F.ft % 9 === 0) StudioAudioManager.playReelSound();
            }
            if (!F.jumped && prog > 0.38 && cyc === RUN + 2) { F.jumped = true; F.jumpT = 0; }
            const depthT = 30 + (1 - prog) * 120;
            F.depth += (depthT + Math.sin(F.ft * 0.21) * 6 * (1 - prog * 0.6) - F.depth) * 0.08;
            fish.y = waterY + F.depth;
            fish.rot = Math.sin(F.ft * 0.85) * 0.32 * shake;
        }
        F.dist = Math.max(0, F.dist);
        F.tension += (tension - F.tension) * 0.25;
        g.tension = F.tension;
        const mx = 300 + F.dist;
        fish.x = mx + 34; fish.dir = -1; fish.wiggle = 1.5 + shake * 2;
        F.mouth = { x: mx, y: fish.y };
        g.mouth = F.mouth;
        // bobber rides the line where it crosses the surface
        const tipX = 268, tipY = waterY - 96 + g.rodBend * 34;
        const k = (waterY - tipY) / Math.max(1, F.mouth.y - tipY);
        b.x = tipX + (mx - tipX) * Math.min(1, Math.max(0, k)); b.y = waterY + 2;
        g.rodBend = 0.35 + F.tension * 0.65;
        g.rodJit = Math.sin(F.ft * 1.3) * 3 * shake * F.tension;
        g.reelAng = (g.reelAng || 0) + F.reel * 0.55 + (F.reel < 1 ? -0.0 : 0);
        if (F.ft % 11 === 0 && F.jumpT < 0) g.ripples.push({ x: mx, y: waterY, r: 5, a: 0.55 });
        if (F.dist < 30 && F.jumpT < 0) { b.state = 'lifting'; g.liftT = 0; g.liftFrom = { x: F.mouth.x, y: F.mouth.y }; StudioAudioManager.playSplashSound(true); }
    } else if (b.state === 'lifting') {
        g.liftT++;
        const p = Math.min(1, g.liftT / 70);
        const e = p * p * (3 - 2 * p);
        const tipX = 268, tipY = waterY - 96 + g.rodBend * 34;
        const endX = tipX + 18, endY = tipY + 70;                 // fish dangles from the rod tip
        const mx = g.liftFrom.x + (endX - g.liftFrom.x) * e;
        const my = g.liftFrom.y + (endY - g.liftFrom.y) * e - Math.sin(e * Math.PI) * 26;
        const sw = Math.sin(g.liftT * 0.33) * (1 - e * 0.5) * 12;
        g.mouth = { x: mx + sw * e, y: my };
        fish.x = g.mouth.x; fish.y = g.mouth.y + 36; fish.dir = -1; fish.wiggle = 3.2; fish.rot = 0;
        fish.hang = e;
        g.tension = 0.8; g.rodBend = 0.8 - e * 0.35; g.rodJit = 0;
        b.x = mx; b.y = waterY - 400;                              // bobber out of view
        if (g.liftT % 4 === 0 && my < waterY) g.parts.push({ x: fish.x + (Math.random() - 0.5) * 18, y: fish.y + 8, vx: (Math.random() - 0.5) * 1.2, vy: 0.5, life: 0.8, color: '#e0f2fe' });
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

function ss9DrawFish(ctx, f, tm, outOfWater) {
    const wig = Math.sin(tm * (0.3 + f.wiggle * 0.14) + f.ph) * (4 + f.wiggle * 2.5);
    const fy = f.y + ((outOfWater || f.rot !== undefined && f === ssG.items[ssG.winnerIdx] && ssG.fishOn) ? 0 : Math.sin(tm * 0.06 + f.ph) * 5);
    const dir = f.dir >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(f.x, fy);
    if (outOfWater) { ctx.scale(-1, 1); ctx.rotate(-1.2 + Math.sin(tm * 0.42) * 0.3); }
    else { ctx.scale(dir, 1); if (f.rot) ctx.rotate(f.rot * dir * -1); }
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
function ss9DrawFishingV3(ctx, W, H) {
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
        const fy = ss9DrawFish(ctx, f, tm, hooked && g.bobber.state === 'lifting' && (f.hang||0) > 0.35);
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
    const bend = (g.rodBend || 0) * 34 + (g.rodJit || 0);
    const base = { x: boatX + 40, y: waterY - 48 }, tip = { x: 268, y: waterY - 96 + bend };
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + 60, base.y - 40 + bend * 0.6, tip.x, tip.y); ctx.stroke();
    // arm
    ctx.strokeStyle = '#fcd9b8'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(boatX + 22, waterY - 44); ctx.lineTo(base.x + 6, base.y - 2); ctx.stroke();
    // fishing line with tension: slack = sagging curve, taut = straight with a faint hum
    const b = g.bobber;
    if (b.state !== 'held') {
        const tension = (b.state === 'hooked' || b.state === 'lifting') ? (g.tension || 0.6) : 0.15;
        let ex = b.x, ey = b.y;
        if ((b.state === 'hooked' || b.state === 'lifting') && g.mouth) { ex = g.mouth.x; ey = g.mouth.y; }
        ctx.strokeStyle = 'rgba(241,245,249,0.92)'; ctx.lineWidth = 1.2 + tension * 0.9;
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
        const sag = (1 - tension) * 44, hum = Math.sin(tm * 1.1) * 1.6 * tension * tension;
        ctx.quadraticCurveTo((tip.x + ex) / 2, (tip.y + ey) / 2 + sag + hum, ex, ey);
        ctx.stroke();
        // line goes into the water to the fish when hooked
    }
    // reel handle spins while reeling
    { const rx = boatX + 52, ry = waterY - 47, ang = g.reelAng || 0;
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(ang) * 11, ry + Math.sin(ang) * 11); ctx.stroke();
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(rx + Math.cos(ang) * 11, ry + Math.sin(ang) * 11, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // bobber
    if (b.state === 'floating' || b.state === 'hooked' || b.state === 'flying') {
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

// ============================================================================
// v9 SPACE ROCKET RACE — calm, realistic launch-to-orbit scene (mode id 11)
// ============================================================================
const RK = { stars: null };
function ss9RocketInit() {
    if (RK.stars) return;
    let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    RK.stars = [];
    for (let i = 0; i < 260; i++) RK.stars.push({ x: rnd() * 1280, y: rnd() * 2400, r: 0.4 + rnd() * 1.5, l: i % 3, ph: rnd() * 6.28, a: 0.35 + rnd() * 0.65 });
}
function ss9RocketPrepare(modeId) {
    ss9RocketInit();
    const pool = ssShuffleArr(getUnpickedPool(2));
    const names = pool.slice(0, Math.min(6, pool.length));
    const cols = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];
    const n = names.length, W = 1280;
    const winnerIdx = Math.floor(Math.random() * n);
    const Tw = 560;
    ssG = { mode: 11, names, winnerIdx, phase: 'idle', parts: [], smoke: [], cam: 0, track: 3200, finishT: -1 };
    ssG.items = names.map((nm, i) => ({
        name: nm, color: cols[i % cols.length], ph: i * 1.7,
        x: 130 + i * (n > 1 ? (900 / (n - 1)) : 0),
        a: 1.28 + Math.random() * 0.4, T: i === winnerIdx ? Tw : Tw + 40 + Math.random() * 90, p: 0, pad: true, crossed: false
    }));
    ssG.items[winnerIdx].a = 1.45;
}
function ss9RocketStep() {
    const g = ssG, t = stageTick, W = 1280, H = 620;
    const LAUNCH = 120;
    if (t < LAUNCH) {
        const sec = Math.ceil((LAUNCH - t) / 40);
        if (t % 40 === 1) StudioAudioManager.playSFX('click');
        g.count = (t < LAUNCH - 2) ? sec : 0;
        // ignition smoke on the pad in the last second
        if (t > LAUNCH - 50) g.items.forEach(r => { if (t % 2 === 0) g.smoke.push({ x: r.x + (Math.random() - 0.5) * 20, w: 0, y: 0, vx: (Math.random() - 0.5) * 1.4, r: 8, a: 0.55, grow: 0.9, life: 1 }); });
        g.thrust = Math.max(0, (t - (LAUNCH - 50)) / 50);
    } else {
        if (t === LAUNCH) { StudioAudioManager.playSFX('whoosh'); g.count = -1; }
        const tau = t - LAUNCH;
        g.thrust = 1;
        let lead = 0, wi = g.items[g.winnerIdx];
        g.items.forEach((r, i) => {
            const u = tau / r.T;
            r.p = u <= 1 ? Math.pow(u, r.a) : 1 + (u - 1) * r.a * 0.9;
            r.p = Math.min(r.p, 1.12);
            lead = Math.max(lead, r.p);
            if (!r.crossed && r.p >= 1) { r.crossed = true; if (i === g.winnerIdx) { g.finishT = t; StudioAudioManager.playSFX('select'); } }
        });
        g.lead = lead;
        // exhaust smoke: thick in the atmosphere, almost none in space
        const alt = lead;
        g.items.forEach(r => {
            if (r.p > 0 && alt < 0.55 && t % 2 === 0) g.smoke.push({ x: r.x, w: r.p * g.track - 6, vx: (Math.random() - 0.5) * 0.4, r: 6, a: 0.5 * (1 - alt / 0.55), grow: 0.55, life: 1, world: true });
        });
    }
    g.smoke.forEach(s => { s.life -= 0.012; s.r += s.grow; s.x += s.vx; });
    g.smoke = g.smoke.filter(s => s.life > 0);
    const camTarget = (g.lead || 0) * g.track - 175;
    g.cam += (Math.max(0, camTarget) - g.cam) * 0.1;
    if (g.finishT >= 0 && t >= g.finishT + 100 && !g.crowned) {
        g.crowned = true;
        ssCrownWinner(g.names[g.winnerIdx], '🚀', 'ROCKET RACE CHAMPION', `🚀 First through the orbit gate: ${g.names[g.winnerIdx]}!`);
    }
}
function ss9DrawRocketShape(ctx, r, thrust, tm, finished) {
    const col = r.color;
    ctx.save();
    // flame (three layers, smooth flicker)
    if (thrust > 0.02) {
        const fl = (46 + 36 * thrust + Math.sin(tm * 0.9 + r.ph) * 5) * thrust;
        const gradO = ctx.createLinearGradient(0, 44, 0, 44 + fl);
        gradO.addColorStop(0, 'rgba(255,200,80,0.95)'); gradO.addColorStop(0.5, 'rgba(255,110,30,0.6)'); gradO.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = gradO;
        ctx.beginPath(); ctx.moveTo(-11, 44); ctx.quadraticCurveTo(-13, 44 + fl * 0.55, 0, 44 + fl); ctx.quadraticCurveTo(13, 44 + fl * 0.55, 11, 44); ctx.closePath(); ctx.fill();
        const gradM = ctx.createLinearGradient(0, 44, 0, 44 + fl * 0.7);
        gradM.addColorStop(0, 'rgba(255,245,170,1)'); gradM.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = gradM;
        ctx.beginPath(); ctx.moveTo(-6.5, 44); ctx.quadraticCurveTo(-7, 44 + fl * 0.4, 0, 44 + fl * 0.7); ctx.quadraticCurveTo(7, 44 + fl * 0.4, 6.5, 44); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.ellipse(0, 48, 3.2, 8 * thrust, 0, 0, Math.PI * 2); ctx.fill();
    }
    // side boosters / fins
    [-1, 1].forEach(sd => {
        ctx.fillStyle = ssHexCol(col, 0.85);
        ctx.beginPath(); ctx.moveTo(sd * 15, 8); ctx.lineTo(sd * 33, 46); ctx.lineTo(sd * 33, 52); ctx.lineTo(sd * 15, 36); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.moveTo(sd * 15, 20); ctx.lineTo(sd * 33, 50); ctx.lineTo(sd * 33, 52); ctx.lineTo(sd * 15, 36); ctx.closePath(); ctx.fill();
    });
    // nozzle
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.moveTo(-9, 38); ctx.lineTo(9, 38); ctx.lineTo(12, 47); ctx.lineTo(-12, 47); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.fillRect(-10, 36, 20, 3);
    // fuselage
    const gb = ctx.createLinearGradient(-16, 0, 16, 0);
    gb.addColorStop(0, '#cbd5e1'); gb.addColorStop(0.3, '#ffffff'); gb.addColorStop(0.7, '#e2e8f0'); gb.addColorStop(1, '#94a3b8');
    ctx.fillStyle = gb;
    ctx.beginPath(); ctx.moveTo(-16, 38); ctx.lineTo(-16, -20); ctx.quadraticCurveTo(-16, -52, 0, -70); ctx.quadraticCurveTo(16, -52, 16, -20); ctx.lineTo(16, 38); ctx.closePath(); ctx.fill();
    // nose cone (team colour)
    const gn = ctx.createLinearGradient(-16, 0, 16, 0);
    gn.addColorStop(0, ssHexCol(col, 0.75)); gn.addColorStop(0.35, ssHexCol(col, 1.25)); gn.addColorStop(1, ssHexCol(col, 0.6));
    ctx.fillStyle = gn;
    ctx.beginPath(); ctx.moveTo(-16, -26); ctx.quadraticCurveTo(-15, -52, 0, -70); ctx.quadraticCurveTo(15, -52, 16, -26); ctx.closePath(); ctx.fill();
    // band + panel lines
    ctx.fillStyle = col; ctx.fillRect(-16, 14, 32, 6);
    ctx.strokeStyle = 'rgba(15,23,42,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.moveTo(-16, 28); ctx.lineTo(16, 28); ctx.stroke();
    // porthole
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(0, -12, 9, 0, Math.PI * 2); ctx.fill();
    const gw = ctx.createRadialGradient(-2, -14, 1, 0, -12, 8);
    gw.addColorStop(0, '#e0f2fe'); gw.addColorStop(0.5, '#38bdf8'); gw.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(0, -12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-2.4, -14.5, 2.2, 1.2, -0.6, 0, Math.PI * 2); ctx.fill();
    // soft rim light
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-11, -10, 2.5, 46);
    ctx.restore();
}
function ss9DrawRockets(ctx, W, H) {
    ss9RocketInit();
    const g = ssG, tm = ssTm();
    const GROUND = H - 150;           // screen y of world 0 when cam = 0
    const cam = g.cam || 0, track = g.track || 3200;
    const alt = Math.min(1, (cam + 300) / track);
    // sky -> space gradient
    const sky = Math.max(0, 1 - alt / 0.38);
    const top = [Math.round(3 + sky * 14), Math.round(5 + sky * 70), Math.round(18 + sky * 150)];
    const bot = [Math.round(5 + sky * 120), Math.round(8 + sky * 160), Math.round(26 + sky * 200)];
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, `rgb(${top})`], [1, `rgb(${bot})`]]); ctx.fillRect(0, 0, W, H);
    // nebula glow (deep parallax)
    if (alt > 0.15) {
        ctx.save(); ctx.globalAlpha = Math.min(0.5, (alt - 0.15));
        ctx.fillStyle = ssRg(ctx, 900 - cam * 0.02, 160 + cam * 0.02, 10, 380, [[0, 'rgba(120,60,200,0.55)'], [1, 'rgba(120,60,200,0)']]); ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = ssRg(ctx, 260, 420 - cam * 0.03, 10, 320, [[0, 'rgba(30,110,200,0.45)'], [1, 'rgba(30,110,200,0)']]); ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }
    // stars (3 parallax layers), fade in with altitude
    const sa = Math.min(1, Math.max(0.05, (alt - 0.05) / 0.3));
    RK.stars.forEach(s => {
        const par = [0.04, 0.09, 0.16][s.l];
        const y = ((s.y - cam * par) % 2400 + 2400) % 2400 - 700;
        if (y < -4 || y > H + 4) return;
        const tw = 0.7 + 0.3 * Math.sin(tm * 0.03 + s.ph);
        ctx.globalAlpha = sa * s.a * tw; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // Earth below
    const eY = GROUND + cam;                      // horizon line screen y
    if (eY < H + 900) {
        const ex = W / 2, er = 2600, ecy = eY + er;
        const atm = ctx.createRadialGradient(ex, ecy, er - 20, ex, ecy, er + 90);
        atm.addColorStop(0, 'rgba(120,200,255,0.65)'); atm.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(ex, ecy, er + 90, 0, Math.PI * 2); ctx.fill();
        const eg = ctx.createRadialGradient(ex - 400, ecy - er, er * 0.2, ex, ecy, er);
        eg.addColorStop(0, '#2f7fd0'); eg.addColorStop(0.7, '#14518f'); eg.addColorStop(1, '#0a2f59');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ecy, er, 0, Math.PI * 2); ctx.fill();
        // continents / clouds (soft blobs)
        ctx.save(); ctx.beginPath(); ctx.arc(ex, ecy, er, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(70,150,80,0.55)';
        [[-500, 60, 260, 60], [260, 90, 340, 50], [-120, 40, 160, 30]].forEach(([dx, dy, rw, rh]) => { ctx.beginPath(); ctx.ellipse(ex + dx, eY + dy + 20, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        [[-420, 130, 220, 18], [150, 160, 280, 22], [520, 110, 180, 14]].forEach(([dx, dy, rw, rh]) => { ctx.beginPath(); ctx.ellipse(ex + dx + Math.sin(tm * 0.002) * 12, eY + dy, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
    }
    // launch pad (only near ground)
    if (cam < 300) {
        const gy = GROUND + cam;
        ctx.fillStyle = '#334155'; ctx.fillRect(0, gy + 40, W, H);
        ctx.fillStyle = '#475569'; ctx.fillRect(0, gy + 40, W, 6);
        (g.items || []).forEach(r => {
            ctx.fillStyle = '#1e293b'; ctx.fillRect(r.x - 34, gy + 36, 68, 10);
            ctx.fillStyle = '#64748b'; ctx.fillRect(r.x + 44, gy - 80, 5, 120);
            ctx.fillStyle = '#94a3b8'; ctx.fillRect(r.x + 28, gy - 78, 20, 4);
        });
    }
    // Moon + finish gate (world coordinates)
    const gateY = GROUND + cam - track;
    const moonY = gateY - 330;
    if (moonY > -520) {
        const mg = ctx.createRadialGradient(W * 0.72 - 40, moonY - 40, 20, W * 0.72, moonY, 300);
        mg.addColorStop(0, '#f1f5f9'); mg.addColorStop(0.6, '#cbd5e1'); mg.addColorStop(1, '#8793a6');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W * 0.72, moonY, 300, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(100,116,139,0.35)';
        [[-90, 20, 46], [60, -50, 30], [120, 60, 38], [-30, 90, 22]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(W * 0.72 + dx, moonY + 80 + dy, rr, 0, Math.PI * 2); ctx.fill(); });
    }
    if (gateY > -40 && gateY < H + 40) {
        ctx.save();
        const pulse = 0.6 + 0.4 * Math.sin(tm * 0.08);
        ctx.strokeStyle = `rgba(253,224,71,${0.55 + 0.3 * pulse})`; ctx.lineWidth = 4; ctx.setLineDash([26, 14]);
        ctx.beginPath(); ctx.moveTo(0, gateY); ctx.lineTo(W, gateY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = ssLg(ctx, 0, gateY - 40, 0, gateY, [[0, 'rgba(253,224,71,0)'], [1, 'rgba(253,224,71,0.22)']]); ctx.fillRect(0, gateY - 40, W, 40);
        ctx.font = '900 20px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = '#fde047'; ctx.textAlign = 'center';
        ctx.fillText('★ ORBIT GATE — FINISH ★', W / 2, gateY - 12);
        ctx.restore();
    }
    // smoke (world space)
    (g.smoke || []).forEach(s => {
        const sy = GROUND + cam - (s.world ? s.w : 0) + (s.world ? 0 : 36);
        ctx.globalAlpha = Math.max(0, s.a * s.life * 0.7);
        const sg = ctx.createRadialGradient(s.x, sy, 1, s.x, sy, s.r);
        sg.addColorStop(0, 'rgba(235,240,246,0.9)'); sg.addColorStop(1, 'rgba(235,240,246,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, sy, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // rockets
    (g.items || []).forEach((r, i) => {
        const leadSy = GROUND + cam - (g.lead || 0) * track - 62;
        const sy = leadSy + ((g.lead || 0) - r.p) * track * 0.55;
        const sx = r.x + Math.sin(tm * 0.02 + r.ph) * 2.2 * Math.min(1, r.p * 8);
        if (sy < -120 || sy > H + 80) return;
        // ion trail in space
        if (r.p > 0 && alt > 0.5) {
            const tg = ctx.createLinearGradient(0, sy + 50, 0, sy + 260);
            tg.addColorStop(0, 'rgba(150,200,255,0.35)'); tg.addColorStop(1, 'rgba(150,200,255,0)');
            ctx.fillStyle = tg; ctx.fillRect(sx - 3, sy + 50, 6, 210);
        }
        if (i === g.winnerIdx && r.crossed) {
            const hg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 130);
            hg.addColorStop(0, 'rgba(253,224,71,0.5)'); hg.addColorStop(1, 'rgba(253,224,71,0)');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(sx, sy, 130, 0, Math.PI * 2); ctx.fill();
        }
        ctx.save(); ctx.translate(sx, sy);
        ss9DrawRocketShape(ctx, r, g.thrust || 0, tm, r.crossed);
        ctx.restore();
        ssNameTag(ctx, r.name, sx, Math.max(34, sy - 104), 'rgba(8,15,35,0.82)', i === g.winnerIdx && r.crossed ? '#fde047' : '#fff');
    });
    // HUD: countdown, altitude, ladder
    ctx.textAlign = 'left';
    if (g.count > 0) {
        ctx.font = '900 120px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(String(g.count), W / 2, H / 2 - 40);
    } else if (g.count === 0) {
        ctx.font = '900 60px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fde047'; ctx.fillText('IGNITION', W / 2, H / 2 - 40);
    }
    ctx.textAlign = 'left';
    const lp = Math.min(1, g.lead || 0);
    ctx.font = '800 14px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = 'rgba(226,232,240,0.9)';
    ctx.fillText('ALTITUDE  ' + Math.round(lp * 384) + ' km', 24, 34);
    ctx.fillText('T+ ' + (Math.max(0, stageTick - 120) / 60).toFixed(1) + ' s', 24, 54);
    // progress ladder (right)
    const lx = W - 46, ly0 = 70, ly1 = H - 40;
    ctx.fillStyle = 'rgba(15,23,42,0.55)'; ssRR(ctx, lx - 22, ly0 - 30, 44, ly1 - ly0 + 50, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly0); ctx.lineTo(lx, ly1); ctx.stroke();
    ctx.font = '800 10px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = '#fde047'; ctx.textAlign = 'center'; ctx.fillText('GATE', lx, ly0 - 12); ctx.fillStyle = '#cbd5e1'; ctx.fillText('PAD', lx, ly1 + 14);
    (g.items || []).forEach(r => {
        const py = ly1 - Math.min(1, r.p) * (ly1 - ly0);
        ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(lx, py, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    ctx.textAlign = 'left';
}

// ============================================================================
// v9 NEW GAMES — batch 2: 17 Spin Wheel, 18 Penalty Shootout, 19 Free Throw, 20 Treasure Dig
// ============================================================================
const SS9G = {
    18: { title: 'Penalty Shootout', sub: 'Keeper Dives • One Name Scores', color: '#16a34a', label: 'START SHOOTOUT', banner: 'Ready — START SHOOTOUT!', quick: '⚽ Penalty' },
    19: { title: 'Basketball Free Throw', sub: 'Rim Bounces • One Swish Wins', color: '#ea580c', label: 'SHOOT HOOPS', banner: 'Ready — SHOOT HOOPS!', quick: '🏀 Free Throw' }
};
const PAL9 = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#f472b6', '#4ade80', '#fb923c', '#38bdf8', '#a3e635', '#c084fc', '#f87171', '#2dd4bf'];
function ss9Pool(n) { const p = ssShuffleArr(getUnpickedPool(2)); return p.slice(0, Math.min(n, p.length)); }
function ss9Fit(ctx, text, maxW, font, min) {
    let size = parseInt(font); ctx.font = font.replace(/\d+px/, size + 'px');
    while (ctx.measureText(text).width > maxW && size > (min || 9)) { size--; ctx.font = font.replace(/\d+px/, size + 'px'); }
}
function ss9Prepare(m) {
    stageTick = 0;
    if (m === 17) {
        const names = ss9Pool(16); const n = names.length;
        const wi = Math.floor(Math.random() * n);
        const seg = Math.PI * 2 / n;
        // pointer at top (-PI/2). Winner centre must land under pointer.
        const target = -Math.PI / 2 - (wi + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6;
        const spins = 5 + Math.floor(Math.random() * 2);
        ssG = { mode: 17, names, winnerIdx: wi, a0: 0, a: 0, a1: target - spins * Math.PI * 2, dur: 330, flap: 0, lastSeg: -1, parts: [] };
        return;
    }
    if (m === 18 || m === 19) {
        const names = ss9Pool(m === 18 ? 6 : 6); const n = names.length;
        const wi = Math.max(0, Math.min(n - 1, 2 + Math.floor(Math.random() * Math.max(1, n - 2))));
        const order = ssShuffleArr(names.map((x, i) => i));
        // winner is the shooter who is placed at position wi in the queue
        const wIdx = order.indexOf(0);
        ssG = { mode: m, names: order.map(i => names[i]), winnerIdx: Math.min(n - 1, wi), per: m === 18 ? 130 : 140, shot: -1, ball: { x: 0, y: 0, z: 0, s: 1 }, parts: [], result: [], keeperX: 0, keeperDive: 0, side: 0, shooter: 0 };
        ssG.result = ssG.names.map((nm, i) => i === ssG.winnerIdx);
        ssG.sides = ssG.names.map(() => (Math.random() < 0.5 ? -1 : 1));
        ssG.miss = ssG.names.map(() => 0.5 + Math.random() * 0.4);
        // only shooters up to the winner take a turn
        ssG.turns = ssG.winnerIdx + 1;
        return;
    }
    if (m === 20) {
        const names = ss9Pool(12); const n = names.length;
        const wi = Math.floor(Math.random() * n);
        const cols = Math.min(6, Math.ceil(n / 2));
        ssG = { mode: 20, names, winnerIdx: wi, mounds: names.map((nm, i) => { const r = Math.floor(i / cols), c = i % cols; return { name: nm, x: 220 + c * 170 + (r ? 40 : 0), y: 360 + r * 130, dug: 0, kind: 'empty', color: PAL9[i % PAL9.length] }; }),
            order: [], parts: [], cur: -1, digT: 0, shovel: { x: 120, y: 200 }, per: 62 };
        const others = ssShuffleArr(names.map((x, i) => i).filter(i => i !== wi));
        const kinds = ['bone', 'boot', 'skull', 'empty', 'crab', 'bone'];
        const k = Math.min(3 + Math.floor(Math.random() * 2), others.length);
        ssG.order = others.slice(0, k).concat([wi]);
        ssG.order.forEach((mi, j) => { ssG.mounds[mi].kind = (mi === wi) ? 'gold' : kinds[j % kinds.length]; });
        return;
    }
}
function ss9Step(m) {
    const g = ssG, t = stageTick;
    if (m === 17) {
        const p = Math.min(1, t / g.dur), e = 1 - Math.pow(1 - p, 3.2);
        g.a = g.a0 + (g.a1 - g.a0) * e;
        const seg = Math.PI * 2 / g.names.length;
        const idx = Math.floor((((-Math.PI / 2 - g.a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / seg);
        if (idx !== g.lastSeg) { g.lastSeg = idx; g.flap = 1; if (t > 2) StudioAudioManager.playSFX('click'); }
        g.flap *= 0.86;
        if (t >= g.dur + 70) ssCrownWinner(g.names[g.winnerIdx], '🎡', 'PRIZE WHEEL WINNER', `🎡 The wheel chose: ${g.names[g.winnerIdx]}!`);
    } else if (m === 18 || m === 19) {
        const k = Math.floor(t / g.per), f = t % g.per;
        g.shot = Math.min(k, g.turns - 1); g.f = f;
        if (k < g.turns) {
            const win = g.result[k];
            if (f === 1) StudioAudioManager.playSFX('select');
            if (f === Math.round(g.per * 0.42) && m === 18) StudioAudioManager.playArrowReleaseSound();
            if (f === Math.round(g.per * 0.40) && m === 19) StudioAudioManager.playSFX('whoosh');
            const hitF = Math.round(g.per * (m === 18 ? 0.64 : 0.7));
            if (f === hitF) {
                if (win) { StudioAudioManager.playSFX('cheer'); SS.shake = 6; for (let i = 0; i < ssQ(30); i++) g.parts.push({ x: 640, y: 300, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7, life: 1, color: PAL9[i % PAL9.length] }); }
                else StudioAudioManager.playSFX(m === 18 ? 'pop' : 'click');
            }
        }
        g.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.025; });
        g.parts = g.parts.filter(p => p.life > 0);
        if (t >= g.turns * g.per + 20) ssCrownWinner(g.names[g.winnerIdx], m === 18 ? '⚽' : '🏀', m === 18 ? 'PENALTY HERO' : 'FREE THROW WINNER', m === 18 ? `⚽ GOAL! ${g.names[g.winnerIdx]} scores!` : `🏀 Swish! ${g.names[g.winnerIdx]}!`);
    } else if (m === 20) {
        const k = Math.floor(t / g.per), f = t % g.per;
        if (k < g.order.length) {
            g.cur = g.order[k]; const mo = g.mounds[g.cur];
            g.shovel.x += (mo.x - 10 - g.shovel.x) * 0.2; g.shovel.y += (mo.y - 70 - g.shovel.y) * 0.2;
            if (f > 12 && f < 44) { mo.dug = Math.min(1, (f - 12) / 30); if (f % 6 === 0) { StudioAudioManager.playSFX('click'); for (let i = 0; i < 4; i++) g.parts.push({ x: mo.x, y: mo.y - 10, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 1, color: '#d6b779' }); } }
            if (f === 46 && mo.kind === 'gold') { StudioAudioManager.playSFX('cheer'); SS.shake = 5; for (let i = 0; i < ssQ(40); i++) g.parts.push({ x: mo.x, y: mo.y - 20, vx: (Math.random() - 0.5) * 8, vy: -3 - Math.random() * 6, life: 1.2, color: i % 2 ? '#fde047' : '#f59e0b' }); }
            if (f === 46 && mo.kind !== 'gold') StudioAudioManager.playSFX('pop');
        }
        g.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= 0.022; });
        g.parts = g.parts.filter(p => p.life > 0);
        if (t >= g.order.length * g.per + 10) ssCrownWinner(g.names[g.winnerIdx], '⛏️', 'TREASURE FOUND', `💰 Treasure chest: ${g.names[g.winnerIdx]}!`);
    }
}
// ---------------- drawing ----------------
function ss9DrawWheel(ctx, W, H) {
    const g = ssG, tm = ssTm(), cx = 600, cy = 330, R = 250, n = g.names.length, seg = Math.PI * 2 / n;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#2a0a3a'], [1, '#12041f']]); ctx.fillRect(0, 0, W, H);
    // stage lights
    for (let i = 0; i < 5; i++) { const lx = 150 + i * 250; ctx.fillStyle = ssRg(ctx, lx, 0, 4, 260, [[0, 'rgba(255,220,120,0.22)'], [1, 'rgba(255,220,120,0)']]); ctx.beginPath(); ctx.moveTo(lx - 6, 0); ctx.lineTo(lx + 120, H); ctx.lineTo(lx - 120, H); ctx.closePath(); ctx.fill(); }
    // floor shadow + stand
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(cx, cy + R + 40, R * 0.9, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ssLg(ctx, cx - 60, 0, cx + 60, 0, [[0, '#7c2d12'], [0.5, '#c2410c'], [1, '#7c2d12']]); ctx.beginPath(); ctx.moveTo(cx - 70, cy + R + 36); ctx.lineTo(cx - 20, cy); ctx.lineTo(cx + 20, cy); ctx.lineTo(cx + 70, cy + R + 36); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(cx, cy);
    // outer rim
    ctx.fillStyle = ssLg(ctx, -R, -R, R, R, [[0, '#fde68a'], [0.5, '#b45309'], [1, '#78350f']]); ctx.beginPath(); ctx.arc(0, 0, R + 22, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(g.a);
    for (let i = 0; i < n; i++) {
        const a0 = i * seg, a1 = a0 + seg;
        ctx.fillStyle = ssLg(ctx, 0, 0, Math.cos(a0 + seg / 2) * R, Math.sin(a0 + seg / 2) * R, [[0, ssHexCol(PAL9[i % PAL9.length], 1.3)], [1, ssHexCol(PAL9[i % PAL9.length], 0.78)]]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.rotate(a0 + seg / 2); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
        ss9Fit(ctx, g.names[i], R - 115, '900 21px "Plus Jakarta Sans", sans-serif', 11); ctx.fillText(g.names[i], R - 24, 7); ctx.restore();
    }
    ctx.restore();
    // rim bulbs
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + g.a * 0.0; const on = (Math.floor(tm * 0.15) + i) % 2 === 0; ctx.fillStyle = on ? '#fff7b0' : '#b38a1c'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (R + 11), cy + Math.sin(a) * (R + 11), 5, 0, Math.PI * 2); ctx.fill(); }
    // hub
    ctx.fillStyle = ssRg(ctx, cx - 8, cy - 8, 2, 40, [[0, '#fff7d6'], [1, '#b45309']]); ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    // flapper pointer
    ctx.save(); ctx.translate(cx, cy - R - 12); ctx.rotate(-g.flap * 0.5);
    ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18, -22); ctx.lineTo(18, -22); ctx.lineTo(0, 36); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function ss9DrawPenalty(ctx, W, H) {
    const g = ssG, tm = ssTm(), t = stageTick, run = stageTick > 0;
    // stadium + grass
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#0b1d3a'], [0.32, '#173b6e']]); ctx.fillRect(0, 0, W, 210);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `hsl(${(i * 47) % 360},60%,${45 + (i % 3) * 8}%)`; ctx.fillRect(10 + i * 14, 140 + (i % 4) * 8, 6, 8); }
    ctx.fillStyle = ssLg(ctx, 0, 200, 0, 0, [[0, 'rgba(10,20,50,0.0)'], [1, 'rgba(10,20,50,0.55)']]); ctx.fillRect(0, 100, W, 110);
    ctx.fillStyle = ssLg(ctx, 0, 210, 0, H, [[0, '#2f9e44'], [1, '#14632a']]); ctx.fillRect(0, 210, W, H - 210);
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 210 + i * 52, W, 52); }
    // goal
    const gx = 340, gy = 205, gw = 600, gh = 190;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; for (let i = 0; i <= 30; i++) { ctx.beginPath(); ctx.moveTo(gx + i * gw / 30, gy); ctx.lineTo(gx + i * gw / 30, gy + gh); ctx.stroke(); } for (let i = 0; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + i * gh / 9); ctx.lineTo(gx + gw, gy + i * gh / 9); ctx.stroke(); }
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    // penalty spot
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(640, 520, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    const k = g.shot, f = g.f || 0, per = g.per;
    const win = k >= 0 && g.result[k], side = k >= 0 ? g.sides[k] : 0;
    // keeper
    let kx = 640, ky = 330, kr = 0;
    if (run && k >= 0) { const dv = Math.max(0, Math.min(1, (f - per * 0.44) / (per * 0.22))); const e = dv * dv * (3 - 2 * dv); const dir = win ? -side : side; kx = 640 + dir * 200 * e; ky = 330 + e * 12; kr = dir * e * 1.25; }
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(kr);
    ctx.fillStyle = '#fde047'; ssRR(ctx, -22, -50, 44, 62, 10); ctx.fill();
    ctx.fillStyle = '#1e293b'; ssRR(ctx, -20, 12, 16, 44, 6); ctx.fill(); ssRR(ctx, 4, 12, 16, 44, 6); ctx.fill();
    ctx.fillStyle = '#fcd9b8'; ctx.beginPath(); ctx.arc(0, -62, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16a34a'; ctx.fillRect(-46, -44, 18, 14); ctx.fillRect(28, -44, 18, 14);
    ctx.restore();
    // shooter + ball
    const bx0 = 640, by0 = 520;
    let bx = bx0, by = by0, bs = 1;
    const kickF = per * 0.42, hitF = per * 0.64;
    if (run && k >= 0) {
        const nm = g.names[k];
        const rf = Math.min(1, f / kickF);
        const sx = 640 - side * 90 * (1 - rf) - 60 * (1 - rf), sy = 600 - rf * 40;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + 50, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL9[k % PAL9.length]; ssRR(ctx, sx - 22, sy - 62, 44, 62, 11); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(k + 1), sx, sy - 28);
        ctx.fillStyle = '#1e293b'; const sw = Math.sin(f * 0.5) * 8 * (1 - rf); ssRR(ctx, sx - 18, sy, 14, 44 + sw, 6); ctx.fill(); ssRR(ctx, sx + 4, sy, 14, 44 - sw, 6); ctx.fill();
        ctx.fillStyle = '#fcd9b8'; ctx.beginPath(); ctx.arc(sx, sy - 76, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b2314'; ctx.beginPath(); ctx.arc(sx, sy - 82, 14, Math.PI, 0); ctx.fill();
        ssNameTag(ctx, nm, sx, sy + 56, 'rgba(15,23,42,0.88)', '#fff');
        if (f >= kickF) {
            const p = Math.min(1, (f - kickF) / (hitF - kickF));
            const tx = win ? 640 + side * 190 * g.miss[k] : (Math.random() < 2 ? 640 - side * (60 + 20 * g.miss[k]) : 0); // saved ball goes at keeper's dive side
            const targetX = win ? 640 + side * 190 * g.miss[k] : 640 + side * 170 * 0.0 + (-side) * 0;
            const aim = win ? 640 + side * (130 + 60 * g.miss[k]) : 640 - side * (120 + 40 * g.miss[k]) * -1;
            bx = bx0 + (aim - bx0) * p; const arc = Math.sin(p * Math.PI) * 60; by = by0 + (300 - by0) * p - arc; bs = 1 - p * 0.55;
            if (f > hitF) { bx = aim + (win ? 0 : -(f - hitF) * 1.4 * -side); by = 300 + (win ? (f - hitF) * 0.5 : -(f - hitF) * 1.2); bs = 0.45; }
        }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bx, by + 10 * bs + (by0 - by) * 0.0, 14 * bs, 5 * bs, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 14 * bs, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(bx, by, 5.5 * bs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 14 * bs, 0, Math.PI * 2); ctx.stroke();
    // result banner
    if (run && k >= 0 && f > hitF) { ctx.textAlign = 'center'; ctx.font = '900 54px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = win ? '#fde047' : '#fca5a5'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6; const txt = win ? 'GOAL!' : 'SAVED!'; ctx.strokeText(txt, 640, 130); ctx.fillText(txt, 640, 130); }
    // queue
    ctx.textAlign = 'left'; ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    g.names.slice(0, g.turns).forEach((nm, i) => { const done = run && i < k; ctx.fillStyle = i === k ? '#fde047' : (done ? '#94a3b8' : 'rgba(255,255,255,0.7)'); ctx.fillText((i + 1) + '. ' + nm + (done ? ' ✖' : ''), 24, 34 + i * 20); });
    g.parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 6, 6); }); ctx.globalAlpha = 1;
}
function ss9DrawHoops(ctx, W, H) {
    const g = ssG, tm = ssTm(), run = stageTick > 0;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#1a1330'], [0.5, '#2a1f4a'], [1, '#3b2a1c']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `hsla(${(i * 53) % 360},60%,60%,0.35)`; ctx.fillRect(10 + i * 21, 80 + (i % 5) * 9, 8, 9); }
    // floor
    ctx.fillStyle = ssLg(ctx, 0, 400, 0, H, [[0, '#c98b4b'], [1, '#8a5a2a']]); ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(W, 400); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(640, H + 10, 190, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(430, 400); ctx.lineTo(430, H); ctx.moveTo(850, 400); ctx.lineTo(850, H); ctx.stroke();
    // backboard + hoop
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ssRR(ctx, 550, 100, 180, 120, 8); ctx.fill(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.strokeRect(595, 150, 90, 62);
    ctx.fillStyle = '#475569'; ctx.fillRect(636, 218, 8, 20);
    // net (behind ball when scoring)
    const k = g.shot >= 0 ? g.shot : -1, f = g.f || 0, per = g.per;
    const win = k >= 0 && g.result[k];
    const hitF = per * 0.7, shootF = per * 0.4;
    const rimX = 640, rimY = 250;
    const netSway = (win && f > hitF) ? Math.sin((f - hitF) * 0.5) * 6 * Math.max(0, 1 - (f - hitF) / 40) : 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) { const x0 = rimX - 36 + i * 12; ctx.beginPath(); ctx.moveTo(x0, rimY); ctx.lineTo(rimX - 24 + i * 8 + netSway, rimY + 52); ctx.stroke(); }
    for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(rimX - 36 + j * 4 + netSway * j / 4, rimY + j * 13); ctx.lineTo(rimX + 36 - j * 4 + netSway * j / 4, rimY + j * 13); ctx.stroke(); }
    // ball
    let bx = 480, by = 500, bs = 1;
    if (run && k >= 0) {
        const sx = 480 + (k % 2 ? 40 : -40), sy = 560;
        const rf = Math.min(1, f / shootF);
        // shooter
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + 40, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PAL9[k % PAL9.length]; ssRR(ctx, sx - 22, sy - 58, 44, 58, 11); ctx.fill();
        ctx.fillStyle = '#1e293b'; ssRR(ctx, sx - 18, sy, 14, 38, 6); ctx.fill(); ssRR(ctx, sx + 4, sy, 14, 38, 6); ctx.fill();
        ctx.fillStyle = '#fcd9b8'; ctx.beginPath(); ctx.arc(sx, sy - 72, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3b2314'; ctx.beginPath(); ctx.arc(sx, sy - 78, 14, Math.PI, 0); ctx.fill();
        // arms up on shot
        ctx.strokeStyle = '#fcd9b8'; ctx.lineWidth = 8; ctx.lineCap = 'round'; const up = Math.min(1, rf * 1.2); ctx.beginPath(); ctx.moveTo(sx + 14, sy - 48); ctx.lineTo(sx + 26 + up * 8, sy - 70 - up * 34); ctx.stroke();
        ssNameTag(ctx, g.names[k], sx, sy + 44, 'rgba(15,23,42,0.88)', '#fff');
        if (f < shootF) { bx = sx + 24 + rf * 6; by = sy - 40 - rf * 40; }
        else {
            const p = Math.min(1, (f - shootF) / (hitF - shootF));
            const x1 = win ? rimX : rimX - 34, y1 = rimY - 8;
            const sx0 = sx + 30, sy0 = sy - 110;
            bx = sx0 + (x1 - sx0) * p; by = sy0 + (y1 - sy0) * p - Math.sin(p * Math.PI) * 190; bs = 1 - p * 0.45;
            if (f > hitF) {
                const q = f - hitF;
                if (win) { bx = rimX + Math.sin(q * 0.4) * 2; by = rimY - 8 + q * 4 + q * q * 0.04; bs = 0.55; if (by > 440) { by = 440; } }
                else { bx = x1 - q * 3.6; by = y1 + Math.sin(Math.min(q / 12, 1) * Math.PI) * -26 + q * q * 0.12; bs = 0.55; }
            }
        }
    }
    const rim = (win && f > hitF) ? 'ring' : 'plain';
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(rimX, rimY, 38, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bx, Math.min(by + 30, 575), 16 * bs, 5 * bs, 0, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(bx - 4, by - 4, 2, bx, by, 17 * bs); bg.addColorStop(0, '#fdba74'); bg.addColorStop(1, '#c2410c');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 17 * bs, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,20,0,0.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by, 17 * bs, 0, Math.PI * 2); ctx.moveTo(bx - 17 * bs, by); ctx.lineTo(bx + 17 * bs, by); ctx.moveTo(bx, by - 17 * bs); ctx.lineTo(bx, by + 17 * bs); ctx.stroke();
    if (run && k >= 0 && f > hitF) { ctx.textAlign = 'center'; ctx.font = '900 52px "Plus Jakarta Sans", sans-serif'; ctx.fillStyle = win ? '#fde047' : '#fca5a5'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 6; const txt = win ? 'SWISH!' : 'MISS!'; ctx.strokeText(txt, 640, 70); ctx.fillText(txt, 640, 70); }
    ctx.textAlign = 'left'; ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    g.names.slice(0, g.turns).forEach((nm, i) => { const done = run && i < k; ctx.fillStyle = i === k ? '#fde047' : (done ? '#94a3b8' : 'rgba(255,255,255,0.75)'); ctx.fillText((i + 1) + '. ' + nm + (done ? ' ✖' : ''), 24, 34 + i * 20); });
    g.parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 6, 6); }); ctx.globalAlpha = 1;
}
function ss9DrawDig(ctx, W, H) {
    const g = ssG, tm = ssTm();
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, 300, [[0, '#7dd3fc'], [1, '#fef3c7']]); ctx.fillRect(0, 0, W, 300);
    ctx.fillStyle = ssRg(ctx, 1120, 70, 6, 80, [[0, 'rgba(254,249,195,1)'], [1, 'rgba(253,224,71,0)']]); ctx.beginPath(); ctx.arc(1120, 70, 80, 0, Math.PI * 2); ctx.fill();
    // sea strip + palm
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 230, W, 40); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= W; x += 12) { const y = 270 + Math.sin(x * 0.03 + tm * 0.06) * 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.fillStyle = ssLg(ctx, 0, 268, 0, H, [[0, '#f3dba0'], [1, '#d5b36b']]); ctx.fillRect(0, 268, W, H - 268);
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(1130, 330); ctx.quadraticCurveTo(1150, 220, 1110, 130); ctx.stroke();
    ctx.fillStyle = '#16a34a'; [[-70, -30], [-40, -60], [40, -50], [70, -20], [0, -70]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(1110 + dx, 130 + dy + 40, 60, 12, Math.atan2(dy, dx), 0, Math.PI * 2); ctx.fill(); });
    // mounds
    g.mounds.forEach((mo, i) => {
        const dug = mo.dug;
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(mo.x, mo.y + 20, 74, 18, 0, 0, Math.PI * 2); ctx.fill();
        // hole
        ctx.fillStyle = '#6b4a1e'; ctx.beginPath(); ctx.ellipse(mo.x, mo.y + 6, 62, 20, 0, 0, Math.PI * 2); ctx.fill();
        // prize
        if (dug > 0.45) {
            const k = mo.kind, up = Math.min(1, (dug - 0.45) / 0.55);
            ctx.save(); ctx.translate(mo.x, mo.y - 6 - up * 12); ctx.globalAlpha = up;
            if (k === 'gold') {
                ctx.fillStyle = '#92400e'; ssRR(ctx, -38, -26, 76, 44, 8); ctx.fill(); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(0, -26, 38, 14, 0, Math.PI, 0); ctx.fill();
                ctx.fillStyle = '#fbbf24'; ctx.fillRect(-4, -30, 8, 22); ctx.fillStyle = '#fde047'; [[-20, -28], [0, -34], [20, -28], [-10, -24], [12, -22]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
            } else if (k === 'bone') { ctx.fillStyle = '#f8fafc'; ctx.fillRect(-22, -4, 44, 8); [[-24, -4], [-24, 4], [24, -4], [24, 4]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }); }
            else if (k === 'boot') { ctx.fillStyle = '#7c4a1d'; ctx.fillRect(-10, -26, 18, 28); ctx.fillRect(-10, 0, 34, 12); }
            else if (k === 'skull') { ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(0, -6, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(-7, -8, 4, 0, Math.PI * 2); ctx.arc(7, -8, 4, 0, Math.PI * 2); ctx.fill(); }
            else if (k === 'crab') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(0, -2, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-30, -14, 10, 6); ctx.fillRect(20, -14, 10, 6); }
            ctx.restore();
        }
        // sand pile shrinks as dug
        const ph = 34 * (1 - dug);
        if (ph > 1) { ctx.fillStyle = ssLg(ctx, 0, mo.y - ph, 0, mo.y + 18, [[0, '#f0d594'], [1, '#c9a35a']]); ctx.beginPath(); ctx.moveTo(mo.x - 72, mo.y + 12); ctx.quadraticCurveTo(mo.x, mo.y - ph * 1.8, mo.x + 72, mo.y + 12); ctx.closePath(); ctx.fill(); }
        // flag with name
        const lit = (g.cur === i);
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mo.x + 54, mo.y + 8); ctx.lineTo(mo.x + 54, mo.y - 52); ctx.stroke();
        ctx.fillStyle = lit ? '#fde047' : mo.color; ctx.beginPath(); ctx.moveTo(mo.x + 54, mo.y - 52); ctx.lineTo(mo.x + 54 + 18, mo.y - 46); ctx.lineTo(mo.x + 54, mo.y - 38); ctx.fill();
        ssNameTag(ctx, mo.name, mo.x, mo.y + 28, lit ? 'rgba(120,53,15,0.95)' : 'rgba(15,23,42,0.85)', lit ? '#ffe27a' : '#fff');
    });
    // digger + shovel
    if (stageTick > 0 && g.cur >= 0) {
        const mo = g.mounds[g.cur], f = stageTick % g.per;
        const dig = f > 12 && f < 44 ? Math.sin((f - 12) / 32 * Math.PI * 4) : 0;
        const sx = mo.x - 78, sy = mo.y - 36;
        ctx.fillStyle = '#f97316'; ssRR(ctx, sx - 18, sy - 36, 36, 46, 9); ctx.fill();
        ctx.fillStyle = '#fcd9b8'; ctx.beginPath(); ctx.arc(sx, sy - 50, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(sx, sy - 58, 20, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(sx - 10, sy - 66, 20, 9);
        ctx.fillStyle = '#1e3a8a'; ssRR(ctx, sx - 16, sy + 8, 14, 34, 5); ctx.fill(); ssRR(ctx, sx + 2, sy + 8, 14, 34, 5); ctx.fill();
        ctx.save(); ctx.translate(sx + 12, sy - 20); ctx.rotate(0.9 + dig * 0.5);
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 96); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(-12, 96); ctx.lineTo(12, 96); ctx.lineTo(8, 124); ctx.lineTo(-8, 124); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    g.parts.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
}
// ---------------- registry + wiring ----------------
(function ss9Games2Wire() {
    Object.keys(SS9G).forEach(id => { EIGHT_MODES.push({ id: +id, title: SS9G[id].title, sub: SS9G[id].sub, color: SS9G[id].color }); });
    const _card = getModeCardSVG;
    getModeCardSVG = function (id) {
        const d = SS9G[id];
        if (!d) return _card(id);
        const c = d.color;
        const svg = `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g9${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="400" height="220" fill="url(#g9${id})"/>${ss9CardArt(id)}<text x="200" y="196" font-family="Arial" font-weight="900" font-size="22" fill="#fff" text-anchor="middle">${d.title}</text></svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    };
    const _prep = prepareStageEntities, _step = ssStepNew, _draw = drawStageFrame, _open = openGameStage;
    prepareStageEntities = function (m) { if (SS9G[m]) { ss9Prepare(m); return; } _prep(m); };
    ssStepNew = function () { if (SS9G[ssG.mode]) return ss9Step(ssG.mode); _step(); };
    drawStageFrame = function (isFinal) {
        const m = activeStageMode;
        if (SS9G[m]) {
            const canvas = document.getElementById('stageCanvas'); if (!canvas) return;
            const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
            ctx.save(); ctx.clearRect(0, 0, W, H); ssShake(ctx);
            if (m === 17) ss9DrawWheel(ctx, W, H); else if (m === 18) ss9DrawPenalty(ctx, W, H); else if (m === 19) ss9DrawHoops(ctx, W, H); else ss9DrawDig(ctx, W, H);
            ctx.restore(); if (isFinal) ssDrawConfetti(ctx, W, H); ctx.textAlign = 'left'; return;
        }
        _draw(isFinal);
    };
    openGameStage = function (m) {
        _open(m);
        const d = SS9G[m]; if (!d) return;
        document.getElementById('stageActionBtn').innerHTML = '<i class="fa-solid fa-play"></i> ' + d.label;
        document.getElementById('stageWinnerBanner').textContent = d.banner;
    };
    const quickBar = document.querySelector('#gameStageModal .stage-bottom-bar > div:last-child');
    if (quickBar) Object.keys(SS9G).forEach(id => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'top-circle-btn';
        b.style.cssText = 'width:auto; padding:0 11px; font-size:12px; font-weight:800;'; b.textContent = SS9G[id].quick; b.onclick = () => openGameStage(+id); quickBar.appendChild(b);
    });
})();
function ss9CardArt(id) {
    if (id === 17) return '<circle cx="200" cy="100" r="70" fill="#fde047"/><path d="M200,100 L200,30 A70,70 0 0 1 260,65 Z" fill="#ef4444"/><path d="M200,100 L260,65 A70,70 0 0 1 260,135 Z" fill="#3b82f6"/><path d="M200,100 L260,135 A70,70 0 0 1 200,170 Z" fill="#10b981"/><path d="M200,100 L200,170 A70,70 0 0 1 140,135 Z" fill="#8b5cf6"/><circle cx="200" cy="100" r="12" fill="#fff"/><path d="M190,22 L210,22 L200,44 Z" fill="#fff"/>';
    if (id === 18) return '<rect x="110" y="50" width="180" height="90" fill="none" stroke="#fff" stroke-width="6"/><circle cx="230" cy="130" r="14" fill="#fff"/><rect x="170" y="80" width="22" height="46" rx="6" fill="#fde047"/>';
    if (id === 19) return '<rect x="150" y="30" width="100" height="62" rx="5" fill="#fff"/><ellipse cx="200" cy="108" rx="28" ry="7" fill="none" stroke="#f97316" stroke-width="5"/><circle cx="200" cy="140" r="16" fill="#ea580c"/>';
    return '<ellipse cx="200" cy="150" rx="150" ry="18" fill="#f3dba0"/><rect x="165" y="90" width="70" height="46" rx="8" fill="#92400e"/><circle cx="185" cy="88" r="9" fill="#fde047"/><circle cx="205" cy="82" r="9" fill="#fde047"/><circle cx="222" cy="90" r="9" fill="#fde047"/>';
}

// v9 Rocket sound: WebAudio synth, respects StudioAudioManager.muted
const RKS = { eng: null, last: -1, wd: null };
function rksOk() { const A = StudioAudioManager; if (A.muted) return null; A.init(); return A.ctx || null; }
function rksBeep(freq, dur, vol, type) {
    const c = rksOk(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
function rksNoiseBuf(c) {
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
}
function rksEngineStart() {
    if (RKS.eng) return; const c = rksOk(); if (!c) return;
    const src = c.createBufferSource(); src.buffer = rksNoiseBuf(c); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const g = c.createGain(); g.gain.value = 0.0001;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
    const og = c.createGain(); og.gain.value = 0.05;
    src.connect(lp); lp.connect(g); o.connect(og); og.connect(g); g.connect(c.destination);
    src.start(); o.start();
    RKS.eng = { src, o, lp, g, og, c };
}
function rksEngineSet(level, vol) { // level 0..1 = speed/altitude
    const e = RKS.eng; if (!e) return; const t = e.c.currentTime;
    e.lp.frequency.setTargetAtTime(160 + level * 900, t, 0.1);
    e.o.frequency.setTargetAtTime(46 + level * 70, t, 0.1);
    e.g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.08);
}
function rksEngineStop() {
    const e = RKS.eng; if (!e) return; RKS.eng = null;
    try { e.g.gain.setTargetAtTime(0.0001, e.c.currentTime, 0.15); setTimeout(() => { try { e.src.stop(); e.o.stop(); } catch (x) {} }, 700); } catch (x) {}
}
function rksFanfare() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => rksBeep(f, 0.35, 0.12, 'triangle'), i * 140));
}
(function () {
    const orig = ss9RocketStep;
    ss9RocketStep = function () {
        orig.apply(this, arguments);
        const g = ssG, t = stageTick; if (!g || g.mode !== 11) return;
        if (!RKS.wd) RKS.wd = setInterval(() => {
            const open = typeof ssG !== 'undefined' && ssG && ssG.mode === 11 && (document.getElementById('gameStageModal').style.display === 'flex');
            if (!open || StudioAudioManager.muted) rksEngineStop();
        }, 500);
        if (t === 0) { RKS.last = -1; rksEngineStop(); }
        const LAUNCH = 120;
        if (t < LAUNCH) {
            if (t % 40 === 1 && t < LAUNCH - 2) rksBeep(t > LAUNCH - 42 ? 880 : 520, 0.15, 0.12, 'square');
            if (t > LAUNCH - 50) { rksEngineStart(); rksEngineSet(0, 0.03 + 0.07 * g.thrust); }
        } else {
            if (t === LAUNCH) { rksBeep(1175, 0.3, 0.1, 'square'); rksEngineStart(); }
            const lead = Math.min(1, g.lead || 0);
            rksEngineSet(lead, 0.10 + 0.07 * lead);
            if (g.finishT === t) rksFanfare();
            if (g.finishT >= 0 && t === g.finishT + 60) rksEngineSet(lead, 0.03);
            if (g.crowned && RKS.eng) rksEngineStop();
        }
    };
})();

// ============================================================================
// v9 CLASS MANAGER: add / edit / delete classes + bulk import (xlsx, docx, csv, txt) + template
// All local. Data stays in appState (device only).
// ============================================================================
const SSC = { root: null, tab: 'list', edit: null, imp: null, fileName: '' };
(function () {
    const st = document.createElement('style');
    st.textContent = `
    #sscRoot{position:fixed;inset:0;z-index:100000;background:rgba(2,6,23,.78);display:none;align-items:center;justify-content:center;font-family:inherit}
    #sscRoot .card{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:18px;width:min(760px,94vw);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.6)}
    #sscRoot .hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #334155}
    #sscRoot .hd h3{margin:0;font-size:19px;font-weight:900}
    #sscRoot .bd{padding:16px 18px;overflow:auto;flex:1}
    #sscRoot .tabs{display:flex;gap:8px;padding:10px 18px 0}
    #sscRoot .tab{padding:8px 16px;border-radius:999px;border:1px solid #334155;background:#1e293b;color:#94a3b8;font-weight:800;cursor:pointer}
    #sscRoot .tab.on{background:#2563eb;border-color:#2563eb;color:#fff}
    #sscRoot .row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #334155;border-radius:12px;margin-bottom:8px;background:#111c33}
    #sscRoot .row .nm{flex:1;font-weight:800}
    #sscRoot .row .ct{color:#94a3b8;font-size:13px}
    #sscRoot button.b{padding:8px 14px;border-radius:10px;border:0;font-weight:800;cursor:pointer;background:#334155;color:#e2e8f0}
    #sscRoot button.b.pri{background:#2563eb;color:#fff}
    #sscRoot button.b.red{background:#dc2626;color:#fff}
    #sscRoot button.b.grn{background:#16a34a;color:#fff}
    #sscRoot input[type=text],#sscRoot textarea,#sscRoot select{width:100%;box-sizing:border-box;background:#020617;color:#e2e8f0;border:1px solid #475569;border-radius:10px;padding:9px 11px;font-size:15px;font-family:inherit}
    #sscRoot textarea{min-height:220px;resize:vertical}
    #sscRoot label{display:block;font-weight:800;margin:10px 0 5px;font-size:13px;color:#93c5fd}
    #sscRoot .note{font-size:13px;color:#94a3b8;margin:6px 0}
    #sscRoot .pv{border:1px solid #334155;border-radius:12px;padding:10px 12px;margin-bottom:10px;background:#111c33}
    #sscRoot .pv .names{font-size:13px;color:#cbd5e1;max-height:70px;overflow:auto;margin-top:6px}
    #sscRoot .ft{display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;border-top:1px solid #334155;flex-wrap:wrap}
    #sscRoot .warn{background:#451a03;border:1px solid #b45309;color:#fde68a;padding:10px 12px;border-radius:10px;margin:8px 0;font-size:14px}
    `;
    document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'sscRoot'; document.body.appendChild(root); SSC.root = root;
    function addBtn() {
        const box = document.querySelector('.header-widgets'); if (!box || document.getElementById('sscOpenBtn')) return;
        const b = document.createElement('button'); b.type = 'button'; b.id = 'sscOpenBtn'; b.className = 'top-circle-btn';
        b.title = 'Manage classes (add / edit / delete / import)'; b.innerHTML = '<i class="fa-solid fa-user-gear"></i>';
        b.onclick = () => sscOpen();
        const pill = box.querySelector('.class-pill-box'); if (pill && pill.nextSibling) box.insertBefore(b, pill.nextSibling); else box.appendChild(b);
    }
    addBtn(); document.addEventListener('DOMContentLoaded', addBtn); setTimeout(addBtn, 800);
})();
const sscEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function sscClean(list) {
    const seen = new Set(), out = [];
    (list || []).forEach(n => {
        n = (n == null ? '' : String(n)).replace(/\s+/g, ' ').trim();
        if (n.length < 2 || /^[\d\s.,\-]+$/.test(n)) return;
        if (SSC_HEAD.test(n)) return;
        const k = n.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push(n);
    });
    return out;
}
const SSC_HEAD = /^(student ?names?|names?|students?|الاسم|اسم الطالب|اسماء الطلاب|أسماء الطلاب|الطلاب|اسم|#|no\.?|م)$/i;
function sscSave() { syncStudioData(); renderAllDashboard(); }
function sscOpen(tab) { SSC.tab = tab || 'list'; SSC.edit = null; SSC.imp = null; SSC.root.style.display = 'flex'; sscRender(); }
function sscClose() { SSC.root.style.display = 'none'; SSC.root.innerHTML = ''; SSC.imp = null; }
function sscShell(body, foot) {
    const t = (id, l) => `<div class="tab ${SSC.tab === id ? 'on' : ''}" onclick="SSC.tab='${id}';SSC.edit=null;sscRender()">${l}</div>`;
    SSC.root.innerHTML = `<div class="card" dir="auto"><div class="hd"><h3>👥 Classes</h3><button class="b" onclick="sscClose()">✕ Close</button></div>
    <div class="tabs">${t('list', 'My classes')}${t('import', '📥 Import from file')}</div>
    <div class="bd">${body}</div><div class="ft">${foot || ''}</div></div>`;
}
function sscRender() {
    if (SSC.tab === 'import') return sscRenderImport();
    if (SSC.edit) return sscRenderEdit();
    const cls = appState.classes || {};
    const rows = Object.keys(cls).map(n => `<div class="row"><div class="nm">${sscEsc(n)}${n === appState.currentClass ? ' <span style="color:#22c55e;font-size:12px">● active</span>' : ''}</div>
      <div class="ct">${cls[n].length} students</div>
      <button class="b" onclick="sscUse(${JSON.stringify(n).replace(/"/g, '&quot;')})">Use</button>
      <button class="b pri" onclick="sscStartEdit(${JSON.stringify(n).replace(/"/g, '&quot;')})">Edit</button>
      <button class="b red" onclick="sscAskDelete(${JSON.stringify(n).replace(/"/g, '&quot;')})">Delete</button></div>`).join('');
    sscShell(rows || '<div class="note">No classes yet. Add one or import a file.</div>',
        `<button class="b" onclick="ssDownloadBackup()">💾 Backup all</button><button class="b grn" onclick="sscStartEdit(null)">＋ Add class</button>`);
}
function sscUse(n) { switchClass(n); sscRender(); }
function sscStartEdit(n) { SSC.edit = { orig: n }; sscRender(); }
function sscRenderEdit() {
    const o = SSC.edit.orig, names = o ? (appState.classes[o] || []) : [];
    sscShell(`<label>Class name</label><input type="text" id="sscName" value="${sscEsc(o || '')}" placeholder="e.g. Grade 7A">
    <label>Students (one name per line)</label><textarea id="sscNames" placeholder="One student per line">${sscEsc(names.join('\n'))}</textarea>
    <div class="note">Names stay on this device only. Duplicates and blank lines are removed when you save.</div>`,
        `<button class="b" onclick="SSC.edit=null;sscRender()">Cancel</button><button class="b pri" onclick="sscSaveEdit()">Save</button>`);
}
function sscSaveEdit() {
    const name = document.getElementById('sscName').value.trim().replace(/\s+/g, ' ');
    const names = sscClean(document.getElementById('sscNames').value.split(/\r?\n/));
    const o = SSC.edit.orig;
    if (!name) return showToast('⚠️ Enter a class name');
    if (name !== o && appState.classes[name]) return showToast('⚠️ A class with that name already exists');
    if (o && name !== o) {
        const nc = {}; Object.keys(appState.classes).forEach(k => { nc[k === o ? name : k] = k === o ? names : appState.classes[k]; }); appState.classes = nc;
        sscMigrateKey(o, name);
        if (appState.currentClass === o) appState.currentClass = name;
    } else appState.classes[name] = names;
    if (!appState.currentClass || !appState.classes[appState.currentClass]) appState.currentClass = name;
    sscSave(); SSC.edit = null; showToast('✅ Saved "' + name + '" (' + names.length + ' students)'); sscRender();
}
function sscMigrateKey(o, n) {
    if (appState.pickedByClass && appState.pickedByClass[o]) { appState.pickedByClass[n] = appState.pickedByClass[o]; delete appState.pickedByClass[o]; }
    if (appState.playersOff) Object.keys(appState.playersOff).forEach(k => { if (k.indexOf(o + '|') === 0) { appState.playersOff[n + k.slice(o.length)] = appState.playersOff[k]; delete appState.playersOff[k]; } });
}
function sscAskDelete(n) {
    const c = (appState.classes[n] || []).length;
    sscShell(`<div class="warn">⚠️ Delete class <b>${sscEsc(n)}</b> (${c} students)? This removes its student list from this device.</div>
    <div class="note">A safety copy of your data is kept in the device backup automatically. You can also download a backup file first.</div>
    <button class="b" onclick="ssDownloadBackup()">💾 Download backup file first</button>`,
        `<button class="b" onclick="sscRender()">Cancel</button><button class="b red" onclick="sscDoDelete(${JSON.stringify(n).replace(/"/g, '&quot;')})">Yes, delete</button>`);
}
function sscDoDelete(n) {
    try { ssStatePut('before-delete', JSON.parse(JSON.stringify(appState))); } catch (e) {}
    delete appState.classes[n];
    if (appState.pickedByClass) delete appState.pickedByClass[n];
    if (appState.playersOff) Object.keys(appState.playersOff).forEach(k => { if (k.indexOf(n + '|') === 0) delete appState.playersOff[k]; });
    const left = Object.keys(appState.classes);
    if (appState.currentClass === n) { appState.currentClass = left[0] || ''; appState.groups = { 1: [], 2: [], 3: [], 4: [], 5: [] }; }
    sscSave(); showToast('🗑️ Deleted "' + n + '"'); sscRender();
}
// ---------------------------- IMPORT ----------------------------
function sscGrid(rows, defName) {
    // rows: array of arrays. returns [{name, students}]
    rows = rows.map(r => (r || []).map(c => c == null ? '' : String(c).trim())).filter(r => r.some(c => c));
    if (!rows.length) return [];
    const head = rows[0], filled = head.filter(c => c);
    if (filled.length >= 2 && !filled.every(c => SSC_HEAD.test(c))) {
        return head.map((h, ci) => h ? { name: h, students: sscClean(rows.slice(1).map(r => r[ci])) } : null).filter(Boolean);
    }
    return [{ name: defName, students: sscClean(rows.map(r => r[0] || r.find(c => c))) }];
}
function sscParseCSV(txt) {
    const rows = []; let row = [], cur = '', q = false;
    const delim = (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
        else if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = ''; }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch;
    }
    row.push(cur); rows.push(row); return rows;
}
async function sscParseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase(), base = file.name.replace(/\.[^/.]+$/, '');
    let out = [];
    if (ext === 'xlsx' || ext === 'xls') {
        if (typeof XLSX === 'undefined') throw new Error('Excel reader not loaded (needs internet once, then it is cached). Use CSV instead.');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const generic = /^(sheet|ورقة)\s*\d*$/i;
        wb.SheetNames.forEach(sn => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false });
            out = out.concat(sscGrid(rows, (wb.SheetNames.length === 1 && generic.test(sn)) ? base : sn));
        });
    } else if (ext === 'csv' || ext === 'txt') {
        const txt = (await file.text()).replace(/^\uFEFF/, '');
        if (ext === 'txt' && !/[,;\t]/.test(txt.split('\n')[0])) out = sscFromLines(txt.split(/\r?\n/), base);
        else out = sscGrid(sscParseCSV(txt), base);
    } else if (ext === 'docx') {
        if (typeof mammoth === 'undefined') throw new Error('Word reader not loaded (needs internet once, then it is cached). Use Excel or CSV instead.');
        const res = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        const doc = new DOMParser().parseFromString('<div id="r">' + res.value + '</div>', 'text/html').getElementById('r');
        let cur = null, loose = [];
        const flush = () => { if (loose.length) { const s = sscClean(loose); if (s.length) out.push({ name: cur || base, students: s }); } loose = []; };
        Array.from(doc.children).forEach(el => {
            const tag = el.tagName.toLowerCase(), txt = el.textContent.trim();
            if (tag === 'table') {
                flush();
                const rows = Array.from(el.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(td => td.textContent.trim()));
                const ne = rows.filter(r => r.some(c => c));
                const oneCol = ne.length && ne.every(r => r.filter(c => c).length <= 1);
                if (oneCol && !cur && ne.length >= 2 && !SSC_HEAD.test(ne[0].find(c => c) || '')) out.push({ name: ne[0].find(c => c), students: sscClean(ne.slice(1).map(r => r.find(c => c))) });
                else out = out.concat(sscGrid(rows, cur || base));
                cur = null;
            } else if (tag === 'ul' || tag === 'ol') { Array.from(el.children).forEach(li => loose.push(li.textContent)); }
            else if (/^h[1-6]$/.test(tag) || /[:：]$/.test(txt) || /^(class|صف|الصف)\b/i.test(txt) || (el.querySelector('strong') && el.querySelector('strong').textContent.trim() === txt && txt.length < 40)) {
                flush(); cur = txt.replace(/^(class|الصف|صف)\s*[:：-]?\s*/i, '').replace(/[:：]$/, '').trim() || txt;
            } else if (txt) txt.split(/\n/).forEach(l => loose.push(l));
        });
        flush();
    } else throw new Error('Unsupported file type. Use .xlsx, .docx, .csv or .txt');
    // merge same-name classes, drop empties
    const m = {}; out.forEach(c => { if (!c.students.length) return; (m[c.name] = m[c.name] || []).push(...c.students); });
    return Object.keys(m).map(k => ({ name: k, students: sscClean(m[k]) }));
}
function sscFromLines(lines, base) {
    const out = []; let cur = null, buf = [];
    const flush = () => { if (buf.length) out.push({ name: cur || base, students: sscClean(buf) }); buf = []; };
    lines.forEach(l => { l = l.trim(); if (!l) return; if (/[:：]$/.test(l) || /^(class|الصف|صف)\b/i.test(l)) { flush(); cur = l.replace(/^(class|الصف|صف)\s*[:：-]?\s*/i, '').replace(/[:：]$/, '').trim(); } else buf.push(l); });
    flush(); return out;
}
function sscRenderImport() {
    const p = SSC.imp;
    let body = `<div class="note">Pick one file with all your classes. Nothing is uploaded: the file is read on this device and you see a preview before anything changes.</div>
    <div class="note"><b>Layouts that work:</b><br>• Excel: one sheet per class (sheet name = class), <u>or</u> one column per class (first row = class name)<br>• Word: one table per class (first row = class name, or one column per class), <u>or</u> a heading line for each class followed by names<br>• CSV: first row = class names, names below each</div>
    <button class="b" onclick="sscTemplate('xlsx')">⬇️ Download Excel template</button> <button class="b" onclick="sscTemplate('csv')">⬇️ CSV template</button> <button class="b" onclick="sscTemplate('docx')">⬇️ Word template</button>
    <label>Choose file (.xlsx .docx .csv .txt)</label><input type="file" id="sscFile" accept=".xlsx,.xls,.docx,.csv,.txt" onchange="sscPick(this)" style="color:#e2e8f0">`;
    let foot = '';
    if (SSC.err) body += `<div class="warn">⚠️ ${sscEsc(SSC.err)}</div>`;
    if (p) {
        const total = p.reduce((a, c) => a + c.students.length, 0);
        body += `<label>Preview: ${p.length} class(es), ${total} students from "${sscEsc(SSC.fileName)}"</label>`;
        body += p.map((c, i) => {
            const ex = appState.classes[c.name];
            return `<div class="pv"><div style="display:flex;gap:10px;align-items:center"><label style="margin:0"><input type="checkbox" ${c.on === false ? '' : 'checked'} onchange="SSC.imp[${i}].on=this.checked"> </label>
            <b style="flex:1">${sscEsc(c.name)}</b><span class="ct" style="color:#94a3b8">${c.students.length} students</span>
            ${ex ? `<select style="width:auto" onchange="SSC.imp[${i}].mode=this.value"><option value="merge" ${c.mode !== 'replace' ? 'selected' : ''}>Already exists: add new names</option><option value="replace" ${c.mode === 'replace' ? 'selected' : ''}>Already exists: replace list</option></select>` : '<span style="color:#22c55e;font-size:12px">new</span>'}</div>
            <div class="names">${c.students.map(sscEsc).join(' · ')}</div></div>`;
        }).join('');
        foot = `<button class="b" onclick="SSC.imp=null;sscRender()">Cancel</button><button class="b grn" onclick="sscConfirmImport()">✅ Confirm import</button>`;
    }
    sscShell(body, foot);
}
async function sscPick(inp) {
    const f = inp.files && inp.files[0]; if (!f) return;
    SSC.err = ''; SSC.fileName = f.name;
    try { SSC.imp = await sscParseFile(f); if (!SSC.imp.length) { SSC.imp = null; SSC.err = 'No classes with student names were found in this file. Check the layout or use the template.'; } }
    catch (e) { SSC.imp = null; SSC.err = e.message || 'Could not read the file.'; }
    sscRender();
}
function sscConfirmImport() {
    const picks = (SSC.imp || []).filter(c => c.on !== false); if (!picks.length) return showToast('Nothing selected');
    try { ssStatePut('before-import', JSON.parse(JSON.stringify(appState))); } catch (e) {}
    let added = 0;
    picks.forEach(c => {
        if (appState.classes[c.name] && c.mode !== 'replace') {
            const have = new Set(appState.classes[c.name].map(x => x.toLowerCase()));
            c.students.forEach(s => { if (!have.has(s.toLowerCase())) { appState.classes[c.name].push(s); added++; } });
        } else { appState.classes[c.name] = c.students.slice(); added += c.students.length; }
    });
    if (!appState.currentClass || !appState.classes[appState.currentClass]) appState.currentClass = picks[0].name;
    sscSave(); SSC.imp = null; SSC.tab = 'list'; showToast('✅ Imported ' + picks.length + ' class(es), ' + added + ' students'); sscRender();
}
function sscDownload(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function sscTemplate(kind) {
    const names = ((window.SM_ROSTER && window.SM_ROSTER.classes) || ['Class A', 'Class B', 'Class C']).slice(0, 3);
    const ex = i => [1, 2, 3].map(n => 'Student ' + n + ' name');
    if (kind === 'csv') {
        const rows = [names.join(',')].concat([0, 1, 2].map(i => names.map(() => 'Student ' + (i + 1) + ' name').join(',')));
        return sscDownload(new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv' }), 'SmartStudio_classes_template.csv');
    }
    if (kind === 'xlsx') {
        if (typeof XLSX === 'undefined') { showToast('Excel library not loaded, giving CSV'); return sscTemplate('csv'); }
        const wb = XLSX.utils.book_new();
        names.forEach(n => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Student name']].concat(ex().map(x => [x]))), n));
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        return sscDownload(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'SmartStudio_classes_template.xlsx');
    }
    if (kind === 'docx') {
        if (typeof JSZip === 'undefined') { showToast('Word builder not loaded, giving CSV'); return sscTemplate('csv'); }
        const p = t => `<w:p><w:r><w:t xml:space="preserve">${sscEsc(t)}</w:t></w:r></w:p>`;
        const tbl = n => `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>` +
            [n].concat([1, 2, 3].map(i => 'Student ' + i + ' name')).map(t => `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(t)}</w:tc></w:tr>`).join('') + '</w:tbl>' + p('');
        const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('One table per class. First row = class name. Replace the sample names, add or remove tables.')}${names.map(tbl).join('')}</w:body></w:document>`;
        const z = new JSZip();
        z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
        z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
        z.file('word/document.xml', doc);
        return sscDownload(await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'SmartStudio_classes_template.docx');
    }
}

// ============================================================================
// v9 3D SPORTS CORE (three.js): textures, humans, crowd, HUD, pointer plumbing
// ============================================================================
const P3 = { sc: null, key: null, m: 0, hud: null, ptr: { x: 0, y: 0, down: false }, clock: 0 };
function p3Tex(w, h, fn, rx, ry) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
    return t;
}
function p3Mat(color, rough, metal) { return new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.7 : rough, metalness: metal || 0 }); }
function p3SkyTex(top, mid, bot) {
    return p3Tex(16, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, w, h); });
}
function p3Human(o) {
    const g = new THREE.Group(), M = p3Mat, TAU = Math.PI * 2;
    const skin = M(o.skin || 0xd9a47a, 0.55), shirt = M(o.shirt, 0.55), shorts = M(o.shorts || 0x111827, 0.6), sock = M(o.sock || o.shirt, 0.7), boot = M(o.boot || 0x0f172a, 0.35, 0.05), glove = M(o.glove || o.skin || 0xd9a47a, 0.5), hair = M(o.hair || 0x1f1410, 0.8), trim = M(o.trim || 0xf8fafc, 0.6), dark = M(0x0b0f1a, 0.4);
    const ms = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx != null) m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
    const hip = new THREE.Group(); hip.position.y = 0.95; g.add(hip);
    const torso = new THREE.Group(); hip.add(torso);
    // torso: lathe profile (waist -> chest -> shoulders), flattened front-to-back
    const prof = [[0.001, -0.06], [0.15, -0.04], [0.165, 0.06], [0.155, 0.2], [0.175, 0.36], [0.2, 0.5], [0.205, 0.6], [0.17, 0.68], [0.08, 0.72], [0.001, 0.73]].map(p => new THREE.Vector2(p[0], p[1]));
    const body = ms(new THREE.LatheGeometry(prof, 28), shirt, 0, 0, 0, 1.12, 1, 0.66); torso.add(body);
    const hem = ms(new THREE.CylinderGeometry(0.168, 0.172, 0.05, 24), trim, 0, 0.0, 0, 1.12, 1, 0.66); torso.add(hem);
    const pel = ms(new THREE.SphereGeometry(0.2, 22, 16), shorts, 0, -0.03, 0, 0.95, 0.5, 0.7); hip.add(pel);
    const neck = ms(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 12), skin, 0, 0.75, 0); torso.add(neck);
    const col = ms(new THREE.TorusGeometry(0.075, 0.016, 8, 20), trim, 0, 0.7, 0, 1, 1, 1); col.rotation.x = Math.PI / 2; torso.add(col);
    const head = new THREE.Group(); head.position.y = 0.88; torso.add(head);
    head.add(ms(new THREE.SphereGeometry(0.112, 24, 18), skin, 0, 0, 0, 0.9, 1.1, 1.0));
    head.add(ms(new THREE.SphereGeometry(0.06, 14, 10), skin, 0, -0.075, -0.035, 0.95, 0.7, 0.9));      // jaw
    head.add(ms(new THREE.SphereGeometry(0.02, 8, 8), skin, 0, -0.02, -0.108, 1, 1.2, 0.9));            // nose
    [-1, 1].forEach(sx => { head.add(ms(new THREE.SphereGeometry(0.022, 8, 8), skin, sx * 0.102, -0.01, 0.0, 0.5, 1.2, 0.9)); head.add(ms(new THREE.SphereGeometry(0.012, 8, 8), dark, sx * 0.04, 0.022, -0.102)); });
    const hr = ms(new THREE.SphereGeometry(0.118, 20, 14, 0, TAU, 0, Math.PI * 0.52), hair, 0, 0.018, 0.012, 0.95, 1.08, 1.04); hr.rotation.x = -0.22; head.add(hr);
    if (o.number != null) {
        const nt = p3Tex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = o.numColor || '#fff'; c.font = '900 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(o.number), 64, 70); });
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: nt, transparent: true })); pl.position.set(0, 0.4, 0.13); torso.add(pl);
    }
    function arm(sx) {
        const u = new THREE.Group(); u.position.set(sx * 0.255, 0.62, 0); torso.add(u);
        u.add(ms(new THREE.SphereGeometry(0.058, 14, 12), shirt, 0, 0, 0));                                   // shoulder cap
        u.add(ms(new THREE.CylinderGeometry(0.056, 0.046, 0.3, 14), shirt, 0, -0.17, 0));                      // upper arm / sleeve
        u.add(ms(new THREE.CylinderGeometry(0.052, 0.05, 0.04, 14), trim, 0, -0.3, 0));                       // sleeve cuff
        const f = new THREE.Group(); f.position.y = -0.34; u.add(f);
        f.add(ms(new THREE.SphereGeometry(0.047, 12, 10), skin, 0, 0, 0));                                    // elbow
        f.add(ms(new THREE.CylinderGeometry(0.046, 0.034, 0.27, 12), skin, 0, -0.15, 0));                     // forearm
        const hd = new THREE.Group(); hd.position.y = -0.32; f.add(hd);
        if (o.glove) {                                                                                         // keeper glove: palm + fingers + thumb
            hd.add(ms(new THREE.SphereGeometry(0.06, 14, 10), glove, 0, -0.04, 0, 1.15, 1.0, 0.7));
            for (let i = 0; i < 4; i++) { const fg = ms(new THREE.CapsuleGeometry(0.0125, 0.06, 4, 8), glove, (i - 1.5) * 0.026, -0.115, 0); hd.add(fg); }
            const th = ms(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), glove, sx * -0.07, -0.05, 0); th.rotation.z = sx * 0.9; hd.add(th);
            hd.add(ms(new THREE.CylinderGeometry(0.044, 0.04, 0.03, 12), trim, 0, 0.0, 0));
        } else {
            hd.add(ms(new THREE.SphereGeometry(0.042, 12, 10), skin, 0, -0.035, 0, 1.0, 1.15, 0.6));
            for (let i = 0; i < 4; i++) hd.add(ms(new THREE.CapsuleGeometry(0.0095, 0.045, 3, 6), skin, (i - 1.5) * 0.02, -0.095, 0));
            const th = ms(new THREE.CapsuleGeometry(0.011, 0.04, 3, 6), skin, sx * -0.045, -0.04, -0.01); th.rotation.z = sx * 0.8; hd.add(th);
        }
        return { u, f, hand: hd };
    }
    function leg(sx) {
        const u = new THREE.Group(); u.position.set(sx * 0.105, -0.02, 0); hip.add(u);
        u.add(ms(new THREE.SphereGeometry(0.1, 14, 12), shorts, 0, 0, 0));
        u.add(ms(new THREE.CylinderGeometry(0.1, 0.074, 0.42, 16), shorts, 0, -0.22, 0));                      // thigh
        const k = new THREE.Group(); k.position.y = -0.46; u.add(k);
        k.add(ms(new THREE.SphereGeometry(0.066, 12, 10), skin, 0, 0, 0));                                    // knee
        k.add(ms(new THREE.CylinderGeometry(0.068, 0.045, 0.4, 14), sock, 0, -0.22, 0));                      // shin
        k.add(ms(new THREE.SphereGeometry(0.062, 12, 10), sock, 0, -0.14, 0.03, 1, 1.5, 0.95));              // calf bulge
        k.add(ms(new THREE.CylinderGeometry(0.07, 0.069, 0.035, 14), trim, 0, -0.07, 0));                     // sock band
        k.add(ms(new THREE.SphereGeometry(0.05, 10, 8), skin, 0, -0.43, 0));                                  // ankle
        const bm = ms(new THREE.SphereGeometry(0.075, 14, 10), boot, 0, -0.46, -0.06, 0.72, 0.62, 1.9); k.add(bm);   // boot
        k.add(ms(new THREE.BoxGeometry(0.098, 0.018, 0.27), M(0xf8fafc, 0.5), 0, -0.505, -0.065));            // sole
        return { u, k };
    }
    const aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);
    g.userData = { hip, torso, head, aL, aR, lL, lR };
    return g;
}
function p3Reset(h) { const d = h.userData; d.hip.position.y = 0.95; d.hip.rotation.set(0, 0, 0); d.torso.rotation.set(0, 0, 0); d.head.rotation.set(0, 0, 0); [d.aL, d.aR].forEach(a => { a.u.rotation.set(0, 0, 0); a.f.rotation.set(0, 0, 0); }); [d.lL, d.lR].forEach(l => { l.u.rotation.set(0, 0, 0); l.k.rotation.set(0, 0, 0); }); h.rotation.set(0, h.rotation.y, 0); }
function p3Crowd(scene, opt) {
    // stepped stand + instanced crowd. opt: {x,y,z,w,rows,rowH,rowD,ry,colors}
    const grp = new THREE.Group(); grp.position.set(opt.x, opt.y, opt.z); grp.rotation.y = opt.ry || 0; scene.add(grp);
    const stepMat = p3Mat(opt.step || 0x334155, 0.9);
    const n = opt.rows, per = Math.floor(opt.w / 0.62), cnt = n * per;
    const inst = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.19, 0.38, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), cnt);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), cnt);
    const base = [], col = new THREE.Color(), cols = opt.colors || [0xef4444, 0x3b82f6, 0xfacc15, 0xffffff, 0x22c55e, 0xf97316, 0x1e293b, 0xa855f7];
    const skins = [0xf2c9a0, 0xd9a47a, 0xb9855a, 0x8d5a3c, 0xe8b88c];
    let k = 0;
    for (let r = 0; r < n; r++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(opt.w, opt.rowH, opt.rowD), stepMat); st.position.set(0, r * opt.rowH + opt.rowH / 2, -r * opt.rowD); st.receiveShadow = true; grp.add(st);
        for (let i = 0; i < per; i++) {
            const x = (i - per / 2 + 0.5) * 0.62 + (Math.random() - 0.5) * 0.12, y = r * opt.rowH + opt.rowH + 0.38, z = -r * opt.rowD + (Math.random() - 0.5) * 0.1;
            base.push([x, y, z, Math.random() * 6.28, 0.5 + Math.random()]);
            col.setHex(cols[(Math.random() * cols.length) | 0]); inst.setColorAt(k, col);
            col.setHex(skins[(Math.random() * skins.length) | 0]); heads.setColorAt(k, col); k++;
        }
    }
    grp.add(inst); grp.add(heads);
    const d = new THREE.Object3D(), d2 = new THREE.Object3D();
    const upd = (t, excite) => {
        for (let i = 0; i < cnt; i++) {
            const b = base[i], up = Math.max(0, Math.sin(t * 0.06 * b[4] + b[3])) * (0.04 + excite * 0.22);
            d.position.set(b[0], b[1] + up, b[2]); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
            d2.position.set(b[0], b[1] + 0.42 + up, b[2]); d2.updateMatrix(); heads.setMatrixAt(i, d2.matrix);
        }
        inst.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    };
    upd(0, 0);
    return { grp, upd };
}
function p3Hud() {
    let h = document.getElementById('p3hud');
    if (!h) {
        const w = document.querySelector('.stage-viewport-wrap'); h = document.createElement('div'); h.id = 'p3hud';
        h.style.cssText = 'position:absolute;inset:0;pointer-events:none;font-family:inherit;z-index:6;';
        h.innerHTML = `<div id="p3name" style="position:absolute;left:18px;top:14px;background:rgba(2,6,23,.72);border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:8px 16px;color:#fff;font-weight:900;font-size:22px"></div>
        <div id="p3dots" style="position:absolute;left:18px;top:64px;color:#fff;font-weight:800;font-size:15px;background:rgba(2,6,23,.6);border-radius:10px;padding:4px 12px"></div>
        <div id="p3tip" style="position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(2,6,23,.72);color:#e2e8f0;border-radius:12px;padding:7px 16px;font-weight:800;font-size:15px;white-space:nowrap"></div>
        <div id="p3big" style="position:absolute;left:50%;top:38%;transform:translate(-50%,-50%) scale(1);font-weight:900;font-size:92px;color:#fff;text-shadow:0 6px 0 rgba(0,0,0,.45),0 0 40px rgba(0,0,0,.5);opacity:0;white-space:nowrap;letter-spacing:2px"></div>
        <div id="p3pow" style="position:absolute;right:22px;top:50%;transform:translateY(-50%);width:30px;height:230px;border-radius:15px;background:linear-gradient(#ef4444 0%,#facc15 22%,#22c55e 38%,#22c55e 62%,#facc15 78%,#ef4444 100%);border:3px solid #fff;box-shadow:0 0 18px rgba(0,0,0,.5)"><div id="p3ind" style="position:absolute;left:-10px;width:44px;height:8px;border-radius:4px;background:#fff;border:2px solid #0f172a;bottom:50%"></div><div style="position:absolute;top:-26px;left:-14px;width:60px;text-align:center;color:#fff;font-weight:900;font-size:12px">POWER</div></div>
        <div id="p3auto" style="position:absolute;left:18px;bottom:14px;pointer-events:auto;cursor:pointer;background:#2563eb;color:#fff;border-radius:12px;padding:8px 14px;font-weight:900;font-size:14px">🎲 Auto shot</div>`;
        w.appendChild(h);
    }
    return h;
}
function p3Say(id, txt) { const e = document.getElementById(id); if (e && e.textContent !== txt) e.textContent = txt; }
function p3Big(txt, color) {
    const e = document.getElementById('p3big'); if (!e) return;
    e.textContent = txt || ''; e.style.color = color || '#fff'; e.style.opacity = txt ? '1' : '0';
    e.style.transform = 'translate(-50%,-50%) scale(1)';
    if (txt) { e.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .6 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 420, easing: 'ease-out' }); }
}
function p3HudRemove() { const h = document.getElementById('p3hud'); if (h) h.remove(); const o = document.getElementById('fhOv'); if (o) o.remove(); }
function p3Thud(f, d, v) { try { rksBeep(f, d || 0.12, v || 0.12, 'sine'); } catch (e) {} }
function p3Noise(d, v, f0) { // short noise burst (kick / net / crowd)
    try {
        const c = rksOk(); if (!c) return; const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), a = b.getChannelData(0);
        for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 2);
        const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f0 || 1200; const g = c.createGain(); g.gain.value = v || 0.2;
        s.connect(fl); fl.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
}
// pointer plumbing: converts a pointer event to NDC and calls handlers set in P3.on
function p3BindPointer() {
    const c = document.getElementById('stageCanvas3D'); if (!c || c._p3) return; c._p3 = true;
    const ndc = e => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', e => { if (!P3.on) return; const [x, y] = ndc(e); P3.ptr.down = true; try { c.setPointerCapture(e.pointerId); } catch (x) {} P3.on('down', x, y); });
    c.addEventListener('pointermove', e => { if (!P3.on) return; const [x, y] = ndc(e); P3.on('move', x, y); });
    c.addEventListener('pointerup', e => { if (!P3.on) return; const [x, y] = ndc(e); P3.ptr.down = false; P3.on('up', x, y); });
    const a = document.getElementById('p3auto'); if (a) a.onclick = () => { if (P3.on) P3.on('auto'); };
}

// ============================================================================
// v9 PENALTY SHOOTOUT 3D — student aims (reticle on the goal) + power bar; real ball physics + keeper
// Goal at z=0 facing +z, penalty spot z=11. x right, y up. Units: metres. 60 ticks = 1 s.
// ============================================================================
const PK = { built: null, ph: 'ready', t: 0, ball: null, vel: new THREE.Vector3(), spin: new THREE.Vector3(), aim: { x: 0.6, y: 1.2 }, pw: 0.5, shot: 0, goals: 0, queue: [], qi: 0, res: '', conf: [], ripple: null, camPos: new THREE.Vector3(1.2, 2.4, 17.5), camLook: new THREE.Vector3(0, 1.1, 0), kd: null, touched: false, wood: false, hist: [] };
const PK_G = 9.81, PK_R = 0.11, PK_HW = 3.66, PK_H = 2.44;
function pkPitchTex() {
    return p3Tex(1400, 1200, (c, w, h) => {
        const X = x => (x + 35) * 20, Z = z => (z + 10) * 20;
        for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#2f8f3a' : '#37a044'; c.fillRect(0, Z(-10 + i * 5.5), w, 5.5 * 20 + 1); }
        for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < .5 ? 'rgba(0,40,0,.06)' : 'rgba(180,255,150,.05)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 6); }
        c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 5; c.lineCap = 'square';
        const L = (x1, z1, x2, z2) => { c.beginPath(); c.moveTo(X(x1), Z(z1)); c.lineTo(X(x2), Z(z2)); c.stroke(); };
        L(-34, 0, 34, 0); L(-20.16, 0, -20.16, 16.5); L(20.16, 0, 20.16, 16.5); L(-20.16, 16.5, 20.16, 16.5);
        L(-9.16, 0, -9.16, 5.5); L(9.16, 0, 9.16, 5.5); L(-9.16, 5.5, 9.16, 5.5);
        c.save(); c.beginPath(); c.rect(0, Z(16.5), w, h); c.clip(); c.beginPath(); c.arc(X(0), Z(11), 9.15 * 20, 0, Math.PI * 2); c.stroke(); c.restore();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(X(0), Z(11), 7, 0, 7); c.fill();
    });
}
function pkBallTex() {
    return p3Tex(512, 256, (c, w, h) => {
        c.fillStyle = '#f8fafc'; c.fillRect(0, 0, w, h); c.fillStyle = '#111827';
        const pts = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) pts.push([(i + (j % 2) * 0.5) * w / 6 + 40, (j + 0.5) * h / 4]);
        pts.forEach(p => { c.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 - 1.57; const rx = 30, ry = 30; const x = p[0] + Math.cos(a) * rx, y = p[1] + Math.sin(a) * ry; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fill(); });
        c.strokeStyle = 'rgba(30,41,59,.5)'; c.lineWidth = 2; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(i * w / 12, 0); c.lineTo(i * w / 12, h); c.stroke(); }
    });
}
function pkNetTex() { return p3Tex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke(); }, 1, 1); }
function pkNetMesh(verts, uvs, idx, tx, ty) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    const t = pkNetTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(tx, ty);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9 }));
}
function pkBuild() {
    const sc = S3.scene, cam = S3.camera, rn = S3.renderer;
    PK.built = sc; PK.conf = [];
    rn.shadowMap.enabled = true; rn.shadowMap.type = THREE.PCFSoftShadowMap; rn.toneMapping = THREE.ACESFilmicToneMapping; rn.toneMappingExposure = 1.15;
    cam.fov = 38; cam.near = 0.1; cam.far = 400; cam.updateProjectionMatrix();
    sc.background = new THREE.Color(0x0a1224); sc.fog = new THREE.Fog(0x0a1224, 55, 150);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.MeshBasicMaterial({ map: p3SkyTex('#050914', '#14264a', '#3b4f7a'), side: THREE.BackSide, fog: false })); sc.add(sky);
    sc.add(new THREE.HemisphereLight(0xbfd4ff, 0x244a2a, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.25); sun.position.set(14, 34, 26); sun.target.position.set(0, 0, 6); sc.add(sun, sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sh = sun.shadow.camera; sh.left = -16; sh.right = 16; sh.top = 18; sh.bottom = -14; sh.near = 5; sh.far = 90; sun.shadow.bias = -0.0004;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(70, 60), new THREE.MeshStandardMaterial({ map: pkPitchTex(), roughness: 0.95 })); pitch.rotation.x = -Math.PI / 2; pitch.position.set(0, 0, 20); pitch.receiveShadow = true; sc.add(pitch);
    const out = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), p3Mat(0x1a5a2a, 1)); out.rotation.x = -Math.PI / 2; out.position.set(0, -0.02, 20); sc.add(out);
    // goal
    const white = p3Mat(0xf8fafc, 0.35, 0.1), grey = p3Mat(0xcbd5e1, 0.5, 0.3);
    const post = (x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, PK_H + 0.06, 16), white); m.position.set(x, PK_H / 2, 0); m.castShadow = true; sc.add(m); };
    post(-PK_HW); post(PK_HW);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, PK_HW * 2 + 0.12, 16), white); bar.rotation.z = Math.PI / 2; bar.position.set(0, PK_H, 0); bar.castShadow = true; sc.add(bar);
    [[-1], [1]].forEach(([s]) => {
        const a = new THREE.Vector3(s * PK_HW, PK_H, 0), b = new THREE.Vector3(s * PK_HW, PK_H, -1.0), c2 = new THREE.Vector3(s * PK_HW, 0, -2.0);
        [[a, b], [b, c2]].forEach(([p, q]) => { const len = p.distanceTo(q); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), grey); m.position.copy(p).add(q).multiplyScalar(0.5); m.lookAt(q); m.rotateX(Math.PI / 2); sc.add(m); });
    });
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, PK_HW * 2, 8), grey); back.rotation.z = Math.PI / 2; back.position.set(0, PK_H, -1.0); sc.add(back);
    const gnd = back.clone(); gnd.position.set(0, 0.02, -2.0); sc.add(gnd);
    // nets
    const NX = 36, NY = 14, bv = [], bu = [], bi = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY; bv.push(-PK_HW + u * PK_HW * 2, PK_H * (1 - v), -(1.0 + v * 1.0)); bu.push(u, v); }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i; bi.push(a, a + 1, a + NX + 1, a + 1, a + NX + 2, a + NX + 1); }
    PK.net = pkNetMesh(bv, bu, bi, 28, 11); PK.netBase = Float32Array.from(bv); sc.add(PK.net);
    const sideNet = (x) => { const m = pkNetMesh([x, 0, 0, x, PK_H, 0, x, PK_H, -1, x, 0, -2], [0, 0, 0, 1, 1, 1, 1, 0], [0, 1, 2, 0, 2, 3], 6, 6); sc.add(m); }; sideNet(-PK_HW); sideNet(PK_HW);
    sc.add(pkNetMesh([-PK_HW, PK_H, 0, PK_HW, PK_H, 0, PK_HW, PK_H, -1, -PK_HW, PK_H, -1], [0, 0, 1, 0, 1, 1, 0, 1], [0, 1, 2, 0, 2, 3], 20, 4));
    // stadium
    PK.crowds = [p3Crowd(sc, { x: 0, y: 0, z: -15, w: 80, rows: 9, rowH: 0.62, rowD: 0.85, ry: 0 }), p3Crowd(sc, { x: -41, y: 0, z: 18, w: 60, rows: 8, rowH: 0.62, rowD: 0.85, ry: Math.PI / 2 }), p3Crowd(sc, { x: 41, y: 0, z: 18, w: 60, rows: 8, rowH: 0.62, rowD: 0.85, ry: -Math.PI / 2 })];
    const adT = p3Tex(1024, 64, (c, w, h) => { const cs = ['#1d4ed8', '#dc2626', '#16a34a', '#f59e0b']; for (let i = 0; i < 4; i++) { c.fillStyle = cs[i]; c.fillRect(i * 256, 0, 256, h); c.fillStyle = '#fff'; c.font = '900 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['ALL STARS', 'ALFORQAN - STUDIO', 'SCHOOL CUP', 'PENALTY'][i], i * 256 + 128, 34); } }, 6, 1);
    const ads = new THREE.Mesh(new THREE.BoxGeometry(74, 0.95, 0.15), new THREE.MeshStandardMaterial({ map: adT, emissive: 0xffffff, emissiveMap: adT, emissiveIntensity: 0.55 })); ads.position.set(0, 0.48, -9); sc.add(ads);
    [-1, 1].forEach(s => { const a = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.95, 60), ads.material); a.position.set(s * 36.5, 0.48, 18); sc.add(a); });
    [[-30, -10], [30, -10], [-34, 40], [34, 40]].forEach(([x, z]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 26, 8), p3Mat(0x475569, 0.8)); p.position.set(x, 13, z); sc.add(p);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff })); lamp.position.set(x, 27, z); lamp.lookAt(0, 10, 10); sc.add(lamp);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: p3Tex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,255,230,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, fog: false })); glow.scale.set(22, 22, 1); glow.position.copy(lamp.position); sc.add(glow);
    });
    // ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(PK_R, 32, 24), new THREE.MeshStandardMaterial({ map: pkBallTex(), roughness: 0.45 })); ball.castShadow = true; sc.add(ball); PK.ballMesh = ball;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.01, 11); sc.add(spot);
    // people
    PK.keeper = new THREE.Group(); PK.kh = p3Human({ shirt: 0xfacc15, shorts: 0x111827, sock: 0x111827, glove: 0xffffff, skin: 0xc68a62, number: 1, numColor: '#111' }); PK.kh.rotation.y = Math.PI; PK.keeper.add(PK.kh); sc.add(PK.keeper);
    PK.shooter = p3Human({ shirt: 0xdc2626, shorts: 0xffffff, sock: 0xdc2626, skin: 0xd9a47a, number: 10, numColor: '#fff' }); sc.add(PK.shooter);
    // reticle + guide line
    const ret = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 40), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95, depthTest: false })); ret.add(ring);
    [[0.42, 0.04], [0.04, 0.42]].forEach(([w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xfde047, depthTest: false })); ret.add(m); });
    ret.children.forEach(m => m.renderOrder = 20); ret.position.z = 0.05; sc.add(ret); PK.ret = ret;
    const gl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineDashedMaterial({ color: 0xfde047, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.7, depthTest: false })); gl.renderOrder = 19; sc.add(gl); PK.guide = gl;
    // confetti
    const cg = new THREE.BufferGeometry(), N = 240; cg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    PK.confP = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false })); PK.confP.visible = false; PK.confP.frustumCulled = false; sc.add(PK.confP); PK.confV = [];
}
function pkSetupHud() {
    const h = p3Hud(); h.style.display = 'block'; p3BindPointer(); P3.on = pkOn;
}
function pkQueueNext() {
    if (PK.qi >= PK.queue.length) { PK.queue = ss9Pool(8); PK.qi = 0; if (!PK.queue.length) PK.queue = ['Student']; }
    PK.shooterName = PK.queue[PK.qi++]; PK.shot = 0; PK.hist = [];
}
function pkPrepare() {
    if (!S3.active || (S3.mode !== 18)) return false;
    if (PK.built !== S3.scene) pkBuild();
    pkSetupHud(); pkLevelBtn();
    PK.queue = ss9Pool(8); PK.qi = 0; if (!PK.queue.length) PK.queue = ['Student'];
    pkQueueNext(); pkReset(true);
    ssG = { mode: 18, names: PK.queue, winnerIdx: 0, phase: 'idle', parts: [] }; stageTick = 0; PK.ph = isStageRunning ? 'aim' : 'ready';
    PK.goals = 0; PK.res = '';
    return true;
}
function pkReset(first) {
    PK.ph = (isStageRunning || !first) ? 'aim' : 'ready'; PK.t = 0; PK.touched = false; PK.wood = false; PK.res = ''; PK.kd = null; PK.crossed = false; PK.fired = false;
    PK.ballMesh.position.set(0, PK_R, 11); PK.ballMesh.rotation.set(0, 0, 0); PK.vel.set(0, 0, 0); PK.spin.set(0, 0, 0);
    PK.ballPos = new THREE.Vector3(0, PK_R, 11);
    PK.keeper.position.set(0, 0, 0.45); PK.keeper.rotation.set(0, 0, 0); p3Reset(PK.kh); PK.kh.rotation.y = Math.PI;
    PK.shooter.position.set(-3.6, 0, 13.4); PK.shooter.rotation.y = pkHeading(0.4, 11 - 14.2 + 0.0, -2.8 + 0);
    p3Reset(PK.shooter); PK.conf = []; if (PK.confP) PK.confP.visible = false;
    p3Big('');
    if (PK.net) { PK.ripple = null; PK.net.geometry.attributes.position.array.set(PK.netBase); PK.net.geometry.attributes.position.needsUpdate = true; }
    PK.camPos.set(3.2, 3.6, 17.5); PK.camLook.set(0, 0.9, 0);
}
function pkHeading(tx, tz, fx) { return Math.atan2(-(tx - fx), -(tz)); }
function pkClampAim(x, y) { return { x: Math.max(-4.7, Math.min(4.7, x)), y: Math.max(0.12, Math.min(3.3, y)) }; }
function pkNdcToGoal(nx, ny) {
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(nx, ny), S3.camera);
    const o = rc.ray.origin, d = rc.ray.direction; if (Math.abs(d.z) < 1e-4) return null; const t = -o.z / d.z; if (t < 0) return null;
    return pkClampAim(o.x + d.x * t, o.y + d.y * t);
}
PK.level = (function () { try { return localStorage.getItem(smk7('SGE_SM_PK_LEVEL')) || 'normal'; } catch (e) { return 'normal'; } })();
const PK_LV = { easy: { sl: 0.55, kp: 0.6, st: 0.5 }, normal: { sl: 1, kp: 1, st: 1 }, hard: { sl: 1.5, kp: 1.3, st: 1.25 } };
function pkApplyEnd(nx, ny) {
    const a = pkNdcToGoal(nx, ny); if (!a) return; let x = a.x, y = a.y;
    if (Math.abs(x) < PK_HW + 0.5 && y < PK_H + 0.4) { x = Math.max(-(PK_HW - 0.3), Math.min(PK_HW - 0.3, x)); y = Math.min(PK_H - 0.25, Math.max(0.15, y)); PK.snap = true; } else PK.snap = false;
    PK.aim = { x, y };
    const st = PK.stroke || [], p0 = st[0] || [nx, ny], dx = nx - p0[0], dy = ny - p0[1], len = Math.hypot(dx, dy); let wob = 0;
    if (st.length > 3 && len > 0.05) { let sum = 0; st.forEach(q => { sum += Math.abs((q[0] - p0[0]) * dy - (q[1] - p0[1]) * dx) / len; }); wob = sum / st.length / len; }
    PK.q = { len, wob }; PK.pw = Math.max(0.3, Math.min(0.7, 0.3 + len * 0.36));
}
function pkOn(kind, nx, ny) {
    if (activeStageMode !== 18 || !isStageRunning) return;
    if (kind === 'auto') { if (PK.ph === 'aim') pkFire(((Math.random() < .5 ? -1 : 1) * (1.2 + Math.random() * 2.1)), 0.3 + Math.random() * 1.9, 0.5); return; }
    if (PK.ph !== 'aim') return;
    if (kind === 'down') { PK.drag = true; PK.stroke = [[nx, ny]]; PK.strokeFade = 0; pkApplyEnd(nx, ny); }
    else if (kind === 'move' && PK.drag) { const l = PK.stroke[PK.stroke.length - 1]; if (Math.hypot(nx - l[0], ny - l[1]) > 0.012) PK.stroke.push([nx, ny]); pkApplyEnd(nx, ny); }
    else if (kind === 'up' && PK.drag) { PK.drag = false; if (PK.stroke.length < 2) PK.stroke.push([nx, ny]); pkApplyEnd(nx, ny); PK.strokeFade = 45; pkFire(PK.aim.x, PK.aim.y, PK.pw); }
}
function pkSim(v0, pos, steps) { // trajectory to z=0 plane with drag (no collisions)
    const p = pos.clone(), v = v0.clone(), dt = 1 / 180;
    for (let i = 0; i < 400 && p.z > 0; i++) { const sp = v.length(); v.addScaledVector(v, -0.0133 * sp * dt); v.y -= PK_G * dt; p.addScaledVector(v, dt); if (p.y < PK_R) { p.y = PK_R; v.y = Math.abs(v.y) * 0.6; } }
    return p;
}
function pkFire(ax, ay, pw) {
    if (PK.ph !== 'aim') return;
    PK.pw = pw; const LV = PK_LV[PK.level] || PK_LV.normal, Q = PK.q; PK.q = null; let ex = 0; if (Q) { if (Q.len < 0.85) ex += (0.85 - Q.len) * 3.6; if (Q.wob > 0.02) ex += (Q.wob - 0.02) * 26; } const sig = 0.05 + ex * LV.sl;
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    const tx = ax + gauss() * sig, ty = Math.max(0.05, ay + gauss() * sig);
    const sp0 = 17 + 10 * pw, B = new THREE.Vector3(0, PK_R, 11), T = new THREE.Vector3(tx, ty, 0);
    const L = B.distanceTo(T), t = L / sp0;
    const v = new THREE.Vector3((tx - B.x) / t, (ty - B.y + 0.5 * PK_G * t * t) / t, -11 / t);
    for (let k = 0; k < 6; k++) { const e = pkSim(v, B); v.x -= (e.x - tx) / t; v.y -= (e.y - ty) / t; }
    PK.launch = v; PK.target = { x: tx, y: ty }; PK.aimShown = { x: ax, y: ay }; PK.ph = 'run'; PK.t = 0; PK.fired = true;
    // keeper reads the aim: 50% he picks the right side, else a wrong one; reach is limited by physics
    const right = Math.random() < Math.min(0.92, (Math.abs(ax) < 1.7 ? 0.9 : 0.5) * LV.kp); let dir = ax >= 0 ? 1 : -1; if (Math.abs(ax) < 0.5) dir = Math.random() < .5 ? -1 : 1; if (!right) dir = -dir;
    const stay = Math.abs(ax) < 1.0 && Math.abs(ay - 1.0) < 1.2 && Math.random() < Math.min(0.95, 0.85 * LV.kp);
    const kt = { x: dir * Math.max(0.8, Math.abs(ax) + (Math.random() - 0.5) * 0.5), y: Math.max(0.4, ay + (Math.random() - 0.5) * 0.8) };
    if (!right) { kt.x = dir * (1.4 + Math.random() * 1.8); kt.y = 0.4 + Math.random() * 1.7; }
    const hx = dir * Math.max(0, Math.min(1.9, Math.abs(kt.x) - 1.0)), hy = Math.max(0.35, Math.min(1.15, kt.y - 0.95));
    const th = Math.min(1.42, Math.atan2(Math.abs(kt.x) - Math.abs(hx), Math.max(0.12, kt.y - hy)));
    PK.kd = { dir, hx: stay ? 0 : hx, hy: stay ? 0 : hy, th: stay ? 0 : th, start: 9, dur: Math.round(24 / (LV.st > 1 ? 1.15 : LV.st < 1 ? 0.8 : 1)), stay };
    p3Say('p3tip', '');
}
function pkKeeperPose(tk) {
    const k = PK.kh.userData, kd = PK.kd, root = PK.keeper; p3Reset(PK.kh); PK.kh.rotation.y = Math.PI;
    const sway = Math.sin(P3.clock * 0.09) * 0.05;
    if (!kd || tk < kd.start - 6) { // relaxed upright stance: feet together, arms down at the sides, gentle breathing and weight shift
        const br = Math.sin(P3.clock * 0.07), ws = Math.sin(P3.clock * 0.03);
        root.position.x = 0; root.position.y = 0; root.rotation.z = 0;
        k.hip.position.y = 0.95 + 0.004 * br; k.hip.rotation.z = 0.02 * ws;
        k.lL.u.rotation.x = -0.04; k.lR.u.rotation.x = -0.04; k.lL.k.rotation.x = 0.08; k.lR.k.rotation.x = 0.08; k.lL.u.rotation.z = 0.025; k.lR.u.rotation.z = -0.025;
        k.torso.rotation.x = 0.03 + 0.012 * br; k.torso.rotation.z = -0.02 * ws; k.head.rotation.x = -0.03;
        [k.aL, k.aR].forEach((a, i) => { const sg = i ? -1 : 1; a.u.rotation.z = sg * (0.13 + 0.01 * br); a.u.rotation.x = 0.04; a.f.rotation.x = -0.22; a.hand.rotation.z = sg * -0.1; });
        return;
    }
    const u = Math.max(0, Math.min(1, (tk - kd.start) / kd.dur)), e = 1 - Math.pow(1 - u, 2.4), e2 = u * u * (3 - 2 * u);
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const lt = tk - (kd.start + kd.dur), land = sm(lt / 9), rec = sm((lt - 34) / 24);   // landing, then get-up
    const crouch = sm((tk - (kd.start - 6)) / 6) * (1 - sm((tk - kd.start) / 4));       // push-off crouch
    root.position.x = kd.hx * e; root.position.y = (kd.hy * 1.25 + 0.12) * Math.sin(Math.min(1, e) * Math.PI * 0.5) * (1 - land) + 0.2 * Math.sin(Math.min(1, u * 1.1) * Math.PI) * (1 - land);
    root.rotation.z = -kd.dir * kd.th * e2 * (1 - rec);
    if (kd.stay) { k.hip.position.y = 0.9 + 0.12 * Math.sin(u * Math.PI) - 0.1 * crouch; [k.aL, k.aR].forEach((a, i) => { a.u.rotation.z = (i ? -1 : 1) * 2.3 * e2 * (1 - rec); a.f.rotation.x = -0.15; }); k.torso.rotation.x = -0.1 * (1 - e2); return; }
    k.hip.position.y = 0.92 - 0.14 * crouch - 0.1 * land * (1 - rec) + 0.0;
    const lead = kd.dir; // arms stretch overhead toward the ball, legs trail and scissor
    [k.aL, k.aR].forEach((a, i) => { const lead2 = (i ? 1 : -1) * kd.dir > 0; a.u.rotation.x = -Math.PI * e2 * (lead2 ? 0.98 : 0.9) * (1 - 0.85 * rec); a.u.rotation.z = (i ? -1 : 1) * (0.15 * (1 - e2) + 0.1 * e2); a.f.rotation.x = -0.1 - 0.5 * land * (1 - rec); });
    k.lL.u.rotation.x = 0.4 * e2 * (1 - rec); k.lR.u.rotation.x = -0.3 * e2 * (1 - rec); k.lL.k.rotation.x = (0.6 * e2 + 0.3 * land) * (1 - rec); k.lR.k.rotation.x = (0.9 * e2) * (1 - rec);
    k.lL.u.rotation.z = 0.15 * e2 * (1 - rec); k.lR.u.rotation.z = -0.25 * e2 * (1 - rec);
    k.torso.rotation.x = -0.1 * (1 - e2) + 0.12 * land * (1 - rec); k.torso.rotation.z = -kd.dir * 0.2 * e2 * (1 - rec); k.head.rotation.x = -0.25 * e2 * (1 - rec);
}
function pkSegDist(p, a, b) { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return a.clone().addScaledVector(ab, t); }
const PK_POSTS = [[new THREE.Vector3(-PK_HW, 0, 0), new THREE.Vector3(-PK_HW, PK_H, 0)], [new THREE.Vector3(PK_HW, 0, 0), new THREE.Vector3(PK_HW, PK_H, 0)], [new THREE.Vector3(-PK_HW, PK_H, 0), new THREE.Vector3(PK_HW, PK_H, 0)]];
function pkKeeperSpheres() {
    PK.keeper.updateMatrixWorld(true); const k = PK.kh.userData, out = [], v = new THREE.Vector3();
    const add = (o, r, off, tag) => { o.getWorldPosition(v); const c = v.clone(); if (off) { const q = new THREE.Vector3(off[0], off[1], off[2]); o.localToWorld(q); c.copy(q); } out.push([c, r, tag]); };
    const big = PK.kd && PK.kd.stay ? 2.3 : 1; [k.aL, k.aR].forEach(a => { add(a.hand, 0.2 * big, [0, -0.09, 0], 'hand'); add(a.f, 0.11, [0, -0.15, 0], 'arm'); add(a.u, 0.11, [0, -0.17, 0], 'arm'); });
    add(k.torso, 0.24 * (big > 1 ? 1.6 : 1), [0, 0.2, 0]); add(k.torso, 0.24 * (big > 1 ? 1.6 : 1), [0, 0.52, 0]); add(k.hip, 0.2); add(k.head, 0.14);
    [k.lL, k.lR].forEach(l => { add(l.u, 0.12, [0, -0.2, 0]); add(l.k, 0.11, [0, -0.2, 0]); });
    return out;
}
function pkBallStep(dt) {
    const p = PK.ballPos, v = PK.vel, sp = v.length();
    v.addScaledVector(v, -0.0133 * sp * dt); v.y -= PK_G * dt;
    // Magnus-lite sideways curl from spin.y
    v.x += PK.spin.y * 0.02 * dt * sp; p.addScaledVector(v, dt);
    if (p.y < PK_R) { p.y = PK_R; if (v.y < 0) { v.y = -v.y * 0.62; v.x *= 0.93; v.z *= 0.93; if (Math.abs(v.y) > 1.2) p3Thud(120, 0.07, 0.06); } if (Math.abs(v.y) < 0.4) v.y = 0; const roll = 1 - 0.35 * dt; if (p.y <= PK_R + 1e-4) { v.x *= roll; v.z *= roll; } }
    PK_POSTS.forEach(([a, b]) => {
        const c = pkSegDist(p, a, b), d = p.clone().sub(c), L = d.length();
        if (L < PK_R + 0.06) { const n = d.multiplyScalar(1 / (L || 1)); const vn = v.dot(n); if (vn < 0) { v.addScaledVector(n, -(1 + 0.55) * vn); v.multiplyScalar(0.9); PK.wood = true; p.copy(c).addScaledVector(n, PK_R + 0.062); p3Thud(900, 0.18, 0.18); p3Noise(0.12, 0.12, 4000); } }
    });
    if (PK.ph === 'fly' && !PK.crossed) {
        pkKeeperSpheres().forEach(([c, r, tag]) => {
            const d = p.clone().sub(c), L = d.length();
            if (L < PK_R + r) {
                const n = d.multiplyScalar(1 / (L || 1)), vn = v.dot(n);
                if (vn < 0) {
                    if (tag === 'hand') {            // gloves: the ball is parried / smothered and drops away from goal
                        v.addScaledVector(n, -(1 + 0.15) * vn); v.multiplyScalar(0.38); v.z = Math.abs(v.z) * 0.5 + 1.8; v.y = Math.max(v.y, 0.8) + 0.6; v.x += (Math.random() - 0.5) * 2.0; PK.handSave = true;
                        if (!PK.touched) { p3Noise(0.16, 0.3, 700); p3Thud(160, 0.1, 0.12); }
                    } else { v.addScaledVector(n, -(1 + 0.3) * vn); v.multiplyScalar(0.7); v.z = Math.abs(v.z) * 0.8 + 1.5; if (!PK.touched) { p3Noise(0.12, 0.25, 600); } }
                    PK.touched = true; p.copy(c).addScaledVector(n, PK_R + r + 0.001);
                }
            }
        });
    }
    // net containment once past the line inside the frame
    if (p.z < 0 && Math.abs(p.x) < PK_HW + 0.05 && p.y < PK_H + 0.1) {
        if (!PK.crossed && p.z < -PK_R) { PK.crossed = true; PK.goal = (Math.abs(p.x) < PK_HW - 0.0 && p.y < PK_H - 0.0); if (PK.goal) { PK.ripple = { x: p.x, y: p.y, t: 0, a: Math.min(0.9, 0.18 + v.length() * 0.025) }; p3Noise(0.5, 0.3, 2500); } }
        const zb = -(1.0 + Math.max(0, Math.min(1, (PK_H - p.y) / PK_H))) + PK_R; // sloping back net
        if (p.z < zb) { p.z = zb; if (v.z < 0) { v.z *= -0.12; v.x *= 0.35; v.y *= 0.35; } }
        if (p.y > PK_H - PK_R && p.z > -1.0) { p.y = PK_H - PK_R; if (v.y > 0) v.y *= -0.1; }
        if (Math.abs(p.x) > PK_HW - PK_R) { p.x = Math.sign(p.x) * (PK_HW - PK_R); v.x *= -0.1; }
        v.multiplyScalar(1 - 3.5 * dt);
    }
}
function pkEndShot(res) {
    PK.ph = 'result'; PK.t = 0; PK.res = res; PK.hist.push(res === 'goal');
    if (res === 'goal') { PK.goals++; p3Big('GOAL!', '#facc15'); p3Noise(1.4, 0.18, 3000); StudioAudioManager.playSFX('cheer'); pkConfetti(); }
    else if (res === 'saved') { p3Big('SAVED!', '#fb7185'); p3Noise(0.5, 0.1, 800); }
    else if (res === 'post') { p3Big('OFF THE POST!', '#fbbf24'); }
    else p3Big('MISSED!', '#cbd5e1');
}
function pkConfetti() {
    PK.confV = []; const pos = PK.confP.geometry.attributes.position.array, col = PK.confP.geometry.attributes.color.array, cs = [[1, .3, .3], [.3, .6, 1], [1, .85, .2], [.4, 1, .5], [1, 1, 1], [.9, .4, 1]];
    for (let i = 0; i < 240; i++) { pos[i * 3] = (Math.random() - 0.5) * 4; pos[i * 3 + 1] = 3.5 + Math.random() * 1.5; pos[i * 3 + 2] = 2 + Math.random() * 3; const c = cs[i % 6]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; PK.confV.push([(Math.random() - 0.5) * 2.5, Math.random() * 2, (Math.random() - 0.5) * 2]); }
    PK.confP.visible = true; PK.confP.geometry.attributes.position.needsUpdate = true; PK.confP.geometry.attributes.color.needsUpdate = true;
}
function pkStep() {
    if (PK.ph === 'ready') { PK.ph = 'aim'; PK.t = 0; }
    PK.t++; const t = PK.t, S = PK.shooter, k = PK.kh.userData;
    if (PK.ph === 'aim') {
        P3.clock++;
        p3Say('p3name', '⚽ ' + PK.shooterName); p3Say('p3tip', 'Draw the ball path toward the goal with your finger or mouse, then let go to kick');
        document.getElementById('stageWinnerBanner').textContent = '⚽ ' + PK.shooterName + ' to shoot';
    } else if (PK.ph === 'run') {
        const RUN = 46, u = Math.min(1, t / RUN);
        const sx = -3.6 + (-0.55 - -3.6) * u + Math.sin(u * Math.PI) * 0.7 * (1 - u), sz = 13.4 + (11.55 - 13.4) * u + Math.sin(u * Math.PI) * 0.3; S.position.set(sx, 0, sz); S.rotation.y = pkHeading(0, 11 - sz, sx - 0.0 + 0);
        const ph = t * 0.21, L = S.userData; p3Reset(S);
        if (t < RUN - 10) { L.lL.u.rotation.x = Math.sin(ph) * 0.8; L.lR.u.rotation.x = -Math.sin(ph) * 0.8; L.lL.k.rotation.x = -Math.max(0, -Math.sin(ph)) * 1.3; L.lR.k.rotation.x = -Math.max(0, Math.sin(ph)) * 1.3; L.aL.u.rotation.x = -Math.sin(ph) * 0.7; L.aR.u.rotation.x = Math.sin(ph) * 0.7; L.aL.f.rotation.x = -0.9; L.aR.f.rotation.x = -0.9; L.torso.rotation.x = 0.12; L.hip.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.025; }
        else { const w = (t - (RUN - 10)) / 10; // plant left, swing right
            L.lL.u.rotation.x = 0.2; L.lL.k.rotation.x = -0.25; L.torso.rotation.x = -0.12 * w + 0.1;
            const back = Math.min(1, w / 0.55), fwd = Math.max(0, (w - 0.55) / 0.45);
            L.lR.u.rotation.x = -1.25 * back + (1.0 + 1.25) * fwd * (back >= 1 ? 1 : 0) - 0 * 0; L.lR.k.rotation.x = -1.7 * back * (1 - fwd) - 0.1 * fwd; L.torso.rotation.z = 0.12 * back * (1 - fwd); L.hip.position.y = 0.95 - 0.04 * back; L.aL.u.rotation.z = 0.8; L.aR.u.rotation.z = -0.8 + 0.5 * fwd; L.aL.u.rotation.x = -0.3; L.aR.u.rotation.x = -0.3; }
        if (t === RUN) { PK.vel.copy(PK.launch); PK.spin.set(0, Math.max(-1, Math.min(1, (PK.target.x - PK.aimShown.x) * 0.2)), 0); PK.ph = 'fly'; PK.t = 0; p3Noise(0.09, 0.45, 1800); p3Thud(110, 0.1, 0.2); PK.flyT = 0; }
    }
    if (PK.ph === 'fly') {
        PK.flyT++; pkKeeperPose(PK.flyT); for (let i = 0; i < 3; i++) pkBallStep(1 / 180);
        const p = PK.ballPos, v = PK.vel;
        S.userData && (function () { const L = S.userData, w = Math.min(1, PK.t / 10); const hw = Math.min(1, PK.t / 22); L.lR.u.rotation.x = 1.45 * (1 - w) + 0.3 * w - 0.9 * hw; L.lR.k.rotation.x = -0.1 - 0.9 * w * (1 - hw * 0.5); L.lL.u.rotation.x = 0.2 - 0.25 * Math.sin(Math.min(1, PK.t / 12) * Math.PI); L.lL.k.rotation.x = -0.25 + 0.3 * Math.sin(Math.min(1, PK.t / 12) * Math.PI); PK.shooter.position.y = 0.14 * Math.sin(Math.min(1, PK.t / 14) * Math.PI); L.aL.u.rotation.z = 1.0 - 0.5 * hw; L.aR.u.rotation.z = -1.1 + 0.5 * hw; L.aL.u.rotation.x = 0.3; L.aR.u.rotation.x = -0.3; L.torso.rotation.x = -0.1 * (1 - w) + 0.3 * w * (1 - hw * 0.6); })();
        if (PK.flyT > 2 && (PK.crossed ? (v.length() < 0.5 && p.y <= PK_R + 0.02) || PK.flyT > 200 : (p.z < -3.5 || Math.abs(p.x) > 22 || p.z > 14 || PK.flyT > 260 || (v.length() < 0.35 && p.y <= PK_R + 0.02)))) {
            pkEndShot(PK.crossed && PK.goal ? 'goal' : PK.touched ? 'saved' : PK.wood ? 'post' : 'miss');
        }
        if (PK.crossed && PK.goal && PK.flyT > 3 && PK.ph === 'fly' && PK.flyT > 24) pkEndShot('goal');
    } else if (PK.ph === 'result') {
        const t2 = PK.t;
        if (PK.res === 'goal' || PK.res === 'saved' || PK.res === 'miss' || PK.res === 'post') { for (let i = 0; i < 3; i++) if (PK.ballPos.y > 0) pkBallStep(1 / 180); }
        if (PK.res === 'goal') { const L = PK.shooter.userData; if (t2 > 8) { PK.shooter.rotation.y += 0.0; L.aL.u.rotation.z = 2.6 * Math.min(1, (t2 - 8) / 14); L.aR.u.rotation.z = -2.6 * Math.min(1, (t2 - 8) / 14); L.aL.u.rotation.x = 0; L.aR.u.rotation.x = 0; L.hip.position.y = 0.95 + Math.abs(Math.sin(t2 * 0.25)) * 0.12; } }
        if (PK.res === 'goal' && t2 === 130) { ssCrownWinner(PK.shooterName, '⚽', 'PENALTY HERO — SCORED!', '⚽ ' + PK.shooterName + ' scored the penalty!'); }
        else if (PK.res !== 'goal' && t2 === 85) {
            PK.shot++;
            if (PK.shot >= 2) { pkQueueNext(); }
            pkReset(false); PK.ph = 'aim';
        }
    }
    // dots
    p3Say('p3dots', 'Shot ' + Math.min(2, PK.shot + (PK.ph === 'aim' || PK.ph === 'run' || PK.ph === 'fly' ? 1 : 0)) + '/2   ' + [0, 1].map(i => PK.hist[i] === undefined ? '○' : PK.hist[i] ? '⚽✔' : '✖').join(' '));
}
function pkRender() {
    const rn = S3.renderer, sc = S3.scene, cam = S3.camera; if (!rn || !sc) return;
    P3.clock++;
    if (!isStageRunning) { p3Say('p3tip', 'Press START SHOOTOUT'); p3Say('p3name', ''); p3Say('p3dots', ''); }
    const tk = PK.ph === 'fly' ? PK.t : PK.ph === 'result' ? 0 + PK.t + 999 * 0 : 0; // keeper clock from the kick
    PK.kclock = (PK.ph === 'fly') ? PK.flyT : (PK.ph === 'result' ? (PK.flyT || 0) + PK.t : 0);
    pkKeeperPose(PK.kclock);
    // keeper hold after dive in result
    // ball mesh
    const bp = PK.ballPos || new THREE.Vector3(0, PK_R, 11); PK.ballMesh.position.copy(bp);
    const v = PK.vel; if (v.length() > 0.2 && bp.y > 0) { const ax = new THREE.Vector3(v.z, 0, -v.x).normalize(); PK.ballMesh.rotateOnWorldAxis(ax.lengthSq() ? ax : new THREE.Vector3(1, 0, 0), v.length() * 0.0167 / PK_R * 0.55); }
    // reticle
    const aimNow = PK.ph === 'aim' || !isStageRunning ? PK.aim : (PK.aimShown || PK.aim); PK.ret.position.set(aimNow.x, aimNow.y, 0.05);
    PK.ret.visible = isStageRunning ? (PK.ph === 'aim' || PK.ph === 'run') : true; PK.ret.rotation.z = P3.clock * 0.02; const sc2 = 1 + 0.08 * Math.sin(P3.clock * 0.2); PK.ret.scale.set(sc2, sc2, 1);
    PK.guide.visible = PK.ret.visible; PK.guide.geometry.setFromPoints([new THREE.Vector3(0, 0.12, 11), new THREE.Vector3(aimNow.x, aimNow.y, 0.05)]); PK.guide.computeLineDistances();
    // power bar
    const ind = document.getElementById('p3ind'); if (ind) ind.style.bottom = (PK.pw * 100) + '%';
    const pw = document.getElementById('p3pow'); if (pw) pw.style.display = 'none'; fhDrawStroke(PK);
    const au = document.getElementById('p3auto'); if (au) au.style.display = (PK.ph === 'aim' && isStageRunning) ? 'block' : 'none';
    // net ripple
    if (PK.ripple) { const R = PK.ripple; R.t++; const arr = PK.net.geometry.attributes.position.array, B = PK.netBase; for (let i = 0; i < B.length; i += 3) { const dx = B[i] - R.x, dy = B[i + 1] - R.y, d2 = dx * dx + dy * dy, w = Math.exp(-d2 / 1.1) * R.a * Math.exp(-R.t * 0.03) * Math.cos(R.t * 0.28 - Math.sqrt(d2) * 2.2); arr[i] = B[i]; arr[i + 1] = B[i + 1]; arr[i + 2] = B[i + 2] - w * 0.9; } PK.net.geometry.attributes.position.needsUpdate = true; if (R.t > 260) PK.ripple = null; }
    // confetti
    if (PK.confP.visible) { const pa = PK.confP.geometry.attributes.position.array; for (let i = 0; i < PK.confV.length; i++) { const cv = PK.confV[i]; cv[1] -= 0.012; pa[i * 3] += cv[0] * 0.016; pa[i * 3 + 1] += cv[1] * 0.016 * 3; pa[i * 3 + 2] += cv[2] * 0.016; if (pa[i * 3 + 1] < 0.05) { pa[i * 3 + 1] = 0.05; cv[0] = cv[1] = cv[2] = 0; } } PK.confP.geometry.attributes.position.needsUpdate = true; }
    // crowd
    const ex = PK.res === 'goal' ? 1 : 0; if (P3.clock % 3 === 0) PK.crowds.forEach(c => c.upd(P3.clock, ex));
    // camera
    let tp, tl, f = 0.07;
    if (PK.ph === 'fly') { tp = new THREE.Vector3(bp.x * 0.3 + 1.0, 1.7 + bp.y * 0.2, Math.max(bp.z + 6.5, 5.5)); tl = new THREE.Vector3(bp.x * 0.5, Math.max(0.9, bp.y * 0.6 + 0.4), Math.max(-1.5, Math.min(0, bp.z - 6))); f = 0.1; }
    else if (PK.ph === 'result' && PK.res === 'goal') { tp = new THREE.Vector3(5.2, 1.7, 6.4); tl = new THREE.Vector3(0, 1.2, -0.5); f = 0.05; }
    else if (PK.ph === 'result') { tp = new THREE.Vector3(1.0, 1.9, 9.0); tl = new THREE.Vector3(bp.x * 0.5, 1.0, 0.5); f = 0.06; }
    else { tp = new THREE.Vector3(3.2 + (aimNow.x * 0.04), 3.6, 17.5); tl = new THREE.Vector3(aimNow.x * 0.1, 0.9, 0); f = 0.12; }
    PK.camPos.lerp(tp, f); PK.camLook.lerp(tl, f); cam.position.copy(PK.camPos); cam.lookAt(PK.camLook);
    rn.render(sc, cam);
}

function pkLevelBtn() {
    const h = document.getElementById('p3hud'); if (!h || document.getElementById('p3lvl')) return; const b = document.createElement('div'); b.id = 'p3lvl';
    b.style.cssText = 'position:absolute;left:150px;bottom:14px;pointer-events:auto;cursor:pointer;background:#7c3aed;color:#fff;border-radius:12px;padding:8px 14px;font-weight:900;font-size:14px';
    const L = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, show = () => { b.textContent = '\u{1F3AF} Level: ' + L[PK.level]; }; show();
    b.onclick = () => { PK.level = PK.level === 'easy' ? 'normal' : PK.level === 'normal' ? 'hard' : 'easy'; try { localStorage.setItem(smk7('SGE_SM_PK_LEVEL'), PK.level); } catch (e) {} show(); };
    h.appendChild(b);
}

// ============================================================================
// v9 FREE THROW 3D — student aims left/right + power bar; ball physics with rim, board, net
// Hoop plane: backboard z=0 (faces +z), rim centre (0,3.05,0.38). FT line z=4.6.
// ============================================================================
const FH = { built: null, ph: 'ready', t: 0, ballPos: new THREE.Vector3(0, 2, 4.6), vel: new THREE.Vector3(), aimX: 0, pw: 0.5, shot: 0, queue: [], qi: 0, hist: [], camPos: new THREE.Vector3(2.4, 2.7, 8.8), camLook: new THREE.Vector3(0, 2.9, 0.2), res: '' };
const FH_R = 0.12, FH_RIM = new THREE.Vector3(0, 3.05, 0.38), FH_RR = 0.2286, FH_G = 9.81;
function fhFloorTex() {
    return p3Tex(1080, 852, (c, w, h) => {
        const X = x => (x + 9) * 60, Z = z => (z + 1.2) * 60;
        for (let i = 0; i < 36; i++) { c.fillStyle = i % 2 ? '#c98a4b' : '#d49758'; c.fillRect(i * 30, 0, 30, h); c.fillStyle = 'rgba(80,40,10,.25)'; c.fillRect(i * 30, 0, 1.5, h); }
        for (let i = 0; i < 700; i++) { c.fillStyle = 'rgba(90,50,15,.07)'; c.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 60, 1.5); }
        c.fillStyle = 'rgba(190,40,40,.85)'; c.fillRect(X(-2.45), Z(-1.2), 4.9 * 60, 5.8 * 60);
        c.strokeStyle = '#fff'; c.lineWidth = 5; c.strokeRect(X(-2.45), Z(-1.2), 4.9 * 60, 5.8 * 60);
        c.beginPath(); c.arc(X(0), Z(4.6), 1.8 * 60, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(X(0), Z(0.38), 6.75 * 60, 0.35, Math.PI - 0.35); c.stroke();
        c.beginPath(); c.moveTo(X(-6.6), Z(-1.2)); c.lineTo(X(-6.6), Z(2.9)); c.moveTo(X(6.6), Z(-1.2)); c.lineTo(X(6.6), Z(2.9)); c.stroke();
        c.strokeRect(X(-8.9), Z(-1.2), 17.8 * 60, 14 * 60);
        c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '900 64px Arial'; c.textAlign = 'center'; c.fillText('ALL STARS', X(0), Z(9.5));
    });
}
function fhBuild() {
    const sc = S3.scene, cam = S3.camera, rn = S3.renderer; FH.built = sc;
    rn.shadowMap.enabled = true; rn.shadowMap.type = THREE.PCFSoftShadowMap; rn.toneMapping = THREE.ACESFilmicToneMapping; rn.toneMappingExposure = 1.1;
    cam.fov = 44; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix();
    sc.background = new THREE.Color(0x0b1020); sc.fog = new THREE.Fog(0x0b1020, 28, 70);
    sc.add(new THREE.HemisphereLight(0xdbe7ff, 0x6b4a2a, 0.75));
    const sp = new THREE.SpotLight(0xfff1d6, 1.6, 60, 0.7, 0.5, 1); sp.position.set(3, 16, 8); sp.target.position.set(0, 1, 2); sc.add(sp, sp.target);
    sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0004;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(18, 14.2), new THREE.MeshStandardMaterial({ map: fhFloorTex(), roughness: 0.32, metalness: 0.05 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 5.9); fl.receiveShadow = true; sc.add(fl);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), p3Mat(0x1e293b, 0.9)); outer.rotation.x = -Math.PI / 2; outer.position.set(0, -0.01, 5); sc.add(outer);
    // hoop
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.04), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 })); glass.position.set(0, 3.425, -0.02); sc.add(glass);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    const fr = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); m.position.set(x, y, 0.005); sc.add(m); };
    fr(1.8, 0.04, 0, 3.95); fr(1.8, 0.04, 0, 2.9); fr(0.04, 1.05, -0.9, 3.425); fr(0.04, 1.05, 0.9, 3.425);
    const sq = [[0.59, 0.02, 0, 3.3 - 0.0], [0.59, 0.02, 0, 3.05 + 0.0], [0.02, 0.45, -0.295, 3.05 + 0.1], [0.02, 0.45, 0.295, 3.05 + 0.1]]; sq.forEach(a => { const m = new THREE.Mesh(new THREE.BoxGeometry(a[0], a[1], 0.03), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); m.position.set(a[2], a[3] - 0.0 + (a[1] > 0.1 ? 0 : 0), 0.04); m.scale.y = 1; sc.add(m); });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(FH_RR, 0.014, 12, 48), new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.35, metalness: 0.5, emissive: 0x3a1000 })); rim.rotation.x = Math.PI / 2; rim.position.copy(FH_RIM); rim.castShadow = true; sc.add(rim);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.2), lineMat); arm.position.set(0, 3.05, 0.1); sc.add(arm);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.6, 0.22), p3Mat(0x334155, 0.5, 0.4)); pole.position.set(0, 1.8, -1.75); pole.castShadow = true; sc.add(pole);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.7), p3Mat(0x334155, 0.5, 0.4)); bar.position.set(0, 3.5, -0.9); sc.add(bar);
    const padM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.5), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 })); padM.position.set(0, 0.9, -1.75); sc.add(padM);
    // net: rings of lines
    FH.netRings = 6; FH.netSeg = 16; const pos = new Float32Array(FH.netRings * FH.netSeg * 3), idx = [];
    for (let r = 0; r < FH.netRings; r++) for (let s = 0; s < FH.netSeg; s++) { const a = r * FH.netSeg + s; idx.push(a, r * FH.netSeg + (s + 1) % FH.netSeg); if (r < FH.netRings - 1) { idx.push(a, (r + 1) * FH.netSeg + (s + 1) % FH.netSeg); idx.push(a, (r + 1) * FH.netSeg + (s + FH.netSeg - 1) % FH.netSeg); } }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ng.setIndex(idx);
    FH.net = new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0xffffff })); FH.net.frustumCulled = false; sc.add(FH.net); fhNetUpdate();
    // arena
    FH.crowds = [p3Crowd(sc, { x: 0, y: 0, z: -7, w: 40, rows: 7, rowH: 0.6, rowD: 0.85, ry: 0, step: 0x1f2937 }), p3Crowd(sc, { x: -10.5, y: 0, z: 5, w: 34, rows: 6, rowH: 0.6, rowD: 0.85, ry: Math.PI / 2, step: 0x1f2937 }), p3Crowd(sc, { x: 10.5, y: 0, z: 5, w: 34, rows: 6, rowH: 0.6, rowD: 0.85, ry: -Math.PI / 2, step: 0x1f2937 })];
    const adT = p3Tex(1024, 64, (c, w, h) => { const cs = ['#1d4ed8', '#dc2626', '#16a34a', '#f59e0b']; for (let i = 0; i < 4; i++) { c.fillStyle = cs[i]; c.fillRect(i * 256, 0, 256, h); c.fillStyle = '#fff'; c.font = '900 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['ALL STARS', 'ALFORQAN - STUDIO', 'FREE THROW', 'SCHOOL CUP'][i], i * 256 + 128, 34); } }, 4, 1);
    const ads = new THREE.Mesh(new THREE.BoxGeometry(40, 0.9, 0.12), new THREE.MeshStandardMaterial({ map: adT, emissive: 0xffffff, emissiveMap: adT, emissiveIntensity: 0.5 })); ads.position.set(0, 0.45, -3.2); sc.add(ads);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 5), p3Mat(0x111827, 0.5)); sb.position.set(0, 11, 2); sc.add(sb);
    const sbm = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.6), new THREE.MeshBasicMaterial({ map: p3Tex(256, 96, (c, w, h) => { c.fillStyle = '#0b1220'; c.fillRect(0, 0, w, h); c.fillStyle = '#fbbf24'; c.font = '900 40px Arial'; c.textAlign = 'center'; c.fillText('FREE THROW', 128, 58); }) })); sbm.position.set(0, 11, 4.55); sc.add(sbm);
    // ball
    const bt = p3Tex(512, 256, (c, w, h) => { c.fillStyle = '#e8772e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a1608'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(w / 4, 0); c.lineTo(w / 4, h); c.moveTo(w * 3 / 4, 0); c.lineTo(w * 3 / 4, h); c.stroke(); for (let i = 0; i < 3000; i++) { c.fillStyle = 'rgba(60,20,0,.12)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    FH.ball = new THREE.Mesh(new THREE.SphereGeometry(FH_R, 32, 24), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.6 })); FH.ball.castShadow = true; sc.add(FH.ball);
    FH.shooter = p3Human({ shirt: 0x2563eb, shorts: 0x1e3a8a, sock: 0xffffff, skin: 0xd9a47a, number: 23, numColor: '#fff', boot: 0xf8fafc }); sc.add(FH.shooter);
    // marker + preview arc
    FH.mark = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 32), new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, depthTest: false })); FH.mark.rotation.x = -Math.PI / 2; FH.mark.renderOrder = 20; sc.add(FH.mark);
    FH.arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), new THREE.LineDashedMaterial({ color: 0xfde047, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.85, depthTest: false })); FH.arc.renderOrder = 19; FH.arc.frustumCulled = false; sc.add(FH.arc);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(720), 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(720), 3));
    FH.conf = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true })); FH.conf.visible = false; FH.conf.frustumCulled = false; sc.add(FH.conf); FH.confV = [];
}
function fhNetUpdate() {
    const a = FH.net.geometry.attributes.position.array, b = FH.ballPos; let k = 0;
    if (FH.made) FH.madeT = (FH.madeT || 0) + 1; else FH.madeT = 0; const mt = FH.madeT, dec = Math.exp(-mt * 0.025);
    for (let r = 0; r < FH.netRings; r++) {
        const f = r / (FH.netRings - 1), rad = FH_RR * (1 - 0.45 * f), y = 3.05 - f * 0.42;
        for (let s = 0; s < FH.netSeg; s++) {
            const an = (s + (r % 2) * 0.5) / FH.netSeg * Math.PI * 2; let x = Math.cos(an) * rad, z = Math.sin(an) * rad, yy = y;
            if (mt > 0) { const sw = dec * Math.sin(mt * 0.3 - f * 2.0); x += Math.cos(an) * sw * 0.05 * f; z += Math.sin(an) * sw * 0.05 * f; yy -= 0.07 * dec * f * (mt < 30 ? Math.sin(mt / 30 * Math.PI) : 0.4 * Math.sin(mt * 0.3)); x *= 1 - 0.18 * f * dec * (mt < 25 ? Math.sin(mt / 25 * Math.PI) : 0); z *= 1 - 0.18 * f * dec * (mt < 25 ? Math.sin(mt / 25 * Math.PI) : 0); }
            const dx = FH_RIM.x + x - b.x, dz = FH_RIM.z + z - b.z, dy = yy - b.y; const d = Math.hypot(dx, dy, dz);
            if (FH.inNet && d < FH_R + 0.14) { const push = (FH_R + 0.14 - d) * 0.95; x += (dx / (d || 1)) * push; z += (dz / (d || 1)) * push; }
            a[k++] = FH_RIM.x + x; a[k++] = yy; a[k++] = FH_RIM.z + z;
        }
    }
    FH.net.geometry.attributes.position.needsUpdate = true;
}
function fhPrepare() {
    if (!S3.active || S3.mode !== 19) return false;
    if (FH.built !== S3.scene) fhBuild();
    p3Hud(); fhLevelBtn(); p3BindPointer(); P3.on = fhOn;
    FH.queue = ss9Pool(8); FH.qi = 0; if (!FH.queue.length) FH.queue = ['Student']; fhNext();
    fhReset(true); ssG = { mode: 19, names: FH.queue, winnerIdx: 0, phase: 'idle', parts: [] }; stageTick = 0; return true;
}
function fhNext() { if (FH.qi >= FH.queue.length) { FH.queue = ss9Pool(8); FH.qi = 0; if (!FH.queue.length) FH.queue = ['Student']; } FH.name = FH.queue[FH.qi++]; FH.shot = 0; FH.hist = []; }
function fhReset(first) {
    FH.ph = (isStageRunning || !first) ? 'aim' : 'ready'; FH.t = 0; FH.vel.set(0, 0, 0); FH.made = false; FH.drag = false; FH.snap = false; FH.pw = 0.5; FH.touch = 0; FH.board = false; FH.rim = false; FH.inNet = false; FH.res = ''; FH.bounces = 0; FH.prevY = 9;
    FH.shooter.position.set(0, 0, 4.85); FH.shooter.rotation.y = 0; p3Reset(FH.shooter); FH.pose(0);
    FH.ballPos.set(0, 1.4, 4.6); p3Big(''); FH.conf.visible = false; FH.inNet = false; fhNetUpdate();
    FH.camPos.set(1.2, 3.0, 10.5); FH.camLook.set(0, 1.9, 2.2);
}
FH.pose = function (u) { FH.uNow = u; // 0 = ready (ball at chest/set point), 0..1 shoot (dip, rise, extend, flick), >1 follow-through
    const L = FH.shooter.userData; p3Reset(FH.shooter);
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const dip = u < 0.4 ? sm(u / 0.4) : Math.max(0, 1 - (u - 0.4) / 0.25), ext = sm((u - 0.38) / 0.5), flick = sm((u - 0.68) / 0.18), ft = sm((u - 0.85) / 0.35);
    const jump = Math.sin(Math.max(0, Math.min(1, (u - 0.5) / 0.7)) * Math.PI);
    L.hip.position.y = 0.95 - 0.13 * dip + 0.08 * jump;
    [L.lL, L.lR].forEach((l, i) => { l.u.rotation.x = 0.7 * dip * (1 - ext) - 0.1 * jump; l.k.rotation.x = -1.25 * dip * (1 - ext) - 0.35 * jump; l.u.rotation.z = (i ? -1 : 1) * 0.06; });
    L.torso.rotation.x = 0.04 + 0.12 * dip - 0.1 * ext + 0.1 * ft; L.torso.rotation.y = -0.1 * (1 - ext) * (1 - dip);
    // shooting arm (R): elbow tucked under the ball, then full extension and wrist flick; guide arm (L) supports then drops away
    const R = L.aR, G = L.aL, upLift = 0.85 - 0.2 * dip;
    R.u.rotation.x = upLift + (2.55 - upLift) * ext + 0.25 * flick; R.u.rotation.z = -(0.22 * (1 - ext) + 0.04 * ext); R.f.rotation.x = 1.75 * (1 - ext) * (1 + 0.1 * dip) + 0.12 * ext + 0.25 * flick; R.hand.rotation.x = -0.5 * (1 - ext) + 1.15 * flick + 0.2 * ft;
    G.u.rotation.x = upLift + 0.1 + (1.9 - upLift) * ext * (1 - flick * 0.7) - 0.4 * ft; G.u.rotation.z = 0.28 * (1 - ext) + 0.2 * ext + 0.5 * ft; G.f.rotation.x = 1.6 * (1 - ext) + 0.5 * ext; G.hand.rotation.x = -0.4 * (1 - ext) + 0.4 * flick;
    L.head.rotation.x = -0.28 * ext;
};
FH.hands = function () { FH.shooter.updateMatrixWorld(true); const L = FH.shooter.userData, a = new THREE.Vector3(), b = new THREE.Vector3(); L.aL.hand.getWorldPosition(a); L.aR.hand.getWorldPosition(b); const w = Math.max(0, Math.min(1, ((FH.uNow || 0) - 0.5) / 0.22)); return a.add(b).multiplyScalar(0.5).lerp(b.clone().add(new THREE.Vector3(0, 0.1, 0)), w); };
function fhIdeal(aimX, from) {
    const T = new THREE.Vector3(aimX, 3.05, 0.38 + 0.0), D = Math.hypot(T.x - from.x, T.z - from.z), dy = T.y - from.y, th = 0.95; // ~54 deg
    const den = 2 * Math.cos(th) * Math.cos(th) * (D * Math.tan(th) - dy), v = Math.sqrt(FH_G * D * D / Math.max(0.05, den));
    const hx = (T.x - from.x) / D, hz = (T.z - from.z) / D; return new THREE.Vector3(hx * v * Math.cos(th), v * Math.sin(th), hz * v * Math.cos(th));
}
function fhSolve(aimX, from) {
    const v0 = fhIdeal(aimX, from), D = Math.hypot(aimX - from.x, 0.38 - from.z); let k = 1;
    for (let it = 0; it < 7; it++) {
        const p = from.clone(), v = v0.clone().multiplyScalar(k), dt = 1 / 240; let apex = false;
        for (let i = 0; i < 2400; i++) { v.y -= FH_G * dt; v.addScaledVector(v, -0.02 * v.length() * dt); p.addScaledVector(v, dt); if (v.y < 0) apex = true; if (apex && p.y <= 3.05) break; }
        const got = Math.hypot(p.x - from.x, p.z - from.z); k *= 1 + (D - got) / D * 0.55;
    }
    return v0.multiplyScalar(k);
}
function fhPtrToX(nx, ny) {
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(nx, ny), S3.camera); const o = rc.ray.origin, d = rc.ray.direction; const t = (0.38 - o.z) / d.z; if (!(t > 0)) return null;
    return Math.max(-0.9, Math.min(0.9, (o.x + d.x * t) * 0.6));
}
function fhHoopNdc() { const v = new THREE.Vector3(FH_RIM.x, 3.05, FH_RIM.z).project(S3.camera); return v; }
function fhBallNdc() { return new THREE.Vector3(FH.ballPos.x, FH.ballPos.y, FH.ballPos.z).project(S3.camera); }
FH.level = (function () { try { return localStorage.getItem(smk7('SGE_SM_FT_LEVEL')) || 'normal'; } catch (e) { return 'normal'; } })();
function FH_CR() { return { easy: 0.36, normal: 0.22, hard: 0.1 }[FH.level] || 0.22; }
function fhInCircle(nx, ny) { const c = document.getElementById('stageCanvas3D'), asp = c ? c.clientWidth / Math.max(1, c.clientHeight) : 1.6, hp = fhHoopNdc(); return Math.hypot((nx - hp.x) * asp, ny - hp.y) < FH_CR(); }
function fhApplyEnd(nx, ny) { // rule: any point of the line inside the hoop circle = shot goes in; otherwise it misses
    const st = FH.stroke || [[nx, ny]], hit = (FH.level === 'easy' ? st.some(q => fhInCircle(q[0], q[1])) : false) || fhInCircle(nx, ny), hp = fhHoopNdc();
    FH.snap = hit;
    if (hit) { FH.aimX = 0; FH.pw = 0.5; }
    else { const dx = nx - hp.x, dy = ny - hp.y, sd = Math.abs(dx) < 0.05 ? (FH.sideSeed = FH.sideSeed || (Math.random() < .5 ? -1 : 1)) : (dx > 0 ? 1 : -1); FH.aimX = sd * (1.0 + Math.min(0.35, Math.abs(dx) * 0.3)); FH.pw = 0.5 + Math.max(-0.1, Math.min(0.1, dy * 0.2)); }
}
function fhLevelBtn() {
    const h = document.getElementById('p3hud'); if (!h || document.getElementById('p3lvl')) return; const b = document.createElement('div'); b.id = 'p3lvl';
    b.style.cssText = 'position:absolute;left:150px;bottom:14px;pointer-events:auto;cursor:pointer;background:#7c3aed;color:#fff;border-radius:12px;padding:8px 14px;font-weight:900;font-size:14px';
    const L = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, show = () => { b.textContent = '\u{1F3AF} Level: ' + L[FH.level]; }; show();
    b.onclick = () => { FH.level = FH.level === 'easy' ? 'normal' : FH.level === 'normal' ? 'hard' : 'easy'; try { localStorage.setItem(smk7('SGE_SM_FT_LEVEL'), FH.level); } catch (e) {} show(); };
    h.appendChild(b);
}
function fhOn(kind, nx, ny) {
    if (activeStageMode !== 19 || !isStageRunning) return;
    if (kind === 'auto') { if (FH.ph === 'aim') fhFire((Math.random() - 0.5) * 0.2, 0.5 + (Math.random() - 0.5) * 0.08); return; }
    if (FH.ph !== 'aim') return;
    if (kind === 'down') { FH.drag = true; FH.stroke = [[nx, ny]]; FH.strokeFade = 0; fhApplyEnd(nx, ny); }
    else if (kind === 'move' && FH.drag) { const l = FH.stroke[FH.stroke.length - 1]; if (Math.hypot(nx - l[0], ny - l[1]) > 0.012) FH.stroke.push([nx, ny]); fhApplyEnd(nx, ny); }
    else if (kind === 'up' && FH.drag) { FH.drag = false; if (FH.stroke.length < 2) FH.stroke.push([nx, ny]); fhApplyEnd(nx, ny); FH.strokeFade = 45; fhFire(FH.aimX, FH.pw); }
}
function fhOverlay() {
    const c = document.getElementById('stageCanvas3D'); if (!c) return null; let o = document.getElementById('fhOv');
    if (!o) { o = document.createElement('canvas'); o.id = 'fhOv'; o.style.cssText = 'position:absolute;pointer-events:none;z-index:6'; c.parentNode.appendChild(o); }
    o.style.left = c.offsetLeft + 'px'; o.style.top = c.offsetTop + 'px'; if (o.width !== c.clientWidth || o.height !== c.clientHeight) { o.width = c.clientWidth; o.height = c.clientHeight; o.style.width = c.clientWidth + 'px'; o.style.height = c.clientHeight + 'px'; }
    return o;
}
function fhDrawStroke(Q) {
    Q = Q || FH;
    const o = fhOverlay(); if (!o) return; const g = o.getContext('2d'), W = o.width, H = o.height; g.clearRect(0, 0, W, H);
    const X = n => (n + 1) / 2 * W, Y = n => (1 - n) / 2 * H, aimPh = Q === FH && FH.ph === 'aim' && isStageRunning;
    if (false) { const hp = fhHoopNdc(), r = FH_CR() * H / 2, pul = 1 + 0.06 * Math.sin(P3.clock * 0.15); g.fillStyle = 'rgba(253,224,71,.14)'; g.beginPath(); g.arc(X(hp.x), Y(hp.y), r * pul, 0, 7); g.fill(); g.strokeStyle = 'rgba(15,23,42,.8)'; g.lineWidth = 7; g.beginPath(); g.arc(X(hp.x), Y(hp.y), r * pul, 0, 7); g.stroke(); g.strokeStyle = 'rgba(253,224,71,1)'; g.lineWidth = 4; g.setLineDash([9, 6]); g.beginPath(); g.arc(X(hp.x), Y(hp.y), r * pul, 0, 7); g.stroke(); g.setLineDash([]); }
    if (Q.strokeFade > 0 && !Q.drag) Q.strokeFade--;
    const st = Q.stroke; if (!st || st.length < 2 || (!Q.drag && Q.strokeFade <= 0)) return;
    const al = Q.drag ? 1 : Q.strokeFade / 45; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,' + (0.35 * al) + ')'; g.lineWidth = 14; g.beginPath(); st.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
    g.strokeStyle = (Q.snap ? 'rgba(74,222,128,' : 'rgba(253,224,71,') + al + ')'; g.lineWidth = 6; g.beginPath(); st.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
    const e = st[st.length - 1]; g.fillStyle = Q.snap ? 'rgba(74,222,128,' + al + ')' : 'rgba(253,224,71,' + al + ')'; g.beginPath(); g.arc(X(e[0]), Y(e[1]), 11, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,' + al + ')'; g.beginPath(); g.arc(X(st[0][0]), Y(st[0][1]), 7, 0, 7); g.fill();
}
function fhFire(ax, pw) {
    if (FH.ph !== 'aim') return;
    if (FH.level !== 'easy' && FH.snap) { const j = FH.level === 'hard' ? 1 : 0.4; ax = (Math.random() - 0.5) * 0.2 * j; pw = 0.5 + (Math.random() - 0.5) * 0.09 * j; }
    FH.shotAim = ax; FH.shotPw = pw; FH.ph = 'shoot'; FH.t = 0; p3Say('p3tip', '');
}
function fhBall(dt) {
    const p = FH.ballPos, v = FH.vel; v.y -= FH_G * dt; v.addScaledVector(v, -0.02 * v.length() * dt); p.addScaledVector(v, dt);
    if (p.y < FH_R) { p.y = FH_R; if (v.y < 0) { v.y = -v.y * 0.78; v.x *= 0.95; v.z *= 0.95; FH.bounces++; if (Math.abs(v.y) > 1) p3Thud(95, 0.1, 0.18); } }
    // backboard
    if (p.z < FH_R + 0.0 && p.z > -0.2 && Math.abs(p.x) < 0.9 + FH_R * 0.5 && p.y > 2.9 - FH_R * 0.5 && p.y < 3.95 + FH_R * 0.5 && v.z < 0) { p.z = FH_R; v.z = -v.z * 0.55; v.x *= 0.9; v.y *= 0.9; FH.board = true; FH.touch++; p3Thud(190, 0.1, 0.2); p3Noise(0.08, 0.1, 2000); }
    // rim: ring of small spheres
    for (let i = 0; i < 32; i++) {
        const an = i / 32 * Math.PI * 2, cx = FH_RIM.x + Math.cos(an) * FH_RR, cz = FH_RIM.z + Math.sin(an) * FH_RR;
        const dx = p.x - cx, dy = p.y - FH_RIM.y, dz = p.z - cz, d = Math.hypot(dx, dy, dz), md = FH_R + 0.015;
        if (d < md) { const n = new THREE.Vector3(dx, dy, dz).multiplyScalar(1 / (d || 1)), vn = v.dot(n); if (vn < 0) { v.addScaledVector(n, -(1 + 0.62) * vn); v.multiplyScalar(0.94); FH.rim = true; FH.touch++; p3Thud(520, 0.12, 0.2); p3Noise(0.1, 0.12, 3000); } p.copy(new THREE.Vector3(cx, FH_RIM.y, cz)).addScaledVector(n, md + 0.001); }
    }
    const dh = Math.hypot(p.x - FH_RIM.x, p.z - FH_RIM.z);
    if (!FH.made && FH.prevY > FH_RIM.y && p.y <= FH_RIM.y && v.y < 0 && dh < FH_RR - 0.02) { fhRoar(1); FH.made = true; FH.swish = FH.touch === 0; p3Noise(0.35, 0.22, 4500); }
    FH.prevY = p.y;
    FH.inNet = FH.made && p.y < FH_RIM.y + 0.05 && p.y > FH_RIM.y - 0.7 && dh < FH_RR;
    if (FH.inNet) { v.x += (FH_RIM.x - p.x) * 8 * dt; v.z += (FH_RIM.z - p.z) * 8 * dt; v.x *= 1 - 4 * dt; v.z *= 1 - 4 * dt; v.y *= 1 - 2.6 * dt; }
}
function fhStep() {
    if (FH.ph === 'ready') { FH.ph = 'aim'; FH.t = 0; }
    FH.t++; const t = FH.t, L = FH.shooter.userData;
    if (FH.ph === 'aim') { P3.clock++; FH.pose(0); const h = FH.hands(); FH.ballPos.set(h.x, h.y + 0.02, h.z - 0.04); p3Say('p3name', '🏀 ' + FH.name); p3Say('p3tip', 'Draw a line to the hoop - end it right on the rim to score'); document.getElementById('stageWinnerBanner').textContent = '🏀 ' + FH.name + ' to shoot'; }
    else if (FH.ph === 'shoot') {
        const u = t / 30; FH.pose(u); if (t < 22) { const h = FH.hands(); FH.ballPos.set(h.x, h.y + 0.03, h.z - 0.05); }
        if (t === 22) { const h = FH.hands(); FH.ballPos.set(h.x, h.y + 0.1, h.z - 0.05); const v = fhSolve(FH.shotAim, FH.ballPos), k = 1.009 + (FH.shotPw - 0.5) * 0.22, dev = Math.max(0, Math.abs(FH.shotPw - 0.5) - 0.12), g = () => (Math.random() + Math.random() - 1) ; v.multiplyScalar(k);  FH.vel.copy(v); FH.ph = 'fly'; FH.t = 0; FH.flyT = 0; FH.prevY = FH.ballPos.y; p3Noise(0.05, 0.1, 900); }
    }
    if (FH.ph === 'fly') {
        FH.flyT++; FH.pose(Math.min(1.3, (22 + FH.flyT) / 30)); for (let i = 0; i < 4; i++) fhBall(1 / 240);
        const p = FH.ballPos;
        if ((FH.made && FH.flyT > 70 + 0) || FH.bounces >= 2 || p.z > 12 || FH.flyT > 330 || p.z < -4) fhEnd(FH.made ? (FH.swish ? 'swish' : 'bucket') : 'miss');
    } else if (FH.ph === 'result') {
        for (let i = 0; i < 4; i++) if (!(FH.res === 'miss' && FH.ballPos.y <= FH_R + 0.001 && FH.vel.length() < 0.2)) fhBall(1 / 240);
        if ((FH.res === 'swish' || FH.res === 'bucket') && t === 120) ssCrownWinner(FH.name, '🏀', 'FREE THROW CHAMPION', '🏀 ' + FH.name + ' sank the free throw!');
        else if (FH.res === 'miss' && t === 80) { FH.shot++; if (FH.shot >= 3) fhNext(); fhReset(false); FH.ph = 'aim'; }
    }
    p3Say('p3dots', 'Shot ' + Math.min(3, FH.shot + (FH.ph === 'result' ? 0 : 1)) + '/3   ' + [0, 1, 2].map(i => FH.hist[i] === undefined ? '○' : FH.hist[i] ? '🏀✔' : '✖').join(' '));
}
function fhRoar(big) { try { p3Noise(big ? 1.4 : 0.7, big ? 0.16 : 0.07, big ? 1800 : 900); setTimeout(() => p3Noise(big ? 1.1 : 0.5, big ? 0.12 : 0.05, 1400), 250); if (big) setTimeout(() => p3Noise(0.9, 0.09, 2200), 600); } catch (e) {} }
function fhEnd(res) {
    if (res === 'miss') fhRoar(0); FH.ph = 'result'; FH.t = 0; FH.res = res; FH.hist.push(res !== 'miss');
    if (res === 'swish') { p3Big('SWISH!', '#fb923c'); StudioAudioManager.playSFX('cheer'); fhConf(); } else if (res === 'bucket') { p3Big('BUCKET!', '#fb923c'); StudioAudioManager.playSFX('cheer'); fhConf(); } else p3Big('MISS!', '#cbd5e1');
}
function fhConf() {
    const pa = FH.conf.geometry.attributes.position.array, ca = FH.conf.geometry.attributes.color.array, cs = [[1, .3, .3], [.3, .6, 1], [1, .85, .2], [.4, 1, .5], [1, 1, 1]]; FH.confV = [];
    for (let i = 0; i < 240; i++) { pa[i * 3] = (Math.random() - 0.5) * 3; pa[i * 3 + 1] = 5 + Math.random(); pa[i * 3 + 2] = 1 + Math.random() * 3; const c = cs[i % 5]; ca[i * 3] = c[0]; ca[i * 3 + 1] = c[1]; ca[i * 3 + 2] = c[2]; FH.confV.push([(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2]); }
    FH.conf.visible = true; FH.conf.geometry.attributes.position.needsUpdate = true; FH.conf.geometry.attributes.color.needsUpdate = true;
}
function fhRender() {
    const rn = S3.renderer, sc = S3.scene, cam = S3.camera; if (!rn || !sc) return; P3.clock++;
    if (!isStageRunning) { p3Say('p3tip', 'Press SHOOT HOOPS'); p3Say('p3name', ''); p3Say('p3dots', ''); if (FH.ph === 'ready') { FH.pose(0); const h = FH.hands(); FH.ballPos.set(h.x, h.y + 0.02, h.z - 0.04); } }
    FH.ball.position.copy(FH.ballPos); const v = FH.vel; if (v.length() > 0.3 && FH.ballPos.y > FH_R + 0.01) FH.ball.rotateX(-0.12);
    fhNetUpdate();
    const live = (FH.ph === 'aim' || !isStageRunning);
    FH.mark.visible = false; FH.arc.visible = false; FH.mark.position.set(FH.aimX, 3.05, 0.38); FH.mark.scale.setScalar(1 + 0.1 * Math.sin(P3.clock * 0.2));
    if (live) { const from = FH.hands ? FH.ballPos.clone() : new THREE.Vector3(0, 2.2, 4.6); const sh = new THREE.Vector3(FH.ballPos.x, 2.3, 4.6), v0 = fhSolve(FH.aimX, sh), pts = []; for (let i = 0; i <= 40; i++) { const tt = i * 0.035; pts.push(new THREE.Vector3(sh.x + v0.x * tt, sh.y + v0.y * tt - 0.5 * FH_G * tt * tt, sh.z + v0.z * tt)); if (pts[i].y < 3.05 && tt > 0.4) break; } FH.arc.geometry.setFromPoints(pts); FH.arc.computeLineDistances(); }
    const ind = document.getElementById('p3ind'); if (ind) ind.style.bottom = (FH.pw * 100) + '%'; const pw = document.getElementById('p3pow'); if (pw) pw.style.display = 'none'; fhDrawStroke();
    const au = document.getElementById('p3auto'); if (au) au.style.display = (FH.ph === 'aim' && isStageRunning) ? 'block' : 'none';
    if (FH.conf.visible) { const pa = FH.conf.geometry.attributes.position.array; for (let i = 0; i < FH.confV.length; i++) { FH.confV[i][1] -= 0.004; pa[i * 3] += FH.confV[i][0] * 0.01; pa[i * 3 + 1] += FH.confV[i][1]; pa[i * 3 + 2] += FH.confV[i][2] * 0.01; if (pa[i * 3 + 1] < 0.05) { pa[i * 3 + 1] = 0.05; FH.confV[i][1] = 0; FH.confV[i][0] = 0; FH.confV[i][2] = 0; } } FH.conf.geometry.attributes.position.needsUpdate = true; }
    if (P3.clock % 3 === 0) FH.crowds.forEach(c => c.upd(P3.clock, FH.made ? 1 : 0));
    let tp, tl, f = 0.08, b = FH.ballPos;
    if (FH.ph === 'fly') { tp = new THREE.Vector3(2.4, 3.2, Math.max(5.6, 6.7 - FH.flyT * 0.015)); tl = new THREE.Vector3(b.x * 0.3, Math.max(2.4, Math.min(3.3, b.y * 0.7 + 0.6)), Math.max(0.3, b.z * 0.35)); f = 0.1; }
    else if (FH.ph === 'result' && FH.res !== 'miss') { tp = new THREE.Vector3(1.9, 2.9, 4.0); tl = new THREE.Vector3(0, 2.9, 0.3); f = 0.06; }
    else if (FH.ph === 'result') { tp = new THREE.Vector3(2.6, 2.7, 8.0); tl = new THREE.Vector3(0, 2.4, 0.5); }
    else { tp = new THREE.Vector3(1.2, 3.0, 10.5); tl = new THREE.Vector3(0, 1.9, 2.2); f = 0.12; }
    FH.camPos.lerp(tp, f); FH.camLook.lerp(tl, f); cam.position.copy(FH.camPos); cam.lookAt(FH.camLook); rn.render(sc, cam);
}

// ---- v9 3D sports wiring (modes 18 penalty, 19 free throw) ----
(function () {
    const _is = ss3IsMode; ss3IsMode = function (m) { return m === 18 || m === 19 || _is(m); };
    const _td = ss3Teardown; ss3Teardown = function () { p3HudRemove(); P3.on = null; _td(); };
    const _prep = prepareStageEntities, _step = ssStepNew, _draw = drawStageFrame;
    const on3d = m => S3.active && S3.mode === m && S3.scene;
    prepareStageEntities = function (m) {
        if (m === 18 && on3d(18)) { pkPrepare(); return; }
        if (m === 19 && on3d(19) && typeof fhPrepare === 'function') { fhPrepare(); return; }
        _prep(m);
    };
    ssStepNew = function () {
        if (ssG.mode === 18 && on3d(18)) return pkStep();
        if (ssG.mode === 19 && on3d(19) && typeof fhStep === 'function') return fhStep();
        _step();
    };
    drawStageFrame = function (isFinal) {
        if (on3d(18)) { pkRender(); return; }
        if (on3d(19) && typeof fhRender === 'function') { fhRender(); return; }
        _draw(isFinal);
    };
})();

// ---- richer card thumbnails for Penalty Shootout (18) and Free Throw (19) ----
(function () {
    const _c = getModeCardSVG;
    const net = (x, y, w, h, id) => `<pattern id="n${id}" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0,0 L9,9 M9,0 L0,9" stroke="#fff" stroke-opacity=".55" stroke-width="1"/></pattern><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#n${id})"/>`;
    const crowd = (y, h, seed) => { let s = seed, o = ''; const cs = ['#ef4444', '#3b82f6', '#facc15', '#f8fafc', '#22c55e', '#f97316', '#a855f7']; for (let r = 0; r < h / 7; r++) for (let i = 0; i < 70; i++) { s = (s * 16807) % 2147483647; o += `<circle cx="${i * 6 + (r % 2) * 3}" cy="${y + r * 7}" r="2.6" fill="${cs[s % 7]}" opacity=".85"/>`; } return o; };
    const art = {
        18: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="s18" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050914"/><stop offset="1" stop-color="#1e3a6e"/></linearGradient><linearGradient id="g18" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fae4c"/><stop offset="1" stop-color="#1f7a33"/></linearGradient><radialGradient id="l18"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="220" fill="url(#s18)"/><circle cx="40" cy="22" r="40" fill="url(#l18)"/><circle cx="360" cy="22" r="40" fill="url(#l18)"/>${crowd(30, 70, 7)}
        <rect y="100" width="400" height="14" fill="#1d4ed8"/><rect x="80" y="100" width="70" height="14" fill="#dc2626"/><rect x="220" y="100" width="90" height="14" fill="#16a34a"/>
        <rect y="114" width="400" height="106" fill="url(#g18)"/><path d="M0,150 H400 M0,185 H400" stroke="#fff" stroke-opacity=".08" stroke-width="16"/>
        <path d="M-20,214 L120,152 H280 L420,214" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>
        <rect x="100" y="64" width="200" height="86" fill="#0a1224" fill-opacity=".55"/>${net(100, 64, 200, 86, 18)}
        <path d="M100,150 V64 H300 V150" fill="none" stroke="#f8fafc" stroke-width="7" stroke-linejoin="round"/>
        <g transform="translate(222 98) rotate(-62)"><rect x="-8" y="-10" width="18" height="34" rx="8" fill="#facc15"/><circle cx="-1" cy="-18" r="8" fill="#c68a62"/><rect x="-5" y="22" width="5" height="22" rx="2" fill="#111827"/><rect x="3" y="22" width="5" height="22" rx="2" fill="#111827"/><path d="M-6,-6 L-40,-30" stroke="#facc15" stroke-width="7" stroke-linecap="round"/><circle cx="-44" cy="-33" r="7" fill="#fff"/></g>
        <path d="M200,205 Q238,120 262,82" fill="none" stroke="#fde047" stroke-width="3" stroke-dasharray="7 6"/>
        <ellipse cx="200" cy="212" rx="14" ry="4" fill="#000" fill-opacity=".3"/><circle cx="200" cy="203" r="12" fill="#f8fafc" stroke="#111827" stroke-width="1.5"/><path d="M200,196 l5,4 -2,6 h-6 l-2,-6z" fill="#111827"/>
        <circle cx="262" cy="80" r="9" fill="none" stroke="#fde047" stroke-width="3"/><path d="M262,68 v24 M250,80 h24" stroke="#fde047" stroke-width="2"/></svg>`,
        19: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="s19" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050914"/><stop offset="1" stop-color="#1b2a52"/></linearGradient><linearGradient id="f19" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9783a"/><stop offset="1" stop-color="#e0a867"/></linearGradient><radialGradient id="l19"><stop offset="0" stop-color="#fff3d0"/><stop offset="1" stop-color="#fff3d0" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="220" fill="url(#s19)"/><circle cx="200" cy="0" r="170" fill="url(#l19)" opacity=".5"/>${crowd(20, 80, 11)}
        <rect y="104" width="400" height="14" fill="#dc2626"/><rect x="60" y="104" width="90" height="14" fill="#1d4ed8"/><rect x="250" y="104" width="80" height="14" fill="#f59e0b"/>
        <rect y="118" width="400" height="102" fill="url(#f19)"/><path d="M0,140 H400 M0,165 H400 M0,192 H400" stroke="#000" stroke-opacity=".08" stroke-width="2"/>
        <path d="M130,118 L90,220 H310 L270,118Z" fill="#b91c1c" fill-opacity=".8"/><ellipse cx="200" cy="205" rx="50" ry="10" fill="none" stroke="#fff" stroke-width="3"/><path d="M130,118 L90,220 M270,118 L310,220" stroke="#fff" stroke-width="3"/>
        <rect x="190" y="26" width="20" height="92" fill="#475569" opacity="0"/><rect x="170" y="14" width="60" height="6" fill="#cbd5e1"/>
        <rect x="150" y="16" width="100" height="62" rx="3" fill="#cfe8ff" fill-opacity=".35" stroke="#f8fafc" stroke-width="4"/><rect x="180" y="44" width="40" height="30" fill="none" stroke="#f8fafc" stroke-width="3"/>
        <path d="M172,86 L186,112 H214 L228,86" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M178,92 L194,108 M190,88 L202,112 M210,88 L198,112 M222,92 L206,108" stroke="#fff" stroke-width="1.2" stroke-opacity=".8"/>
        <ellipse cx="200" cy="86" rx="30" ry="7" fill="none" stroke="#ff5a1f" stroke-width="4.5"/>
        <path d="M120,176 Q150,40 196,78" fill="none" stroke="#fde047" stroke-width="3" stroke-dasharray="7 6"/>
        <circle cx="198" cy="64" r="11" fill="#e8772e" stroke="#2a1608" stroke-width="1.6"/><path d="M187,64 H209 M198,53 V75" stroke="#2a1608" stroke-width="1.4"/>
        <g transform="translate(112 150)"><rect x="-9" y="0" width="18" height="34" rx="8" fill="#2563eb"/><circle cx="0" cy="-9" r="8" fill="#d9a47a"/><rect x="-7" y="30" width="6" height="22" rx="2" fill="#1e3a8a"/><rect x="1" y="30" width="6" height="22" rx="2" fill="#1e3a8a"/><path d="M3,4 L16,-26" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/><circle cx="17" cy="-29" r="5.5" fill="#d9a47a"/></g></svg>`
    };
    getModeCardSVG = function (id) { if (art[id]) return `data:image/svg+xml;utf8,${encodeURIComponent(art[id])}`; return _c(id); };
})();

// ============================================================================
// v9 3D WHEEL OF FORTUNE (mode 3) rebuilt: exact landing, smooth easing, spring flapper, synced ticks
// ============================================================================
const WH = { a: -1.2, names: [], win: 0, a0: 0, a1: 0, dur: 390, f: 0, fv: 0, last: -1, speed: 0, done: false, flash: 0 };
const WH_TWO = Math.PI * 2;
function wh3Target(i, n) { return -Math.PI / 2 - (i + 0.5) * (WH_TWO / n); }
function wh3Plan(a0) {
    const n = WH.names.length, tgt = wh3Target(WH.win, n);
    let d = ((tgt - a0) % WH_TWO + WH_TWO) % WH_TWO; const spins = 5 + Math.floor(Math.random() * 2);
    WH.a0 = a0; WH.a1 = a0 + spins * WH_TWO + d;
}
function wh3Prepare() {
    let names = ss9Pool(24); if (!names.length) names = ['—'];
    WH.names = names; WH.win = Math.floor(Math.random() * names.length); WH.done = false; WH.f = 0; WH.fv = 0; WH.speed = 0; WH.flash = 0;
    try { WH.dur = Math.max(140, Math.round(390 / (ssGetPace ? ssGetPace() : 1))); } catch (e) { WH.dur = 390; }
    wh3Plan(WH.a); WH.last = -1;
    ssG = { mode: 3, names, winnerIdx: WH.win, phase: 'idle', parts: [] }; stageTick = 0;
}
function wh3Force(i) { WH.win = i; wh3Plan(WH.a0); }
function wh3E(p) { const q = Math.min(1, p), e = 1 - Math.pow(1 - q, 3.3), s = Math.min(1, q / 0.07); return e * (s * s * (3 - 2 * s)); }
function wh3Idx(a) { const n = WH.names.length; return Math.floor((((-Math.PI / 2 - a) % WH_TWO) + WH_TWO) % WH_TWO / (WH_TWO / n)); }
function wh3Tick(sp) { try { const f = 1500 + Math.min(1200, sp * 2600); rksBeep(f, 0.03, 0.05 + Math.min(0.06, sp * 0.3), 'triangle'); p3Noise(0.02, 0.05 + Math.min(0.08, sp * 0.4), 3500); } catch (e) {} }
function wh3Step() {
    const t = stageTick, prev = WH.a; WH.a = WH.a0 + (WH.a1 - WH.a0) * wh3E(t / WH.dur); WH.speed = Math.abs(WH.a - prev);
    if (t === 1) { try { p3Noise(0.5, 0.12, 700); } catch (e) {} }
    const idx = wh3Idx(WH.a); if (idx !== WH.last) { if (WH.last >= 0) { WH.fv += Math.min(0.55, 0.14 + WH.speed * 1.3); wh3Tick(WH.speed); } WH.last = idx; }
    WH.fv -= WH.f * 0.32; WH.fv *= 0.8; WH.f = Math.max(0, Math.min(0.7, WH.f + WH.fv));
    if (t === WH.dur + 2) { WH.a = WH.a1; WH.done = true; WH.flash = 1; try { rksBeep(880, 0.2, 0.1, 'sine'); setTimeout(() => rksBeep(1320, 0.35, 0.1, 'sine'), 140); } catch (e) {} }
    if (t > WH.dur) WH.flash *= 0.97;
    if (t >= WH.dur + 80 && !WH.crowned) { WH.crowned = true; ssCrownWinner(WH.names[WH.win], '🎡', 'WHEEL OF FORTUNE', '🎡 The wheel chose: ' + WH.names[WH.win] + '!'); }
    if (t === 1) WH.crowned = false;
}
function wh3Draw(ctx, W, H) {
    const cx = 640, cy = 340, R = 252, n = WH.names.length, seg = WH_TWO / n, a = WH.a, tm = (ssTm ? ssTm() : stageTick), sp = WH.speed;
    if (!isStageRunning && !WH.done) WH.a += 0.0035;
    ctx.fillStyle = ssRg(ctx, cx, cy, 60, 800, [[0, '#3b1a6b'], [0.55, '#1e1047'], [1, '#080519']]); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { const lx = 160 + i * 240; ctx.fillStyle = ssLg(ctx, lx, 0, lx, H, [[0, 'rgba(255,230,150,0.20)'], [1, 'rgba(255,230,150,0)']]); ctx.beginPath(); ctx.moveTo(lx - 8, 0); ctx.lineTo(lx + 8, 0); ctx.lineTo(lx + 110 - i * 55, H); ctx.lineTo(lx - 110 - i * 55 + 110, H); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = ssRg(ctx, cx, H - 30, 10, 420, [[0, 'rgba(168,85,247,0.5)'], [1, 'rgba(168,85,247,0)']]); ctx.beginPath(); ctx.ellipse(cx, H - 28, 420, 60, 0, 0, WH_TWO); ctx.fill();
    // stand + shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(cx, cy + R + 30, R * 0.85, 22, 0, 0, WH_TWO); ctx.fill();
    ctx.fillStyle = ssLg(ctx, cx - 60, cy, cx + 60, cy, [[0, '#4b5563'], [0.5, '#9ca3af'], [1, '#374151']]); ctx.beginPath(); ctx.moveTo(cx - 70, cy + R + 28); ctx.lineTo(cx - 22, cy); ctx.lineTo(cx + 22, cy); ctx.lineTo(cx + 70, cy + R + 28); ctx.closePath(); ctx.fill();
    // slices
    ctx.save(); ctx.translate(cx, cy);
    for (let i = 0; i < n; i++) {
        const a0 = a + i * seg, a1 = a0 + seg, hue = (i * 360 / n * 1.0 + (i % 2) * 18) % 360, win = WH.done && i === WH.win;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
        ctx.fillStyle = `hsl(${hue},${win ? 92 : 72}%,${win ? 62 : 50}%)`; ctx.fill();
        ctx.save(); ctx.clip(); const gr = ctx.createRadialGradient(0, 0, 20, 0, 0, R); gr.addColorStop(0, 'rgba(0,0,0,0.28)'); gr.addColorStop(0.25, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)'); ctx.fillStyle = gr; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.save(); ctx.rotate(a0 + seg / 2); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const nm = WH.names[i]; let fs = n <= 12 ? 24 : n <= 18 ? 20 : 18; ctx.font = '900 ' + fs + 'px "Plus Jakarta Sans", "Cairo", sans-serif'; while (fs > 10 && ctx.measureText(nm).width > R - 100) { fs--; ctx.font = '900 ' + fs + 'px "Plus Jakarta Sans", "Cairo", sans-serif'; }
        ctx.globalAlpha = 1 - Math.min(0.45, sp * 1.2); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4; ctx.fillText(nm, R - 26, 0); ctx.restore();
    }
    // winner glow at rest
    if (WH.done) { const i = WH.win, a0 = a + i * seg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a0 + seg); ctx.closePath(); ctx.lineWidth = 6; ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * Math.sin(stageTick * 0.2)})`; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.restore();
    // pegs
    for (let i = 0; i < n; i++) { const an = a + i * seg; ctx.fillStyle = '#fff7d6'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 3; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * (R - 5), cy + Math.sin(an) * (R - 5), 4.5, 0, WH_TWO); ctx.fill(); ctx.shadowBlur = 0; }
    // rim
    ctx.lineWidth = 18; ctx.strokeStyle = ssLg(ctx, cx - R, cy - R, cx + R, cy + R, [[0, '#fde047'], [0.5, '#d97706'], [1, '#78350f']]); ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, WH_TWO); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx, cy, R + 16, 0, WH_TWO); ctx.stroke();
    for (let b = 0; b < 28; b++) { const an = b / 28 * WH_TWO, on = (b + Math.floor(a * 6)) % 2 === 0 || WH.done; ctx.fillStyle = on ? '#fff3b0' : '#92400e'; if (on) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 12; } ctx.beginPath(); ctx.arc(cx + Math.cos(an) * (R + 8), cy + Math.sin(an) * (R + 8), 4.2, 0, WH_TWO); ctx.fill(); ctx.shadowBlur = 0; }
    // hub
    ctx.fillStyle = ssRg(ctx, cx - 10, cy - 12, 4, 46, [[0, '#fff7c2'], [0.5, '#f59e0b'], [1, '#78350f']]); ctx.beginPath(); ctx.arc(cx, cy, 40, 0, WH_TWO); ctx.fill(); ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 3; ctx.stroke();
    // flapper pointer: pivot above the rim, tip rests at the slice centre line
    ctx.save(); ctx.translate(cx, cy - R - 30); ctx.rotate(-WH.f * 0.9);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10; ctx.fillStyle = ssLg(ctx, 0, 0, 0, 62, [[0, '#f87171'], [1, '#991b1b']]); ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(17, 0); ctx.lineTo(0, 62); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(0, 4, 8, 0, WH_TWO); ctx.fill(); ctx.restore();
    if (WH.done) { ctx.fillStyle = 'rgba(2,6,23,.7)'; const nm = WH.names[WH.win]; ctx.font = '900 30px "Plus Jakarta Sans","Cairo",sans-serif'; const w = ctx.measureText(nm).width + 60; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, 14, w, 52, 26) : ctx.rect(cx - w / 2, 14, w, 52); ctx.fill(); ctx.fillStyle = '#fde047'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(nm, cx, 41); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
(function () {
    const _prep = prepareStageEntities, _step = ssStepNew, _draw = drawStageFrame, _trig = triggerActiveStageAnimation;
    prepareStageEntities = function (m) { if (m === 3) { wh3Prepare(); return; } _prep(m); };
    ssStepNew = function () { if (ssG && ssG.mode === 3 && activeStageMode === 3) return wh3Step(); _step(); };
    drawStageFrame = function (isFinal) {
        if (activeStageMode === 3 && !S3.active) {
            const c = document.getElementById('stageCanvas'); if (!c) return; const ctx = c.getContext('2d'); ctx.save(); ctx.clearRect(0, 0, c.width, c.height);
            wh3Draw(ctx, c.width, c.height); ctx.restore(); if (isFinal) ssDrawConfetti(ctx, c.width, c.height); return;
        }
        _draw(isFinal);
    };
    triggerActiveStageAnimation = function () {
        if (activeStageMode === 3) { if (isStageRunning) return; if (getActiveStudents().length === 0) return alert('No students in current class!'); ssRunNewMode(null); return; }
        _trig();
    };
})();

// ===== Merged-build bridge (Studio side): award classTracker behavior icons =====
(function ssBridge() {
    const EMB = window.parent !== window; if (!EMB) return;
    const BH = [
        ['leader', 'positive', 'fa-crown', '#2563eb', 'Leadership'], ['creative', 'positive', 'fa-lightbulb', '#eab308', 'Creative Idea'], ['participation', 'positive', 'fa-hand', '#16a34a', 'Participation'],
        ['homework', 'positive', 'fa-book-open', '#2563eb', 'Homework Done'], ['strong', 'positive', 'fa-dumbbell', '#2563eb', 'Strong Effort'], ['help', 'positive', 'fa-handshake', '#f97316', 'Helpful'], ['star', 'positive', 'fa-star', '#eab308', 'Star Student'],
        ['late', 'negative', 'fa-clock', '#ef4444', 'Late'], ['missing', 'negative', 'fa-triangle-exclamation', '#ef4444', 'Missing Materials'], ['mute', 'negative', 'fa-volume-xmark', '#475569', 'Talking'], ['search', 'negative', 'fa-magnifying-glass', '#16a34a', 'Distracted'],
        ['play', 'negative', 'fa-users', '#475569', 'Playing around'], ['food', 'negative', 'fa-burger', '#475569', 'Eating/Drinking'], ['run', 'negative', 'fa-person-running', '#475569', 'Out of seat'], ['other_neg', 'negative', 'fa-circle-exclamation', '#ef4444', 'Other Issue']
    ];
    const st = document.createElement('style');
    st.textContent = `#bhvPanel{position:fixed;left:50%;bottom:26px;transform:translate(-50%,30px);opacity:0;pointer-events:none;z-index:2147483000;background:#fff;border-radius:22px;box-shadow:0 18px 60px rgba(15,23,42,.45);padding:16px 20px 14px;max-width:94vw;transition:all .25s;font-family:inherit;direction:ltr}
#bhvPanel.on{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#bhvPanel h4{margin:0 0 10px;font-size:16px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:8px}
#bhvPanel h4 span.nm{color:#2563eb}#bhvPanel .x{margin-left:auto;border:0;background:#f1f5f9;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:14px}
#bhvPanel .row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.bhvB{width:54px;height:54px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s,border-color .15s}
.bhvB i{font-size:24px}.bhvB:hover{transform:translateY(-3px);border-color:#2563eb}.bhvB:active{transform:scale(.94)}
.bhvB.done{background:#e0f2fe;border-color:#3b82f6}
#bhvPanel .tg{margin-top:10px;text-align:center}#bhvPanel .tg button{border:0;background:none;color:#64748b;font-weight:800;font-size:12px;cursor:pointer;text-decoration:underline}
#bhvFab{position:fixed;right:18px;bottom:18px;z-index:2147482000;border:0;border-radius:50%;width:56px;height:56px;justify-content:center;font-size:24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 8px 24px rgba(217,119,6,.5);cursor:pointer;display:none;align-items:center;gap:8px}
#bhvFab.on{display:flex}`;
    document.head.appendChild(st);
    const panel = document.createElement('div'); panel.id = 'bhvPanel'; document.body.appendChild(panel);
    const fab = document.createElement('button'); fab.id = 'bhvFab'; fab.innerHTML = '<i class="fa-solid fa-medal"></i>'; fab.title = 'Award behavior'; fab.setAttribute('aria-label', 'Award behavior'); document.body.appendChild(fab);
    let neg = false, who = '', awarded = {};
    function render() {
        const list = BH.filter(b => neg ? b[1] === 'negative' : b[1] === 'positive');
        panel.innerHTML = `<h4><i class="fa-solid fa-medal" style="color:#f59e0b"></i> Award to <span class="nm"></span><button class="x" type="button" title="Close">✕</button></h4><div class="row">` +
            list.map(b => `<button type="button" class="bhvB${awarded[who + b[0]] ? ' done' : ''}" data-id="${b[0]}" title="${b[4]}" aria-label="${b[4]}"><i class="fa-solid ${b[2]}" style="color:${b[3]}"></i></button>`).join('') +
            `</div><div class="tg"><button type="button" class="swap">${neg ? '← Back to positive icons' : 'Show negative icons'}</button></div>`;
        panel.querySelector('.nm').textContent = who;
        panel.querySelector('.x').onclick = hide;
        panel.querySelector('.swap').onclick = () => { neg = !neg; render(); };
        panel.querySelectorAll('.bhvB').forEach(btn => btn.onclick = () => {
            awarded[who + btn.dataset.id] = 1; btn.classList.add('done');
            try { StudioAudioManager.playSFX(neg ? 'click' : 'cheer'); } catch (e) {}
            window.parent.postMessage({ t: 'award', cls: appState.currentClass, student: who, idx: (appState.classes[appState.currentClass] || []).indexOf(who), behaviorId: btn.dataset.id }, '*');
        });
    }
    function show(name) { if (!name) return; who = name; neg = false; render(); panel.classList.add('on'); }
    function hide() { panel.classList.remove('on'); }
    window.ssBhvShow = show;
    fab.onclick = () => show(appState.challenger);
    window.addEventListener('message', e => {
        const d = e.data; if (!d || d.t !== 'awardResult') return;
        try { showToast((d.ok ? '✅ ' : '⚠️ ') + d.msg); } catch (x) {}
    });
    const _chk = checkArenaAnswer;
    checkArenaAnswer = function (c, r) { _chk(c, r); if (c === r && appState.challenger) setTimeout(() => show(appState.challenger), 700); };
    setInterval(() => {
        const q = document.getElementById('arenaQuestionText'), w = document.getElementById('stageWinnerOverlay');
        const vis = (q && q.offsetParent !== null) || (w && w.style.display !== 'none' && w.offsetParent !== null);
        fab.classList.toggle('on', !!vis && !!appState.challenger); if (!vis) hide();
    }, 600);

    // ---- one shared dataset: classes + students are synced with the Portal ----
    const norm = x => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const fuzzy = (a, b) => { const ta = norm(a).split(' '), tb = norm(b).split(' '); const [sm, lg] = ta.length <= tb.length ? [ta, tb] : [tb, ta]; return sm.length >= 2 && sm.every(t => lg.includes(t)); };
    let merged = false, applying = false, lastSent = '', tmr = null;
    const snap = () => { const o = {}; Object.keys(appState.classes || {}).forEach(k => o[k] = (appState.classes[k] || []).slice()); return o; };
    function push(force) {
        if (applying || !merged) return; const c = snap(), j = JSON.stringify([c, appState.currentClass]);
        if (j === lastSent && !force) return; lastSent = j;
        window.parent.postMessage({ t: 'studioSnapshot', classes: c, cur: appState.currentClass }, '*');
    }
    function applySnap(sn) {
        applying = true;
        try {
            const old = appState.classes || {}, nc = {};
            Object.keys(sn.classes).forEach(k => nc[k] = sn.classes[k].slice());
            appState.classes = nc;
            if (sn.cur && nc[sn.cur]) appState.currentClass = sn.cur;
            if (!nc[appState.currentClass]) appState.currentClass = Object.keys(nc)[0] || appState.currentClass;
            try { syncStudioData(); } catch (e) {}
            lastSent = JSON.stringify([snap(), appState.currentClass]);
            try { renderAllDashboard(); } catch (e) {}
        } finally { applying = false; }
    }
    function mergeFirst(P) {
        const oldS = snap(); let fz = 0, added = 0;
        try { if (!localStorage.getItem(smk7('SGE_SM_PREMERGE_STUDIO'))) localStorage.setItem(smk7('SGE_SM_PREMERGE_STUDIO'), JSON.stringify(oldS)); } catch (e) {}
        const out = {}; Object.keys(P.classes).forEach(k => out[k] = P.classes[k].slice());
        Object.keys(oldS).forEach(k => {
            let key = Object.keys(out).find(x => norm(x) === norm(k)); if (!key) { if (oldS[k].length) { out[k] = oldS[k].slice(); added += oldS[k].length; } return; }
            const list = out[key], exact = new Set(list.map(norm));
            oldS[k].forEach(nm => {
                if (exact.has(norm(nm))) return;
                const cand = list.filter(p => !oldS[k].some(o => norm(o) === norm(p)) && fuzzy(nm, p));
                if (cand.length === 1) { fz++; return; }
                list.push(nm); exact.add(norm(nm)); added++;
            });
        });
        const cur = oldS[appState.currentClass] ? (Object.keys(out).find(x => norm(x) === norm(appState.currentClass))) : P.cur;
        applySnap({ classes: out, cur: cur || P.cur });
        merged = true; window.__smRosterMerged = true; push(true);
        if (added || fz) { try { showToast('🔗 Studio + Portal rosters unified (' + added + ' added' + (fz ? ', ' + fz + ' matched by name' : '') + '). Backup kept on this device.'); } catch (e) {} }
    }
    const _sd = syncStudioData;
    syncStudioData = function () { _sd(); clearTimeout(tmr); tmr = setTimeout(() => push(false), 120); };
    window.addEventListener('message', e => {
        const d = e.data; if (!d) return;
        if (d.t === 'portalSnapshot') {
            if (!merged) {
                const fk = smk7('SGE_SM_STUDIO_MIGRATED_' + (window.__smT || '')); let done = false; try { done = !!localStorage.getItem(fk); } catch (x) {}
                if (!done) { mergeFirst(d); try { localStorage.setItem(fk, '1'); } catch (x) {} }
                else { applySnap(d); merged = true; window.__smRosterMerged = true; push(true); }
            } else applySnap(d);
        }
        else if (d.t === 'portalChanged' && merged) applySnap(d);
        else if (d.t === 'session') { window.__smT = d.name; window.__smUserName = d.name; window.__smRole = d.role || 'teacher'; window.__smToken = d.token || ''; window.__smSchoolHash = smSchoolHash(d.school || ''); try { document.getElementById('loginScreen').style.display = 'none'; document.getElementById('studioMainShell').style.display = 'flex'; renderAllDashboard(); } catch (x) {} if (window.smServerStudioLoad) smServerStudioLoad(); }
    });
    window.parent.postMessage({ t: 'ready', who: 'studio' }, '*');
    // nav tab: jump to the behavior portal + sign-out
    const nav = document.querySelector('nav.portal-nav');
    if (nav) { const b = document.createElement('button'); b.type = 'button'; b.className = 'portal-tab'; b.id = 'tab_behavior'; b.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;'; b.innerHTML = '<i class="fa-solid fa-clipboard-user"></i> Behavior Portal'; b.onclick = () => window.parent.postMessage({ t: 'goto', to: 'portal' }, '*'); nav.appendChild(b); }
    const gear = document.querySelector('.header-widgets .top-circle-btn[onclick*="openSettingsModal"]');
    if (gear) { const o = document.createElement('button'); o.type = 'button'; o.className = 'top-circle-btn'; o.title = 'Sign out / switch user'; o.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>'; o.onclick = () => window.parent.postMessage({ t: 'signout' }, '*'); gear.parentNode.insertBefore(o, gear.nextSibling); }
})();

// ===== Presentation side bars (merged build only): left = class list + behavior icons, right = Top Students (read-only) =====
(function ssPresBar() {
    if (window.parent === window && !window.SS_PRESBAR_FORCE) return;
    const POS = [['leader', 'fa-crown', '#2563eb', 'Leadership'], ['creative', 'fa-lightbulb', '#eab308', 'Creative Idea'], ['participation', 'fa-hand', '#16a34a', 'Participation'], ['homework', 'fa-book-open', '#2563eb', 'Homework Done'], ['strong', 'fa-dumbbell', '#2563eb', 'Strong Effort'], ['help', 'fa-handshake', '#f97316', 'Helpful'], ['star', 'fa-star', '#eab308', 'Star Student']];
    const NEG = [['late', 'fa-clock', '#ef4444', 'Late'], ['missing', 'fa-triangle-exclamation', '#ef4444', 'Missing Materials'], ['mute', 'fa-volume-xmark', '#475569', 'Talking'], ['search', 'fa-magnifying-glass', '#16a34a', 'Distracted'], ['play', 'fa-users', '#475569', 'Playing around'], ['food', 'fa-burger', '#475569', 'Eating/Drinking'], ['run', 'fa-person-running', '#475569', 'Out of seat'], ['other_neg', 'fa-circle-exclamation', '#ef4444', 'Other Issue']];
    const css = document.createElement('style'); css.textContent = `
.pbWrap{position:absolute;top:0;bottom:0;width:0;z-index:40;pointer-events:none;direction:ltr}.pbWrap.L{left:0}.pbWrap.R{right:0}
.pbFab{position:absolute;top:var(--py,50%);touch-action:none;transform:translateY(-50%);width:36px;height:36px;border:0;border-radius:50%;color:#fff;font-size:15px;cursor:pointer;pointer-events:auto;box-shadow:0 6px 18px rgba(15,23,42,.4);display:flex;align-items:center;justify-content:center;transition:top .2s,transform .2s}
.pbWrap.L .pbFab{left:7px;background:linear-gradient(135deg,#2563eb,#38bdf8)}.pbWrap.R .pbFab{right:7px;background:linear-gradient(135deg,#f59e0b,#d97706)}
.pbWrap.open .pbFab{top:7px;transform:none}
.pbPan{position:absolute;top:50px;bottom:7px;width:clamp(170px,15vw,300px);background:rgba(255,255,255,.97);border:1px solid #cbd5e1;border-radius:18px;box-shadow:0 8px 26px rgba(15,23,42,.28);display:none;flex-direction:column;padding:4px 3px;pointer-events:auto;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
.pbPan::-webkit-scrollbar{display:none}
.pbWrap.L .pbPan{left:5px}.pbWrap.R .pbPan{right:5px}.pbWrap.open .pbPan{display:flex}
.pbRow{flex:0 0 auto;border:0;background:#eef2ff;margin:1px 0;border-radius:9px;font-weight:800;color:#1e293b;cursor:pointer;padding:0 6px 0 4px;display:flex;align-items:center;gap:6px;font-family:inherit;width:100%;text-align:left}
.pbRow .pbNm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbNo{display:inline-block;min-width:22px;color:#2563eb;font-weight:900;flex:0 0 auto}.pbRow.sel .pbNo{color:#fde047}.pbRow{text-align:left}.pbRow:hover{background:#dbeafe}.pbRow.sel{background:#2563eb;color:#fff}
.pbBox{background:#f8fafc;border:1px solid #bfdbfe;border-radius:10px;padding:3px;margin:0 0 3px;flex:0 0 auto}
.pbGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.pbIc{border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;aspect-ratio:1/1;transition:transform .12s,background .12s}
.pbIc:active{transform:scale(.88)}.pbIc.ok{background:#bbf7d0;border-color:#22c55e}
.pbIc.n{background:#fff7f7}.pbSep{height:1px;background:#e2e8f0;margin:3px 2px}
.pbTop{flex:0 0 auto;border-radius:12px;padding:5px 2px 4px;margin:2px 0;text-align:center;background:linear-gradient(180deg,#fff,#f1f5f9);border:1px solid #e2e8f0}
.pbTop .rk{width:28px;height:28px;border-radius:50%;margin:0 auto 2px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;background:#94a3b8}
.pbTop.r1{background:linear-gradient(180deg,#fffbeb,#fef3c7);border-color:#fcd34d}.pbTop.r1 .rk{background:#f59e0b}.pbTop.r2 .rk{background:#64748b}.pbTop.r3 .rk{background:#c2410c}
.pbTop .nm{font-size:14px;font-weight:900;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pbTop .nt{display:inline-block;margin-top:2px;font-size:12px;font-weight:900;color:#166534;background:#dcfce7;border-radius:8px;padding:0 5px}
.pbPct{flex:0 0 auto;min-width:34px;text-align:left;font-weight:900;color:#047857;font-size:.92em}.pbRow.sel .pbPct{color:#fde047}.pbPct.none{color:#94a3b8;font-weight:700}.pbRow.pbAll{background:linear-gradient(90deg,#1d4ed8,#3b82f6);color:#fff;margin-bottom:3px}.pbRow.pbAll .pbNo{color:#fde047}.pbRow.pbAll:hover{background:linear-gradient(90deg,#1e40af,#2563eb)}.pbRow.pbAll.sel{background:#0f172a}.pbRow.pbAll.sel .pbNo{color:#fde047}.pbEmpty{font-size:10px;font-weight:800;color:#64748b;text-align:center;padding:8px 2px}`;
    document.head.appendChild(css);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const first = n => String(n).trim().split(/\s+/)[0];
    const cls = () => (appState.classes && appState.classes[appState.currentClass]) || [];
    function shell(side, icon, title) {
        const w = document.createElement('div'); w.className = 'pbWrap ' + side; w.innerHTML = `<button type="button" class="pbFab" title="${title}" aria-label="${title}"><i class="fa-solid ${icon}"></i></button><div class="pbPan"></div>`;
        w.pan = w.querySelector('.pbPan'); w.isOpen = false; const fab = w.querySelector('.pbFab'), KEY = 'SM7_SGE_SM_PB_Y_' + side;
        try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= 0.04 && v <= 0.96) w.style.setProperty('--py', (v * 100) + '%'); } catch (e) {}
        let drag = null, moved = false;
        fab.addEventListener('pointerdown', e => { if (w.isOpen) return; drag = { y: e.clientY, h: w.getBoundingClientRect().height, top: w.getBoundingClientRect().top }; moved = false; try { fab.setPointerCapture(e.pointerId); } catch (x) {} });
        fab.addEventListener('pointermove', e => { if (!drag) return; if (Math.abs(e.clientY - drag.y) > 5) moved = true; if (!moved) return; const f = Math.max(0.05, Math.min(0.95, (e.clientY - drag.top) / drag.h)); w.style.setProperty('--py', (f * 100) + '%'); w._py = f; });
        const end = () => { if (!drag) return; drag = null; if (moved && w._py != null) { try { localStorage.setItem(KEY, String(w._py)); } catch (e) {} } };
        fab.addEventListener('pointerup', end); fab.addEventListener('pointercancel', end);
        fab.onclick = () => { if (moved) { moved = false; return; } w.isOpen = !w.isOpen; w.classList.toggle('open', w.isOpen); if (w.isOpen) w.render(true); };
        w.close = () => { w.isOpen = false; w.classList.remove('open'); }; return w;
    }
    // ---- A: class list, tap a name -> behavior icons open under it, award, list stays ----
    const A = shell('L', 'fa-users', 'Class list - behavior icons'); let sel = -1, lastSig = '', pcts = null;
    const askPct = () => { try { window.parent.postMessage({ t: 'pctReq' }, '*'); } catch (e) {} };
    window.addEventListener('message', e => { const d = e.data; if (d && d.t === 'pctRes' && d.ok) { if (String(d.cls || '').trim().toLowerCase() !== String(appState.currentClass || '').trim().toLowerCase()) return; const m = {}; (d.list || []).forEach(x => { m[x.i] = x; }); pcts = m; lastSig = ''; if (A.isOpen) A.render(false); } });
    A.render = function (force) {
        const names = cls(), sig = names.join('|') + '#' + sel + '#' + (pcts ? 1 : 0); const ord = names.map((n, i) => [n, i]).sort((a, b) => String(a[0]).trim().localeCompare(String(b[0]).trim(), undefined, { sensitivity: 'base', numeric: true }) || a[1] - b[1]); if (!force && sig === lastSig) return; lastSig = sig;
        const H = A.pan.clientHeight || 420, rh = Math.max(19, Math.min(44, (H - 12) / Math.max(1, names.length + 1) - 2)), fs = Math.max(10, Math.min(18, rh * 0.48));
        const icon = (d, n) => `<button type="button" class="pbIc${n ? ' n' : ''}" data-id="${d[0]}" title="${d[3]}" aria-label="${d[3]}"><i class="fa-solid ${d[1]}" style="color:${d[2]};font-size:17px"></i></button>`;
        const box = `<div class="pbBox"><div class="pbGrid">${POS.map(d => icon(d, 0)).join('')}</div><div class="pbSep"></div><div class="pbGrid">${NEG.map(d => icon(d, 1)).join('')}</div></div>`;
        const allRow = names.length ? `<button type="button" class="pbRow pbAll${sel === 'ALL' ? ' sel' : ''}" data-i="ALL" title="Award the whole class" style="height:${rh}px;font-size:${fs}px"><b class="pbNo"><i class="fa-solid fa-users"></i></b><span class="pbNm">All</span></button>` + (sel === 'ALL' ? box : '') : '';
        A.pan.innerHTML = (allRow + ord.map((o, k) => { const n = o[0], i = o[1]; const pc = pcts && pcts[i]; const pt = pc ? (pc.d ? pc.p + '%' : '\u2013') : ''; return `<button type="button" class="pbRow${i === sel ? ' sel' : ''}" data-i="${i}" title="${k + 1}. ${esc(n)}${pc && pc.d ? '  ' + pc.p + '%' : ''}" style="height:${rh}px;font-size:${fs}px"><b class="pbNo">${k + 1}</b><span class="pbPct${pc && !pc.d ? ' none' : ''}">${pt}</span><span class="pbNm">${esc(n)}</span></button>` +
            (i === sel ? box : ''); }).join('')) || '<div class="pbEmpty">No class</div>';
        A.pan.querySelectorAll('.pbRow').forEach(b => b.onclick = () => { const i = b.dataset.i === 'ALL' ? 'ALL' : +b.dataset.i; sel = sel === i ? -1 : i; lastSig = ''; A.render(true); const s = A.pan.querySelector('.pbRow.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); });
        A.pan.querySelectorAll('.pbIc').forEach(b => b.onclick = () => {
            if (sel === 'ALL') { b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 450);
                try { StudioAudioManager.playSFX(b.classList.contains('n') ? 'click' : 'cheer'); } catch (e) {}
                names.forEach((n, i) => { try { window.parent.postMessage({ t: 'award', cls: appState.currentClass, student: n, idx: i, behaviorId: b.dataset.id }, '*'); } catch (e) {} });
                setTimeout(askPct, 600); return; }
            const n = names[sel]; if (n == null) return; b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 450);
            try { StudioAudioManager.playSFX(b.classList.contains('n') ? 'click' : 'cheer'); } catch (e) {}
            try { window.parent.postMessage({ t: 'award', cls: appState.currentClass, student: n, idx: sel, behaviorId: b.dataset.id }, '*'); } catch (e) {}
            setTimeout(askPct, 600);
        });
        if (force && !pcts) askPct();
    };
    // ---- B: Top Students (read-only, from the merged dataset via the Portal ranking) ----
    const B = shell('R', 'fa-trophy', 'Top Students'); let top = null, tReq = 0;
    B.render = function () {
        if (!top || !top.ok) { B.pan.innerHTML = '<div class="pbEmpty">Top Students<br>loading…</div>'; return; }
        B.pan.innerHTML = top.list.length ? top.list.map((x, i) => `<div class="pbTop r${i + 1}" title="${esc(x.name)}  +${x.pos} / -${x.neg}  (${x.perc}%)"><div class="rk">${i + 1}</div><div class="nm">${esc(x.name)}</div><span class="nt">+${x.net}</span></div>`).join('') : '<div class="pbEmpty">No students qualify yet</div>';
    };
    window.addEventListener('message', e => { const d = e.data; if (d && d.t === 'topRes') { top = d; if (B.isOpen) B.render(); } });
    const ask = () => { try { window.parent.postMessage({ t: 'topReq' }, '*'); } catch (e) {} };
    B.querySelector('.pbFab').addEventListener('click', () => { if (B.isOpen) ask(); });
    let mounted = null, tick = 0;
    setInterval(() => {
        tick++; const v = document.getElementById('presenterViewport'), pv = document.getElementById('portal_presentation'), slot = document.getElementById('presenterContentSlot');
        const show = !!(v && pv && pv.classList.contains('active') && ((slot && slot.children.length) || (window.ssBdMode && window.ssBdMode() !== 'slides')));
        if (show) { if (mounted !== v) { if (getComputedStyle(v).position === 'static') v.style.position = 'relative'; v.appendChild(A); v.appendChild(B); mounted = v; } A.style.display = B.style.display = ''; if (A.isOpen) { A.render(false); if (tick % 6 === 0) askPct(); } if (B.isOpen && tick % 6 === 0) ask(); }
        else if (mounted) { A.style.display = B.style.display = 'none'; A.close(); B.close(); }
    }, 500);
    window.ssPresBar = { A, B, setSel: i => { sel = i; lastSig = ''; } };
})();


(function () { const c = document.createElement('style'); c.textContent = '@media (pointer:coarse),(min-width:1700px){.pbFab{width:48px;height:48px;font-size:20px}.pbPan{top:62px}.pbIc{border-radius:10px}.pbIc i{font-size:16px!important}}@media (min-width:2400px){.pbFab{width:64px;height:64px;font-size:26px}.pbPan{top:78px}}'; document.head.appendChild(c); })();

// ===== v12 Viewer-area modes: Slides / Whiteboard (blank or ruled, zoomable) / Web page (embed + nav controls) =====
(function ssBoard() {
    const BLOCKED = ['google.', 'bing.com', 'duckduckgo.com', 'facebook.', 'instagram.', 'twitter.', 'x.com', 'linkedin.', 'whatsapp.', 'britannica.com', 'classroom.google', 'zoom.us', 'teams.microsoft', 'tiktok.', 'bbc.co.', 'nature.com', 'sciencedirect.com', 'youtube.', 'youtu.be'];
    // v16: turn watch/share links into embeddable ones (YouTube, Vimeo, Google Drive/Docs)
    function embedUrl(u) {
        try {
            const x = new URL(u), h = x.hostname.toLowerCase().replace(/^(www|m)\./, '');
            if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
                const v = x.searchParams.get('v'), l = x.searchParams.get('list');
                if (x.pathname === '/watch' && v) return 'https://www.youtube.com/embed/' + v + (l ? '?list=' + encodeURIComponent(l) : '');
                const m = x.pathname.match(/^\/(shorts|live|embed)\/([\w-]{6,})/); if (m) return 'https://www.youtube.com/embed/' + m[2];
                if (x.pathname === '/playlist' && l) return 'https://www.youtube.com/embed/videoseries?list=' + encodeURIComponent(l);
            }
            if (h === 'youtu.be') { const id = x.pathname.slice(1).split('/')[0]; if (id) return 'https://www.youtube.com/embed/' + id; }
            if (h === 'vimeo.com') { const m = x.pathname.match(/^\/(\d+)/); if (m) return 'https://player.vimeo.com/video/' + m[1]; }
            if (h === 'drive.google.com') { const m = x.pathname.match(/\/file\/d\/([^/]+)/); if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview'; }
            if (h === 'docs.google.com') { const m = x.pathname.match(/^\/(document|presentation|spreadsheets)\/d\/([^/]+)/); if (m) return 'https://docs.google.com/' + m[1] + '/d/' + m[2] + (m[1] === 'presentation' ? '/embed?start=false&loop=false' : '/preview'); }
        } catch (e) {}
        return u;
    }
    // v16: "Reader view" — for sites that refuse embedding, fetch a read-only copy through a public CORS relay and show it in a script-free sandbox
    const PROXIES = [u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u), u => 'https://corsproxy.io/?url=' + encodeURIComponent(u), u => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u)];
    const LINKS = [['Wikipedia', 'https://en.wikipedia.org/'], ['ويكيبيديا', 'https://ar.wikipedia.org/'], ['Example', 'https://example.com/']];
    const css = document.createElement('style'); css.textContent = `
.bdMode{position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:46;display:flex;gap:2px;background:rgba(255,255,255,.96);border:1px solid #cbd5e1;border-radius:999px;padding:3px;box-shadow:0 4px 14px rgba(15,23,42,.2);direction:ltr}
.bdMode button{border:0;background:transparent;border-radius:999px;padding:4px 11px;font-weight:800;font-size:12px;color:#334155;cursor:pointer;font-family:inherit;display:flex;gap:5px;align-items:center}
.bdMode button.on{background:#2563eb;color:#fff}
.bdLayer{position:absolute;inset:0;z-index:30;display:none;direction:ltr;background:#fff;border-radius:inherit}
.bdLayer.on{display:block}
.bdBoard.ruled{background:linear-gradient(90deg,transparent 78px,#f87171 78px,#f87171 80px,transparent 80px),repeating-linear-gradient(#fff 0,#fff 35px,#bcd3f0 35px,#bcd3f0 36px);background-position:0 0,0 30px}
.bdBoard canvas{position:absolute;top:0;bottom:0;left:64px;right:64px;width:calc(100% - 128px);height:100%;touch-action:none;cursor:crosshair}
.bdTools{width:max-content;position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:3;display:flex;gap:6px;align-items:center;background:rgba(255,255,255,.97);border:1px solid #cbd5e1;border-radius:16px;padding:5px 8px;box-shadow:0 6px 18px rgba(15,23,42,.25);max-width:calc(100% - 140px);flex-wrap:wrap;justify-content:center}
.bdC{width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #94a3b8;cursor:pointer;padding:0}.bdC.on{box-shadow:0 0 0 3px #2563eb}
.bdB{border:1px solid #cbd5e1;background:#fff;border-radius:10px;height:30px;min-width:30px;padding:0 8px;font-weight:800;font-size:12px;color:#334155;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit}.bdB.on{background:#dbeafe;border-color:#2563eb;color:#1d4ed8}
.bdSz i{display:block;border-radius:50%;background:#334155}.bdSep{width:1px;height:22px;background:#e2e8f0}
.bdWeb{padding-top:42px;display:none}.bdWeb.on{display:flex;flex-direction:column}
.bdBar{display:flex;gap:5px;align-items:center;padding:4px 70px 6px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;flex:0 0 auto;flex-wrap:wrap}
.bdBar input{flex:1;min-width:80px;border:1px solid #cbd5e1;border-radius:10px;padding:6px 10px;font-size:13px;font-family:inherit;direction:ltr}
.bdBar .bdB{height:30px}.bdBar .go{background:#2563eb;color:#fff;border-color:#2563eb}
.bdFrameWrap{position:relative;flex:1;min-height:0;margin:0 64px;overflow:hidden}
.bdFrameWrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;transform-origin:0 0}
.bdRdr{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;display:none;transform-origin:0 0}.bdRdr.on{display:block}
.bdVid{position:absolute;inset:0;width:100%;height:100%;background:#0f172a;object-fit:contain;display:none}.bdVid.on{display:block}
.bdNote{flex:0 0 auto;margin:0 64px;padding:3px 8px;font-size:11px;font-weight:700;color:#64748b;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap}
.bdNote a{color:#2563eb;cursor:pointer;text-decoration:underline}
.bdFall{position:absolute;inset:0;background:#fff;display:none;align-items:center;justify-content:center;text-align:center;padding:16px;z-index:5}.bdFall.on{display:flex}
.bdFall .box{max-width:460px;border:1px solid #fde68a;background:#fffbeb;border-radius:16px;padding:16px 18px;font-size:13px;color:#78350f;font-weight:600;line-height:1.55}
.bdFall .box h4{margin:0 0 6px;font-size:15px;color:#92400e}.bdFall .box button{margin:8px 4px 0;border:0;border-radius:10px;padding:8px 14px;font-weight:800;cursor:pointer;font-family:inherit;background:#2563eb;color:#fff}
.bdFall .tip{margin-top:8px;font-size:12px;color:#92400e}
.cssFs{position:fixed!important;inset:0!important;z-index:2147483000!important;margin:0!important;border-radius:0!important;max-width:none!important;width:auto!important;height:auto!important}`;
    document.head.appendChild(css);
    const COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a', '#d97706'];
    let mode = 'slides', mounted = null, cvs, ctx, strokes = [], cur = null, color = COLORS[0], size = 5, eraser = false, ruled = true;
    let bZoom = 1, wZoom = 1;
    const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    const bar = mk('div', 'bdMode', '<button type="button" data-m="slides"><i class="fa-solid fa-display"></i> Slides</button><button type="button" data-m="board"><i class="fa-solid fa-pen"></i> Board</button><button type="button" data-m="web"><i class="fa-solid fa-globe"></i> Web</button>');
    const board = mk('div', 'bdLayer bdBoard ruled'); cvs = mk('canvas'); board.appendChild(cvs);
    const tools = mk('div', 'bdTools', COLORS.map((c, i) => `<button type="button" class="bdC${i ? '' : ' on'}" data-c="${c}" style="background:${c}" title="Pen color" aria-label="Pen color"></button>`).join('') +
        '<span class="bdSep"></span>' + [3, 6, 12].map((s, i) => `<button type="button" class="bdB bdSz${i === 1 ? ' on' : ''}" data-s="${s}" title="Pen size"><i style="width:${s + 3}px;height:${s + 3}px"></i></button>`).join('') +
        '<span class="bdSep"></span><button type="button" class="bdB" data-a="eraser" title="Eraser"><i class="fa-solid fa-eraser"></i></button><button type="button" class="bdB" data-a="undo" title="Undo"><i class="fa-solid fa-rotate-left"></i></button><button type="button" class="bdB" data-a="clear" title="Clear board"><i class="fa-solid fa-trash"></i> Clear</button>' +
        '<span class="bdSep"></span><button type="button" class="bdB" data-a="bzout" title="Board zoom out">−</button><button type="button" class="bdB" data-a="bzin" title="Board zoom in">+</button>' +
        '<span class="bdSep"></span><button type="button" class="bdB on" data-a="ruled" title="Ruled / blank"><i class="fa-solid fa-align-justify"></i> Ruled</button>');
    board.appendChild(tools);
    const web = mk('div', 'bdLayer bdWeb');
    web.innerHTML = `<div class="bdBar"><button type="button" class="bdB" data-w="back" title="Back"><i class="fa-solid fa-arrow-left"></i></button><button type="button" class="bdB" data-w="fwd" title="Forward"><i class="fa-solid fa-arrow-right"></i></button><button type="button" class="bdB" data-w="rel" title="Reload"><i class="fa-solid fa-rotate-right"></i></button><button type="button" class="bdB" data-w="home" title="Home"><i class="fa-solid fa-house"></i></button><input type="text" placeholder="Type a web address, e.g. en.wikipedia.org" spellcheck="false" autocapitalize="off"><button type="button" class="bdB go" data-w="go">Go</button><button type="button" class="bdB" data-w="zout" title="Page zoom out">−</button><button type="button" class="bdB" data-w="zin" title="Page zoom in">+</button><button type="button" class="bdB" data-w="new" title="Open in a new window"><i class="fa-solid fa-up-right-from-square"></i> New window</button><button type="button" class="bdB" data-w="cap" title="Show a browser tab here (you pick the tab)"><i class="fa-solid fa-tv"></i> Show a tab</button></div>
<div class="bdNote" id="bdLinks"></div><div class="bdFrameWrap"><iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-modals allow-downloads" allow="fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write" referrerpolicy="strict-origin-when-cross-origin" title="Web page"></iframe><iframe class="bdRdr" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" title="Reader view"></iframe><video class="bdVid" autoplay muted playsinline></video><div class="bdFall"><div class="box"></div></div></div><div class="bdNote" id="bdHint"></div>`;
    const ifr = web.querySelector('iframe'), rdr = web.querySelector('.bdRdr'), fall = web.querySelector('.bdFall'), fbox = fall.querySelector('.box'), inp = web.querySelector('input'), hint = web.querySelector('#bdHint'), links = web.querySelector('#bdLinks');
    let curUrl = '', loadTimer = null, hist = [], hIdx = -1, capStream = null; const vid = web.querySelector('.bdVid');
    function stopCap() { if (capStream) { capStream.getTracks().forEach(t => t.stop()); capStream = null; } vid.srcObject = null; vid.classList.remove('on'); }
    async function capTab() {
        stopCap(); fall.classList.remove('on');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { showFall('Tab sharing is not available here', 'This browser or device cannot share a tab into a page (iPad Safari and many tablets cannot).', ''); return; }
        try { capStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); vid.srcObject = capStream; vid.classList.add('on'); ifr.removeAttribute('src'); hint.innerHTML = 'Live view of the tab you chose (view only - use the real tab to click). Choose a tab other than Studio. <a data-w="stop">Stop sharing</a>'; capStream.getVideoTracks()[0].onended = () => { stopCap(); hint.textContent = 'Sharing stopped.'; }; }
        catch (e) { showFall('Sharing was not started', 'You closed the share window or the browser blocked it. Each time, you must pick the tab yourself.', ''); }
    }
    links.innerHTML = 'Quick links: ' + LINKS.map(l => `<a data-u="${l[1]}">${l[0]}</a>`).join(' · ');
    function setMode(m) {
        mode = m; bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); board.classList.toggle('on', m === 'board'); web.classList.toggle('on', m === 'web');
        if (m === 'board') { fit(); redraw(); } if (m === 'web' && !curUrl) { hint.textContent = 'YouTube links are converted to embedded players. Sites that refuse to open inside another page open as a Reader view (read-only copy), or use New window.'; }
    }
    bar.onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
    window.ssBdMode = () => mode;
    window.addEventListener('keydown', e => { if (e.key === 'Escape') { const c = document.getElementById('presenterStageCard'); if (c && c.classList.contains('cssFs')) c.classList.remove('cssFs'); const g = document.getElementById('gameStageModal'); if (g && g.classList.contains('cssFs')) g.classList.remove('cssFs'); } });
    // ----- zoom (shared with the presenter +/- buttons) -----
    function applyWZoom() {
        [ifr, rdr].forEach(f => { f.style.transform = wZoom === 1 ? '' : 'scale(' + wZoom + ')'; f.style.width = (100 / wZoom) + '%'; f.style.height = (100 / wZoom) + '%'; });
    }
    window.ssBdZoom = d => {
        if (mode === 'board') { bZoom = Math.max(0.5, Math.min(3, Math.round((bZoom + d) * 100) / 100)); redraw(); }
        else if (mode === 'web') { wZoom = Math.max(0.5, Math.min(2.5, Math.round((wZoom + d) * 100) / 100)); applyWZoom(); }
    };
    window.ssBdZoomReset = () => { if (mode === 'board') { bZoom = 1; redraw(); } else if (mode === 'web') { wZoom = 1; applyWZoom(); } };
    // ----- whiteboard -----
    function fit() { const r = cvs.getBoundingClientRect(); if (!r.width) return; const d = window.devicePixelRatio || 1, w = Math.round(r.width * d), h = Math.round(r.height * d); if (cvs.width !== w || cvs.height !== h) { cvs.width = w; cvs.height = h; } ctx = cvs.getContext('2d'); }
    function seg(s, from) {
        const d = (window.devicePixelRatio || 1) * bZoom, p = s.pts; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = s.er ? 'destination-out' : 'source-over'; ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w * d;
        if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0] * d, p[0][1] * d, s.w * d / 2, 0, 7); ctx.fill(); return; }
        ctx.beginPath(); const i0 = Math.max(1, from || 1); ctx.moveTo(p[i0 - 1][0] * d, p[i0 - 1][1] * d);
        for (let i = i0; i < p.length; i++) { const m = i + 1 < p.length ? [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2] : p[i]; ctx.quadraticCurveTo(p[i][0] * d, p[i][1] * d, m[0] * d, m[1] * d); } ctx.stroke();
    }
    function redraw() { if (!ctx) return; const d = window.devicePixelRatio || 1; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cvs.width, cvs.height); strokes.forEach(s => seg(s, 1)); ctx.globalCompositeOperation = 'source-over'; }
    const pos = e => { const r = cvs.getBoundingClientRect(); return [(e.clientX - r.left) / bZoom, (e.clientY - r.top) / bZoom]; };
    cvs.addEventListener('pointerdown', e => { e.preventDefault(); fit(); try { cvs.setPointerCapture(e.pointerId); } catch (x) {} cur = { c: color, w: eraser ? 30 : size, er: eraser, pts: [pos(e)] }; strokes.push(cur); seg(cur, 1); });
    cvs.addEventListener('pointermove', e => { if (!cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(q => cur.pts.push(pos(q))); seg({ c: cur.c, w: cur.w, er: cur.er, pts: cur.pts.slice(-4) }, 1); });
    const up = () => { cur = null; ctx && (ctx.globalCompositeOperation = 'source-over'); }; cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
    tools.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.c) { color = b.dataset.c; eraser = false; tools.querySelectorAll('.bdC').forEach(x => x.classList.toggle('on', x === b)); tools.querySelector('[data-a=eraser]').classList.remove('on'); }
        else if (b.dataset.s) { size = +b.dataset.s; tools.querySelectorAll('.bdSz').forEach(x => x.classList.toggle('on', x === b)); }
        else if (b.dataset.a === 'eraser') { eraser = !eraser; b.classList.toggle('on', eraser); }
        else if (b.dataset.a === 'undo') { strokes.pop(); redraw(); }
        else if (b.dataset.a === 'clear') { if (!strokes.length || await SSD.confirm('Clear board', 'Erase the whole board?', { danger: true, okLabel: 'Clear all' })) { strokes = []; redraw(); } }
        else if (b.dataset.a === 'bzin') { window.ssBdZoom(0.25); }
        else if (b.dataset.a === 'bzout') { window.ssBdZoom(-0.25); }
        else if (b.dataset.a === 'ruled') { ruled = !ruled; board.classList.toggle('ruled', ruled); b.classList.toggle('on', ruled); b.lastChild.textContent = ruled ? ' Ruled' : ' Blank'; }
    };
    new ResizeObserver(() => { if (mode === 'board') { fit(); redraw(); } }).observe(board);
    // ----- web -----
    function norm(v) {
        v = String(v || '').trim(); if (!v) return null; if (/^[a-z][a-z0-9+.-]*:/i.test(v)) { return /^https?:/i.test(v) ? v.replace(/^http:\/\//i, 'https://') : null; }
        if (/\s/.test(v) || !/\./.test(v)) return { q: v }; return 'https://' + v;
    }
    function showFall(title, msg, url) {
        fbox.innerHTML = `<h4>${title}</h4>${msg}<div>${url ? '<button type="button" data-w="rdr">Reader view</button>' : ''}<button type="button" data-w="new">Open in new window</button></div><div class="tip">Side by side: Windows - press <b>Win + ←</b> on the new window and <b>Win + →</b> on Studio. Mac - hold the green button of the window and choose Tile. iPad - Split View. Android tablet - split-screen from the recent apps.</div>`; fall.classList.add('on'); clearTimeout(loadTimer);
    }
    function openNew(u) { u = u || curUrl; if (!u) return; try { window.open(u, '_blank', 'noopener'); } catch (e) {} }
    async function fetchViaProxy(u) {
        for (const mkp of PROXIES) {
            const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
            try { const r = await fetch(mkp(u), { signal: ctl.signal }); if (!r.ok) throw 0; const txt = await r.text(); if (txt && /<\s*(html|body|head|div|p|article)\b/i.test(txt)) return txt; } catch (e) {} finally { clearTimeout(t); }
        }
        return null;
    }
    function cleanHtml(html, u) {
        html = html.replace(new RegExp('<scr' + 'ipt\\b[\\s\\S]*?</scr' + 'ipt\\s*>', 'gi'), '').replace(/<meta[^>]+http-equiv=["']?(refresh|content-security-policy|x-frame-options)[^>]*>/gi, '').replace(/<base\b[^>]*>/gi, '');
        const tag = '<base href="' + String(u).replace(/"/g, '&quot;') + '" target="_blank">';
        return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + tag) : tag + html;
    }
    async function readerView(u) {
        u = u || curUrl; if (!u) return;
        stopCap(); fall.classList.remove('on'); rdr.classList.remove('on'); rdr.removeAttribute('srcdoc'); clearTimeout(loadTimer);
        hint.textContent = 'Loading reader view… (a read-only copy of the page)';
        const html = await fetchViaProxy(u);
        if (curUrl !== u) return;
        if (!html) { showFall('This page cannot be shown here', 'The site refuses to be embedded and the reader service could not fetch it. Open it in a new window.', ''); hint.textContent = ''; return; }
        rdr.srcdoc = cleanHtml(html, u); rdr.classList.add('on');
        hint.innerHTML = 'Reader view: read-only copy (no scripts). Links open in a new window. <a data-w="new">Open the real page</a>';
    }
    function go(raw) {
        stopCap(); const u = norm(raw); fall.classList.remove('on'); rdr.classList.remove('on'); rdr.removeAttribute('srcdoc'); clearTimeout(loadTimer);
        if (!u) { showFall('Address not understood', 'Type a web address such as <b>en.wikipedia.org</b>.', ''); return; }
        wZoom = 1; applyWZoom();
        if (u.q) { const su = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(u.q); curUrl = su; inp.value = u.q; hist = hist.slice(0, hIdx + 1); hist.push(su); hIdx++; ifr.removeAttribute('src'); readerView(su); return; }
        curUrl = u; inp.value = u; hist = hist.slice(0, hIdx + 1); hist.push(u); hIdx++; let host = ''; try { host = new URL(u).hostname.toLowerCase(); } catch (e) {}
        const eu = embedUrl(u);
        if (eu === u && BLOCKED.some(b => host.indexOf(b) >= 0 || host.endsWith(b))) { ifr.removeAttribute('src'); readerView(u); return; }
        hint.innerHTML = 'Loading… if the page stays blank, the site refuses embedding - <a data-w="rdr">Reader view</a> · <a data-w="new">New window</a>'; ifr.src = eu;
        loadTimer = setTimeout(() => { hint.innerHTML = 'Still blank? The site may refuse to be embedded - <a data-w="rdr">Reader view</a> · <a data-w="new">New window</a>'; }, 5000);
    }
    ifr.addEventListener('load', () => { if (!ifr.getAttribute('src')) return; clearTimeout(loadTimer); hint.innerHTML = 'Page loaded. Scroll and click links inside it as usual. Blank or an error picture means the site refuses embedding - <a data-w="rdr">Reader view</a> · <a data-w="new">New window</a>'; });
    web.addEventListener('click', e => {
        const a = e.target.closest('[data-u],[data-w]'); if (!a) return;
        if (a.dataset.u) return go(a.dataset.u);
        const w = a.dataset.w; if (w === 'go') go(inp.value);
        else if (w === 'new') openNew();
        else if (w === 'rdr') readerView();
        else if (w === 'cap') capTab();
        else if (w === 'stop') { stopCap(); hint.textContent = ''; }
        else if (w === 'back' || w === 'fwd') {
            const ni = hIdx + (w === 'back' ? -1 : 1);
            if (ni >= 0 && ni < hist.length) { hIdx = ni; const u = hist[hIdx]; curUrl = u; inp.value = u; wZoom = 1; applyWZoom(); fall.classList.remove('on'); rdr.classList.remove('on'); ifr.src = embedUrl(u); }
            else { try { w === 'back' ? ifr.contentWindow.history.back() : ifr.contentWindow.history.forward(); } catch (x) {} }
        }
        else if (w === 'rel') { let ok = false; try { ifr.contentWindow.location.reload(); ok = true; } catch (x) {} if (rdr.classList.contains('on')) { readerView(curUrl); ok = true; } if (!ok && curUrl) { ifr.src = embedUrl(curUrl); } }
        else if (w === 'zin') { window.ssBdZoom(0.25); }
        else if (w === 'zout') { window.ssBdZoom(-0.25); }
        else if (w === 'home') { stopCap(); fall.classList.remove('on'); rdr.classList.remove('on'); rdr.removeAttribute('srcdoc'); ifr.removeAttribute('src'); curUrl = ''; inp.value = ''; hint.textContent = ''; wZoom = 1; applyWZoom(); hist = []; hIdx = -1; }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(inp.value); });
    window.ssBdGo = go;
    setInterval(() => {
        const v = document.getElementById('presenterViewport'), pv = document.getElementById('portal_presentation'); if (!v || !pv) return;
        if (mounted !== v) { if (getComputedStyle(v).position === 'static') v.style.position = 'relative'; v.appendChild(board); v.appendChild(web); v.appendChild(bar); mounted = v; }
        const act = pv.classList.contains('active'); bar.style.display = act ? '' : 'none'; if (!act) { board.classList.remove('on'); web.classList.remove('on'); } else { board.classList.toggle('on', mode === 'board'); web.classList.toggle('on', mode === 'web'); }
    }, 400);
})();

// ---- v9 wiring ----
ss3BuildClawScene = ss9BuildClawScene;
(function ss9Wire() {
    const _prep = prepareStageEntities, _step = ssStepNew, _draw = drawStageFrame;
    prepareStageEntities = function (m) {
        if (m === 11) { SS.raceDust = []; ss9RocketPrepare(m); return; }
        _prep(m);
    };
    ssStepNew = function () {
        if (ssG.mode === 11) return ss9RocketStep();
        if (ssG.mode === 12) return ss9ClawStep();
        if (ssG.mode === 13) return ss9FishStep();
        _step();
    };
    drawStageFrame = function (isFinal) {
        if (S3.active && S3.mode === 12) { ss9ClawRender(); return; }
        if (activeStageMode === 11 || activeStageMode === 13) {
            const canvas = document.getElementById('stageCanvas'); if (!canvas) return;
            const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
            ctx.save(); ctx.clearRect(0, 0, W, H); ssShake(ctx);
            if (activeStageMode === 11) ss9DrawRockets(ctx, W, H); else ss9DrawFishingV3(ctx, W, H);
            ctx.restore();
            if (isFinal) ssDrawConfetti(ctx, W, H);
            ctx.textAlign = 'left'; return;
        }
        _draw(isFinal);
    };
})();


// ===== v17: reader/answerer chips only after a game picked a student; behavior FAB placement; stage fills the screen =====
(function ssV17() {
    const $ = id => document.getElementById(id);
    window.ssDuel = { reader: false, challenger: false };
    function applyDuel() {
        const d = window.ssDuel, wrap = $('arenaDuelChips'); if (!wrap) return;

        wrap.style.display = 'none'; /* v20: reader/answerer chips removed from the quiz bar */
    }
    const _mark = markStudentPicked;
    markStudentPicked = function (name) {
        try {
            if (name != null && name === appState.reader) window.ssDuel.reader = true;
            if (name != null && name === appState.challenger) window.ssDuel.challenger = true;
            applyDuel();
        } catch (e) {}
        return _mark.apply(this, arguments);
    };
    const _sw = switchClass;
    switchClass = function () { window.ssDuel.reader = window.ssDuel.challenger = false; applyDuel(); return _sw.apply(this, arguments); };
    applyDuel();

    // Behavior award button: smaller, draggable, remembers where it was parked (never sits on the Next/Pick buttons by default)
    const st = document.createElement('style');
    st.textContent = '#bhvFab{width:42px!important;height:42px!important;font-size:18px!important;right:6px!important;bottom:auto!important;top:46%;opacity:.88;touch-action:none}#bhvFab:hover{opacity:1}';
    document.head.appendChild(st);
    const ssAttach = (fab) => {
    if (fab && !fab._dr) { fab._dr = 1;
        try { const pos = JSON.parse(localStorage.getItem('SM7_SGE_SM_BHV_FAB') || 'null'); if (pos) { fab.style.left = pos.x + 'px'; fab.style.top = pos.y + 'px'; fab.style.right = 'auto'; } } catch (e) {}
        let drag = null, moved = false;
        fab.addEventListener('pointerdown', e => { const r = fab.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY }; moved = false; try { fab.setPointerCapture(e.pointerId); } catch (x) {} });
        fab.addEventListener('pointermove', e => {
            if (!drag) return; if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 6) moved = true; if (!moved) return;
            const x = Math.max(0, Math.min(window.innerWidth - 42, e.clientX - drag.dx)), y = Math.max(0, Math.min(window.innerHeight - 42, e.clientY - drag.dy));
            fab.style.left = x + 'px'; fab.style.top = y + 'px'; fab.style.right = 'auto';
        });
        fab.addEventListener('pointerup', () => { if (drag && moved) { try { localStorage.setItem('SM7_SGE_SM_BHV_FAB', JSON.stringify({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) })); } catch (e) {} } drag = null; });
        fab.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
    } };
    const _f0 = $('bhvFab'); if (_f0) ssAttach(_f0); else { const iv = setInterval(() => { const f = $('bhvFab'); if (f) { clearInterval(iv); ssAttach(f); } }, 700); }
})();

// ===== v18: presentation "Focus" mode — hides the side panel so the slide gets the whole width/height =====
(function ssFocusMode() {
    const st = document.createElement('style');
    st.textContent = `
    #portal_presentation.pres-focus .presenter-grid{grid-template-columns:minmax(0,1fr)!important;min-height:0}
    #portal_presentation.pres-focus .presenter-grid>:not(.presenter-stage-card){display:none!important}
    #portal_presentation.pres-focus .presenter-stage-card{height:calc(100vh - 178px);min-height:420px}
    #portal_presentation.pres-focus .presenter-viewport{padding:10px}
    #portal_presentation.pres-focus .presenter-toolbar{padding:6px 12px}
    #presFocusBtn.on{background:#dbeafe!important;border-color:#2563eb!important;color:#1d4ed8!important}`;
    document.head.appendChild(st);
    const sec = document.getElementById('portal_presentation'); if (!sec) return;
    let on = true; try { const v = localStorage.getItem(smk7('SGE_SM_PRES_FOCUS')); if (v !== null) on = v === '1'; } catch (e) {}
    function apply() {
        sec.classList.toggle('pres-focus', on);
        const b = document.getElementById('presFocusBtn'); if (b) b.classList.toggle('on', on);
        try { localStorage.setItem(smk7('SGE_SM_PRES_FOCUS'), on ? '1' : '0'); } catch (e) {}
        setTimeout(() => { try { if (typeof currentMediaType !== 'undefined' && currentMediaType === 'pptx' && parsedPptxSlides.length) renderCurrentPptxSlide(); } catch (e) {} }, 60);
    }
    const fsBtn = sec.querySelector('button[title="Fullscreen Presentation"]');
    if (fsBtn) {
        const b = document.createElement('button'); b.type = 'button'; b.id = 'presFocusBtn'; b.className = 'top-circle-btn';
        b.style.cssText = 'width:36px;height:36px;font-weight:900;'; b.title = 'Focus: hide the side panel for a bigger slide';
        b.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center"></i>';
        b.onclick = () => { on = !on; apply(); };
        fsBtn.parentNode.insertBefore(b, fsBtn);
    }
    apply();
})();

// ===== v19: saved-presentations dropdown + every opened file is kept on this device (IndexedDB) =====
(function ssDeckPicker() {
    const sec = document.getElementById('portal_presentation'); if (!sec) return;
    const st = document.createElement('style');
    st.textContent = `#presFileSelect{max-width:min(280px,32vw);min-width:130px;font-weight:800;font-size:13px;color:#1e3a8a;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:7px 8px;cursor:pointer;font-family:inherit}
    #portal_presentation.has-decks #presFileName{display:none}`;
    document.head.appendChild(st);
    const nameEl = document.getElementById('presFileName');
    const sel = document.createElement('select'); sel.id = 'presFileSelect'; sel.title = 'Saved presentations — pick one to open';
    nameEl.parentNode.insertBefore(sel, nameEl.nextSibling);
    const getMap = () => { try { return JSON.parse(localStorage.getItem(smk7('SGE_SS_DECK_SLIDE')) || '{}'); } catch (e) { return {}; } };
    const icon = e => ({ pptx: '📽️', ppsx: '📽️', pdf: '📕', docx: '📝', xlsx: '📊', xls: '📊', csv: '📊', mp4: '🎬', webm: '🎬', txt: '📄' }[e] || '🖼️');
    function fill() {
        const lib = uploadedFilesLibrary; sec.classList.toggle('has-decks', lib.length > 0);
        sel.innerHTML = '';
        const ph = document.createElement('option'); ph.value = ''; ph.textContent = lib.length ? '📂 Saved presentations (' + lib.length + ')' : '📂 No saved files yet'; ph.disabled = !lib.length; sel.appendChild(ph);
        lib.forEach(f => { const o = document.createElement('option'); o.value = f.id; o.textContent = icon(f.ext) + ' ' + f.name; sel.appendChild(o); });
        sel.value = lib.some(f => f.id === activeFileId) ? activeFileId : '';
    }
    sel.onchange = () => {
        const f = uploadedFilesLibrary.find(x => x.id === sel.value); if (!f) return;
        activeFileId = f.id; const m = getMap(); window.__ssPresRestore = m[f.id] | 0;
        renderSavedFilesList(); displayPresentationFileObject(f.fileObj, f.ext);
    };
    const _r = renderSavedFilesList;
    renderSavedFilesList = function () { const r = _r.apply(this, arguments); try { fill(); } catch (e) {} return r; };
    // keep every opened/dropped file
    const _add = addAndOpenPresentationFile;
    addAndOpenPresentationFile = function (file) {
        const dup = uploadedFilesLibrary.find(f => f.name === file.name && f.fileObj && f.fileObj.size === file.size);
        if (dup) { activeFileId = dup.id; const m = getMap(); window.__ssPresRestore = m[dup.id] | 0; renderSavedFilesList(); return displayPresentationFileObject(dup.fileObj, dup.ext); }
        if (uploadedFilesLibrary.length >= 5) {
            try { showToast('⚠️ مكتبة العروض ممتلئة (٥ ملفات). احذف ملفًا من المكتبة قبل إضافة ملف جديد.'); } catch (e) { alert('Deck library is full (5 files). Delete one before adding another.'); }
            return;
        }
        const raw = 'u' + Date.now() + Math.random().toString(36).slice(2, 5), ext = file.name.split('.').pop().toLowerCase();
        try { ssDeckTombRemove([raw]); ssIdbPut({ id: raw, name: file.name, blob: file }).catch(e => console.warn('save deck', e)); } catch (e) {}
        const id = 'deck_' + raw;
        uploadedFilesLibrary.unshift({ id, name: file.name, ext, fileObj: file });
        activeFileId = id; window.__ssPresRestore = 0;
        renderSavedFilesList();
        return displayPresentationFileObject(file, ext);
    };
    // remember the last slide of each deck
    const _rc = renderCurrentPptxSlide;
    renderCurrentPptxSlide = function () {
        const r = _rc.apply(this, arguments);
        try { if (activeFileId && parsedPptxSlides.length) { const m = getMap(); m[activeFileId] = currentPptxSlideIdx; localStorage.setItem(smk7('SGE_SS_DECK_SLIDE'), JSON.stringify(m)); } } catch (e) {}
        return r;
    };
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    // saved decks come back after a reload
    const reload = () => { ssDecksToLibrary().then(fill).catch(() => {}); };
    [600, 2500].forEach(t => setTimeout(reload, t));
    fill();
})();

// ===== v20: TEAM CHALLENGE (2-4 teams, numbered tiles, points) replaces the old Reader/Challenger duel =====
(function ssTeamChallenge() {
    const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#ec4899'];
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sfx = n => { try { StudioAudioManager.playSFX(n); } catch (e) {} };
    const S = { n: 2, names: ['Team 1', 'Team 2', 'Team 3', 'Team 4'], scores: [0, 0, 0, 0], turn: 0, pts: 10, surprise: true, src: 'cur', count: 16, tiles: [], open: -1, timer: 0, revealed: false, qpts: 10 };
    try { const n = JSON.parse(localStorage.getItem(smk7('SGE_SS_TC_NAMES')) || 'null'); if (Array.isArray(n) && n.length === 4) S.names = n; } catch (e) {}
    const EVENTS = [
        { id: 'bonus', t: '🎁 BONUS!', d: '+10 extra points' }, { id: 'double', t: '✨ DOUBLE!', d: 'the points are doubled' },
        { id: 'steal', t: '🦹 STEAL!', d: 'takes 5 points from the leading team' }, { id: 'swap', t: '🔄 SWAP!', d: 'swaps scores with another team' },
        { id: 'lose', t: '💣 OOPS!', d: 'loses 5 points' }, { id: 'all', t: '🌟 PARTY!', d: 'every team gets +5' }
    ];

    const st = document.createElement('style');
    st.textContent = `
#tcModal{position:fixed;inset:0;z-index:2147483000;background:#eaf3ff;display:none;flex-direction:column;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0f172a}
#tcModal *{box-sizing:border-box}
.tcTop{display:flex;gap:8px;align-items:stretch;padding:8px 10px;background:linear-gradient(180deg,#fcd070,#f8b84a);flex:0 0 auto}
.tcTeam{flex:1;min-width:0;border-radius:14px;background:#fff;border:3px solid transparent;display:flex;flex-direction:column;align-items:center;padding:4px 8px 6px;position:relative;box-shadow:0 3px 10px rgba(0,0,0,.15)}
.tcTeam.turn{border-color:#0f172a;transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.28)}
.tcTeam.turn:after{content:'▶ TURN';position:absolute;top:-9px;left:10px;background:#0f172a;color:#fde047;font-size:10px;font-weight:900;padding:1px 8px;border-radius:99px}
.tcTeam input.nm{width:100%;border:0;background:var(--c);color:#fff;font-weight:900;font-size:clamp(14px,2vw,22px);text-align:center;border-radius:8px;padding:2px 6px;outline:none;font-family:inherit}
.tcTeam .sc{font-size:clamp(26px,4.2vw,52px);font-weight:900;line-height:1.05;color:#0f172a}
.tcTeam .adj{display:flex;gap:6px}.tcTeam .adj button{width:28px;height:24px;border:0;border-radius:8px;background:#e2e8f0;font-weight:900;cursor:pointer;font-size:15px;line-height:1}
.tcCtl{display:flex;flex-direction:column;gap:5px;justify-content:center}
.tcCtl button,.tcBtn{border:0;border-radius:99px;background:#f59e0b;color:#fff;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.tcCtl button{width:34px;height:34px;font-size:15px}
.tcBoard{flex:1;min-height:0;display:grid;gap:8px;padding:10px;overflow:auto;align-content:stretch}
.tcTile{border:0;border-radius:16px;color:#fff;font-weight:900;cursor:pointer;font-size:clamp(26px,5vw,64px);text-shadow:0 3px 0 rgba(0,0,0,.18);transition:transform .12s,filter .12s;font-family:inherit;min-height:56px}
.tcTile.a{background:linear-gradient(180deg,#5aa6ff,#6b8cf5)}.tcTile.b{background:linear-gradient(180deg,#1f86ff,#3a63b8)}
.tcTile:hover{transform:scale(1.03);filter:brightness(1.08)}
.tcTile.used{background:#cbd5e1;color:#94a3b8;text-shadow:none;cursor:default;transform:none;filter:none;font-size:clamp(20px,3vw,38px)}
.tcOv{position:fixed;inset:0;z-index:2;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:14px}
.tcCard{width:min(1100px,100%);max-height:100%;overflow:auto;background:#fff;border-radius:26px;padding:18px 22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.tcHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tcNum{background:#2563eb;color:#fff;font-weight:900;border-radius:14px;padding:4px 16px;font-size:22px}
.tcTimer{font-weight:900;font-size:22px;background:#0f172a;color:#38bdf8;border-radius:14px;padding:4px 14px;min-width:70px;text-align:center}
.tcQ{font-size:clamp(22px,3.6vw,46px);font-weight:900;text-align:center;line-height:1.3;padding:14px 10px;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:20px}
.tcQ .bl{background:#fde047;color:#0f172a;border-radius:10px;padding:0 10px}.tcQ .bl.hid{background:rgba(255,255,255,.25);color:transparent;user-select:none}
.tcOpts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tcOpt{border:2px solid #dbeafe;background:#f8fbff;border-radius:16px;padding:12px 16px;font-size:clamp(16px,2.4vw,28px);font-weight:800;display:flex;gap:10px;align-items:center;text-align:start}
.tcOpt b{background:#eff6ff;color:#2563eb;border-radius:10px;min-width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center}
.tcOpt.ok{background:#10b981;border-color:#059669;color:#fff}.tcOpt.ok b{background:#fff;color:#059669}
.tcAns{font-size:clamp(18px,2.6vw,32px);font-weight:900;color:#065f46;background:#d1fae5;border-radius:16px;padding:10px 14px;text-align:center}
.tcAward{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center}
.tcBtn{padding:10px 18px;font-size:15px}.tcBtn.g{background:#10b981}.tcBtn.b{background:#2563eb}.tcBtn.x{background:#64748b}.tcBtn.r{background:#ef4444}
.tcPts{display:flex;gap:4px;align-items:center;font-weight:800;font-size:13px;color:#334155}
.tcPts button{border:1.5px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;font-weight:900;border-radius:10px;padding:4px 9px;cursor:pointer;font-family:inherit}.tcPts button.on{background:#2563eb;color:#fff;border-color:#2563eb}
.tcEvt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(15,23,42,.85);color:#fff;text-align:center;border-radius:26px;animation:tcPop .35s}
.tcEvt h2{font-size:clamp(34px,7vw,84px);margin:0}.tcEvt p{font-size:clamp(16px,3vw,32px);margin:6px 0 0;font-weight:800}
@keyframes tcPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.tcSetup{margin:auto;width:min(720px,94vw);background:#fff;border-radius:26px;padding:22px 24px;box-shadow:0 20px 60px rgba(15,23,42,.25);display:flex;flex-direction:column;gap:14px;max-height:96vh;overflow:auto}
.tcSetup h2{margin:0;font-size:26px}.tcSetup label{font-weight:800;font-size:13px;color:#334155;display:flex;flex-direction:column;gap:4px}
.tcSetup select,.tcSetup input[type=number],.tcSetup input[type=text]{border:2px solid #dbeafe;border-radius:12px;padding:8px 10px;font-weight:800;font-size:15px;font-family:inherit}
.tcN{display:flex;gap:8px}.tcN button{flex:1;border:2px solid #bfdbfe;background:#eff6ff;border-radius:14px;padding:10px;font-weight:900;font-size:18px;cursor:pointer;font-family:inherit;color:#1e3a8a}.tcN button.on{background:#2563eb;color:#fff;border-color:#2563eb}
.tcNames{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tcRank{display:flex;flex-direction:column;gap:8px;align-items:stretch}
.tcRank div.row{display:flex;align-items:center;gap:12px;border-radius:16px;padding:10px 16px;color:#fff;font-weight:900;font-size:clamp(18px,3vw,34px)}
@media (max-width:760px){.tcOpts{grid-template-columns:1fr}.tcNames{grid-template-columns:1fr}}`;
    document.head.appendChild(st);
    const root = document.createElement('div'); root.id = 'tcModal'; document.body.appendChild(root);

    function questions() {
        let q = [];
        try { if (S.src === 'cur') q = appState.questions || []; else { const f = (ssQFiles() || []).find(x => x.id === S.src); q = f ? f.questions : []; } } catch (e) {}
        return (q || []).filter(x => x && x.q);
    }
    function blanksOf(q) { const out = []; String(q).replace(/<strong>(.*?)<\/strong>|<b>(.*?)<\/b>|\*\*(.*?)\*\*/gi, (m, a, b, c) => { out.push(a || b || c); return m; }); return out; }
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // ---------- setup ----------
    function showSetup() {
        clearInterval(S.timer);
        let files = []; try { files = ssQFiles() || []; } catch (e) {}
        const qn = questions().length;
        root.innerHTML = `<div class="tcSetup">
<div style="display:flex;justify-content:space-between;align-items:center"><h2>🏆 Team Challenge</h2><button class="tcBtn r" id="tcX" style="width:38px;height:38px;padding:0">✕</button></div>
<label>Number of teams</label>
<div class="tcN" id="tcN">${[2, 3, 4].map(n => `<button data-n="${n}" class="${S.n === n ? 'on' : ''}">${n}</button>`).join('')}</div>
<div class="tcNames" id="tcNames"></div>
<label>Questions (one numbered tile for each question)
<select id="tcSrc"><option value="cur">▶ ${esc((typeof ssQSourceName === 'function' ? ssQSourceName() : 'Current questions'))} (${(appState.questions || []).length} Q)</option>${files.map(f => `<option value="${esc(f.id)}"${S.src === f.id ? ' selected' : ''}>📁 ${esc(f.name)} (${(f.questions || []).length} Q)</option>`).join('')}</select></label>
<div style="display:flex;gap:10px;flex-wrap:wrap">
<label style="flex:1;min-width:140px">Tiles on the board<input type="number" id="tcCount" min="2" max="60" value="${Math.min(S.count, Math.max(2, qn)) }"></label>
<label style="flex:1;min-width:140px">Points per question<select id="tcPts">${[1, 2, 5, 10, 20, 50, 100].map(p => `<option value="${p}"${S.pts === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label></div>
<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="tcSur" ${S.surprise ? 'checked' : ''}> 🎁 Surprise tiles (bonus, double, steal, swap…)</label>
<button class="tcBtn b" id="tcGo" style="font-size:20px;padding:14px">▶ START GAME</button></div>`;
        const names = () => { const box = root.querySelector('#tcNames'); box.innerHTML = ''; for (let i = 0; i < S.n; i++) { const inp = document.createElement('input'); inp.type = 'text'; inp.value = S.names[i]; inp.style.borderColor = COLORS[i]; inp.oninput = () => { S.names[i] = inp.value || 'Team ' + (i + 1); }; box.appendChild(inp); } };
        names();
        root.querySelector('#tcN').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.n = +b.dataset.n; root.querySelectorAll('#tcN button').forEach(x => x.classList.toggle('on', x === b)); names(); };
        const syncCount = () => { const t = Math.max(1, questions().length); const c = root.querySelector('#tcCount'); c.max = Math.min(60, t); c.value = Math.min(+c.value || 16, Math.min(60, t)); if (t < 2) c.value = t; };
        root.querySelector('#tcSrc').onchange = e => { S.src = e.target.value; syncCount(); };
        root.querySelector('#tcX').onclick = close;
        root.querySelector('#tcGo').onclick = () => {
            S.pts = +root.querySelector('#tcPts').value; S.surprise = root.querySelector('#tcSur').checked; S.src = root.querySelector('#tcSrc').value;
            const q = questions(); if (!q.length) { alert('No questions in this file.'); return; }
            S.count = Math.max(1, Math.min(q.length, 60, +root.querySelector('#tcCount').value || 16));
            try { localStorage.setItem(smk7('SGE_SS_TC_NAMES'), JSON.stringify(S.names)); } catch (e) {}
            startGame(q);
        };
        syncCount();
    }

    // ---------- game ----------
    function startGame(q) {
        const picked = shuffle(q).slice(0, S.count);
        S.tiles = picked.map((qq, i) => ({ q: qq, used: false, evt: (S.surprise && Math.random() < 0.22) ? EVENTS[Math.floor(Math.random() * EVENTS.length)] : null, by: -1 }));
        S.scores = [0, 0, 0, 0]; S.turn = 0; S.open = -1;
        sfx('pop'); render();
    }
    function cols(n) { return Math.max(2, Math.min(8, Math.ceil(Math.sqrt(n * 1.9)))); }
    function render() {
        const teams = [];
        for (let i = 0; i < S.n; i++) teams.push(`<div class="tcTeam${i === S.turn ? ' turn' : ''}" style="--c:${COLORS[i]}" data-t="${i}"><input class="nm" value="${esc(S.names[i])}" data-i="${i}"><div class="sc">${S.scores[i]}</div><div class="adj"><button data-a="-1" data-i="${i}">−</button><button data-a="1" data-i="${i}">+</button></div></div>`);
        const n = S.tiles.length, c = cols(n), rows = Math.ceil(n / c);
        root.innerHTML = `<div class="tcTop">${teams.join('')}<div class="tcCtl"><button id="tcEnd" title="Finish & show winner">🏁</button><button id="tcSet" title="New game / settings">⚙</button><button id="tcX" title="Close" style="background:#ef4444">✕</button></div></div>
<div class="tcBoard" style="grid-template-columns:repeat(${c},minmax(0,1fr));grid-template-rows:repeat(${rows},minmax(60px,1fr))">${S.tiles.map((t, i) => t.used ? `<button class="tcTile used" disabled>${t.by >= 0 ? `<span style="color:${COLORS[t.by]}">●</span> ` : ''}${i + 1}</button>` : `<button class="tcTile ${((Math.floor(i / c) + i) % 2) ? 'b' : 'a'}" data-i="${i}">${i + 1}</button>`).join('')}</div>`;
        root.querySelector('.tcTop').onclick = e => {
            const nm = e.target.closest('input.nm'); if (nm) return;
            const b = e.target.closest('button[data-a]');
            if (b) { const i = +b.dataset.i; S.scores[i] += +b.dataset.a * Math.max(1, Math.round(S.pts / 2)); sfx('click'); return render(); }
            const tm = e.target.closest('.tcTeam'); if (tm) { S.turn = +tm.dataset.t; render(); }
        };
        root.querySelectorAll('input.nm').forEach(inp => { inp.oninput = () => { S.names[+inp.dataset.i] = inp.value; }; inp.onclick = e => e.stopPropagation(); });
        root.querySelector('#tcX').onclick = close; root.querySelector('#tcSet').onclick = async () => { if (await SSD.confirm('New game', 'Start a new game?\nScores will be reset.', { danger: true, okLabel: 'New game' })) showSetup(); };
        root.querySelector('#tcEnd').onclick = showWinner;
        root.querySelector('.tcBoard').onclick = e => { const b = e.target.closest('.tcTile'); if (b && !b.disabled) openTile(+b.dataset.i); };
    }

    function openTile(i) {
        const t = S.tiles[i]; if (!t) return; S.open = i; S.revealed = false; S.qpts = S.pts; sfx('select');
        const q = t.q, isMcq = Array.isArray(q.opts) && q.opts.length, bl = blanksOf(q.q);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const ov = document.createElement('div'); ov.className = 'tcOv'; ov.id = 'tcOv';
        let qHtml;
        if (!isMcq && bl.length) { let k = 0; qHtml = esc(q.q).replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;|&lt;b&gt;(.*?)&lt;\/b&gt;|\*\*(.*?)\*\*/gi, (m, a, b, c) => `<span class="bl hid" data-k="${k++}">${a || b || c}</span>`); }
        else qHtml = esc(q.q);
        const ansText = isMcq ? (q.opts[q.ans] != null ? q.opts[q.ans] : '') : (!bl.length && q.ans != null && typeof q.ans !== 'object' ? String(q.ans) : '');
        ov.innerHTML = `<div class="tcCard" style="position:relative">
<div class="tcHead"><span class="tcNum">#${i + 1}</span><span class="tcTimer" id="tcTm">30</span>
<span class="tcPts">Points: ${[5, 10, 20, 50].concat(S.pts && ![5, 10, 20, 50].includes(S.pts) ? [S.pts] : []).sort((a, b) => a - b).map(p => `<button data-p="${p}" class="${p === S.qpts ? 'on' : ''}">${p}</button>`).join('')}</span>
<span style="flex:1"></span><button class="tcBtn x" id="tcBack">⬅ Back to board</button></div>
<div class="tcQ" dir="auto">${qHtml}</div>
${isMcq ? `<div class="tcOpts">${q.opts.map((o, k) => `<div class="tcOpt" data-k="${k}" dir="auto"><b>${letters[k] || k + 1}</b><span>${esc(o)}</span></div>`).join('')}</div>` : ''}
<div id="tcAnsBox"></div>
<div class="tcAward" id="tcAward"><button class="tcBtn g" id="tcShow">👁 Show answer</button></div>
</div>`;
        root.appendChild(ov);
        let left = 30; const tm = ov.querySelector('#tcTm'); clearInterval(S.timer);
        S.timer = setInterval(() => { left--; tm.textContent = Math.max(0, left); if (left <= 5 && left > 0) sfx('click'); if (left <= 0) { clearInterval(S.timer); tm.style.color = '#f87171'; sfx('wrong'); } }, 1000);
        const awardRow = () => {
            const aw = ov.querySelector('#tcAward');
            aw.innerHTML = Array.from({ length: S.n }, (_, k) => `<button class="tcBtn" style="background:${COLORS[k]};font-size:17px" data-w="${k}">${esc(S.names[k])} +<span class="pv">${S.qpts}</span></button>`).join('') + `<button class="tcBtn x" data-w="-1">❌ Nobody</button>`;
        };
        ov.addEventListener('click', e => {
            if (e.target.closest('#tcBack')) return closeTile(false);
            const p = e.target.closest('button[data-p]'); if (p) { S.qpts = +p.dataset.p; ov.querySelectorAll('button[data-p]').forEach(x => x.classList.toggle('on', x === p)); ov.querySelectorAll('.pv').forEach(x => x.textContent = S.qpts); return; }
            if (e.target.closest('#tcShow')) {
                S.revealed = true; sfx('select'); clearInterval(S.timer);
                if (isMcq) { const o = ov.querySelector('.tcOpt[data-k="' + q.ans + '"]'); if (o) o.classList.add('ok'); }
                ov.querySelectorAll('.bl.hid').forEach(x => x.classList.remove('hid'));
                if (ansText && !isMcq) ov.querySelector('#tcAnsBox').innerHTML = `<div class="tcAns" dir="auto">✅ ${esc(ansText)}</div>`;
                awardRow(); return;
            }
            const bl2 = e.target.closest('.bl.hid'); if (bl2) { bl2.classList.remove('hid'); sfx('pop'); return; }
            const w = e.target.closest('button[data-w]'); if (w) award(+w.dataset.w);
        });
        awardRow();   // the teacher may also award straight away
        const aw = ov.querySelector('#tcAward'); aw.insertAdjacentHTML('afterbegin', '<button class="tcBtn g" id="tcShow">👁 Show answer</button>');
    }
    function closeTile(done) {
        clearInterval(S.timer); const ov = document.getElementById('tcOv'); if (ov) ov.remove(); S.open = -1;
        if (done) render();
    }
    function applyEvent(ev, w) {
        const o = [...Array(S.n).keys()].filter(k => k !== w);
        switch (ev.id) {
            case 'bonus': S.scores[w] += 10; break;
            case 'double': S.scores[w] += S.qpts; break;
            case 'steal': { if (!o.length) break; const v = o.reduce((a, b) => S.scores[b] > S.scores[a] ? b : a, o[0]); const amt = Math.min(5, Math.max(0, S.scores[v])); S.scores[v] -= amt; S.scores[w] += amt; break; }
            case 'swap': { if (!o.length) break; const v = o[Math.floor(Math.random() * o.length)]; [S.scores[w], S.scores[v]] = [S.scores[v], S.scores[w]]; break; }
            case 'lose': S.scores[w] -= 5; break;
            case 'all': for (let k = 0; k < S.n; k++) S.scores[k] += 5; break;
        }
    }
    function award(w) {
        const t = S.tiles[S.open]; if (!t) return;
        t.used = true; t.by = w;
        const ov = document.getElementById('tcOv'), ev = t.evt;
        if (w >= 0) { S.scores[w] += S.qpts; sfx('cheer'); } else sfx('wrong');
        let delay = 250;
        if (ev && ov) {
            if (w >= 0) applyEvent(ev, w);
            const box = ov.querySelector('.tcCard'); const d = document.createElement('div'); d.className = 'tcEvt';
            d.innerHTML = w >= 0 ? `<h2>${ev.t}</h2><p>${esc(S.names[w])} ${ev.d}</p>` : `<h2>🎁</h2><p>The surprise disappeared…</p>`;
            box.appendChild(d); delay = 2200; if (w >= 0) sfx('pop');
        }
        S.turn = (S.turn + 1) % S.n;
        setTimeout(() => { closeTile(true); if (S.tiles.every(x => x.used)) setTimeout(showWinner, 400); }, delay);
    }
    function showWinner() {
        const order = [...Array(S.n).keys()].sort((a, b) => S.scores[b] - S.scores[a]);
        const top = S.scores[order[0]], winners = order.filter(k => S.scores[k] === top);
        sfx('cheer');
        const ov = document.createElement('div'); ov.className = 'tcOv'; ov.id = 'tcOv';
        ov.innerHTML = `<div class="tcCard" style="align-items:stretch"><div style="text-align:center;font-size:clamp(40px,8vw,90px)">🏆</div>
<div style="text-align:center;font-weight:900;font-size:clamp(22px,4vw,46px)">${winners.length > 1 ? 'It\'s a tie!' : esc(S.names[winners[0]]) + ' wins!'}</div>
<div class="tcRank">${order.map((k, r) => `<div class="row" style="background:${COLORS[k]}"><span>${['🥇', '🥈', '🥉', '4️⃣'][r]}</span><span style="flex:1">${esc(S.names[k])}</span><span>${S.scores[k]}</span></div>`).join('')}</div>
<div class="tcAward"><button class="tcBtn b" id="tcAgain">🔄 Play again (same questions)</button><button class="tcBtn g" id="tcNew">⚙ New setup</button><button class="tcBtn x" id="tcBk">⬅ Back to board</button><button class="tcBtn r" id="tcCl">✕ Close</button></div></div>`;
        root.appendChild(ov);
        ov.querySelector('#tcAgain').onclick = () => { ov.remove(); startGame(S.tiles.map(t => t.q)); };
        ov.querySelector('#tcNew').onclick = () => { ov.remove(); showSetup(); };
        ov.querySelector('#tcBk').onclick = () => ov.remove();
        ov.querySelector('#tcCl').onclick = () => { ov.remove(); close(); };
    }
    function open() { root.style.display = 'flex'; try { StudioAudioManager.stopAllActiveSounds(); } catch (e) {} showSetup(); }
    function close() { clearInterval(S.timer); root.style.display = 'none'; root.innerHTML = ''; }
    window.openTeamChallenge = open;
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && root.style.display === 'flex') { if (document.getElementById('tcOv') && S.open >= 0) closeTile(false); } });

    // route the old "Dual Challenge VS" game to the new Team Challenge
    const _open = openGameStage;
    openGameStage = function (modeId) { if (modeId === 2) { open(); return; } return _open.apply(this, arguments); };
    EIGHT_MODES.forEach(m => { if (m.id === 2) { m.title = 'Team Challenge'; m.sub = '2–4 Teams • Pick a number • Win points'; } });
    const _svg = getModeCardSVG;
    getModeCardSVG = function (id) {
        if (id !== 2) return _svg.apply(this, arguments);
        const tiles = [['1', 20, 24], ['2', 98, 24], ['3', 176, 24], ['4', 254, 24], ['5', 20, 84], ['6', 98, 84], ['7', 176, 84], ['8', 254, 84]];
        return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#fcd070"/><rect width="400" height="44" fill="#f8b84a"/><rect x="16" y="8" width="84" height="30" rx="8" fill="#0ea5e9"/><rect x="108" y="8" width="84" height="30" rx="8" fill="#f59e0b"/><rect x="208" y="8" width="84" height="30" rx="8" fill="#10b981"/><rect x="300" y="8" width="84" height="30" rx="8" fill="#ec4899"/>` +
            [0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<rect x="${14 + c * 94}" y="${56 + r * 41}" width="88" height="36" rx="9" fill="${(r + c) % 2 ? '#2a7de1' : '#5aa6ff'}"/><text x="${58 + c * 94}" y="${82 + r * 41}" font-size="22" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">${r * 4 + c + 1}</text>`).join('')).join('') + `</svg>`)}`;
    };
})();

// ===== v21: REALISTIC PLAYERS — sculpted bodies, textured kits, faces, boots/gloves + natural run-up, kick, keeper stance & dive =====
(function ssRealHumans() {
    const TAU = Math.PI * 2;
    const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 20);
    function kitTex(o, name) {
        const W = 512, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
        const col = '#' + new THREE.Color(o.shirt).getHexString(), tr = '#' + new THREE.Color(o.trim || 0xf8fafc).getHexString();
        const draw = (nm) => {
            const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.16)');
            c.fillStyle = col; c.fillRect(0, 0, W, H);
            c.fillStyle = 'rgba(0,0,0,.06)'; for (let x = 0; x < W; x += 8) c.fillRect(x, 0, 3, H);              // vertical pique stripes
            c.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < H; y += 5) c.fillRect(0, y, W, 1);         // knit
            c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(W * 0.2, 0, W * 0.07, H); c.fillRect(W * 0.73, 0, W * 0.07, H);   // side panels
            c.fillStyle = tr; c.fillRect(0, 0, W, 20); c.fillRect(0, H - 34, W, 12);                              // neck rib, hem band
            c.fillStyle = g; c.fillRect(0, 0, W, H);
            c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(W / 2, H * 0.36, 22, 0, TAU); c.fill();        // chest badge
            c.fillStyle = col; c.beginPath(); c.arc(W / 2, H * 0.36, 15, 0, TAU); c.fill(); c.fillStyle = tr; c.font = '900 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', W / 2, H * 0.36 + 1);
            [0, W].forEach(x => {                                                                                       // back: name + number (wrapped over the seam)
                c.fillStyle = o.numColor || '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
                if (o.number != null) { c.font = '900 132px Arial'; c.fillText(String(o.number), x, H * 0.5); }
                if (nm) { let fs = 34; c.font = '900 ' + fs + 'px Arial'; while (c.measureText(nm).width > 150 && fs > 12) { fs -= 2; c.font = '900 ' + fs + 'px Arial'; } c.fillText(nm, x, H * 0.27); }
            });
        };
        draw(name);
        const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
        t.redraw = nm => { c.clearRect(0, 0, W, H); draw(nm); t.needsUpdate = true; };
        return t;
    }
    window.p3Human = function (o) {
        const g = new THREE.Group(), M = p3Mat;
        const skin = M(o.skin || 0xd9a47a, 0.62), shorts = M(o.shorts || 0x111827, 0.7), sock = M(o.sock || o.shirt, 0.8), boot = M(o.boot || (o.glove ? 0x84cc16 : 0x0b0f1a), 0.38, 0.1),
            glove = M(o.glove || o.skin || 0xd9a47a, 0.6), hair = M(o.hair || 0x1c1511, 0.85), trim = M(o.trim || 0xf8fafc, 0.65), dark = M(0x0b0f1a, 0.45), white = M(0xfafafa, 0.35),
            lip = M(0x9d5b4e, 0.5), brow = M(0x1a120d, 0.9), accent = M(o.glove ? 0x111827 : (o.shirt || 0xdc2626), 0.5);
        const tex = kitTex(o, ''); const shirt = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0 });
        const shirtPlain = M(o.shirt, 0.82);
        const long = !!o.glove;                                   // keeper: long sleeves + tracksuit bottoms look
        const ms = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx != null) m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
        const hip = new THREE.Group(); hip.position.y = 0.95; g.add(hip);
        const torso = new THREE.Group(); hip.add(torso);
        // torso: athletic V taper, flattened front-to-back
        const prof = [[0.001, -0.07], [0.145, -0.05], [0.158, 0.03], [0.15, 0.14], [0.158, 0.26], [0.18, 0.38], [0.205, 0.5], [0.212, 0.6], [0.185, 0.67], [0.1, 0.715], [0.001, 0.73]];
        torso.add(ms(lathe(prof, 36), shirt, 0, 0, 0, 1.2, 1, 0.64));
        torso.add(ms(new THREE.SphereGeometry(0.066, 14, 10), shirtPlain, -0.21, 0.665, 0, 1, 0.9, 0.85)); torso.add(ms(new THREE.SphereGeometry(0.066, 14, 10), shirtPlain, 0.21, 0.665, 0, 1, 0.9, 0.85));   // deltoid caps
        // pelvis / shorts
        hip.add(ms(new THREE.SphereGeometry(0.2, 24, 16), shorts, 0, -0.03, 0, 1.02, 0.62, 0.74));
        hip.add(ms(new THREE.CylinderGeometry(0.19, 0.2, 0.05, 28), trim, 0, 0.07, 0, 1.06, 1, 0.74));       // waistband
        // neck + trapezius + collar
        torso.add(ms(new THREE.CylinderGeometry(0.056, 0.066, 0.13, 14), skin, 0, 0.76, 0));
        const tz = ms(new THREE.ConeGeometry(0.15, 0.12, 16), shirtPlain, 0, 0.7, 0, 1.15, 1, 0.6); torso.add(tz);
        const col = ms(new THREE.TorusGeometry(0.082, 0.016, 8, 24), trim, 0, 0.715, 0); col.rotation.x = Math.PI / 2; torso.add(col);
        // head
        const head = new THREE.Group(); head.position.y = 0.9; torso.add(head);
        head.add(ms(new THREE.SphereGeometry(0.108, 28, 22), skin, 0, 0.0, 0, 0.88, 1.12, 1.02));                        // cranium
        head.add(ms(new THREE.SphereGeometry(0.075, 18, 14), skin, 0, -0.07, -0.025, 0.95, 0.85, 0.95));                  // jaw/chin
        head.add(ms(new THREE.SphereGeometry(0.015, 10, 8), skin, 0, -0.028, -0.108, 0.9, 1.35, 1.0));                        // nose
        [-1, 1].forEach(sx => {
            head.add(ms(new THREE.SphereGeometry(0.024, 10, 8), skin, sx * 0.098, -0.012, 0.0, 0.45, 1.25, 0.9));           // ears
            head.add(ms(new THREE.SphereGeometry(0.0155, 12, 10), white, sx * 0.04, 0.022, -0.097, 1.15, 0.8, 0.6));         // sclera
            head.add(ms(new THREE.SphereGeometry(0.0085, 10, 8), dark, sx * 0.04, 0.022, -0.1035));                          // iris/pupil
            head.add(ms(new THREE.BoxGeometry(0.044, 0.007, 0.01), brow, sx * 0.04, 0.05, -0.101));                         // eyebrows
        });
        head.add(ms(new THREE.BoxGeometry(0.04, 0.006, 0.012), lip, 0, -0.082, -0.1));                                      // mouth
        const hr = ms(new THREE.SphereGeometry(0.114, 28, 16, 0, TAU, 0, Math.PI * 0.4), hair, 0, 0.022, 0.016, 0.93, 1.12, 1.06); hr.rotation.x = 0.3; head.add(hr);
        head.add(ms(new THREE.SphereGeometry(0.1, 20, 12, 0, TAU, Math.PI * 0.36, Math.PI * 0.2), hair, 0, 0.02, 0.03, 0.96, 1.1, 1.0));   // back/side hair
        head.add(ms(new THREE.BoxGeometry(0.2, 0.05, 0.06), hair, 0, 0.0, 0.07, 1, 1, 1));                                // nape hair
        [-1, 1].forEach(sx => head.add(ms(new THREE.BoxGeometry(0.014, 0.05, 0.05), hair, sx * 0.096, 0.03, -0.01, 1, 1, 1)));   // sideburns
        // ARM
        function arm(sx) {
            const u = new THREE.Group(); u.position.set(sx * 0.262, 0.64, 0); torso.add(u);
            u.add(ms(lathe([[0.001, -0.3], [0.04, -0.29], [0.046, -0.22], [0.056, -0.1], [0.06, -0.03], [0.052, 0.02], [0.001, 0.04]], 16), long ? shirtPlain : shirtPlain));
            if (!long) u.add(ms(new THREE.CylinderGeometry(0.052, 0.05, 0.025, 16), trim, 0, -0.275, 0));            // cuff trim
            const f = new THREE.Group(); f.position.y = -0.305; u.add(f);
            f.add(ms(new THREE.SphereGeometry(0.043, 14, 12), long ? shirtPlain : skin, 0, 0, 0));
            f.add(ms(lathe([[0.001, -0.29], [0.028, -0.28], [0.034, -0.2], [0.043, -0.08], [0.046, -0.01], [0.001, 0.0]], 14), long ? shirtPlain : skin));
            const hd = new THREE.Group(); hd.position.y = -0.3; f.add(hd);
            if (o.glove) {
                hd.add(ms(new THREE.BoxGeometry(0.095, 0.1, 0.045), glove, 0, -0.06, 0));
                hd.add(ms(new THREE.BoxGeometry(0.08, 0.075, 0.012), accent, 0, -0.06, 0.028));                          // back-of-hand panel
                hd.add(ms(new THREE.CylinderGeometry(0.046, 0.044, 0.04, 14), trim, 0, -0.005, 0));                      // wrist strap
                for (let i = 0; i < 4; i++) { const L = 0.075 - (i === 0 || i === 3 ? 0.012 : 0); const fg = new THREE.Group(); fg.position.set((i - 1.5) * 0.024, -0.11, 0); const a = ms(new THREE.CapsuleGeometry(0.012, L * 0.55, 4, 8), glove, 0, -L * 0.3, 0), b = new THREE.Group(); b.position.y = -L * 0.6; b.add(ms(new THREE.CapsuleGeometry(0.011, L * 0.45, 4, 8), glove, 0, -L * 0.22, 0)); b.rotation.x = 0.35; fg.add(a, b); hd.add(fg); }
                const th = ms(new THREE.CapsuleGeometry(0.0135, 0.05, 4, 8), glove, sx * -0.052, -0.07, -0.01); th.rotation.z = sx * 0.75; hd.add(th);
            } else {
                hd.add(ms(new THREE.BoxGeometry(0.075, 0.085, 0.034), skin, 0, -0.05, 0));
                for (let i = 0; i < 4; i++) { const fg = new THREE.Group(); fg.position.set((i - 1.5) * 0.0185, -0.09, 0); fg.add(ms(new THREE.CapsuleGeometry(0.0085, 0.036, 3, 6), skin, 0, -0.026, 0)); const b = new THREE.Group(); b.position.y = -0.055; b.rotation.x = 0.5; b.add(ms(new THREE.CapsuleGeometry(0.0078, 0.026, 3, 6), skin, 0, -0.016, 0)); fg.add(b); hd.add(fg); }
                const th = ms(new THREE.CapsuleGeometry(0.01, 0.036, 3, 6), skin, sx * -0.04, -0.045, -0.012); th.rotation.z = sx * 0.7; hd.add(th);
            }
            return { u, f, hand: hd };
        }
        // LEG
        function leg(sx) {
            const u = new THREE.Group(); u.position.set(sx * 0.1, -0.02, 0); hip.add(u);
            u.add(ms(lathe([[0.001, -0.47], [0.062, -0.46], [0.074, -0.4], [0.092, -0.28], [0.103, -0.14], [0.105, -0.04], [0.09, 0.02], [0.001, 0.05]], 20), long ? M(o.shorts || 0x111827, 0.75) : skin));      // thigh (skin) – short covers it below
            if (!long) u.add(ms(lathe([[0.001, -0.29], [0.108, -0.29], [0.122, -0.2], [0.116, -0.08], [0.108, 0.0], [0.001, 0.03]], 22), shorts));                                                                  // flared short leg
            const k = new THREE.Group(); k.position.y = -0.47; u.add(k);
            k.add(ms(new THREE.SphereGeometry(0.066, 14, 12), long ? M(o.shorts || 0x111827, 0.75) : skin, 0, 0, 0));
            const shinMat = long ? M(o.shorts || 0x111827, 0.75) : sock;
            k.add(ms(lathe([[0.001, -0.43], [0.04, -0.42], [0.046, -0.34], [0.058, -0.2], [0.068, -0.12], [0.064, -0.04], [0.001, 0.0]], 18), shinMat));      // shin + calf
            k.add(ms(new THREE.CylinderGeometry(0.066, 0.065, 0.03, 16), trim, 0, -0.06, 0));                                                              // sock band
            const ft = new THREE.Group(); ft.position.y = -0.44; k.add(ft);
            ft.add(ms(new THREE.SphereGeometry(0.052, 12, 10), shinMat, 0, 0.0, 0));
            ft.add(ms(new THREE.SphereGeometry(0.07, 18, 14), boot, 0, -0.02, -0.06, 0.78, 0.62, 1.9));                                                   // boot upper
            ft.add(ms(new THREE.SphereGeometry(0.05, 12, 10), boot, 0, -0.016, -0.17, 0.95, 0.55, 0.85));                                                  // toe box
            ft.add(ms(new THREE.BoxGeometry(0.07, 0.022, 0.24), white, 0, -0.058, -0.075));                                                              // sole plate
            ft.add(ms(new THREE.BoxGeometry(0.02, 0.06, 0.1), accent, sx * 0.045, -0.015, -0.06));                                                       // accent stripe
            for (let i = 0; i < 6; i++) ft.add(ms(new THREE.ConeGeometry(0.008, 0.02, 6), dark, ((i % 2) - 0.5) * 0.04, -0.077, -0.0 - Math.floor(i / 2) * 0.09 - 0.0));  // studs
            return { u, k, ft };
        }
        const aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);
        lL.u.scale.setScalar(0.936); lR.u.scale.setScalar(0.936); g.scale.setScalar(0.96);
        g.userData = { base: 0.95, hip, torso, head, aL, aR, lL, lR, setName: nm => tex.redraw(String(nm || '').trim().split(/\s+/).pop().toUpperCase().slice(0, 14)) };
        return g;
    };
})();

// ===== v21b: natural football motion — idle, run-up, kick + follow-through, reactions, keeper stance & dive =====
(function ssFootballAnim() {
    const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const cl = (x, a, b) => Math.max(a, Math.min(b, x));
    const LT = 0.44, LS = 0.412, OFF = 0.098;            // thigh / shin lengths and sole offset (after the 0.936 leg scale)
    const H = (a, b) => LT * Math.cos(a) + LS * Math.cos(a - b);
    // leg: a = thigh swing (+forward), b = knee flex (>=0), ab = outward spread, pt = foot pointing (0 flat, + toe down)
    function leg(h, side, a, b, ab, pt) { const L = side < 0 ? h.userData.lL : h.userData.lR; L.u.rotation.x = a; L.k.rotation.x = -b; L.u.rotation.z = side * ab; L.ft.rotation.x = -(a - b) - (pt || 0); return H(a, b); }
    // arm: x = raise forward, z = spread outward (applied first), f = elbow flex
    function arm(h, side, x, z, f, tw) { const A = side < 0 ? h.userData.aL : h.userData.aR; A.u.rotation.z = side * z; A.u.rotation.x = x; A.f.rotation.x = f; A.f.rotation.y = (tw || 0) * side; return A; }
    function ground(h, ...hs) { const d = h.userData; d.hip.position.y = OFF + Math.max(...hs); }

    // ---------- relaxed / waiting stance (shooter) ----------
    function shooterIdle() {
        const S = PK.shooter, d = S.userData, c = P3.clock, br = Math.sin(c * 0.06), ws = Math.sin(c * 0.025);
        p3Reset(S);
        const h1 = leg(S, -1, 0.04, 0.1, 0.07, 0), h2 = leg(S, 1, -0.03, 0.06, 0.09, 0);
        ground(S, h1, h2); d.hip.position.y += 0.004 * br; d.hip.rotation.z = 0.025 * ws; d.torso.rotation.x = -0.06 + 0.01 * br; d.torso.rotation.z = -0.02 * ws; d.head.rotation.x = -0.12 + 0.03 * Math.sin(c * 0.021); d.head.rotation.y = 0.18 * Math.sin(c * 0.013);
        arm(S, -1, 0.1, 0.12, 0.4); arm(S, 1, 0.1, 0.12, 0.4);
        if (PK.ph === 'aim' && isStageRunning) { arm(S, -1, 0.05, 0.1, 0.3); arm(S, 1, 0.05, 0.1, 0.3); d.head.rotation.x = -0.05; d.head.rotation.y = 0.0; }
    }
    // ---------- run-up (t = 1..RUN) ----------
    function shooterRun(t, RUN) {
        const S = PK.shooter, d = S.userData; p3Reset(S);
        const TOT = RUN - 12;
        if (t < TOT) {
            const q = t * 0.24, u = t / TOT, spd = 0.7 + 0.3 * u;           // quicker as he nears the ball
            const A = side => { const p = side < 0 ? q : q + Math.PI; return [0.04 + 0.62 * spd * Math.sin(p), 0.14 + 0.95 * spd * Math.max(0, Math.cos(p)), Math.sin(p)]; };
            const l = A(-1), r = A(1);
            const hl = leg(S, -1, l[0], l[1], 0.03, l[2] > 0.2 ? 0.35 : 0), hr = leg(S, 1, r[0], r[1], 0.03, r[2] > 0.2 ? 0.35 : 0);
            ground(S, hl, hr); d.hip.position.y += 0.02 * Math.abs(Math.sin(q));
            const sw = Math.sin(q);
            arm(S, -1, 0.15 - 0.7 * spd * sw, 0.08, 1.15 + 0.15 * sw); arm(S, 1, 0.15 + 0.7 * spd * sw, 0.08, 1.15 - 0.15 * sw);
            d.torso.rotation.x = -0.15 - 0.05 * u; d.torso.rotation.y = 0.16 * sw; d.hip.rotation.y = -0.12 * sw; d.torso.rotation.z = 0.04 * sw; d.head.rotation.x = -0.1; d.head.rotation.y = -0.1 * sw;
        } else {
            const w = (t - TOT) / 12, back = sm(w / 0.6), fwd = sm((w - 0.6) / 0.4);
            // plant leg (left): reaches, plants beside the ball and absorbs
            const pa = 0.62 - 0.4 * sm(w / 0.55), pb = 0.2 + 0.4 * sm(w / 0.55);
            const hl = leg(S, -1, pa, pb, 0.08, 0);
            // kicking leg (right): wind-up back, then whip through
            const ka = (-0.15 - 0.95 * back) * (1 - fwd) + 0.62 * fwd, kb = (0.5 + 1.25 * back) * (1 - fwd) + 0.28 * fwd;
            const hr = leg(S, 1, ka, kb, 0.05, 0.55 * back + 0.3 * fwd);
            ground(S, hl);
            d.torso.rotation.x = -0.18 + 0.3 * back * (1 - fwd) - 0.14 * fwd; d.torso.rotation.y = -0.34 * back * (1 - fwd) + 0.3 * fwd; d.hip.rotation.y = -0.22 * back * (1 - fwd) + 0.25 * fwd; d.torso.rotation.z = 0.12 * back * (1 - fwd);
            d.head.rotation.x = -0.28 * (0.4 + 0.6 * w); d.head.rotation.y = -d.torso.rotation.y * 0.6;
            arm(S, -1, 0.35 * back, 0.35 + 0.9 * sm(w), 0.5);                     // left arm swings out for balance
            arm(S, 1, -0.55 * back + 0.5 * fwd, 0.25, 0.7 + 0.3 * fwd);
        }
    }
    // ---------- strike + follow-through (tf = ticks after contact) ----------
    function shooterKick(tf) {
        const S = PK.shooter, d = S.userData; p3Reset(S);
        if (!PK._sp0) { PK._sp0 = S.position.clone(); }
        const a = sm(tf / 9), b = sm((tf - 11) / 26);
        const ka = 0.62 + 0.75 * a - 0.55 * b, kb = 0.28 + 0.8 * a * (1 - b) + 0.3 * b;
        const hop = Math.sin(cl(tf / 18, 0, 1) * Math.PI);
        const pa = 0.22 - 0.2 * sm(tf / 10) + 0.15 * b, pb = 0.4 - 0.3 * sm(tf / 10) + 0.1 * b;
        const hr = leg(S, 1, ka, kb, 0.05, 0.5 * (1 - b));
        const hl = leg(S, -1, pa, pb, 0.08, 0.5 * sm(tf / 10) * (1 - b));
        ground(S, hl); d.hip.position.y += 0.13 * hop * 1 + (hr > hl ? 0 : 0);
        d.torso.rotation.x = -0.12 - 0.12 * a * (1 - b); d.torso.rotation.y = 0.3 * (1 - sm(tf / 16)) + 0.12 * a * (1 - b); d.hip.rotation.y = 0.25 * (1 - sm(tf / 16)); d.torso.rotation.z = -0.08 * a * (1 - b);
        d.head.rotation.x = -0.2 * (1 - b) + 0.05 * b;
        arm(S, -1, 0.1, 1.0 * (1 - 0.7 * b) + 0.3, 0.5); arm(S, 1, 0.3 * a, 0.75 * (1 - 0.6 * b) + 0.2, 0.6);
        const hd = S.rotation.y, fwd = 0.34 * sm(tf / 26);                    // carry-through step toward the goal
        S.position.set(PK._sp0.x - Math.sin(hd) * fwd, 0, PK._sp0.z - Math.cos(hd) * fwd);
    }
    // ---------- reactions after the shot ----------
    function shooterResult(t2, res) {
        const S = PK.shooter, d = S.userData; p3Reset(S);
        const h1 = leg(S, -1, 0.1, 0.18, 0.1, 0), h2 = leg(S, 1, 0.0, 0.1, 0.1, 0); ground(S, h1, h2);
        const hd = S.rotation.y, fwd = 0.34; if (PK._sp0) S.position.set(PK._sp0.x - Math.sin(hd) * fwd, 0, PK._sp0.z - Math.cos(hd) * fwd);
        if (res === 'goal') {
            const w = sm((t2 - 6) / 14), jp = Math.abs(Math.sin(Math.max(0, t2 - 6) * 0.2)) * w;
            arm(S, -1, 0.2 * (1 - w) + 0.6 * w, 2.5 * w + 0.3, 0.5 + 1.2 * (1 - w) * 0 + 0.5 * Math.sin(t2 * 0.35) * w, 0); arm(S, 1, 0.2 * (1 - w) + 0.6 * w, 2.5 * w + 0.3, 0.5 + 0.5 * Math.sin(t2 * 0.35 + 1) * w, 0);
            d.torso.rotation.x = 0.16 * w; d.head.rotation.x = 0.3 * w; d.hip.position.y += 0.2 * jp; leg(S, -1, 0.1 + 0.5 * jp, 0.18 + 0.7 * jp, 0.1, 0.6 * jp); leg(S, 1, 0.0 + 0.3 * jp, 0.1 + 0.9 * jp, 0.1, 0.6 * jp);
        } else if (res === 'saved') {
            const w = sm((t2 - 4) / 12); arm(S, -1, 0.3 * w, 0.8 * w + 0.3, 0.5 + 1.4 * w); arm(S, 1, 0.3 * w, 0.8 * w + 0.3, 0.5 + 1.4 * w);        // hands on hips
            d.head.rotation.x = -0.25 * w; d.head.rotation.y = 0.3 * Math.sin(t2 * 0.1) * w; d.torso.rotation.x = -0.08 * w;
        } else {
            const w = sm((t2 - 4) / 12); arm(S, -1, 2.25 * w, 0.45 * w + 0.1, 0.5 + 1.8 * w, 0); arm(S, 1, 2.25 * w, 0.45 * w + 0.1, 0.5 + 1.8 * w, 0);   // hands on head
            d.head.rotation.x = -0.18 * w; d.head.rotation.y = 0.25 * Math.sin(t2 * 0.12) * w; d.torso.rotation.x = -0.1 * w; d.hip.position.y -= 0.03 * w;
        }
    }
    // hook into the game loop (the original pose code runs first, ours overwrites it)
    const _step = pkStep;
    pkStep = function () {
        const before = PK.ph;
        _step.apply(this, arguments);
        try {
            if (!PK.shooter || !PK.shooter.userData.setName) return;
            if (PK.ph === 'run') { PK._sp0 = null; shooterRun(PK.t, 46); }
            else if (PK.ph === 'fly') shooterKick(PK.t);
            else if (PK.ph === 'result') { if (!PK._sp0) PK._sp0 = PK.shooter.position.clone(); shooterResult(PK.t, PK.res); }
        } catch (e) { console.error('shooter anim', e); }
    };
    const _render = pkRender;
    pkRender = function () {
        try { if (PK.shooter && (PK.ph === 'ready' || PK.ph === 'aim') && PK.shooter.userData.setName) { PK._sp0 = null; shooterIdle(); } } catch (e) { console.error(e); }
        return _render.apply(this, arguments);
    };
    const _reset = pkReset;
    pkReset = function () { const r = _reset.apply(this, arguments); PK._sp0 = null; try { PK.shooter.userData.setName(PK.shooterName); } catch (e) {} return r; };

    // ---------- goalkeeper ----------
    pkKeeperPose = function (tk) {
        const k = PK.kh.userData, kd = PK.kd, root = PK.keeper; p3Reset(PK.kh); PK.kh.rotation.y = Math.PI;
        const c = P3.clock, rd = PK.ph === 'ready' ? 0.5 : PK.ph === 'aim' ? 0.8 : 1, bob = Math.sin(c * 0.22), sway = Math.sin(c * 0.05);
        const set = (cr, eff) => {   // goalkeeper "set" position; cr = extra crouch
            const a = (0.5 + 0.35 * cr) * eff, b = (0.95 + 0.5 * cr) * eff, ab = 0.2 * eff + 0.02 * bob * eff;
            const h1 = leg(PK.kh, -1, a + 0.06 * sway * eff, b, ab, 0), h2 = leg(PK.kh, 1, a - 0.06 * sway * eff, b, ab, 0); ground(PK.kh, h1, h2); k.hip.position.y += 0.012 * bob * eff - 0.0;
            k.torso.rotation.x = -0.3 * eff - 0.1 * cr; k.torso.rotation.y = 0.05 * sway * eff; k.head.rotation.x = 0.26 * eff + 0.08 * cr; k.head.rotation.y = 0.06 * sway;
            arm(PK.kh, -1, 0.55 * eff, 0.5 * eff, 1.05 * eff + 0.06 * bob * eff); arm(PK.kh, 1, 0.55 * eff, 0.5 * eff, 1.05 * eff - 0.06 * bob * eff);
        };
        if (!kd || tk < kd.start - 6) { root.position.x = 0.06 * sway * rd; root.position.y = 0; root.rotation.z = 0; set(0, rd); return; }
        const u = cl((tk - kd.start) / kd.dur, 0, 1), e = 1 - Math.pow(1 - u, 2.4), e2 = sm(u);
        const lt = tk - (kd.start + kd.dur), land = sm(lt / 9), rec = sm((lt - 34) / 24);
        const cr = sm((tk - (kd.start - 6)) / 6) * (1 - sm((tk - kd.start) / 4));
        root.position.x = kd.hx * e;
        root.position.y = (kd.hy * 1.25 + 0.12) * Math.sin(Math.min(1, e) * Math.PI * 0.5) * (1 - land) + 0.2 * Math.sin(Math.min(1, u * 1.1) * Math.PI) * (1 - land);
        root.rotation.z = -kd.dir * kd.th * e2 * (1 - rec);
        if (tk < kd.start) { set(cr, 1); return; }
        const air = e2 * (1 - rec), lead = kd.dir > 0 ? 0 : 1;               // arm / leg index on the dive side (aL is the world +x side)
        if (kd.stay) {                                                          // straight-up save: arms overhead, body stretched, then settle
            k.hip.position.y = 0.95 - 0.12 * cr + 0.05 * Math.sin(u * Math.PI) - 0.08 * land * (1 - rec);
            [-1, 1].forEach(sd => arm(PK.kh, sd, 2.9 * air + 0.4 * (1 - air), 0.32 * air + 0.5 * (1 - air), 0.15 * air + 0.8 * (1 - air) + 0.3 * land));
            leg(PK.kh, -1, 0.2 * air + 0.3 * (1 - air), 0.4 * air + 0.5 * (1 - air), 0.1, 0.7 * air); leg(PK.kh, 1, 0.1 * air + 0.3 * (1 - air), 0.3 * air + 0.5 * (1 - air), 0.1, 0.7 * air);
            k.torso.rotation.x = -0.1 * (1 - air) + 0.1 * air; k.head.rotation.x = 0.2 * air; return;
        }
        k.hip.position.y = 0.95 - 0.14 * cr - 0.1 * land * (1 - rec);
        const ready = 1 - air;
        [-1, 1].forEach((sd, i) => {
            const isLead = (i === lead);
            arm(PK.kh, sd, (isLead ? 3.05 : 2.75) * air + 0.55 * ready + 0.2 * land * (1 - rec), (isLead ? 0.12 : 0.4) * air + 0.5 * ready, 0.12 * air + 1.0 * ready + 0.5 * land * (1 - rec), 0);
        });
        const leadLegBend = [0.75, 1.25], trail = [-0.4, 0.12];
        leg(PK.kh, lead === 0 ? -1 : 1, leadLegBend[0] * air + 0.5 * ready, leadLegBend[1] * air + 0.95 * ready, 0.25 * air + 0.2 * ready, 0.5 * air);   // knee drive on the dive side
        leg(PK.kh, lead === 0 ? 1 : -1, trail[0] * air + 0.5 * ready, trail[1] * air + 0.95 * ready, 0.1 * air + 0.2 * ready, 0.8 * air);                 // push-off leg trails straight
        k.torso.rotation.x = -0.3 * ready + 0.14 * air + 0.1 * land * (1 - rec); k.torso.rotation.z = -kd.dir * 0.18 * air; k.torso.rotation.y = kd.dir * 0.25 * air; k.head.rotation.x = 0.25 * air + 0.2 * ready; k.head.rotation.y = -kd.dir * 0.1 * air;
    };
    // base-aware reset so the new bodies stand with their feet on the grass
    const _pr = p3Reset;
    p3Reset = function (h) { _pr(h); if (h.userData && h.userData.base) h.userData.hip.position.y = h.userData.base; if (h.userData && h.userData.lL && h.userData.lL.ft) [h.userData.lL, h.userData.lR].forEach(l => l.ft.rotation.set(0, 0, 0)); [h.userData.aL, h.userData.aR].forEach(a => { if (a && a.f) a.f.rotation.set(0, 0, 0); }); };
})();

// ===== v22: pick any student by hand in the Quiz Arena (to give the participation / behavior icons) =====
(function ssQuizStudentPick() {
    const bar = document.getElementById('quizBarLeft'); if (!bar) return;
    const st = document.createElement('style');
    st.textContent = `#qzWho{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    #qzWho select{max-width:210px;font-weight:800;font-size:13px;color:#065f46;background:#ecfdf5;border:1.5px solid #86efac;border-radius:12px;padding:7px 8px;cursor:pointer;font-family:inherit}
    #qzWho button{border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;height:34px;min-width:34px;padding:0 9px;font-weight:900;cursor:pointer;font-size:13px;font-family:inherit;display:inline-flex;align-items:center;gap:5px}
    #qzWho button.hand{background:#dcfce7;border-color:#22c55e;color:#166534}#qzWho button.hand.ok{background:#22c55e;color:#fff}
    #qzWho button.med{background:#fef3c7;border-color:#f59e0b;color:#92400e}`;
    document.head.appendChild(st);
    const box = document.createElement('div'); box.id = 'qzWho';
    box.innerHTML = '<select id="qzWhoSel" title="Choose the student who is taking part"></select><button type="button" class="hand" id="qzHand" title="Give the Participation icon">✋ Participation</button><button type="button" class="med" id="qzMed" title="More behavior icons">🏅</button><button type="button" id="qzClr" title="Clear selection" style="display:none">✕</button>';
    bar.appendChild(box);
    const sel = box.querySelector('#qzWhoSel');
    const roster = () => { try { return (typeof getActiveStudents === 'function' ? getActiveStudents() : (appState.classes[appState.currentClass] || [])).slice(); } catch (e) { return []; } };
    function fill() {
        const names = roster(), cur = appState.challenger;
        sel.innerHTML = '<option value="">👤 Choose a student…</option>' + names.map(n => `<option value="${String(n).replace(/"/g, '&quot;')}">${String(n).replace(/</g, '&lt;')}</option>`).join('');
        sel.value = names.indexOf(cur) !== -1 ? cur : '';
        box.querySelector('#qzClr').style.display = sel.value ? '' : 'none';
        const emb = window.parent !== window; box.querySelector('#qzHand').style.display = box.querySelector('#qzMed').style.display = emb ? '' : 'none';
    }
    sel.onmousedown = fill; sel.onfocus = fill;
    sel.onchange = () => {
        const n = sel.value; appState.challenger = n || appState.challenger; if (n) { try { markStudentPicked(n); } catch (e) {} try { document.getElementById('arenaAnswererName').textContent = n; } catch (e) {} try { syncStudioData(); } catch (e) {} try { StudioAudioManager.playSFX('select'); } catch (e) {} }
        box.querySelector('#qzClr').style.display = n ? '' : 'none';
    };
    box.querySelector('#qzClr').onclick = () => { sel.value = ''; box.querySelector('#qzClr').style.display = 'none'; };
    const who = () => sel.value || '';
    box.querySelector('#qzHand').onclick = e => {
        const n = who(); if (!n) { try { showToast('Choose a student first'); } catch (x) {} sel.focus(); return; }
        try { window.parent.postMessage({ t: 'award', cls: appState.currentClass, student: n, idx: (appState.classes[appState.currentClass] || []).indexOf(n), behaviorId: 'participation' }, '*'); StudioAudioManager.playSFX('cheer'); } catch (x) {}
        const b = e.currentTarget; b.classList.add('ok'); b.textContent = '✔ ' + n.split(/\s+/)[0]; setTimeout(() => { b.classList.remove('ok'); b.textContent = '✋ Participation'; }, 1400);
    };
    box.querySelector('#qzMed').onclick = () => { const n = who(); if (!n) { try { showToast('Choose a student first'); } catch (x) {} sel.focus(); return; } if (window.ssBhvShow) window.ssBhvShow(n); };
    const _sp = switchPortal; switchPortal = function (p) { const r = _sp.apply(this, arguments); if (p === 'quiz') fill(); return r; };
    const _sc = switchClass; switchClass = function () { const r = _sc.apply(this, arguments); fill(); return r; };
    fill();
})();

// ===== v23: SMART GOALKEEPER — reads the shot by level, dives with hands to the ball's arrival point (solved with IK), parries with gloves =====
(function ssSmartKeeper() {
    const KP = {   // read = chance to guess the right side, sig = aiming error of the hands (m), react = reaction ticks, dur = dive length (ticks), hx/hy = max sideways / jump reach (m)
        easy:   { read: 0.35, sig: 0.8,  react: 17, dur: 30, hx: 1.2, hy: 0.45 },
        normal: { read: 0.72, sig: 0.38, react: 10, dur: 24, hx: 1.9, hy: 0.8 },
        hard:   { read: 0.88, sig: 0.2,  react: 5,  dur: 19, hx: 2.8, hy: 1.1 }
    };
    const clampv = (x, a, b) => Math.max(a, Math.min(b, x));
    // where / when does the ball cross the keeper's plane? (same drag + gravity + curl as the live ball)
    function arrival(v0, spinY) {
        const p = new THREE.Vector3(0, PK_R, 11), v = v0.clone(), dt = 1 / 180; let n = 0;
        while (p.z > 0.55 && n < 900) { const sp = v.length(); v.addScaledVector(v, -0.0133 * sp * dt); v.y -= PK_G * dt; v.x += spinY * 0.02 * dt * sp; p.addScaledVector(v, dt); if (p.y < PK_R) { p.y = PK_R; if (v.y < 0) { v.y = -v.y * 0.62; } } n++; }
        return { x: p.x, y: p.y, t: n / 3 };
    }
    function solveIK(kd, tg, tkEval, KPv) {
        const k = PK.kh.userData, lead = kd.dir > 0 ? k.aL : k.aR, tip = new THREE.Vector3(), saved = PK.kd;
        PK.kd = kd;
        const measure = () => { pkKeeperPose(tkEval); PK.keeper.updateMatrixWorld(true); tip.set(0, -0.1, 0); lead.hand.localToWorld(tip); return tip; };
        kd.th = clampv(Math.acos(clampv((tg.y - 0.25) / 2.15, 0, 1)), 0.05, 1.45);
        kd.hx = kd.dir * clampv(Math.abs(tg.x) - 2.0 * Math.sin(kd.th), 0, KPv.hx); kd.hy = clampv((tg.y - 1.1) * 0.8, 0, KPv.hy);
        for (let i = 0; i < 16; i++) {
            const q = measure(), ex = tg.x - q.x, ey = tg.y - q.y;
            if (Math.abs(ex) < 0.02 && Math.abs(ey) < 0.02) break;
            const hxNew = kd.hx + ex * 0.8; const hxC = kd.dir * clampv(kd.dir * hxNew, 0, KPv.hx);
            const xLeft = hxNew - hxC; kd.hx = hxC;                                   // sideways error the legs could not cover
            const hyNew = kd.hy + ey * 0.6, hyC = clampv(hyNew, -0.1, KPv.hy), yLeft = hyNew - hyC; kd.hy = hyC;
            kd.th = clampv(kd.th + kd.dir * xLeft * 0.35 / (2.0 * Math.cos(kd.th) + 0.4) - yLeft * 0.35 / (2.0 * Math.sin(kd.th) + 0.5), 0.0, 1.45);
        }
        PK.kd = saved; return kd;
    }
    const _fire = pkFire;
    pkFire = function (ax, ay, pw) {
        _fire.apply(this, arguments);
        try {
            if (PK.ph !== 'run' || !PK.launch || !PK.target) return;
            const lv = KP[PK.level] || KP.normal, spinY = Math.max(-1, Math.min(1, (PK.target.x - PK.aimShown.x) * 0.2));
            const arr = arrival(PK.launch, spinY), RUN = 46;   // ticks counted from the moment of contact
            const sx = Math.abs(arr.x) < 0.01 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(arr.x);
            const reads = Math.random() < lv.read;
            let tg;
            if (reads) tg = { x: arr.x + (Math.random() + Math.random() - 1) * lv.sig * 1.6, y: Math.max(0.15, arr.y + (Math.random() + Math.random() - 1) * lv.sig * 1.2) };
            else tg = { x: -sx * (1.0 + Math.random() * 1.8), y: 0.3 + Math.random() * 1.6 };
            tg.x = clampv(tg.x, -3.4, 3.4); tg.y = clampv(tg.y, 0.12, 2.35);
            const dir = tg.x >= 0 ? 1 : -1;
            const low = Math.abs(tg.x) < 0.6 && tg.y < 0.85;
            const dur = lv.dur, start = Math.max(lv.react, Math.round(arr.t - 0.9 * dur));
            const kd = { dir, hx: 0, hy: 0, th: 0, start, dur, stay: false, low, tg, reads };
            if (!low) { const tkEval = start + 0.9 * dur; solveIK(kd, tg, tkEval, lv); }
            PK.kd = kd; PK.handSave = false;
        } catch (e) { console.error('keeper ai', e); }
    };
    // glove-style catch pose for low central shots
    const _pose = pkKeeperPose;
    pkKeeperPose = function (tk) {
        const kd = PK.kd;
        if (!kd || !kd.low || tk < kd.start - 6) return _pose.apply(this, arguments);
        const k = PK.kh.userData, root = PK.keeper; p3Reset(PK.kh); PK.kh.rotation.y = Math.PI;
        const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
        const w = sm((tk - kd.start + 6) / 10), rec = sm((tk - (kd.start + kd.dur + 30)) / 20);
        const a = (0.5 + 0.45 * w) * (1 - rec * 0.6), b = (0.95 + 0.75 * w) * (1 - rec * 0.6);
        root.position.x = 0; root.position.y = 0; root.rotation.z = 0;
        const H = (a_, b_) => 0.44 * Math.cos(a_) + 0.412 * Math.cos(a_ - b_);
        [-1, 1].forEach(sd => { const L = sd < 0 ? k.lL : k.lR; L.u.rotation.x = a; L.k.rotation.x = -b; L.u.rotation.z = sd * (0.22 + 0.12 * w); L.ft.rotation.x = -(a - b); });
        k.hip.position.y = 0.098 + H(a, b);
        k.torso.rotation.x = -0.35 - 0.3 * w; k.head.rotation.x = 0.4 * w;
        [-1, 1].forEach(sd => { const A = sd < 0 ? k.aL : k.aR; A.u.rotation.z = sd * (0.28 + 0.1 * w); A.u.rotation.x = 0.55 + 0.35 * w; A.f.rotation.x = 0.5 - 0.3 * w; });
    };
})();

// ===== v24: free throw — ball held between both hands, no aim circle, harder levels =====
(function ssFreeThrowV24() {
    const _pose = FH.pose;
    FH.pose = function (u) {
        _pose.call(this, u);
        const L = FH.shooter.userData, x = (u - 0.38) / 0.5, e = Math.max(0, Math.min(1, x)), ext = e * e * (3 - 2 * e), k = 1 - ext;
        L.aL.u.rotation.z += 0.47 * k; L.aR.u.rotation.z -= 0.44 * k;
        L.aL.f.rotation.x += 0.1 * k; L.aR.f.rotation.x -= 0.05 * k;
    };
})();
