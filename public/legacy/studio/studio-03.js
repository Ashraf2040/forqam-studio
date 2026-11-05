
// ============================================================================
// SMART STUDIO v2 — HD GRAPHICS ENGINE, NEW GAMES, QUESTION FILE LIBRARY
// Appended override layer. Original logic, PIN, rosters and Firebase untouched.
// ============================================================================

const SS = {
    quality: (function(){ try { return localStorage.getItem(smk7('SGE_SS_GFX_Q')) || 'high'; } catch(e){ return 'high'; } })(),
    shake: 0,
    confetti: [],
    idleT: 0,
    wheelAngle: 0,
    carAngle: 0,
    raceScroll: 0,
    raceDust: [],
    csSmoke: [],
    csShook: false,
    btSmoke: [],
    btDebris: [],
    btBoomDone: false,
    embers: [],
    sparkles: []
};
let ssG = {};            // per-run state for new games (modes 9-15)
let ssFinalFxRunning = false;

// ---------- helpers ----------
function ssQ(n) { return SS.quality === 'high' ? n : Math.max(1, Math.round(n * 0.35)); }
function ssSh(ctx, blur, color) { if (SS.quality === 'high') { ctx.shadowBlur = blur; ctx.shadowColor = color; } }
function ssNoSh(ctx) { ctx.shadowBlur = 0; }
function ssLg(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function ssRg(ctx, x, y, r0, r1, stops) { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function ssRR(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function ssShake(ctx) { if (SS.shake > 0.3) { ctx.translate((Math.random() - 0.5) * SS.shake, (Math.random() - 0.5) * SS.shake); SS.shake *= 0.9; } else SS.shake = 0; }
function ssTm() { return SS.idleT + stageTick; }
function ssHexCol(hex, f) { // shade hex color by factor f (0..2)
    const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    const b = Math.min(255, Math.round((n & 255) * f));
    return `rgb(${r},${g},${b})`;
}
function ssNameTag(ctx, name, x, y, bg, fg) {
    let fsz = 13.5; ctx.font = '900 ' + fsz + 'px "Plus Jakarta Sans", sans-serif';
    let tw = ctx.measureText(name).width + 20;
    if (ssNameTag.maxW && tw > ssNameTag.maxW) { fsz = Math.max(8, fsz * (ssNameTag.maxW - 20) / (tw - 20)); ctx.font = '900 ' + fsz.toFixed(1) + 'px "Plus Jakarta Sans", sans-serif'; tw = Math.min(ssNameTag.maxW, ctx.measureText(name).width + 20); }
    ctx.fillStyle = bg || 'rgba(15,23,42,0.88)';
    ssRR(ctx, x - tw / 2, y, tw, 25, 9); ctx.fill();
    ctx.fillStyle = fg || '#ffffff'; ctx.textAlign = 'center';
    ctx.fillText(name, x, y + 17);
}
function ssInitials(name) {
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0] || ' ')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function ssMakeConfetti(W, H) {
    const cols = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#fde047', '#ec4899'];
    const arr = [];
    for (let i = 0; i < ssQ(90); i++) {
        arr.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.2, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, rot: Math.random() * Math.PI, vRot: (Math.random() - 0.5) * 0.25, color: cols[i % cols.length] });
    }
    return arr;
}
function ssDrawConfetti(ctx, W, H) {
    SS.confetti.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.vRot; c.vy += 0.05;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
    });
    SS.confetti = SS.confetti.filter(c => c.y < H + 30);
}
function ssCloud(ctx, x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.92 : alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 26 * s, y + 8 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();
}
function ssTree(ctx, x, y, s) {
    ctx.fillStyle = '#78350f'; ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 26 * s);
    ctx.fillStyle = '#15803d';
    ctx.beginPath(); ctx.moveTo(x, y - 78 * s); ctx.lineTo(x - 24 * s, y - 24 * s); ctx.lineTo(x + 24 * s, y - 24 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.moveTo(x, y - 88 * s); ctx.lineTo(x - 17 * s, y - 46 * s); ctx.lineTo(x + 17 * s, y - 46 * s); ctx.closePath(); ctx.fill();
}
function ssStartFinalFx() {
    if (ssFinalFxRunning) return;
    ssFinalFxRunning = true;
    let n = 0;
    function fx() {
        n++;
        const modal = document.getElementById('gameStageModal');
        if (!modal || modal.style.display === 'none' || n > 110 || SS.confetti.length === 0 && n > 20) { ssFinalFxRunning = false; return; }
        drawStageFrame(true);
        requestAnimationFrame(fx);
    }
    requestAnimationFrame(fx);
}

// ---------- global wrappers (confetti on every win) ----------
function showWinnerPopup(emoji, subtitle, name) {
    const canvas = document.getElementById('stageCanvas');
    if (canvas && activeStageMode !== 6) SS.confetti = ssMakeConfetti(canvas.width, canvas.height);
    window._ssOrig.showWinner(emoji, subtitle, name);
    ssStartFinalFx();
}

// ---------- idle animation driver ----------
function ssIdleLoop() {
    const modal = document.getElementById('gameStageModal');
    if (modal && modal.style.display !== 'none' && !isStageRunning && activeStageMode !== 6 && !ssFinalFxRunning) {
        SS.idleT++;
        drawStageFrame(false);
    } else {
        SS.idleT++;
    }
    requestAnimationFrame(ssIdleLoop);
}

// ---------- quality toggle ----------
function ssToggleQuality() {
    SS.quality = SS.quality === 'high' ? 'low' : 'high';
    try { localStorage.setItem(smk7('SGE_SS_GFX_Q'), SS.quality); } catch (e) {}
    const btn = document.getElementById('ssQualityBtn');
    if (btn) btn.innerHTML = SS.quality === 'high' ? '<i class="fa-solid fa-gem"></i> GFX: High' : '<i class="fa-solid fa-bolt"></i> GFX: Low';
    showToast(SS.quality === 'high' ? '💎 High graphics ON' : '⚡ Performance mode ON');
    drawStageFrame(false);
}
// ---------- modes registry: 7 new games ----------
EIGHT_MODES.push(
    { id: 9,  title: "Balloon Pop Party",   sub: "Dart vs Floating Name Balloons",  color: "#f472b6" },
    { id: 11, title: "Space Rocket Race",   sub: "Nitro Rockets to the Moon",       color: "#6366f1" },
    { id: 12, title: "Prize Claw Machine",  sub: "Arcade Claw Grabs the Winner",    color: "#22d3ee" },
    { id: 13, title: "Fishing Frenzy",      sub: "Hook the Lucky Name Fish",        color: "#0284c7" },
    { id: 14, title: "Treasure Dive",       sub: "Submarine Picks a Golden Chest",  color: "#14b8a6" },
    { id: 15, title: "UFO Name Abduction",  sub: "Alien Beam Picks the Chosen One", color: "#a3e635" }
);

function getModeCardSVG(modeId) {
    const v2 = {
        9: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sk9" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#e0f2fe"/></linearGradient></defs><rect width="400" height="220" fill="url(#sk9)"/><rect y="180" width="400" height="40" fill="#4ade80"/><ellipse cx="130" cy="90" rx="38" ry="46" fill="#f472b6"/><ellipse cx="118" cy="74" rx="12" ry="16" fill="#fbcfe8" opacity="0.8"/><path d="M130,136 Q126,160 130,178" stroke="#475569" stroke-width="2.5" fill="none"/><ellipse cx="250" cy="110" rx="34" ry="42" fill="#fbbf24"/><path d="M250,152 Q246,168 250,184" stroke="#475569" stroke-width="2.5" fill="none"/><path d="M40,190 L118,116" stroke="#1e293b" stroke-width="5"/><path d="M40,190 L70,176" stroke="#dc2626" stroke-width="9"/></svg>`,
        10: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#7f1d1d"/><rect x="80" y="30" width="240" height="160" rx="20" fill="#fbbf24" stroke="#fde68a" stroke-width="4"/><rect x="100" y="60" width="60" height="80" rx="10" fill="#fff"/><rect x="170" y="60" width="60" height="80" rx="10" fill="#fff"/><rect x="240" y="60" width="60" height="80" rx="10" fill="#fff"/><text x="130" y="112" text-anchor="middle" font-size="40" font-weight="900" fill="#dc2626" font-family="sans-serif">7</text><text x="200" y="112" text-anchor="middle" font-size="40" font-weight="900" fill="#dc2626" font-family="sans-serif">7</text><text x="270" y="112" text-anchor="middle" font-size="40" font-weight="900" fill="#dc2626" font-family="sans-serif">7</text><rect x="330" y="60" width="10" height="70" rx="5" fill="#94a3b8"/><circle cx="335" cy="52" r="14" fill="#ef4444"/></svg>`,
        11: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#0c0a2e"/><circle cx="330" cy="42" r="24" fill="#fef9c3"/><circle cx="322" cy="36" r="5" fill="#fde68a"/><circle cx="340" cy="48" r="4" fill="#fde68a"/><circle cx="60" cy="40" r="2.5" fill="#fff"/><circle cx="120" cy="80" r="2" fill="#fff"/><circle cx="300" cy="120" r="2.5" fill="#fff"/><circle cx="200" cy="30" r="2" fill="#fff"/><path d="M185,90 Q185,55 200,42 Q215,55 215,90 L215,130 L185,130 Z" fill="#e2e8f0"/><circle cx="200" cy="78" r="9" fill="#38bdf8" stroke="#0f172a" stroke-width="2"/><path d="M185,110 L168,140 L185,132 Z" fill="#ef4444"/><path d="M215,110 L232,140 L215,132 Z" fill="#ef4444"/><path d="M192,132 Q200,170 208,132 Z" fill="#f97316"/><path d="M195,132 Q200,158 205,132 Z" fill="#fde047"/></svg>`,
        12: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#164e63"/><rect x="90" y="26" width="220" height="168" rx="14" fill="#22d3ee" opacity="0.25" stroke="#67e8f9" stroke-width="4"/><rect x="110" y="36" width="180" height="12" rx="6" fill="#475569"/><rect x="182" y="44" width="36" height="16" rx="5" fill="#94a3b8"/><path d="M200,60 L200,92" stroke="#cbd5e1" stroke-width="4"/><path d="M200,92 L182,112 M200,92 L218,112 M200,92 L200,116" stroke="#e2e8f0" stroke-width="5" fill="none"/><circle cx="140" cy="168" r="20" fill="#f472b6"/><circle cx="200" cy="174" r="20" fill="#fbbf24"/><circle cx="260" cy="168" r="20" fill="#4ade80"/></svg>`,
        13: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wt13" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/></linearGradient></defs><rect width="400" height="80" fill="#bae6fd"/><rect y="80" width="400" height="140" fill="url(#wt13)"/><path d="M0,80 Q50,70 100,80 T200,80 T300,80 T400,80" stroke="#e0f2fe" stroke-width="3" fill="none"/><ellipse cx="200" cy="150" rx="42" ry="22" fill="#fb923c"/><path d="M240,150 L268,134 L268,166 Z" fill="#fb923c"/><circle cx="186" cy="146" r="4" fill="#0f172a"/><path d="M90,20 L200,132" stroke="#78350f" stroke-width="2.5"/><circle cx="200" cy="136" r="6" fill="none" stroke="#dc2626" stroke-width="3"/><rect x="40" y="66" width="90" height="16" rx="8" fill="#92400e"/></svg>`,
        14: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sea14" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#0c4a6e"/></linearGradient></defs><rect width="400" height="220" fill="url(#sea14)"/><rect y="180" width="400" height="40" fill="#d6b483"/><ellipse cx="200" cy="80" rx="62" ry="26" fill="#fbbf24"/><rect x="186" y="40" width="28" height="26" rx="6" fill="#f59e0b"/><circle cx="200" cy="52" r="6" fill="#67e8f9"/><circle cx="172" cy="80" r="7" fill="#67e8f9"/><circle cx="200" cy="80" r="7" fill="#67e8f9"/><circle cx="228" cy="80" r="7" fill="#67e8f9"/><rect x="290" y="150" width="64" height="40" rx="8" fill="#92400e" stroke="#fde047" stroke-width="3"/><rect x="290" y="150" width="64" height="12" rx="6" fill="#b45309"/><circle cx="322" cy="172" r="6" fill="#fde047"/><circle cx="90" cy="60" r="4" fill="#e0f2fe" opacity="0.8"/><circle cx="110" cy="100" r="3" fill="#e0f2fe" opacity="0.8"/><circle cx="80" cy="130" r="5" fill="#e0f2fe" opacity="0.7"/></svg>`,
        15: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="220" fill="#111033"/><circle cx="60" cy="36" r="2.5" fill="#fff"/><circle cx="140" cy="20" r="2" fill="#fff"/><circle cx="330" cy="30" r="2.5" fill="#fff"/><circle cx="250" cy="55" r="2" fill="#fff"/><rect y="170" width="400" height="50" fill="#14532d"/><ellipse cx="200" cy="80" rx="74" ry="24" fill="#94a3b8"/><ellipse cx="200" cy="70" rx="34" ry="20" fill="#67e8f9" opacity="0.85"/><circle cx="160" cy="84" r="5" fill="#fde047"/><circle cx="200" cy="88" r="5" fill="#fde047"/><circle cx="240" cy="84" r="5" fill="#fde047"/><path d="M176,100 L150,180 L250,180 L224,100 Z" fill="#fde047" opacity="0.35"/><circle cx="200" cy="160" r="12" fill="#f472b6"/></svg>`
    };
    if (v2[modeId]) return `data:image/svg+xml;utf8,${encodeURIComponent(v2[modeId])}`;
    return window._ssOrig.cardSVG(modeId);
}

