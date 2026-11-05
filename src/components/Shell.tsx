'use client';

import { getSession, signIn, signOut } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

/*
 * The sign-in screen and the switch between the two screens (/studio for teachers, /portal for staff).
 * Same behavior as the original page: one sign-in, then the signed-in screen is shown and both screens talk to each
 * other and to this shell through window.postMessage.
 */

type Registry = Record<string, { pin: string | null; subject?: string | null; role: string }>;
type Sm = { name: string; role: string; subject: string | null; school: string };

const norm = (s: string) => s.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function schoolHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
const mem: Record<string, string> = {};
const gs = (k: string) => { try { return localStorage.getItem(k); } catch { return mem[k] || null; } };
const ss = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { mem[k] = v; } };

export default function Shell() {
  const [school, setSchool] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [studioOn, setStudioOn] = useState(false);
  const [portalOn, setPortalOn] = useState(false);
  const fs = useRef<HTMLIFrameElement>(null);
  const fp = useRef<HTMLIFrameElement>(null);
  const tok = useRef({ role: '', signedIn: false });
  const lock = useRef(false);

  useEffect(() => {
    const ls = gs('SM7_SGE_SM_LAST_SCHOOL'); if (ls) setSchool(ls);
    const lt = gs('SM7_SGE_SM_LAST_TEACHER'); if (lt) setName(lt);
  }, []);

  const go = useCallback((to: string) => {
    const s = to === 'studio';
    setStudioOn(s); setPortalOn(!s);
    try { (s ? fs : fp).current?.contentWindow?.focus(); } catch { /* ignore */ }
  }, []);

  const toS = (m: unknown) => fs.current?.contentWindow?.postMessage(m, '*');
  const toP = (m: unknown) => fp.current?.contentWindow?.postMessage(m, '*');

  const loginInner = async () => {
    const sc = school.trim(), n = name.trim(), p = norm(pin);
    if (!sc || !n || !p) { setErr('Enter school, name and PIN'); return; }
    setErr('Signing in...');
    (window as any).__smSchoolHash = schoolHash(sc);
    try {
      const r = await signIn('credentials', { redirect: false, school: sc, name: n, pin: p });
      if (!r || r.error || !r.ok) {
        const e = String(r?.error ?? '');
        if (e.startsWith('LOCKED:')) {
          const m = Math.max(1, Math.ceil((parseInt(e.split(':')[1], 10) || 300) / 60));
          setErr('Too many wrong attempts - locked. Try again in about ' + m + ' minute(s). / تم قفل الحساب مؤقتًا، حاول بعد ' + m + ' دقيقة');
        } else if (e === 'SERVER') setErr('Server problem - please try again in a moment. / مشكلة مؤقتة في الخادم، حاول بعد قليل');
        else if (e === 'BAD_INPUT') setErr('Enter school, name and PIN');
        else if (!r) setErr('Server not reachable. Check your internet connection and try again. / تعذّر الاتصال بالخادم، تأكد من الإنترنت وحاول مرة أخرى');
        else setErr('Wrong school, name or PIN');
        return;
      }
      const session = (await getSession()) as unknown as { sm?: Sm } | null;
      const d = session?.sm;
      if (!d) { setErr('Login failed, please try again'); return; }
      tok.current = { role: d.role, signedIn: true };
      ss('SM7_SGE_SM_LAST_TEACHER', n); ss('SM7_SGE_SM_LAST_SCHOOL', sc);
      ss('SM7_' + schoolHash(sc) + '_SMART_PORTAL_GENERAL_USER', n);
      setHidden(true);
      const t: Registry = {};
      t[n] = { pin: p, subject: d.subject, role: d.role };
      if (d.role !== 'teacher') {
        try {
          const rp = await apiFetch('/api/school/teachers-public');
          if (rp.ok) ((await rp.json()).teachers || []).forEach((x: any) => { if (!t[x.name]) t[x.name] = { pin: null, subject: x.subject, role: 'teacher' }; });
        } catch { /* ignore */ }
        if (d.role === 'admin') {
          try {
            const ra = await apiFetch('/api/accounts');
            if (ra.ok) ((await ra.json()).accounts || []).forEach((x: any) => { if (!t[x.name]) t[x.name] = { pin: null, subject: x.subject, role: x.role }; });
          } catch { /* ignore */ }
        }
      }
      // "token" is only a signed-in marker for the screens; the real session is the NextAuth cookie.
      const msg = { t: 'session', name: n, pin: p, subject: d.subject, role: d.role, registry: t, token: 'nextauth-session', school: sc };
      toP(msg); toS(msg);
      go(d.role === 'teacher' ? 'studio' : 'portal');
    } catch {
      setErr('Server not reachable. Check your internet connection and try again.');
    }
  };

  const login = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await loginInner(); } finally { lock.current = false; setBusy(false); }
  };

  const create = async (role: 'teacher' | 'admin') => {
    if (role === 'teacher') { alert('In the server edition, your school admin creates teacher accounts. Ask your admin to add you.'); return; }
    const sc = (prompt('New school name:') || '').trim(); if (!sc) return;
    const sk = (prompt('School setup code (from your program provider):') || '').trim(); if (!sk) return;
    const n = (prompt('Admin name:') || '').trim(); if (!n) return;
    const p = norm(prompt('Choose a 5-digit PIN:') || '');
    if (!/^\d{5}$/.test(p)) { alert('PIN must be exactly 5 digits.'); return; }
    try {
      const r = await apiFetch('/api/enroll-school', { method: 'POST', body: { school: sc, name: n, pin: p, subject: 'Administration', key: sk } });
      const d = await r.json();
      if (!r.ok) { alert(d.error || 'Enrollment failed'); return; }
      setSchool(sc); setName(n); setErr('School enrolled. Enter your PIN to sign in.'); setPin('');
    } catch { alert('Server not reachable. Check your internet connection and try again.'); }
  };

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || !d.t) return;
      const w = window as any;
      if (d.t === 'goto') go(d.to);
      else if (d.t === 'ready') {
        w.__rdy = w.__rdy || {}; w.__rdy[d.who] = 1;
        if (w.__rdy.studio && w.__rdy.portal && !w.__hs) { w.__hs = 1; toP({ t: 'needSnapshot' }); }
      }
      else if (d.t === 'portalSnapshot' || d.t === 'portalChanged') toS(d);
      else if (d.t === 'studioSnapshot') toP(d);
      else if (d.t === 'award' || d.t === 'topReq' || d.t === 'pctReq') toP(d);
      else if (d.t === 'topRes' || d.t === 'pctRes') toS(d);
      else if (d.t === 'signout') { signOut({ redirect: false }).finally(() => location.reload()); }
      else if (d.t === 'registryOp') {
        if (tok.current.role !== 'admin' || !tok.current.signedIn) return;
        (async () => {
          try {
            if (d.op === 'add' && d.pin) await apiFetch('/api/accounts', { method: 'POST', body: { name: d.name, pin: d.pin, subject: d.subject, role: d.role || 'teacher' } });
            else if (d.op === 'remove') await apiFetch('/api/accounts/' + encodeURIComponent(d.name), { method: 'DELETE' });
            else if (d.op === 'resetPin' && d.pin) await apiFetch('/api/accounts/' + encodeURIComponent(d.name) + '/reset-pin', { method: 'POST', body: { pin: d.pin } });
            else if (d.op === 'setSubject' && d.subject) await apiFetch('/api/accounts/' + encodeURIComponent(d.name), { method: 'PATCH', body: { subject: d.subject } });
            else if (d.op === 'addClass' && d.teacher && d.className) await apiFetch('/api/admin/teacher-class', { method: 'POST', body: { teacher: d.teacher, className: d.className } });
            const ra = await apiFetch('/api/accounts');
            if (ra.ok) {
              const aj = await ra.json(); const r: Registry = {};
              (aj.accounts || []).forEach((x: any) => { r[x.name] = { pin: null, subject: x.subject, role: x.role }; });
              toP({ t: 'registry', registry: r });
            }
          } catch { /* ignore */ }
        })();
      }
      else if (d.t === 'awardResult') toS(d);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [go]);

  return (
    <>
      <div id="smLogin" className={hidden ? 'hide' : undefined}>
        <div className="box">
          <div className="logo">🎓</div>
          <h2>Alforqan - Studio</h2>
          <p>One sign-in for the whole platform</p>
          <input id="smSchool" list="smSchools" placeholder="School name" autoComplete="off" value={school} onChange={(e) => setSchool(e.target.value)} />
          <datalist id="smSchools"></datalist>
          <input id="smT" type="text" placeholder="Your name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          <input id="smP" type="password" inputMode="numeric" maxLength={5} placeholder="5-digit PIN" autoComplete="off" value={pin}
            onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />
          <div id="smE">{err}</div>
          <button id="smGo" type="button" disabled={busy} onClick={login}>Sign in</button>
          <button id="smNew" type="button" className="lnk" onClick={() => create('teacher')}>＋ Create my teacher profile on this device</button>
          <button id="smNewA" type="button" className="lnk" onClick={() => create('admin')}>＋ Create admin profile</button>
        </div>
      </div>
      <iframe id="fStudio" ref={fs} src="/studio" className={studioOn ? undefined : 'off'} allow="fullscreen; autoplay" allowFullScreen />
      <iframe id="fPortal" ref={fp} src="/portal" className={portalOn ? undefined : 'off'} allow="fullscreen" allowFullScreen />
    </>
  );
}
