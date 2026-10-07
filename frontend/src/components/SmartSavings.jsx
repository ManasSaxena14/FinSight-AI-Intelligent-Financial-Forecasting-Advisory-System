import { useEffect, useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { premiumService } from '../api/premiumService';
import { CATEGORY_COLORS, inr } from '../lib/format';
import { cn } from '../lib/cn';
import { aiService } from '../api/aiService';
import { Badge, FeedbackButtons, Panel, PanelHeader, Skeleton, useCollapse } from './ui';

const PRIORITY = { high: 'neg', medium: 'warn', low: 'pos' };

function Tip({ tip, defaultOpen, onRated }) {
  const [open, setOpen] = useState(defaultOpen);
  const { ref, mounted } = useCollapse(open);
  return (
    <li className="rounded-2xl border border-line bg-white/[0.02]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[tip.category] || '#d4af37' }} />
        <span className="flex-1 text-sm text-fg">{tip.category}</span>
        <Badge tone={PRIORITY[tip.priority]}>{tip.priority}</Badge>
        {tip.potential_saving > 0 && <span className="num text-sm text-pos">+{inr(tip.potential_saving)}</span>}
        <ChevronDown className={cn('h-4 w-4 text-fg-faint transition-transform', open && 'rotate-180')} />
      </button>
      {mounted && (
        <div ref={ref} className="overflow-hidden">
          <p className="px-4 text-[13px] leading-relaxed text-fg-muted">{tip.tip}</p>
          {tip.key && (
            <div className="flex items-center justify-end gap-2 px-3 pb-2 text-[11px] text-fg-faint">
              Useful?
              <FeedbackButtons value={tip.feedback} label={`${tip.category} tip`}
                onRate={async (r) => { await aiService.itemFeedback('tip', tip.key, r); onRated(); }} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function SmartSavings({ className }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => premiumService.getSmartSavings().then(setData).catch(() => setData(null)).finally(() => setLoading(false));

  useEffect(() => {
    load();
    window.addEventListener('expenses:updated', load);
    return () => window.removeEventListener('expenses:updated', load);
  }, []);

  return (
    <Panel className={className}>
      <PanelHeader icon={Lightbulb} title="Smart savings" subtitle="Compared with healthy ranges for your income" />
      {loading ? (
        <div className="space-y-3 p-5 sm:p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data ? (
        <p className="p-6 text-sm text-fg-faint">Savings ideas are unavailable right now.</p>
      ) : (
        <div className="space-y-4 p-5 sm:p-6">
          {data.monthly_saving_potential > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="panel-inset p-3"><p className="text-[11px] text-fg-faint">Per month</p><p className="num text-lg text-pos">+{inr(data.monthly_saving_potential)}</p></div>
              <div className="panel-inset p-3"><p className="text-[11px] text-fg-faint">Per year</p><p className="num text-lg text-fg">+{inr(data.annual_saving_potential)}</p></div>
            </div>
          )}
          <p className="text-[13px] leading-relaxed text-fg-muted">{data.summary}</p>
          <ul className="space-y-2">
            {data.tips.map((t, i) => <Tip key={t.key || `${t.category}-${i}`} tip={t} defaultOpen={i === 0} onRated={load} />)}
          </ul>
          {data.hidden_count > 0 && (
            <button type="button" onClick={async () => { await aiService.resetFeedback('tip'); load(); }}
              className="text-xs text-fg-faint underline-offset-2 hover:text-fg hover:underline">
              {data.hidden_count} tip{data.hidden_count > 1 ? 's' : ''} hidden because you marked {data.hidden_count > 1 ? 'them' : 'it'} not useful — show again
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
