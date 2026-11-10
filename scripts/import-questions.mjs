// Body Systems — Control & Information Processing (Lesson 5) question import.
// 1. Writes the question bank as a Smart-Studio template xlsx (Question/Options/Answer).
// 2. Reads it back exactly like the app's Excel importer (header row, A–D answers,
//    rows with < 5 cells become fill-in-the-blanks with **answer** pills).
// 3. Seeds the teacher's StudioData: questions become the ACTIVE set and a saved
//    pack in the question-file library.
//   node scripts/import-questions.mjs [teacherName]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('../public/legacy/vendor/xlsx.js');
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const schoolName = process.env.SCHOOL_NAME || 'Al-Furqan Private School';
const teacherName = process.argv[2] || 'Ashraf Alsayed';
const XLSX_OUT = process.env.QUESTIONS_XLSX_OUT || 'D:/Edu2026/G4/Lessons Powerpoint/Nervous_System_Lesson5_Questions.xlsx';

// ---------------------------------------------------------------------------
// The bank: 20 MCQs + 6 fill-in-the-blanks, all facts from the lesson PDF.
// Rows: [Question, A, B, C, D, Answer] (MCQ) or [Question with **answer**] (blanks).
// ---------------------------------------------------------------------------
const ROWS = [
    // header
    ["Question", "Option A", "Option B", "Option C", "Option D", "Answer"],
    // --- nervous system basics ---
    ["Which system is the part of an organism that gathers, processes, and responds to information?", "The digestive system", "The nervous system", "The circulatory system", "The skeletal system", "B"],
    ["The brain is the ___ of the body: it receives information, processes it, and sends out a response.", "air filter", "food store", "control center", "muscle pump", "C"],
    ["The basic functioning units of the nervous system are ___.", "nerve cells called neurons", "muscle fibers", "red blood cells", "bone cells", "A"],
    ["Your nervous system gets information from your senses. How many main senses does the lesson list?", "Three", "Four", "Five", "Seven", "C"],
    ["The central nervous system (CNS) is made up of ___.", "the heart and the lungs", "the brain and the spinal cord", "the muscles and the bones", "the eyes and the ears", "B"],
    ["The spinal cord can be thought of as ___ between the brain and the rest of the body.", "a wall", "an information highway", "an air pipe", "a food store", "B"],
    ["Signals in your nervous system can travel as fast as some airplanes — around ___.", "40 km/h", "100 km/h", "400 km/h", "4,000 km/h", "C"],
    ["The somatic system controls skeletal muscles and causes voluntary movements, such as ___.", "the beating of your heart", "digesting your food", "kicking a ball", "the growth of hair", "C"],
    ["The autonomic system controls smooth and cardiac muscles and regulates involuntary actions, such as ___.", "kicking a ball", "picking up a book", "playing football", "the beating of your heart", "D"],
    ["Receptors are ___.", "special structures that detect stimuli", "bones in your legs", "parts of your shoes", "kinds of food", "A"],
    ["The peripheral nervous system (PNS) transmits information between the CNS and ___.", "the sky", "the food you eat", "the rest of the body", "the brain only", "C"],
    // --- senses: taste, smell, touch ---
    ["The chemical receptors in your nose that detect odors are called ___.", "chemoreceptors", "eardrums", "taste buds", "photoreceptors", "A"],
    ["The chemoreceptors on your tongue are called ___.", "pupils", "taste buds", "rods", "hair cells", "B"],
    ["Touch receptors in your skin can detect ___.", "temperature, pain, and pressure", "only colors", "only sounds", "only smells", "A"],
    ["Which areas of your body have LOTS of touch receptors?", "the middle of your back", "the palms of your hands and the soles of your feet", "your fingernails", "your elbows only", "B"],
    // --- hearing ---
    ["The vibration of matter creates ___.", "shadows", "sound waves", "electric signals", "food", "B"],
    ["Sound waves that enter your ears move ___, which send information about the sound to your brain.", "hair cells in the inner ear", "tooth cells", "leg muscles", "eyelashes", "A"],
    // --- sight ---
    ["Light enters the eye through the ___.", "cornea", "optic nerve", "retina", "ear canal", "A"],
    ["The colored part of the eye that controls how much light enters by changing the size of the pupil is the ___.", "retina", "lens", "iris", "cornea", "C"],
    ["In bright light your iris constricts, so your pupil ___.", "gets smaller", "gets larger", "disappears", "turns dark", "A"],
    ["The light is focused onto the ___, at the back of the eye, where an image forms.", "retina", "pupil", "ear drum", "nostril", "A"],
    ["The retina sends image information to the brain as electric signals through the ___.", "optic nerve", "spine of the nose", "ear canal", "blood vessel", "A"],
    // --- plants ---
    ["When an insect touches a Venus flytrap, the plant ___.", "snaps two of its leaves together and traps it", "grows taller at once", "drops all its leaves", "changes color instantly", "A"],
    // --- fill in the blanks (single column → **answer** pills) ---
    ["The basic functioning units of the nervous system are called nerve cells, or **neurons**."],
    ["The **spinal cord** is a tubelike structure of neurons."],
    ["A small amount of energy that moves from one area to another is called an **impulse**."],
    ["Something that causes a change or a reaction is called a **stimulus**."],
    ["Light rays are focused as they pass through the **lens**."],
    ["The Venus flytrap responds to touch by snapping its leaves together and trapping the **insect**."],
];

