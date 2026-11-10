
// ================= SMART INTERACTION ENGINE =================
let toastTimer = null;
function showToast(msg, isRemove = false) {
    const t = document.getElementById('actionToast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = isRemove ? '#dc2626' : '#059669';
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.display = 'none'; }, 1300);
}

function attachSmartInteraction(btnElement, onAdd, onRemove) {
    let pressTimer = null;
    let longPressTriggered = false;

    btnElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pressTimer) clearTimeout(pressTimer);
        onRemove();
    });

    btnElement.addEventListener('touchstart', (e) => {
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            onRemove();
        }, 500);
    }, { passive: true });

    btnElement.addEventListener('touchend', (e) => {
        if (pressTimer) clearTimeout(pressTimer);
        if (longPressTriggered) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    btnElement.addEventListener('touchmove', () => {
        if (pressTimer) clearTimeout(pressTimer);
    }, { passive: true });

    btnElement.addEventListener('click', (e) => {
        if (longPressTriggered) {
            longPressTriggered = false;
            return;
        }
        onAdd();
    });
}

// ================= TRUE GRAPHICAL CANVAS SPINNING WHEEL =================
const WHEEL_COLORS = ['#2563eb','#16a34a','#d97706','#9333ea','#dc2626','#0d9488','#4f46e5','#ca8a04','#0284c7','#be123c'];
let wheelRotationAngle = 0;
let isWheelSpinning = false;
let wheelSelectedStudentId = null;

function openSpinWheelModal() {
    const students = (appData.classes[appData.currentClass] && appData.classes[appData.currentClass].students) || [];
    if (students.length === 0) {
        alert("No students in this class!");
        return;
    }
    wheelSelectedStudentId = null;
    document.getElementById('wheelClassSubtitle').textContent = `${appData.currentClass} — ${students.length} Students`;
    document.getElementById('wheelWinnerBanner').textContent = 'Click "SPIN THE WHEEL" to pick a student!';
    document.getElementById('btnWheelReward').style.display = 'none';
    document.getElementById('wheelModal').style.display = 'flex';
    drawWheelCanvas(wheelRotationAngle);
}

function closeSpinWheelModal() {
    document.getElementById('wheelModal').style.display = 'none';
}

function drawWheelCanvas(angleOffset) {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const students = (appData.classes[appData.currentClass] && appData.classes[appData.currentClass].students) || [];
    const n = students.length;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 6;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (n === 0) return;

    const arc = (2 * Math.PI) / n;

    for (let i = 0; i < n; i++) {
        const startAngle = angleOffset + i * arc;
        const endAngle = startAngle + arc;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Draw Student Name along slice
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = n > 18 ? 'bold 10px Arial' : 'bold 11.5px Arial';
        let shortName = students[i].name;
        if (shortName.length > 20) shortName = shortName.slice(0, 19) + '…';
        ctx.fillText(shortName, radius - 12, 4);
        ctx.restore();
    }

    // Center hub circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();
}

function spinTheWheelNow() {
    if (isWheelSpinning) return;
    const students = (appData.classes[appData.currentClass] && appData.classes[appData.currentClass].students) || [];
    if (students.length === 0) return;

    isWheelSpinning = true;
    document.getElementById('btnWheelReward').style.display = 'none';
    document.getElementById('wheelWinnerBanner').textContent = '🎡 Spinning...';

    const startAngle = wheelRotationAngle;
    const extraSpins = (5 + Math.random() * 4) * 2 * Math.PI; // 5 to 9 full rotations
    const targetAngle = startAngle + extraSpins;
    const duration = 3400; // ms
    const startTime = performance.now();

    function animateWheel(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // Cubic ease-out deceleration
        const easeOut = 1 - Math.pow(1 - t, 3);
        wheelRotationAngle = startAngle + (targetAngle - startAngle) * easeOut;
        drawWheelCanvas(wheelRotationAngle);

        if (t < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            isWheelSpinning = false;
            // Pointer is at angle 0 (Right side)
            const n = students.length;
            const arc = (2 * Math.PI) / n;
            const normalized = ((2 * Math.PI - (wheelRotationAngle % (2 * Math.PI))) + 2 * Math.PI) % (2 * Math.PI);
            const winningIndex = Math.floor(normalized / arc) % n;
            const winner = students[winningIndex];

            wheelSelectedStudentId = winner.id;
            document.getElementById('wheelWinnerBanner').innerHTML = `🎉 Selected: <span style="color:#1e3a8a; text-decoration:underline;">${winner.name}</span> 🎉`;
            if (!isReadOnlyView()) {
                document.getElementById('btnWheelReward').style.display = 'inline-flex';
            }
            showToast(`🎯 Wheel picked: ${winner.name}`, false);
        }
    }
    requestAnimationFrame(animateWheel);
}

function rewardWheelWinner() {
    if (isReadOnlyView() || !wheelSelectedStudentId) return;
    const students = appData.classes[appData.currentClass].students || [];
    const stu = students.find(s => s.id === wheelSelectedStudentId);
    if (!stu) return;

    const partBehavior = behaviors.find(b => b.id === 'participation') || behaviors[2];
    modifyStudentBehavior(stu, partBehavior, +1);
    closeSpinWheelModal();
}

// ================= UNIFIED TOP STUDENTS COMPARATOR =================
function compareTopStudentsByNetScore(a, b) {
    if (b.netScore !== a.netScore) return b.netScore - a.netScore;
    if (a.neg !== b.neg) return a.neg - b.neg;
    if (b.perc !== a.perc) return b.perc - a.perc;
    return b.pos - a.pos;
}

// ================= UNIVERSAL PERIOD FILTER ENGINE (FOR ALL REPORTS) =================
function getAllSavedDatesList() {
    let allDatesSet = new Set();
    Object.keys(globalData).forEach(tName => {
        const tObj = globalData[tName];
        Object.keys((tObj && tObj.classes) || {}).forEach(cName => {
            const cls = tObj.classes[cName];
            Object.keys((cls && cls.history) || {}).forEach(d => allDatesSet.add(d));
        });
    });
    return Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));
}

function getFormattedActivePeriodLabel() {
    if (activeAnalyticsPeriod === 'today') {
        return selectedSpecificDate ? `Daily Report: 📅 ${selectedSpecificDate}` : `Today (🟢 Current Active Board)`;
    } else if (activeAnalyticsPeriod === 'weekly') {
        const sunKey = selectedSchoolWeek || getSchoolWeekRange(new Date()).sunStr;
        const wk = getSchoolWeekRange(sunKey);
        return `Weekly Report (${wk.label})`;
    } else if (activeAnalyticsPeriod === 'monthly') {
        const mKey = selectedMonthlyKey || new Date().toISOString().slice(0, 7);
        return `Monthly Report (📆 Month: ${mKey})`;
    } else {
        return `Cumulative Report (All Recorded Days to Date)`;
    }
}

/**
 * Renders the unified Period Filter Bar (Today | Weekly | Monthly | Cumulative + Sub-Picker)
 * into any report container slot and triggers refreshCurrentActiveView() on change.
 */
function renderUniversalPeriodBarInSlot(slotId) {
    const slot = document.getElementById(slotId);
    if (!slot) return;

    const sortedDatesDesc = getAllSavedDatesList();
    let subPickerHTML = '';

    if (activeAnalyticsPeriod === 'today') {
        subPickerHTML = `
            <select class="feat-select" style="padding:6px 10px; font-size:12.5px;" onchange="selectedSpecificDate=this.value; refreshCurrentActiveView();">
                <option value="" ${selectedSpecificDate === '' ? 'selected' : ''}>🟢 Today (Active Board)</option>
                ${sortedDatesDesc.map(d => `<option value="${d}" ${selectedSpecificDate === d ? 'selected' : ''}>📅 Saved: ${d}</option>`).join('')}
            </select>
            <input type="date" value="${selectedSpecificDate || new Date().toISOString().split('T')[0]}"
                style="padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1; font-weight:bold; font-size:12.5px; background:white;"
                onchange="selectedSpecificDate=this.value; refreshCurrentActiveView();" title="Pick any specific date">
        `;
    } else if (activeAnalyticsPeriod === 'weekly') {
        let weeksMap = {};
        const curWk = getSchoolWeekRange(new Date());
        weeksMap[curWk.sunStr] = `📅 Current Week (${curWk.label})`;
        sortedDatesDesc.forEach(d => {
            const wk = getSchoolWeekRange(d);
            if (!weeksMap[wk.sunStr]) weeksMap[wk.sunStr] = `📅 Week: ${wk.label}`;
        });
        const activeSun = selectedSchoolWeek || curWk.sunStr;
        subPickerHTML = `
            <select class="feat-select" style="padding:6px 10px; font-size:12.5px;" onchange="selectedSchoolWeek=this.value; refreshCurrentActiveView();">
                ${Object.keys(weeksMap).sort().reverse().map(sunKey => `<option value="${sunKey}" ${activeSun === sunKey ? 'selected' : ''}>${weeksMap[sunKey]}</option>`).join('')}
            </select>
        `;
    } else if (activeAnalyticsPeriod === 'monthly') {
        let monthsSet = new Set();
        const curMonth = new Date().toISOString().slice(0, 7);
        monthsSet.add(curMonth);
        sortedDatesDesc.forEach(d => monthsSet.add(d.slice(0, 7)));
        const activeM = selectedMonthlyKey || curMonth;
        subPickerHTML = `
            <select class="feat-select" style="padding:6px 10px; font-size:12.5px;" onchange="selectedMonthlyKey=this.value; refreshCurrentActiveView();">
                ${Array.from(monthsSet).sort().reverse().map(mKey => `<option value="${mKey}" ${activeM === mKey ? 'selected' : ''}>📆 Month: ${mKey}</option>`).join('')}
            </select>
        `;
    } else {
        subPickerHTML = `<span style="font-size:12px; color:#1e3a8a; font-weight:800; padding:4px 8px; background:#dbeafe; border-radius:8px;"><i class="fa-solid fa-layer-group"></i> All Days Combined</span>`;
    }

    slot.innerHTML = `
        <div class="period-btn-group">
            <button type="button" class="period-btn ${activeAnalyticsPeriod === 'today' ? 'active' : ''}" onclick="changeUniversalPeriod('today')">Today (اليومي)</button>
            <button type="button" class="period-btn ${activeAnalyticsPeriod === 'weekly' ? 'active' : ''}" onclick="changeUniversalPeriod('weekly')">Weekly (الأسبوعي)</button>
            <button type="button" class="period-btn ${activeAnalyticsPeriod === 'monthly' ? 'active' : ''}" onclick="changeUniversalPeriod('monthly')">Monthly (الشهري)</button>
            <button type="button" class="period-btn ${activeAnalyticsPeriod === 'cumulative' ? 'active' : ''}" onclick="changeUniversalPeriod('cumulative')">Cumulative (التراكمي)</button>
        </div>
        ${subPickerHTML}
    `;
}

function changeUniversalPeriod(newPeriod) {
    activeAnalyticsPeriod = newPeriod;
    refreshCurrentActiveView();
}

function refreshCurrentActiveView() {
    if (currentViewName === 'home') refreshAdminAnalyticsHub();
    else if (currentViewName === 'analytics') renderAdminPieBreakdownReport();
    else if (currentViewName === 'studentReport') renderStudentReportContent();
    else if (currentViewName === 'classReport') renderClassReportContent();
    else if (currentViewName === 'leaderboardReport') renderLeaderboardReportContent();
    else if (currentViewName === 'globalStudentReport') generateGlobalReportHTML(document.getElementById('gr-subjectFilter').value || 'ALL');
    else if (currentViewName === 'globalClassReport') generateGlobalClassReportHTML(document.getElementById('gcr-subjectFilter').value || 'ALL');
    else if (currentViewName === 'globalTopStudents') generateGlobalTopStudentsHTML();
}

/**
 * Returns the list of board/history data objects from a class (`cls`)
 * that match the currently selected Universal Time Period.
 */
