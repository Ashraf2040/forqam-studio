import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { checkLogin, type Role } from './accounts';
import { prisma } from './db';
import { ApiError } from './http';

export const SESSION_TTL_SEC = 12 * 3600; // same 12h session as the original

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: SESSION_TTL_SEC },
  jwt: { maxAge: SESSION_TTL_SEC },
  pages: { signIn: '/', error: '/' },
  providers: [
    CredentialsProvider({
      name: 'School PIN',
      credentials: {
        school: { label: 'School', type: 'text' },
        name: { label: 'Name', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        const school = String(credentials?.school ?? '').trim();
        const name = String(credentials?.name ?? '').trim();
        const pin = String(credentials?.pin ?? '');
        if (!school || !name || !pin || school.length > 200 || name.length > 200 || pin.length > 20) {
          throw new Error('BAD_INPUT');
        }
        let r;
        try {
          r = await checkLogin(school, name, pin);
        } catch (e) {
          console.error('login failed (database)', e);
          throw new Error('SERVER');
        }
        if (r.status === 429) throw new Error('LOCKED:' + (r.retryAfter ?? 300));
        if (r.status !== 200) throw new Error('BAD_CREDENTIALS');
        return {
          id: String(r.id), name: r.name,
          smRole: r.role, subject: r.subject, school: r.school, schoolId: r.schoolId, tv: r.tv,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.sub = String(u.id);
        token.name = String(u.name);
        token.smRole = u.smRole as Role;
        token.subject = (u.subject as string | null) ?? null;
        token.school = u.school as string;
        token.schoolId = u.schoolId as number;
        token.tv = u.tv as number;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).sm = {
        id: Number(token.sub), name: token.name, role: token.smRole, subject: token.subject,
        school: token.school, schoolId: token.schoolId, tv: token.tv,
      };
      return session;
    },
  },
};

type SessionSm = { tv: number };
export type Me = { id: number; name: string; role: Role; schoolId: number; subject: string | null; school: string };

/**
 * Signed-in account for an API call, or ApiError 401.
 * Like the original "fresh account" check: the session dies at once when the account is
 * deleted, renamed, its role changed or its PIN is reset (token version bump).
 */
export async function requireMe(): Promise<Me> {
  const session = (await getServerSession(authOptions)) as unknown as { sm?: Me & SessionSm } | null;
  const sm = session?.sm;
  if (!sm || !sm.id) throw new ApiError(401, 'unauthorized');
  const acc = await prisma.account.findUnique({ where: { id: sm.id } });
  if (
    !acc || acc.schoolId !== sm.schoolId || acc.name !== sm.name || acc.role !== sm.role ||
    acc.tokenVersion !== sm.tv
  ) {
    throw new ApiError(401, 'unauthorized');
  }
  return { id: acc.id, name: acc.name, role: acc.role as Role, schoolId: acc.schoolId, subject: acc.subject, school: sm.school };
}
