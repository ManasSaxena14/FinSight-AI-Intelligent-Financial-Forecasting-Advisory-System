import { useEffect, useState } from 'react';
import { BookOpen, Cpu, Database, ThumbsUp } from 'lucide-react';
import { aiService } from '../api/aiService';
import { Badge, Panel, PanelHeader, Skeleton } from './ui';

const LABELS = {
  forecaster: 'Forecaster', overspend_risk: 'Overspend risk', anomalies: 'Anomalies', goal_planner: 'Goal planner',
  budgets: 'Budgets', health_score: 'Health score', recurring: 'Recurring charges', agent: 'AI advisor agent',
};

/** Live model card from /api/ml/model-info. */
export default function ModelCard() {
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { aiService.modelInfo().then(setInfo).catch(() => setFailed(true)); }, []);
  if (failed) return null;
  if (!info) return <Skeleton className="h-72" />;
  const fb = info.answer_feedback;
  return (
    <Panel data-reveal>
      <PanelHeader icon={Cpu} title="Model card" subtitle="Exactly what is running right now, with versions"
        action={<Badge tone="ai">{info.llm.provider} · {info.llm.chat}</Badge>} />
      <div className="grid gap-px overflow-hidden border-y border-line bg-line sm:grid-cols-2">
        {Object.entries(info.components).map(([key, c]) => (
          <div key={key} className="bg-ink-850/90 px-5 py-4">
            <p className="flex items-center justify-between text-[13px] text-fg">{LABELS[key] || key}<span className="num text-[11px] text-fg-faint">v{c.version}</span></p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{c.method}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-[13px] text-fg"><BookOpen className="h-4 w-4 text-ai" /> Knowledge base</p>
          <p className="mt-1 text-[12.5px] text-fg-muted">{info.knowledge_base.documents} documents · {info.knowledge_base.chunks} sections · {info.knowledge_base.retrieval}</p>
          <p className="num mt-1 text-[11px] text-fg-faint">version {info.knowledge_base.version}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-[13px] text-fg"><Database className="h-4 w-4 text-brand-300" /> Reference data</p>
          <p className="mt-1 text-[12.5px] text-fg-muted">{info.reference_data.rows.toLocaleString('en-IN')} rows · {info.reference_data.note}</p>
          <p className="num mt-1 text-[11px] text-fg-faint">sha256 {info.reference_data.sha256}</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-[13px] text-fg"><ThumbsUp className="h-4 w-4 text-pos" /> Answer feedback</p>
          <p className="mt-1 text-[12.5px] text-fg-muted">
            {fb.rated_answers ? `${fb.helpful_pct}% of ${fb.rated_answers} rated answers marked helpful` : 'No answers rated yet — use 👍/👎 in the advisor.'}
          </p>
        </div>
      </div>
      <details className="border-t border-line px-5 py-3 text-[12.5px] text-fg-muted sm:px-6">
        <summary className="cursor-pointer text-fg-faint hover:text-fg">Knowledge base documents</summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {info.knowledge_base.docs.map((d) => <li key={d.id}>{d.title} <span className="text-fg-faint">· {d.as_of}</span></li>)}
        </ul>
      </details>
    </Panel>
  );
}