// ============================================================================
// MASTER RENDER DISPATCH (overrides original drawStageFrame)
// ============================================================================
function drawStageFrame(isFinal = false) {
    const canvas = document.getElementById('stageCanvas');
    if (!canvas || activeStageMode === 6) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ssShake(ctx);
    switch (activeStageMode) {
        case 1: ssDrawRace(ctx, W, H); break;
        case 2: ssDrawDual(ctx, W, H); break;
        case 3: ssDrawWheel(ctx, W, H); break;
        case 4: ssDrawArrowArena(ctx, W, H); break;
        case 5: ssDrawCannonArena(ctx, W, H); break;
        case 7: ssDrawCarousel(ctx, W, H); break;
        case 8: ssDrawBombArena(ctx, W, H); break;
        case 9: ssDrawBalloons(ctx, W, H); break;
        case 10: ssDrawSlots(ctx, W, H); break;
        case 11: ssDrawRockets(ctx, W, H); break;
        case 12: ssDrawClaw(ctx, W, H); break;
        case 13: ssDrawFishing(ctx, W, H); break;
        case 14: ssDrawDive(ctx, W, H); break;
        case 15: ssDrawUfo(ctx, W, H); break;
        default: ctx.restore(); window._ssOrig.draw(isFinal); return;
    }
    ctx.restore();
    if (isFinal) ssDrawConfetti(ctx, W, H);
    ctx.textAlign = 'left';
}
// ============================================================================
// MODE 1: GRAN TURISMO RACE — parallax scenery, shaded cars, nitro, dust
// ============================================================================
function ssDrawCar(ctx, x, cy, color, nitro) {
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(x + 44, cy + 20, 52, 8, 0, 0, Math.PI * 2); ctx.fill();

    // nitro flame
    if (nitro) {
        const fl = 14 + Math.random() * 16;
        const fg = ssLg(ctx, x - fl - 8, cy, x + 2, cy, [[0, 'rgba(59,130,246,0)'], [0.5, '#38bdf8'], [1, '#fde047']]);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x - fl - 8, cy);
        ctx.quadraticCurveTo(x - 2, cy - 8, x + 2, cy - 4);
        ctx.lineTo(x + 2, cy + 4);
        ctx.quadraticCurveTo(x - 2, cy + 8, x - fl - 8, cy);
        ctx.fill();
    }

    // wheels (behind body bottom)
    const wheelRot = x * 0.11;
    [x + 20, x + 68].forEach(wx => {
        ctx.fillStyle = '#0b1120';
        ctx.beginPath(); ctx.arc(wx, cy + 13, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.arc(wx, cy + 13, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6;
        for (let s = 0; s < 3; s++) {
            const a = wheelRot + s * Math.PI / 3;
            ctx.beginPath(); ctx.moveTo(wx, cy + 13);
            ctx.lineTo(wx + Math.cos(a) * 9, cy + 13 + Math.sin(a) * 9); ctx.stroke();
        }
    });

    // body
    const bg = ssLg(ctx, x, cy - 18, x, cy + 16, [[0, ssHexCol(color, 1.35)], [0.45, color], [1, ssHexCol(color, 0.55)]]);
    ctx.fillStyle = bg;
    ssRR(ctx, x, cy - 14, 92, 28, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.4; ctx.stroke();

    // cabin + glass
    ctx.fillStyle = ssHexCol(color, 0.8);
    ssRR(ctx, x + 30, cy - 26, 38, 16, 8); ctx.fill();
    ctx.fillStyle = ssLg(ctx, x + 32, cy - 25, x + 66, cy - 11, [[0, '#e0f2fe'], [1, '#38bdf8']]);
    ssRR(ctx, x + 34, cy - 24, 30, 12, 6); ctx.fill();

    // headlight + spoiler
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath(); ctx.ellipse(x + 89, cy - 6, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ssHexCol(color, 0.6);
    ctx.fillRect(x - 4, cy - 20, 10, 4);
    ctx.fillRect(x - 2, cy - 20, 3, 10);

    // top highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + 6, cy - 11); ctx.lineTo(x + 86, cy - 11); ctx.stroke();
}

function ssDrawRace(ctx, W, H) {
    const tm = ssTm();
    const finX = W - 160;
    if (isStageRunning) SS.raceScroll += 7;
    const sc = SS.raceScroll;

    // sky
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, 200, [[0, '#38bdf8'], [0.7, '#bae6fd'], [1, '#e0f2fe']]);
    ctx.fillRect(0, 0, W, 200);

    // sun
    ctx.fillStyle = ssRg(ctx, 110, 52, 8, 60, [[0, 'rgba(254,249,195,1)'], [0.35, 'rgba(253,224,71,0.85)'], [1, 'rgba(253,224,71,0)']]);
    ctx.beginPath(); ctx.arc(110, 52, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(110, 52, 26, 0, Math.PI * 2); ctx.fill();

    // clouds
    ssCloud(ctx, ((tm * 0.35 + 300) % (W + 260)) - 130, 46, 0.9);
    ssCloud(ctx, ((tm * 0.22 + 800) % (W + 260)) - 130, 96, 0.7, 0.8);
    ssCloud(ctx, ((tm * 0.28 + 1200) % (W + 260)) - 130, 30, 0.55, 0.75);

    // far mountains (slow parallax)
    ctx.fillStyle = '#7dd3fc';
    for (let i = -1; i < 5; i++) {
        const mx = i * 340 - (sc * 0.12 % 340);
        ctx.beginPath(); ctx.moveTo(mx, 200); ctx.lineTo(mx + 170, 78); ctx.lineTo(mx + 340, 200); ctx.closePath(); ctx.fill();
    }
    // snowy caps
    ctx.fillStyle = '#f0f9ff';
    for (let i = -1; i < 5; i++) {
        const mx = i * 340 - (sc * 0.12 % 340);
        ctx.beginPath(); ctx.moveTo(mx + 148, 112); ctx.lineTo(mx + 170, 78); ctx.lineTo(mx + 192, 112); ctx.closePath(); ctx.fill();
    }
    // near hills
    ctx.fillStyle = '#4ade80';
    for (let i = -1; i < 7; i++) {
        const hx = i * 240 - (sc * 0.3 % 240);
        ctx.beginPath(); ctx.ellipse(hx + 120, 210, 150, 46, 0, Math.PI, 0); ctx.fill();
    }
    // grass strip
    ctx.fillStyle = ssLg(ctx, 0, 170, 0, 205, [[0, '#22c55e'], [1, '#15803d']]);
    ctx.fillRect(0, 170, W, 38);
    // trees (fast parallax)
    for (let i = -1; i < 8; i++) {
        const tx = i * 210 - (sc * 0.75 % 210);
        ssTree(ctx, tx, 204, 0.62);
    }

    // road
    ctx.fillStyle = ssLg(ctx, 0, 205, 0, H, [[0, '#475569'], [0.5, '#334155'], [1, '#1e293b']]);
    ctx.fillRect(0, 205, W, H - 205);
    // edge stripes scrolling
    for (let cx = -60; cx < W + 60; cx += 60) {
        const sx = cx - (sc % 60);
        ctx.fillStyle = Math.floor(cx / 60) % 2 === 0 ? '#ef4444' : '#f8fafc';
        ctx.fillRect(sx, 205, 60, 10);
        ctx.fillRect(sx, H - 22, 60, 10);
    }

    // finish post + checkers + banner
    for (let r = 0; r < 18; r++) {
        for (let c2 = 0; c2 < 2; c2++) {
            ctx.fillStyle = (r + c2) % 2 === 0 ? '#f8fafc' : '#0f172a';
            ctx.fillRect(finX + 8 + c2 * 13, 215 + r * 21, 13, 21);
        }
    }
    ctx.fillStyle = '#0f172a'; ctx.fillRect(finX, 205, 8, H - 225);
    ctx.fillStyle = '#fde047';
    ssRR(ctx, finX - 46, 178, 116, 26, 8); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.font = '900 15px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🏁 FINISH', finX + 12, 196);

    const n = Math.max(stageEntities.length, 1);
    const laneH = (H - 245) / n;
    // lane dashes
    ctx.strokeStyle = 'rgba(248,250,252,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([26, 30]);
    ctx.lineDashOffset = -(sc % 56);
    for (let i = 1; i < n; i++) {
        const ly = 215 + i * laneH;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(finX, ly); ctx.stroke();
    }
    ctx.setLineDash([]);

    stageEntities.forEach((car, i) => {
        if (isStageRunning) {
            car.x += car.speed + (Math.random() * 2.8);
            if (car.x > finX) car.x = finX;
            if (SS.quality === 'high' && Math.random() < 0.3) {
                SS.raceDust.push({ x: car.x - 6, y: 215 + i * laneH + laneH * 0.45 + 14, vx: -1 - Math.random() * 2, vy: -0.4 - Math.random(), life: 1 });
            }
        }
        const cy = 215 + i * laneH + laneH * 0.45;
        ssNameTag(ctx, car.name, car.x + 44, cy - 46, 'rgba(15,23,42,0.75)');
        ssDrawCar(ctx, car.x, cy, car.color, isStageRunning && car.x < finX);
    });

    // dust
    SS.raceDust.forEach(d => {
        d.x += d.vx; d.y += d.vy; d.life -= 0.05;
        ctx.fillStyle = `rgba(203,213,225,${Math.max(0, d.life) * 0.5})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 4 + (1 - d.life) * 7, 0, Math.PI * 2); ctx.fill();
    });
    SS.raceDust = SS.raceDust.filter(d => d.life > 0);

    // speed lines
    if (isStageRunning && SS.quality === 'high') {
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
            const ly = 220 + Math.random() * (H - 250);
            const lx = Math.random() * W;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 40 - Math.random() * 50, ly); ctx.stroke();
        }
    }
}

// ============================================================================
// MODE 2: DUAL CHALLENGE VS — arena spotlights, embers, glowing podiums
// ============================================================================
function ssDrawDual(ctx, W, H) {
    const tm = ssTm();
    ctx.fillStyle = ssRg(ctx, W / 2, H * 0.42, 60, 720, [[0, '#1e3a8a'], [0.55, '#0f172a'], [1, '#020617']]);
    ctx.fillRect(0, 0, W, H);

    // stage floor
    ctx.fillStyle = ssLg(ctx, 0, H * 0.72, 0, H, [[0, 'rgba(59,130,246,0.18)'], [1, 'rgba(2,6,23,0)']]);
    ctx.beginPath(); ctx.ellipse(W / 2, H + 40, 640, 180, 0, Math.PI, 0); ctx.fill();

    // spotlight beams
    [[330, '#38bdf8'], [950, '#34d399']].forEach(([bx, col], k) => {
        const sway = Math.sin(tm * 0.02 + k * 2) * 0.06;
        ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(bx, 0); ctx.rotate(sway);
        ctx.fillStyle = ssLg(ctx, 0, 0, 0, 500, [[0, col], [1, 'rgba(0,0,0,0)']]);
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(190, 500); ctx.lineTo(-190, 500); ctx.closePath(); ctx.fill();
        ctx.restore();
    });

    // rising embers
    if (SS.quality === 'high') {
        if (SS.embers.length < 26 && Math.random() < 0.5) SS.embers.push({ x: Math.random() * W, y: H + 8, vy: 0.5 + Math.random() * 1.2, r: 1 + Math.random() * 2.4, life: 1 });
        SS.embers.forEach(e => { e.y -= e.vy; e.life -= 0.004; });
        SS.embers = SS.embers.filter(e => e.life > 0 && e.y > -10);
        SS.embers.forEach(e => {
            ctx.fillStyle = `rgba(253,224,71,${Math.max(0, e.life) * 0.7})`;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        });
    }

    const students = getActiveStudents();
    if (students.length === 0) return;
    const rName = isStageRunning ? students[stageTick % students.length] : (appState.reader || "Reader");
    const cName = isStageRunning ? students[(stageTick + 3) % students.length] : (appState.challenger || "Challenger");
    const pulse = isStageRunning ? 1 + Math.sin(tm * 0.3) * 0.03 : 1;

    function podium(cx, accent, dark, icon, role, name) {
        ctx.save();
        ctx.translate(cx, 300); ctx.scale(pulse, pulse);
        ssSh(ctx, 26, accent);
        ctx.fillStyle = ssLg(ctx, 0, -190, 0, 190, [[0, dark], [1, '#020617']]);
        ssRR(ctx, -190, -190, 380, 380, 42); ctx.fill();
        ssNoSh(ctx);
        ctx.strokeStyle = accent; ctx.lineWidth = 5;
        ssRR(ctx, -190, -190, 380, 380, 42); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
        ssRR(ctx, -180, -180, 360, 360, 36); ctx.stroke();

        // avatar
        ctx.fillStyle = ssRg(ctx, 0, -96, 6, 62, [[0, '#ffffff'], [1, accent]]);
        ctx.beginPath(); ctx.arc(0, -96, 54, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = dark;
        ctx.font = '900 34px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(ssInitials(name), 0, -84);

        ctx.font = '900 21px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = accent; ctx.fillText(icon + ' ' + role, 0, -8);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 31px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(name.length > 22 ? name.slice(0, 21) + '…' : name, 0, 52);

        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ssRR(ctx, -150, 96, 300, 40, 14); ctx.fill();
        ctx.fillStyle = '#cbd5e1'; ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(role === 'QUESTION READER' ? 'Reads the imported question aloud' : 'Answers the imported question', 0, 122);
        ctx.restore();
    }
    podium(330, '#38bdf8', '#1e3a8a', '🎤', 'QUESTION READER', rName);
    podium(950, '#34d399', '#065f46', '💡', 'ANSWER CHALLENGER', cName);

    // VS badge
    ctx.save(); ctx.translate(W / 2, 300);
    const vsPulse = 1 + Math.sin(tm * 0.12) * 0.08;
    ctx.scale(vsPulse, vsPulse);
    ctx.strokeStyle = 'rgba(253,224,71,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(0, 0, 72, tm * 0.02, tm * 0.02 + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ssSh(ctx, 30, '#f59e0b');
    ctx.fillStyle = ssRg(ctx, -12, -14, 6, 60, [[0, '#fde047'], [0.6, '#f59e0b'], [1, '#b45309']]);
    ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
    ssNoSh(ctx);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 35px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', 0, 13);
    ctx.restore();
}

// ============================================================================
// MODE 3: WHEEL OF FORTUNE — neon rim bulbs, glossy segments, easing spin
// ============================================================================
function ssDrawWheel(ctx, W, H) {
    const tm = ssTm();
    ctx.fillStyle = ssRg(ctx, W / 2, H / 2, 80, 760, [[0, '#312e81'], [0.6, '#1e1b4b'], [1, '#0b0920']]);
    ctx.fillRect(0, 0, W, H);

    // floor glow
    ctx.fillStyle = ssRg(ctx, W / 2, H - 40, 20, 420, [[0, 'rgba(139,92,246,0.35)'], [1, 'rgba(139,92,246,0)']]);
    ctx.beginPath(); ctx.ellipse(W / 2, H - 30, 420, 70, 0, 0, Math.PI * 2); ctx.fill();

    const cx = W / 2, cy = H / 2 + 6, r = 242;
    const n = Math.max(stageEntities.length, 1);
    const arc = (Math.PI * 2) / n;
    if (isStageRunning) SS.wheelAngle += Math.max(0.02, 0.26 * (1 - stageTick / 128));
    else SS.wheelAngle += 0.005;
    const rot = SS.wheelAngle;

    // wheel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r + 22, r * 0.9, 26, 0, 0, Math.PI * 2); ctx.fill();

    // segments
    stageEntities.forEach((ent, i) => {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, rot + i * arc, rot + (i + 1) * arc);
        ctx.closePath();
        ctx.fillStyle = ent.color; ctx.fill();
        // glossy inner shading
        ctx.save(); ctx.clip();
        ctx.fillStyle = ssRg(ctx, cx - 60, cy - 80, 20, r * 1.3, [[0, 'rgba(255,255,255,0.30)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.22)']]);
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot + (i + 0.5) * arc);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 15.5px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'right';
        ssSh(ctx, 4, 'rgba(0,0,0,0.6)');
        ctx.fillText(ent.name.slice(0, 18), r - 26, 5);
        ssNoSh(ctx);
        ctx.restore();
    });

    // gold rim
    ctx.strokeStyle = ssLg(ctx, cx - r, cy - r, cx + r, cy + r, [[0, '#fde047'], [0.5, '#f59e0b'], [1, '#b45309']]);
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();

    // rim bulbs
    const bulbs = 24;
    for (let b = 0; b < bulbs; b++) {
        const a = (b / bulbs) * Math.PI * 2;
        const on = (b + Math.floor(tm * 0.12)) % 2 === 0;
        ctx.fillStyle = on ? '#fef08a' : '#92400e';
        if (on) ssSh(ctx, 10, '#fde047');
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4), 5, 0, Math.PI * 2); ctx.fill();
        ssNoSh(ctx);
    }

    // hub
    ctx.fillStyle = ssRg(ctx, cx - 10, cy - 12, 4, 44, [[0, '#fef9c3'], [0.55, '#f59e0b'], [1, '#92400e']]);
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#78350f'; ctx.font = '900 17px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SPIN', cx, cy + 6);

    // pointer
    ctx.save(); ctx.translate(cx, cy - r - 26);
    ssSh(ctx, 12, 'rgba(239,68,68,0.8)');
    ctx.fillStyle = ssLg(ctx, 0, -8, 0, 34, [[0, '#ef4444'], [1, '#991b1b']]);
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(0, 34); ctx.closePath(); ctx.fill();
    ssNoSh(ctx);
    ctx.restore();

    // sparkles
    if (SS.quality === 'high') {
        for (let i = 0; i < 10; i++) {
            const sx = (i * 137.5 + tm * 1.3) % W;
            const sy = (i * 89.3) % H;
            const tw = (Math.sin(tm * 0.1 + i) + 1) / 2;
            ctx.fillStyle = `rgba(255,255,255,${tw * 0.8})`;
            ctx.beginPath(); ctx.arc(sx, sy, 1.6 + tw * 1.6, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// ============================================================================
// MODE 7: HOLOGRAM CAROUSEL — glass holo cards, beams, reflections
// ============================================================================
const HOLO = { active: false, win: -1, focus: 0, t: 0, dur: 280, start: 0, final: 0, done: false };
function ssHoloStart() {
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    prepareStageEntities(7);
    const n = stageEntities.length; if (!n) return;
    const TWO = Math.PI * 2;
    HOLO.win = Math.floor(Math.random() * n);
    const target = -(HOLO.win / n) * TWO; // winner's angle becomes 0 => dead centre, facing the screen
    HOLO.start = SS.carAngle;
    HOLO.final = target + TWO * Math.ceil((HOLO.start + TWO * 4 - target) / TWO);
    HOLO.t = 0; HOLO.focus = 0; HOLO.active = true; HOLO.done = false;
    isStageRunning = true; stageTick = 0;
    document.getElementById('stageWinnerBanner').textContent = '🔮 Spinning... the card that stops in front wins!';
    StudioAudioManager.playSFX('select');
    function loop() {
        if (!isStageRunning || activeStageMode !== 7 || !HOLO.active) return;
        HOLO.t++; stageTick++;
        if (HOLO.t <= HOLO.dur) {
            const p = HOLO.t / HOLO.dur, e = 1 - Math.pow(1 - p, 3);
            SS.carAngle = HOLO.start + (HOLO.final - HOLO.start) * e;
            if (HOLO.t % 10 === 0 && p < 0.9) StudioAudioManager.playSFX('click');
        } else {
            SS.carAngle = HOLO.final;
            HOLO.focus = Math.min(1, HOLO.focus + 0.04);
            if (HOLO.t === HOLO.dur + 1) { StudioAudioManager.playSFX('cheer'); document.getElementById('stageWinnerBanner').textContent = '🔮 Stopped in front: ' + stageEntities[HOLO.win].name; }
        }
        drawStageFrame(false);
        if (HOLO.t === HOLO.dur + 100) {
            HOLO.done = true;
            ssCrownWinner(stageEntities[HOLO.win].name, '🔮', 'HOLOGRAM CARD WINNER', `🔮 Winner: ${stageEntities[HOLO.win].name}!`);
            return;
        }
        stageAnimFrame = requestAnimationFrame(loop);
    }
    stageAnimFrame = requestAnimationFrame(loop);
}
function ssDrawCarousel(ctx, W, H) {
    const tm = ssTm();
    ctx.fillStyle = ssRg(ctx, W / 2, H * 0.35, 60, 720, [[0, '#1e293b'], [0.55, '#0f172a'], [1, '#020617']]);
    ctx.fillRect(0, 0, W, H);

    // holo beams from top
    ctx.save(); ctx.globalAlpha = 0.10;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#38bdf8'], [1, 'rgba(56,189,248,0)']]);
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 0); ctx.lineTo(W / 2 + 330, H); ctx.lineTo(W / 2 - 330, H); ctx.closePath(); ctx.fill();
    ctx.restore();

    const cx = W / 2, cy = H / 2 - 8;
    const n = Math.max(stageEntities.length, 1);
    if (!HOLO.active) SS.carAngle += isStageRunning ? 0.05 : 0.006;

    // reflective floor
    ctx.fillStyle = ssRg(ctx, cx, H - 60, 30, 480, [[0, 'rgba(56,189,248,0.22)'], [1, 'rgba(56,189,248,0)']]);
    ctx.beginPath(); ctx.ellipse(cx, H - 46, 470, 64, 0, 0, Math.PI * 2); ctx.fill();

    const sortedCards = stageEntities.map((ent, i) => {
        const ang = SS.carAngle + (i / n) * Math.PI * 2;
        const isWin = HOLO.active && HOLO.win === i;
        return { ...ent, idx: i, isWin, x: cx + Math.sin(ang) * 380, z: Math.cos(ang), scale: (0.65 + (Math.cos(ang) + 1) * 0.32) * (isWin ? 1 + 0.38 * HOLO.focus : 1) };
    }).sort((a, b) => (a.isWin ? 1 : 0) - (b.isWin ? 1 : 0) || a.z - b.z);

    // v4: front "winner zone" marker so everyone sees where the card stops
    ctx.save();
    ctx.fillStyle = 'rgba(253,224,71,0.9)'; ctx.font = '900 15px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▼ WINNER SPOT ▼', cx, 42);
    ctx.strokeStyle = 'rgba(253,224,71,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(cx, 52); ctx.lineTo(cx, H - 58); ctx.stroke();
    ctx.restore();

    sortedCards.forEach(card => {
        const cw = 176 * card.scale, ch = 244 * card.scale;
        ctx.save();
        ctx.globalAlpha = (0.45 + (card.z + 1) * 0.27) * (HOLO.active && !card.isWin ? 1 - 0.6 * HOLO.focus : 1);
        if (card.isWin && HOLO.focus > 0) ctx.globalAlpha = 1;

        // reflection
        if (SS.quality === 'high' && card.z > 0.2) {
            ctx.save();
            ctx.globalAlpha = 0.10 * card.z;
            ctx.translate(card.x, H - 58 + ch * 0.24);
            ctx.scale(1, -0.5);
            ctx.fillStyle = '#38bdf8';
            ssRR(ctx, -cw / 2, -ch / 2, cw, ch, 20); ctx.fill();
            ctx.restore();
        }

        ssSh(ctx, 22 * card.scale, card.color);
        ctx.fillStyle = ssLg(ctx, card.x - cw / 2, cy - ch / 2, card.x + cw / 2, cy + ch / 2, [[0, '#1e3a8a'], [0.5, '#172554'], [1, '#0c1a3d']]);
        ssRR(ctx, card.x - cw / 2, cy - ch / 2, cw, ch, 20 * card.scale); ctx.fill();
        ssNoSh(ctx);
        ctx.strokeStyle = (card.isWin && HOLO.focus > 0) ? '#fde047' : card.color; ctx.lineWidth = (card.isWin && HOLO.focus > 0) ? 7 : 3;
        if (card.isWin && HOLO.focus > 0) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30; }
        ssRR(ctx, card.x - cw / 2, cy - ch / 2, cw, ch, 20 * card.scale); ctx.stroke();
        ctx.shadowBlur = 0;

        // glass sweep
        ctx.save();
        ssRR(ctx, card.x - cw / 2, cy - ch / 2, cw, ch, 20 * card.scale); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.moveTo(card.x - cw / 2, cy - ch / 2);
        ctx.lineTo(card.x - cw / 2 + cw * 0.45, cy - ch / 2);
        ctx.lineTo(card.x - cw / 2 + cw * 0.15, cy + ch / 2);
        ctx.lineTo(card.x - cw / 2, cy + ch / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // avatar chip
        ctx.fillStyle = ssRg(ctx, card.x - 8 * card.scale, cy - ch * 0.24, 3, 30 * card.scale, [[0, '#ffffff'], [1, card.color]]);
        ctx.beginPath(); ctx.arc(card.x, cy - ch * 0.20, 24 * card.scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#172554';
        ctx.font = `900 ${Math.round(17 * card.scale)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ssInitials(card.name), card.x, cy - ch * 0.20 + 6 * card.scale);

        ctx.fillStyle = '#fde047';
        let nfs = Math.round(19 * card.scale);
        ctx.font = `900 ${nfs}px "Plus Jakarta Sans", sans-serif`;
        while (ctx.measureText(card.name).width > cw - 14 && nfs > 9) { nfs--; ctx.font = `900 ${nfs}px "Plus Jakarta Sans", sans-serif`; }
        ctx.fillText(card.name, card.x, cy + ch * 0.18);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = `800 ${Math.round(10.5 * card.scale)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('HOLOGRAM CARD', card.x, cy + ch * 0.34);
        ctx.restore();
    });

    // floating particles
    if (SS.quality === 'high') {
        for (let i = 0; i < 14; i++) {
            const px = (i * 97.7 + tm * 0.8) % W;
            const py = H - ((i * 63.1 + tm * 0.5) % H);
            ctx.fillStyle = `rgba(56,189,248,${0.15 + 0.25 * Math.sin(tm * 0.06 + i)})`;
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
    }
}
// ============================================================================
// MODE 4: ARROW STRIKE ARENA — recurve bow, wooden stands, trail, wobble
// ============================================================================
function ssDrawArrowArena(ctx, W, H) {
    const tm = ssTm();
    const st = arrowStrikeState;
    // sky
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H * 0.5, [[0, '#2596ff'], [0.75, '#8fd3ff'], [1, '#d8f3ff']]);
    ctx.fillRect(0, 0, W, H * 0.5);
    // sun + glow
    ctx.fillStyle = ssRg(ctx, W - 130, 74, 10, 90, [[0, 'rgba(254,249,195,1)'], [0.4, 'rgba(253,224,71,0.7)'], [1, 'rgba(253,224,71,0)']]);
    ctx.beginPath(); ctx.arc(W - 130, 74, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(W - 130, 74, 34, 0, Math.PI * 2); ctx.fill();
    ssCloud(ctx, ((tm * 0.3 + 200) % (W + 240)) - 120, 60, 0.8, 0.85);
    ssCloud(ctx, ((tm * 0.2 + 900) % (W + 240)) - 120, 118, 0.6, 0.7);

    // hills + trees
    ctx.fillStyle = '#86efac';
    ctx.beginPath(); ctx.ellipse(W * 0.25, H * 0.52, 420, 60, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.ellipse(W * 0.75, H * 0.53, 460, 66, 0, Math.PI, 0); ctx.fill();
    ssTree(ctx, 60, H * 0.52, 0.9); ssTree(ctx, W - 60, H * 0.54, 1.05); ssTree(ctx, W - 160, H * 0.51, 0.7);

    // grass field
    ctx.fillStyle = ssLg(ctx, 0, H * 0.48, 0, H, [[0, '#4ade80'], [0.4, '#22c55e'], [1, '#15803d']]);
    ctx.fillRect(0, H * 0.48, W, H * 0.52);
    if (SS.quality === 'high') {
        ctx.strokeStyle = 'rgba(21,128,61,0.5)'; ctx.lineWidth = 1.6;
        for (let i = 0; i < 60; i++) {
            const gx = (i * 53.7) % W, gy = H * 0.52 + ((i * 91.3) % (H * 0.44));
            ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 3, gy - 8, gx + 6, gy - 10); ctx.stroke();
        }
        // flowers
        ['#fde047', '#f472b6', '#ffffff'].forEach((fc, k) => {
            ctx.fillStyle = fc;
            for (let i = 0; i < 8; i++) {
                const fx2 = (i * 167 + k * 71) % W, fy = H * 0.56 + ((i * 137 + k * 97) % (H * 0.38));
                ctx.beginPath(); ctx.arc(fx2, fy, 2.6, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    // targets on wooden stands
    st.targets.forEach((t, idx) => {
        const wobble = (st.phase === 'hit' && idx === st.selectedIdx && st.quiverTick > 0) ? Math.sin(st.quiverTick * 1.2) * st.quiverTick * 0.12 : 0;
        ctx.save();
        ctx.translate(t.x, t.y); ctx.rotate(wobble * 0.02);

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(0, t.r + 26, t.r * 0.9, 9, 0, 0, Math.PI * 2); ctx.fill();
        // stand
        ctx.fillStyle = ssLg(ctx, -6, 0, 6, 0, [[0, '#b45309'], [1, '#78350f']]);
        ctx.fillRect(-7, t.r - 4, 14, 30);
        ctx.beginPath(); ctx.moveTo(-7, t.r + 24); ctx.lineTo(-20, t.r + 30); ctx.lineTo(20, t.r + 30); ctx.lineTo(7, t.r + 24); ctx.closePath(); ctx.fill();

        // rings
        const rings = [[t.r, '#f8fafc'], [t.r * 0.78, '#dc2626'], [t.r * 0.56, '#f8fafc'], [t.r * 0.36, '#2563eb'], [t.r * 0.17, '#facc15']];
        ssSh(ctx, 8, 'rgba(0,0,0,0.35)');
        rings.forEach(([rr, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill(); });
        ssNoSh(ctx);
        ctx.strokeStyle = 'rgba(15,23,42,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, t.r, 0, Math.PI * 2); ctx.stroke();

        // aim highlight while scanning
        if (st.phase === 'scanning' && idx === st.aimIdx) {
            ctx.strokeStyle = `rgba(253,224,71,${0.6 + 0.4 * Math.sin(tm * 0.4)})`;
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0, 0, t.r + 8, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        ssNameTag(ctx, t.name, t.x, t.y + t.r + 32, 'rgba(120,53,15,0.92)');
    });

    // impact particles
    st.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    });

    const bowX = 605, bowY = 562;
    // archer platform shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(bowX, bowY + 26, 60, 10, 0, 0, Math.PI * 2); ctx.fill();

    const ang = st.bowAngle;
    const pull = st.bowPull;

    // arrow in flight
    if (st.phase === 'flying') {
        const a = st.arrowAngle;
        // motion trail
        for (let k = 3; k >= 1; k--) {
            ctx.save(); ctx.globalAlpha = 0.12 * k;
            ctx.translate(st.arrowX - Math.cos(a) * k * 22, st.arrowY - Math.sin(a) * k * 22);
            ctx.rotate(a);
            ctx.fillStyle = '#78350f'; ctx.fillRect(-26, -1.6, 52, 3.2);
            ctx.restore();
        }
        ctx.save();
        ctx.translate(st.arrowX, st.arrowY); ctx.rotate(a);
        ctx.fillStyle = '#92400e'; ctx.fillRect(-30, -2, 56, 4);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.moveTo(26, -4.5); ctx.lineTo(38, 0); ctx.lineTo(26, 4.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-40, -7); ctx.lineTo(-36, 0); ctx.lineTo(-40, 7); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // stuck arrow after hit
    if (st.phase === 'hit') {
        const t = st.targets[st.selectedIdx];
        if (t) {
            const a = Math.atan2(t.y - bowY, t.x - bowX);
            ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(a);
            ctx.fillStyle = '#92400e'; ctx.fillRect(-34, -2, 40, 4);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-44, -7); ctx.lineTo(-40, 0); ctx.lineTo(-44, 7); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    }

    // recurve bow (hidden while arrow flies)
    if (st.phase !== 'flying' && st.phase !== 'hit') {
        ctx.save();
        ctx.translate(bowX, bowY); ctx.rotate(ang);
        const pullBack = pull * 34;
        // limbs
        ctx.strokeStyle = ssLg(ctx, 0, -58, 0, 58, [[0, '#b45309'], [0.5, '#78350f'], [1, '#b45309']]);
        ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(14, -52); ctx.quadraticCurveTo(-8, -26, 0, 0); ctx.quadraticCurveTo(-8, 26, 14, 52); ctx.stroke();
        // grip
        ctx.strokeStyle = '#451a03'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
        // string
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, -52); ctx.lineTo(-pullBack, 0); ctx.lineTo(14, 52); ctx.stroke();
        // nocked arrow
        if (st.phase !== 'idle' || pull > 0) {
            ctx.fillStyle = '#92400e'; ctx.fillRect(-pullBack, -2, 62, 4);
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.moveTo(62 - pullBack, -5); ctx.lineTo(74 - pullBack, 0); ctx.lineTo(62 - pullBack, 5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(-pullBack, 0); ctx.lineTo(-pullBack - 10, -7); ctx.lineTo(-pullBack - 6, 0); ctx.lineTo(-pullBack - 10, 7); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }

    // archer hint text
    ctx.fillStyle = 'rgba(15,23,42,0.55)';
    ctx.font = '800 13px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ARCHER', bowX, bowY + 44);
}

// ============================================================================
// MODE 5: CANNON BOMB STRIKE ARENA — planks crates, muzzle flash, smoke
// ============================================================================
function ssDrawCannonArena(ctx, W, H) {
    const tm = ssTm();
    const st = cannonStrikeState;

    // dusk sky
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H * 0.5, [[0, '#f97316'], [0.5, '#fca5a5'], [1, '#fecdd3']]);
    ctx.fillRect(0, 0, W, H * 0.5);
    ctx.fillStyle = ssRg(ctx, W * 0.5, H * 0.46, 10, 120, [[0, 'rgba(254,249,195,0.95)'], [1, 'rgba(254,249,195,0)']]);
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.46, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.46, 40, 0, Math.PI * 2); ctx.fill();
    ssCloud(ctx, ((tm * 0.25 + 260) % (W + 240)) - 120, 66, 0.85, 0.55);
    ssCloud(ctx, ((tm * 0.18 + 980) % (W + 240)) - 120, 128, 0.65, 0.45);

    // ground
    ctx.fillStyle = ssLg(ctx, 0, H * 0.48, 0, H, [[0, '#a16207'], [0.35, '#854d0e'], [1, '#451a03']]);
    ctx.fillRect(0, H * 0.48, W, H * 0.52);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 8; i++) ctx.fillRect(0, H * 0.52 + i * 40, W, 2);

    // crates
    st.crates.forEach((c, idx) => {
        if (c.shattered) return;
        ctx.save(); ctx.translate(c.x, c.y);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(0, c.h / 2 + 8, c.w * 0.46, 9, 0, 0, Math.PI * 2); ctx.fill();

        ssSh(ctx, 10, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = ssLg(ctx, -c.w / 2, -c.h / 2, c.w / 2, c.h / 2, [[0, '#b45309'], [0.5, '#92400e'], [1, '#78350f']]);
        ssRR(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 8); ctx.fill();
        ssNoSh(ctx);
        // planks
        ctx.strokeStyle = 'rgba(69,26,3,0.55)'; ctx.lineWidth = 2;
        for (let p = 1; p < 3; p++) {
            ctx.beginPath(); ctx.moveTo(-c.w / 2, -c.h / 2 + p * c.h / 3); ctx.lineTo(c.w / 2, -c.h / 2 + p * c.h / 3); ctx.stroke();
        }
        // frame + cross
        ctx.strokeStyle = '#451a03'; ctx.lineWidth = 5;
        ssRR(ctx, -c.w / 2 + 3, -c.h / 2 + 3, c.w - 6, c.h - 6, 6); ctx.stroke();
        // nails
        ctx.fillStyle = '#d6d3d1';
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            ctx.beginPath(); ctx.arc(sx * (c.w / 2 - 11), sy * (c.h / 2 - 11), 2.6, 0, Math.PI * 2); ctx.fill();
        });
        // name stencil
        ctx.fillStyle = 'rgba(254,243,199,0.16)';
        ssRR(ctx, -c.w / 2 + 12, -15, c.w - 24, 32, 6); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.font = '900 15px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
        const nm = c.name.length > 20 ? c.name.slice(0, 19) + '…' : c.name;
        ctx.fillText(nm, 0, 6);

        if (st.phase === 'scanning' && idx === st.aimIdx) {
            ctx.strokeStyle = `rgba(253,224,71,${0.6 + 0.4 * Math.sin(tm * 0.4)})`;
            ctx.lineWidth = 5; ctx.setLineDash([12, 8]);
            ssRR(ctx, -c.w / 2 - 8, -c.h / 2 - 8, c.w + 16, c.h + 16, 10); ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    });

    const ox = 640, oy = 540;
    // cannon shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(ox, oy + 46, 84, 13, 0, 0, Math.PI * 2); ctx.fill();

    // recoil offset along barrel dir
    const rec = st.recoil || 0;
    const rx = -Math.sin(st.cannonAngle) * rec;
    const ry = Math.cos(st.cannonAngle) * rec;

    // wheels
    [ox - 34, ox + 34].forEach(wx => {
        ctx.fillStyle = '#451a03';
        ctx.beginPath(); ctx.arc(wx, oy + 30, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(wx, oy + 30, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#d6b483'; ctx.lineWidth = 3;
        for (let s = 0; s < 4; s++) {
            const a = s * Math.PI / 4 + 0.3;
            ctx.beginPath(); ctx.moveTo(wx, oy + 30);
            ctx.lineTo(wx + Math.cos(a) * 20, oy + 30 + Math.sin(a) * 20); ctx.stroke();
        }
        ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(wx, oy + 30, 6, 0, Math.PI * 2); ctx.fill();
    });

    // barrel
    ctx.save();
    ctx.translate(ox + rx, oy + ry);
    ctx.rotate(st.cannonAngle);
    ctx.fillStyle = ssLg(ctx, -22, 0, 22, 0, [[0, '#1e293b'], [0.5, '#94a3b8'], [1, '#0f172a']]);
    ssRR(ctx, -22, -86, 44, 96, 10); ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
    // reinforcement bands
    ctx.fillStyle = '#334155';
    ctx.fillRect(-23, -64, 46, 7); ctx.fillRect(-23, -34, 46, 7);
    // muzzle
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.ellipse(0, -84, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, -84, 20, 8, 0, 0, Math.PI * 2); ctx.stroke();

    // muzzle flash at fire moment
    if (st.phase === 'firing' && st.flightProgress < 0.18) {
        const fl = (0.18 - st.flightProgress) / 0.18;
        ctx.fillStyle = ssRg(ctx, 0, -92, 4, 70 * fl + 20, [[0, 'rgba(255,255,255,0.95)'], [0.4, 'rgba(253,224,71,0.8)'], [1, 'rgba(249,115,22,0)']]);
        ctx.beginPath(); ctx.arc(0, -92, 70 * fl + 20, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // shell + smoke trail
    if (st.phase === 'firing') {
        SS.csSmoke.push({ x: st.shellX, y: st.shellY, life: 1 });
        ctx.save(); ctx.translate(st.shellX, st.shellY);
        ctx.fillStyle = ssRg(ctx, 0, 0, 4, 30, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(249,115,22,0.75)'], [1, 'rgba(239,68,68,0)']]);
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ssRg(ctx, -4, -5, 2, 14, [[0, '#64748b'], [1, '#0f172a']]);
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    SS.csSmoke.forEach(s => {
        s.life -= 0.045; s.y -= 0.6;
        ctx.fillStyle = `rgba(148,163,184,${Math.max(0, s.life) * 0.45})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 6 + (1 - s.life) * 12, 0, Math.PI * 2); ctx.fill();
    });
    SS.csSmoke = SS.csSmoke.filter(s => s.life > 0);
    if (st.phase === 'idle' || st.phase === 'done') SS.csSmoke = [];

    // explosion
    if (st.phase === 'exploding') {
        if (!SS.csShook) { SS.shake = 17; SS.csShook = true; }
        const target = st.crates[st.selectedIdx];
        if (target) {
            ctx.save(); ctx.translate(target.x, target.y);
            ctx.fillStyle = ssRg(ctx, 0, 0, 8, st.shockwaveR, [[0, '#ffffff'], [0.3, '#fde047'], [0.65, '#f97316'], [1, 'rgba(239,68,68,0)']]);
            ctx.beginPath(); ctx.arc(0, 0, st.shockwaveR, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(254,240,138,${Math.max(0, 1 - st.shockwaveR / 260)})`;
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0, 0, st.shockwaveR * 1.15, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        st.debris.forEach(d => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.translate(d.x, d.y); ctx.rotate(d.rot);
            ctx.fillStyle = d.color;
            ctx.fillRect(-8, -4, 16, 8);
            ctx.strokeStyle = 'rgba(69,26,3,0.6)'; ctx.lineWidth = 1;
            ctx.strokeRect(-8, -4, 16, 8);
            ctx.restore();
        });
    } else {
        SS.csShook = false;
    }
}

// ============================================================================
// MODE 8: BOMB TOSS ARENA — stadium night, smoke trail, blast + debris
// ============================================================================
function ssDrawBombArena(ctx, W, H) {
    const tm = ssTm();
    // night stadium
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#020617'], [0.5, '#0f172a'], [1, '#1e293b']]);
    ctx.fillRect(0, 0, W, H);
    // stars
    if (SS.quality === 'high') {
        for (let i = 0; i < 40; i++) {
            const sx = (i * 167.3) % W, sy = (i * 71.7) % (H * 0.4);
            ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.abs(Math.sin(tm * 0.05 + i))})`;
            ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
        }
    }
    // stadium light towers
    [[90, 1], [W - 90, -1]].forEach(([lx]) => {
        ctx.fillStyle = '#334155'; ctx.fillRect(lx - 5, 40, 10, 130);
        ctx.fillStyle = '#1e293b'; ssRR(ctx, lx - 34, 16, 68, 30, 8); ctx.fill();
        for (let b = 0; b < 4; b++) {
            ctx.fillStyle = '#fef9c3';
            ssSh(ctx, 12, '#fde047');
            ctx.beginPath(); ctx.arc(lx - 24 + b * 16, 31, 5.5, 0, Math.PI * 2); ctx.fill();
            ssNoSh(ctx);
        }
        ctx.save(); ctx.globalAlpha = 0.08;
        ctx.fillStyle = ssLg(ctx, 0, 46, 0, H * 0.7, [[0, '#fde047'], [1, 'rgba(253,224,71,0)']]);
        ctx.beginPath(); ctx.moveTo(lx - 30, 46); ctx.lineTo(lx + 160, H * 0.66); ctx.lineTo(lx - 160, H * 0.66); ctx.closePath(); ctx.fill();
        ctx.restore();
    });
    // crowd dots
    if (SS.quality === 'high') {
        const crowdCols = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];
        for (let i = 0; i < 90; i++) {
            const cx2 = (i * 43.7) % W;
            const cy2 = 96 + ((i * 29.3) % 56);
            ctx.fillStyle = crowdCols[i % 5];
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(cx2, cy2, 2.4, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    // arena floor
    ctx.fillStyle = ssRg(ctx, W / 2, H * 0.66, 60, 560, [[0, 'rgba(56,189,248,0.20)'], [1, 'rgba(56,189,248,0.02)']]);
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.66, 510, 185, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.66, 510, 185, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(56,189,248,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.66, 430, 150, 0, 0, Math.PI * 2); ctx.stroke();

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
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(0, 48, 38, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(torsoTilt);

        // body
        ctx.fillStyle = ssLg(ctx, 0, -18, 0, 40, [[0, ssHexCol(p.color, 1.3)], [1, ssHexCol(p.color, 0.75)]]);
        ssRR(ctx, -22, -18, 44, 58, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.stroke();
        // head
        ctx.fillStyle = ssRg(ctx, -6, -46, 4, 26, [[0, '#fef3c7'], [1, '#f59e0b']]);
        ctx.beginPath(); ctx.arc(0, -38, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        const eyeShift = isThrower ? dir * 4 : 0;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(-6 + eyeShift, -40, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6 + eyeShift, -40, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(eyeShift, -32, 6, 0.15, Math.PI - 0.15); ctx.stroke();

        // articulated arm
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
            ctx.beginPath(); ctx.moveTo(handX, handY);
            ctx.lineTo(handX + Math.cos(fAng) * 10, handY + Math.sin(fAng) * 10); ctx.stroke();
        }
        ctx.restore();

        if (isThrower && t < 0.28) {
            const cosT = Math.cos(torsoTilt), sinT = Math.sin(torsoTilt);
            bombX = p.x + (handX * cosT - handY * sinT);
            bombY = p.y + (handX * sinT + handY * cosT);
            bombRot = -t * 4;
        }

        ssNameTag(ctx, p.name, p.x, p.y + 56, idx === bombState.fromIdx ? '#dc2626' : 'rgba(15,23,42,0.88)');
    });

    // flight path + bomb
    if (!bombState.exploded && t >= 0.28) {
        const flightT = (t - 0.28) / 0.72;
        const startX = fromP.x, startY = fromP.y - 35;
        const endX = toP.x, endY = toP.y - 30;
        const arcHeight = 165 + Math.abs(endX - startX) * 0.18;
        bombX = startX + (endX - startX) * flightT;
        bombY = (startY + (endY - startY) * flightT) - Math.sin(flightT * Math.PI) * arcHeight;
        bombRot = flightT * Math.PI * 5;

        ctx.strokeStyle = 'rgba(253,224,71,0.30)';
        ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, Math.min(startY, endY) - arcHeight, endX, endY);
        ctx.stroke(); ctx.setLineDash([]);

        SS.btSmoke.push({ x: bombX, y: bombY, life: 1 });
    }
    SS.btSmoke.forEach(s => {
        s.life -= 0.05;
        ctx.fillStyle = `rgba(148,163,184,${Math.max(0, s.life) * 0.5})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 4 + (1 - s.life) * 9, 0, Math.PI * 2); ctx.fill();
    });
    SS.btSmoke = SS.btSmoke.filter(s => s.life > 0);
    if (!isStageRunning && !bombState.exploded) SS.btSmoke = [];

    if (!bombState.exploded) {
        ctx.save();
        ctx.translate(bombX, bombY); ctx.rotate(bombRot);
        ssSh(ctx, 14, 'rgba(249,115,22,0.7)');
        ctx.fillStyle = ssRg(ctx, -7, -7, 3, 24, [[0, '#475569'], [0.5, '#0f172a'], [1, '#020617']]);
        ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
        ssNoSh(ctx);
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(-5, -26, 10, 6);
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(10, -36, 16, -32); ctx.stroke();
        // fuse spark
        ctx.fillStyle = ssRg(ctx, 16, -32, 1, 14, [[0, '#ffffff'], [0.4, '#fde047'], [1, 'rgba(239,68,68,0)']]);
        ctx.beginPath(); ctx.arc(16, -32, 8 + Math.random() * 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        SS.btBoomDone = false;
    } else {
        if (!SS.btBoomDone) {
            SS.btBoomDone = true; SS.shake = 20; SS.btDebris = [];
            const exP0 = players[bombState.fromIdx];
            for (let i = 0; i < ssQ(30); i++) {
                const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
                SS.btDebris.push({ x: exP0.x, y: exP0.y - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 1, color: ['#fde047', '#f97316', '#ef4444', '#94a3b8'][i % 4] });
            }
        }
        const exP = players[bombState.fromIdx];
        ctx.save(); ctx.translate(exP.x, exP.y - 20);
        ctx.fillStyle = ssRg(ctx, 0, 0, 10, bombState.shockwaveR, [[0, '#ffffff'], [0.3, '#fde047'], [0.65, '#f97316'], [1, 'rgba(239,68,68,0)']]);
        ctx.beginPath(); ctx.arc(0, 0, bombState.shockwaveR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(253,224,71,${Math.max(0, 1 - bombState.shockwaveR / 240)})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(0, 0, bombState.shockwaveR * 1.12, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        SS.btDebris.forEach(d => {
            d.x += d.vx; d.y += d.vy; d.vy += 0.3; d.life -= 0.03;
            ctx.globalAlpha = Math.max(0, d.life);
            ctx.fillStyle = d.color;
            ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        });
        SS.btDebris = SS.btDebris.filter(d => d.life > 0);
    }
}
// ============================================================================
// NEW GAMES FRAMEWORK (modes 9-15): pre-picked winner, animated reveal
// ============================================================================
function ssShuffleArr(a) {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]]; }
    return r;
}
function ssCrownWinner(name, emoji, subtitle, banner) {
    isStageRunning = false;
    StudioAudioManager.stopAllActiveSounds();
    stagePickedWinner = name;
    appState.challenger = name;
    markStudentPicked(name);
    syncStudioData();
    renderAllDashboard();
    StudioAudioManager.playSFX('cheer');
    document.getElementById('stageWinnerBanner').textContent = banner;
    showWinnerPopup(emoji, subtitle, name);
}
function prepareStageEntities(modeId) {
    SS.raceDust = []; SS.csSmoke = []; SS.btSmoke = []; SS.btDebris = [];
    SS.csShook = false; SS.btBoomDone = false; SS.embers = [];
    if (modeId >= 9) { ssPrepareNew(modeId); return; }
    window._ssOrig.prepare(modeId);
}
function triggerActiveStageAnimation() {
    if (isStageRunning) return;
    if (getActiveStudents().length === 0) return alert("No students in current class!");
    if (activeStageMode >= 9) { ssRunNewMode(null); return; }
    window._ssOrig.trigger();
}
function ssRunNewMode(forcedName) {
    StudioAudioManager.stopAllActiveSounds();
    document.getElementById('stageWinnerOverlay').style.display = 'none';
    prepareStageEntities(activeStageMode);
    if (forcedName && ssG.names) {
        const fi = ssG.names.indexOf(forcedName);
        if (fi >= 0) ssG.winnerIdx = fi;
    }
    isStageRunning = true;
    stageTick = 0;
    document.getElementById('stageWinnerBanner').textContent = "🔥 Simulation Active...";
    StudioAudioManager.playSFX('select');
    function loop() {
        if (!isStageRunning) return;
        stageTick++;
        ssStepNew();
        if (!isStageRunning) return;
        drawStageFrame(false);
        stageAnimFrame = requestAnimationFrame(loop);
    }
    stageAnimFrame = requestAnimationFrame(loop);
}
function ssPrepareNew(modeId) {
    const pool = ssShuffleArr(getUnpickedPool(2));
    const counts = { 9: 10, 10: 12, 11: 6, 12: 12, 13: 8, 14: 6, 15: 8 };
    const cols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#f472b6', '#4ade80', '#fb923c', '#38bdf8'];
    const names = pool.slice(0, Math.min(counts[modeId] || 8, pool.length));
    stageTick = 0;
    ssG = { mode: modeId, names, winnerIdx: Math.floor(Math.random() * names.length), phase: 'idle', parts: [] };
    const W = 1280, H = 620;
    if (modeId === 9) {
        const n = names.length, cpr = Math.ceil(n / 2);
        ssG.items = names.map((nm, i) => {
            const r = Math.floor(i / cpr), c = i % cpr;
            return { name: nm, bx: W / 2 + (c - (cpr - 1) / 2) * Math.min(240, (W - 160) / cpr), by: 160 + r * 235, color: cols[i % cols.length], ph: Math.random() * 6.28, popped: false };
        });
        ssG.dart = { x: 70, y: H - 70, tx: 0, ty: 0 };
    } else if (modeId === 10) {
        ssG.reels = [{ off: Math.random() * names.length, stop: 55, lock: false }, { off: Math.random() * names.length, stop: 85, lock: false }, { off: Math.random() * names.length, stop: 115, lock: false }];
    } else if (modeId === 11) {
        ssG.track = 1500; ssG.cam = 0; ssG.smoke = [];
        ssG.items = names.map((nm, i) => ({ name: nm, color: cols[i % cols.length], prog: 0, speed: 0, x: 110 + i * ((W - 440 - 110) / Math.max(names.length - 1, 1)) }));
        ssG.items.forEach((r, i) => r.speed = (i === ssG.winnerIdx) ? 11.6 : 8.4 + Math.random() * 2.4);
    } else if (modeId === 12) {
        const cpr = 6;
        ssG.items = names.map((nm, i) => {
            const r = Math.floor(i / cpr), c = i % cpr;
            return { name: nm, x: 400 + c * 96 + (r ? 48 : 0), y: 452 + r * 72, color: cols[i % cols.length], grabbed: false };
        });
        ssG.claw = { x: 640, y: 96, grab: 0 };
    } else if (modeId === 13) {
        ssG.items = names.map((nm, i) => ({ name: nm, color: cols[i % cols.length], x: 120 + Math.random() * (W - 240), y: H * 0.5 + Math.random() * H * 0.34, dir: Math.random() < 0.5 ? -1 : 1, speed: 0.5 + Math.random() * 0.7, ph: Math.random() * 6.28 }));
        ssG.hook = { x: W * 0.5, y: 100 }; ssG.bubbles = [];
    } else if (modeId === 14) {
        ssG.items = names.map((nm, i) => ({ name: nm, x: 200 + i * ((W - 400) / Math.max(names.length - 1, 1)), y: H - 76, grabbed: false }));
        ssG.sub = { x: -120, y: 130, arm: 0 }; ssG.bubbles = [];
    } else if (modeId === 15) {
        ssG.items = names.map((nm, i) => ({ name: nm, color: cols[i % cols.length], x: 140 + i * ((W - 280) / Math.max(names.length - 1, 1)) + (Math.random() - 0.5) * 40, y: H - 96, ph: Math.random() * 6.28, lift: 0 }));
        ssG.ufo = { x: W * 0.5, y: 112, scanIdx: 0, gone: false };
    }
}
function ssStepNew() {
    const W = 1280, H = 620, g = ssG, t = stageTick;
    const winName = g.names[g.winnerIdx];
    if (g.mode === 9) {
        const bl = g.items[g.winnerIdx];
        if (t === 25) { g.phase = 'fly'; g.dart.tx = bl.bx; g.dart.ty = bl.by; StudioAudioManager.playArrowReleaseSound(); }
        if (g.phase === 'fly') {
            const p = Math.min(1, (t - 25) / 30);
            g.dart.x = 70 + (g.dart.tx - 70) * p;
            g.dart.y = (H - 70) + (g.dart.ty - (H - 70)) * p;
            if (p >= 1 && !bl.popped) {
                bl.popped = true; SS.shake = 7;
                StudioAudioManager.playArrowHitSound(); StudioAudioManager.playSFX('pop');
                for (let i = 0; i < ssQ(26); i++) {
                    const a = Math.random() * 6.28, sp = 2 + Math.random() * 5;
                    g.parts.push({ x: bl.bx, y: bl.by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: bl.color });
                }
            }
        }
        g.parts.forEach(p2 => { p2.x += p2.vx; p2.y += p2.vy; p2.vy += 0.18; p2.life -= 0.03; });
        g.parts = g.parts.filter(p2 => p2.life > 0);
        if (t >= 95) ssCrownWinner(winName, '🎈', 'BALLOON POP WINNER', `🎈 Popped! Winner: ${winName}!`);
    } else if (g.mode === 10) {
        g.reels.forEach((r, i) => {
            if (r.lock) return;
            if (t < r.stop) {
                const v = Math.max(0.14, 1.15 * (1 - t / r.stop));
                r.off += v;
                if (t % 6 === 0) StudioAudioManager.playSFX('click');
            } else {
                r.off = g.winnerIdx; r.lock = true;
                StudioAudioManager.playSFX('pop');
            }
        });
        if (t >= 140) ssCrownWinner(winName, '🎰', 'JACKPOT WINNER', `🎰 JACKPOT! Winner: ${winName}!`);
    } else if (g.mode === 11) {
        if (t > 25) {
            let leader = 0;
            g.items.forEach(r => { r.prog += r.speed; leader = Math.max(leader, r.prog); });
            const winR = g.items[g.winnerIdx];
            if (winR.prog < leader && leader >= g.track - 40) winR.prog = leader + 1;
            leader = Math.max(leader, winR.prog);
            g.cam = Math.max(0, leader - 380);
            if (SS.quality === 'high') g.items.forEach(r => {
                if (r.prog > 0 && Math.random() < 0.6) g.smoke.push({ x: r.x + (Math.random() - 0.5) * 8, p: r.prog - 30, life: 1 });
            });
            g.smoke.forEach(s => { s.life -= 0.03; s.p -= 1; });
            g.smoke = g.smoke.filter(s => s.life > 0);
            if (leader >= g.track) ssCrownWinner(winName, '🚀', 'ROCKET RACE CHAMPION', `🚀 First to the Moon: ${winName}!`);
        }
    } else if (g.mode === 12) {
        const cap = g.items[g.winnerIdx], c = g.claw;
        if (t < 55) { c.x += (cap.x - c.x) * 0.09; }
        else if (t < 95) { c.y += ((cap.y - 24) - c.y) * 0.10; }
        else if (t < 110) { c.grab = Math.min(1, c.grab + 0.12); if (c.grab >= 1 && !cap.grabbed) { cap.grabbed = true; StudioAudioManager.playSFX('pop'); } }
        else if (t < 145) { c.y += (110 - c.y) * 0.10; if (cap.grabbed) { cap.x = c.x; cap.y = c.y + 34; } }
        else if (t < 185) { c.x += (300 - c.x) * 0.10; if (cap.grabbed) { cap.x = c.x; cap.y = c.y + 34; } }
        else if (t === 185) { c.grab = 0; cap.grabbed = false; cap.drop = true; StudioAudioManager.playSFX('pop'); }
        if (cap.drop) { cap.y = Math.min(560, cap.y + 9); }
        if (t % 8 === 0 && t < 185) StudioAudioManager.playSFX('click');
        if (t >= 200) ssCrownWinner(winName, '🕹️', 'CLAW MACHINE WINNER', `🕹️ Claw grabbed: ${winName}!`);
    } else if (g.mode === 13) {
        const fish = g.items[g.winnerIdx], hk = g.hook;
        if (t < 50) { hk.x += (fish.x - hk.x) * 0.08; }
        else if (t < 95) { hk.y += ((fish.y - 6) - hk.y) * 0.09; fish.speed = 0.15; }
        else if (t === 95) {
            StudioAudioManager.playSFX('pop');
            for (let i = 0; i < ssQ(16); i++) g.parts.push({ x: fish.x, y: fish.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 1, color: '#e0f2fe' });
        }
        else if (t < 140) { hk.y += (110 - hk.y) * 0.09; fish.x = hk.x; fish.y = hk.y + 8; fish.dir = 0; }
        g.parts.forEach(p2 => { p2.x += p2.vx; p2.y += p2.vy; p2.vy += 0.25; p2.life -= 0.04; });
        g.parts = g.parts.filter(p2 => p2.life > 0);
        if (t >= 145) ssCrownWinner(winName, '🎣', 'FISHING WINNER', `🎣 Caught! Winner: ${winName}!`);
    } else if (g.mode === 14) {
        const ch = g.items[g.winnerIdx], sb = g.sub;
        if (t < 40) { sb.x += ((ch.x - 30) - sb.x) * 0.07; sb.y += (180 - sb.y) * 0.05; }
        else if (t < 85) { sb.y += ((H - 190) - sb.y) * 0.08; sb.x += ((ch.x - 30) - sb.x) * 0.1; }
        else if (t < 100) { sb.arm = Math.min(1, sb.arm + 0.12); if (sb.arm >= 1 && !ch.grabbed) { ch.grabbed = true; StudioAudioManager.playSFX('pop'); } }
        else if (t < 145) { sb.y += (130 - sb.y) * 0.08; if (ch.grabbed) { ch.x = sb.x + 30; ch.y = sb.y + 58; } }
        if (SS.quality === 'high' && Math.random() < 0.4) g.bubbles.push({ x: sb.x - 40, y: sb.y + 6, vy: 0.8 + Math.random(), r: 2 + Math.random() * 3, life: 1 });
        g.bubbles.forEach(b => { b.y -= b.vy; b.life -= 0.008; });
        g.bubbles = g.bubbles.filter(b => b.life > 0 && b.y > 20);
        if (t >= 150) ssCrownWinner(winName, '⚓', 'TREASURE DIVE WINNER', `💰 Treasure found: ${winName}!`);
    } else if (g.mode === 15) {
        const per = g.items[g.winnerIdx], u = g.ufo;
        if (t < 70) {
            if (t % 8 === 0) { u.scanIdx = Math.floor(Math.random() * g.items.length); StudioAudioManager.playSFX('click'); }
            const tgt = g.items[u.scanIdx];
            u.x += (tgt.x - u.x) * 0.14;
        } else if (t < 110) {
            u.scanIdx = g.winnerIdx;
            u.x += (per.x - u.x) * 0.12;
        } else if (t < 150) {
            per.lift = Math.min(1, per.lift + 0.03);
            if (t === 115) StudioAudioManager.playSFX('whoosh');
        } else if (t < 170) {
            u.gone = true; u.y -= 22; u.x += 6;
        }
        if (t >= 172) ssCrownWinner(winName, '🛸', 'ABDUCTED BY UFO', `🛸 Beam chose: ${winName}!`);
    }
}
// ============================================================================
// NEW GAMES RENDERING (modes 9-15)
// ============================================================================
function ssDrawBalloons(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#7dd3fc'], [0.6, '#bae6fd'], [1, '#e0f2fe']]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = ssRg(ctx, 120, 70, 8, 70, [[0, 'rgba(254,249,195,1)'], [1, 'rgba(253,224,71,0)']]);
    ctx.beginPath(); ctx.arc(120, 70, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(120, 70, 30, 0, Math.PI * 2); ctx.fill();
    ssCloud(ctx, ((tm * 0.3 + 420) % (W + 240)) - 120, 80, 0.9, 0.85);
    ssCloud(ctx, ((tm * 0.2 + 1000) % (W + 240)) - 120, 150, 0.65, 0.7);
    ctx.fillStyle = ssLg(ctx, 0, H - 120, 0, H, [[0, '#4ade80'], [1, '#16a34a']]);
    ctx.fillRect(0, H - 120, W, 120);
    ssTree(ctx, 70, H - 100, 1.1); ssTree(ctx, W - 80, H - 96, 0.9);

    g.items.forEach((b, i) => {
        if (b.popped) return;
        const bx = b.bx + Math.sin(tm * 0.05 + b.ph) * 7;
        const by = b.by + Math.sin(tm * 0.07 + b.ph * 2) * 10;
        b.cx = bx; b.cy = by;
        // string
        ctx.strokeStyle = 'rgba(71,85,105,0.7)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(bx, by + 52);
        ctx.quadraticCurveTo(bx + 8, by + 74, bx, by + 96); ctx.stroke();
        // balloon
        ssSh(ctx, 10, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = ssRg(ctx, bx - 14, by - 20, 6, 56, [[0, ssHexCol(b.color, 1.5)], [0.5, b.color], [1, ssHexCol(b.color, 0.65)]]);
        ctx.beginPath(); ctx.ellipse(bx, by, 44, 52, 0, 0, Math.PI * 2); ctx.fill();
        ssNoSh(ctx);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.ellipse(bx - 15, by - 20, 11, 17, -0.4, 0, Math.PI * 2); ctx.fill();
        // knot
        ctx.fillStyle = ssHexCol(b.color, 0.7);
        ctx.beginPath(); ctx.moveTo(bx - 6, by + 50); ctx.lineTo(bx + 6, by + 50); ctx.lineTo(bx, by + 60); ctx.closePath(); ctx.fill();
        // name tag on string
        ssNameTag(ctx, b.name, bx, by + 96, 'rgba(15,23,42,0.82)');
    });

    // dart
    if (g.phase === 'fly' || (isStageRunning && stageTick < 25)) {
        const d = g.dart;
        const a = Math.atan2(d.ty - (H - 70), d.tx - 70);
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(isStageRunning && stageTick >= 25 ? a : -0.9);
        ctx.fillStyle = '#475569'; ctx.fillRect(-24, -3, 44, 6);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.moveTo(20, -6); ctx.lineTo(34, 0); ctx.lineTo(20, 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-36, -9); ctx.lineTo(-31, 0); ctx.lineTo(-36, 9); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    // pop particles
    g.parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    });
}

function ssDrawSlots(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    ctx.fillStyle = ssRg(ctx, W / 2, H / 2, 80, 760, [[0, '#991b1b'], [0.6, '#7f1d1d'], [1, '#450a0a']]);
    ctx.fillRect(0, 0, W, H);
    // bg bulbs
    for (let i = 0; i < 26; i++) {
        const bx = (i * 101.3) % W, by = (i * 61.7) % H;
        const on = (i + Math.floor(tm * 0.1)) % 2 === 0;
        ctx.fillStyle = on ? 'rgba(253,224,71,0.5)' : 'rgba(253,224,71,0.15)';
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
    }
    const mx = W / 2, my = H / 2;
    // machine body
    ssSh(ctx, 30, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = ssLg(ctx, mx - 330, my - 250, mx + 330, my + 250, [[0, '#fde047'], [0.5, '#f59e0b'], [1, '#b45309']]);
    ssRR(ctx, mx - 330, my - 250, 660, 500, 36); ctx.fill();
    ssNoSh(ctx);
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 5;
    ssRR(ctx, mx - 330, my - 250, 660, 500, 36); ctx.stroke();
    // header sign
    const flash = g.reels.every(r => r.lock) ? (Math.floor(tm * 0.15) % 2 === 0) : true;
    ctx.fillStyle = flash ? '#dc2626' : '#7f1d1d';
    ssRR(ctx, mx - 190, my - 232, 380, 62, 18); ctx.fill();
    ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.fillStyle = '#fef9c3'; ctx.font = '900 34px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🎰 JACKPOT', mx, my - 189);

    // reels windows
    const n = g.names.length;
    g.reels.forEach((r, i) => {
        const wx = mx - 250 + i * 175, wy = my - 20;
        ctx.fillStyle = '#0f172a';
        ssRR(ctx, wx - 80, wy - 100, 160, 200, 16); ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
        ssRR(ctx, wx - 80, wy - 100, 160, 200, 16); ctx.stroke();
        ctx.save();
        ssRR(ctx, wx - 76, wy - 96, 152, 192, 12); ctx.clip();
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(wx - 76, wy - 96, 152, 192);
        const frac = r.off - Math.floor(r.off);
        for (let j = -2; j <= 2; j++) {
            const idx = ((Math.floor(r.off) + j) % n + n) % n;
            const ny = wy + (j - frac) * 66;
            const dist = Math.abs(j - frac);
            ctx.globalAlpha = Math.max(0.15, 1 - dist * 0.42);
            ctx.fillStyle = dist < 0.5 ? '#b91c1c' : '#64748b';
            ctx.font = `900 ${dist < 0.5 ? 19 : 15}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            const nm = g.names[idx].length > 14 ? g.names[idx].slice(0, 13) + '…' : g.names[idx];
            ctx.fillText(nm, wx, ny + 6);
        }
        ctx.globalAlpha = 1;
        // top/bottom fade
        ctx.fillStyle = ssLg(ctx, 0, wy - 96, 0, wy - 40, [[0, 'rgba(248,250,252,1)'], [1, 'rgba(248,250,252,0)']]);
        ctx.fillRect(wx - 76, wy - 96, 152, 56);
        ctx.fillStyle = ssLg(ctx, 0, wy + 40, 0, wy + 96, [[0, 'rgba(248,250,252,0)'], [1, 'rgba(248,250,252,1)']]);
        ctx.fillRect(wx - 76, wy + 40, 152, 56);
        ctx.restore();
        // center line
        ctx.strokeStyle = 'rgba(220,38,38,0.55)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(wx - 80, wy); ctx.lineTo(wx + 80, wy); ctx.stroke();
        if (r.lock) {
            ctx.fillStyle = `rgba(253,224,71,${0.25 + 0.2 * Math.sin(tm * 0.3)})`;
            ssRR(ctx, wx - 80, wy - 100, 160, 200, 16); ctx.fill();
        }
    });
    // lever
    const pull = isStageRunning ? Math.max(0, 1 - stageTick / 22) : 0;
    ctx.save(); ctx.translate(mx + 352, my - 130); ctx.rotate(pull * 1.5);
    ctx.fillStyle = '#94a3b8'; ssRR(ctx, -7, -6, 14, 130, 7); ctx.fill();
    ctx.fillStyle = ssRg(ctx, -6, -18, 4, 24, [[0, '#fca5a5'], [1, '#b91c1c']]);
    ctx.beginPath(); ctx.arc(0, -16, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // base text
    ctx.fillStyle = '#fef3c7'; ctx.font = '800 15px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(g.reels.every(r => r.lock) ? '🎉 THREE OF A KIND — WINNER!' : 'MATCH THE NAME TO WIN', mx, my + 226);
}

// v4: whole-track progress rail + live standings so students see how close every rocket is to the finish
function ssRocketHud(ctx, W, H, g) {
    const items = g.items; if (!items || !items.length) return;
    const T = g.track;
    const px = W - 292, pw = 280, py = 12, ph = H - 24;
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.72)'; ssRR(ctx, px, py, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ssRR(ctx, px, py, pw, ph, 14); ctx.stroke();
    // rail
    const rx = px + pw - 30, rTop = py + 54, rBot = py + ph - 26;
    ctx.fillStyle = 'rgba(148,163,184,0.35)'; ctx.fillRect(rx - 3, rTop, 6, rBot - rTop);
    const lead = Math.max(...items.map(r => r.prog));
    ctx.fillStyle = '#fde047'; ctx.fillRect(rx - 3, rBot - (Math.min(lead, T) / T) * (rBot - rTop), 6, (Math.min(lead, T) / T) * (rBot - rTop));
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#f8fafc' : '#0f172a'; ctx.fillRect(rx - 24 + i * 4, rTop - 6, 4, 8); }
    ctx.fillStyle = '#fde047'; ctx.font = '900 13px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('🏁 FINISH', rx + 24, rTop - 14);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '800 11px "Plus Jakarta Sans", sans-serif'; ctx.fillText('START', rx + 24, rBot + 18);
    items.forEach(r => {
        const y = rBot - (Math.min(r.prog, T) / T) * (rBot - rTop);
        ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(rx, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    // standings
    const order = items.map((r, i) => ({ r, i })).sort((a, b) => b.r.prog - a.r.prog);
    ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8'; ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('LIVE STANDINGS  •  distance to finish', px + 14, py + 26);
    const rowH = Math.min(40, (ph - 90) / order.length);
    order.forEach((o, k) => {
        const y = py + 52 + k * rowH;
        ctx.fillStyle = '#fde047'; ctx.font = '900 17px "Plus Jakarta Sans", sans-serif'; ctx.fillText((k + 1) + '.', px + 14, y + 14);
        ctx.fillStyle = o.r.color; ctx.beginPath(); ctx.arc(px + 48, y + 9, 7, 0, Math.PI * 2); ctx.fill();
        let fs = 16; ctx.font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`;
        while (ctx.measureText(o.r.name).width > 150 && fs > 10) { fs--; ctx.font = `900 ${fs}px "Plus Jakarta Sans", "Cairo", sans-serif`; }
        ctx.fillStyle = '#fff'; ctx.fillText(o.r.name, px + 62, y + 13);
        const left = Math.max(0, Math.round((1 - Math.min(o.r.prog, T) / T) * 100));
        ctx.fillStyle = left === 0 ? '#4ade80' : '#94a3b8'; ctx.font = '800 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(left === 0 ? 'FINISHED' : left + '% to go', px + 62, y + 28);
    });
    ctx.restore();
}
function ssDrawRockets(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    const cam = g.cam || 0;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#1e1b4b'], [0.5, '#0c0a2e'], [1, '#020617']]);
    ctx.fillRect(0, 0, W, H);
    // star layers (parallax with camera)
    [[0.15, 1.2, 90], [0.4, 1.8, 60], [0.7, 2.6, 40]].forEach(([f, sz, cnt], li) => {
        for (let i = 0; i < cnt; i++) {
            const sx = (i * 173.3 + li * 61) % W;
            let sy = ((i * 97.7 + li * 133) - cam * f) % H;
            if (sy < 0) sy += H;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.4 * Math.abs(Math.sin(tm * 0.05 + i))})`;
            ctx.beginPath(); ctx.arc(sx, sy, sz * 0.6, 0, Math.PI * 2); ctx.fill();
        }
    });
    // planet mid-way
    const plY = 560 - (750 - cam);
    if (plY > -160 && plY < H + 160) {
        ctx.fillStyle = ssRg(ctx, 1080, plY, 20, 110, [[0, '#fdba74'], [1, '#c2410c']]);
        ctx.beginPath(); ctx.arc(1080, plY, 84, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(253,186,116,0.6)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.ellipse(1080, plY, 130, 30, -0.35, 0, Math.PI * 2); ctx.stroke();
    }
    // moon at finish
    const moonY = 560 - (g.track + 170 - cam);
    if (moonY < H + 200) {
        ctx.fillStyle = ssRg(ctx, W / 2, moonY, 30, 170, [[0, '#fef9c3'], [0.7, '#fde68a'], [1, 'rgba(253,230,138,0)']]);
        ctx.beginPath(); ctx.arc(W / 2, moonY, 170, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(W / 2, moonY, 105, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e7d9b8';
        [[-30, -20, 16], [26, 14, 22], [-6, 40, 12], [40, -36, 12]].forEach(([dx, dy, r]) => {
            ctx.beginPath(); ctx.arc(W / 2 + dx, moonY + dy, r, 0, Math.PI * 2); ctx.fill();
        });
    }
    // finish ring
    const finY = 560 - (g.track - cam);
    if (finY > -20 && finY < H + 20) {
        for (let i = 0; i < 32; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#0f172a';
            ctx.fillRect(i * (W / 32), finY - 8, W / 32, 16);
        }
    }
    // launch pad glow
    const padY = 560 + cam;
    if (padY < H + 100) {
        ctx.fillStyle = ssRg(ctx, W / 2, padY + 30, 40, 560, [[0, 'rgba(99,102,241,0.4)'], [1, 'rgba(99,102,241,0)']]);
        ctx.beginPath(); ctx.ellipse(W / 2, padY + 30, 560, 60, 0, 0, Math.PI * 2); ctx.fill();
    }
    // smoke
    g.smoke.forEach(s => {
        const sy = 560 - (s.p - cam);
        ctx.fillStyle = `rgba(148,163,184,${Math.max(0, s.life) * 0.4})`;
        ctx.beginPath(); ctx.arc(s.x, sy, 5 + (1 - s.life) * 14, 0, Math.PI * 2); ctx.fill();
    });
    // rockets
    const launched = isStageRunning && stageTick > 25;
    g.items.forEach((r, i) => {
        const ry = 560 - (r.prog - cam);
        if (ry < -140 || ry > H + 140) return;
        ctx.save(); ctx.translate(r.x, ry);
        if (launched) ctx.rotate(Math.sin(tm * 0.3 + i) * 0.02);
        // flame
        if (launched) {
            const fl = 26 + Math.random() * 22;
            ctx.fillStyle = ssLg(ctx, 0, 30, 0, 30 + fl + 14, [[0, '#fde047'], [0.5, '#f97316'], [1, 'rgba(239,68,68,0)']]);
            ctx.beginPath(); ctx.moveTo(-9, 28); ctx.quadraticCurveTo(0, 30 + fl + 14, 9, 28); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fef9c3';
            ctx.beginPath(); ctx.moveTo(-4, 28); ctx.quadraticCurveTo(0, 30 + fl * 0.55, 4, 28); ctx.closePath(); ctx.fill();
        }
        // body
        ssSh(ctx, 14, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = ssLg(ctx, -16, 0, 16, 0, [[0, '#f8fafc'], [0.5, '#cbd5e1'], [1, '#64748b']]);
        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.quadraticCurveTo(15, -26, 15, 6);
        ctx.lineTo(15, 26); ctx.lineTo(-15, 26); ctx.lineTo(-15, 6);
        ctx.quadraticCurveTo(-15, -26, 0, -52);
        ctx.fill(); ssNoSh(ctx);
        // nose + fins
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.moveTo(0, -52); ctx.quadraticCurveTo(11, -33, 13, -20); ctx.lineTo(-13, -20); ctx.quadraticCurveTo(-11, -33, 0, -52); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-15, 8); ctx.lineTo(-28, 30); ctx.lineTo(-15, 26); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(28, 30); ctx.lineTo(15, 26); ctx.closePath(); ctx.fill();
        // window
        ctx.fillStyle = ssRg(ctx, -2, -8, 2, 10, [[0, '#bae6fd'], [1, '#0369a1']]);
        ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        ssNameTag(ctx, r.name, r.x, ry + 40, 'rgba(15,23,42,0.85)');
    });
    ssRocketHud(ctx, W, H, g);
    // countdown
    if (isStageRunning && stageTick <= 25) {
        ctx.fillStyle = 'rgba(2,6,23,0.55)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fde047'; ctx.font = '900 84px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
        const cd = stageTick < 9 ? '3' : stageTick < 17 ? '2' : stageTick < 25 ? '1' : 'GO!';
        ssSh(ctx, 26, '#f59e0b');
        ctx.fillText(cd, W / 2, H / 2 + 28);
        ssNoSh(ctx);
    }
}

function ssDrawClaw(ctx, W, H) {
    const tm = ssTm(), g = ssG, c = g.claw;
    ctx.fillStyle = ssRg(ctx, W / 2, H / 2, 80, 760, [[0, '#155e75'], [0.6, '#164e63'], [1, '#082f3f']]);
    ctx.fillRect(0, 0, W, H);
    // machine frame
    const fx = 250, fy = 50, fw = 780, fh = 520;
    ssSh(ctx, 30, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = ssLg(ctx, fx, fy, fx, fy + fh, [[0, '#0ea5e9'], [1, '#0369a1']]);
    ssRR(ctx, fx - 18, fy - 18, fw + 36, fh + 36, 26); ctx.fill();
    ssNoSh(ctx);
    // glass
    ctx.fillStyle = ssLg(ctx, 0, fy, 0, fy + fh, [[0, 'rgba(224,242,254,0.16)'], [0.5, 'rgba(186,230,253,0.07)'], [1, 'rgba(125,211,252,0.14)']]);
    ssRR(ctx, fx, fy, fw, fh, 16); ctx.fill();
    // header
    ctx.fillStyle = '#0c4a6e'; ssRR(ctx, fx - 18, fy - 58, fw + 36, 46, 14); ctx.fill();
    ctx.fillStyle = '#e0f2fe'; ctx.font = '900 24px "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🕹️ PRIZE CLAW — PICK THE WINNER', fx + fw / 2, fy - 27);
    // chute
    ctx.fillStyle = '#082f3f'; ssRR(ctx, fx + 14, fy + fh - 90, 120, 90, 10); ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#7dd3fc'; ctx.font = '900 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PRIZE', fx + 74, fy + fh - 40);
    // rail
    ctx.fillStyle = '#334155'; ssRR(ctx, fx + 20, fy + 26, fw - 40, 14, 7); ctx.fill();
    // capsules
    g.items.forEach(cp => {
        if (cp.grabbed) return;
        ctx.save(); ctx.translate(cp.x, cp.y);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(0, 30, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
        ssSh(ctx, 8, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = ssHexCol(cp.color, 1.25);
        ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI, 0); ctx.fill();
        ctx.fillStyle = ssHexCol(cp.color, 0.75);
        ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI); ctx.fill();
        ssNoSh(ctx);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(-27, -3, 54, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(-9, -13, 8, 5, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ssNameTag(ctx, cp.name, cp.x, cp.y + 34, 'rgba(8,47,63,0.9)');
    });
    // claw carriage + cable
    const railY = fy + 33;
    ctx.fillStyle = '#64748b'; ssRR(ctx, c.x - 26, railY - 12, 52, 24, 8); ctx.fill();
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(c.x, railY + 12); ctx.lineTo(c.x, c.y); ctx.stroke();
    // claw head + prongs
    ctx.save(); ctx.translate(c.x, c.y);
    ctx.fillStyle = ssLg(ctx, -16, 0, 16, 0, [[0, '#e2e8f0'], [1, '#64748b']]);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
    const openA = 0.85 - c.grab * 0.55;
    for (let p = -1; p <= 1; p++) {
        const a = Math.PI / 2 + p * openA;
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const jx = Math.cos(a) * 22, jy = Math.sin(a) * 22 + 6;
        ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(jx, jy);
        ctx.lineTo(jx + Math.cos(a + (p === 0 ? 0 : -p * 0.5)) * 14, jy + 13);
        ctx.stroke();
    }
    ctx.restore();
    // grabbed capsule
    const winCap = g.items[g.winnerIdx];
    if (winCap && (winCap.grabbed || winCap.drop)) {
        ctx.save(); ctx.translate(winCap.x, winCap.y);
        ssSh(ctx, 12, 'rgba(253,224,71,0.7)');
        ctx.fillStyle = ssHexCol(winCap.color, 1.25);
        ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI, 0); ctx.fill();
        ctx.fillStyle = ssHexCol(winCap.color, 0.75);
        ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI); ctx.fill();
        ssNoSh(ctx);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(-27, -3, 54, 6);
        ctx.restore();
        ssNameTag(ctx, winCap.name, winCap.x, winCap.y + 34, '#b45309');
    }
    // glass reflection
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(fx + 60, fy); ctx.lineTo(fx + 210, fy); ctx.lineTo(fx + 90, fy + fh); ctx.lineTo(fx - 30, fy + fh);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + 260, fy); ctx.lineTo(fx + 320, fy); ctx.lineTo(fx + 200, fy + fh); ctx.lineTo(fx + 150, fy + fh);
    ctx.closePath(); ctx.fill(); ctx.restore();
}

function ssDrawFishing(ctx, W, H) {
    const tm = ssTm(), g = ssG;
    const waterY = H * 0.40;
    // sky
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, waterY, [[0, '#38bdf8'], [1, '#e0f2fe']]);
    ctx.fillRect(0, 0, W, waterY);
    ctx.fillStyle = ssRg(ctx, W - 140, 60, 8, 70, [[0, 'rgba(254,249,195,1)'], [1, 'rgba(253,224,71,0)']]);
    ctx.beginPath(); ctx.arc(W - 140, 60, 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(W - 140, 60, 30, 0, Math.PI * 2); ctx.fill();
    ssCloud(ctx, ((tm * 0.3 + 300) % (W + 240)) - 120, 60, 0.8, 0.9);
    // underwater
    ctx.fillStyle = ssLg(ctx, 0, waterY, 0, H, [[0, '#38bdf8'], [0.4, '#0284c7'], [1, '#0c4a6e']]);
    ctx.fillRect(0, waterY, W, H - waterY);
    // light rays
    if (SS.quality === 'high') {
        ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#e0f2fe';
        for (let i = 0; i < 5; i++) {
            const rx = 200 + i * 220 + Math.sin(tm * 0.01 + i) * 30;
            ctx.beginPath(); ctx.moveTo(rx, waterY); ctx.lineTo(rx + 90, H); ctx.lineTo(rx - 40, H); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    // sandy bed
    ctx.fillStyle = ssLg(ctx, 0, H - 46, 0, H, [[0, '#e7c98f'], [1, '#c9a86a']]);
    ctx.beginPath(); ctx.moveTo(0, H - 30);
    for (let x = 0; x <= W; x += 80) ctx.quadraticCurveTo(x + 40, H - 48 - Math.sin(x * 0.02) * 10, x + 80, H - 30);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // seaweed
    for (let i = 0; i < 7; i++) {
        const sx = 90 + i * 190;
        const sway = Math.sin(tm * 0.04 + i) * 8;
        ctx.strokeStyle = i % 2 ? '#15803d' : '#16a34a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, H - 34);
        ctx.quadraticCurveTo(sx + sway, H - 80, sx + sway * 1.6, H - 118); ctx.stroke();
    }
    // fish
    g.items.forEach((f, i) => {
        if (f.dir !== 0 && !(isStageRunning && i === g.winnerIdx && stageTick >= 95)) {
            f.x += f.dir * f.speed;
            if (f.x < 90) { f.x = 90; f.dir = 1; }
            if (f.x > W - 90) { f.x = W - 90; f.dir = -1; }
        }
        const fy = f.y + Math.sin(tm * 0.06 + f.ph) * 6;
        f.cy = fy;
        const dir = f.dir >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(f.x, fy); ctx.scale(dir, 1);
        ctx.fillStyle = ssRg(ctx, -6, -8, 4, 34, [[0, ssHexCol(f.color, 1.4)], [1, ssHexCol(f.color, 0.7)]]);
        ctx.beginPath(); ctx.ellipse(0, 0, 34, 17, 0, 0, Math.PI * 2); ctx.fill();
        const tailW = Math.sin(tm * 0.35 + i) * 4;
        ctx.fillStyle = ssHexCol(f.color, 0.85);
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-48, -13 + tailW); ctx.lineTo(-48, 13 + tailW); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(10, -26); ctx.lineTo(16, -13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(17, -4, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(18.5, -4, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ssNameTag(ctx, f.name, f.x, fy + 26, 'rgba(12,74,110,0.88)');
    });
    // splash parts
    g.parts.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    });
    // water surface waves
    ctx.strokeStyle = 'rgba(224,242,254,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) {
        const y = waterY + Math.sin(x * 0.03 + tm * 0.08) * 4;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // boat + fisherman + rod
    const boatX = 130;
    ctx.fillStyle = '#78350f';
    ctx.beginPath(); ctx.moveTo(boatX - 90, waterY - 4); ctx.lineTo(boatX + 90, waterY - 4); ctx.lineTo(boatX + 60, waterY + 26); ctx.lineTo(boatX - 60, waterY + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#92400e'; ctx.fillRect(boatX - 90, waterY - 8, 180, 8);
    // fisherman silhouette
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(boatX + 20, waterY - 42, 11, 0, Math.PI * 2); ctx.fill();
    ssRR(ctx, boatX + 8, waterY - 34, 24, 30, 8); ctx.fill();
    // rod line to hook
    const hk = g.hook;
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(boatX + 30, waterY - 44); ctx.lineTo(boatX + 128, waterY - 78); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(boatX + 128, waterY - 78); ctx.quadraticCurveTo((boatX + 128 + hk.x) / 2, waterY - 30, hk.x, hk.y); ctx.stroke();
    // bobber + hook
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(hk.x, hk.y, 7, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(hk.x, hk.y, 7, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hk.x, hk.y + 6); ctx.lineTo(hk.x, hk.y + 16); ctx.arc(hk.x + 5, hk.y + 16, 5, Math.PI, Math.PI * 1.7); ctx.stroke();
}

function ssDrawDive(ctx, W, H) {
    const tm = ssTm(), g = ssG, sb = g.sub;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#0ea5e9'], [0.45, '#0369a1'], [1, '#082f49']]);
    ctx.fillRect(0, 0, W, H);
    // light rays
    ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = '#e0f2fe';
    for (let i = 0; i < 6; i++) {
        const rx = 120 + i * 210 + Math.sin(tm * 0.012 + i * 1.7) * 40;
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 130, H); ctx.lineTo(rx + 30, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // sand
    ctx.fillStyle = ssLg(ctx, 0, H - 60, 0, H, [[0, '#e7c98f'], [1, '#b8935a']]);
    ctx.beginPath(); ctx.moveTo(0, H - 40);
    for (let x = 0; x <= W; x += 100) ctx.quadraticCurveTo(x + 50, H - 62 - Math.sin(x * 0.017) * 12, x + 100, H - 40);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // rocks + seaweed
    ctx.fillStyle = '#8a7350';
    [[120, H - 46, 26], [W - 180, H - 50, 34], [W / 2 + 260, H - 42, 20]].forEach(([rx, ry, rr]) => {
        ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    });
    for (let i = 0; i < 6; i++) {
        const sx = 200 + i * 190, sway = Math.sin(tm * 0.045 + i) * 9;
        ctx.strokeStyle = i % 2 ? '#059669' : '#10b981'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, H - 48);
        ctx.quadraticCurveTo(sx + sway, H - 96, sx + sway * 1.7, H - 132); ctx.stroke();
    }
    // treasure chests
    g.items.forEach(ch => {
        if (ch.grabbed) return;
        ssDrawChest(ctx, ch.x, ch.y, false);
        ssNameTag(ctx, ch.name, ch.x, ch.y + 26, 'rgba(69,26,3,0.9)');
    });
    const winCh = g.items[g.winnerIdx];
    if (winCh && winCh.grabbed) {
        ssDrawChest(ctx, winCh.x, winCh.y, true);
        ssNameTag(ctx, winCh.name, winCh.x, winCh.y + 26, '#b45309');
    }
    // bubbles
    g.bubbles.forEach(b => {
        ctx.strokeStyle = `rgba(224,242,254,${Math.max(0, b.life) * 0.7})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    });
    // submarine
    ctx.save(); ctx.translate(sb.x, sb.y);
    // propeller
    const propA = tm * (isStageRunning ? 0.7 : 0.15);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
        const a = propA + b * Math.PI * 2 / 3;
        ctx.beginPath(); ctx.moveTo(-72, 0); ctx.lineTo(-72 - Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke();
    }
    // hull
    ssSh(ctx, 16, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = ssLg(ctx, 0, -30, 0, 30, [[0, '#fde047'], [0.55, '#f59e0b'], [1, '#b45309']]);
    ctx.beginPath(); ctx.ellipse(0, 0, 74, 30, 0, 0, Math.PI * 2); ctx.fill();
    ssNoSh(ctx);
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2.5; ctx.stroke();
    // tower
    ctx.fillStyle = '#f59e0b'; ssRR(ctx, -18, -50, 36, 26, 8); ctx.fill();
    ctx.strokeStyle = '#92400e'; ctx.stroke();
    ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -62); ctx.stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(0, -64, 4, 0, Math.PI * 2); ctx.fill();
    // portholes
    [-38, 0, 38].forEach(px => {
        ctx.fillStyle = ssRg(ctx, px - 2, -3, 2, 10, [[0, '#bae6fd'], [1, '#0369a1']]);
        ctx.beginPath(); ctx.arc(px, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 3; ctx.stroke();
    });
    // headlight beam
    ctx.save(); ctx.globalAlpha = 0.13;
    ctx.fillStyle = ssLg(ctx, 70, 0, 330, 0, [[0, '#fef9c3'], [1, 'rgba(254,249,195,0)']]);
    ctx.beginPath(); ctx.moveTo(70, -8); ctx.lineTo(330, -60); ctx.lineTo(330, 60); ctx.lineTo(70, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    // grab arm
    if (sb.arm > 0) {
        const ax = 30, ay = 26, alen = 40 * sb.arm;
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + alen); ctx.stroke();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(ax, ay + alen); ctx.lineTo(ax - 9, ay + alen + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay + alen); ctx.lineTo(ax + 9, ay + alen + 10); ctx.stroke();
    }
    ctx.restore();
}
function ssDrawChest(ctx, x, y, glow) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 20, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (glow) ssSh(ctx, 22, '#fde047');
    ctx.fillStyle = ssLg(ctx, 0, -28, 0, 18, [[0, '#b45309'], [1, '#78350f']]);
    ssRR(ctx, -42, -26, 84, 44, 7); ctx.fill();
    ssNoSh(ctx);
    ctx.fillStyle = ssLg(ctx, 0, -44, 0, -22, [[0, '#d97706'], [1, '#92400e']]);
    ctx.beginPath(); ctx.moveTo(-42, -22); ctx.quadraticCurveTo(0, -56, 42, -22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2.5;
    ssRR(ctx, -42, -26, 84, 44, 7); ctx.stroke();
    // gold bands + lock
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-42, -27, 84, 6);
    ctx.fillRect(-30, -40, 7, 58); ctx.fillRect(23, -40, 7, 58);
    ctx.fillStyle = ssRg(ctx, -3, -14, 2, 12, [[0, '#fef9c3'], [1, '#d97706']]);
    ssRR(ctx, -9, -18, 18, 20, 4); ctx.fill();
    ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(0, -9, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function ssDrawUfo(ctx, W, H) {
    const tm = ssTm(), g = ssG, u = g.ufo;
    ctx.fillStyle = ssLg(ctx, 0, 0, 0, H, [[0, '#0b0920'], [0.6, '#111033'], [1, '#1e1b4b']]);
    ctx.fillRect(0, 0, W, H);
    // stars + moon
    for (let i = 0; i < 60; i++) {
        const sx = (i * 211.3) % W, sy = (i * 97.7) % (H * 0.6);
        ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.45 * Math.abs(Math.sin(tm * 0.05 + i))})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = ssRg(ctx, W - 150, 90, 12, 80, [[0, 'rgba(254,249,195,0.9)'], [1, 'rgba(254,249,195,0)']]);
    ctx.beginPath(); ctx.arc(W - 150, 90, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(W - 150, 90, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e7d9b8';
    ctx.beginPath(); ctx.arc(W - 160, 82, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 140, 98, 5, 0, Math.PI * 2); ctx.fill();
    // hills + grass + fence
    ctx.fillStyle = '#14532d';
    ctx.beginPath(); ctx.ellipse(W * 0.2, H - 40, 500, 120, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath(); ctx.ellipse(W * 0.8, H - 30, 520, 130, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = ssLg(ctx, 0, H - 90, 0, H, [[0, '#16a34a'], [1, '#14532d']]);
    ctx.fillRect(0, H - 90, W, 90);
    // beam
    const beamOn = isStageRunning && stageTick >= 8 && !u.gone;
    const beamTarget = g.items[u.scanIdx];
    if (beamOn && beamTarget) {
        const locked = stageTick >= 70;
        const flick = locked ? 1 : (Math.floor(tm * 0.3) % 2 === 0 ? 0.85 : 0.45);
        ctx.save(); ctx.globalAlpha = 0.32 * flick;
        ctx.fillStyle = ssLg(ctx, 0, u.y, 0, beamTarget.y, [[0, '#fde047'], [1, 'rgba(253,224,71,0.05)']]);
        ctx.beginPath();
        ctx.moveTo(u.x - 26, u.y + 12);
        ctx.lineTo(beamTarget.x - 44, beamTarget.y + 6);
        ctx.lineTo(beamTarget.x + 44, beamTarget.y + 6);
        ctx.lineTo(u.x + 26, u.y + 12);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = `rgba(253,224,71,${0.22 * flick})`;
        ctx.beginPath(); ctx.ellipse(beamTarget.x, beamTarget.y + 4, 52, 12, 0, 0, Math.PI * 2); ctx.fill();
    }
    // people
    g.items.forEach((p, i) => {
        const isWin = i === g.winnerIdx;
        const lift = p.lift || 0;
        const py = p.y - lift * (p.y - (u.y + 40));
        const sc = 1 - lift * 0.5;
        const alpha = 1 - lift * 0.35;
        const bob = isStageRunning ? 0 : Math.sin(tm * 0.06 + p.ph) * 2;
        ctx.save(); ctx.translate(p.x, py + bob); ctx.scale(sc, sc); ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(0, 44, 26 / sc * 0.8, 8, 0, 0, Math.PI * 2); ctx.fill();
        // legs
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(-8, 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 12); ctx.lineTo(8, 40); ctx.stroke();
        // body
        ctx.fillStyle = ssLg(ctx, 0, -22, 0, 14, [[0, ssHexCol(p.color, 1.3)], [1, ssHexCol(p.color, 0.75)]]);
        ssRR(ctx, -15, -24, 30, 40, 11); ctx.fill();
        // arms up when lifted
        ctx.strokeStyle = ssHexCol(p.color, 0.9); ctx.lineWidth = 7;
        if (lift > 0) {
            ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(-24, -34); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(24, -34); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(-19, 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(19, 4); ctx.stroke();
        }
        // head
        ctx.fillStyle = ssRg(ctx, -4, -38, 3, 18, [[0, '#fef3c7'], [1, '#f59e0b']]);
        ctx.beginPath(); ctx.arc(0, -34, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(-4.5, -36, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.5, -36, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, -30, 4.5, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.restore();
        if (!(isWin && lift >= 1)) ssNameTag(ctx, p.name, p.x, py + 52, isWin && isStageRunning && stageTick >= 70 ? '#b45309' : 'rgba(15,23,42,0.85)');
    });
    // UFO
    if (!(u.gone && u.y < -80)) {
        ctx.save(); ctx.translate(u.x, u.y + Math.sin(tm * 0.08) * 5);
        // dome
        ctx.fillStyle = 'rgba(103,232,249,0.75)';
        ctx.beginPath(); ctx.ellipse(0, -16, 34, 24, 0, Math.PI, 0); ctx.fill();
        // alien
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#052e16';
        ctx.beginPath(); ctx.ellipse(-3.5, -23, 2.2, 3.4, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3.5, -23, 2.2, 3.4, 0.3, 0, Math.PI * 2); ctx.fill();
        // saucer
        ssSh(ctx, 18, 'rgba(163,230,53,0.5)');
        ctx.fillStyle = ssLg(ctx, 0, -10, 0, 16, [[0, '#e2e8f0'], [0.5, '#94a3b8'], [1, '#475569']]);
        ctx.beginPath(); ctx.ellipse(0, 0, 76, 22, 0, 0, Math.PI * 2); ctx.fill();
        ssNoSh(ctx);
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 76, 22, 0, 0, Math.PI * 2); ctx.stroke();
        // rim lights
        for (let b = 0; b < 8; b++) {
            const a = (b / 8) * Math.PI * 2;
            const on = (b + Math.floor(tm * 0.18)) % 2 === 0;
            ctx.fillStyle = on ? '#fde047' : '#f97316';
            if (on) ssSh(ctx, 9, '#fde047');
            ctx.beginPath(); ctx.arc(Math.cos(a) * 62, Math.sin(a) * 16 + 2, 4.5, 0, Math.PI * 2); ctx.fill();
            ssNoSh(ctx);
        }
        ctx.restore();
    }
}

// click-to-pick: a student taps an entity to select it by hand
document.getElementById('stageCanvas').addEventListener('click', (e) => {
    if (isStageRunning || activeStageMode < 9) return;
    if (!ssG || !ssG.items) return;
    const canvas = document.getElementById('stageCanvas');
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    let hitName = null;
    if (activeStageMode === 9) {
        const b = ssG.items.find(b2 => !b2.popped && Math.hypot(mx - (b2.cx || b2.bx), my - (b2.cy || b2.by)) < 58);
        if (b) hitName = b.name;
    } else if (activeStageMode === 12) {
        const c = ssG.items.find(c2 => !c2.grabbed && Math.hypot(mx - c2.x, my - c2.y) < 42);
        if (c) hitName = c.name;
    } else if (activeStageMode === 13) {
        const f = ssG.items.find(f2 => Math.hypot(mx - f2.x, my - (f2.cy || f2.y)) < 46);
        if (f) hitName = f.name;
    } else if (activeStageMode === 14) {
        const ch = ssG.items.find(c2 => Math.abs(mx - c2.x) < 48 && Math.abs(my - c2.y) < 40);
        if (ch) hitName = ch.name;
    } else if (activeStageMode === 15) {
        const p = ssG.items.find(p2 => Math.abs(mx - p2.x) < 36 && my > p2.y - 60 && my < p2.y + 50);
        if (p) hitName = p.name;
    }
    if (hitName) ssRunNewMode(hitName);
});
// ============================================================================
// QUESTION FILES LIBRARY — keep imported files, switch, merge, delete
// ============================================================================
function ssQFiles() {
    if (!appState.questionFiles || !Array.isArray(appState.questionFiles)) appState.questionFiles = [];
    return appState.questionFiles;
}
function ssSetQSource(name) { appState.activeQSourceName = name; }
function ssQSourceName() { return appState.activeQSourceName || 'Default Questions'; }
function ssSaveQFile(name, questions) {
    const files = ssQFiles();
    if (files.length >= 5) {
        try { showToast('⚠️ مكتبة ملفات الأسئلة ممتلئة (٥ ملفات). احذف ملفًا من المكتبة قبل إضافة ملف جديد — هذا الملف لم يُحفظ في المكتبة.'); } catch (e) { alert('Question file library is full (5 files). Delete one before adding another.'); }
        return false;
    }
    files.unshift({ id: 'qf' + Date.now() + Math.floor(Math.random() * 999), name: name || 'Question File', ts: Date.now(), count: questions.length, questions: JSON.parse(JSON.stringify(questions)) });
    return true;
}
function ssLoadQFile(id) {
    const f = ssQFiles().find(x => x.id === id);
    if (!f) return;
    appState.questions = JSON.parse(JSON.stringify(f.questions));
    appState.qIndex = 0;
    ssSetQSource(f.name);
    syncStudioData();
    renderArenaQuestion();
    ssRenderQLibrary(); ssRenderQSelect();
    StudioAudioManager.playSFX('select');
    showToast(`📖 Loaded "${f.name}" (${f.questions.length} questions)`);
}
function ssMergeQFile(id) {
    const f = ssQFiles().find(x => x.id === id);
    if (!f) return;
    appState.questions = (appState.questions || []).concat(JSON.parse(JSON.stringify(f.questions)));
    ssSetQSource(`Merged set (${appState.questions.length})`);
    appState.qIndex = 0;
    syncStudioData();
    renderArenaQuestion();
    ssRenderQLibrary(); ssRenderQSelect();
    showToast(`➕ Added "${f.name}" to current set`);
}
function ssMergeAllQFiles() {
    const files = ssQFiles();
    if (files.length === 0) return showToast('No saved question files yet');
    let merged = [];
    files.forEach(f => merged = merged.concat(JSON.parse(JSON.stringify(f.questions))));
    appState.questions = merged;
    appState.qIndex = 0;
    ssSetQSource(`All Files Merged (${merged.length})`);
    syncStudioData();
    renderArenaQuestion();
    ssRenderQLibrary(); ssRenderQSelect();
    StudioAudioManager.playSFX('select');
    showToast(`📚 Merged ${files.length} files → ${merged.length} questions`);
}
function ssDeleteQFile(id) {
    const files = ssQFiles();
    const i = files.findIndex(x => x.id === id);
    if (i === -1) return;
    const nm = files[i].name;
    if (/^pre-/.test(files[i].id)) { if (!Array.isArray(appState.deletedPacks)) appState.deletedPacks = []; appState.deletedPacks.push(files[i].id); }
    files.splice(i, 1);
    syncStudioData();
    ssRenderQLibrary(); ssRenderQSelect();
    showToast(`🗑️ Deleted "${nm}"`);
}
function ssRenderQSelect() {
    const sel = document.getElementById('ssQSourceSelect');
    if (!sel) return;
    const cur = (appState.questions || []).length;
    sel.innerHTML = '';
    const optCur = document.createElement('option');
    optCur.value = '__current';
    optCur.textContent = `▶ Playing: ${ssQSourceName()} (${cur} Q)`;
    sel.appendChild(optCur);
    ssQFiles().forEach(f => {
        const o = document.createElement('option');
        o.value = f.id;
        o.textContent = `📄 ${f.name} (${f.count} Q)`;
        sel.appendChild(o);
    });
    if (ssQFiles().length > 1) {
        const om = document.createElement('option');
        om.value = '__merge_all';
        om.textContent = `📚 Merge ALL files (${ssQFiles().reduce((a, f) => a + (f.count || 0), 0)} Q)`;
        sel.appendChild(om);
    }
    const od = document.createElement('option');
    od.value = '__default';
    od.textContent = '↩️ Default Questions';
    sel.appendChild(od);
    sel.value = '__current';
}
function ssQSourceChanged() {
    const sel = document.getElementById('ssQSourceSelect');
    if (!sel) return;
    const v = sel.value;
    if (v === '__current') return;
    if (v === '__merge_all') ssMergeAllQFiles();
    else if (v === '__default') resetToDefaultQuestions();
    else ssLoadQFile(v);
    ssRenderQSelect();
}
function ssRenderQLibrary() {
    const box = document.getElementById('ssQFileListBox');
    if (!box) return;
    const files = ssQFiles();
    if (files.length === 0) {
        box.innerHTML = '<div style="font-size:12.5px; color:#64748b; font-weight:700; padding:6px 2px;">No saved files yet — every Excel/Word you import is saved here automatically.</div>';
        return;
    }
    box.innerHTML = '';
    files.forEach(f => {
        const row = document.createElement('div');
        row.className = 'ss-qfile-row';
        const date = new Date(f.ts || Date.now());
        row.innerHTML = `
            <span style="font-size:17px;">📄</span>
            <span class="ss-qf-name" title="${f.name}">${f.name}</span>
            <span class="ss-qf-count">${f.count} Q • ${date.toLocaleDateString()}</span>
            <button type="button" class="ss-mini-btn load">▶ Load</button>
            <button type="button" class="ss-mini-btn merge">➕ Merge</button>
            <button type="button" class="ss-mini-btn del">🗑</button>
        `;
        row.querySelector('.load').onclick = () => { ssLoadQFile(f.id); document.getElementById('smartImportModal').style.display = 'none'; switchPortal('quiz'); };
        row.querySelector('.merge').onclick = () => { ssMergeQFile(f.id); document.getElementById('smartImportModal').style.display = 'none'; switchPortal('quiz'); };
        row.querySelector('.del').onclick = () => ssDeleteQFile(f.id);
        box.appendChild(row);
    });
}

// ---- import handlers: parse (same as original) + auto-save to library ----
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
            while (startCol < cells.length - 1 && (/^\d+$/.test(cells[startCol]) || /^(mcq|multiple choice|true\/false)$/i.test(cells[startCol]))) startCol++;
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
            const __qfSaved = ssSaveQFile(file.name, imported);
            appState.questions = imported;
            appState.qIndex = 0;
            ssSetQSource(file.name);
            syncStudioData();
            renderArenaQuestion();
            ssRenderQLibrary(); ssRenderQSelect();
            document.getElementById('smartImportModal').style.display = 'none';
            switchPortal('quiz');
            StudioAudioManager.playSFX('select');
            showToast(__qfSaved === false ? `⚠️ Library full (5 files) - "${file.name}" loaded for this session only, not saved to the library` : `✅ Saved & loaded "${file.name}" (${imported.length} Q)`);
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
                        imported.push({ type: 'mcq', q: tds[s], opts: [tds[s + 1], tds[s + 2], tds[s + 3], tds[s + 4]], ans: ansIdx });
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
            const __qfSaved = ssSaveQFile(file.name, imported);
            appState.questions = imported;
            appState.qIndex = 0;
            ssSetQSource(file.name);
            syncStudioData();
            renderArenaQuestion();
            ssRenderQLibrary(); ssRenderQSelect();
            document.getElementById('smartImportModal').style.display = 'none';
            switchPortal('quiz');
            StudioAudioManager.playSFX('select');
            showToast(__qfSaved === false ? `⚠️ Library full (5 files) - "${file.name}" loaded for this session only, not saved to the library` : `✅ Saved & loaded "${file.name}" (${imported.length} Q)`);
        } else {
            alert("No MCQ tables or Bold words found in this Word file.");
        }
    } catch (e) { alert("Could not read Word file."); }
    event.target.value = '';
}

// ---- light wraps to keep the source label accurate ----
function addQuickBlankSentences() {
    window._ssOrig.addQuick();
    ssSetQSource('Quick Blanks');
    ssRenderQSelect();
}
function resetToDefaultQuestions() {
    window._ssOrig.resetDef();
    ssSetQSource('Default Questions');
    ssRenderQSelect();
}
function renderAllDashboard() {
    window._ssOrig.renderAll();
    ssRenderQSelect();
}

// ============================================================================
// V2 UI INJECTION & STARTUP
// ============================================================================
(function ssInitV2() {
    // 1. Question-file selector above the quiz counter row
    const qbarLeft = document.getElementById('quizBarLeft');
    if (qbarLeft) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';
        row.innerHTML = `<span title="Question file" style="font-size:15px; color:#1e40af;"><i class="fa-solid fa-folder-open"></i></span>`;
        const sel = document.createElement('select');
        sel.id = 'ssQSourceSelect';
        sel.onchange = ssQSourceChanged;
        row.appendChild(sel);
        const mgr = document.createElement('button');
        mgr.type = 'button';
        mgr.className = 'ss-mini-btn load';
        mgr.title = 'Manage question files';
        mgr.innerHTML = '📚 Files';
        mgr.onclick = openSmartImportModal;
        row.appendChild(mgr);
        qbarLeft.insertBefore(row, qbarLeft.firstChild);
    }

    // 2. Library section inside the Smart Import modal
    const importCard = document.querySelector('#smartImportModal .studio-modal-card');
    if (importCard && importCard.firstElementChild) {
        const sec = document.createElement('div');
        sec.style.cssText = 'margin-bottom:16px; padding:12px; border:1.5px dashed #bfdbfe; border-radius:16px; background:#f8faff;';
        sec.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:14.5px; color:#1e40af;">📚 Question Files Library</strong>
                <button type="button" id="ssMergeAllBtn" class="ss-mini-btn merge">📚 Merge ALL Files</button>
            </div>
            <div id="ssQFileListBox" style="max-height:190px; overflow-y:auto;"></div>
        `;
        importCard.insertBefore(sec, importCard.firstElementChild.nextSibling);
        const mb = sec.querySelector('#ssMergeAllBtn');
        if (mb) mb.onclick = () => { ssMergeAllQFiles(); document.getElementById('smartImportModal').style.display = 'none'; switchPortal('quiz'); };
    }

    // 3. Quality toggle in stage top bar
    const stageBarRight = document.querySelector('#gameStageModal .stage-top-bar > div:last-child');
    if (stageBarRight) {
        const qbtn = document.createElement('button');
        qbtn.type = 'button';
        qbtn.id = 'ssQualityBtn';
        qbtn.onclick = ssToggleQuality;
        qbtn.innerHTML = SS.quality === 'high' ? '<i class="fa-solid fa-gem"></i> GFX: High' : '<i class="fa-solid fa-bolt"></i> GFX: Low';
        stageBarRight.insertBefore(qbtn, stageBarRight.firstChild);
    }

    // 4. Stage quick-switch buttons for the new games
    const quickBar = document.querySelector('#gameStageModal .stage-bottom-bar > div:last-child');
    if (quickBar) {
        [[9, '🎈 Balloons'], [11, '🚀 Rockets'], [12, '🕹️ Claw 3D'], [13, '🎣 Fishing'], [14, '⚓ Dive'], [15, '🛸 UFO'], [16, '📖 Magic Book']].forEach(([id, label]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'top-circle-btn';
            b.style.cssText = 'width:auto; padding:0 11px; font-size:12px; font-weight:800;';
            b.textContent = label;
            b.onclick = () => openGameStage(id);
            quickBar.appendChild(b);
        });
    }

    // 5. Version badge
    const badge = document.createElement('div');
    badge.id = 'ssVersionBadge';
    badge.textContent = 'Alforqan - Studio v8 • HD GFX • 15 Games • Q-Library';
    document.body.appendChild(badge);

    ssQFiles();
    ssRenderQSelect();
    ssRenderQLibrary();
    requestAnimationFrame(ssIdleLoop);
})();

