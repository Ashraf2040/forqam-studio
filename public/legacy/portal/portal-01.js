
// ================= CORE DATA & LOGIN ENGINE =================
const ADMINS = [];

const TEACHER_PINS = {};        // filled at runtime from the server registry

const DEFAULT_TEACHER_SUBJECTS = {}; // filled at runtime from the server registry

const ALL_SUBJECTS = (window.SM_ROSTER && window.SM_ROSTER.subjects) || []; // the real school subjects

const SCHOOL_CLASSES = {};      // filled at runtime from the device/server data (never hard-coded)

const behaviors = [
    { id: 'leader', type: 'positive', icon: 'fa-solid fa-crown', color: '#2563eb', title: 'Leadership' },
    { id: 'creative', type: 'positive', icon: 'fa-solid fa-lightbulb', color: '#eab308', title: 'Creative Idea' },
    { id: 'participation', type: 'positive', icon: 'fa-solid fa-hand', color: '#16a34a', title: 'Participation' },
    { id: 'homework', type: 'positive', icon: 'fa-solid fa-book-open', color: '#2563eb', title: 'Homework Done' },
    { id: 'strong', type: 'positive', icon: 'fa-solid fa-dumbbell', color: '#2563eb', title: 'Strong Effort' },
    { id: 'help', type: 'positive', icon: 'fa-solid fa-handshake', color: '#f97316', title: 'Helpful' },
    { id: 'star', type: 'positive', icon: 'fa-solid fa-star', color: '#eab308', title: 'Star Student' },
    { id: 'late', type: 'negative', icon: 'fa-solid fa-clock', color: '#ef4444', title: 'Late' },
    { id: 'missing', type: 'negative', icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444', title: 'Missing Materials' },
    { id: 'mute', type: 'negative', icon: 'fa-solid fa-volume-xmark', color: '#1f2937', title: 'Talking' },
    { id: 'search', type: 'negative', icon: 'fa-solid fa-magnifying-glass', color: '#16a34a', title: 'Distracted' },
    { id: 'play', type: 'negative', icon: 'fa-solid fa-users', color: '#1f2937', title: 'Playing around' },
    { id: 'food', type: 'negative', icon: 'fa-solid fa-burger', color: '#1f2937', title: 'Eating/Drinking' },
    { id: 'run', type: 'negative', icon: 'fa-solid fa-person-running', color: '#1f2937', title: 'Out of seat' },
    { id: 'other_neg', type: 'negative', icon: 'fa-solid fa-circle-exclamation', color: '#ef4444', title: 'Other Issue' }
];

let memStore = {};
function setStore(k, v) { try { localStorage.setItem(k, v); } catch(e) { memStore[k] = v; } }
function getStore(k) { try { return localStorage.getItem(k); } catch(e) { return memStore[k] || null; } }
function delStore(k) { try { localStorage.removeItem(k); } catch(e) { delete memStore[k]; } }

function smSchoolHash(s){let h=5381;for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))>>>0;}return h.toString(36);}
function smk7(b){return 'SM7_'+(window.__smSchoolHash||'G')+'_'+b;}
let globalData = {};
let currentTeacher = null;
let adminRealName = null;
let isAdminImpersonating = false;
let appData = null;
let isHistoryMode = false;
let historyDate = null;
let activeGlobalStudentName = "";
let activeGlobalClassName = "";
let activeReportStudentId = null;
let returnToAdminFromGlobal = false;
let bulkMode = 'add';
let currentViewName = 'home';

// UNIVERSAL PERIOD FILTER STATE (Used across ALL reports & analytics)
let activeAnalyticsPeriod = 'today'; // 'today', 'weekly', 'monthly', 'cumulative'
let selectedSpecificDate = '';       // '' = Current Active Board, or 'YYYY-MM-DD'
let selectedSchoolWeek = '';         // Sunday 'YYYY-MM-DD' of Sun-Thu week
let selectedMonthlyKey = '';         // 'YYYY-MM'

// server edition: portal state loads from the school server after sign-in; never preload stale local data.
try { globalData = {}; } catch(e) { globalData = {}; }