function getMatchingPeriodRecordsForClass(cls) {
    if (!cls) return [];
    let records = [];
    if (activeAnalyticsPeriod === 'today') {
        if (!selectedSpecificDate) {
            records.push(cls);
        } else if (cls.history && cls.history[selectedSpecificDate]) {
            records.push(cls.history[selectedSpecificDate]);
        }
    } else if (activeAnalyticsPeriod === 'weekly') {
        const curWk = getSchoolWeekRange(new Date());
        const targetSun = selectedSchoolWeek || curWk.sunStr;
        const wk = getSchoolWeekRange(targetSun);
        if (cls.history) {
            Object.keys(cls.history).forEach(d => {
                if (d >= wk.sunStr && d <= wk.thuStr) records.push(cls.history[d]);
            });
        }
        // Include current active board if looking at current week
        if (targetSun === curWk.sunStr) records.push(cls);
    } else if (activeAnalyticsPeriod === 'monthly') {
        const curMonth = new Date().toISOString().slice(0, 7);
        const targetMonth = selectedMonthlyKey || curMonth;
        if (cls.history) {
            Object.keys(cls.history).forEach(d => {
                if (d.startsWith(targetMonth)) records.push(cls.history[d]);
            });
        }
        if (targetMonth === curMonth) records.push(cls);
    } else {
        // Cumulative
        records.push(cls);
        if (cls.history) {
            Object.values(cls.history).forEach(hObj => records.push(hObj));
        }
    }
    return records;
}

/**
 * Calculates a student's aggregated stats in a class across the selected Universal Period.
 */
function calculateStudentPeriodStatsInClass(sId, cls) {
    const records = getMatchingPeriodRecordsForClass(cls);
    let pos = 0, neg = 0, sumPerc = 0, cnt = 0;
    let behaviorMap = {};
    behaviors.forEach(b => behaviorMap[b.id] = 0);
    let latestQuiz = '-', latestProj = '-', latestComment = '';

    records.forEach(rec => {
        const st = calculateStatsFromData(sId, rec);
        if (st.hasData) {
            pos += st.positiveCount;
            neg += st.negativeCount;
            sumPerc += st.percentage;
            cnt++;
            if (rec.scores && rec.scores[sId]) {
                behaviors.forEach(b => {
                    behaviorMap[b.id] += (rec.scores[sId][b.id] || 0);
                });
            }
        }
        if (rec.quizScores && rec.quizScores[sId]) latestQuiz = rec.quizScores[sId];
        if (rec.projectScores && rec.projectScores[sId]) latestProj = rec.projectScores[sId];
        if (rec.comments && rec.comments[sId]) latestComment = rec.comments[sId];
    });

    const hasData = cnt > 0;
    const perc = hasData ? Math.round(sumPerc / cnt) : 100;
    const netScore = pos - neg;
    const isNegativeOnly = hasData && ((neg > 0 && pos === 0) || perc < 70);

    let colorClass = "perc-none", text = "No Data";
    if (hasData) {
        if (isNegativeOnly || perc < 70) colorClass = "perc-critical";
        else if (perc >= 90) colorClass = "perc-high";
        else if (perc >= 80) colorClass = "perc-mid";
        else colorClass = "perc-low";
        text = `${perc}%${pos > 0 ? ' (+' + pos + ')' : ''}${neg > 0 && pos === 0 ? ' (-' + neg + ')' : ''}`;
    }

    return { positiveCount: pos, negativeCount: neg, percentage: perc, netScore, hasData, isNegativeOnly, colorClass, text, behaviorMap, latestQuiz, latestProj, latestComment };
}

// ================= HIGH-PRECISION LOGOS =================
let svgIdCounter = 0;

function getCogniaLogoHTML(heightPx = 74) {
    svgIdCounter++;
    const topArcId = `cogTopArc_${svgIdCounter}`;
    const botArcId = `cogBotArc_${svgIdCounter}`;
    return `
    <div class="eis-logo-wrapper">
        <img src="image_a74251.png" alt="Cognia Accredited" style="height:${heightPx}px; width:auto; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">
        <svg viewBox="0 0 140 140" style="height:${heightPx}px; width:${heightPx}px; display:none;" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <path id="${topArcId}" d="M 22,70 A 48,48 0 1,1 118,70" />
                <path id="${botArcId}" d="M 20,74 A 50,50 0 1,0 120,74" />
            </defs>
            <circle cx="70" cy="70" r="66" fill="#e5e7eb" stroke="#94a3b8" stroke-width="2"/>
            <circle cx="70" cy="70" r="59" fill="#e5e7eb" stroke="#1e293b" stroke-width="1.8"/>
            <text font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="11.5" fill="#1e293b" letter-spacing="2">
                <textPath href="#${topArcId}" startOffset="50%" text-anchor="middle">ACCREDITED</textPath>
            </text>
            <text x="70" y="76" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="25" fill="#0f172a" letter-spacing="-0.5">cognia</text>
            <circle cx="43.5" cy="68.5" r="3.2" fill="#dc2626"/>
            <text x="112" y="65" font-family="Arial, sans-serif" font-weight="bold" font-size="6" fill="#0f172a">TM</text>
            <text font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="7.8" fill="#1e293b" letter-spacing="0.8">
                <textPath href="#${botArcId}" startOffset="50%" text-anchor="middle">NCA CASI • NWAC • SACS CASI</textPath>
            </text>
        </svg>
    </div>`;
}

function getMOELogoHTML(heightPx = 72) {
    return `
    <div class="eis-logo-wrapper">
        <img src="image_a7426b.png" alt="Ministry of Education" style="height:${heightPx}px; width:auto; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">
        <svg viewBox="0 0 210 115" style="height:${heightPx}px; width:auto; display:none;" xmlns="http://www.w3.org/2000/svg">
            <g fill="#0d9488">
                <circle cx="35" cy="14" r="4.8"/><circle cx="50" cy="17" r="4.3"/><circle cx="65" cy="21" r="3.8"/><circle cx="79" cy="26" r="3.2"/><circle cx="92" cy="31" r="2.7"/>
                <circle cx="35" cy="27" r="4.2"/><circle cx="50" cy="29" r="3.7"/><circle cx="65" cy="32" r="3.2"/><circle cx="79" cy="36" r="2.7"/><circle cx="92" cy="40" r="2.3"/>
                <circle cx="35" cy="39" r="3.6"/><circle cx="50" cy="41" r="3.1"/><circle cx="65" cy="43" r="2.6"/><circle cx="79" cy="46" r="2.2"/>
                <circle cx="105" cy="36" r="2.7"/><circle cx="105" cy="47" r="2.3"/>
                <circle cx="175" cy="14" r="4.8"/><circle cx="160" cy="17" r="4.3"/><circle cx="145" cy="21" r="3.8"/><circle cx="131" cy="26" r="3.2"/><circle cx="118" cy="31" r="2.7"/>
                <circle cx="175" cy="27" r="4.2"/><circle cx="160" cy="29" r="3.7"/><circle cx="145" cy="32" r="3.2"/><circle cx="131" cy="36" r="2.7"/><circle cx="118" cy="40" r="2.3"/>
                <circle cx="175" cy="39" r="3.6"/><circle cx="160" cy="41" r="3.1"/><circle cx="145" cy="43" r="2.6"/><circle cx="131" cy="46" r="2.2"/>
            </g>
            <text x="105" y="78" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-weight="900" font-size="25" fill="#0d9488">وزارة التعليم</text>
            <text x="105" y="98" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="13.5" fill="#64748b" letter-spacing="0.4">Ministry of Education</text>
        </svg>
    </div>`;
}

function getOfficialEISLogoHTML(heightPx = 74) {
    return `
    <div class="eis-logo-wrapper">
        <img src="" alt="Alforqan - Studio" style="height:${heightPx}px; width:auto; object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';">
        <svg viewBox="0 0 435 120" style="height:${heightPx}px; width:auto; display:none;" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="82" height="108" fill="#ffffff" stroke="#475569" stroke-width="1.8"/>
            <polygon points="7,9 37,25 7,41" fill="#262626"/>
            <polygon points="18,8 32,8 32,17" fill="#facc15"/>
            <rect x="36" y="8" width="8" height="22" fill="#2dd4bf"/>
            <rect x="44" y="8" width="12" height="32" fill="#facc15"/>
            <polygon points="56,8 84,8 70,27" fill="#0d9488"/>
            <polygon points="71,1 83,1 83,37 77,32 71,37" fill="#262626"/>
            <polygon points="7,38 41,55 7,71" fill="#0d9488"/>
            <polygon points="24,35 44,35 44,50" fill="#1e3a8a"/>
            <polygon points="12,69 44,55 44,83" fill="#1e3a8a"/>
            <polygon points="7,75 35,89 7,105" fill="#52b788"/>
            <polygon points="7,99 33,112 7,112" fill="#1e3a8a"/>
            <polygon points="34,104 44,96 44,112" fill="#facc15"/>
            <polygon points="46,29 84,29 80,39 85,45 78,53 85,61 75,68 57,68 46,49" fill="#52b788"/>
            <polygon points="57,65 77,65 67,77" fill="#262626"/>
            <polygon points="51,77 84,77 67,95" fill="#facc15"/>
            <polygon points="48,61 51,67 48,73 45,67" fill="#52b788"/>
            <polygon points="48,75 51,81 48,87 45,81" fill="#52b788"/>
            <polygon points="48,89 51,95 48,101 45,95" fill="#52b788"/>
            <polygon points="46,99 84,85 84,112 52,112" fill="#52b788"/>
            <text x="100" y="79" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="48" fill="#1a365d" letter-spacing="1">AF</text>
            <line x1="184" y1="40" x2="184" y2="82" stroke="#cbd5e1" stroke-width="1.5"/>
            <text x="192" y="57" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="18.5" fill="#1a365d" letter-spacing="0.6">ALFORQAN</text>
            <text x="192" y="78" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="16.5" fill="#1a365d" letter-spacing="0.5">STUDIO</text>
        </svg>
    </div>`;
}

const reportBannerHTML = `
<div class="school-print-banner">
    
    <div style="display:flex; align-items:center;">
        ${getOfficialEISLogoHTML(74)}
    </div>
</div>`;

document.querySelectorAll('.school-banner-slot').forEach(s => s.innerHTML = reportBannerHTML);
document.getElementById('loginLogoSlot').innerHTML = getOfficialEISLogoHTML(70);
document.getElementById('portalHeroLogoSlot').innerHTML = getOfficialEISLogoHTML(64);
document.getElementById('saveDatePicker').value = new Date().toISOString().split('T')[0];

function populateSubjectDropdownElement(selectId, currentSub, isDisabled) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    ALL_SUBJECTS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sel.appendChild(opt);
    });
    const validSub = ALL_SUBJECTS.includes(currentSub) ? currentSub : (DEFAULT_TEACHER_SUBJECTS[currentTeacher] || 'Science');
    sel.value = validSub;
    sel.disabled = !!isDisabled;
}

function switchSubjectInternal(newSub) {
    if (isReadOnlyView() || ADMINS.includes(currentTeacher)) return;
    appData.subject = newSub;
    saveGlobal();
    populateSubjectDropdownElement('portalSubjectSwitcher', newSub, false);
    populateSubjectDropdownElement('boardSubjectSwitcher', newSub, false);
    showToast(`Active Subject changed to: ${newSub}`, false);
}

function hideAllViews() {
    ['homePortalView','mainView','studentReportView','classReportView','leaderboardReportView','globalReportView','globalClassReportView','globalTopStudentsView','adminAnalyticsView','adminDashboardView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function launchPortalSession() {
    appData = globalData[currentTeacher];
    if (!appData.classes || Object.keys(appData.classes).length === 0) {
        populateAllSchoolClasses(appData);
    }
    if (!appData.currentClass || !appData.classes[appData.currentClass]) {
        appData.currentClass = Object.keys(appData.classes)[0];
    }

    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    isHistoryMode = false;
    historyDate = null;
    buildAutocompleteList();
    initAnalyticsScopeDropdowns();
    openHomePortal();
}

function initAnalyticsScopeDropdowns() {
    ['hubClassScopeSelect', 'aab-classFilter'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="ALL_CLASSES">🏫 All School Classes (5C-12C)</option>';
        Object.keys(SCHOOL_CLASSES).forEach(c => {
            const o = document.createElement('option');
            o.value = c; o.textContent = c;
            sel.appendChild(o);
        });
    });
}

function openHomePortal() {
    if (window.__smRole === 'counselor') { openAdminDashboard(); return; }
    currentViewName = 'home';
    hideAllViews();
    document.getElementById('homePortalView').style.display = 'block';
    renderNavbar();
    renderHomePortal();
    window.scrollTo(0, 0);
}

