import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Boxes, Brain, FlaskConical, Gauge, Lightbulb, LineChart, ShieldAlert, Sparkles, Users,
} from 'lucide-react';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import ScenarioAnalyzer from '../components/ScenarioAnalyzer';
import { BudgetsPanel, ChangeExplainer, RecurringPanel } from '../components/AIInsights';
import { AXIS, ChartTooltip, GRID, yMoney } from '../components/charts';
import { Badge, Button, EmptyState, FeedbackButtons, Meter, PageHeader, Panel, PanelHeader, Ring, Skeleton, Stat, Tabs } from '../components/ui';
import { aiService } from '../api/aiService';
import { CATEGORY_COLORS, inr, inrCompact, periodLabel } from '../lib/format';
import { gsap, revealChildren } from '../lib/motion';

const SpendSkyline = lazy(() => import('../three/SpendSkyline'));

const RISK_TONE = { low: { badge: 'pos', hex: '#34d399' }, medium: { badge: 'warn', hex: '#fbbf24' }, high: { badge: 'neg', hex: '#f87171' } };

function ForecastChart({ records, forecast, monthToDate }) {
  const data = [...records].reverse().filter((r) => r.period !== monthToDate?.period).slice(-12).map((r) => ({
    name: periodLabel(r.period, { short: true }), Actual: r.total_expense, Income: r.income,
  }));
  const anchor = data.length - 1;
  forecast.forecast.forEach((f) => data.push({
    name: periodLabel(f.period, { short: true }),
    Forecast: f.predicted_expense,
    Range: [f.lower, f.upper],
    Income: f.predicted_income,
    SoFar: f.period === monthToDate?.period ? monthToDate.spent_so_far : undefined,
  }));
  if (anchor >= 0) {
    data[anchor].Forecast = data[anchor].Actual;
    data[anchor].Range = [data[anchor].Actual, data[anchor].Actual];
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis {...yMoney} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <Area dataKey="Range" name="80% range" stroke="none" fill="url(#band)" animationDuration={1500} />
        <Line dataKey="Income" name="Income" stroke="#34d399" strokeOpacity={0.6} strokeWidth={1.5} dot={false} strokeDasharray="2 4" animationDuration={1500} />
        <Line dataKey="Actual" name="Spent" stroke="#d4af37" strokeWidth={2.25} dot={{ r: 3, fill: '#d4af37', strokeWidth: 0 }} animationDuration={1500} />
        <Line dataKey="SoFar" name="Spent so far" stroke="none" dot={{ r: 5, fill: '#eceef1', stroke: '#d4af37', strokeWidth: 2 }} isAnimationActive={false} />
        <Line dataKey="Forecast" name="Forecast" stroke="#a78bfa" strokeWidth={2.25} strokeDasharray="6 5" dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} animationDuration={1800} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Recommendations({ items: initial, hidden: initialHidden }) {
  const [items, setItems] = useState(initial);
  const [hidden, setHidden] = useState(initialHidden);

  const rate = async (item, rating) => {
    await aiService.itemFeedback('recommendation', item.key, rating);
    if (rating === 'down') {
      setItems((list) => list.filter((i) => i.key !== item.key));
      setHidden((h) => h + 1);
    } else {
      setItems((list) => list.map((i) => (i.key === item.key ? { ...i, feedback: rating === 'clear' ? null : rating } : i)));
    }
  };

  return (
    <ul className="space-y-3 p-5 sm:p-6">
      {items.map((r) => (
        <li key={r.key} className="rounded-2xl border border-line bg-white/[0.02] p-4 text-[13px] leading-relaxed text-fg-muted">
          <div className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />{r.text}</div>
          <div className="mt-1 flex justify-end"><FeedbackButtons value={r.feedback} label="this recommendation" onRate={(v) => rate(r, v)} /></div>
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-fg-faint">No recommendations to show.</li>}
      {hidden > 0 && (
        <li>
          <button type="button" className="text-xs text-fg-faint hover:text-fg hover:underline"
            onClick={async () => { await aiService.resetFeedback('recommendation'); window.dispatchEvent(new Event('expenses:updated')); }}>
            {hidden} hidden — show again
          </button>
        </li>
      )}
    </ul>
  );
}

function Donut({ expenses }) {
  const data = Object.entries(expenses).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 p-5 sm:grid-cols-[180px_1fr] sm:p-6">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={2} stroke="none" animationDuration={1400}>
              {data.map((d) => <Cell key={d.name} fill={CATEGORY_COLORS[d.name]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-[11px] text-fg-faint">Total</p><p className="num text-lg">{inrCompact(total)}</p></div>
        </div>
      </div>
      <ul className="space-y-2">
        {data.sort((a, b) => b.value - a.value).map((d) => (
          <li key={d.name} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-fg-muted"><span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[d.name] }} />{d.name}</span>
            <span className="num text-fg">{((d.value / total) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Analytics() {
  const [months, setMonths] = useState('3');
  const [records, setRecords] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef(null);

  const load = useCallback(async (horizon) => {
    setLoading(true);
    setError(null);
    try {
      const recs = await expenseService.getExpenses();
      setRecords(recs);
      setInsights(recs.length ? await mlService.getInsights(Number(horizon)) : null);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load analytics right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(months); }, [months, load]);
  useEffect(() => {
    const refresh = () => load(months);
    window.addEventListener('expenses:updated', refresh);
    return () => window.removeEventListener('expenses:updated', refresh);
  }, [months, load]);

  useLayoutEffect(() => {
    if (loading || !insights) return undefined;
    const ctx = gsap.context(() => revealChildren(rootRef.current), rootRef);
    return () => ctx.revert();
  }, [loading, insights]);

  const header = (
    <PageHeader
      eyebrow="Analytics"
      title="Your money,"
      accent="forecast."
      description="Every number here comes from your own history. The more months you add, the sharper the forecast and the more personal the anomaly checks."
      actions={<Tabs value={months} onChange={setMonths} tabs={[{ id: '3', label: '3 mo' }, { id: '6', label: '6 mo' }, { id: '12', label: '12 mo' }]} />}
    />
  );

  if (loading && !insights) {
    return (
      <div className="space-y-6">{header}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-[380px]" />
      </div>
    );
  }
  if (error) return <div className="space-y-6">{header}<EmptyState icon={AlertTriangle} title="Analytics unavailable" description={error} action={<Button onClick={() => load(months)}>Try again</Button>} /></div>;
  if (!records?.length || !insights) {
    return (
      <div className="space-y-6">{header}
        <EmptyState icon={LineChart} title="No data yet" description="Add a month of income and spending to see forecasts, risk and anomalies."
          action={<Link to="/add-expense"><Button>Add money <ArrowRight className="h-4 w-4" /></Button></Link>} />
      </div>
    );
  }

  const { forecast, risk, anomalies, health, pattern, benchmarks, model_info: model } = insights;
  const latest = records.find((r) => r.period === insights.latest_period) || records[0];
  const mtd = insights.month_to_date;
  const next = forecast.forecast[0];
  const riskTone = RISK_TONE[risk.risk_level];
  const skyline = Object.entries(latest.expenses).map(([name, amount]) => ({ name, amount }));

  return (
    <div ref={rootRef} className="space-y-6">
      {header}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Forecast · ${periodLabel(next.period)}${mtd ? ' (full month)' : ''}`} value={next.predicted_expense} format={inr} icon={Brain}
          sub={`80% range ${inrCompact(next.lower)} – ${inrCompact(next.upper)}`} />
        <Stat label="Overspend risk" value={risk.overspend_probability * 100} format={(v) => (v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`)} icon={ShieldAlert}
          tone={risk.risk_level === 'low' ? 'pos' : risk.risk_level === 'medium' ? 'gold' : 'neg'} sub={`Chance next month's spending exceeds income`} delay={0.05} />
        <Stat label="Health score" value={health.score} format={(v) => `${Math.round(v)}`} icon={Gauge}
          tone={health.score >= 75 ? 'pos' : health.score >= 40 ? 'gold' : 'neg'} sub={`${health.status} · ${health.savings_rate_pct}% saved`} delay={0.1} />
        <Stat label="Spending style" value={pattern.archetype} icon={Users} sub={`Largest: ${pattern.dominant_category} (${pattern.dominant_pct}%)`} delay={0.15} />
      </section>

      {mtd && (
        <Panel data-reveal className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-sm text-fg">{mtd.label} so far <span className="text-fg-faint">· day {mtd.day_of_month}</span></p>
              <p className="mt-1 text-[13px] text-fg-muted">
                You've spent <span className="num text-fg">{inr(mtd.spent_so_far)}</span> of a projected <span className="num text-fg">{inr(mtd.projected_total)}</span> for the month.
                This month is still filling up, so it's left out of the models until it's complete.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Meter value={mtd.spent_share_pct} color={mtd.spent_share_pct > 100 ? 'bg-neg' : 'bg-brand-400'} />
              <p className="num mt-1.5 text-right text-xs text-fg-faint">{mtd.spent_share_pct}% of forecast</p>
            </div>
          </div>
        </Panel>
      )}

      <Panel data-reveal>
        <PanelHeader icon={LineChart} title="Spending forecast"
          subtitle={`${forecast.history_months} month(s) of history · trend ${forecast.trend_direction} (${forecast.change_vs_last_pct > 0 ? '+' : ''}${forecast.change_vs_last_pct}% vs last month)`}
          action={<Badge tone="ai">80% prediction band</Badge>} />
        <div className="h-[340px] px-2 pb-4 pt-4 sm:px-4"><ForecastChart records={records} forecast={forecast} monthToDate={mtd} /></div>
        <div className="grid gap-px overflow-hidden rounded-b-[inherit] border-t border-line bg-line sm:grid-cols-3">
          {forecast.forecast.slice(0, 3).map((f) => (
            <div key={f.period} className="bg-ink-850/90 px-5 py-4">
              <p className="text-xs text-fg-faint">{f.label}</p>
              <p className="num mt-1 text-lg">{inr(f.predicted_expense)}</p>
              <p className={`num text-xs ${f.savings >= 0 ? 'text-pos' : 'text-neg'}`}>{f.savings >= 0 ? 'Saves' : 'Short by'} {inr(Math.abs(f.savings))}</p>
            </div>
          ))}
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <Panel data-reveal>
          <PanelHeader icon={ShieldAlert} title="Overspend risk" subtitle={`For ${periodLabel(risk.period)}, from the forecast distribution`}
            action={<Badge tone={riskTone.badge} dot>{risk.risk_level}</Badge>} />
          <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:p-6">
            <Ring value={risk.overspend_probability * 100} size={136} stroke={10} color={riskTone.hex}>
              <div><p className="num text-3xl">{risk.overspend_probability > 0 && risk.overspend_probability < 0.01 ? '<1' : Math.round(risk.overspend_probability * 100)}%</p><p className="text-[11px] text-fg-faint">overspend</p></div>
            </Ring>
            <div className="w-full space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-fg-muted">Expected margin</span><span className={`num ${risk.expected_margin >= 0 ? 'text-pos' : 'text-neg'}`}>{inr(risk.expected_margin, { sign: true })}</span></div>
              <div className="flex justify-between"><span className="text-fg-muted">Chance of saving &lt; 10%</span><span className="num">{Math.round(risk.low_savings_probability * 100)}%</span></div>
              <p className="pt-1 text-xs leading-relaxed text-fg-faint">Probability that spending beats income, using the forecast and its uncertainty — not a black-box classifier.</p>
            </div>
          </div>
          <div className="border-t border-line px-5 py-4 sm:px-6">
            <p className="eyebrow mb-3">What's driving it</p>
            <ul className="space-y-2.5">
              {risk.drivers.slice(0, 4).map((d) => (
                <li key={d.category} className="flex items-center gap-3 text-[13px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[d.category] }} />
                  <span className="w-24 shrink-0 text-fg-muted">{d.category}</span>
                  <span className="num flex-1 text-fg">{inr(d.forecast)}</span>
                  <span className={`num text-xs ${d.above_peer_median > 0 ? 'text-warn' : 'text-fg-faint'}`}>{inr(d.above_peer_median, { sign: true })} vs peers</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel data-reveal>
          <PanelHeader icon={Activity} title="Unusual spending"
            subtitle={anomalies.baseline === 'personal' ? `Compared with your own last ${anomalies.baseline_months} months` : 'Compared with peers until you have 4+ months'}
            action={<Badge tone={anomalies.anomalies.length ? 'warn' : 'pos'} dot>{anomalies.anomalies.length ? `${anomalies.anomalies.length} flagged` : 'All normal'}</Badge>} />
          <div className="space-y-3 p-5 sm:p-6">
            {anomalies.anomalies.length === 0 && (
              <p className="rounded-2xl border border-pos/20 bg-pos/[0.05] p-4 text-sm text-fg-muted">Nothing unusual this month — every category is within your normal range.</p>
            )}
            {anomalies.anomalies.map((a) => (
              <div key={a.category} className="rounded-2xl border border-warn/20 bg-warn/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-fg">{a.category}</p>
                  <div className="flex gap-1.5">
                    <Badge tone={a.severity === 'critical' ? 'neg' : 'warn'}>{a.severity}</Badge>
                    <Badge>{a.method === 'personal' ? 'vs your normal' : 'vs peers'}</Badge>
                  </div>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{a.message}</p>
              </div>
            ))}
            {insights.alerts.length > 0 && (
              <div className="pt-2">
                <p className="eyebrow mb-2">Budget alerts</p>
                <ul className="space-y-2">
                  {insights.alerts.map((a) => (
                    <li key={a} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-muted">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />{a.replace(/^(CRITICAL|ALERT|WARNING):\s*/, '')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel data-reveal className="overflow-hidden">
          <PanelHeader icon={Boxes} title="Spending skyline" subtitle={`${periodLabel(latest.period)} in 3D`} />
          <Suspense fallback={<Skeleton className="m-6 h-[300px]" />}>
            <SpendSkyline data={skyline} className="h-[340px]" />
          </Suspense>
        </Panel>
        <Panel data-reveal>
          <PanelHeader icon={BarChart3} title="Share of spending" subtitle={periodLabel(latest.period)} />
          <Donut expenses={latest.expenses} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel data-reveal>
          <PanelHeader icon={Users} title="You vs. peers" subtitle="Income-normalised percentile within your income bracket" />
          <ul className="space-y-4 p-5 sm:p-6">
            {benchmarks.map((b) => (
              <li key={b.category}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-fg-muted">{b.category}</span>
                  <span className="num text-xs text-fg-faint">{inr(b.actual)} · peers {inr(b.peer_median)}</span>
                </div>
                <Meter value={b.peer_percentile} color={b.peer_percentile > 75 ? 'bg-warn' : 'bg-brand-400'} />
                <p className="mt-1 text-[11px] text-fg-faint">Higher than {Math.round(b.peer_percentile)}% of peers</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[11px] text-fg-faint sm:px-6">Peer data is a synthetic reference set, used only for comparison and cold-start.</p>
        </Panel>

        <Panel data-reveal>
          <PanelHeader icon={Lightbulb} title="Recommendations" subtitle="Rate them — FinSight reorders tips for you" />
          <Recommendations key={(insights.recommendation_items || []).map((r) => r.key).join('|') + insights.recommendations_hidden}
            items={insights.recommendation_items || insights.recommendations.map((t) => ({ text: t, key: t }))}
            hidden={insights.recommendations_hidden || 0} />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChangeExplainer />
        <BudgetsPanel />
      </section>

      <RecurringPanel />

      <ScenarioAnalyzer currentIncome={latest.income} currentExpenses={latest.expenses} />

      <Panel data-reveal>
        <PanelHeader icon={FlaskConical} title="How these numbers are made" subtitle="Model transparency" />
        <div className="grid gap-px overflow-hidden rounded-b-[inherit] border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Forecast', model.forecast],
            ['Forecast accuracy', model.backtest ? `${model.backtest.mape_pct}% avg error · ${model.backtest.interval_coverage_pct}% inside range (${model.backtest.evaluated_months} months tested)` : 'Shown once you have 4+ months'],
            ['Overspend risk', model.risk],
            ['Anomalies', model.anomalies],
            ['Health score', model.health_score],
            ['Reference data', model.reference_data],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-850/90 px-5 py-4">
              <p className="text-xs text-fg-faint">{k}</p>
              <p className="mt-1 text-[13px] text-fg">{v}</p>
            </div>
          ))}
        </div>
        <p className="px-5 py-3 text-[11px] text-fg-faint sm:px-6">Estimates, not financial advice.</p>
      </Panel>
    </div>
  );
}
