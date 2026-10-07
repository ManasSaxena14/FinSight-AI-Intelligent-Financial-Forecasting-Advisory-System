import { Suspense, lazy, useLayoutEffect, useRef, useState } from 'react';
import { Activity, Bot, ChevronDown, Database, Gauge, LineChart, ShieldAlert } from 'lucide-react';
import { PageHeader, Panel, useCollapse } from '../components/ui';
import ModelCard from '../components/ModelCard';
import { cn } from '../lib/cn';
import { gsap, prefersReducedMotion, revealChildren, ScrollTrigger } from '../lib/motion';

const CoreOrb = lazy(() => import('../three/CoreOrb'));

const STEPS = [
  {
    icon: Database, color: '#7dd3fc', title: 'You log transactions',
    body: 'Single entries or monthly totals. Each one has a date, so it lands in a real month like 2026-07 — January 2026 never merges with January 2027.',
  },
  {
    icon: LineChart, color: '#a78bfa', title: 'Your own forecast',
    body: 'Each category is forecast from your history: a damped trend model once you have 6+ months, exponential smoothing before that. With little data, it leans on a peer baseline for your income bracket. Every forecast carries an 80% range, and is backtested on your past months.',
  },
  {
    icon: ShieldAlert, color: '#f87171', title: 'Overspend risk',
    body: 'The chance that next month\'s spending beats your income, read straight from the forecast and its uncertainty. Drivers show which categories push it up — no black-box classifier.',
  },
  {
    icon: Activity, color: '#fbbf24', title: 'Anomalies vs. your normal',
    body: 'Once you have 4+ months, each category is compared with your own median using a robust score, scaled to your income — so a raise doesn\'t look like a spending spike.',
  },
  {
    icon: Bot, color: '#d4af37', title: 'An advisor that uses tools, not guesses',
    body: 'The advisor is an agent: it calls tools for your snapshot, forecast, goal simulations, budgets and transactions, and searches a sourced Indian personal-finance knowledge base, citing passages as [1], [2]. It can propose entries or goals, but nothing is saved until you confirm. If the AI is unavailable, an offline answer from the knowledge base steps in.',
  },
];

const FAQ = [
  ['Is the health score AI?', 'No — and that is on purpose. It is a transparent rule-based score from your savings rate, with a penalty when one category dominates. You can reason about every point.'],
  ['What is the peer data?', 'A synthetic reference set of 8,000 monthly budgets. It is only used to give new users a sensible starting point and to show percentiles — never as your forecast once you have history.'],
  ['How accurate is the forecast?', 'Analytics shows the measured average error and how often actual spending landed inside the 80% range, tested on your own past months.'],
  ['Where do the advisor’s facts come from?', 'From a curated knowledge base of Indian personal-finance rules (tax regimes, 80C/80D, PPF/EPF/NPS, SIPs, deposits, credit, insurance), each with its official source and an “as of” date. Tax figures change every Budget, so always confirm on incometax.gov.in before filing.'],
  ['How does the goal simulator work?', 'It runs 4,000 possible futures. Each month your savings are drawn from your forecast and its uncertainty, and you pay your plan plus any earlier shortfall when that month allows. The share of futures that reach the goal on time is your probability.'],
  ['Is this financial advice?', 'No. FinSight is an educational tool. It will not recommend specific stocks or funds.'],
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const { ref, mounted } = useCollapse(open);
  return (
    <div className="border-b border-line last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] text-fg">
        {q}<ChevronDown className={cn('h-4 w-4 shrink-0 text-fg-faint transition-transform', open && 'rotate-180')} />
      </button>
      {mounted && <div ref={ref} className="overflow-hidden"><p className="pb-4 text-sm leading-relaxed text-fg-muted">{a}</p></div>}
    </div>
  );
}

export default function HowItWorks() {
  const rootRef = useRef(null);
  const pinRef = useRef(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      revealChildren(rootRef.current);
      const steps = gsap.utils.toArray('[data-step]');
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        ScrollTrigger.create({
          trigger: '[data-steps]',
          start: 'top 15%',
          end: 'bottom 70%',
          pin: pinRef.current,
          pinSpacing: false,
        });
      });
      steps.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(i),
        });
        gsap.fromTo(el, { opacity: 0.25 }, {
          opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'top 50%', scrub: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const step = STEPS[active];

  return (
    <div ref={rootRef} className="space-y-16">
      <PageHeader
        eyebrow="How it works"
        title="From a few numbers"
        accent="to a forecast you can trust."
        description="Five honest steps. Nothing here pretends to be smarter than the data behind it."
      />

      <section data-steps className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div ref={pinRef} className="relative hidden h-[460px] lg:block">
          <Suspense fallback={null}>
            <CoreOrb className="absolute inset-0" color={step.color} energy={0.25 + active * 0.15} />
          </Suspense>
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="eyebrow">Step {active + 1} of {STEPS.length}</p>
            <p className="mt-1 text-lg text-fg">{step.title}</p>
          </div>
        </div>
        <ol className="space-y-6 lg:py-[10vh]">
          {STEPS.map((s, i) => (
            <li key={s.title} data-step>
              <Panel className="p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.03]" style={{ color: s.color }}>
                    <s.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="num text-xs text-fg-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-medium tracking-tight text-fg">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{s.body}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      <ModelCard />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div data-reveal>
          <Gauge className="h-6 w-6 text-brand-300" strokeWidth={1.5} />
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Questions, <span className="display italic text-gold-gradient">answered.</span></h2>
        </div>
        <Panel className="px-6" data-reveal>
          {FAQ.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
        </Panel>
      </section>
    </div>
  );
}