function openMainDashboard() {
    currentViewName = 'board';
    appData = globalData[currentTeacher];
    if (!appData.classes || Object.keys(appData.classes).length === 0) {
        populateAllSchoolClasses(appData);
    }
    if (!appData.currentClass || !appData.classes[appData.currentClass]) {
        appData.currentClass = Object.keys(appData.classes)[0];
    }

    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    hideAllViews();
    document.getElementById('mainView').style.display = 'block';

    const roleTitle = getTeacherRoleTitle(currentTeacher);
    document.getElementById('teacherBadgeName').innerHTML = `<i class="fa-solid fa-user-tie"></i> ${currentTeacher} (${roleTitle})`;

    const isTargetAdmin = ADMINS.includes(currentTeacher);
    const boardSubWrap = document.getElementById('boardActiveSubjectWrap');
    if (isTargetAdmin) {
        boardSubWrap.style.display = 'none';
    } else {
        boardSubWrap.style.display = 'inline-flex';
        populateSubjectDropdownElement('boardSubjectSwitcher', appData.subject, isReadOnlyView());
    }

    renderNavbar();
    renderClass();
}

// ================= EXECUTIVE ADMIN ANALYTICS ENGINE =================
function computeSchoolAnalytics(classScope = 'ALL_CLASSES') {
    let totalPos = 0;
    let totalNeg = 0;
    let sumPerc = 0;
    let evalCount = 0;
    let behaviorCounts = {};
    behaviors.forEach(b => behaviorCounts[b.id] = 0);

    let classStats = {};
    Object.keys(SCHOOL_CLASSES).forEach(c => {
        if (classScope === 'ALL_CLASSES' || classScope === c) {
            classStats[c] = { pos: 0, neg: 0, sumP: 0, cnt: 0, stuCount: SCHOOL_CLASSES[c].length };
        }
    });

    let allDatesSet = new Set();

    Object.keys(globalData).forEach(tName => {
        if (ADMINS.includes(tName)) return;
        const tObj = globalData[tName];
        Object.keys(tObj.classes || {}).forEach(cName => {
            if (classScope !== 'ALL_CLASSES' && cName !== classScope) return;
            const cls = tObj.classes[cName];
            Object.keys(cls.history || {}).forEach(d => allDatesSet.add(d));

            const matchingRecords = getMatchingPeriodRecordsForClass(cls);
            const stuList = cls.students || [];

            matchingRecords.forEach(rec => {
                stuList.forEach(stu => {
                    const st = calculateStatsFromData(stu.id, rec);
                    if (st.hasData) {
                        totalPos += st.positiveCount;
                        totalNeg += st.negativeCount;
                        sumPerc += st.percentage;
                        evalCount++;
                        if (classStats[cName]) {
                            classStats[cName].pos += st.positiveCount;
                            classStats[cName].neg += st.negativeCount;
                            classStats[cName].sumP += st.percentage;
                            classStats[cName].cnt++;
                        }
                        if (rec.scores && rec.scores[stu.id]) {
                            behaviors.forEach(b => {
                                behaviorCounts[b.id] += (rec.scores[stu.id][b.id] || 0);
                            });
                        }
                    }
                });
            });
        });
    });

    const overallAvg = evalCount > 0 ? Math.round(sumPerc / evalCount) : 100;

    const sortedDatesAsc = Array.from(allDatesSet).sort((a, b) => a.localeCompare(b));
    let trendSeries = [];

    sortedDatesAsc.forEach(d => {
        let dSum = 0, dCnt = 0, dPos = 0, dNeg = 0;
        Object.keys(globalData).forEach(tName => {
            if (ADMINS.includes(tName)) return;
            const tObj = globalData[tName];
            Object.keys(tObj.classes || {}).forEach(cName => {
                if (classScope !== 'ALL_CLASSES' && cName !== classScope) return;
                const cls = tObj.classes[cName];
                if (cls.history && cls.history[d]) {
                    (cls.students || []).forEach(stu => {
                        const st = calculateStatsFromData(stu.id, cls.history[d]);
                        if (st.hasData) { dSum += st.percentage; dCnt++; dPos += st.positiveCount; dNeg += st.negativeCount; }
                    });
                }
            });
        });
        if (dCnt > 0) {
            trendSeries.push({ label: d.slice(5), fullDate: d, avg: Math.round(dSum / dCnt), pos: dPos, neg: dNeg });
        }
    });

    let tSum = 0, tCnt = 0, tPos = 0, tNeg = 0;
    Object.keys(globalData).forEach(tName => {
        if (ADMINS.includes(tName)) return;
        const tObj = globalData[tName];
        Object.keys(tObj.classes || {}).forEach(cName => {
            if (classScope !== 'ALL_CLASSES' && cName !== classScope) return;
            const cls = tObj.classes[cName];
            (cls.students || []).forEach(stu => {
                const st = calculateStatsFromData(stu.id, cls);
                if (st.hasData) { tSum += st.percentage; tCnt++; tPos += st.positiveCount; tNeg += st.negativeCount; }
            });
        });
    });
    trendSeries.push({
        label: 'Today',
        fullDate: 'Current Active Board',
        avg: tCnt > 0 ? Math.round(tSum / tCnt) : overallAvg,
        pos: tPos,
        neg: tNeg
    });

    return { overallAvg, totalPos, totalNeg, evalCount, behaviorCounts, classStats, trendSeries };
}

function buildCircularGaugeSVG(percentage, totalPos, totalNeg) {
    const color = percentage >= 90 ? '#16a34a' : (percentage >= 80 ? '#eab308' : '#dc2626');
    const radius = 64;
    const circum = 2 * Math.PI * radius;
    const offset = circum - ((percentage / 100) * circum);
    const totalActs = totalPos + totalNeg;
    const posShare = totalActs > 0 ? Math.round((totalPos / totalActs) * 100) : 100;

    return `
        <svg viewBox="0 0 160 160" style="width:155px; height:155px;">
            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="14"/>
            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${color}" stroke-width="14"
                stroke-dasharray="${circum}" stroke-dashoffset="${offset}" stroke-linecap="round"
                transform="rotate(-90 80 80)"/>
            <text x="80" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#0f172a">${percentage}%</text>
            <text x="80" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="10" fill="#64748b">OVERALL SCORE</text>
        </svg>
        <div style="display:flex; gap:14px; margin-top:8px; font-size:13px; font-weight:800;">
            <span style="color:#16a34a;"><i class="fa-solid fa-thumbs-up"></i> +${totalPos} Pos</span>
            <span style="color:#dc2626;"><i class="fa-solid fa-triangle-exclamation"></i> -${totalNeg} Neg</span>
        </div>
        <div style="font-size:11px; color:#475569; margin-top:4px; font-weight:700;">Positive Ratio: ${posShare}%</div>
    `;
}

