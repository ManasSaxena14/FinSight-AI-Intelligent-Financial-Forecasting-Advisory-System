import { useState } from 'react';
import toast from 'react-hot-toast';
import { Area, Bar, BarChart, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, CalendarClock, Check, Repeat, Target, X } from 'lucide-react';
import { apiError } from '../../api/aiService';
import { premiumService } from '../../api/premiumService';
import { AXIS, ChartTooltip } from '../charts';
import ProposalReview from '../ProposalReview';
import { Badge, Button, Meter, Ring } from '../ui';
import { CATEGORY_COLORS, inr, inrCompact, scoreTone } from '../../lib/format';
import { cn } from '../../lib/cn';

function Shell({ icon: Icon, title, badge, children }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-fg">{Icon && <Icon className="h-4 w-4 text-brand-300" />}{title}</p>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Snapshot({ data }) {
  const tone = scoreTone(data.score);
  return (
    <Shell title={`Snapshot · ${data.label}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Income', inr(data.income)], ['Spent', inr(data.spending)], ['Saved', inr(data.savings)], ['Score', `${data.score}/100`]].map(([k, v]) => (
          <div key={k} className="panel-inset p-2.5">
            <p className="text-[11px] text-fg-faint">{k}</p>
            <p className={cn('num text-sm', k === 'Score' ? tone.text : 'text-fg')}>{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-fg-faint">Overspend risk next month: {Math.round(data.risk * 100)}%</p>
    </Shell>
  );
}

function HistoryCard({ data }) {
  return (
    <Shell title="Income vs spending">
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" {...AXIS} tickFormatter={(l) => l.split(' ')[0]} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spending" name="Spent" fill="#d4af37" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}

function ForecastCard({ data }) {
  const rows = data.map((d) => ({ ...d, range: [d.lower, d.upper] }));
  return (
    <Shell title="Forecast" badge={<Badge tone="ai">80% range</Badge>}>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="label" {...AXIS} tickFormatter={(l) => l.split(' ')[0]} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="range" name="80% range" stroke="none" fill="#a78bfa" fillOpacity={0.18} />
            <Line dataKey="mid" name="Forecast" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Shell>
  );
}

function ScenarioCard({ data }) {
  const up = data.monthly_difference >= 0;
  return (
    <Shell title={`What-if · based on ${data.based_on}`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="panel-inset p-2.5"><p className="text-[11px] text-fg-faint">Saved now</p><p className="num text-sm">{inr(data.savings_before)}</p></div>
        <div className="panel-inset p-2.5"><p className="text-[11px] text-fg-faint">With change</p><p className="num text-sm">{inr(data.savings_after)}</p></div>
        <div className="panel-inset p-2.5">
          <p className="text-[11px] text-fg-faint">Per year</p>
          <p className={cn('num flex items-center justify-center gap-0.5 text-sm', up ? 'text-pos' : 'text-neg')}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{inr(data.yearly_difference, { sign: true })}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-fg-faint">Health score {data.score_before} → <span className={scoreTone(data.score_after).text}>{data.score_after}</span></p>
    </Shell>
  );
}

function GoalPlanCard({ data }) {
  const pct = Math.round(data.probability * 100);
  const color = data.probability >= 0.8 ? '#34d399' : data.probability >= 0.5 ? '#fbbf24' : '#f87171';
  const fan = (data.fan || []).map((f) => ({ ...f, band: [f.p10, f.p90] }));
  return (
    <Shell icon={Target} title={`Goal plan · ${data.name}`} badge={<Badge tone={data.probability >= 0.8 ? 'pos' : data.probability >= 0.5 ? 'warn' : 'neg'}>{data.status}</Badge>}>
      <div className="flex items-center gap-4">
        <Ring value={pct} size={76} stroke={7} color={color}><span className="num text-lg">{pct}%</span></Ring>
        <div className="space-y-1 text-[12.5px] text-fg-muted">
          <p>Chance of {inr(data.target_amount)} by {new Date(data.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
          <p>Needs <span className="num text-fg">{inr(data.required_monthly)}</span>/month</p>
          {data.needed_for_80pct && <p>For an 80% chance, set aside <span className="num text-fg">{inr(data.needed_for_80pct)}</span>/month</p>}
        </div>
      </div>
      {fan.length > 1 && (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fan} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="month" {...AXIS} tickFormatter={(m) => `M${m}`} />
              <Tooltip content={<ChartTooltip />} />
              <Area dataKey="band" name="10–90%" stroke="none" fill={color} fillOpacity={0.15} />
              <Line dataKey="p50" name="Median" stroke={color} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-1 text-[11px] text-fg-faint">{data.simulations?.toLocaleString('en-IN')} simulated futures using your forecast savings</p>
    </Shell>
  );
}

function ExplainCard({ data }) {
  const max = Math.max(1, ...data.drivers.map((d) => Math.abs(d.score_impact)));
  return (
    <Shell title={`${data.from_label} → ${data.to_label}`} badge={<Badge tone={data.score_change >= 0 ? 'pos' : 'neg'}>Score {data.score_change >= 0 ? '+' : ''}{data.score_change}</Badge>}>
      <ul className="space-y-2">
        {data.drivers.map((d) => (
          <li key={d.factor} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-[12.5px]">
            <span className="text-fg-muted">{d.factor}</span>
            <div className="h-1.5 rounded-full bg-white/[0.05]">
              <div className={cn('h-full rounded-full', d.score_impact < 0 ? 'bg-neg' : d.score_impact > 0 ? 'bg-pos' : 'bg-white/20')}
                style={{ width: `${Math.max(6, (Math.abs(d.score_impact) / max) * 100)}%` }} />
            </div>
            <span className="num text-fg">{inr(d.change, { sign: true })}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function RecurringCard({ data }) {
  return (
    <Shell icon={Repeat} title="Recurring charges" badge={<span className="num text-xs text-fg-muted">{inr(data.total_monthly)}/mo</span>}>
      <ul className="divide-y divide-line">
        {data.items.slice(0, 6).map((r) => (
          <li key={r.merchant} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[r.category] }} />
              <span className="truncate text-fg">{r.merchant}</span>
              {r.status !== 'active' && <Badge tone="warn">stopped?</Badge>}
            </span>
            <span className="num shrink-0 text-fg-muted">{inr(r.typical_amount)} · {r.cadence}</span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function BudgetCard({ data }) {
  return (
    <Shell title="Suggested budget" badge={<Badge tone={data.achievable ? 'pos' : 'warn'}>{data.projected_savings_rate}% saved</Badge>}>
      <ul className="space-y-2">
        {data.categories.map((c) => (
          <li key={c.category} className="text-[12.5px]">
            <div className="mb-1 flex justify-between">
              <span className="text-fg-muted">{c.category}</span>
              <span className="num text-fg">{inr(c.suggested)} {c.cut > 0 && <span className="text-pos">(−{inrCompact(c.cut)})</span>}</span>
            </div>
            <Meter value={c.forecast ? (c.suggested / c.forecast) * 100 : 0} color={c.cut > 0 ? 'bg-pos' : 'bg-brand-400'} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-fg-faint">Save it from Analytics → Budgets.</p>
    </Shell>
  );
}

function ActionCard({ card, onResolved }) {
  const [state, setState] = useState(card.resolved || 'pending');
  const [busy, setBusy] = useState(false);
  const resolve = (s) => { setState(s); onResolved?.(s); };

  if (card.action === 'add_transactions') {
    return (
      <Shell icon={CalendarClock} title="Add these entries?" badge={state !== 'pending' && <Badge tone={state === 'saved' ? 'pos' : 'neutral'}>{state}</Badge>}>
        {state === 'pending'
          ? <ProposalReview compact proposals={card.data.transactions.map((t) => ({ ...t, confidence: 0.9 }))} source="advisor"
              onDone={() => resolve('saved')} onCancel={() => resolve('dismissed')} />
          : <p className="text-[12.5px] text-fg-muted">{state === 'saved' ? 'Saved to your transactions.' : 'Not saved.'}</p>}
      </Shell>
    );
  }
  if (card.action === 'create_goal') {
    const g = card.data;
    const create = async () => {
      setBusy(true);
      try {
        await premiumService.createGoal(g);
        toast.success('Goal created');
        resolve('saved');
      } catch (err) {
        toast.error(apiError(err, 'Could not create the goal'));
      } finally {
        setBusy(false);
      }
    };
    return (
      <Shell icon={Target} title="Create this goal?" badge={state !== 'pending' && <Badge tone={state === 'saved' ? 'pos' : 'neutral'}>{state}</Badge>}>
        <p className="text-[13px] text-fg">{g.name} · <span className="num">{inr(g.target_amount)}</span> by {new Date(g.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        {state === 'pending' && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={create} isLoading={busy}><Check className="h-3.5 w-3.5" /> Create goal</Button>
            <Button size="sm" variant="ghost" onClick={() => resolve('dismissed')}><X className="h-3.5 w-3.5" /> Not now</Button>
          </div>
        )}
      </Shell>
    );
  }
  return null;
}

export default function AdvisorCard({ card, onResolved }) {
  switch (card.type) {
    case 'snapshot': return <Snapshot data={card.data} />;
    case 'history': return <HistoryCard data={card.data} />;
    case 'forecast': return <ForecastCard data={card.data} />;
    case 'scenario': return <ScenarioCard data={card.data} />;
    case 'goal_plan': return <GoalPlanCard data={card.data} />;
    case 'explain': return card.data.drivers?.length ? <ExplainCard data={card.data} /> : null;
    case 'recurring': return <RecurringCard data={card.data} />;
    case 'budget': return <BudgetCard data={card.data} />;
    case 'action': return <ActionCard card={card} onResolved={onResolved} />;
    default: return null;
  }
}
