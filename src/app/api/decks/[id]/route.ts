import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

const DECK_QUOTA = 5;
const MAX_BYTES = 30 * 1024 * 1024;
const DECK_ID = /^[\w-]{1,80}$/;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireMe();
  const { id } = await ctx.params;
  if (!['teacher', 'admin'].includes(me.role)) throw new ApiError(404, 'not found');
  const meta = await prisma.deck.findFirst({ where: { schoolId: me.schoolId, owner: me.name, deckId: id, deleted: false } });
  if (!meta) throw new ApiError(404, 'not found');
  const file = await prisma.deckFile.findUnique({ where: { schoolId_owner_deckId: { schoolId: me.schoolId, owner: me.name, deckId: id } } });
  if (!file) throw new ApiError(404, 'not found');
  return json({ id, name: meta.name, b64: Buffer.from(file.data).toString('base64'), version: meta.version });
});

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const me = await requireMe();
  const { id } = await ctx.params;
  if (!['teacher', 'admin'].includes(me.role)) throw new ApiError(403, 'read-only role');
  const b = await readBody(req);
  if (!b.b64 || typeof b.b64 !== 'string') throw new ApiError(400, 'b64 payload required (max 40MB)');
  if (!DECK_ID.test(id)) throw new ApiError(400, 'bad deck id');
  const name = String(b.name ?? '').trim();
  if (!name || name.length > 200) throw new ApiError(400, 'name required (max 200 chars)');
  const bytes = Buffer.from(b.b64, 'base64');
  if (bytes.length <= 0 || bytes.length > MAX_BYTES) throw new ApiError(400, 'file payload required (max 30MB)');

  const key = { schoolId_owner_deckId: { schoolId: me.schoolId, owner: me.name, deckId: id } };
  const existing = await prisma.deck.findUnique({ where: key });
  if (!existing) {
    const n = await prisma.deck.count({ where: { schoolId: me.schoolId, owner: me.name, deleted: false } });
    if (n >= DECK_QUOTA) {
      throw new ApiError(409, `deck quota reached (${DECK_QUOTA} files) - delete a file before uploading a new one`, { quota: DECK_QUOTA, count: n });
    }
  }
  // metadata + file in one transaction: both saved or neither
  const saved = await prisma.$transaction(async (tx) => {
    const m = await tx.deck.upsert({
      where: key,
      create: { schoolId: me.schoolId, owner: me.name, deckId: id, name, sizeBytes: BigInt(bytes.length), version: 1, deleted: false },
      update: { name, sizeBytes: BigInt(bytes.length), updatedAt: new Date(), version: { increment: 1 }, deleted: false },
    });
    await tx.deckFile.upsert({
      where: key, create: { schoolId: me.schoolId, owner: me.name, deckId: id, data: bytes }, update: { data: bytes },
    });
    return m;
  }, { timeout: 60000 });
  return json({ ok: true, version: saved.version });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireMe();
  const { id } = await ctx.params;
  if (!['teacher', 'admin'].includes(me.role)) throw new ApiError(403, 'read-only role');
  if (!DECK_ID.test(id)) throw new ApiError(400, 'bad deck id');
  const r = await prisma.deck.updateMany({
    where: { schoolId: me.schoolId, owner: me.name, deckId: id },
    data: { deleted: true, sizeBytes: null, version: { increment: 1 }, updatedAt: new Date() },
  });
  if (r.count === 0) throw new ApiError(404, 'not found');
  await prisma.deckFile.deleteMany({ where: { schoolId: me.schoolId, owner: me.name, deckId: id } });
  return json({ ok: true });
});
