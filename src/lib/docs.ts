import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { requireMe } from './auth';
import { ApiError, handle, json, readBody } from './http';

type Kind = 'portal' | 'studio';
const STUDIO_QUOTA = 5;

/** GET/PUT /api/{portal,studio}/me - one versioned JSON document per teacher (compare-and-swap on version). */
export function docHandlers(kind: Kind) {
  const table = kind === 'portal' ? prisma.portalData : prisma.studioData;
  const lockKey = (sid: number, name: string) => `${sid}|${name}|${kind}`;

  const GET = handle(async () => {
    const me = await requireMe();
    // original row-level rule: only teacher/admin own a document; other roles see nothing here
    if (!['teacher', 'admin'].includes(me.role)) return json({ data: null, version: 0 });
    const row = await (table as any).findUnique({ where: { schoolId_teacherName: { schoolId: me.schoolId, teacherName: me.name } } });
    return json({ data: row ? row.json : null, version: row ? row.version : 0 });
  });

  const PUT = handle(async (req: Request) => {
    const me = await requireMe();
    if (me.role !== 'teacher') throw new ApiError(403, 'teacher role required');
    const b = await readBody(req);
    const data = b.data;
    const base = b.base_version;
    const mid: string | null = b.mutation_id ?? null;
    if (data === undefined || data === null) throw new ApiError(400, 'data required');
    if (!Number.isInteger(base) || base < 0) throw new ApiError(400, 'base_version (non-negative int) required');
    if (mid !== null && (typeof mid !== 'string' || mid.length > 80)) throw new ApiError(400, 'bad mutation_id');

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey(me.schoolId, me.name)}))`;
      const t = (kind === 'portal' ? tx.portalData : tx.studioData) as any;
      const cur = await t.findUnique({ where: { schoolId_teacherName: { schoolId: me.schoolId, teacherName: me.name } } });
      const ver: number = cur?.version ?? 0;
      if (cur?.mutationId && mid && cur.mutationId === mid) return { ok: true, version: ver, data: cur.json, already: true };
      if (base !== ver) throw new ApiError(409, 'conflict', { version: ver, data: cur?.json ?? null });
      if (kind === 'studio' && Array.isArray(data.questionFiles)) {
        const n = data.questionFiles.length;
        const curN = Array.isArray(cur?.json?.questionFiles) ? cur.json.questionFiles.length : 0;
        if (n > STUDIO_QUOTA && n > curN) {
          throw new ApiError(409, `question file quota reached (${STUDIO_QUOTA} files) - delete a question file before adding more`, { quota: STUDIO_QUOTA });
        }
      }
      const saved = await t.upsert({
        where: { schoolId_teacherName: { schoolId: me.schoolId, teacherName: me.name } },
        create: { schoolId: me.schoolId, teacherName: me.name, json: data as Prisma.InputJsonValue, version: 1, mutationId: mid },
        update: { json: data as Prisma.InputJsonValue, updatedAt: new Date(), version: { increment: 1 }, mutationId: mid },
      });
      return { ok: true, version: saved.version };
    }, { timeout: 20000 });
    return json(result);
  });

  return { GET, PUT };
}
