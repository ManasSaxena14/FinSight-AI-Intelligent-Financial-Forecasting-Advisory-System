import { useLayoutEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Check, Crown, Shield, Zap } from 'lucide-react';
import { Badge, Button, PageHeader, Panel } from '../components/ui';
import { cn } from '../lib/cn';
import { gsap } from '../lib/motion';

const PLANS = [
  {
    id: 'basic', name: 'Essential', price: 'Free', icon: Shield, current: true,
    features: [
      { name: 'Core Expense Tracking', active: true },
      { name: 'Basic AI Financial Summaries', active: true },
      { name: 'Standard Goals (Up to 3)', active: true },
      { name: 'Basic Market Insights', active: false },
      { name: 'Real-time Predictive Engine', active: false },
    ],
  },
  {
    id: 'pro', name: 'Professional', price: '₹1,499', icon: Zap,
    features: [
      { name: 'Advanced AI Routing', active: true },
      { name: 'Unlimited Financial Goals', active: true },
      { name: 'What-if budget scenarios', active: true },
      { name: 'Tax planning helpers', active: true },
      { name: 'Custom AI Personas', active: false },
    ],
  },
  {
    id: 'premium', name: 'Elite Wealth', price: '₹4,999', icon: Crown, highlight: true,
    features: [
      { name: 'Full spending forecasts', active: true },
      { name: 'Direct Portfolio Management', active: true },
      { name: 'Crypto & Real Estate Assets', active: true },
      { name: '24/7 AI CPA/Tax Consultant', active: true },
      { name: 'API Access for Integrations', active: true },
    ],
  },
];

export default function Plans() {
  const gridRef = useRef(null);

  useLayoutEffect(() => {
    const cards = gridRef.current.querySelectorAll('[data-plan]');
    const ctx = gsap.context(() => {
      gsap.from(cards, { opacity: 0, y: 40, rotateX: -12, transformPerspective: 900, stagger: 0.1, duration: 1.2, delay: 0.2 });
    }, gridRef);
    // Subtle 3D tilt toward the pointer.
    const handlers = [...cards].map((card) => {
      const rx = gsap.quickTo(card, 'rotateX', { duration: 0.6 });
      const ry = gsap.quickTo(card, 'rotateY', { duration: 0.6 });
      gsap.set(card, { transformPerspective: 900 });
      const move = (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      };
      const leave = () => { rx(0); ry(0); };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); };
    });
    return () => { ctx.revert(); handlers.forEach((h) => h()); };
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Membership" title="Elevate your" accent="financial future."
        description="Future paid tiers may include deeper AI insights, scenario tools and tax help — coming soon." />
      <div ref={gridRef} className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.id} data-plan className="will-change-transform">
            <Panel glow className={cn('flex h-full flex-col p-6', p.highlight && 'border-brand-500/40 shadow-[var(--shadow-glow)]')}>
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white/[0.03] text-brand-300"><p.icon className="h-5 w-5" strokeWidth={1.75} /></span>
                {p.current ? <Badge tone="pos" dot>Current</Badge> : <Badge tone={p.highlight ? 'gold' : 'neutral'}>Coming soon</Badge>}
              </div>
              <h3 className="mt-5 text-lg font-medium">{p.name}</h3>
              <p className="mt-1"><span className="num text-4xl">{p.price}</span>{p.price !== 'Free' && <span className="text-sm text-fg-faint"> / month</span>}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f.name} className={cn('flex gap-2.5 text-sm', f.active ? 'text-fg-muted' : 'text-fg-faint line-through')}>
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', f.active ? 'text-brand-300' : 'text-fg-faint/50')} />{f.name}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" variant={p.highlight ? 'primary' : 'secondary'} disabled={p.current}
                onClick={() => toast.success(`${p.name}: pre-registration recorded. Coming soon!`)}>
                {p.current ? 'Current plan' : `Pre-register for ${p.name}`}
              </Button>
            </Panel>
          </div>
        ))}
      </div>
    </div>
  );
}
