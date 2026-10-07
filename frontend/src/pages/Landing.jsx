import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, Bot, Database, LineChart, ShieldAlert, ShieldCheck, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo, { LogoMark } from '../components/Logo';
import { Button } from '../components/ui';
import { cn } from '../lib/cn';
import { gsap, magnetic, prefersReducedMotion, ScrollTrigger, SplitText, spotlight } from '../lib/motion';

const HeroScene = lazy(() => import('../three/HeroScene'));

const INTRO_KEY = 'finsight:intro-seen';

// ── Intro: the logo builds itself, then a gold curtain lifts ────────────────
function Intro({ onDone }) {
  const rootRef = useRef(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: onDone });
      tl.from('[data-intro-word]', { yPercent: 120, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out' }, 1.05)
        .to('[data-intro-bar]', { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, 0.4)
        .to('[data-intro-inner]', { scale: 0.92, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.35')
        .to('[data-intro-panel]', { yPercent: -100, duration: 1.05, stagger: 0.08, ease: 'expo.inOut' }, '-=0.25');
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={rootRef} className="fixed inset-0 z-[100]" aria-hidden="true">
      <div data-intro-panel className="absolute inset-0 bg-gradient-to-b from-brand-300 to-brand-600" />
      <div data-intro-panel className="absolute inset-0 grid place-items-center bg-ink-950">
        <div data-intro-inner className="flex flex-col items-center gap-6">
          <LogoMark size={88} animate />
          <div className="overflow-hidden text-3xl font-semibold tracking-[-0.03em]">
            <span data-intro-word className="inline-block">FinSight</span>{' '}
            <span data-intro-word className="display inline-block italic text-gold-gradient pr-1">AI</span>
          </div>
          <div className="h-px w-40 overflow-hidden bg-white/10">
            <div data-intro-bar className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-brand-600 via-brand-300 to-brand-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Floating glass cards around the 3D core ────────────────────────────────
function FloatCard({ className, depth = 1, children }) {
  return (
    <div data-float data-depth={depth} className={cn('pointer-events-none absolute hidden xl:block', className)}>
      <div className="panel !rounded-2xl !bg-ink-850/60 px-4 py-3 shadow-2xl backdrop-blur-xl">{children}</div>
    </div>
  );
}

function Sparkline() {
  return (
    <svg width="120" height="36" viewBox="0 0 120 36" fill="none">
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d4af37" stopOpacity="0.4" /><stop offset="1" stopColor="#d4af37" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M0 28 L18 24 L34 26 L52 18 L70 20 L88 11 L104 13 L120 4 L120 36 L0 36Z" fill="url(#spk)" />
      <path data-draw d="M0 28 L18 24 L34 26 L52 18 L70 20 L88 11 L104 13 L120 4" stroke="#e8c967" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Bento feature cards with live mini-visuals ─────────────────────────────
const FEATURES = [
  {
    icon: LineChart, title: 'A forecast that learns you', span: 'md:col-span-2',
    body: 'Every category is forecast from your own months — with an honest 80% range and a measured accuracy score.',
    visual: 'chart',
  },
  { icon: ShieldAlert, title: 'Overspend risk, as a probability', body: 'The chance next month beats your income, and exactly which categories push it up.', visual: 'ring' },
  { icon: Activity, title: 'Spots what’s unusual for you', body: 'A spike is judged against your normal, scaled to income — a raise never looks like overspending.', visual: 'bars' },
  {
    icon: Bot, title: 'An advisor that knows your numbers', span: 'md:col-span-2',
    body: 'Ask in plain English. Answers stream in, grounded in your forecast, risk and goals — never invented figures.',
    visual: 'chat',
  },
];

function FeatureVisual({ kind }) {
  if (kind === 'chart') {
    return (
      <svg viewBox="0 0 320 90" className="h-24 w-full" fill="none">
        <path d="M0 70 C40 66 60 50 100 54 S170 40 200 36" stroke="#d4af37" strokeWidth="2.5" data-draw />
        <path d="M200 36 C230 32 260 22 320 14" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="6 6" data-draw />
        <path d="M200 36 C230 26 260 8 320 -2 L320 30 C260 36 230 42 200 36Z" fill="#a78bfa" opacity="0.12" />
        <circle cx="200" cy="36" r="4" fill="#d4af37" />
      </svg>
    );
  }
  if (kind === 'ring') {
    return (
      <svg viewBox="0 0 90 90" className="h-24 w-24" fill="none">
        <circle cx="45" cy="45" r="36" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx="45" cy="45" r="36" stroke="#34d399" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 45 45)"
          strokeDasharray={2 * Math.PI * 36} data-ring style={{ strokeDashoffset: 2 * Math.PI * 36 }} />
        <text x="45" y="51" textAnchor="middle" fill="#eceef1" fontSize="18" fontFamily="Geist Mono">8%</text>
      </svg>
    );
  }
  if (kind === 'bars') {
    return (
      <div className="flex h-24 items-end gap-2">
        {[38, 44, 40, 46, 42, 92].map((h, i) => (
          <div key={i} data-grow className={cn('w-5 origin-bottom rounded-md', i === 5 ? 'bg-warn shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'bg-white/15')} style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2 text-[13px]">
      <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-fg px-3 py-2 text-ink-950">Can I afford a Goa trip in March?</div>
      <div data-typing className="w-fit max-w-[90%] rounded-2xl rounded-tl-md border border-line bg-white/[0.04] px-3 py-2 text-fg-muted">
        Yes — at your recent ₹33k/month savings, ₹45k by March leaves room for your emergency fund.
      </div>
    </div>
  );
}

const STEPS = [
  { icon: Database, title: 'Log it', body: 'Add a transaction in seconds, or a whole month at once.' },
  { icon: TrendingUp, title: 'See ahead', body: 'Forecasts, risk and anomalies update instantly.' },
  { icon: Sparkles, title: 'Ask anything', body: 'Your advisor explains it all in plain language.' },
  { icon: Target, title: 'Hit your goals', body: 'Goals are checked against what you really save.' },
];

const MARQUEE = ['Personal forecasts', '80% prediction ranges', 'Overspend probability', 'Anomalies vs. your normal',
  'Streaming AI advisor', 'Goal capacity planning', 'Built for India · ₹', 'Backtested accuracy'];

export default function Landing() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const sceneRef = useRef(null);
  const headlineRef = useRef(null);
  const [showIntro, setShowIntro] = useState(() => {
    try { return !prefersReducedMotion() && !sessionStorage.getItem(INTRO_KEY); } catch { return false; }
  });
  const [ready, setReady] = useState(!showIntro);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const finishIntro = () => {
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* storage unavailable */ }
    setShowIntro(false);
    setReady(true);
  };

  // Hero entrance — runs once the intro curtain has lifted.
  useLayoutEffect(() => {
    if (!ready) return undefined;
    let split;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return;
      split = SplitText.create(headlineRef.current, { type: 'chars,words', charsClass: 'inline-block' });
      split.words.forEach((w) => { if (w.closest('.text-gold-gradient')) w.querySelectorAll('div').forEach((c) => c.classList.add('text-gold-gradient')); });
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('[data-nav] > *', { y: -20, opacity: 0, stagger: 0.06, duration: 1 })
        .from('[data-hero-eyebrow]', { y: 16, opacity: 0, duration: 0.9 }, 0.1)
        .from(split.chars, { yPercent: 120, rotateX: -80, opacity: 0, transformOrigin: '50% 100% -20px', stagger: 0.018, duration: 1.2 }, 0.2)
        .from('[data-hero-sub]', { y: 20, opacity: 0, filter: 'blur(8px)', duration: 1.1 }, 0.7)
        .from('[data-hero-cta] > *', { y: 20, opacity: 0, stagger: 0.1, duration: 1 }, 0.85)
        .from('[data-float]', { opacity: 0, scale: 0.8, y: 30, stagger: 0.12, duration: 1.3 }, 1.0)
        .from('[data-hero] [data-draw]', { drawSVG: '0%', duration: 1.6, ease: 'power2.inOut' }, 1.2)
        .from('[data-scroll-hint]', { opacity: 0, y: -10, duration: 1 }, 1.6);

      // Idle float + pointer parallax for the glass cards.
      gsap.utils.toArray('[data-float]').forEach((el, i) => {
        gsap.to(el.firstChild, { y: i % 2 ? 10 : -10, duration: 3 + i * 0.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
    }, rootRef);
    return () => { ctx.revert(); split?.revert(); };
  }, [ready]);

  // Pointer parallax, scroll-driven scene, section reveals.
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      const floats = gsap.utils.toArray('[data-float]').map((el) => ({
        x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3.out' }),
        depth: Number(el.dataset.depth || 1),
      }));
      const onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        floats.forEach((f) => { f.x(nx * 40 * f.depth); f.y(ny * 30 * f.depth); });
      };
      window.addEventListener('pointermove', onMove);

      ScrollTrigger.create({
        trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (self) => sceneRef.current?.setScroll(self.progress),
      });
      gsap.to('[data-hero-copy]', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: '70% top', scrub: true } });

      // Infinite marquee.
      const track = document.querySelector('[data-marquee]');
      if (track) gsap.to(track, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });

      // Section reveals.
      gsap.utils.toArray('[data-section-title]').forEach((el) => {
        const s = SplitText.create(el, { type: 'lines', mask: 'lines' });
        gsap.from(s.lines, { yPercent: 110, stagger: 0.1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
      });
      gsap.utils.toArray('[data-bento]').forEach((card, i) => {
        gsap.from(card, { y: 60, opacity: 0, rotateX: -8, transformPerspective: 900, duration: 1.2, delay: (i % 2) * 0.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
        const st = { trigger: card, start: 'top 75%' };
        card.querySelectorAll('[data-draw]').forEach((p) => gsap.from(p, { drawSVG: '0%', duration: 1.8, ease: 'power2.inOut', scrollTrigger: st }));
        card.querySelectorAll('[data-ring]').forEach((c) => gsap.to(c, { strokeDashoffset: 2 * Math.PI * 36 * 0.92, duration: 1.8, ease: 'expo.out', scrollTrigger: st }));
        card.querySelectorAll('[data-grow]').forEach((b, j) => gsap.from(b, { scaleY: 0, duration: 1, delay: j * 0.08, ease: 'back.out(1.6)', scrollTrigger: st }));
        card.querySelectorAll('[data-typing]').forEach((t) => {
          const words = SplitText.create(t, { type: 'words' }).words;
          gsap.from(words, { opacity: 0, duration: 0.05, stagger: 0.06, ease: 'none', scrollTrigger: st });
        });
      });

      // Steps: progress line draws as you scroll; each step lights up.
      gsap.fromTo('[data-steps-line]', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-steps]', start: 'top 70%', end: 'bottom 60%', scrub: true } });
      gsap.utils.toArray('[data-step]').forEach((s, i) => {
        gsap.from(s, { y: 40, opacity: 0, duration: 1, delay: i * 0.12, ease: 'expo.out', scrollTrigger: { trigger: '[data-steps]', start: 'top 75%' } });
      });

      // Stats count up.
      gsap.utils.toArray('[data-count]').forEach((el) => {
        const end = Number(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const state = { v: 0 };
        gsap.to(state, {
          v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' },
          onUpdate: () => { el.textContent = `${Math.round(state.v)}${suffix}`; },
        });
      });

      gsap.from('[data-cta-card]', { scale: 0.92, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '[data-cta-card]', start: 'top 85%' } });

      return () => window.removeEventListener('pointermove', onMove);
    }, rootRef);
    const cleanups = [...rootRef.current.querySelectorAll('[data-magnet]')].map((el) => magnetic(el, 0.3))
      .concat([...rootRef.current.querySelectorAll('[data-spot]')].map((el) => spotlight(el)));
    return () => { ctx.revert(); cleanups.forEach((c) => c()); };
  }, [ready]);

  const primaryCta = token ? { to: '/', label: 'Open your dashboard' } : { to: '/register', label: 'Start free' };

  return (
    <div ref={rootRef} className="relative min-h-dvh overflow-x-clip bg-ink-950 text-fg">
      {showIntro && <Intro onDone={finishIntro} />}

      {/* Nav */}
      <header className={cn('fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled ? 'border-line bg-ink-950/70 backdrop-blur-xl' : 'border-transparent')}>
        <nav data-nav className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link to="/welcome" aria-label="FinSight AI home"><Logo size={32} /></Link>
          <div className="ml-auto hidden items-center gap-1 rounded-full border border-line bg-ink-900/50 p-1 backdrop-blur-xl md:flex">
            {[['Features', '#features'], ['How it works', '#steps'], ['Why FinSight', '#stats']].map(([label, href]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-1.5 text-[13px] text-fg-muted transition hover:bg-white/[0.06] hover:text-fg">{label}</a>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {!token && <Link to="/login" className="hidden px-3 text-sm text-fg-muted hover:text-fg sm:block">Sign in</Link>}
            <Link to={primaryCta.to}><Button size="sm">{token ? 'Dashboard' : 'Get started'} <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section data-hero className="relative h-[100dvh] min-h-[640px] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/[0.08] blur-[120px]" />
          <div className="absolute -right-40 bottom-0 h-[50vh] w-[50vw] rounded-full bg-ai/[0.08] blur-[140px]" />
        </div>
        <Suspense fallback={null}>
          <HeroScene ref={sceneRef} play={ready} className="absolute inset-0" />
        </Suspense>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_42%_at_50%_52%,rgba(5,6,8,0.62),transparent_72%)]" />

        <FloatCard className="left-[5%] top-[26%]" depth={1.2}>
          <p className="text-[11px] text-fg-faint">Next month forecast</p>
          <p className="num mt-1 text-xl">₹53,360</p>
          <Sparkline />
        </FloatCard>
        <FloatCard className="right-[5%] top-[24%]" depth={0.8}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pos/15 text-pos"><ShieldCheck className="h-4 w-4" /></span>
            <div><p className="text-[11px] text-fg-faint">Overspend risk</p><p className="num text-lg text-pos">4%</p></div>
          </div>
        </FloatCard>
        <FloatCard className="bottom-[16%] right-[6%]" depth={1.5}>
          <div className="flex max-w-[230px] items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ai/15 text-ai"><Sparkles className="h-3.5 w-3.5" /></span>
            <p className="text-[12px] leading-relaxed text-fg-muted">Shopping is ₹11,118 above your usual. Want a plan to bring it back?</p>
          </div>
        </FloatCard>
        <FloatCard className="bottom-[18%] left-[6%]" depth={1}>
          <p className="text-[11px] text-fg-faint">Goa trip · on track</p>
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-brand-500 to-brand-300" /></div>
        </FloatCard>

        <div data-hero-copy className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <p data-hero-eyebrow className="chip mb-6 !bg-ink-900/60 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-pos" /> AI money forecasting, built for India</p>
          <h1 ref={headlineRef} className="max-w-5xl text-[44px] font-medium leading-[0.98] tracking-[-0.045em] [perspective:600px] sm:text-[72px] lg:text-[92px]"
            style={{ textShadow: '0 10px 60px rgba(0,0,0,0.6)' }}>
            See where your money <span className="display italic text-gold-gradient">is going next.</span>
          </h1>
          <p data-hero-sub className="mt-6 max-w-xl text-[16px] leading-relaxed text-fg-muted sm:text-lg">
            FinSight forecasts your spending from your own history, warns you before you overspend, and explains it all through an AI advisor that knows your numbers.
          </p>
          <div data-hero-cta className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryCta.to} data-magnet className="inline-block">
              <Button size="lg" className="h-13 px-7 text-[15px]">{primaryCta.label} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <a href="#features"><Button size="lg" variant="secondary" className="h-13 px-7 text-[15px] backdrop-blur">See how it works</Button></a>
          </div>
        </div>

        <div data-scroll-hint className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] text-fg-faint">
          Scroll
          <span className="relative h-10 w-[1.5px] overflow-hidden rounded-full bg-white/10">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollhint_1.8s_ease-in-out_infinite] rounded-full bg-brand-300" />
          </span>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative overflow-hidden border-y border-line bg-ink-900/60 py-5">
        <div data-marquee className="flex w-max gap-12 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="flex items-center gap-12 text-[15px] text-fg-muted">
              {m}<LogoMark size={14} className="opacity-60" />
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-[1280px] px-4 py-28 sm:px-6 lg:px-10">
        <p className="eyebrow mb-4">What you get</p>
        <h2 data-section-title className="max-w-3xl text-[36px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[56px]">
          Less guessing. <span className="display italic text-gold-gradient">More knowing.</span>
        </h2>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} data-bento data-spot className={cn('panel panel-hover group overflow-hidden p-7', f.span)}>
              <div aria-hidden className="spotlight pointer-events-none absolute inset-0 rounded-[inherit]" />
              <div className="relative flex h-full flex-col gap-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.03] text-brand-300"><f.icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="flex-1">
                  <h3 className="text-xl font-medium tracking-tight">{f.title}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg-muted">{f.body}</p>
                </div>
                <FeatureVisual kind={f.visual} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section id="steps" data-steps className="relative mx-auto max-w-[1280px] px-4 py-24 sm:px-6 lg:px-10">
        <p className="eyebrow mb-4">How it works</p>
        <h2 data-section-title className="max-w-3xl text-[36px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[56px]">
          Four steps to <span className="display italic text-gold-gradient">calm money.</span>
        </h2>
        <div className="relative mt-16">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-white/10 md:block">
            <div data-steps-line className="h-full origin-left bg-gradient-to-r from-brand-600 via-brand-300 to-ai" />
          </div>
          <ol className="grid gap-8 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} data-step className="relative">
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl border border-line-strong bg-ink-850 text-brand-300 shadow-[0_0_30px_-8px_rgba(212,175,55,0.6)]">
                  <s.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="num mt-6 text-xs text-fg-faint">0{i + 1}</p>
                <h3 className="mt-1 text-lg font-medium">{s.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="grid gap-px overflow-hidden rounded-xl3 border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            [80, '%', 'prediction range on every forecast'],
            [12, ' mo', 'forecast horizon, per category'],
            [6, '', 'spending categories tracked'],
            [100, '%', 'of advice grounded in your own data'],
          ].map(([n, suffix, label]) => (
            <div key={label} className="bg-ink-900/90 p-8">
              <p className="num text-5xl text-gold-gradient" data-count={n} data-suffix={suffix}>0{suffix}</p>
              <p className="mt-3 text-sm text-fg-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-6 lg:px-10">
        <div data-cta-card className="panel relative overflow-hidden px-6 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/25 blur-[100px]" />
          <LogoMark size={56} className="relative mx-auto" />
          <h2 data-section-title className="relative mx-auto mt-8 max-w-2xl text-[34px] font-medium leading-[1.02] tracking-[-0.035em] sm:text-[52px]">
            Your next month, <span className="display italic text-gold-gradient">already understood.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-fg-muted">Free while in early access. Add your first month in under a minute.</p>
          <div className="relative mt-9 flex justify-center">
            <Button size="lg" magnet className="h-13 px-8 text-[15px]" onClick={() => navigate(primaryCta.to)}>
              {primaryCta.label} <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fg-faint sm:flex-row sm:px-6 lg:px-10">
          <Logo size={26} />
          <p>Educational tool — not investment, tax or legal advice.</p>
          <p>© {new Date().getFullYear()} FinSight AI</p>
        </div>
      </footer>
    </div>
  );
}
