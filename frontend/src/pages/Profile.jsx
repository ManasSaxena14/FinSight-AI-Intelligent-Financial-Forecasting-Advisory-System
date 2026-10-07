import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Crown, History, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../api/expenseService';
import { Badge, Button, PageHeader, Panel, PanelHeader, Skeleton } from '../components/ui';
import { inr, periodLabel } from '../lib/format';
import { gsap, revealChildren } from '../lib/motion';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => { expenseService.getExpenses().then(setRecords).catch(() => setRecords([])); }, []);

  useLayoutEffect(() => {
    if (records === null) return undefined;
    const ctx = gsap.context(() => revealChildren(rootRef.current), rootRef);
    return () => ctx.revert();
  }, [records]);

  const signOut = () => {
    logout();
    toast.success('Signed out');
    navigate('/welcome');
  };

  if (!user) return null;
  const totals = (records || []).reduce((acc, r) => ({ income: acc.income + r.income, saved: acc.saved + r.savings }), { income: 0, saved: 0 });

  return (
    <div ref={rootRef} className="space-y-8">
      <PageHeader eyebrow="Profile" title={user.name || 'Your account'} description="Your account details and full monthly history." />

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel className="p-6" data-reveal>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-300 to-brand-600 text-2xl font-semibold text-ink-950">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg text-fg">{user.name}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-fg-muted"><Mail className="h-3.5 w-3.5" />{user.email}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="panel-inset p-3"><p className="text-[11px] text-fg-faint">Months logged</p><p className="num text-lg">{records?.length ?? '—'}</p></div>
            <div className="panel-inset p-3"><p className="text-[11px] text-fg-faint">Total income</p><p className="num text-lg">{inr(totals.income)}</p></div>
            <div className="panel-inset p-3"><p className="text-[11px] text-fg-faint">Total saved</p><p className={`num text-lg ${totals.saved >= 0 ? 'text-pos' : 'text-neg'}`}>{inr(totals.saved)}</p></div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-fg-faint"><ShieldCheck className="h-3.5 w-3.5" /> Signed in with a secure, expiring token.</p>
        </Panel>
        <Panel className="flex flex-col justify-between gap-6 p-6" data-reveal>
          <div>
            <Badge tone="gold"><Crown className="h-3 w-3" /> Essential plan</Badge>
            <p className="mt-3 text-sm text-fg-muted">All core features are free while FinSight is in early access.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/plans')}>View plans</Button>
            <Button variant="danger" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </Panel>
      </section>

      <Panel data-reveal>
        <PanelHeader icon={History} title="Monthly history" subtitle="Every month you've logged, newest first" />
        <div className="p-5 sm:p-6">
          {records === null ? <Skeleton className="h-40" /> : records.length === 0 ? (
            <p className="text-sm text-fg-faint">No months logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-faint">
                    <th className="pb-3 font-normal">Month</th><th className="pb-3 text-right font-normal">Income</th>
                    <th className="pb-3 text-right font-normal">Spending</th><th className="pb-3 text-right font-normal">Saved</th>
                    <th className="pb-3 text-right font-normal">Entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3"><span className="flex items-center gap-2 text-fg"><CalendarDays className="h-3.5 w-3.5 text-fg-faint" />{periodLabel(r.period)}</span></td>
                      <td className="num py-3 text-right">{inr(r.income)}</td>
                      <td className="num py-3 text-right">{inr(r.total_expense)}</td>
                      <td className={`num py-3 text-right ${r.savings >= 0 ? 'text-pos' : 'text-neg'}`}>{inr(r.savings)}</td>
                      <td className="num py-3 text-right text-fg-muted">{r.tx_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
