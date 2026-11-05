import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ name: string }> };

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireMe();
  if (me.role !== 'admin') throw new ApiError(403, 'admin only');
  const { name } = await ctx.params;
  if (name === me.name) throw new ApiError(400, 'cannot delete your own account');
  await prisma.account.deleteMany({ where: { schoolId: me.schoolId, name } });
  return json({ ok: true });
});

// Change a teacher's subject (the original screen sends this; admin only).
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const me = await requireMe();
  if (me.role !== 'admin') throw new ApiError(403, 'admin only');
  const { name } = await ctx.params;
  const b = await readBody(req);
  const subject = String(b.subject ?? '').trim();
  if (!subject || subject.length > 100) throw new ApiError(400, 'subject required');
  await prisma.account.updateMany({ where: { schoolId: me.schoolId, name }, data: { subject } });
  return json({ ok: true });
});
