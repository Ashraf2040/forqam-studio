import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { hashPin, validPin } from '@/lib/accounts';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';

// Resetting a PIN bumps token_version, which signs that account out everywhere at once.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ name: string }> }) => {
  const me = await requireMe();
  if (me.role !== 'admin') throw new ApiError(403, 'admin only');
  const { name } = await ctx.params;
  const b = await readBody(req);
  if (!validPin(b.pin)) throw new ApiError(400, '5-digit PIN required');
  await prisma.account.updateMany({
    where: { schoolId: me.schoolId, name }, data: { pinHash: await hashPin(b.pin), tokenVersion: { increment: 1 } },
  });
  return json({ ok: true });
});
