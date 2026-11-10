'use client';

import { getSession, signIn, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

/*
 * Premium landing page + sign-in shell. One sign-in switches between the two
 * screens (/studio for teachers, /portal for staff). Same behavior as before:
 * the screens talk to each other and to this shell through window.postMessage.
 */

type Registry = Record<string, { pin: string | null; subject?: string | null; role: string }>;
type Sm = { name: string; role: string; subject: string | null; school: string };

type WizardStep = 'choose' | 'admin1' | 'admin2' | 'teacher' | 'success';

const norm = (s: string) => s.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function schoolHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
const mem: Record<string, string> = {};
const gs = (k: string) => { try { return localStorage.getItem(k); } catch { return mem[k] || null; } };
const ss = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { mem[k] = v; } };

function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M32 12l18 9-18 9-18-9z" fill="#f0c05a" />
        <path d="M22 27v10c0 4 5 7 10 7s10-3 10-7V27l-10 5z" fill="#2dd4bf" />
      </svg>
    </span>
  );
}

const FRAGMENTS = [
  { t: '🎮 Gran Turismo Race', d: 'Nitro-fueled leaderboard sprint' },
  { t: '🎡 Wheel of Fortune', d: 'Spin to pick the lucky student' },
  { t: '🎯 Dart Balloon Pop', d: 'Aim, throw, reveal the winner' },
  { t: '🎰 Lucky Jackpot', d: 'Three reels of classroom hype' },
  { t: '🚀 Rocket Race', d: 'First class to reach the Moon' },
  { t: '🕹️ Claw Machine', d: 'Grab the next champion' },
  { t: '🎣 Fishing Frenzy', d: 'Hook the hidden winner' },
  { t: '🎈 Balloon Cascade', d: 'Pop, cheer, learn, repeat' },
  { t: '📖 Magic Book', d: 'Enchanted pages pick the reader' },
];

const FEATURES = [
  { i: '⚡', c: '#f0c05a', t: 'One-glance dashboard', d: 'Every class, every tool and today\u2019s challenge on a single live command center — no digging through menus.' },
  { i: '📥', c: '#2dd4bf', t: 'Smart question import', d: 'Excel tables, Word documents, or just paste plain text — questions are parsed, saved to a library and ready to play in seconds.' },
  { i: '🎬', c: '#a78bfa', t: '8+ live game modes', d: 'Wheel, race, jackpot, darts, claw machine and more — every mode has animated stages, sound effects and automatic scoring.' },
  { i: '🖥️', c: '#6ea8ff', t: 'Presentations hub', d: 'Open slides, PDFs, videos and web resources side-by-side with the game without ever leaving the lesson.' },
  { i: '📊', c: '#f2ae5a', t: 'Insight & analytics', d: 'Live scoreboards, top-students comparator, period-filtered reports and awards, all computed while you teach.' },
  { i: '🌐', c: '#ff8fa3', t: 'English + Arabic, RTL', d: 'Bilingual experience built-in — Arabic UI, RTL layouts and both languages in every hint, report and label.' },
];

const STEPS = [
  { n: '01', t: 'Create your school', d: 'A 60-second wizard: school name, your name and a 5-digit PIN. No email, no verification loops — you\u2019re in immediately.' },
  { n: '02', t: 'Load your questions', d: 'Import from Excel or Word, paste plain text, or use the built-in starter packs. Mix, merge and switch sources anytime.' },
  { n: '03', t: 'Press play', d: 'Pick a game mode, hand the mic to a hero, and let the animations, scoreboard and awards do the show for you.' },
];

