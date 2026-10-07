import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Trash2 } from 'lucide-react';
import { aiService, apiError } from '../api/aiService';
import { CATEGORIES, CATEGORY_COLORS, inr, todayISO } from '../lib/format';
import { cn } from '../lib/cn';
import { gsap } from '../lib/motion';
import { Badge, Button } from './ui';

/**
 * Editable review table for AI/import proposals. Nothing is saved until the
 * user presses Save. Likely duplicates start unticked.
 */
export default function ProposalReview({ proposals, source, method, onDone, onCancel, compact = false }) {
  const [rows, setRows] = useState(() => proposals.map((p, i) => ({ ...p, _id: i, _include: !p.duplicate })));
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useLayoutEffect(() => {
    gsap.from(listRef.current?.children || [], { opacity: 0, y: 8, stagger: 0.03, duration: 0.5 });
  }, []);

  const included = rows.filter((r) => r._include);
  const totals = useMemo(() => included.reduce((acc, r) => {
    acc[r.type] += Number(r.amount) || 0;
    return acc;
  }, { expense: 0, income: 0 }), [included]);

  const update = (id, patch) => setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const save = async () => {
    const valid = included.filter((r) => Number(r.amount) > 0 && r.date);
    if (!valid.length) { toast.error('Nothing selected to save'); return; }
    setBusy(true);
    try {
      const res = await aiService.confirmTransactions(valid, source);
      toast.success(`Saved ${res.added} entr${res.added === 1 ? 'y' : 'ies'}${res.skipped_duplicates ? ` · ${res.skipped_duplicates} duplicate(s) skipped` : ''}`);
      onDone?.(res);
    } catch (err) {
      toast.error(apiError(err, 'Could not save these entries'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg">Review {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} before saving</p>
        {method && <Badge tone={method === 'ai' || method === 'vision' ? 'ai' : 'neutral'}>{method === 'ai' ? 'Read by AI' : method === 'vision' ? 'Read from photo' : method === 'rules' ? 'Read by rules' : method.toUpperCase()}</Badge>}
      </div>
      <ul ref={listRef} className={cn('space-y-2 overflow-y-auto pr-1', compact ? 'max-h-72' : 'max-h-[420px]')}>
        {rows.map((r) => (
          <li key={r._id} className={cn('rounded-xl border p-2.5 transition', r._include ? 'border-line bg-white/[0.02]' : 'border-line/50 opacity-50')}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => update(r._id, { _include: !r._include })} aria-label={r._include ? 'Exclude' : 'Include'}
                className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', r._include ? 'border-brand-400 bg-brand-400 text-ink-950' : 'border-line-strong')}>
                {r._include && <Check className="h-3.5 w-3.5" />}
              </button>
              <input type="date" value={r.date} max={todayISO()} onChange={(e) => update(r._id, { date: e.target.value })}
                className="field h-8 w-[138px] px-2 text-xs" aria-label="Date" />
              <select value={r.type === 'income' ? 'Income' : r.category} aria-label="Category"
                onChange={(e) => update(r._id, e.target.value === 'Income' ? { type: 'income', category: 'Income' } : { type: 'expense', category: e.target.value })}
                className="field h-8 w-[130px] px-2 text-xs">
                {[...CATEGORIES, 'Income'].map((c) => <option key={c} value={c} className="bg-ink-850">{c}</option>)}
              </select>
              <input value={r.merchant || ''} placeholder="Merchant" maxLength={40} onChange={(e) => update(r._id, { merchant: e.target.value })}
                className="field h-8 min-w-[110px] flex-1 px-2 text-xs" aria-label="Merchant" />
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-fg-faint">₹</span>
                <input type="number" min="0" step="any" value={r.amount} onChange={(e) => update(r._id, { amount: e.target.value })}
                  className={cn('field num h-8 w-[104px] pl-5 pr-2 text-right text-xs', r.type === 'income' && 'text-pos')} aria-label="Amount" />
              </div>
              <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x._id !== r._id))} aria-label="Remove"
                className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint hover:bg-neg/10 hover:text-neg">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {(r.duplicate || r.confidence < 0.5 || r.raw) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7 text-[11px] text-fg-faint">
                {r.duplicate && <span className="flex items-center gap-1 text-warn"><AlertTriangle className="h-3 w-3" /> Looks like an entry you already have</span>}
                {!r.duplicate && r.confidence < 0.5 && <span className="text-warn">Check the category</span>}
                {r.raw && <span className="truncate">“{r.raw}”</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-xs text-fg-faint">
          {included.length} selected · <span className="num text-fg">{inr(totals.expense)}</span> out
          {totals.income > 0 && <> · <span className="num text-pos">{inr(totals.income)}</span> in</>}
        </p>
        <div className="flex gap-2">
          {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
          <Button size="sm" onClick={save} isLoading={busy} disabled={!included.length}>Save {included.length || ''}</Button>
        </div>
      </div>
      {!compact && <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <span key={c} className="flex items-center gap-1 text-[10px] text-fg-faint"><span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />{c}</span>)}</div>}
    </div>
  );
}
