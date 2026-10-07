import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight, Car, CalendarDays, Clapperboard, FileUp, Home, Layers, ListPlus, ShoppingBag, Sparkles, Trash2, TrendingUp, Utensils, Zap,
} from 'lucide-react';
import { expenseService } from '../api/expenseService';
import { aiService } from '../api/aiService';
import { ImportStatement, SmartAdd } from '../components/SmartInput';
import { Badge, Button, Field, PageHeader, Panel, PanelHeader, Select, Tabs } from '../components/ui';
import { cn } from '../lib/cn';
import { CATEGORIES, CATEGORY_COLORS, currentPeriod, inr, periodLabel, shiftPeriod, todayISO } from '../lib/format';
import { gsap } from '../lib/motion';

const ICONS = { Food: Utensils, Travel: Car, Rent: Home, Shopping: ShoppingBag, Bills: Zap, Entertainment: Clapperboard };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const errorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};

function SingleEntry({ onSaved }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(todayISO());
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoCat, setAutoCat] = useState(null);
  const amountRef = useRef(null);

  // Suggest a category from the merchant (your history first, then merchant rules).
  const suggestCategory = async () => {
    if (type !== 'expense' || merchant.trim().length < 3) return;
    try {
      const r = await aiService.categorize(merchant.trim());
      if (r.category) {
        setCategory(r.category);
        setAutoCat(r.source);
      }
    } catch {
      // suggestion is optional
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an amount greater than 0');
      gsap.fromTo(amountRef.current, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    setBusy(true);
    try {
      await expenseService.addTransaction({
        date, type, amount: value,
        category: type === 'expense' ? category : undefined,
        merchant: merchant || undefined, note: note || undefined,
      });
      toast.success(type === 'income' ? `Income of ${inr(value)} added` : `${inr(value)} added to ${category}`);
      setAmount(''); setMerchant(''); setNote(''); setAutoCat(null);
      onSaved(date.slice(0, 7));
      amountRef.current?.focus();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save that entry'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-white/[0.02] p-1">
        {['expense', 'income'].map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={cn('h-9 rounded-lg text-sm capitalize transition', type === t ? (t === 'income' ? 'bg-pos/15 text-pos' : 'bg-white/[0.08] text-fg') : 'text-fg-muted hover:text-fg')}>
            {t}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="amount" className="field-label">Amount</label>
        <div className="relative">
          <span className="display pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-fg-faint">₹</span>
          <input ref={amountRef} id="amount" type="number" inputMode="decimal" min="0" step="any" autoFocus value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0"
            className="num h-16 w-full rounded-2xl border border-line bg-white/[0.03] pl-11 pr-4 text-3xl text-fg outline-none transition placeholder:text-fg-faint/50 focus:border-brand-500/60" />
        </div>
      </div>

      {type === 'expense' && (
        <div>
          <p className="field-label">Category {autoCat && <span className="ml-1 text-ai">· auto-picked from {autoCat}</span>}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORIES.map((c) => {
              const Icon = ICONS[c];
              const active = category === c;
              return (
                <button key={c} type="button" onClick={() => { setCategory(c); setAutoCat(null); }}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition',
                    active ? 'border-transparent bg-white/[0.07] text-fg' : 'border-line text-fg-muted hover:text-fg')}
                  style={active ? { boxShadow: `0 0 0 1px ${CATEGORY_COLORS[c]}88, 0 8px 24px -12px ${CATEGORY_COLORS[c]}` } : undefined}>
                  <Icon className="h-4 w-4" style={{ color: CATEGORY_COLORS[c] }} strokeWidth={1.75} />
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" type="date" name="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
        <Field label={type === 'income' ? 'Source (optional)' : 'Merchant (optional)'} name="merchant" maxLength={80}
          value={merchant} onChange={(e) => setMerchant(e.target.value)} onBlur={suggestCategory}
          placeholder={type === 'income' ? 'Salary, freelance…' : 'Swiggy, Uber, BigBasket…'} />
      </div>
      <Field label="Note (optional)" name="note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to remember" />

      <Button type="submit" size="lg" className="w-full" isLoading={busy} magnet>
        Add {type} <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

function MonthlyTotals({ period, setPeriod, onSaved }) {
  const [income, setIncome] = useState('');
  const [values, setValues] = useState(() => Object.fromEntries(CATEGORIES.map((c) => [c, ''])));
  const [busy, setBusy] = useState(false);
  const [year, month] = period.split('-').map(Number);
  const now = currentPeriod();
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  const total = CATEGORIES.reduce((s, c) => s + (parseFloat(values[c]) || 0), 0);
  const inc = parseFloat(income) || 0;

  const setYM = (y, m) => {
    const p = `${y}-${String(m).padStart(2, '0')}`;
    setPeriod(p > now ? now : p);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (inc <= 0 && total <= 0) {
      toast.error('Add income or at least one expense');
      return;
    }
    setBusy(true);
    try {
      await expenseService.addMonthlyTotals({
        period, income: inc,
        expenses: Object.fromEntries(CATEGORIES.map((c) => [c, parseFloat(values[c]) || 0])),
      });
      toast.success(`${periodLabel(period)} updated`);
      setIncome('');
      setValues(Object.fromEntries(CATEGORIES.map((c) => [c, ''])));
      onSaved(period);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save these totals'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select id="month" label="Month" value={month} onChange={(e) => setYM(year, Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1} className="bg-ink-850">{m}</option>)}
        </Select>
        <Select id="year" label="Year" value={year} onChange={(e) => setYM(Number(e.target.value), month)}>
          {years.map((y) => <option key={y} value={y} className="bg-ink-850">{y}</option>)}
        </Select>
        <Field label="Income" name="income" type="number" min="0" step="any" prefix="₹" value={income}
          onChange={(e) => setIncome(e.target.value)} placeholder="0" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const Icon = ICONS[c];
          return (
            <label key={c} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2 transition focus-within:border-brand-500/50">
              <Icon className="h-4 w-4 shrink-0" style={{ color: CATEGORY_COLORS[c] }} strokeWidth={1.75} />
              <span className="w-28 shrink-0 text-sm text-fg-muted">{c}</span>
              <span className="text-sm text-fg-faint">₹</span>
              <input type="number" min="0" step="any" value={values[c]} placeholder="0"
                onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}
                className="num h-8 min-w-0 flex-1 bg-transparent text-right text-[15px] text-fg outline-none placeholder:text-fg-faint/50" />
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-white/[0.02] p-4 text-center">
        <div><p className="text-xs text-fg-faint">Income</p><p className="num mt-1 text-fg">{inr(inc)}</p></div>
        <div><p className="text-xs text-fg-faint">Spending</p><p className="num mt-1 text-fg">{inr(total)}</p></div>
        <div><p className="text-xs text-fg-faint">Saved</p><p className={cn('num mt-1', inc - total >= 0 ? 'text-pos' : 'text-neg')}>{inr(inc - total)}</p></div>
      </div>
      <p className="text-xs text-fg-faint">These amounts are added to anything already logged for {periodLabel(period)}.</p>

      <Button type="submit" size="lg" className="w-full" isLoading={busy} magnet>
        Save {periodLabel(period)} <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default function AddExpense() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('smart');
  const [period, setPeriod] = useState(currentPeriod());
  const [txs, setTxs] = useState([]);
  const [month, setMonth] = useState(null);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const listRef = useRef(null);
  const formRef = useRef(null);
  const redirectTimerRef = useRef(null);

  // Cancel any pending redirect on unmount
  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const scheduleRedirect = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    toast('Redirecting to overview in 7 s…', {
      icon: '🏠',
      duration: 7000,
      id: 'redirect-toast',
    });
    redirectTimerRef.current = setTimeout(() => navigate('/dashboard'), 7000);
  };

  const loadMonth = useCallback(async (p) => {
    setLoadingTxs(true);
    try {
      const [list, records] = await Promise.all([
        expenseService.getTransactions({ period: p, limit: 200 }),
        expenseService.getExpenses(),
      ]);
      setTxs(list);
      setMonth(records.find((r) => r.period === p) || null);
    } catch {
      setTxs([]);
    } finally {
      setLoadingTxs(false);
    }
  }, []);

  useEffect(() => { loadMonth(period); }, [period, loadMonth]);

  useLayoutEffect(() => {
    if (formRef.current) gsap.fromTo(formRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 });
  }, [tab]);

  useLayoutEffect(() => {
    if (!loadingTxs && listRef.current) {
      gsap.fromTo(listRef.current.children, { opacity: 0, x: 12 }, { opacity: 1, x: 0, stagger: 0.03, duration: 0.5 });
    }
  }, [loadingTxs, txs.length]);

  const onSaved = (p) => {
    if (p !== period) setPeriod(p);
    else loadMonth(p);
    scheduleRedirect();
  };

  const onBatchSaved = (res) => {
    const latest = res?.periods?.[res.periods.length - 1];
    if (latest && latest !== period) setPeriod(latest);
    else loadMonth(period);
    scheduleRedirect();
  };

  const remove = async (tx) => {
    try {
      await expenseService.deleteTransaction(tx.id);
      toast.success('Entry removed');
      loadMonth(period);
    } catch {
      toast.error('Could not remove that entry');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Add money"
        title="Log what came in"
        accent="and what went out."
        description="Type or say it, snap a receipt, import a bank statement, or enter a whole month. You review everything before it's saved."
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <Tabs value={tab} onChange={setTab} tabs={[
              { id: 'smart', label: 'Smart add', icon: Sparkles },
              { id: 'single', label: 'Single entry', icon: ListPlus },
              { id: 'import', label: 'Import', icon: FileUp },
              { id: 'monthly', label: 'Monthly totals', icon: Layers },
            ]} />
            {tab === 'monthly' && <Badge tone="gold"><CalendarDays className="h-3 w-3" /> {periodLabel(period)}</Badge>}
          </div>
          <div ref={formRef}>
            {tab === 'smart' && <SmartAdd onSaved={(res) => onBatchSaved(res)} />}
            {tab === 'single' && <SingleEntry onSaved={onSaved} />}
            {tab === 'import' && <ImportStatement onSaved={(res) => onBatchSaved(res)} />}
            {tab === 'monthly' && <MonthlyTotals period={period} setPeriod={setPeriod} onSaved={onSaved} />}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            icon={CalendarDays}
            title={periodLabel(period)}
            subtitle={month ? `${month.tx_count} entries · saved ${inr(month.savings)}` : 'No entries yet'}
            action={
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Previous month">‹</Button>
                <Button variant="ghost" size="icon" disabled={period >= currentPeriod()} onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Next month">›</Button>
              </div>
            }
          />
          {month && (
            <div className="mx-5 mt-4 grid grid-cols-3 gap-2 text-center sm:mx-6">
              <div className="panel-inset p-2.5"><p className="text-[11px] text-fg-faint">In</p><p className="num text-sm text-pos">{inr(month.income)}</p></div>
              <div className="panel-inset p-2.5"><p className="text-[11px] text-fg-faint">Out</p><p className="num text-sm">{inr(month.total_expense)}</p></div>
              <div className="panel-inset p-2.5"><p className="text-[11px] text-fg-faint">Saved</p><p className={cn('num text-sm', month.savings >= 0 ? 'text-pos' : 'text-neg')}>{inr(month.savings)}</p></div>
            </div>
          )}
          <ul ref={listRef} className="mt-3 max-h-[520px] flex-1 divide-y divide-line overflow-y-auto px-2 pb-3">
            {!loadingTxs && txs.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-fg-faint">Nothing logged for {periodLabel(period)}.</li>
            )}
            {txs.map((tx) => {
              const Icon = tx.type === 'income' ? TrendingUp : ICONS[tx.category];
              return (
                <li key={tx.id} className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/[0.02]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.02]">
                    {Icon && <Icon className="h-4 w-4" style={{ color: tx.type === 'income' ? '#34d399' : CATEGORY_COLORS[tx.category] }} strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{tx.merchant || tx.category}</p>
                    <p className="truncate text-xs text-fg-faint">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {tx.note ? ` · ${tx.note}` : ''}{tx.source === 'monthly-form' ? ' · monthly total' : ''}
                    </p>
                  </div>
                  <span className={cn('num text-sm', tx.type === 'income' ? 'text-pos' : 'text-fg')}>{tx.type === 'income' ? '+' : '−'}{inr(tx.amount)}</span>
                  <button onClick={() => remove(tx)} aria-label="Delete entry"
                    className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint opacity-60 transition hover:bg-neg/10 hover:text-neg group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-4 sm:px-6">
            <Link to="/analytics" className="flex items-center justify-between text-sm text-fg-muted hover:text-fg">
              See the forecast for this data <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
