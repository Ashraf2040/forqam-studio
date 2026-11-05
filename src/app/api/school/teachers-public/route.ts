import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { handle, json } from '@/lib/http';
export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const me = await requireMe();
  if (!['admin', 'management', 'counselor'].includes(me.role)) return json({ teachers: [] });
  const t = await prisma.account.findMany({
    where: { schoolId: me.schoolId, role: 'teacher' }, select: { name: true, subject: true }, orderBy: { name: 'asc' },
  });
  return json({ teachers: t });
});
