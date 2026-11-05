import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { hashPin, ROLES, validPin } from '@/lib/accounts';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const me = await requireMe();
  if (me.role !== 'admin') return json({ accounts: [] });
  const rows = await prisma.account.findMany({
    where: { schoolId: me.schoolId }, select: { name: true, subject: true, role: true, createdAt: true }, orderBy: { name: 'asc' },
  });
  return json({ accounts: rows.map((r) => ({ name: r.name, subject: r.subject, role: r.role, created_at: r.createdAt })) });
});

export const POST = handle(async (req: Request) => {
  const me = await requireMe();
  if (me.role !== 'admin') throw new ApiError(403, 'admin only');
  const b = await readBody(req);
  const name = String(b.name ?? '').trim();
  const subject = String(b.subject ?? 'Science').trim() || 'Science';
  const role = b.role === undefined ? 'teacher' : String(b.role);
  if (!(ROLES as readonly string[]).includes(role) || !name || name.length > 200 || !validPin(b.pin)) {
    throw new ApiError(400, 'name, 5-digit PIN and a valid role are required');
  }
  // name guard: a name that still has retained data (documents, decks incl. tombstones) cannot be reused
  const [p, s, d] = await Promise.all([
    prisma.portalData.count({ where: { schoolId: me.schoolId, teacherName: name } }),
    prisma.studioData.count({ where: { schoolId: me.schoolId, teacherName: name } }),
    prisma.deck.count({ where: { schoolId: me.schoolId, owner: name } }),
  ]);
  if (p + s + d > 0) {
    throw new ApiError(409, 'name has retained data from a previous account; reusing it would give the new account access to that data');
  }
  try {
    await prisma.account.create({ data: { schoolId: me.schoolId, name, subject, role, pinHash: await hashPin(b.pin) } });
  } catch (e: any) {
    if (e?.code === 'P2002') throw new ApiError(409, 'name exists in this school');
    throw e;
  }
  return json({ ok: true });
});