function buildTrendChartSVG(trendSeries) {
    const pts = trendSeries.slice(-10);
    const w = 620, h = 185, padL = 42, padR = 25, padT = 24, padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const coords = pts.map((p, idx) => {
        const x = pts.length === 1 ? padL + plotW / 2 : padL + (idx / (pts.length - 1)) * plotW;
        const clampedVal = Math.max(50, Math.min(100, p.avg));
        const y = padT + plotH - ((clampedVal - 50) / 50) * plotH;
        return { x, y, ...p };
    });

    const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
    const areaPoints = `${coords[0].x},${padT + plotH} ${polylinePoints} ${coords[coords.length - 1].x},${padT + plotH}`;

    let circlesHTML = '';
    coords.forEach(c => {
        const dotColor = c.avg >= 90 ? '#16a34a' : (c.avg >= 80 ? '#eab308' : '#dc2626');
        circlesHTML += `
            <circle cx="${c.x}" cy="${c.y}" r="5.5" fill="${dotColor}" stroke="#ffffff" stroke-width="2">
                <title>${c.fullDate}: ${c.avg}% (+${c.pos} / -${c.neg})</title>
            </circle>
            <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="10.5" fill="#0f172a">${c.avg}%</text>
            <text x="${c.x}" y="${padT + plotH + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="10" fill="#475569">${c.label}</text>
        `;
    });

    return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; min-width:440px;">
        <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.28"/>
                <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0"/>
            </linearGradient>
        </defs>
        <line x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}" stroke="#e2e8f0" stroke-dasharray="4"/>
        <text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="9.5" font-weight="bold" fill="#64748b">100%</text>

        <line x1="${padL}" y1="${padT + plotH * 0.4}" x2="${w - padR}" y2="${padT + plotH * 0.4}" stroke="#e2e8f0" stroke-dasharray="4"/>
        <text x="${padL - 6}" y="${padT + plotH * 0.4 + 4}" text-anchor="end" font-size="9.5" font-weight="bold" fill="#64748b">80%</text>

        <line x1="${padL}" y1="${padT + plotH}" x2="${w - padR}" y2="${padT + plotH}" stroke="#cbd5e1"/>
        <text x="${padL - 6}" y="${padT + plotH + 4}" text-anchor="end" font-size="9.5" font-weight="bold" fill="#64748b">50%</text>

        ${coords.length > 1 ? `<polygon points="${areaPoints}" fill="url(#trendGrad)"/>` : ''}
        ${coords.length > 1 ? `<polyline fill="none" stroke="#2563eb" stroke-width="3" points="${polylinePoints}"/>` : ''}
        ${circlesHTML}
    </svg>`;
}

function buildDonutPieChartSVG(totalPos, totalNeg) {
    const total = totalPos + totalNeg;
    const posPerc = total > 0 ? Math.round((totalPos / total) * 100) : 100;
    const negPerc = total > 0 ? (100 - posPerc) : 0;

    const r = 60;
    const circum = 2 * Math.PI * r;
    const posDash = (posPerc / 100) * circum;

    return `
        <svg viewBox="0 0 170 170" style="width:170px; height:170px;">
            <circle cx="85" cy="85" r="${r}" fill="none" stroke="${total > 0 ? '#ef4444' : '#e2e8f0'}" stroke-width="24"/>
            <circle cx="85" cy="85" r="${r}" fill="none" stroke="#16a34a" stroke-width="24"
                stroke-dasharray="${posDash} ${circum}" stroke-dashoffset="0"
                transform="rotate(-90 85 85)"/>
            <text x="85" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#16a34a">${posPerc}%</text>
            <text x="85" y="99" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="9.5" fill="#475569">POSITIVE</text>
        </svg>
        <div style="display:flex; justify-content:center; gap:16px; margin-top:10px; font-size:13px; font-weight:800;">
            <span style="color:#16a34a;">🟢 Positive: ${posPerc}% (${totalPos})</span>
            <span style="color:#dc2626;">🔴 Negative: ${negPerc}% (${totalNeg})</span>
        </div>
    `;
}

function refreshAdminAnalyticsHub() {
    const hub = document.getElementById('portalAdminAnalyticsHub');
    if (!hub) return;
    renderUniversalPeriodBarInSlot('hubUniversalPeriodBar');
    const scope = document.getElementById('hubClassScopeSelect').value || 'ALL_CLASSES';
    const data = computeSchoolAnalytics(scope);

    document.getElementById('kpiOverallAverage').textContent = data.overallAvg + '%';
    document.getElementById('kpiTodayInteractions').textContent = (data.totalPos + data.totalNeg);

    document.getElementById('hubGaugeContainer').innerHTML = buildCircularGaugeSVG(data.overallAvg, data.totalPos, data.totalNeg);
    document.getElementById('hubTrendChartSvgSlot').innerHTML = buildTrendChartSVG(data.trendSeries);

    const badge = document.getElementById('hubTrendStatusBadge');
    if (data.trendSeries.length >= 2) {
        const last = data.trendSeries[data.trendSeries.length - 1].avg;
        const prev = data.trendSeries[data.trendSeries.length - 2].avg;
        if (last > prev) { badge.textContent = `📈 Improving (+${last - prev}%)`; badge.className = 'percentage-badge perc-high readonly-badge'; }
        else if (last < prev) { badge.textContent = `📉 Declining (${last - prev}%)`; badge.className = 'percentage-badge perc-low readonly-badge'; }
        else { badge.textContent = `⚖️ Stable (${last}%)`; badge.className = 'percentage-badge perc-mid readonly-badge'; }
    } else {
        badge.textContent = `📊 Active (${data.overallAvg}%)`;
        badge.className = 'percentage-badge perc-high readonly-badge';
    }
}

function openAdminPieBreakdownReport() {
    currentViewName = 'analytics';
    hideAllViews();
    document.getElementById('adminAnalyticsView').style.display = 'block';
    renderNavbar();

    const hubScope = document.getElementById('hubClassScopeSelect').value || 'ALL_CLASSES';
    document.getElementById('aab-classFilter').value = hubScope;
    renderAdminPieBreakdownReport();
}

function renderAdminPieBreakdownReport() {
    renderUniversalPeriodBarInSlot('aabUniversalPeriodSlot');
    const scope = document.getElementById('aab-classFilter').value || 'ALL_CLASSES';
    const data = computeSchoolAnalytics(scope);

    document.getElementById('aab-subtitle').textContent = `${scope === 'ALL_CLASSES' ? 'All School Classes' : scope} — ${getFormattedActivePeriodLabel()}`;

    const totalActs = data.totalPos + data.totalNeg;
    const posRatio = totalActs > 0 ? Math.round((data.totalPos / totalActs) * 100) : 100;

    document.getElementById('aab-overall-perc').textContent = data.overallAvg + '%';
    document.getElementById('aab-total-pos').textContent = '+' + data.totalPos;
    document.getElementById('aab-total-neg').textContent = '-' + data.totalNeg;
    document.getElementById('aab-pos-ratio').textContent = `${posRatio}% Pos / ${100 - posRatio}% Neg`;

    document.getElementById('aab-pieChartSlot').innerHTML = buildDonutPieChartSVG(data.totalPos, data.totalNeg);

    const bTbody = document.getElementById('aab-behaviors-tbody');
    bTbody.innerHTML = '';
    behaviors.forEach(b => {
        const c = data.behaviorCounts[b.id] || 0;
        const share = totalActs > 0 ? Math.round((c / totalActs) * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;"><i class="${b.icon}" style="color:${b.color}; width:20px;"></i> ${b.title}</td>
            <td><span class="percentage-badge ${b.type === 'positive' ? 'perc-high' : 'perc-low'} readonly-badge">${b.type.toUpperCase()}</span></td>
            <td style="font-weight:bold;">${c}</td>
            <td><strong>${share}%</strong></td>
        `;
        bTbody.appendChild(tr);
    });

    const cTbody = document.getElementById('aab-classes-tbody');
    cTbody.innerHTML = '';
    Object.keys(data.classStats).forEach(cName => {
        const st = data.classStats[cName];
        const cTotal = st.pos + st.neg;
        const cPosRatio = cTotal > 0 ? Math.round((st.pos / cTotal) * 100) : 100;
        const cAvg = st.cnt > 0 ? Math.round(st.sumP / st.cnt) : 100;
        const bCls = cAvg >= 90 ? 'perc-high' : (cAvg >= 80 ? 'perc-mid' : 'perc-low');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:900; color:#1e3a8a;">${cName}</td>
            <td>${st.stuCount} Students</td>
            <td style="color:#16a34a; font-weight:bold;">+${st.pos}</td>
            <td style="color:#dc2626; font-weight:bold;">-${st.neg}</td>
            <td>
                <div class="ratio-bar-bg"><div class="ratio-bar-fill" style="width:${cPosRatio}%;"></div></div>
                <small style="font-weight:bold; color:#475569;">${cPosRatio}% Positive / ${100 - cPosRatio}% Negative</small>
            </td>
            <td><span class="percentage-badge ${bCls} readonly-badge">${cAvg}%</span></td>
        `;
        cTbody.appendChild(tr);
    });
}

function renderHomePortal() {
    appData = globalData[currentTeacher];
    const readOnly = isReadOnlyView();
    const realUser = isAdminImpersonating ? adminRealName : currentTeacher;
    const isAdminUser = ADMINS.includes(realUser);
    const isTargetAdmin = ADMINS.includes(currentTeacher);
    const pureAdmin = isPureAdminAccount();
    const roleLabel = getTeacherRoleTitle(currentTeacher);

    document.getElementById('portalWelcomeName').textContent = readOnly
        ? `Viewing Board: ${currentTeacher}`
        : `Welcome, ${currentTeacher}`;

    document.getElementById('portalRolePill').innerHTML = isTargetAdmin
        ? `<i class="fa-solid fa-crown" style="color:#fde047;"></i> ${roleLabel} (Admin)`
        : `<i class="fa-solid fa-chalkboard-user"></i> ${roleLabel}`;

    document.getElementById('portalLiveDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const subPill = document.getElementById('portalActiveSubjectPill');
    if (isTargetAdmin) {
        subPill.style.display = 'none';
    } else {
        subPill.style.display = 'inline-flex';
        populateSubjectDropdownElement('portalSubjectSwitcher', appData.subject, readOnly);
    }

    const analyticsHub = document.getElementById('portalAdminAnalyticsHub');
    if (pureAdmin) {
        analyticsHub.style.display = 'block';
        refreshAdminAnalyticsHub();
    } else {
        analyticsHub.style.display = 'none';
    }

    ['featCardBoard', 'featCardClassReport', 'featCardHonorRoll', 'featCardArchive', 'featCardDataManage'].forEach(cardId => {
        const el = document.getElementById(cardId);
        if (el) el.style.display = pureAdmin ? 'none' : 'flex';
    });
    const quickSec = document.getElementById('portalQuickClassesSection');
    if (quickSec) quickSec.style.display = pureAdmin ? 'none' : 'block';

    const classNames = Object.keys(appData.classes || {});
    let totalStudents = 0;
    let totalInteractions = 0;
    let sumPerc = 0;
    let activeStudentsCount = 0;

    if (pureAdmin) {
        Object.keys(SCHOOL_CLASSES).forEach(c => totalStudents += SCHOOL_CLASSES[c].length);
        document.getElementById('kpiTotalClasses').textContent = Object.keys(SCHOOL_CLASSES).length;
        document.getElementById('kpiTotalStudents').textContent = totalStudents;
    } else {
        classNames.forEach(cName => {
            const cls = appData.classes[cName];
            const stuList = cls.students || [];
            totalStudents += stuList.length;
            stuList.forEach(s => {
                const st = calculateStatsFromData(s.id, cls);
                totalInteractions += (st.positiveCount + st.negativeCount);
                if (st.hasData) { sumPerc += st.percentage; activeStudentsCount++; }
            });
        });
        document.getElementById('kpiTotalClasses').textContent = classNames.length;
        document.getElementById('kpiTotalStudents').textContent = totalStudents;
        document.getElementById('kpiTodayInteractions').textContent = totalInteractions;
        document.getElementById('kpiOverallAverage').textContent = activeStudentsCount > 0
            ? Math.round(sumPerc / activeStudentsCount) + '%'
            : '100%';
    }

    ['featSelectBoard', 'featSelectClassReport', 'featSelectLeaderboard', 'featSelectArchiveClass'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        sel.innerHTML = '';
        classNames.forEach(cName => {
            const opt = document.createElement('option');
            opt.value = cName; opt.textContent = cName;
            sel.appendChild(opt);
        });
        if (appData.currentClass) sel.value = appData.currentClass;
    });

    populatePortalArchiveDates(document.getElementById('featSelectArchiveClass').value);

    const adminCtrl = document.getElementById('featAdminControls');
    if (isAdminUser) {
        adminCtrl.innerHTML = `
            <button class="feat-btn" style="background:#eab308; color:#422006; flex:1; justify-content:center;" onclick="openAdminDashboard()">
                <i class="fa-solid fa-crown"></i> Teachers & Search Center
            </button>
            <button class="feat-btn" style="background:#2563eb; color:white; flex:1; justify-content:center;" onclick="openAdminPieBreakdownReport()">
                <i class="fa-solid fa-chart-pie"></i> Pos/Neg Pie Chart
            </button>
            <button class="feat-btn" style="background:#ca8a04; color:white; flex:1; justify-content:center;" onclick="openGlobalTopStudentsDirect()">
                <i class="fa-solid fa-trophy"></i> Global Top Students
            </button>
        `;
    } else {
        adminCtrl.innerHTML = `
            <span style="color:#64748b; font-size:12px; font-weight:bold; width:100%; text-align:center;">
                <i class="fa-solid fa-lock"></i> Restricted to School Principal & Academic Coordinator
            </span>
        `;
    }

    const matrix = document.getElementById('portalClassMatrix');
    matrix.innerHTML = '';
    if (!pureAdmin) {
        classNames.forEach(cName => {
            const cls = appData.classes[cName];
            const stuCount = (cls.students || []).length;
            let clsActs = 0;
            Object.values(cls.scores || {}).forEach(scObj => {
                Object.values(scObj).forEach(v => clsActs += v);
            });
            const archiveCount = Object.keys(cls.history || {}).length;

            const card = document.createElement('div');
            card.className = 'cls-matrix-card';
            card.onclick = () => {
                appData.currentClass = cName;
                isHistoryMode = false;
                historyDate = null;
                saveGlobal();
                openMainDashboard();
            };
            card.innerHTML = `
                <div class="cls-matrix-top">
                    <span class="cls-matrix-name"><i class="fa-solid fa-users-viewfinder" style="color:#2563eb;"></i> ${cName}</span>
                    <span class="cls-matrix-badge">${stuCount} Students</span>
                </div>
                <div class="cls-matrix-stats">
                    <span style="color:${clsActs > 0 ? '#16a34a' : '#64748b'};"><i class="fa-solid fa-bolt"></i> ${clsActs} Actions</span>
                    <span><i class="fa-solid fa-calendar-check"></i> ${archiveCount} Saved Days</span>
                </div>
            `;
            matrix.appendChild(card);
        });
    }
}

function populatePortalArchiveDates(cName) {
    const dateSel = document.getElementById('featSelectArchiveDate');
    if (!dateSel) return;
    dateSel.innerHTML = '';
    const cls = appData.classes && appData.classes[cName];
    const dates = cls && cls.history ? Object.keys(cls.history).sort().reverse() : [];
    if (dates.length === 0) {
        const opt = document.createElement('option');
        opt.value = ''; opt.textContent = 'No Saved Days Yet';
        dateSel.appendChild(opt);
    } else {
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = `📅 ${d}`;
            dateSel.appendChild(opt);
        });
    }
}

function launchFeature(featureType) {
    if (featureType === 'board') {
        const cls = document.getElementById('featSelectBoard').value;
        if (cls) appData.currentClass = cls;
        isHistoryMode = false; historyDate = null;
        openMainDashboard();
    } else if (featureType === 'classReport') {
        const cls = document.getElementById('featSelectClassReport').value;
        if (cls) appData.currentClass = cls;
        isHistoryMode = false; historyDate = null;
        openClassReport();
    } else if (featureType === 'leaderboard') {
        const cls = document.getElementById('featSelectLeaderboard').value;
        if (cls) appData.currentClass = cls;
        isHistoryMode = false; historyDate = null;
        openLeaderboardReport();
    } else if (featureType === 'archive') {
        const cls = document.getElementById('featSelectArchiveClass').value;
        const dt = document.getElementById('featSelectArchiveDate').value;
        if (!dt) {
            showToast("No saved archive dates for this class yet!", true);
            return;
        }
        appData.currentClass = cls;
        isHistoryMode = true;
        historyDate = dt;
        openMainDashboard();
    }
}

function exitAdminViewToPanel() {
    if (adminRealName) {
        currentTeacher = adminRealName;
        adminRealName = null;
        isAdminImpersonating = false;
        appData = globalData[currentTeacher];
        openAdminDashboard();
    }
}

function getActiveData() {
    if (!appData.currentClass || !appData.classes[appData.currentClass]) return null;
    const cls = appData.classes[appData.currentClass];
    if (isHistoryMode && historyDate && cls.history && cls.history[historyDate]) return cls.history[historyDate];
    return cls;
}

function calculateStatsFromData(sId, dObj) {
    let pos = 0, neg = 0, hasData = false;
    if (dObj && dObj.scores && dObj.scores[sId]) {
        behaviors.forEach(b => {
            const c = dObj.scores[sId][b.id] || 0;
            if (c > 0) hasData = true;
            if (b.type === 'positive') pos += c; else neg += c;
        });
    }

    let perc = 100, isManual = false;
    if (pos > 0 || neg > 0) {
        perc = 100 - (neg * 5) + (pos * 2);
        if (neg > 0 && perc > 95) perc = 95;
        if (neg === 0 && perc > 100) perc = 100;
        if (perc < 70) perc = 70;
    }

    if (dObj && dObj.manualScores && dObj.manualScores[sId] !== undefined && dObj.manualScores[sId] !== null && dObj.manualScores[sId] !== '') {
        perc = Number(dObj.manualScores[sId]);
        isManual = true;
        hasData = true;
    }

    if (dObj && dObj.quizScores && dObj.quizScores[sId]) hasData = true;
    if (dObj && dObj.projectScores && dObj.projectScores[sId]) hasData = true;

    const isNegativeOnly = (neg > 0 && pos === 0) || (isManual && perc < 70);

    let colorClass = "perc-none", text = "No Data";
    if (hasData) {
        if (isNegativeOnly || perc < 70) {
            colorClass = "perc-critical";
        } else if (perc >= 90) {
            colorClass = "perc-high";
        } else if (perc >= 80) {
            colorClass = "perc-mid";
        } else {
            colorClass = "perc-low";
        }
        if (isManual) colorClass += " perc-manual";
        text = `${isManual ? '✎ ' : ''}${perc}%${pos > 0 ? ' (+' + pos + ')' : ''}${neg > 0 && pos === 0 ? ' (-' + neg + ')' : ''}`;
    }
    return { positiveCount: pos, negativeCount: neg, percentage: perc, colorClass, text, netScore: pos - neg, isManual, hasData, isNegativeOnly };
}

function calculateStats(sId) { return calculateStatsFromData(sId, getActiveData()); }

function renderNavbar() {
    const nav = document.getElementById('navbar');
    nav.innerHTML = '';
    const readOnly = isReadOnlyView();
    const pureAdmin = isPureAdminAccount();

    const homeBtn = document.createElement('button');
    homeBtn.className = `home-nav-btn ${currentViewName === 'home' ? 'active-home' : ''}`;
    homeBtn.innerHTML = '<i class="fa-solid fa-house"></i> Home Portal';
    homeBtn.onclick = openHomePortal;
    nav.appendChild(homeBtn);

    if (!pureAdmin) {
        const div = document.createElement('div');
        div.className = 'nav-divider';
        nav.appendChild(div);

        Object.keys(appData.classes).forEach(cName => {
            const b = document.createElement('button');
            b.className = `class-tab ${(currentViewName === 'board' && appData.currentClass === cName) ? 'active' : ''}`;
            b.textContent = cName;
            b.onclick = () => {
                isHistoryMode = false;
                historyDate = null;
                appData.currentClass = cName;
                saveGlobal();
                openMainDashboard();
            };
            nav.appendChild(b);
        });
    }

    let realUser = isAdminImpersonating ? adminRealName : currentTeacher;
    if (ADMINS.includes(realUser)) {
        if (isAdminImpersonating) {
            const ex = document.createElement('button');
            ex.className = 'nav-btn'; ex.style.background = '#f97316'; ex.style.marginLeft = 'auto';
            ex.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Exit Teacher View';
            ex.onclick = exitAdminViewToPanel;
            nav.appendChild(ex);
        } else {
            const ad = document.createElement('button');
            ad.className = 'nav-btn'; ad.style.background = '#eab308'; ad.style.color = '#422006'; ad.style.marginLeft = 'auto';
            ad.innerHTML = window.__smRole === 'counselor' ? '<i class="fa-solid fa-heart"></i> Reports Center' : '<i class="fa-solid fa-crown"></i> Admin Center';
            ad.onclick = openAdminDashboard;
            nav.appendChild(ad);

            const pieBtn = document.createElement('button');
            pieBtn.className = 'nav-btn'; pieBtn.style.background = '#059669';
            pieBtn.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Analytics & Pie Chart';
            pieBtn.onclick = openAdminPieBreakdownReport;
            nav.appendChild(pieBtn);

            const topBtn = document.createElement('button');
            topBtn.className = 'nav-btn'; topBtn.style.background = '#ca8a04';
            topBtn.innerHTML = '<i class="fa-solid fa-trophy"></i> Global Top Students';
            topBtn.onclick = openGlobalTopStudentsDirect;
            nav.appendChild(topBtn);
        }
    }

    if (!readOnly && !pureAdmin) {
        const imp = document.createElement('button');
        imp.className = 'nav-btn'; imp.style.background = '#8b5cf6';
        if (!ADMINS.includes(realUser)) imp.style.marginLeft = 'auto';
        imp.innerHTML = '<i class="fa-solid fa-file-import"></i> Import';
        imp.onclick = () => document.getElementById('fileUpload').click();
        nav.appendChild(imp);
    }

    smNavExtras(nav);
    const out = document.createElement('button');
    out.className = 'nav-btn'; out.style.background = '#ef4444';
    out.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Logout';
    out.onclick = () => { delStore(smk7('SMART_PORTAL_GENERAL_USER')); document.getElementById('dashboardView').style.display = 'none'; document.getElementById('loginView').style.display = 'flex'; clearPinBox(); };
    }

function getClassBulkCount(behaviorId) {
    const act = getActiveData();
    if (!act) return 0;
    const students = appData.classes[appData.currentClass].students || [];
    if (students.length === 0) return 0;
    let minCount = Infinity;
    students.forEach(s => {
        const c = (act.scores && act.scores[s.id] && act.scores[s.id][behaviorId]) || 0;
        if (c < minCount) minCount = c;
    });
    return minCount === Infinity ? 0 : minCount;
}

function applyBulkBehavior(behaviorObj, mode) {
    if (isReadOnlyView()) {
        showToast("وضع المشاهدة فقط: لا يمكن تعديل تفاعلات المعلم", true);
        return;
    }
    const act = getActiveData();
    if (!act) return;
    if (!act.scores) act.scores = {};
    const students = appData.classes[appData.currentClass].students || [];
    if (students.length === 0) return;

    students.forEach(s => {
        if (!act.scores[s.id]) act.scores[s.id] = {};
        if (mode === 'add') {
            act.scores[s.id][behaviorObj.id] = (act.scores[s.id][behaviorObj.id] || 0) + 1;
        } else {
            if (act.scores[s.id][behaviorObj.id] && act.scores[s.id][behaviorObj.id] > 0) {
                act.scores[s.id][behaviorObj.id] -= 1;
                if (act.scores[s.id][behaviorObj.id] <= 0) delete act.scores[s.id][behaviorObj.id];
            }
        }
    });

    saveGlobal();
    renderClass();
    if (mode === 'add') showToast(`Added "${behaviorObj.title}" (+1) to ALL students`, false);
    else showToast(`Removed "${behaviorObj.title}" (-1) from ALL students`, true);
}

async function clearAllClassInteractions() {
    if (isReadOnlyView()) return;
    const act = getActiveData();
    if (!act) return;
    const targetLabel = isHistoryMode ? `Archive Day (${historyDate})` : `Class (${appData.currentClass})`;
    const okc = await SSD.confirm('Clear all interactions?', `Delete every interaction for the entire class in ${targetLabel}?\n\nهذا سيمسح جميع التفاعلات للفصل بالكامل.`, { danger: true, okLabel: 'Yes, clear all' });
    if (!okc) return;

    act.scores = {};
    act.manualScores = {};
    saveGlobal();
    renderClass();
    showToast(`Cleared all interactions for ${appData.currentClass}`, true);
}

function buildBulkBar() {
    const bulkBar = document.getElementById('bulkActionBar');
    if (isReadOnlyView()) {
        bulkBar.style.display = 'none';
        return;
    }
    bulkBar.style.display = 'flex';

    const cont = document.getElementById('bulkIconsContainer');
    cont.innerHTML = '';
    behaviors.forEach(b => {
        const sharedCount = getClassBulkCount(b.id);
        const btn = document.createElement('button');
        btn.className = `bulk-btn ${sharedCount > 0 ? 'active' : ''}`;
        btn.title = `${b.title} — Left-Click/Tap: ${bulkMode.toUpperCase()} | Right-Click/Long-Press: REMOVE (-1)`;
        btn.innerHTML = `<i class="${b.icon}" style="color:${b.color};"></i>`;

        if (sharedCount > 0) {
            const bdg = document.createElement('span');
            bdg.className = 'bulk-badge';
            bdg.textContent = sharedCount;
            bdg.title = "Click badge to remove (-1) from all students";
            bdg.addEventListener('click', (e) => {
                e.stopPropagation();
                applyBulkBehavior(b, 'remove');
            });
            btn.appendChild(bdg);
        }

        attachSmartInteraction(
            btn,
            () => applyBulkBehavior(b, bulkMode),
            () => applyBulkBehavior(b, 'remove')
        );

        cont.appendChild(btn);
    });
}

function toggleBulkMode() {
    if (isReadOnlyView()) return;
    const b = document.getElementById('bulkModeBtn');
    bulkMode = (bulkMode === 'add') ? 'remove' : 'add';
    b.style.background = (bulkMode === 'add') ? '#10b981' : '#ef4444';
    b.textContent = (bulkMode === 'add') ? 'Tap Mode: ADD (+)' : 'Tap Mode: REMOVE (-)';
}

function modifyStudentBehavior(student, behaviorObj, delta) {
    if (isReadOnlyView()) {
        showToast("وضع المشاهدة فقط: لا يمكن تعديل تفاعلات المعلم", true);
        return;
    }
    const act = getActiveData();
    if (!act) return;
    if (!act.scores) act.scores = {};
    if (!act.scores[student.id]) act.scores[student.id] = {};

    const current = act.scores[student.id][behaviorObj.id] || 0;
    if (delta > 0) {
        act.scores[student.id][behaviorObj.id] = current + 1;
        saveGlobal();
        renderClass();
        showToast(`${student.name}: +1 ${behaviorObj.title}`, false);
    } else if (delta < 0) {
        if (current > 0) {
            act.scores[student.id][behaviorObj.id] = current - 1;
            if (act.scores[student.id][behaviorObj.id] <= 0) delete act.scores[student.id][behaviorObj.id];
            saveGlobal();
            renderClass();
            showToast(`${student.name}: Removed -1 ${behaviorObj.title}`, true);
        } else {
            showToast(`${student.name} has 0 in ${behaviorObj.title}`, true);
        }
    }
}

function renderClass() {
    const readOnly = isReadOnlyView();
    updateHistoryDropdown();
    buildBulkBar();

    const roBanner = document.getElementById('readOnlyBanner');
    if (readOnly) {
        roBanner.style.display = 'flex';
        document.getElementById('roTeacherName').textContent = `${currentTeacher} - ${appData.subject || 'Science'}`;
        document.getElementById('headerClassActions').style.display = 'none';
        document.getElementById('interactionHint').textContent = '👁️ View-Only Mode (Click student name or Class Report to view/print)';
        document.getElementById('saveDatePicker').style.display = 'none';
        document.getElementById('saveDayBtn').style.display = 'none';
        document.getElementById('newStudentName').style.display = 'none';
        document.getElementById('addStudentBtn').style.display = 'none';
    } else {
        roBanner.style.display = 'none';
        document.getElementById('headerClassActions').style.display = 'flex';
        document.getElementById('interactionHint').textContent = '💡 Click/Tap = Add (+1) | Right-Click or Long-Press = Remove (-1)';
        document.getElementById('saveDatePicker').style.display = 'inline-block';
        document.getElementById('saveDayBtn').style.display = isHistoryMode ? 'none' : 'inline-flex';
        document.getElementById('newStudentName').style.display = 'inline-block';
        document.getElementById('addStudentBtn').style.display = 'inline-flex';
    }

    const app = document.getElementById('app');
    app.innerHTML = '';
    const act = getActiveData();
    if (!act) return;

    document.getElementById('classTitle').textContent = appData.currentClass + (isHistoryMode ? ` (📅 Archive: ${historyDate})` : '');
    const hb = document.getElementById('historyBanner');
    if (isHistoryMode) {
        hb.style.display = 'flex';
        if (readOnly) {
            hb.innerHTML = `
                <div><i class="fa-solid fa-calendar-day"></i> <strong>Archive View (${historyDate}):</strong> استعراض سجل يوم سابق (للقراءة فقط).</div>
                <button class="ctrl-btn" style="background:#0f172a; padding:6px 12px;" onclick="viewHistory('')"><i class="fa-solid fa-rotate-left"></i> العودة لليوم الحالي</button>
            `;
        } else {
            hb.innerHTML = `
                <div><i class="fa-solid fa-pen-to-square"></i> <strong>History Edit Mode (${historyDate}):</strong> يمكنك الآن تعديل أي تفاعل أو درجة في هذا اليوم السابق ويتم الحفظ تلقائياً.</div>
                <div style="display:flex; gap:8px;">
                    <button class="ctrl-btn" style="background:#dc2626; padding:6px 12px;" onclick="deleteHistoryDay('${historyDate}')"><i class="fa-solid fa-trash"></i> Delete This Day</button>
                    <button class="ctrl-btn" style="background:#0f172a; padding:6px 12px;" onclick="viewHistory('')"><i class="fa-solid fa-rotate-left"></i> Back to Current Board</button>
                </div>
            `;
        }
    } else {
        hb.style.display = 'none';
    }

    const students = appData.classes[appData.currentClass].students || [];
    students.forEach(student => {
        const isStar = (act.scores && act.scores[student.id] && act.scores[student.id]['star'] > 0);
        const st = calculateStats(student.id);
        const isNegOnly = st.isNegativeOnly;

        const card = document.createElement('div');
        card.className = `student-card ${isStar ? 'star-card' : ''} ${isNegOnly ? 'neg-only-card' : ''}`;

        const qz = (act.quizScores && act.quizScores[student.id]) || '';
        const pr = (act.projectScores && act.projectScores[student.id]) || '';

        const header = document.createElement('div');
        header.className = 'student-header';
        header.innerHTML = `
            <div class="student-info">
                <div class="student-name ${isStar ? 'is-star' : ''} ${isNegOnly ? 'is-neg-only' : ''}" onclick="openStudentReport(${student.id}, '${student.name.replace(/'/g, "\\'")}')" title="Click to open student report & write comment">
                    ${isNegOnly ? '<i class="fa-solid fa-triangle-exclamation" style="color:#dc2626;"></i> ' : ''}${student.name} ${isStar ? '⭐' : ''}
                </div>
                <div><small style="display:block;font-size:10px;color:#64748b;">QUIZ</small><input class="score-input" value="${qz}" ${readOnly ? 'disabled' : ''} onchange="updateQ(${student.id}, this.value)"></div>
                <div><small style="display:block;font-size:10px;color:#64748b;">PROJECT</small><input class="score-input" value="${pr}" ${readOnly ? 'disabled' : ''} onchange="updateP(${student.id}, this.value)"></div>
                <span class="percentage-badge ${st.colorClass} ${readOnly ? 'readonly-badge' : ''}" onclick="${readOnly ? '' : `manualPerc(${student.id}, '${student.name.replace(/'/g, "\\'")}')`}" title="${readOnly ? 'Behavior Score' : 'Click to set any custom percentage (even below 70%)'}">${st.text}</span>
                ${readOnly ? '' : `<button class="manual-edit-btn" onclick="manualPerc(${student.id}, '${student.name.replace(/'/g, "\\'")}')" title="Set manual percentage (0 - 100)"><i class="fa-solid fa-sliders"></i> % Edit</button>`}
            </div>
            ${readOnly ? '' : `
            <div style="display:flex; gap:6px;">
                <button class="ctrl-btn" style="background:#fef08a; color:#854d0e; padding:6px 10px;" title="Reset all student interactions" onclick="resetStu(${student.id})"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="ctrl-btn" style="background:#fee2e2; color:#dc2626; padding:6px 10px;" title="Delete student" onclick="delStu(${student.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
            `}
        `;
        card.appendChild(header);

        const iconsDiv = document.createElement('div');
        iconsDiv.className = 'icons-container';
        behaviors.forEach(b => {
            const count = (act.scores && act.scores[student.id] && act.scores[student.id][b.id]) || 0;
            const btn = document.createElement('button');
            btn.className = `icon-btn ${count > 0 ? 'active' : ''} ${readOnly ? 'readonly-icon' : ''}`;
            btn.title = readOnly ? `${b.title}: ${count}` : `${b.title} (Left-Click/Tap: +1 | Right-Click/Hold: -1)`;
            btn.innerHTML = `<i class="${b.icon}" style="color:${b.color};"></i>`;

            if (count > 0) {
                const bdg = document.createElement('span');
                bdg.className = 'badge';
                bdg.textContent = count;
                if (!readOnly) {
                    bdg.title = "Click badge to remove (-1)";
                    bdg.addEventListener('click', (e) => {
                        e.stopPropagation();
                        modifyStudentBehavior(student, b, -1);
                    });
                }
                btn.appendChild(bdg);
            }

            if (!readOnly) {
                attachSmartInteraction(
                    btn,
                    () => modifyStudentBehavior(student, b, +1),
                    () => modifyStudentBehavior(student, b, -1)
                );
            }

            iconsDiv.appendChild(btn);
        });
        card.appendChild(iconsDiv);
        app.appendChild(card);
    });

    renderLeaderboard();
}

function updateQ(id, val) { if (isReadOnlyView()) return; const a = getActiveData(); if (!a.quizScores) a.quizScores = {}; a.quizScores[id] = val; saveGlobal(); renderClass(); }
function updateP(id, val) { if (isReadOnlyView()) return; const a = getActiveData(); if (!a.projectScores) a.projectScores = {}; a.projectScores[id] = val; saveGlobal(); renderClass(); }
async function manualPerc(id, name) {
    if (isReadOnlyView()) return;
    const a = getActiveData(); if (!a.manualScores) a.manualScores = {};
    const currentVal = (a.manualScores[id] !== undefined) ? a.manualScores[id] : '';
    const raw = await SSD.prompt(`Manual percentage — ${name}`, {
        message: `Set a manual % from 0 to 100 (below 70 is allowed, e.g. 50 or 60).\n\nاترك الخانة فارغة واضغط Save للعودة إلى الحساب التلقائي.`,
        initial: String(currentVal || ''),
        placeholder: 'e.g. 75 — empty = back to Auto',
        hint: 'Empty field + Save = return to automatic calculation',
        okLabel: 'Save',
        requireNonEmpty: false
    });
    if (raw === null) return;
    const cleaned = raw.trim().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('%', '');
    if (cleaned === '') {
        delete a.manualScores[id];
        showToast(`Returned ${name} to Auto %`, false);
    } else {
        let n = parseFloat(cleaned);
        if (!isNaN(n)) {
            n = Math.max(0, Math.min(100, Math.round(n)));
            a.manualScores[id] = n;
            showToast(`Set ${name} manual score to ${n}%`, n < 70);
        }
    }
    saveGlobal(); renderClass();
}
async function resetStu(id) {
    if (isReadOnlyView()) return;
    const okr = await SSD.confirm('Reset student interactions?', 'Clear ALL interactions of this student?\n\nهل تريد مسح جميع تفاعلات هذا الطالب؟', { danger: true, okLabel: 'Yes, reset' });
    if (!okr) return;
    const a = getActiveData();
    if (a.scores) delete a.scores[id];
    if (a.quizScores) delete a.quizScores[id];
    if (a.projectScores) delete a.projectScores[id];
    if (a.manualScores) delete a.manualScores[id];
    saveGlobal(); renderClass();
    showToast("Student interactions reset", true);
}
async function delStu(id) {
    if (isReadOnlyView()) return;
    if (!(await SSD.confirm('Remove student', 'Delete this student from the class?', { danger: true, okLabel: 'Delete' }))) return;
    appData.classes[appData.currentClass].students = appData.classes[appData.currentClass].students.filter(s => s.id !== id);
    saveGlobal(); renderClass();
}
function addStudent() {
    if (isReadOnlyView()) return;
    const inp = document.getElementById('newStudentName');
    if (inp.value.trim()) {
        appData.classes[appData.currentClass].students.push({ id: Date.now(), name: inp.value.trim() });
        inp.value = ''; saveGlobal(); renderClass(); buildAutocompleteList();
    }
}
async function promptNewCustomClass() {
    if (isReadOnlyView()) return;
    const n = await SSD.prompt('New class', { message: 'Give the new classroom a name:', placeholder: 'e.g. 5C', okLabel: 'Create class' });
    if (n && n.trim()) {
        appData.classes[n.trim()] = { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, history: {} };
        appData.currentClass = n.trim();
        saveGlobal();
        openMainDashboard();
    }
}
async function deleteCurrentClass() {
    if (isReadOnlyView()) return;
    if (await SSD.confirm('Delete class', `Permanently delete "${appData.currentClass}" and all its records?`, { danger: true, okLabel: 'Delete class' })) {
        delete appData.classes[appData.currentClass];
        appData.currentClass = Object.keys(appData.classes)[0] || "";
        saveGlobal(); renderNavbar(); renderClass();
    }
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    const students = appData.classes[appData.currentClass].students || [];
    let ranked = students.map(s => {
        const st = calculateStats(s.id);
        return {
            id: s.id,
            name: s.name,
            pos: st.positiveCount,
            neg: st.negativeCount,
            netScore: st.netScore,
            perc: st.percentage,
            hasData: st.hasData,
            text: st.text
        };
    }).filter(x => x.hasData && x.perc >= 90 && x.netScore > 0);

    ranked.sort(compareTopStudentsByNetScore);

    ranked.slice(0, 10).forEach((x, i) => {
        const li = document.createElement('li');
        li.className = 'lb-item';
        li.innerHTML = `
            <span style="cursor:pointer; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" onclick="openStudentReport(${x.id}, '${x.name.replace(/'/g, "\\'")}')" title="+${x.pos} Pos / -${x.neg} Neg (Net: +${x.netScore})">#${i+1} ${x.name}</span>
            <span class="net-score-pill" title="Positives (${x.pos}) - Negatives (${x.neg})">Net: +${x.netScore}</span>
            <span class="percentage-badge perc-high readonly-badge">${x.perc}%</span>
        `;
        list.appendChild(li);
    });

    if (ranked.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:#64748b; font-size:12px; padding:8px;">No students qualify yet (&ge;90% &amp; Pos &gt; Neg)</li>';
    }
}

async function saveAndClearDay() {
    if (isReadOnlyView()) return;
    if (isHistoryMode) {
        showToast(`All edits to (${historyDate}) are already auto-saved!`, false);
        return;
    }
    const d = document.getElementById('saveDatePicker').value || new Date().toISOString().split('T')[0];
    const cls = appData.classes[appData.currentClass];
    if (!cls.history) cls.history = {};

    const confirmMsg = cls.history[d]
        ? `An entry for (${d}) is already archived.\nReplace it, save today's interactions and start a new empty board?\n\nستتم استبدال السجل المحفوظ ليوم (${d}).`
        : `Save today's interactions under (${d}) and clear the board for a new day?\n\nحفظ تفاعلات اليوم وإفراغ السبورة ليوم جديد؟`;

    if (!(await SSD.confirm(cls.history[d] ? 'Replace archived day?' : 'Save & clear the board?', confirmMsg, { okLabel: 'Save day', danger: cls.history[d] === undefined ? false : true }))) {
        showToast("تم إلغاء الحفظ (لم يتم مسح السبورة)", false);
        return;
    }

    cls.history[d] = {
        scores: JSON.parse(JSON.stringify(cls.scores || {})),
        quizScores: JSON.parse(JSON.stringify(cls.quizScores || {})),
        projectScores: JSON.parse(JSON.stringify(cls.projectScores || {})),
        manualScores: JSON.parse(JSON.stringify(cls.manualScores || {})),
        comments: JSON.parse(JSON.stringify(cls.comments || {}))
    };
    cls.scores = {}; cls.quizScores = {}; cls.projectScores = {}; cls.manualScores = {}; cls.comments = {};
    saveGlobal();
    renderClass();
    showToast(`Saved day ${d} & cleared board!`, false);
}

