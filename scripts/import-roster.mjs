// Idempotent one-off setup: creates the school, an admin and a teacher account (same PIN), and
// loads class rosters (names only, no grades) into the teacher's Portal + Studio data.
// Nothing here is secret: pass paths/values through the environment, never commit them.
//   DATABASE_URL        Neon connection (from your .env)
//   ROSTER_FILE         path to JSON  {"6A":["Name 1","Name 2"], "6B":[...]}
//   PIN_FILE            path to a file holding the 5-digit PIN (used for both accounts)
//   SCHOOL_NAME, TEACHER_NAME, ADMIN_NAME, TEACHER_SUBJECT   (optional overrides)
// Re-running is safe: existing accounts keep their PIN, existing classes are merged, never emptied.
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const need = (k) => { const v = process.env[k]; if (!v) { console.error('Missing ' + k); process.exit(1); } return v; };
const school = process.env.SCHOOL_NAME || 'Al-Furqan Private School';
const teacher = process.env.TEACHER_NAME || 'Ashraf Elsayed';
const admin = process.env.ADMIN_NAME || 'Ashraf Elsayed (Admin)';
const subject = process.env.TEACHER_SUBJECT || 'Science';
const roster = JSON.parse(fs.readFileSync(need('ROSTER_FILE'), 'utf8'));
const pin = fs.readFileSync(need('PIN_FILE'), 'utf8').trim();
if (!/^\d{5}$/.test(pin)) { console.error('PIN must be 5 digits'); process.exit(1); }
need('DATABASE_URL');

const db = new PrismaClient();
const emptyClass = () => ({ students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} });
try {
  const s = await db.school.upsert({ where: { name: school }, update: {}, create: { name: school } });
  const pinHash = await bcrypt.hash(pin, 10);
  for (const [name, role, subj] of [[admin, 'admin', null], [teacher, 'teacher', subject]]) {
    await db.account.upsert({
      where: { schoolId_name: { schoolId: s.id, name } },
      update: {},
      create: { schoolId: s.id, name, role, subject: subj, pinHash },
    });
  }
  const key = { schoolId_teacherName: { schoolId: s.id, teacherName: teacher } };
  const names = Object.keys(roster);
    const p0 = await db.portalData.findUnique({ where: key });
  // The stored document is the teacher's own appData: { subject, classes: { cls: {students,...} }, currentClass }
  const mine = (p0?.json && typeof p0.json === 'object') ? p0.json : { subject, classes: {}, currentClass: '' };
  mine.classes = mine.classes || {};
  mine.subject = mine.subject || subject;
  for (const c of names) {
    const cur = mine.classes[c] || emptyClass();
    const have = new Set(cur.students || []);
    cur.students = [...(cur.students || []), ...roster[c].filter((n) => !have.has(n))];
    mine.classes[c] = cur;
  }
  mine.currentClass = mine.currentClass || names[0];
  await db.portalData.upsert({ where: key, update: { json: mine, version: { increment: 1 } }, create: { schoolId: s.id, teacherName: teacher, json: mine } });
  // Studio: appState-like { classes: { cls: [names] }, currentClass }
  const s0 = await db.studioData.findUnique({ where: key });
  const sj = (s0?.json && typeof s0.json === 'object') ? s0.json : {};
  sj.classes = sj.classes || {};
  for (const c of names) {
    const cur = Array.isArray(sj.classes[c]) ? sj.classes[c] : [];
    const have = new Set(cur);
    sj.classes[c] = [...cur, ...roster[c].filter((n) => !have.has(n))];
  }
  sj.currentClass = names.includes(sj.currentClass) ? sj.currentClass : names[0];
  await db.studioData.upsert({ where: key, update: { json: sj, version: { increment: 1 } }, create: { schoolId: s.id, teacherName: teacher, json: sj } });
  console.log(JSON.stringify({ school, accounts: [admin, teacher], classes: Object.fromEntries(names.map((c) => [c, roster[c].length])) }));
} finally { await db.$disconnect(); }