function isReadOnlyView() { return window.__smRole === 'management' || window.__smRole === 'counselor' || (window.__smRole === 'admin' && !!isAdminImpersonating); }

function isPureAdminAccount() {
    return ADMINS.includes(currentTeacher) && !isAdminImpersonating;
}

function getTeacherRoleTitle(tName) {
    if (tName === "Mr. Abed Saleem") return "Academic Coordinator";
    return "Subject Teacher";
}

// Saudi School Week Calculator (Sunday to Thursday)
function getSchoolWeekRange(dateInput) {
    const d = (typeof dateInput === 'string' && dateInput.length >= 10)
        ? new Date(dateInput + 'T12:00:00')
        : new Date();
    const day = d.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
    const diffToSun = day === 6 ? 1 : (day === 5 ? -5 : -day);
    const sun = new Date(d);
    sun.setDate(d.getDate() + diffToSun);
    const thu = new Date(sun);
    thu.setDate(sun.getDate() + 4);
    const fmt = (dt) => dt.toISOString().split('T')[0];
    return { sunStr: fmt(sun), thuStr: fmt(thu), label: `Sun ${fmt(sun)} – Thu ${fmt(thu)}` };
}

function typeNum(n) {
    const inp = document.getElementById('loginPinInput');
    if (inp.value.length < 5) inp.value += n;
}
function clearPinBox() {
    document.getElementById('loginPinInput').value = '';
    document.getElementById('loginErrorMsg').textContent = '';
}

function executeDirectLogin() {
    const tName = document.getElementById('loginTeacherSelect').value;
    let rawPin = document.getElementById('loginPinInput').value.trim();
    const errBox = document.getElementById('loginErrorMsg');

    let pin = rawPin.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

    if (!tName) { errBox.textContent = "Please choose your name from list #1"; return; }
    if (!pin) { errBox.textContent = "Please enter your 5-digit PIN"; return; }

    if (TEACHER_PINS[tName] === pin) {
        currentTeacher = tName;
        adminRealName = null;
        isAdminImpersonating = false;
        setStore(smk7('SMART_PORTAL_GENERAL_USER'), currentTeacher);

        const isAdminAcc = ADMINS.includes(tName);
        const defaultSub = isAdminAcc ? "Administration" : (DEFAULT_TEACHER_SUBJECTS[tName] || "");

        if (!globalData[currentTeacher]) {
            globalData[currentTeacher] = { subject: defaultSub, classes: {}, currentClass: "" };
            populateAllSchoolClasses(globalData[currentTeacher]);
        } else {
            if (isAdminAcc) {
                globalData[currentTeacher].subject = "Administration";
            } else if (!globalData[currentTeacher].subject || !ALL_SUBJECTS.includes(globalData[currentTeacher].subject)) {
                globalData[currentTeacher].subject = defaultSub;
            }
            if (!globalData[currentTeacher].classes || Object.keys(globalData[currentTeacher].classes).length === 0) {
                populateAllSchoolClasses(globalData[currentTeacher]);
            }
        }
        activeAnalyticsPeriod = isAdminAcc ? 'cumulative' : 'today';
        saveGlobal();
        launchPortalSession();
    } else {
        errBox.textContent = "Wrong PIN! Check your 5-digit code.";
    }
}

function populateAllSchoolClasses(tObj) {
    if (!tObj || typeof tObj !== 'object') return;
    if (!tObj.classes) tObj.classes = {};
    if (!tObj.currentClass || !tObj.classes[tObj.currentClass]) {
        tObj.currentClass = Object.keys(tObj.classes)[0] || "";
    }
}

function saveGlobal() {
    if (isReadOnlyView()) return;
    if (currentTeacher && appData) {
        globalData[currentTeacher] = appData;
        setStore(smk7('SMART_PORTAL_GENERAL_DB'), JSON.stringify(globalData));
    }
}

function triggerCleanPrint() {
    const oldTitle = document.title;
    document.title = "\u200B";
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 500);
}