async function deleteHistoryDay(d) {
    if (isReadOnlyView()) return;
    if (!(await SSD.confirm('Delete archived day', `Permanently delete the archive of (${d})?`, { danger: true, okLabel: 'Delete forever' }))) return;
    const cls = appData.classes[appData.currentClass];
    if (cls && cls.history) delete cls.history[d];
    isHistoryMode = false;
    historyDate = null;
    saveGlobal();
    renderClass();
    showToast(`Deleted archive ${d}`, true);
}

function updateHistoryDropdown() {
    const sel = document.getElementById('historyDropdown');
    sel.innerHTML = '<option value="">🟢 Current Active Board (Today)</option>';
    const cls = appData.classes[appData.currentClass];
    if (!cls || !cls.history) return;
    const labelSuffix = isReadOnlyView() ? '(View Only)' : '(Click to View / Edit)';
    Object.keys(cls.history).sort().reverse().forEach(d => {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = `📅 Saved Day: ${d} ${labelSuffix}`;
        sel.appendChild(o);
    });
    sel.value = isHistoryMode ? historyDate : "";
}
function viewHistory(d) {
    isHistoryMode = !!d;
    historyDate = d || null;
    renderClass();
    if (isHistoryMode) {
        showToast(isReadOnlyView() ? `Viewing Archive (${d})` : `Opened Archive (${d}) for viewing & editing`, false);
    }
}

