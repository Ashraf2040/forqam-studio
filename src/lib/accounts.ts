import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const LOCK_MAX = 5;
export const LOCK_SECS = 300;
export const ROLES = ['admin', 'management', 'counselor', 'teacher'] as const;
export type Role = (typeof ROLES)[number];

export const validPin = (p: unknown): p is string => typeof p === 'string' && /^\d{5}$/.test(p);
export const hashPin = (pin: string) => bcrypt.hash(pin, 10);

// Fixed dummy hash so unknown names cost the same time as wrong PINs.
const DUMMY_HASH = bcrypt.hashSync('00000', 10);

export type LoginResult =
  | { status: 200; id: number; schoolId: number; name: string; subject: string | null; role: Role; tv: number; school: string }
  | { status: 401 | 429; error: string; retryAfter?: number };

/** PIN login with the original lockout rules: 5 wrong attempts lock the account for 5 minutes. */
export async function checkLogin(schoolRaw: string, nameRaw: string, pin: string): Promise<LoginResult> {
  const school = schoolRaw.trim();
  const name = nameRaw.trim();
  return prisma.$transaction(
    async (tx) => {
      const sch = await tx.school.findUnique({ where: { name: school } });
      const sid = sch?.id ?? -1;
      // serialize attempts per (school, name) so parallel requests cannot outrun the lockout
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sid + '|' + name + '|login'}))`;
      const lf = await tx.loginFail.findUnique({ where: { schoolId_name: { schoolId: sid, name } } });
      const now = new Date();
      if (lf?.lockedUntil && lf.lockedUntil > now) {
        return {
          status: 429, error: 'too many failed attempts - account locked',
          retryAfter: Math.floor((lf.lockedUntil.getTime() - now.getTime()) / 1000) + 1,
        } as LoginResult;
      }
      const acc = sch ? await tx.account.findUnique({ where: { schoolId_name: { schoolId: sch.id, name } } }) : null;
      const ok = await bcrypt.compare(pin || '', acc ? acc.pinHash : DUMMY_HASH);
      if (!acc || !ok) {
        const fails = (lf?.fails ?? 0) + 1;
        if (fails >= LOCK_MAX) {
          await tx.loginFail.upsert({
            where: { schoolId_name: { schoolId: sid, name } },
            create: { schoolId: sid, name, fails: 0, lockedUntil: new Date(Date.now() + LOCK_SECS * 1000) },
            update: { fails: 0, lockedUntil: new Date(Date.now() + LOCK_SECS * 1000) },
          });
          return { status: 429, error: 'too many failed attempts - account locked', retryAfter: LOCK_SECS } as LoginResult;
        }
        await tx.loginFail.upsert({
          where: { schoolId_name: { schoolId: sid, name } },
          create: { schoolId: sid, name, fails, lockedUntil: null },
          update: { fails, lockedUntil: null },
        });
        return { status: 401, error: 'wrong school, name or PIN' } as LoginResult;
      }
      await tx.loginFail.deleteMany({ where: { schoolId: sch!.id, name } });
      return {
        status: 200, id: acc.id, schoolId: acc.schoolId, name: acc.name, subject: acc.subject,
        role: acc.role as Role, tv: acc.tokenVersion, school,
      } as LoginResult;
    },
    { timeout: 15000 },
  );
}
