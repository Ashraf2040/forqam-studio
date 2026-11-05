import 'next-auth/jwt';
declare module 'next-auth/jwt' {
  interface JWT {
    smRole?: 'admin' | 'management' | 'counselor' | 'teacher';
    subject?: string | null;
    school?: string;
    schoolId?: number;
    tv?: number;
  }
}