export default function Shell() {
  const [school, setSchool] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [studioOn, setStudioOn] = useState(false);
  const [portalOn, setPortalOn] = useState(false);

  // signup wizard state
  const [wizOpen, setWizOpen] = useState(false);
  const [wizStep, setWizStep] = useState<WizardStep>('choose');
  const [wizErr, setWizErr] = useState('');
  const [wizBusy, setWizBusy] = useState(false);
  const [su, setSu] = useState({ school: '', name: '', subject: 'Science', key: '', pin: '', pin2: '' });

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

  // Core sign-in flow (server edition, NextAuth cookie-backed).
  const authenticate = useCallback(async (sc: string, n: string, p: string) => {
    setErr('Signing you in…');
    (window as any).__smSchoolHash = schoolHash(sc);
    try {
      const r = await signIn('credentials', { redirect: false, school: sc, name: n, pin: p });
      if (!r || r.error || !r.ok) {
        const e = String(r?.error ?? '');
        if (e.startsWith('LOCKED:')) {
          const m = Math.max(1, Math.ceil((parseInt(e.split(':')[1], 10) || 300) / 60));
          setErr('Too many wrong attempts — locked. Try again in about ' + m + ' minute(s) · تم قفل الحساب مؤقتًا، حاول بعد ' + m + ' دقيقة');
          toast.error('Account temporarily locked — try again in about ' + m + ' min');
        } else if (e === 'SERVER') { setErr('Temporary server problem — please try again in a moment · مشكلة مؤقتة في الخادم، حاول بعد قليل'); toast.error('Server hiccup — please retry in a moment'); }
        else if (e === 'BAD_INPUT') setErr('Enter school, name and PIN');
        else if (!r) { setErr('Server not reachable — check your internet connection · تعذّر الاتصال بالخادم'); toast.error("Can't reach the server — check your internet"); }
        else setErr('Wrong school, name or PIN · المدرسة أو الاسم أو الرمز غير صحيح');
        return false;
      }
      const session = (await getSession()) as unknown as { sm?: Sm } | null;
      const d = session?.sm;
      if (!d) { setErr('Login failed — please try again'); return false; }
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
      toast.success('Welcome, ' + n + '! Signed in to ' + sc + ' · أهلاً ' + n, {
        iconTheme: { primary: '#f0c05a', secondary: '#0d1424' },
      });
      return true;
    } catch {
      setErr('Server not reachable — check your internet connection and try again');
      toast.error("Can't reach the server — check your internet");
      return false;
    }
  }, [go]);

  const login = async () => {
    const sc = school.trim(), n = name.trim(), p = norm(pin);
    if (!sc || !n || !p) { setErr('Enter school, name and PIN'); return; }
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await authenticate(sc, n, p); } finally { lock.current = false; setBusy(false); }
  };

  /* ---------------- signup wizard ---------------- */

  const openWizard = () => {
    setWizErr('');
    setSu((s) => ({ ...s, school: school.trim(), name: '', pin: '', pin2: '' }));
    setWizStep('choose');
    setWizOpen(true);
  };

  const goAdmin1 = () => { setWizErr(''); setWizStep('admin1'); };

  const admin1Next = () => {
    if (!su.school.trim() || !su.name.trim()) { setWizErr('Please enter the school name and your name'); return; }
    if (su.school.trim().length > 200 || su.name.trim().length > 200) { setWizErr('Keep names under 200 characters'); return; }
    setWizErr(''); setWizStep('admin2');
  };

  const submitSchool = async () => {
    const p = norm(su.pin);
    if (!su.key.trim()) { setWizErr('Your program provider gave you a school setup code — enter it here'); return; }
    if (!/^\d{5}$/.test(p)) { setWizErr('The PIN must be exactly 5 digits'); return; }
    if (p !== norm(su.pin2)) { setWizErr('The two PINs do not match'); return; }
    setWizBusy(true); setWizErr('');
    try {
      const r = await apiFetch('/api/enroll-school', {
        method: 'POST',
        body: { school: su.school.trim(), name: su.name.trim(), subject: su.subject.trim() || 'Science', pin: p, key: su.key.trim() },
      });
      const d = await r.json();
      if (!r.ok) {
        setWizErr(d.error || 'Enrollment failed — please try again');
        toast.error(String(d.error || 'Enrollment failed'));
        return;
      }
      setSchool(su.school.trim()); setName(su.name.trim()); setPin('');
      tok.current = { role: '', signedIn: false };
      setWizStep('success');
      toast.success('School created — you are the owner! 🎉');
    } catch {
      setWizErr('Server not reachable — check your internet connection and try again');
      toast.error("Can't reach the server — check your internet");
    } finally { setWizBusy(false); }
  };

  const finishSuccess = async () => {
    // Auto sign-in: no need to retype anything.
    setWizOpen(false);
    await authenticate(su.school.trim(), su.name.trim(), norm(su.pin));
  };

  const closeWizard = () => { if (!wizBusy) setWizOpen(false); };

  /* ---------------- postMessage bridge ---------------- */

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
      else if (d.t === 'signout') { toast.success('Signed out · تم تسجيل الخروج'); signOut({ redirect: false }).finally(() => location.reload()); }
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
          } catch {
            toast.error('Account change could not be saved — check the connection and try again');
          }
        })();
      }
      else if (d.t === 'awardResult') toS(d);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [go]);

  /* ---------------- landing page ---------------- */

  const scrollAuth = () => document.getElementById('authCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <>
      <div id="smLogin" className={hidden ? 'hide' : undefined}>
        <div className="landing">
          <span className="orb a" /><span className="orb b" /><span className="orb c" />

          <header className="topbar">
            <div className="brand">
              <BrandMark />
              <div>
                <b>Alforqan Studio</b>
                <small>Classroom Game Platform</small>
              </div>
            </div>
            <div className="actions">
              <span className="desk-note">Teachers · Admins · Counselors</span>
              <button type="button" className="btn gold" onClick={() => openWizard()}>Get Started</button>
              <button type="button" className="btn ghost" onClick={scrollAuth}>Sign in</button>
            </div>
          </header>

          {/* ============ HERO ============ */}
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><span className="dot" /> Live game shows for every lesson</span>
              <h1>Turn every lesson into an <span className="grad">unforgettable game</span></h1>
              <p className="sub">
                Import your questions in seconds, spin the wheel, launch the rockets — and let the
                scoreboard, sounds and awards do the show. <b>Zero setup friction</b>: one sign-in, one dashboard,
                everything bilingual in English and العربية.
              </p>
              <div className="hero-ctas">
                <button type="button" className="btn gold" onClick={() => openWizard()}>Create your school — free</button>
                <button type="button" className="btn" onClick={scrollAuth}>Sign in ▸</button>
              </div>
              <p className="lang-note">
                Works offline-safe · <span className="cairo" dir="rtl">يعمل باللغتين العربية والإنجليزية</span>
              </p>
              <div className="stat-row">
                <div className="stat"><b>8+</b><span>Game modes</span></div>
                <div className="stat"><b>3</b><span>Import formats</span></div>
                <div className="stat"><b>1</b><span>Sign-in for everything</span></div>
                <div className="stat"><b>100%</b><span>In-class privacy</span></div>
              </div>
            </div>

            <aside id="authCard" className="auth-card">
              <div className="badge-top">🎓</div>
              <h2>Welcome back</h2>
              <p className="au-sub">One sign-in for the whole platform · تسجيل دخول واحد للمنصة كاملة</p>

              <label className="field-label" htmlFor="smSchool">School</label>
              <input id="smSchool" list="smSchools" placeholder="E.g. Alforsan Middle School" autoComplete="off"
                value={school} onChange={(e) => setSchool(e.target.value)} />
              <datalist id="smSchools" />

              <label className="field-label" htmlFor="smT">Your name</label>
              <input id="smT" type="text" placeholder="Your full name" autoComplete="off"
                value={name} onChange={(e) => setName(e.target.value)} />

              <label className="field-label" htmlFor="smP">PIN · الرمز السري</label>
              <input id="smP" type="password" inputMode="numeric" maxLength={5} placeholder="•••••" autoComplete="off"
                value={pin} onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />

              <div id="smE" className="err">{err}</div>
              <button id="smGo" type="button" className="btn gold wide" disabled={busy} onClick={login}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="divider">New here?</div>
              <button id="smNewA" type="button" className="btn lnk" onClick={() => openWizard()}>
                Create your school & admin profile in 60 seconds →
              </button>
              <button id="smNew" type="button" className="btn lnk" onClick={() => { setWizOpen(true); setWizStep('teacher'); }}>
                Teacher? See how to get your account →
              </button>
            </aside>
          </section>

          {/* ============ MODE MARQUEE ============ */}
          <div className="mode-marquee" aria-hidden>
            <div className="track">
              {[...FRAGMENTS, ...FRAGMENTS].map((f, i) => (
                <span className="chip" key={i}>{f.t}<span style={{ color: 'var(--muted)', fontWeight: 600 }}> · {f.d}</span></span>
              ))}
            </div>
          </div>

          {/* ============ FEATURES ============ */}
          <section className="section">
            <div className="sec-head">
              <div className="sec-tag">Why Alforqan Studio</div>
              <h2 className="sec-title">Everything a legendary class needs — in one place</h2>
              <p className="sec-sub">Purpose-built for the classroom stage: fast imports, big shows, real insight. No tabs full of tabs.</p>
            </div>
            <div className="feature-grid">
              {FEATURES.map((f, i) => (
                <div className="feature-card" key={i}>
                  <span className="glow" style={{ background: f.c }} />
                  <div className="f-icon">{f.i}</div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ============ STEPS ============ */}
          <section className="section">
            <div className="sec-head">
              <div className="sec-tag">How it works</div>
              <h2 className="sec-title">From sign-up to showtime in three steps</h2>
            </div>
            <div className="steps">
              {STEPS.map((s, i) => (
                <div className="step-card" key={i}>
                  <div className="num">{s.n}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ============ CTA ============ */}
          <section className="section">
            <div className="cta-band">
              <h2>Your next class could be the one they never forget</h2>
              <p>
                Import a question set, press play and watch the room light up —
                <span dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}> ابدأ لعبتك الأولى في دقائق</span>
              </p>
              <div className="hero-ctas">
                <button type="button" className="btn gold" onClick={() => openWizard()}>Get started now</button>
                <button type="button" className="btn ghost" onClick={scrollAuth}>I already have an account</button>
              </div>
            </div>
          </section>

          <footer className="footer">
            <span>© {new Date().getFullYear()} Alforqan Studio · Learn · Play · Achieve</span>
            <span className="cairo" dir="rtl">منصة الفرقان — تعلّم • العب • أنجز</span>
          </footer>
        </div>

        {/* ============ SIGNUP WIZARD ============ */}
        {wizOpen && (
          <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeWizard(); }}>
            <div className="modal-shell">
              <div className="modal-card">
                <span style={{ position: 'absolute', inset: '18px 18px auto auto' }}>
                  <button type="button" className="btn ghost" style={{ padding: '8px 12px' }} onClick={closeWizard} aria-label="Close">✕</button>
                </span>

                {wizStep === 'choose' && (
                  <>
                    <h3>Create your profile</h3>
                    <p className="m-sub">Pick the path that describes you — it takes less than a minute.</p>
                    <div className="choice-grid">
                      <button type="button" className="choice-card" onClick={goAdmin1}>
                        <span className="c-icon">🏛️</span>
                        <h4>Create a new school</h4>
                        <p>I&apos;m setting up Alforqan Studio for my school (admin account + first login).</p>
                      </button>
                      <button type="button" className="choice-card" onClick={() => setWizStep('teacher')}>
                        <span className="c-icon">🧑‍🏫</span>
                        <h4>I&apos;m a teacher</h4>
                        <p>My school already uses Alforqan Studio — I want my own teacher profile.</p>
                      </button>
                    </div>
                  </>
                )}

                {wizStep === 'admin1' && (
                  <>
                    <div className="wiz-steps"><span className="dot-s on" /><span className="dot-s" /></div>
                    <h3>About your school</h3>
                    <p className="m-sub">Step 1 of 2 — the essentials. You&apos;ll secure the account with a PIN next.</p>
                    <div className="wiz-grid">
                      <div className="full">
                        <label className="field-label" htmlFor="suSchool">School name</label>
                        <input id="suSchool" placeholder="E.g. Alforsan Middle School" value={su.school}
                          onChange={(e) => setSu({ ...su, school: e.target.value })} autoFocus />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="suName">Admin name (you)</label>
                        <input id="suName" placeholder="Your full name" value={su.name}
                          onChange={(e) => setSu({ ...su, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="suSubject">Subject / role</label>
                        <input id="suSubject" placeholder="Science · Math · Administration…" value={su.subject}
                          onChange={(e) => setSu({ ...su, subject: e.target.value })} />
                      </div>
                    </div>
                    {wizErr && <div className="err">{wizErr}</div>}
                    <div className="wiz-foot">
                      <button type="button" className="btn ghost" onClick={() => setWizStep('choose')}>Back</button>
                      <button type="button" className="btn gold" onClick={admin1Next}>Continue →</button>
                    </div>
                  </>
                )}

                {wizStep === 'admin2' && (
                  <>
                    <div className="wiz-steps"><span className="dot-s on" /><span className="dot-s on" /></div>
                    <h3>Secure your account</h3>
                    <p className="m-sub">
                      Step 2 of 2 — paste the <b>school setup code</b> your program provider sent you, and choose a 5-digit PIN.
                    </p>
                    <label className="field-label" htmlFor="suKey">School setup code</label>
                    <input id="suKey" placeholder="Provided by your program provider" value={su.key}
                      onChange={(e) => setSu({ ...su, key: e.target.value })} />
                    <div className="wiz-grid">
                      <div>
                        <label className="field-label" htmlFor="suPin">Choose a 5-digit PIN</label>
                        <input id="suPin" type="password" inputMode="numeric" maxLength={5} placeholder="•••••" value={su.pin}
                          onChange={(e) => setSu({ ...su, pin: e.target.value.replace(/\D/g, '') })} />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="suPin2">Confirm PIN</label>
                        <input id="suPin2" type="password" inputMode="numeric" maxLength={5} placeholder="•••••" value={su.pin2}
                          onChange={(e) => setSu({ ...su, pin2: e.target.value.replace(/\D/g, '') })}
                          onKeyDown={(e) => { if (e.key === 'Enter') submitSchool(); }} />
                      </div>
                    </div>
                    {wizErr && <div className="err">{wizErr}</div>}
                    <div className="wiz-foot">
                      <button type="button" className="btn ghost" onClick={() => setWizStep('admin1')}>Back</button>
                      <button type="button" className="btn gold" disabled={wizBusy} onClick={submitSchool}>
                        {wizBusy ? 'Creating…' : 'Create school account'}
                      </button>
                    </div>
                  </>
                )}

                {wizStep === 'teacher' && (
                  <>
                    <h3>Getting a teacher profile</h3>
                    <p className="m-sub">In the server edition, your school admin creates teacher accounts — it takes them 30 seconds.</p>
                    <div className="steps" style={{ gap: 12 }}>
                      <div className="step-card">
                        <div className="num">1</div>
                        <h3>Ask your admin</h3>
                        <p>Your school admin opens the <b>Portal → Accounts</b> panel.</p>
                      </div>
                      <div className="step-card">
                        <div className="num">2</div>
                        <h3>Add teacher</h3>
                        <p>They add your name, subject and a 5-digit PIN you choose together.</p>
                      </div>
                      <div className="step-card">
                        <div className="num">3</div>
                        <h3>Sign in</h3>
                        <p>Sign in with your school, your name and your PIN — you land straight in the Studio.</p>
                      </div>
                    </div>
                    <div className="wiz-foot">
                      <button type="button" className="btn ghost" onClick={() => setWizStep('choose')}>Back</button>
                      <button type="button" className="btn gold auth" onClick={scrollAuth}>Got it — take me to sign in</button>
                    </div>
                  </>
                )}

                {wizStep === 'success' && (
                  <div className="success-box">
                    <div className="big-ico">🎉</div>
                    <h3>School created — welcome aboard!</h3>
                    <p>
                      <b>{su.school}</b> is live on Alforqan Studio. We&apos;ll sign you in automatically —
                      no need to retype anything.
                    </p>
                    <button type="button" className="btn gold wide" disabled={wizBusy} onClick={finishSuccess}>Enter my school →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <iframe id="fStudio" ref={fs} src="/studio" className={studioOn ? undefined : 'off'} allow="fullscreen; autoplay" allowFullScreen />
      <iframe id="fPortal" ref={fp} src="/portal" className={portalOn ? undefined : 'off'} allow="fullscreen" allowFullScreen />
    </>
  );
}
