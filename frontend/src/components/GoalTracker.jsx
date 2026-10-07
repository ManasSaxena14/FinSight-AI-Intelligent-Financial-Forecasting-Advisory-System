import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronDown, Clock, Dices, IndianRupee, Plus, Target, Trash2, X } from 'lucide-react';
import GoalPlanner from './GoalPlanner';
import { premiumService } from '../api/premiumService';
import { inr, todayISO } from '../lib/format';
import { cn } from '../lib/cn';
import { gsap } from '../lib/motion';
import { Badge, Button, EmptyState, Field, Meter, Panel, Ring, Skeleton, useCollapse } from './ui';

const errorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};

function NewGoalForm({ open, onClose, onCreated }) {
  const { ref, mounted } = useCollapse(open);
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '' });
  const [busy, setBusy] = useState(false);
  const tomorrow = todayISO(new Date(Date.now() + 86400000));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await premiumService.createGoal({ ...form, target_amount: parseFloat(form.target_amount) });
      toast.success('Goal created');
      setForm({ name: '', target_amount: '', target_date: '' });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the goal'));
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;
  return (
    <div ref={ref} className="overflow-hidden">
      <form onSubmit={submit} className="panel mb-4 grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <Field label="Goal" name="goal-name" required maxLength={100} value={form.name} placeholder="Emergency fund, Goa trip…"
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field label="Target" name="goal-target" type="number" min="1" required prefix="₹" value={form.target_amount}
          onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
        <Field label="By" name="goal-date" type="date" min={tomorrow} required value={form.target_date}
          onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
        <div className="flex gap-2">
          <Button type="submit" isLoading={busy}>Create</Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cancel"><X className="h-4 w-4" /></Button>
        </div>
      </form>
    </div>
  );
}

function GoalCard({ goal, available, onChanged }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const planCollapse = useCollapse(planOpen);
  const done = goal.progress_percentage >= 100;
  const color = done ? '#d4af37' : goal.is_on_track ? '#34d399' : '#fbbf24';

  const contribute = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setBusy(true);
    try {
      await premiumService.contributeToGoal(goal.id, value);
      toast.success(`${inr(value)} added to ${goal.name}`);
      setAmount('');
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add to this goal'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${goal.name}"?`)) return;
    try {
      await premiumService.deleteGoal(goal.id);
      toast.success('Goal deleted');
      onChanged();
    } catch {
      toast.error('Could not delete the goal');
    }
  };

  return (
    <Panel glow className="flex flex-col p-5" data-goal>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-fg">{goal.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-faint">
            <Clock className="h-3 w-3" />
            {goal.days_remaining > 0 ? `${goal.days_remaining} days left` : 'Deadline passed'} · {new Date(goal.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button onClick={remove} aria-label="Delete goal" className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint hover:bg-neg/10 hover:text-neg">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <Ring value={goal.progress_percentage} size={92} stroke={7} color={color}>
          <div><p className="num text-lg">{Math.round(goal.progress_percentage)}%</p></div>
        </Ring>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="num text-xl text-fg">{inr(goal.current_savings)}</p>
          <p className="text-xs text-fg-faint">of {inr(goal.target_amount)}</p>
          {done ? <Badge tone="gold"><CheckCircle2 className="h-3 w-3" /> Reached</Badge>
            : <Badge tone={goal.is_on_track ? 'pos' : 'warn'} dot>{goal.is_on_track ? 'On track' : 'Behind'}</Badge>}
        </div>
      </div>

      {!done && goal.track_reason && <p className="mt-4 text-[13px] leading-relaxed text-fg-muted">{goal.track_reason}</p>}
      <Meter value={goal.progress_percentage} className="mt-4" color={done ? 'bg-brand-400' : goal.is_on_track ? 'bg-pos' : 'bg-warn'} />

      {!done && (
        <>
          <button type="button" onClick={() => setPlanOpen((o) => !o)}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-ai/25 bg-ai/[0.05] px-3 py-2 text-[13px] text-ai hover:bg-ai/10">
            <span className="flex items-center gap-2"><Dices className="h-4 w-4" /> Will I make it? Simulate</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', planOpen && 'rotate-180')} />
          </button>
          {planCollapse.mounted && (
            <div ref={planCollapse.ref} className="overflow-hidden">
              <div className="pt-4"><GoalPlanner goalId={goal.id} target={goal.target_amount} /></div>
            </div>
          )}
        </>
      )}

      {!done && (
        <form onSubmit={contribute} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-faint" />
            <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ${inr(available)}`} className="field h-9 pl-8 text-[13px]" aria-label={`Add savings to ${goal.name}`} />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9" isLoading={busy} disabled={!amount}>Add</Button>
        </form>
      )}
    </Panel>
  );
}

export default function GoalTracker() {
  const [goals, setGoals] = useState(null);
  const [adding, setAdding] = useState(false);
  const gridRef = useRef(null);

  const load = useCallback(() => premiumService.getGoals().then(setGoals).catch(() => setGoals([])), []);
  useEffect(() => { load(); }, [load]);

  useLayoutEffect(() => {
    if (!gridRef.current) return;
    gsap.fromTo(gridRef.current.querySelectorAll('[data-goal]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.8 });
  }, [goals?.length]);

  if (goals === null) {
    return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>;
  }

  const available = goals[0]?.available_savings_balance ?? 0;
  const capacity = goals[0]?.monthly_savings_capacity;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="chip">Unallocated savings <span className="num text-fg">{inr(available)}</span></span>
          {capacity != null && <span className="chip">Recent monthly savings <span className="num text-fg">{inr(capacity)}</span></span>}
        </div>
        {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New goal</Button>}
      </div>
      <NewGoalForm open={adding} onClose={() => setAdding(false)} onCreated={load} />
      {goals.length === 0 && !adding ? (
        <EmptyState icon={Target} title="No goals yet" description="Set a target and a date. We'll check it against what you actually save each month."
          action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Create a goal</Button>} />
      ) : (
        <div ref={gridRef} className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3')}>
          {goals.map((g) => <GoalCard key={g.id} goal={g} available={available} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}
