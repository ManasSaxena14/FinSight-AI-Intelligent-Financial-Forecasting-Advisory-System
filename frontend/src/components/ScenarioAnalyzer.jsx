import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Calculator, RotateCcw, Sparkles } from 'lucide-react';
import { aiService, apiError } from '../api/aiService';
import { premiumService } from '../api/premiumService';
import { CATEGORIES, CATEGORY_COLORS, inr, scoreTone } from '../lib/format';
import { cn } from '../lib/cn';
import { AnimatedNumber, Button, Panel, PanelHeader, Ring } from './ui';

/**
 * What-if planner: drag sliders, see savings update instantly, and get the
 * server's health score + advice (debounced) for the proposed budget.
 */
export default function ScenarioAnalyzer({ currentIncome = 0, currentExpenses = {} }) {
  const baseline = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c, Math.round(currentExpenses[c] || 0)])), [currentExpenses]);
  const [income, setIncome] = useState(Math.round(currentIncome));
  const [values, setValues] = useState(baseline);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [summary, setSummary] = useState('');
  const timer = useRef(null);

  // Natural-language what-if: the AI turns the sentence into slider changes.
  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    try {
      const r = await aiService.whatIf(question);
      setIncome(Math.round(r.income));
      setValues(Object.fromEntries(CATEGORIES.map((c) => [c, Math.round(r.expenses[c] || 0)])));
      setSummary(r.plan.summary || question);
    } catch (err) {
      toast.error(apiError(err, 'Could not understand that scenario'));
    } finally {
      setAsking(false);
    }
  };

  useEffect(() => { setValues(baseline); setIncome(Math.round(currentIncome)); }, [baseline, currentIncome]);

  const total = CATEGORIES.reduce((s, c) => s + (values[c] || 0), 0);
  const savings = income - total;
  const baseSavings = currentIncome - CATEGORIES.reduce((s, c) => s + (baseline[c] || 0), 0);
  const delta = savings - baseSavings;

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        setResult(await premiumService.analyzeScenario({ current_income: Number(income) || 0, proposed_expenses: values }));
      } catch {
        setResult(null);
      } finally {
        setBusy(false);
      }
    }, 450);
    return () => clearTimeout(timer.current);
  }, [income, values]);

  const tone = scoreTone(result?.projected_health_score);

  return (
    <Panel data-reveal>
      <PanelHeader icon={Calculator} title="What-if planner" subtitle="Drag a category and watch your savings and score respond."
        action={<Button variant="ghost" size="sm" onClick={() => { setValues(baseline); setIncome(Math.round(currentIncome)); setSummary(''); }}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>} />
      <form onSubmit={ask} className="mx-5 mt-5 flex items-center gap-2 rounded-2xl border border-ai/25 bg-ai/[0.04] p-1.5 pl-4 sm:mx-6">
        <Sparkles className="h-4 w-4 shrink-0 text-ai" />
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300}
          placeholder="Try: “What if I move to a ₹25k flat and halve shopping?”" aria-label="Describe a what-if"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-faint" />
        <Button type="submit" size="sm" isLoading={asking} disabled={!question.trim()}>Ask</Button>
      </form>
      {summary && <p className="mx-5 mt-2 text-xs text-fg-faint sm:mx-6">Applied: {summary}</p>}
      <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <label className="block">
            <span className="field-label">Monthly income</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-faint">₹</span>
              <input type="number" min="0" value={income} onChange={(e) => setIncome(Math.max(0, Number(e.target.value)))} className="field num pl-8" />
            </div>
          </label>
          {CATEGORIES.map((c) => {
            const max = Math.max(5000, (baseline[c] || 0) * 2.5, currentIncome * 0.5);
            const v = values[c] || 0;
            const changed = v !== baseline[c];
            return (
              <div key={c}>
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />{c}
                    {changed && <span className={cn('num text-[11px]', v < baseline[c] ? 'text-pos' : 'text-neg')}>{v < baseline[c] ? '−' : '+'}{inr(Math.abs(v - baseline[c]))}</span>}
                  </span>
                  <span className="num text-fg">{inr(v)}</span>
                </div>
                <input type="range" min="0" max={Math.round(max)} step="100" value={v} aria-label={`${c} amount`}
                  onChange={(e) => setValues((prev) => ({ ...prev, [c]: Number(e.target.value) }))}
                  className="range" style={{ backgroundSize: `${(v / max) * 100}% 100%` }} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel-inset p-5 text-center">
            <p className="text-xs text-fg-faint">Projected monthly savings</p>
            <p className={cn('num mt-2 text-4xl', savings >= 0 ? 'text-fg' : 'text-neg')}>
              <AnimatedNumber value={savings} format={inr} duration={0.6} />
            </p>
            <p className={cn('num mt-1.5 text-sm', delta > 0 ? 'text-pos' : delta < 0 ? 'text-neg' : 'text-fg-faint')}>
              {delta === 0 ? 'Same as now' : `${inr(delta, { sign: true })} vs. now · ${inr(delta * 12, { sign: true })}/yr`}
            </p>
          </div>
          <div className="panel-inset flex items-center gap-5 p-5">
            <Ring value={result?.projected_health_score ?? 0} size={84} stroke={7} color={tone.hex}>
              <span className={cn('num text-xl', tone.text)}>{result?.projected_health_score ?? '—'}</span>
            </Ring>
            <div>
              <p className="text-xs text-fg-faint">Health score for this plan</p>
              <p className="mt-1 text-sm text-fg-muted">{busy ? 'Recalculating…' : 'Rule-based, same as your dashboard'}</p>
            </div>
          </div>
          {result?.advice && (
            <p className="rounded-2xl border border-brand-500/20 bg-brand-500/[0.05] p-4 text-sm leading-relaxed text-fg-muted">{result.advice}</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
