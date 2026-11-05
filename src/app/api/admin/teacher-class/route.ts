import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';

const EMPTY_CLASS = { students: [], scores: {}, quizScores: {}, projectScores: {}, manualScores: {}, comments: {}, bulkCounts: {}, history: {} };

// Admin adds an EMPTY class to a teacher's portal document. Teaching records stay teacher-only.
export const POST = handle(async (req: Request) => {
  const me = await requireMe();
  if (me.role !== 'admin') throw new ApiError(403, 'admin only');
  const b = await readBody(req);
  const teacher = String(b.teacher ?? '').trim();
  const className = String(b.className ?? '').trim();
  if (!teacher || !className || className.length > 60) throw new ApiError(400, 'teacher and a class name (max 60 chars) are required');
  const acc = await prisma.account.findFirst({ where: { schoolId: me.schoolId, name: teacher, role: 'teacher' } });
  if (!acc) throw new ApiError(404, 'teacher not found');
  const out = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${me.schoolId + '|' + teacher + '|portal'}))`;
    const cur = await tx.portalData.findUnique({ where: { schoolId_teacherName: { schoolId: me.schoolId, teacherName: teacher } } });
    const ver = cur?.version ?? 0;
    let doc: any = cur?.json ?? { subject: acc.subject ?? 'Science', currentClass: className, classes: {} };
    const classes = doc.classes && typeof doc.classes === 'object' ? doc.classes : {};
    if (Object.prototype.hasOwnProperty.call(classes, className)) return { ok: true, version: ver, already: true };
    doc = { ...doc, classes: { ...classes, [className]: EMPTY_CLASS } };
    const saved = await tx.portalData.upsert({
      where: { schoolId_teacherName: { schoolId: me.schoolId, teacherName: teacher } },
      create: { schoolId: me.schoolId, teacherName: teacher, json: doc as Prisma.InputJsonValue, version: 1, mutationId: null },
      update: { json: doc as Prisma.InputJsonValue, updatedAt: new Date(), version: { increment: 1 }, mutationId: null },
    });
    return { ok: true, version: saved.version };
  });
  return json(out);
});
