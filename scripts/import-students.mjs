// Student roster import: reads weekly class-record xlsx files and merges the
// student names into every teacher who owns that class (no students are dropped).
//   node scripts/import-students.mjs "file1.xlsx" "file2.xlsx" ...
// Env: SCHOOL_NAME (default Al-Furqan Private School)
// Class code comes from the file name (Class_Record_<CODE>_...). Names are
// normalized (spaces/commas/title-case) and merged idempotently by exact match.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('../public/legacy/vendor/xlsx.js');
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const schoolName = process.env.SCHOOL_NAME || 'Al-Furqan Private School';
const FILES = process.argv.slice(2);
if (!FILES.length) { console.error('Pass the xlsx files to import (e.g. "Class_Record_6A_Week11 (1).xlsx")'); process.exit(1); }

// --- name normalization: collapse spaces/tabs, spacing after commas, title-case full-caps ---
const norm = (s) => String(s || '')
  .replace(/[\t\u00A0]+/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/(\s*,\s*)/g, ', ')
  .trim();
function titleName(s) {
  if (s !== s.toUpperCase()) return s; // leave mixed-case names as-is
  return s.split(' ').map(w => w ? w[0] + w.slice(1).toLowerCase() : w).join(' ');
}
const key = (s) => norm(s).toLowerCase();

function parseRoster(file) {
  const base = path.basename(file);
  const m = base.match(/Class[_ ]Record[_ ]([A-Za-z0-9]+?)[_ ]/i);
  const cls = m ? m[1] : '';
  if (!cls) { console.error('Cannot read class code from name: ' + base); process.exit(1); }
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const names = [];
  const seen = new Set();
  for (const r of rows) {
    if (!r || r.length < 2) continue;
    const idx = Number(r[0]);
    const nm = titleName(norm(String(r[1] || '')));
    if (!Number.isInteger(idx) || idx < 1 || !nm) continue;
    if (seen.has(key(nm))) continue;
    seen.add(key(nm));
    names.push(nm);
  }
  return { cls, names, file: base };
}

const parsed = FILES.map(parseRoster);
for (const r of parsed) console.log(r.cls + ': ' + r.names.length + ' students from ' + r.file);

function emptyClass() {
  return { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} };
}

const db = new PrismaClient();
try {
  const school = await db.school.findFirst({ where: { name: schoolName } });
  if (!school) { console.error('School not found: ' + schoolName); process.exit(1); }

  const summary = {};
  for (const r of parsed) {
    let teachersHit = 0;
    const portal = await db.portalData.findMany({ where: { schoolId: school.id } });
    for (const row of portal) {
      const doc = row.json && typeof row.json === 'object' ? row.json : {};
      const c = (doc.classes || {})[r.cls];
      if (!c || typeof c !== 'object' || Array.isArray(c)) continue; // class not assigned to this teacher
      const have = new Map((c.students || []).map(s => [key(s.name), s.name]));
      let added = 0;
      let maxId = (c.students || []).reduce((a, s) => Math.max(a, Number(s.id) || 0), 0);
      for (const nm of r.names) {
        if (have.has(key(nm))) continue;
        maxId += 1;
        (c.students = c.students || []).push({ id: maxId, name: nm });
        have.set(key(nm), nm);
        added++;
      }
      if (added > 0) {
        await db.portalData.update({ where: { schoolId_teacherName: { schoolId: school.id, teacherName: row.teacherName } }, data: { json: doc, version: { increment: 1 }, updatedAt: new Date(), mutationId: null } });
        teachersHit++;
      }
      (summary[r.cls] = summary[r.cls] || { added: 0, teachers: 0 }).added += added;
    }
    // studio docs: classes[c] is an array of names
    const studio = await db.studioData.findMany({ where: { schoolId: school.id } });
    for (const row of studio) {
      const doc = row.json && typeof row.json === 'object' ? row.json : {};
      const arr = (doc.classes || {})[r.cls];
      if (!Array.isArray(arr)) continue;
      const have = new Set(arr.map(key));
      let added = 0;
      for (const nm of r.names) {
        if (have.has(key(nm))) continue;
        arr.push(nm); added++;
      }
      if (added > 0) {
        await db.studioData.update({ where: { schoolId_teacherName: { schoolId: school.id, teacherName: row.teacherName } }, data: { json: doc, version: { increment: 1 }, updatedAt: new Date(), mutationId: null } });
        teachersHit++;
      }
      (summary[r.cls] = summary[r.cls] || { added: 0, teachers: 0 }).teachers = Math.max(...[(summary[r.cls] || {}).teachers || 0, teachersHit]);
    }
  }
  console.log(JSON.stringify(summary, null, 1));
} finally { await db.$disconnect(); }