function getAverages(sId) {
    const cls = appData.classes[appData.currentClass];
    const dates = Object.keys(cls.history || {}).sort().reverse();
    let wS = 0, wC = 0, mS = 0, mC = 0;
    const cur = calculateStatsFromData(sId, cls);
    if (cur.hasData) { wS += cur.percentage; wC++; mS += cur.percentage; mC++; }
    dates.forEach((d, i) => {
        const st = calculateStatsFromData(sId, cls.history[d]);
        if (st.hasData) {
            if (i < 7) { wS += st.percentage; wC++; }
            if (i < 30) { mS += st.percentage; mC++; }
        }
    });
    return { weekly: wC ? Math.round(wS/wC)+'%' : '-', monthly: mC ? Math.round(mS/mC)+'%' : '-' };
}

function closeReports() {
    if (isPureAdminAccount()) openHomePortal();
    else openMainDashboard();
}

function saveStudentComment(val) {
    const printBox = document.getElementById('r-teacherCommentPrint');
    if (printBox) printBox.textContent = val.trim() || 'No additional comments.';
    if (isReadOnlyView() || !activeReportStudentId) return;
    const act = getActiveData();
    if (!act) return;
    if (!act.comments) act.comments = {};
    act.comments[activeReportStudentId] = val;
    saveGlobal();
}

