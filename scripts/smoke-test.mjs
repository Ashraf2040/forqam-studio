// End-to-end smoke test against a RUNNING app (npm run build && npm start) on an EMPTY test database.
// Uses a fictional school created for the test - never real data. Run it only against an EMPTY or throwaway database.
// Usage:  BASE=http://localhost:3000 ENROLL_KEY=... node scripts/smoke-test.mjs
const BASE = process.env.BASE || 'http://localhost:3000';
const KEY = process.env.ENROLL_KEY || '';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

class Client {
  jar = {};
  async req(path, { method = 'GET', body, form } = {}) {
    const h = { Cookie: Object.entries(this.jar).map(([k, v]) => k + '=' + v).join('; ') };
    let b;
    if (form) { h['Content-Type'] = 'application/x-www-form-urlencoded'; b = new URLSearchParams(form).toString(); }
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
    const r = await fetch(BASE + path, { method, headers: h, body: b, redirect: 'manual' });
    for (const c of r.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); this.jar[kv.slice(0, i)] = kv.slice(i + 1); }
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, j };
  }
  async login(school, name, pin) {
    const { j: { csrfToken } } = await this.req('/api/auth/csrf');
    const r = await this.req('/api/auth/callback/credentials', { method: 'POST', form: { csrfToken, school, name, pin, json: 'true', callbackUrl: BASE + '/' } });
    const err = r.j?.url ? new URL(r.j.url).searchParams.get('error') : null;
    const s = await this.req('/api/auth/session');
    return { err, sm: s.j?.sm };
  }
}

const S = 'Test School ' + Date.now();
const admin = new Client(), t1 = new Client(), t2 = new Client(), anon = new Client();

console.log('anonymous');
ok((await anon.req('/api/portal/me')).status === 401, 'no session -> 401');
ok((await anon.req('/api/accounts')).status === 401, 'accounts need a session');

console.log('enroll school');
ok((await anon.req('/api/enroll-school', { method: 'POST', body: { school: S, name: 'Admin', pin: '11111', key: 'wrong' } })).status === 403, 'wrong setup code rejected');
ok((await anon.req('/api/enroll-school', { method: 'POST', body: { school: S, name: 'Admin', pin: '1111', key: KEY } })).status === 400, 'bad PIN rejected');
ok((await anon.req('/api/enroll-school', { method: 'POST', body: { school: S, name: 'Admin', pin: '11111', key: KEY } })).j?.ok === true, 'school + admin created');
ok((await anon.req('/api/enroll-school', { method: 'POST', body: { school: S, name: 'Admin', pin: '11111', key: KEY } })).status === 409, 'duplicate school rejected');

console.log('login');
let r = await admin.login(S, 'Admin', '00000');
ok(r.err === 'BAD_CREDENTIALS', 'wrong PIN rejected');
r = await admin.login(S, 'Admin', '11111');
ok(r.sm?.role === 'admin' && r.sm.name === 'Admin', 'admin signs in (NextAuth session)');

console.log('accounts (admin)');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Teacher One', pin: '22222', subject: 'Science', role: 'teacher' } })).j?.ok, 'create teacher');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Teacher Two', pin: '33333', subject: 'Math', role: 'teacher' } })).j?.ok, 'create 2nd teacher');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Teacher One', pin: '22222', role: 'teacher' } })).status === 409, 'duplicate name rejected');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Bad', pin: '22222', role: 'king' } })).status === 400, 'invalid role rejected');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Counselor', pin: '44444', subject: 'Counseling', role: 'counselor' } })).j?.ok, 'create counselor');
const list = (await admin.req('/api/accounts')).j?.accounts ?? [];
ok(list.length === 4 && !JSON.stringify(list).includes('pin'), 'list has 4 accounts, no PIN data');
ok(((await admin.req('/api/school/teachers-public')).j?.teachers ?? []).length === 2, 'teachers-public lists teachers only');

