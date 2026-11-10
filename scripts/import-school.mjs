// One-off school import: parses the real-school CSV exports and seeds the database.
//   - Creates the school + owner/admin account.
//   - Creates one account per teacher (role=teacher) with subject + PIN.
//   - Seeds each teacher's Portal doc (classes as empty containers, no students —
//     the sources carry no student names) and Studio doc.
//   - Writes every generated PIN to scripts/.generated-pins.csv for distribution.
//
// Env (DATABASE_URL is picked up from .env automatically by Prisma):
//   TEACHERS_CSV  path to teachers CSV (default below)
//   CLASSES_CSV   path to classes CSV  (default below)
//   SCHOOL_NAME   default: Al-Furqan Private School
//   ADMIN_NAME    default: Administrator
//   ADMIN_PIN     optional fixed 5-digit PIN for the owner (else generated)
// Re-running is idempotent: existing accounts keep their PIN, existing classes
// inside a teacher's docs are merged (never emptied).
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const TEACHERS_CSV = process.env.TEACHERS_CSV || 'D:/Edu2026/G4/Lessons Powerpoint/teachers_2026-11-10.csv';
const CLASSES_CSV = process.env.CLASSES_CSV || 'D:/Edu2026/G4/Lessons Powerpoint/classes_2026-11-10.csv';
const schoolName = process.env.SCHOOL_NAME || 'Al-Furqan Private School';
const adminName = process.env.ADMIN_NAME || 'Administrator';
const PINS_OUT = path.join(process.cwd(), 'scripts', '.generated-pins.csv');

if (process.env.ADMIN_PIN && !/^\d{5}$/.test(process.env.ADMIN_PIN)) { console.error('ADMIN_PIN must be 5 digits'); process.exit(1); }

// --- minimal CSV (no quoted commas expected in these exports, but handle CRLF/BOM) ---
function parseCsv(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => l.split(',').map(c => c.trim()));
}

function parseTeachers(file) {
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = (name) => head.findIndex(h => h.toLowerCase() === name.toLowerCase());
  const iUser = col('Username'), iName = col('Name'), iCls = col('Classes'), iSub = col('Subjects');
  for (const i of [iUser, iName, iCls, iSub]) if (i < 0) { console.error('teachers CSV missing expected columns (Username,Name,Classes,Subjects)'); process.exit(1); }
  const split = v => v.split('|').map(s => s.trim()).filter(Boolean);
  return rows.map(r => {
    const username = (r[iUser] || '').replace(/^"|"$/g, '').trim();
    const name = (r[iName] || '').trim();
    const classes = split(r[iCls] || '');
    const subject = (r[iSub] || '').split('|').map(s => s.trim()).filter(Boolean).join(' | ');
    if (!username || !name) return null;
    return { username, name, classes, subject };
  }).filter(Boolean);
}

const teachers = parseTeachers(TEACHERS_CSV);
const classes = parseCsv(fs.readFileSync(CLASSES_CSV, 'utf8')).slice(1).map(r => r[0]).filter(Boolean);

// sanity: every class a teacher references must exist in the official list
const known = new Set(classes);
const missing = new Set(teachers.flatMap(t => t.classes).filter(c => !known.has(c)));
if (missing.size) { console.error('Teachers reference classes missing from classes CSV: ' + [...missing].join(', ')); process.exit(1); }

// unique random 5-digit PINs
function makePinGen() {
  const used = new Set();
  return () => {
    let p;
    do { p = String(Math.floor(10000 + Math.random() * 90000)); } while (used.has(p));
    used.add(p);
    return p;
  };
}
const nextPin = makePinGen();

const emptyClass = () => ({ students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} });

const adminPin = process.env.ADMIN_PIN || nextPin();
const adminHash = await bcrypt.hash(adminPin, 10);
const pins = [[adminName, 'Administrator', 'admin', 'Administration', '', adminPin]];

