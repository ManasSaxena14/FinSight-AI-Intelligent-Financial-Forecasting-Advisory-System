import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import {
  ArrowRight, ArrowUpRight, Coins, CreditCard, PiggyBank, Percent, PlusCircle, Sparkles, Target, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import { premiumService } from '../api/premiumService';
import { Badge, Button, EmptyState, Meter, Panel, PanelHeader, Ring, Skeleton, Stat } from '../components/ui';
import { AXIS, ChartTooltip } from '../components/charts';
import { DigestCard } from '../components/AIInsights';
import { CATEGORY_COLORS, greeting, inr, inrCompact, periodLabel, scoreTone } from '../lib/format';
import { gsap, revealChildren } from '../lib/motion';

const CoreOrb = lazy(() => import('../three/CoreOrb'));

function TypedSummary({ text }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!ref.current || !text) return undefined;
    const words = text.split(' ');
    ref.current.innerHTML = '';
    const spans = words.map((w) => {
      const s = document.createElement('span');
      s.textContent = `${w} `;
      s.style.opacity = '0';
      ref.current.appendChild(s);
      return s;
    });
    const tween = gsap.to(spans, { opacity: 1, duration: 0.4, stagger: 0.025, ease: 'none' });
    return () => tween.kill();
  }, [text]);
  return <p ref={ref} className="text-[17px] leading-relaxed text-fg sm:text-lg" />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, records: [], insights: null, summary: null, txs: [], goals: [] });
  const rootRef = useRef(null);

  const load = useCallback(async () => {
    const [records, insights, summary, txs, goals] = await Promise.allSettled([
      expenseService.getExpenses(),
      mlService.getInsights(3),
      premiumService.getMonthlySummary(),
      expenseService.getTransactions({ limit: 6 }),
      premiumService.getGoals(),
    ]);
    const value = (r, fallback) => (r.status === 'fulfilled' ? r.value : fallback);
    setState({
      loading: false,
      records: value(records, []),
      insights: value(insights, null),
      summary: value(summary, null),
      txs: value(txs, []),
      goals: value(goals, []),
    });
  }, []);

  useEffect(() => {
    // load() only sets state after its awaited requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener('expenses:updated', load);
    return () => window.removeEventListener('expenses:updated', load);
  }, [load]);

  useLayoutEffect(() => {
    if (state.loading) return undefined;
    const ctx = gsap.context(() => revealChildren(rootRef.current), rootRef);
    return () => ctx.revert();
  }, [state.loading]);

  const { insights, records } = state;
  const firstName = (user?.name || '').split(' ')[0];

  if (state.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="space-y-8">
        <h1 className="text-[34px] font-medium tracking-[-0.03em] sm:text-[44px]">
          {greeting()}{firstName ? `, ${firstName}` : ''}. <span className="display italic text-gold-gradient">Let's begin.</span>
        </h1>
        <EmptyState
          icon={Sparkles}
          title="Add your first month"
          description="Log your income and spending once and FinSight starts forecasting, scoring and advising. Each extra month makes the forecast sharper."
          action={<Link to="/add-expense"><Button size="lg" magnet>Add money <ArrowRight className="h-4 w-4" /></Button></Link>}
        />
      </div>
    );
  }

  const latest = records[0];
  const health = insights?.health;
  const tone = scoreTone(health?.score);
  const forecast = insights?.forecast;
  const risk = insights?.risk;
  const rate = latest.income > 0 ? (latest.savings / latest.income) * 100 : 0;

  const mtd = insights?.month_to_date;
  const trend = [...records].reverse().filter((r) => r.period !== mtd?.period).slice(-6).map((r) => ({ name: periodLabel(r.period, { short: true }), Spent: r.total_expense }));
  forecast?.forecast?.forEach((f) => trend.push({ name: periodLabel(f.period, { short: true }), Forecast: f.predicted_expense }));
  const lastActual = trend.findLastIndex((t) => t.Spent != null);
  if (lastActual >= 0 && trend[lastActual + 1]) trend[lastActual].Forecast = trend[lastActual].Spent;

  const categories = Object.entries(latest.expenses).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxCat = categories[0]?.[1] || 1;

  return (
    <div ref={rootRef} className="space-y-6">
      {/* Hero */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="overflow-hidden p-6 sm:p-8" data-reveal>
          <p className="eyebrow">{periodLabel(latest.period)} · {latest.tx_count} entries</p>
          <h1 className="mt-3 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <div className="mt-6 rounded-2xl border border-ai/20 bg-ai/[0.04] p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <Badge tone="ai"><Sparkles className="h-3 w-3" /> AI summary</Badge>
              {state.summary?.source === 'fallback' && <span className="text-[11px] text-fg-faint">rule-based (AI offline)</span>}
            </div>
            {state.summary?.reply ? <TypedSummary text={state.summary.reply} /> : <p className="text-fg-muted">Summary unavailable right now.</p>}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/advisor"><Button variant="secondary" size="sm">Ask the advisor <ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
            <Link to="/analytics"><Button variant="ghost" size="sm">Full analytics <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
        </Panel>

        <Panel className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden p-6" data-reveal>
          <Suspense fallback={null}>
            <CoreOrb className="absolute inset-0" color={tone.hex} energy={0.25} scale={0.85} />
          </Suspense>
          <div className="pointer-events-none relative text-center">
            <p className="eyebrow">Health score</p>
            <p className={`num mt-2 text-6xl ${tone.text}`} style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}>{health?.score ?? '—'}</p>
            <p className="mt-1 text-sm text-fg-muted">{health?.status}{insights ? ` · ${insights.latest_label}` : ''}</p>
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-fg-faint">Rule-based: savings rate + spending concentration</p>
        </Panel>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Income" value={latest.income} format={inr} icon={Coins} sub={mtd ? `${periodLabel(latest.period)} so far` : periodLabel(latest.period)} />
        <Stat label="Spending" value={latest.total_expense} format={inr} icon={CreditCard}
          sub={mtd ? `${Math.round(mtd.spent_share_pct)}% of this month's forecast` : `${categories.length} categories`} delay={0.05} />
        <Stat label="Saved" value={latest.savings} format={inr} icon={PiggyBank} tone={latest.savings >= 0 ? 'pos' : 'neg'}
          sub={mtd ? 'So far — month in progress' : latest.savings >= 0 ? 'Surplus this month' : 'Deficit this month'} delay={0.1} />
        <Stat label="Savings rate" value={rate} format={(v) => `${v.toFixed(1)}%`} icon={Percent} tone={rate >= 20 ? 'pos' : rate >= 10 ? 'gold' : 'neg'}
          sub={mtd ? 'So far · target 20%+' : 'Target: 20% or more'} delay={0.15} />
      </section>

      <DigestCard />

      {/* Forecast + categories */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel data-reveal>
          <PanelHeader
            icon={TrendingUp}
            title="Spending trajectory"
            subtitle={forecast ? `${mtd ? `${periodLabel(forecast.forecast[0].period)} (full month)` : 'Next month'} ≈ ${inr(forecast.predicted_next_month_expense)} · 80% range ${inrCompact(forecast.forecast[0].lower)}–${inrCompact(forecast.forecast[0].upper)}` : 'Forecast appears after your first month'}
            action={risk && <Badge tone={risk.risk_level === 'low' ? 'pos' : risk.risk_level === 'medium' ? 'warn' : 'neg'} dot>
              {Math.round(risk.overspend_probability * 100)}% overspend risk
            </Badge>}
          />
          <div className="h-[220px] px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 16, left: 16, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashFc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" {...AXIS} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area type="monotone" dataKey="Spent" stroke="#d4af37" strokeWidth={2} fill="url(#dashSpent)" dot={false} animationDuration={1600} />
                <Area type="monotone" dataKey="Forecast" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" fill="url(#dashFc)" dot={false} animationDuration={1600} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel data-reveal>
          <PanelHeader icon={CreditCard} title="Where it went" subtitle={periodLabel(latest.period)} />
          <ul className="space-y-3.5 px-5 pb-6 pt-5 sm:px-6">
            {categories.map(([cat, amount]) => (
              <li key={cat}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />{cat}
                  </span>
                  <span className="num text-fg">{inr(amount)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <BarFill pct={(amount / maxCat) * 100} color={CATEGORY_COLORS[cat]} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* Activity + goals */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel data-reveal>
          <PanelHeader icon={Coins} title="Recent activity"
            action={<Link to="/add-expense" className="text-[13px] text-brand-300 hover:text-brand-200">Add <PlusCircle className="inline h-3.5 w-3.5" /></Link>} />
          <ul className="divide-y divide-line px-2 pb-2 pt-3">
            {state.txs.length === 0 && <li className="px-4 py-6 text-sm text-fg-faint">No transactions yet.</li>}
            {state.txs.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.02]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.02]"
                  style={{ color: tx.type === 'income' ? '#34d399' : CATEGORY_COLORS[tx.category] }}>
                  {tx.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{tx.merchant || tx.category}</p>
                  <p className="text-xs text-fg-faint">{tx.category} · {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`num text-sm ${tx.type === 'income' ? 'text-pos' : 'text-fg'}`}>{tx.type === 'income' ? '+' : '−'}{inr(tx.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel data-reveal>
          <PanelHeader icon={Target} title="Goals" action={<Link to="/goals" className="text-[13px] text-brand-300 hover:text-brand-200">Manage</Link>} />
          <div className="space-y-4 px-5 pb-6 pt-5 sm:px-6">
            {state.goals.length === 0 && (
              <p className="text-sm text-fg-faint">No goals yet. <Link to="/goals" className="text-brand-300">Set your first one</Link>.</p>
            )}
            {state.goals.slice(0, 3).map((g) => (
              <div key={g.id} className="flex items-center gap-4">
                <Ring value={g.progress_percentage} size={52} stroke={5} color={g.is_on_track ? '#34d399' : '#fbbf24'}>
                  <span className="num text-[11px]">{Math.round(g.progress_percentage)}%</span>
                </Ring>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{g.name}</p>
                  <p className="text-xs text-fg-faint">{inr(g.current_savings)} of {inr(g.target_amount)}</p>
                  <Meter value={g.progress_percentage} className="mt-2" color={g.is_on_track ? 'bg-pos' : 'bg-warn'} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function BarFill({ pct, color }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    gsap.fromTo(ref.current, { scaleX: 0 }, { scaleX: 1, duration: 1.3, delay: 0.2 });
  }, [pct]);
  return <div ref={ref} className="h-full origin-left rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}55` }} />;
}
