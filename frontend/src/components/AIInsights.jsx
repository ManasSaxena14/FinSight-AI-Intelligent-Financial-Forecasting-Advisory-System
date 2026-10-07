import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, GitCompareArrows, Newspaper, PiggyBank, RefreshCw, Repeat, Sparkles } from 'lucide-react';
import { aiService, apiError } from '../api/aiService';
import { CATEGORIES, CATEGORY_COLORS, inr, inrCompact, periodLabel } from '../lib/format';
import { cn } from '../lib/cn';
import { Badge, Button, Meter, Panel, PanelHeader, Skeleton } from './ui';

function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = () => {
    setState((s) => ({ ...s, loading: true }));
    return fn().then((data) => setState({ data, error: null, loading: false }))
      .catch((err) => setState({ data: null, error: apiError(err, 'Unavailable'), loading: false }));
  };
  useEffect(() => {
    reload();
    window.addEventListener('expenses:updated', reload);
    return () => window.removeEventListener('expenses:updated', reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { ...state, reload };
}

// ── Why did it change ─────────────────────────────────────────────────────

export function ChangeExplainer() {
  const { data, error, loading } = useLoad(() => aiService.explainChange());
  if (loading) return <Skeleton className="h-64" />;
  if (error || !data) {
    return (
      <Panel data-reveal className="p-6">
        <p className="flex items-center gap-2 text-sm text-fg"><GitCompareArrows className="h-4 w-4 text-brand-300" /> Why it changed</p>
        <p className="mt-2 text-sm text-fg-faint">{error || 'Needs two complete months to compare.'}</p>
      </Panel>
    );
  }
  const max = Math.max(1, ...data.drivers.map((d) => Math.abs(d.score_impact)));
  return (
    <Panel data-reveal>
      <PanelHeader icon={GitCompareArrows} title="Why it changed" subtitle={`${data.from_label} → ${data.to_label}`}
        action={<Badge tone={data.score_change >= 0 ? 'pos' : 'neg'}>Score {data.score_from} → {data.score_to}</Badge>} />
      <div className="space-y-4 p-5 sm:p-6">
        {data.narrative && (
          <p className="rounded-2xl border border-ai/20 bg-ai/[0.04] p-4 text-[14px] leading-relaxed text-fg">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-ai" />{data.narrative}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[['Income', data.income_change], ['Spending', data.spending_change], ['Savings', data.savings_change]].map(([k, v]) => (
            <div key={k} className="panel-inset p-2.5">
              <p className="text-[11px] text-fg-faint">{k}</p>
              <p className={cn('num text-sm', (k === 'Spending' ? -v : v) > 0 ? 'text-pos' : v === 0 ? 'text-fg' : 'text-neg')}>{inr(v, { sign: true })}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-2.5">
          {data.drivers.map((d) => (
            <li key={d.factor} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[13px]">
              <span className="flex items-center gap-2 text-fg-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[d.factor] || '#34d399' }} />{d.factor}
              </span>
              <div className="relative h-2 rounded-full bg-white/[0.05]">
                <div className={cn('absolute top-0 h-full rounded-full', d.score_impact < 0 ? 'right-1/2 bg-neg' : 'left-1/2 bg-pos')}
                  style={{ width: `${(Math.abs(d.score_impact) / max) * 50}%` }} />
                <div className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-white/20" />
              </div>
              <span className="num w-28 text-right text-fg">{inr(d.change, { sign: true })}{d.change_pct != null && <span className="text-fg-faint"> ({d.change_pct > 0 ? '+' : ''}{d.change_pct}%)</span>}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-fg-faint">Bars show each item's effect on your health score with everything else held at {data.to_label} values.</p>
      </div>
    </Panel>
  );
}

// ── Recurring & subscriptions ─────────────────────────────────────────────

export function RecurringPanel() {
  const { data, loading } = useLoad(() => aiService.recurring());
  if (loading) return <Skeleton className="h-64" />;
  const items = data?.items || [];
  return (
    <Panel data-reveal>
      <PanelHeader icon={Repeat} title="Recurring & subscriptions" subtitle="Detected from merchants that charge you on a schedule"
        action={items.length > 0 && <span className="num text-sm text-fg">{inr(data.total_monthly)}<span className="text-fg-faint">/mo</span></span>} />
      <div className="p-5 sm:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-fg-faint">Nothing recurring yet. Log transactions with merchant names (or import a statement) and repeats show up here.</p>
        ) : (
          <>
            {data.subscriptions_monthly > 0 && (
              <p className="mb-3 text-[13px] text-fg-muted">Subscriptions alone cost <span className="num text-fg">{inr(data.subscriptions_monthly)}</span>/month — <span className="num">{inr(data.subscriptions_monthly * 12)}</span> a year.</p>
            )}
            <ul className="divide-y divide-line">
              {items.map((r) => (
                <li key={r.merchant} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-[13px] font-medium" style={{ color: CATEGORY_COLORS[r.category] }}>
                    {r.merchant.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm text-fg">{r.merchant}
                      {r.is_subscription && <Badge tone="ai">subscription</Badge>}
                      {r.status !== 'active' && <Badge tone="warn">stopped?</Badge>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-fg-faint"><CalendarClock className="h-3 w-3" />
                      {r.cadence} · next ~{new Date(r.next_expected).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · seen {r.charges_seen}×</p>
                  </div>
                  <span className="num text-sm text-fg">{inr(r.typical_amount)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

// ── Budgets ────────────────────────────────────────────────────────────────

export function BudgetsPanel() {
  const current = useLoad(() => aiService.getBudgets());
  const [target, setTarget] = useState(0.2);
  const [suggestion, setSuggestion] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const suggest = async (t = target) => {
    setBusy(true);
    try {
      const s = await aiService.suggestBudgets(t);
      setSuggestion(s);
      setDraft(Object.fromEntries(s.categories.map((c) => [c.category, c.suggested])));
    } catch (err) {
      toast.error(apiError(err, 'Could not suggest a budget'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await aiService.saveBudgets(draft, target);
      toast.success('Budgets saved — you’ll get a nudge if a category runs hot');
      setSuggestion(null);
      setDraft(null);
      current.reload();
    } catch (err) {
      toast.error(apiError(err, 'Could not save budgets'));
    } finally {
      setBusy(false);
    }
  };

  const progress = current.data?.progress;
  const draftTotal = useMemo(() => (draft ? Object.values(draft).reduce((a, b) => a + (Number(b) || 0), 0) : 0), [draft]);

  return (
    <Panel data-reveal>
      <PanelHeader icon={PiggyBank} title="Budgets" subtitle={progress ? `${progress.label} · day ${progress.day}` : 'AI-suggested limits per category'}
        action={!draft && <Button size="sm" variant="secondary" onClick={() => suggest()} isLoading={busy}><Sparkles className="h-3.5 w-3.5" /> {progress ? 'Re-plan' : 'Suggest'}</Button>} />
      <div className="p-5 sm:p-6">
        {draft ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-[13px]"><span className="text-fg-muted">Savings target</span><span className="num text-fg">{Math.round(target * 100)}%</span></div>
              <input type="range" min="0.05" max="0.5" step="0.05" value={target} aria-label="Savings target"
                onChange={(e) => setTarget(Number(e.target.value))} onMouseUp={() => suggest()} onTouchEnd={() => suggest()} onKeyUp={() => suggest()}
                className="range" style={{ backgroundSize: `${((target - 0.05) / 0.45) * 100}% 100%` }} />
            </div>
            {suggestion && (
              <p className={cn('rounded-xl border p-3 text-[13px]', suggestion.achievable ? 'border-pos/20 bg-pos/[0.05] text-fg-muted' : 'border-warn/20 bg-warn/[0.05] text-fg-muted')}>
                {suggestion.achievable
                  ? `This plan saves about ${inr(suggestion.projected_savings)} (${suggestion.projected_savings_rate}%) in ${periodLabel(suggestion.period)}.`
                  : `Even after realistic cuts you'd be ${inr(suggestion.shortfall)} short of ${Math.round(target * 100)}%. Try a lower target.`}
              </p>
            )}
            <ul className="space-y-2.5">
              {CATEGORIES.map((c) => {
                const row = suggestion?.categories.find((r) => r.category === c);
                return (
                  <li key={c} className="grid grid-cols-[110px_1fr_120px] items-center gap-3 text-[13px]">
                    <span className="flex items-center gap-2 text-fg-muted"><span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />{c}</span>
                    <span className="truncate text-[11px] text-fg-faint">{row?.cut > 0 ? `−${inrCompact(row.cut)} · ${row.reason}` : row?.reason}</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-faint">₹</span>
                      <input type="number" min="0" step="100" value={draft[c] ?? 0} aria-label={`${c} budget`}
                        onChange={(e) => setDraft((d) => ({ ...d, [c]: Number(e.target.value) }))} className="field num h-8 pl-6 pr-2 text-right text-xs" />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-fg-faint">Total <span className="num text-fg">{inr(draftTotal)}</span></span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setDraft(null); setSuggestion(null); }}>Cancel</Button>
                <Button size="sm" onClick={save} isLoading={busy}>Save budgets</Button>
              </div>
            </div>
          </div>
        ) : progress?.rows?.length ? (
          <ul className="space-y-3.5">
            {progress.rows.map((r) => (
              <li key={r.category}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-fg-muted"><span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[r.category] }} />{r.category}
                    {r.state !== 'on-track' && <Badge tone={r.state === 'over' ? 'neg' : 'warn'}>{r.state === 'over' ? 'over' : 'running hot'}</Badge>}
                  </span>
                  <span className="num text-xs text-fg-muted">{inr(r.spent)} / {inr(r.budget)}</span>
                </div>
                <Meter value={r.used_pct} color={r.state === 'over' ? 'bg-neg' : r.state === 'at-risk' ? 'bg-warn' : 'bg-pos'} />
              </li>
            ))}
            <p className="pt-1 text-[11px] text-fg-faint">Pace compares spending so far with how far through the month we are.</p>
          </ul>
        ) : (
          <p className="text-sm text-fg-faint">No budgets yet. Tap Suggest — FinSight starts from your forecast and trims discretionary categories first to hit a savings target.</p>
        )}
      </div>
    </Panel>
  );
}

// ── Weekly digest ─────────────────────────────────────────────────────────

export function DigestCard() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, reload } = useLoad(() => aiService.digest());
  const refresh = async () => {
    setRefreshing(true);
    try {
      await aiService.digest(true);
      await reload();
    } finally {
      setRefreshing(false);
    }
  };
  if (loading) return <Skeleton className="h-48" />;
  if (!data) return null;
  const pace = data.typical_week ? data.spent / data.typical_week : null;
  return (
    <Panel data-reveal>
      <PanelHeader icon={Newspaper} title="Your week" subtitle={`${new Date(data.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(data.to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        action={<Button size="icon" variant="ghost" onClick={refresh} aria-label="Refresh digest"><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /></Button>} />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-xs text-fg-faint">Spent this week</p>
            <p className="num text-3xl">{inr(data.spent)}</p>
          </div>
          {pace != null && (
            <Badge tone={pace > 1.1 ? 'warn' : pace < 0.9 ? 'pos' : 'neutral'}>
              {pace > 1.1 ? `${Math.round((pace - 1) * 100)}% above` : pace < 0.9 ? `${Math.round((1 - pace) * 100)}% below` : 'about'} a typical week
            </Badge>
          )}
        </div>
        <p className="text-[14px] leading-relaxed text-fg-muted">{data.summary}</p>
        {data.nudges?.length > 0 && (
          <ul className="space-y-2">
            {data.nudges.slice(0, 3).map((n) => (
              <li key={n.title} className="rounded-xl border border-warn/20 bg-warn/[0.04] px-3 py-2 text-[13px] text-fg-muted"><span className="text-fg">{n.title}.</span> {n.message}</li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