console.log('teacher documents (versioned)');
await t1.login(S, 'Teacher One', '22222'); await t2.login(S, 'Teacher Two', '33333');
ok((await t1.req('/api/accounts')).j?.accounts?.length === 0, 'teacher cannot list accounts');
ok((await t1.req('/api/accounts', { method: 'POST', body: { name: 'X', pin: '55555' } })).status === 403, 'teacher cannot create accounts');
let g = await t1.req('/api/portal/me'); ok(g.j?.data === null && g.j?.version === 0, 'empty portal doc starts at version 0');
let p = await t1.req('/api/portal/me', { method: 'PUT', body: { data: { classes: { A: {} } }, base_version: 0, mutation_id: 'm1' } });
ok(p.j?.ok && p.j.version === 1, 'first save -> version 1');
p = await t1.req('/api/portal/me', { method: 'PUT', body: { data: { classes: { A: {} } }, base_version: 0, mutation_id: 'm1' } });
ok(p.j?.ok && p.j.already === true, 'same mutation_id replay is idempotent');
p = await t1.req('/api/portal/me', { method: 'PUT', body: { data: { x: 1 }, base_version: 0, mutation_id: 'm2' } });
ok(p.status === 409 && p.j?.error === 'conflict' && p.j.version === 1 && p.j.data, 'stale base_version -> 409 conflict with server copy');
p = await t1.req('/api/portal/me', { method: 'PUT', body: { data: { x: 2 }, base_version: 1, mutation_id: 'm3' } });
ok(p.j?.version === 2, 'save on current version -> version 2');
const race = await Promise.all([1, 2, 3, 4, 5].map((i) => t1.req('/api/portal/me', { method: 'PUT', body: { data: { race: i }, base_version: 2, mutation_id: 'r' + i } })));
ok(race.filter((x) => x.j?.ok).length === 1, 'concurrent writers: exactly one wins');
ok((await admin.req('/api/portal/me', { method: 'PUT', body: { data: {}, base_version: 0 } })).status === 403, 'admin cannot write teaching records');
const sp = (await admin.req('/api/school/portal')).j?.data ?? {};
ok(Object.keys(sp).includes('Teacher One') && !Object.keys(sp).includes('Teacher Two'), 'admin sees school-wide portal data');
ok(Object.keys((await t2.req('/api/school/portal')).j?.data ?? {}).length === 0, "teacher cannot read another teacher's data");
// studio quota
let big = await t1.req('/api/studio/me', { method: 'PUT', body: { data: { questionFiles: [1, 2, 3, 4, 5, 6] }, base_version: 0 } });
ok(big.status === 409 && big.j?.quota === 5, 'question-file quota enforced');

console.log('admin adds an empty class');
ok((await admin.req('/api/admin/teacher-class', { method: 'POST', body: { teacher: 'Teacher Two', className: '7C' } })).j?.ok, 'class added to teacher');
g = await t2.req('/api/portal/me'); ok(g.j?.data?.classes?.['7C']?.students?.length === 0, 'teacher sees the empty class');
ok((await t1.req('/api/admin/teacher-class', { method: 'POST', body: { teacher: 'Teacher Two', className: 'X' } })).status === 403, 'teacher cannot add classes for others');

console.log('decks (stored in the database)');
const b64 = Buffer.from('hello deck').toString('base64');
let d = await t1.req('/api/decks/d1', { method: 'PUT', body: { name: 'My deck', b64 } });
ok(d.j?.ok && d.j.version === 1, 'upload deck');
d = await t1.req('/api/decks/d1'); ok(d.j?.b64 === b64 && d.j.name === 'My deck', 'download deck round-trips');
ok(((await t1.req('/api/decks')).j?.decks ?? []).length === 1, 'list decks');
ok((await t2.req('/api/decks/d1')).status === 404, "another teacher cannot read the deck");
for (let i = 2; i <= 5; i++) await t1.req('/api/decks/d' + i, { method: 'PUT', body: { name: 'n' + i, b64 } });
ok((await t1.req('/api/decks/d6', { method: 'PUT', body: { name: 'n6', b64 } })).status === 409, 'deck quota (5) enforced');
ok((await t1.req('/api/decks/d1', { method: 'DELETE' })).j?.ok, 'delete deck');
ok((await t1.req('/api/decks/d1')).status === 404, 'deleted deck is gone');
ok((await t1.req('/api/decks')).j?.decks?.find((x) => x.id === 'd1')?.deleted === true, 'tombstone kept in list');

console.log('lockout');
const lk = new Client(); let last;
for (let i = 0; i < 5; i++) last = await lk.login(S, 'Teacher Two', '99999');
ok(String(last.err).startsWith('LOCKED:'), '5 wrong PINs lock the account');
ok(String((await lk.login(S, 'Teacher Two', '33333')).err).startsWith('LOCKED:'), 'correct PIN refused while locked');

console.log('PIN reset / delete kill sessions at once');
ok((await t1.req('/api/portal/me')).status === 200, 'teacher session valid');
ok((await admin.req('/api/accounts/' + encodeURIComponent('Teacher One') + '/reset-pin', { method: 'POST', body: { pin: '66666' } })).j?.ok, 'admin resets PIN');
ok((await t1.req('/api/portal/me')).status === 401, 'old session is dead after PIN reset');
ok((await new Client().login(S, 'Teacher One', '66666')).sm?.name === 'Teacher One', 'new PIN works');
ok((await admin.req('/api/accounts/Counselor', { method: 'DELETE' })).j?.ok, 'admin deletes account');
ok((await admin.req('/api/accounts/Admin', { method: 'DELETE' })).status === 400, 'admin cannot delete self');
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Teacher One', pin: '12121' } })).status === 409, 'existing name still blocked');
await admin.req('/api/accounts/' + encodeURIComponent('Teacher Two'), { method: 'DELETE' });
ok((await admin.req('/api/accounts', { method: 'POST', body: { name: 'Teacher Two', pin: '12121' } })).status === 409, 'deleted name with retained data cannot be reused');
ok((await t2.req('/api/portal/me')).status === 401, 'deleted account session is dead');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