// 1. write the template-format xlsx
const ws = XLSX.utils.aoa_to_sheet(ROWS);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Questions");
fs.mkdirSync(path.dirname(XLSX_OUT), { recursive: true });
fs.writeFileSync(XLSX_OUT, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log('template xlsx written:', XLSX_OUT);

// 2. read it back exactly like the app's handleExcelQuestionsUpload
function parseTemplate(buf) {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const imported = [];
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
    return imported;
}
const questions = parseTemplate(fs.readFileSync(XLSX_OUT));
const mcqCount = questions.filter(q => q.type === 'mcq').length;
console.log('parsed questions:', questions.length, '(mcq:', mcqCount + ', blanks:', questions.length - mcqCount + ')');
if (!questions.length) { console.error('parsing produced no questions'); process.exit(1); }

// 3. seed the teacher's StudioData: active + library pack
const PACK_NAME = 'Body Systems — Nervous System (Lesson 5)';
const db = new PrismaClient();
try {
    const school = await db.school.findFirst({ where: { name: schoolName } });
    if (!school) { console.error('School not found: ' + schoolName); process.exit(1); }
    const acc = await db.account.findUnique({ where: { schoolId_name: { schoolId: school.id, name: teacherName } } });
    if (!acc) { console.error('Teacher not found: ' + teacherName); process.exit(1); }

    const key = { schoolId_teacherName: { schoolId: school.id, teacherName } };
    const row = await db.studioData.findUnique({ where: key });
    const doc = (row?.json && typeof row.json === 'object' && !Array.isArray(row.json)) ? row.json : {};
    doc.questionFiles = Array.isArray(doc.questionFiles) ? doc.questionFiles : [];
    // avoid duplicate packs with the same name on re-run
    const withoutSame = doc.questionFiles.filter(f => f && f.name !== PACK_NAME);
    const pack = { id: 'qf' + Date.now() + Math.floor(Math.random() * 999), name: PACK_NAME, ts: Date.now(), count: questions.length, questions };
    doc.questionFiles = [pack, ...withoutSame];
    doc.questions = JSON.parse(JSON.stringify(questions)); // active set — playable immediately
    doc.qIndex = doc.qIndex || 0;
    doc.activeQSourceName = PACK_NAME;
    await db.studioData.upsert({ where: key, update: { json: doc, version: { increment: 1 }, updatedAt: new Date(), mutationId: null }, create: { schoolId: school.id, teacherName, json: doc } });
    console.log(JSON.stringify({ teacher: teacherName, active: doc.questions.length, packs: doc.questionFiles.map(f => f.name + ' (' + f.count + ')') }));
} finally { await db.$disconnect(); }
