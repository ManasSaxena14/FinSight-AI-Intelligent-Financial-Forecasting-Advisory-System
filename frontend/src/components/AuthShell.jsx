import { Suspense, lazy, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import { gsap, prefersReducedMotion, SplitText } from '../lib/motion';
import Logo from './Logo';

const CoreOrb = lazy(() => import('../three/CoreOrb'));
const AmbientField = lazy(() => import('../three/AmbientField'));

const POINTS = [
  { icon: LineChart, text: 'Forecasts built on your own months, with honest ranges' },
  { icon: Activity, text: 'Spots unusual spending against your normal, not a dataset' },
  { icon: Sparkles, text: 'An AI advisor that knows your numbers' },
];

/**
 * Split-screen auth layout with a choreographed entrance.
 * `focusing` brightens the orb while a field is focused; set `leaving` after a
 * successful sign-in to play the warp-out, then `onLeft` fires.
 */
export default function AuthShell({ title, subtitle, children, footer, leaving = false, onLeft }) {
  const rootRef = useRef(null);
  const headlineRef = useRef(null);
  const [energy, setEnergy] = useState(0.45);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let split;
    const ctx = gsap.context(() => {
      split = SplitText.create(headlineRef.current, { type: 'chars,words', charsClass: 'inline-block' });
      split.words.forEach((w) => {
        if (w.closest('.text-gold-gradient')) w.querySelectorAll('div').forEach((c) => c.classList.add('text-gold-gradient'));
      });
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('[data-auth-orb]', { scale: 0.55, opacity: 0, filter: 'blur(30px)', duration: 2.2 })
        .from(split.chars, { yPercent: 110, rotateX: -90, opacity: 0, transformOrigin: '50% 100% -16px', stagger: 0.015, duration: 1.1 }, 0.35)
        .from('[data-auth-point]', { x: -24, opacity: 0, stagger: 0.12, duration: 1 }, 0.9)
        .from('[data-auth-point] [data-icon]', { scale: 0, rotate: -90, stagger: 0.12, duration: 0.8, ease: 'back.out(2)' }, 1.0)
        .from('[data-auth-card]', { y: 50, opacity: 0, rotateX: 12, transformPerspective: 1000, transformOrigin: '50% 0%', duration: 1.3 }, 0.15)
        .from('[data-auth-card] form > *', { y: 16, opacity: 0, stagger: 0.07, duration: 0.9 }, 0.55)
        .from('[data-auth-foot] > *', { opacity: 0, y: 10, stagger: 0.08, duration: 0.8 }, 0.9);

      // Endless sheen across the primary button.
      gsap.fromTo('[data-auth-card] button[type="submit"] [data-sheen]', { xPercent: -150 }, { xPercent: 250, duration: 1.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 2.8, delay: 2 });
    }, rootRef);
    return () => { ctx.revert(); split?.revert(); };
  }, []);

  // Orb reacts while the user is typing.
  useLayoutEffect(() => {
    const card = rootRef.current?.querySelector('[data-auth-card]');
    if (!card) return undefined;
    const onIn = () => setEnergy(0.8);
    const onOut = () => setEnergy(0.45);
    card.addEventListener('focusin', onIn);
    card.addEventListener('focusout', onOut);
    return () => { card.removeEventListener('focusin', onIn); card.removeEventListener('focusout', onOut); };
  }, []);

  // Warp out after a successful sign-in.
  useLayoutEffect(() => {
    if (!leaving) return undefined;
    if (prefersReducedMotion()) { onLeft?.(); return undefined; }
    setEnergy(1.3);
    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: onLeft })
        .to('[data-auth-card]', { y: -20, scale: 0.96, opacity: 0, filter: 'blur(8px)', duration: 0.55, ease: 'power3.in' })
        .to('[data-auth-copy]', { opacity: 0, x: -30, duration: 0.5, ease: 'power3.in' }, 0)
        .to('[data-auth-orb]', { scale: 2.6, duration: 1.1, ease: 'expo.in' }, 0.1)
        .to('[data-auth-flash]', { opacity: 1, duration: 0.35, ease: 'power2.in' }, 0.8);
    }, rootRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  return (
    <div ref={rootRef} className="relative grid min-h-dvh overflow-hidden bg-ink-900 lg:grid-cols-[1.1fr_1fr]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 top-0 h-[60vh] w-[60vw] rounded-full bg-brand-500/[0.08] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[50vh] w-[50vw] rounded-full bg-ai/[0.07] blur-[160px]" />
        <Suspense fallback={null}><AmbientField className="absolute inset-0" density={0.6} /></Suspense>
      </div>

      {/* Brand / 3D side */}
      <section className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <div data-auth-copy className="relative z-10 flex items-center justify-between">
          <Link to="/welcome" aria-label="FinSight AI home"><Logo size={38} animate /></Link>
        </div>

        <div data-auth-orb className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <Suspense fallback={null}>
            <CoreOrb className="h-[min(72vh,680px)] w-[min(72vh,680px)] -translate-y-[8vh]" energy={energy} />
          </Suspense>
        </div>

        <div data-auth-copy className="relative z-10 max-w-lg rounded-3xl bg-gradient-to-t from-ink-900 via-ink-900/80 to-transparent pt-10">
          <h1 ref={headlineRef} className="text-5xl font-medium leading-[1.02] tracking-[-0.035em] [perspective:600px] xl:text-6xl">
            Know where your money <span className="display italic text-gold-gradient">is going next.</span>
          </h1>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p.text} data-auth-point className="flex items-center gap-3 text-[15px] text-fg-muted">
                <span data-icon className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-ink-900/60 text-brand-300 backdrop-blur">
                  <p.icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form side */}
      <section className="relative z-10 flex items-center justify-center px-4 py-12 sm:px-8">
        <Link
          to="/welcome"
          className="absolute left-4 top-5 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-fg-muted backdrop-blur-sm transition-all duration-200 hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-fg hover:shadow-[0_0_14px_0_rgba(99,102,241,0.25)] sm:left-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <div className="w-full max-w-[420px] [perspective:1200px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo size={40} animate />
          </div>
          <div data-auth-card className="panel p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/60 to-transparent" />
            <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          <div data-auth-foot>
            {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-fg-faint">
              <ShieldCheck className="h-3.5 w-3.5" /> Passwords are hashed with bcrypt · JWT sessions
            </p>
          </div>
        </div>
      </section>

      <div data-auth-flash aria-hidden className="pointer-events-none fixed inset-0 z-50 bg-ink-900 opacity-0" />
    </div>
  );
}