const db = new PrismaClient();
const jobs = [];
try {
  const school = await db.school.upsert({ where: { name: schoolName }, update: {}, create: { name: schoolName } });

  await db.account.upsert({
    where: { schoolId_name: { schoolId: school.id, name: adminName } },
    update: { role: 'admin' },
    create: { schoolId: school.id, name: adminName, role: 'admin', subject: 'Administration', pinHash: adminHash },
  });

  for (const t of teachers) {
    let acc = await db.account.findUnique({ where: { schoolId_name: { schoolId: school.id, name: t.name } } });
    const pin = acc ? null : nextPin(); // keep existing PIN on re-run
    const pinHash = acc ? acc.pinHash : await bcrypt.hash(pin, 10);
    acc = await db.account.upsert({
      where: { schoolId_name: { schoolId: school.id, name: t.name } },
      update: { role: 'teacher', subject: t.subject },
      create: { schoolId: school.id, name: t.name, role: 'teacher', subject: t.subject, pinHash },
    });
    if (pin) pins.push([t.username, t.name, 'teacher', t.subject, t.classes.join(' | '), pin]);

    const key = { schoolId_teacherName: { schoolId: school.id, teacherName: t.name } };
    jobs.push(db.$transaction(async (tx) => {
      const p0 = await tx.portalData.findUnique({ where: key });
      const mine = (p0?.json && typeof p0.json === 'object' && !Array.isArray(p0.json)) ? p0.json : {};
      mine.subject = t.subject;
      mine.classes = mine.classes || {};
      for (const c of t.classes) {
        const cur = (mine.classes[c] && typeof mine.classes[c] === 'object' && !Array.isArray(mine.classes[c])) ? mine.classes[c] : emptyClass();
        cur.students = Array.isArray(cur.students) ? cur.students : [];
        mine.classes[c] = cur;
      }
      // drop classes no longer assigned to this teacher (import is the source of truth)
      for (const c of Object.keys(mine.classes)) if (!t.classes.includes(c)) delete mine.classes[c];
      mine.currentClass = (mine.currentClass && mine.classes[mine.currentClass]) ? mine.currentClass : (t.classes[0] || '');
      await tx.portalData.upsert({ where: key, update: { json: mine, version: { increment: 1 }, updatedAt: new Date(), mutationId: null }, create: { schoolId: school.id, teacherName: t.name, json: mine } });

      const s0 = await tx.studioData.findUnique({ where: key });
      const sj = (s0?.json && typeof s0.json === 'object' && !Array.isArray(s0.json)) ? s0.json : {};
      sj.classes = sj.classes || {};
      for (const c of t.classes) sj.classes[c] = Array.isArray(sj.classes[c]) ? sj.classes[c] : [];
      for (const c of Object.keys(sj.classes)) if (!t.classes.includes(c)) delete sj.classes[c];
      sj.currentClass = (sj.currentClass && sj.classes[sj.currentClass]) ? sj.currentClass : (t.classes[0] || '');
      sj.pickedByClass = (sj.pickedByClass && typeof sj.pickedByClass === 'object') ? sj.pickedByClass : {};
      await tx.studioData.upsert({ where: key, update: { json: sj, version: { increment: 1 }, updatedAt: new Date(), mutationId: null }, create: { schoolId: school.id, teacherName: t.name, json: sj } });
    }));
  }
  await Promise.all(jobs);

  // every class name is registered — also expose as a JSON note for reference
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', '.imported-classes.json'),
    JSON.stringify({ school: schoolName, classes }, null, 2),
  );
  const lines = ['Username,Name,Role,Subject,Classes,PIN'];
  for (const row of pins) lines.push(row.map(v => /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(','));
  fs.writeFileSync(PINS_OUT, '\uFEFF' + lines.join('\r\n'), 'utf8');

  console.log(JSON.stringify({
    school: schoolName,
    admin: adminName,
    teachers: teachers.length,
    classes: classes.length,
    pinsFile: path.relative(process.cwd(), PINS_OUT),
  }));
} finally { await db.$disconnect(); }