// ================= REPORTS WITH UNIVERSAL PERIOD FILTER =================
function openStudentReport(sId, sName) {
    currentViewName = 'studentReport';
    activeReportStudentId = sId;
    activeGlobalStudentName = sName;
    if (isHistoryMode && historyDate) {
        activeAnalyticsPeriod = 'today';
        selectedSpecificDate = historyDate;
    }
    hideAllViews();
    document.getElementById('studentReportView').style.display = 'block';
    renderNavbar();
    renderStudentReportContent();
}

function renderStudentReportContent() {
    renderUniversalPeriodBarInSlot('stuReportPeriodBar');
    const sId = activeReportStudentId;
    const sName = activeGlobalStudentName;
    const cls = appData.classes[appData.currentClass];
    let realUser = isAdminImpersonating ? adminRealName : currentTeacher;
    document.getElementById('btnOpenGlobal').style.display = ADMINS.includes(realUser) ? 'inline-flex' : 'none';
    document.getElementById('r-studentName').textContent = sName;
    document.getElementById('r-meta').textContent = `${appData.currentClass} | ${appData.subject} | ${currentTeacher} — [${getFormattedActivePeriodLabel()}]`;

    const pSt = calculateStudentPeriodStatsInClass(sId, cls);
    const av = getAverages(sId);

    document.getElementById('r-pos-score').textContent = pSt.positiveCount;
    document.getElementById('r-neg-score').textContent = pSt.negativeCount;
    document.getElementById('r-quiz-score').textContent = pSt.latestQuiz;
    document.getElementById('r-project-score').textContent = pSt.latestProj;
    document.getElementById('r-weekly-avg').textContent = av.weekly;
    document.getElementById('r-monthly-avg').textContent = av.monthly;
    document.getElementById('r-perc').innerHTML = pSt.text;

    const act = getActiveData();
    const savedComment = (act && act.comments && act.comments[sId]) || pSt.latestComment || '';
    const commentInput = document.getElementById('r-teacherCommentInput');
    const commentPrint = document.getElementById('r-teacherCommentPrint');
    commentInput.value = savedComment;
    commentInput.disabled = isReadOnlyView();
    commentPrint.textContent = savedComment.trim() || 'No additional comments.';

    let pH = '<h4>Positive Behaviors</h4>', nH = '<h4>Needs Improvement</h4>';
    behaviors.forEach(b => {
        const c = pSt.behaviorMap[b.id] || 0;
        if (c > 0) {
            const li = `<li style="padding:6px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between;"><span>${b.title}</span><strong>${c}</strong></li>`;
            if (b.type === 'positive') pH += li; else nH += li;
        }
    });
    document.getElementById('r-positive-list').innerHTML = pH;
    document.getElementById('r-negative-list').innerHTML = nH;
}

function openClassReport() {
    currentViewName = 'classReport';
    if (isHistoryMode && historyDate) {
        activeAnalyticsPeriod = 'today';
        selectedSpecificDate = historyDate;
    }
    hideAllViews();
    document.getElementById('classReportView').style.display = 'block';
    renderNavbar();
    renderClassReportContent();
}

function renderClassReportContent() {
    renderUniversalPeriodBarInSlot('clsReportPeriodBar');
    const cls = appData.classes[appData.currentClass];
    document.getElementById('cr-className').textContent = `${appData.currentClass} — ${appData.subject} (${currentTeacher}) | ${getFormattedActivePeriodLabel()}`;
    const tb = document.getElementById('cr-table-body');
    tb.innerHTML = '';

    (cls.students || []).forEach(s => {
        const pSt = calculateStudentPeriodStatsInClass(s.id, cls);
        const av = getAverages(s.id);
        const tr = document.createElement('tr');
        if (pSt.isNegativeOnly) tr.className = 'row-neg-only';
        tr.innerHTML = `<td><strong>${pSt.isNegativeOnly ? '⚠️ ' : ''}${s.name}</strong></td><td>${pSt.latestQuiz}</td><td>${pSt.latestProj}</td><td style="color:green;font-weight:bold;">+${pSt.positiveCount}</td><td style="color:red;font-weight:bold;">-${pSt.negativeCount}</td><td>${av.weekly}</td><td>${av.monthly}</td><td><span class="percentage-badge ${pSt.colorClass} readonly-badge">${pSt.text}</span></td>`;
        tb.appendChild(tr);
    });
}

function openLeaderboardReport() {
    currentViewName = 'leaderboardReport';
    hideAllViews();
    document.getElementById('leaderboardReportView').style.display = 'block';
    renderNavbar();
    renderLeaderboardReportContent();
}

function renderLeaderboardReportContent() {
    renderUniversalPeriodBarInSlot('lbrReportPeriodBar');
    const cls = appData.classes[appData.currentClass];
    document.getElementById('lbr-className').textContent = `${appData.currentClass} — ${appData.subject} (${currentTeacher}) | ${getFormattedActivePeriodLabel()}`;
    const tb = document.getElementById('lbr-table-body');
    tb.innerHTML = '';

    let ranked = (cls.students || []).map(s => {
        const pSt = calculateStudentPeriodStatsInClass(s.id, cls);
        return {
            name: s.name,
            pos: pSt.positiveCount,
            neg: pSt.negativeCount,
            netScore: pSt.netScore,
            perc: pSt.percentage,
            hasData: pSt.hasData
        };
    }).filter(x => x.hasData && x.perc >= 90 && x.netScore > 0);

    ranked.sort(compareTopStudentsByNetScore);

    if (ranked.length === 0) {
        tb.innerHTML = `<tr><td colspan="6" style="color:#64748b; padding:20px;">No students currently meet the Honor Roll criteria (&ge; 90% and Positives &gt; Negatives) for this period.</td></tr>`;
        return;
    }

    ranked.slice(0, 10).forEach((x, i) => {
        let medal = `#${i+1}`;
        if (i === 0) medal = '🥇 #1';
        else if (i === 1) medal = '🥈 #2';
        else if (i === 2) medal = '🥉 #3';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:900;">${medal}</td>
            <td><strong>${x.name}</strong></td>
            <td style="color:#16a34a; font-weight:bold;">+${x.pos}</td>
            <td style="color:#dc2626; font-weight:bold;">-${x.neg}</td>
            <td><span class="net-score-pill">Net: +${x.netScore}</span></td>
            <td><span class="percentage-badge perc-high readonly-badge">${x.perc}%</span></td>
        `;
        tb.appendChild(tr);
    });
}

function buildAutocompleteList() {
    const dl = document.getElementById('allStudentsList'); dl.innerHTML = '';
    let set = new Set();
    Object.values(SCHOOL_CLASSES).forEach(arr => arr.forEach(n => set.add(n)));
    Object.values(globalData).forEach(t => Object.values(t.classes||{}).forEach(c => (c.students||[]).forEach(s => set.add(s.name))));
    Array.from(set).sort().forEach(n => { const o = document.createElement('option'); o.value = n; dl.appendChild(o); });
}

function openAdminDashboard() {
    currentViewName = 'admin';
    hideAllViews(); document.getElementById('adminDashboardView').style.display = 'block';
    renderNavbar();

    const cSel = document.getElementById('adminClassSelect'); cSel.innerHTML = '';
    const topCSel = document.getElementById('adminTopClassSelect');
    topCSel.innerHTML = '<option value="ALL_CLASSES">🏫 All School Classes (كل الفصول)</option>';

    Object.keys(SCHOOL_CLASSES).forEach(c => {
        const o1 = document.createElement('option'); o1.value = c; o1.textContent = c; cSel.appendChild(o1);
        const o2 = document.createElement('option'); o2.value = c; o2.textContent = c; topCSel.appendChild(o2);
    });

    fillSubFilter('adminTopSubjectSelect');

    const tb = document.getElementById('admin-table-body'); tb.innerHTML = '';
    const isAdmRole = window.__smRole === 'admin';
    const escQ = s => String(s).replace(/'/g, "\\'");
    Object.keys(TEACHER_PINS).forEach(tName => {
        if (ADMINS.includes(tName)) return;
        const acctRole = (window.__smRoles && window.__smRoles[tName]) || 'teacher';
        const isTeacherRole = acctRole === 'teacher';
        const tObj = globalData[tName] || { subject: DEFAULT_TEACHER_SUBJECTS[tName] || 'Science', classes: {} };
        let acts = 0;
        Object.values(tObj.classes||{}).forEach(c => Object.values(c.scores||{}).forEach(s => Object.values(s).forEach(v => acts += v)));
        const nameCell = isTeacherRole
            ? `<td style="font-weight:bold;color:#2563eb;cursor:pointer;" title="View (read-only)" onclick="impersonate('${escQ(tName)}')"><i class="fa-solid fa-eye"></i> ${tName}</td>`
            : `<td style="font-weight:bold;color:#0ea5e9;"><i class="fa-solid fa-user"></i> ${tName}</td>`;
        const roleCell = `<td>${isTeacherRole ? (tObj.subject || 'Science') : acctRole}</td>`;
        const clsCell = `<td>${isTeacherRole ? (Object.keys(tObj.classes||{}).length || 8) + ' Classes' : '\u2014'}</td>`;
        const actCell = `<td>${isTeacherRole ? acts + ' Actions' : '\u2014'}</td>`;
        let btns = '';
        if (isTeacherRole) btns += `<button class="ctrl-btn" style="padding:5px 10px;" title="View board, students and reports (read-only)" onclick="impersonate('${escQ(tName)}')"><i class="fa-solid fa-eye"></i> View</button> `;
        if (isAdmRole && isTeacherRole) {
            btns += `<button class="ctrl-btn" style="padding:5px 10px;background:#059669" title="Add a class for this teacher" onclick="smAdminAddClass('${escQ(tName)}')"><i class="fa-solid fa-plus"></i> Class</button> `;
            btns += `<button class="ctrl-btn" style="padding:5px 10px;background:#0891b2" title="Set this teacher's subject" onclick="smAdminSetSubject('${escQ(tName)}')"><i class="fa-solid fa-book"></i> Subject</button> `;
        }
        if (isAdmRole) btns += `<button class="ctrl-btn" style="padding:5px 10px;background:#d97706" title="Reset PIN" onclick="smAdminResetPin('${escQ(tName)}')"><i class="fa-solid fa-key"></i> PIN</button> `;
        if (isTeacherRole) btns += `<button class="ctrl-btn" style="padding:5px 10px;background:#7c3aed" title="Export roster package for this teacher" onclick="smExportRoster('${escQ(tName)}')"><i class="fa-solid fa-file-export"></i> Roster</button> `;
        if (isAdmRole) btns += `<button class="ctrl-btn" style="padding:5px 10px;background:#dc2626" title="Remove account" onclick="smRemoveTeacher('${escQ(tName)}')"><i class="fa-solid fa-user-minus"></i></button>`;
        const tr = document.createElement('tr');
        tr.innerHTML = nameCell + roleCell + clsCell + actCell + `<td class="no-print">${btns}</td>`;
        tb.appendChild(tr);
    });
}

function impersonate(tName) {
    if (window.__smRole === 'counselor') { try { showToast('Counselor accounts view student reports only.'); } catch (e) {} return; }
    if (!adminRealName) adminRealName = currentTeacher;
    if (tName === adminRealName) {
        currentTeacher = adminRealName;
        adminRealName = null;
        isAdminImpersonating = false;
        openHomePortal();
        return;
    } else {
        currentTeacher = tName;
        isAdminImpersonating = true;
    }
    if (!globalData[currentTeacher]) {
        globalData[currentTeacher] = { subject: DEFAULT_TEACHER_SUBJECTS[tName] || "Science", classes: {}, currentClass: "" };
        populateAllSchoolClasses(globalData[currentTeacher]);
    }
    openMainDashboard();
}

function fillSubFilter(id) {
    const s = document.getElementById(id);
    if (!s) return;
    const oldVal = s.value;
    s.innerHTML = '<option value="ALL">🌐 All Subjects Combined (متوسط كل المواد)</option>';
    ALL_SUBJECTS.forEach(sub => {
        const o = document.createElement('option'); o.value = sub; o.textContent = sub; s.appendChild(o);
    });
    if (oldVal) s.value = oldVal;
}

function openGlobalReportFromStudent() { returnToAdminFromGlobal = false; fillSubFilter('gr-subjectFilter'); generateGlobalReportHTML('ALL'); }
function adminSearchGlobalReport() {
    const n = document.getElementById('adminSearchInput').value.trim();
    if (!n) return alert("Enter student name");
    activeGlobalStudentName = n; returnToAdminFromGlobal = true; fillSubFilter('gr-subjectFilter'); generateGlobalReportHTML('ALL');
}
function closeGlobalReport() { if (returnToAdminFromGlobal) openAdminDashboard(); else closeReports(); }

function generateGlobalReportHTML(fSub = 'ALL') {
    currentViewName = 'globalStudentReport';
    hideAllViews(); document.getElementById('globalReportView').style.display = 'block';
    renderNavbar();
    renderUniversalPeriodBarInSlot('grUniversalPeriodSlot');

    document.getElementById('gr-studentName').textContent = activeGlobalStudentName;
    document.getElementById('gr-periodSubtitle').textContent = getFormattedActivePeriodLabel();

    const tb = document.getElementById('gr-table-body'); tb.innerHTML = '';
    let tP = 0, tN = 0, sP = 0, cnt = 0;

    Object.keys(globalData).forEach(tName => {
        if (ADMINS.includes(tName)) return;
        const tObj = globalData[tName];
        if (fSub !== 'ALL' && tObj.subject !== fSub) return;
        Object.keys(tObj.classes||{}).forEach(cName => {
            const cls = tObj.classes[cName];
            const stu = (cls.students||[]).find(s => s.name.toLowerCase() === activeGlobalStudentName.toLowerCase());
            if (stu) {
                const pSt = calculateStudentPeriodStatsInClass(stu.id, cls);
                if (pSt.hasData || pSt.latestComment) {
                    if (pSt.hasData) {
                        tP += pSt.positiveCount; tN += pSt.negativeCount; sP += pSt.percentage; cnt++;
                    }
                    const tr = document.createElement('tr');
                    if (pSt.isNegativeOnly) tr.className = 'row-neg-only';
                    tr.innerHTML = `<td><strong>${tObj.subject}</strong></td><td>${tName}</td><td>${cName}</td><td>${pSt.latestQuiz}</td><td>${pSt.latestProj}</td><td style="color:green;font-weight:bold;">+${pSt.positiveCount}</td><td style="color:red;font-weight:bold;">-${pSt.negativeCount}</td><td><span class="percentage-badge ${pSt.colorClass} readonly-badge">${pSt.text}</span></td><td style="font-size:12px; color:#334155; max-width:200px;">${pSt.latestComment || '-'}</td>`;
                    tb.appendChild(tr);
                }
            }
        });
    });
    document.getElementById('gr-pos-score').textContent = `+${tP}`;
    document.getElementById('gr-neg-score').textContent = `-${tN}`;
    document.getElementById('gr-perc').textContent = cnt ? Math.round(sP/cnt)+'%' : 'No Data';
}

function adminSearchGlobalClassReport() {
    activeGlobalClassName = document.getElementById('adminClassSelect').value;
    fillSubFilter('gcr-subjectFilter');
    generateGlobalClassReportHTML('ALL');
}

function generateGlobalClassReportHTML(fSub = 'ALL') {
    currentViewName = 'globalClassReport';
    hideAllViews(); document.getElementById('globalClassReportView').style.display = 'block';
    renderNavbar();
    renderUniversalPeriodBarInSlot('gcrUniversalPeriodSlot');

    document.getElementById('gcr-className').textContent = `${activeGlobalClassName} (${fSub === 'ALL' ? 'All Subjects Combined' : fSub}) — ${getFormattedActivePeriodLabel()}`;
    const tb = document.getElementById('gcr-table-body'); tb.innerHTML = '';
    const roster = SCHOOL_CLASSES[activeGlobalClassName] || [];
    roster.forEach(sName => {
        let p = 0, n = 0, sum = 0, c = 0;
        Object.keys(globalData).forEach(tName => {
            if (ADMINS.includes(tName)) return;
            const tObj = globalData[tName];
            if (fSub !== 'ALL' && tObj.subject !== fSub) return;
            const cls = tObj.classes && tObj.classes[activeGlobalClassName];
            if (cls) {
                const stu = (cls.students||[]).find(s => s.name.toLowerCase() === sName.toLowerCase());
                if (stu) {
                    const pSt = calculateStudentPeriodStatsInClass(stu.id, cls);
                    if (pSt.hasData) { p += pSt.positiveCount; n += pSt.negativeCount; sum += pSt.percentage; c++; }
                }
            }
        });
        const isNegOnlyGlobal = (n > 0 && p === 0);
        const net = p - n;
        const tr = document.createElement('tr');
        if (isNegOnlyGlobal) tr.className = 'row-neg-only';
        tr.innerHTML = `<td style="font-weight:bold;color:#2563eb;cursor:pointer;" onclick="activeGlobalStudentName='${sName.replace(/'/g, "\\'")}';returnToAdminFromGlobal=true;fillSubFilter('gr-subjectFilter');generateGlobalReportHTML('${fSub}');">${isNegOnlyGlobal ? '⚠️ ' : ''}${sName}</td><td>${c}</td><td style="color:green;font-weight:bold;">+${p}</td><td style="color:red;font-weight:bold;">-${n}</td><td><span class="net-score-pill">Net: ${net >= 0 ? '+'+net : net}</span></td><td><strong>${c ? Math.round(sum/c)+'%' : 'No Data'}</strong></td>`;
        tb.appendChild(tr);
    });
}

