import { prisma } from '@/lib/db';
import { hashPin, validPin } from '@/lib/accounts';
import { ApiError, handle, json, readBody } from '@/lib/http';
export const dynamic = 'force-dynamic';

// Create a school + its first admin. Needs the school setup code (ENROLL_KEY); fails closed without one.
export const POST = handle(async (req: Request) => {
  const enrollKey = process.env.ENROLL_KEY;
  if (!enrollKey) throw new ApiError(503, 'Enrollment is not open on this deployment.');
  const b = await readBody(req);
  if (b.key !== enrollKey) throw new ApiError(403, 'School setup code is missing or incorrect.');
  const school = String(b.school ?? '').trim();
  const name = String(b.name ?? '').trim();
  const pin = String(b.pin ?? '');
  const subject = typeof b.subject === 'string' && b.subject.trim() ? b.subject.trim() : 'Science';
  if (!school || school.length > 200 || !name || name.length > 200 || !validPin(pin)) {
    throw new ApiError(400, 'school, name and a 5-digit PIN are required');
  }
  if (await prisma.school.findUnique({ where: { name: school } })) throw new ApiError(409, 'school already exists');
  const pinHash = await hashPin(pin);
  try {
    await prisma.school.create({
      data: { name: school, accounts: { create: { name, subject, role: 'admin', pinHash } } },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') throw new ApiError(409, 'school already exists');
    throw e;
  }
  return json({ ok: true, school, admin: name });
});
