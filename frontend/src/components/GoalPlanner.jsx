import { useEffect, useRef, useState } from 'react';
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { aiService, apiError } from '../api/aiService';
import { AXIS, ChartTooltip, yMoney } from './charts';
import { Badge, Ring } from './ui';
import { inr } from '../lib/format';

/** Monte Carlo plan for one goal, with a contribution slider that re-simulates. */
export default function GoalPlanner({ goalId, target }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const p = await aiService.goalPlan(goalId, monthly);
        setPlan(p);
        setError(null);
        if (monthly == null) setMonthly(Math.round(p.planned_monthly));
      } catch (err) {
        setError(apiError(err, 'Plan unavailable'));
      } finally {
        setLoading(false);
      }
    }, monthly == null ? 0 : 350);
    return () => clearTimeout(timer.current);
  }, [goalId, monthly]);

  if (error) return <p className="text-[13px] text-fg-faint">{error}</p>;
  if (!plan) return <div className="flex justify-center py-6 text-fg-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const pct = Math.round(plan.probability * 100);
  const color = plan.probability >= 0.8 ? '#34d399' : plan.probability >= 0.5 ? '#fbbf24' : '#f87171';
  const fan = plan.fan.map((f) => ({ ...f, band: [f.p10, f.p90] }));
  const max = Math.max(plan.required_monthly * 3, (plan.needed_for_80pct || 0) * 1.5, 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Ring value={pct} size={84} stroke={7} color={color}>
          <div>{loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-fg-faint" /> : <p className="num text-xl">{pct}%</p>}</div>
        </Ring>
        <div className="space-y-1 text-[13px] text-fg-muted">
          <Badge tone={plan.probability >= 0.8 ? 'pos' : plan.probability >= 0.5 ? 'warn' : 'neg'}>{plan.status}</Badge>
          <p>Chance of reaching it on time if you put aside <span className="num text-fg">{inr(monthly ?? plan.planned_monthly)}</span>/month.</p>
          {plan.needed_for_80pct ? <p>For an 80% chance: <span className="num text-fg">{inr(plan.needed_for_80pct)}</span>/month.</p>
            : <p className="text-warn">Even 4× the required amount doesn't reach 80% — consider a later date.</p>}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-[12px] text-fg-faint"><span>Monthly contribution</span><span className="num text-fg">{inr(monthly ?? 0)}</span></div>
        <input type="range" min="0" max={Math.round(max)} step="500" value={monthly ?? 0} aria-label="Monthly contribution"
          onChange={(e) => setMonthly(Number(e.target.value))} className="range"
          style={{ backgroundSize: `${((monthly ?? 0) / max) * 100}% 100%` }} />
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fan} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" {...AXIS} tickFormatter={(m) => `M${m}`} />
            <YAxis {...yMoney} width={48} />
            <Tooltip content={<ChartTooltip labelFormatter={(m) => `Month ${m}`} />} />
            <ReferenceLine y={target} stroke="#d4af37" strokeDasharray="4 4" />
            <Area dataKey="band" name="10–90% of futures" stroke="none" fill={color} fillOpacity={0.15} isAnimationActive={false} />
            <Line dataKey="p50" name="Median" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-fg-faint">
        {plan.simulations.toLocaleString('en-IN')} simulated futures. Each month's savings are drawn from your forecast
        (average {inr(plan.monthly_savings_mean)} ± {inr(plan.monthly_savings_std)}){plan.reserved_for_earlier_goals > 0 && `, after ${inr(plan.reserved_for_earlier_goals)}/month reserved for goals due sooner`}.
      </p>
    </div>
  );
}