function populateGlobalTopFilters(defaultClass = 'ALL_CLASSES', defaultSub = 'ALL') {
    const cSel = document.getElementById('gts-classFilter');
    cSel.innerHTML = '<option value="ALL_CLASSES">🏫 All School Classes (كل الفصول)</option>';
    Object.keys(SCHOOL_CLASSES).forEach(c => {
        const o = document.createElement('option'); o.value = c; o.textContent = c; cSel.appendChild(o);
    });
    cSel.value = defaultClass;

    fillSubFilter('gts-subjectFilter');
    document.getElementById('gts-subjectFilter').value = defaultSub;
}

function openGlobalTopStudentsDirect() {
    populateGlobalTopFilters('ALL_CLASSES', 'ALL');
    generateGlobalTopStudentsHTML();
}

function adminOpenGlobalTopStudents() {
    const cVal = document.getElementById('adminTopClassSelect').value || 'ALL_CLASSES';
    const sVal = document.getElementById('adminTopSubjectSelect').value || 'ALL';
    populateGlobalTopFilters(cVal, sVal);
    generateGlobalTopStudentsHTML();
}

function generateGlobalTopStudentsHTML() {
    currentViewName = 'globalTopStudents';
    hideAllViews();
    document.getElementById('globalTopStudentsView').style.display = 'block';
    renderNavbar();
    renderUniversalPeriodBarInSlot('gtsUniversalPeriodSlot');

    const fClass = document.getElementById('gts-classFilter').value || 'ALL_CLASSES';
    const fSub = document.getElementById('gts-subjectFilter').value || 'ALL';

    const classLabel = fClass === 'ALL_CLASSES' ? 'All School Classes' : fClass;
    const subLabel = fSub === 'ALL' ? 'All Subjects Combined' : `Subject: ${fSub}`;
    document.getElementById('gts-subtitle').textContent = `${classLabel} — ${subLabel} | ${getFormattedActivePeriodLabel()}`;

    const studentMap = {};

    Object.keys(globalData).forEach(tName => {
        if (ADMINS.includes(tName)) return;
        const tObj = globalData[tName];
        if (!tObj || !tObj.classes) return;
        const tSub = tObj.subject || 'Science';
        if (fSub !== 'ALL' && tSub !== fSub) return;

        Object.keys(tObj.classes).forEach(cName => {
            if (fClass !== 'ALL_CLASSES' && cName !== fClass) return;
            const cls = tObj.classes[cName];
            (cls.students || []).forEach(stu => {
                const pSt = calculateStudentPeriodStatsInClass(stu.id, cls);
                if (pSt.hasData) {
                    const key = `${cName}||${stu.name.toLowerCase()}`;
                    if (!studentMap[key]) {
                        studentMap[key] = { name: stu.name, className: cName, pos: 0, neg: 0, sumPerc: 0, subCount: 0 };
                    }
                    studentMap[key].pos += pSt.positiveCount;
                    studentMap[key].neg += pSt.negativeCount;
                    studentMap[key].sumPerc += pSt.percentage;
                    studentMap[key].subCount += 1;
                }
            });
        });
    });

    const qualified = Object.values(studentMap).map(item => {
        const perc = Math.round(item.sumPerc / item.subCount);
        const netScore = item.pos - item.neg;
        return { ...item, perc, netScore };
    }).filter(item => item.perc >= 90 && item.netScore > 0);

    qualified.sort(compareTopStudentsByNetScore);

    const tb = document.getElementById('gts-table-body');
    tb.innerHTML = '';

    if (qualified.length === 0) {
        tb.innerHTML = `<tr><td colspan="8" style="color:#64748b; padding:20px;">No students currently meet the Honor Roll criteria (&ge; 90% and Positives &gt; Negatives) for this period &amp; filter.</td></tr>`;
        return;
    }

    qualified.slice(0, 20).forEach((item, idx) => {
        let medal = `#${idx + 1}`;
        if (idx === 0) medal = '🥇 #1';
        else if (idx === 1) medal = '🥈 #2';
        else if (idx === 2) medal = '🥉 #3';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:900; font-size:15px;">${medal}</td>
            <td style="font-weight:bold; color:#2563eb; cursor:pointer;" onclick="activeGlobalStudentName='${item.name.replace(/'/g, "\\'")}'; returnToAdminFromGlobal=true; fillSubFilter('gr-subjectFilter'); generateGlobalReportHTML('${fSub}');">${item.name}</td>
            <td><strong>${item.className}</strong></td>
            <td>${item.subCount}</td>
            <td style="color:#16a34a; font-weight:bold;">+${item.pos}</td>
            <td style="color:#dc2626; font-weight:bold;">-${item.neg}</td>
            <td><span class="net-score-pill">Net: +${item.netScore}</span></td>
            <td><span class="percentage-badge perc-high readonly-badge">${item.perc}%</span></td>
        `;
        tb.appendChild(tr);
    });
}

async function handleImport(event) {
    if (isReadOnlyView() || isPureAdminAccount()) return;
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    let names = [];
    try {
        if (ext === 'txt' || ext === 'csv') {
            const text = await file.text(); names = text.split(/\r?\n/);
        } else if (ext === 'xlsx' || ext === 'xls') {
            const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            names = json.map(row => row[0]);
        } else if (ext === 'docx') {
            const buffer = await file.arrayBuffer(); const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            names = result.value.split(/\r?\n/);
        }
        names = names.map(n => n ? String(n).trim() : '').filter(n => n.length > 1);
        if (names.length > 0) {
            const cName = await SSD.prompt(`Import ${names.length} students`, {
                message: 'Name this new class:',
                initial: file.name.replace(/\.[^/.]+$/, ''),
                placeholder: 'e.g. 5C',
                okLabel: 'Import class'
            });
            if (cName) {
                appData.classes[cName] = {
                    students: names.map((n, i) => ({ id: Date.now() + i, name: n })),
                    scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, history: {}
                };
                appData.currentClass = cName;
                saveGlobal();
                openMainDashboard();
            }
        }
    } catch (err) { alert("Could not read file."); }
    event.target.value = '';
}
