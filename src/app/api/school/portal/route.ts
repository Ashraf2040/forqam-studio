import { prisma } from '@/lib/db';
import { requireMe } from '@/lib/auth';
import { handle, json } from '@/lib/http';
export const dynamic = 'force-dynamic';

// Staff (admin/management/counselor) read every teacher's portal document of their school; a teacher only their own.
export const GET = handle(async () => {
  const me = await requireMe();
  const staff = ['admin', 'management', 'counselor'].includes(me.role);
  const rows = await prisma.portalData.findMany({
    where: staff ? { schoolId: me.schoolId } : { schoolId: me.schoolId, teacherName: me.name },
    select: { teacherName: true, json: true },
  });
  const data: Record<string, unknown> = {};
  rows.forEach((r) => { data[r.teacherName] = r.json; });
  return json({ data });
});
