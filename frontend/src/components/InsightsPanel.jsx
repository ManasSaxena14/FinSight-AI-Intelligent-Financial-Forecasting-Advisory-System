import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { AlertCircle, Lightbulb, ShieldAlert, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { cn } from '../utils/cn';

/**
 * InsightsPanel — Displays AI recommendations + budget alerts + anomalies
 * Props:
 *   recommendations : { recommendations: string[], alerts: string[], anomalies: object[] }
 *   isLoading       : bool
 */
export default function InsightsPanel({ recommendations, isLoading = false }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current || isLoading) return;
    gsap.fromTo(
      panelRef.current.querySelectorAll('.insight-card'),
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out' }
    );
  }, [isLoading, recommendations]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="glass-card border-none rounded-[2rem] overflow-hidden bg-bg-panel shadow-2xl p-8"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-3 w-28 bg-white/5 rounded-full animate-pulse" />
              </div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex gap-3 items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/5 mt-1.5 shrink-0" />
                  <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations) return null;

  const alerts = recommendations.alerts || [];
  const recs = recommendations.recommendations || [];
  const anomalies = recommendations.anomalies || [];

  return (
    <div ref={panelRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Budget Forensic Alerts */}
      <Card className="insight-card glass-card border-none bg-black/20 border-l-[4px] border-l-brand-600/40 shadow-2xl relative overflow-hidden group rounded-[2rem]">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
          <AlertCircle size={100} className="text-brand-500" />
        </div>
        <CardHeader className="pb-4 pt-6 bg-transparent border-none">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
              <AlertCircle className="h-5 w-5 text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            </div>
            <CardTitle className="text-text-primary font-black uppercase text-xs tracking-[0.2em]">
              Budget Forensic Alerts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <ul className="space-y-3">
              {alerts.map((alert, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 text-sm text-text-secondary font-medium items-start"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500/50 mt-1.5 shrink-0" />
                  {alert}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary italic">
              No budget anomalies detected this cycle.
            </p>
          )}

          {/* Anomalies sub-section */}
          {anomalies.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">
                  Anomaly Detection
                </p>
              </div>
              <ul className="space-y-2">
                {anomalies.map((a, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-xs text-text-secondary font-medium items-start"
                  >
                    <TrendingDown className="h-3.5 w-3.5 text-rose-400/60 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-text-primary">{a.category || a.name}</strong>
                      {a.message ? ` — ${a.message}` : ` flagged as anomalous`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Engine */}
      <Card className="insight-card glass-card border-none bg-black/20 border-l-[4px] border-l-brand-400/40 shadow-2xl relative overflow-hidden group rounded-[2rem]">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
          <Lightbulb size={100} className="text-brand-500" />
        </div>
        <CardHeader className="pb-4 pt-6 bg-transparent border-none">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
              <Lightbulb className="h-5 w-5 text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            </div>
            <CardTitle className="text-text-primary font-black uppercase text-xs tracking-[0.2em]">
              Optimization Engine
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recs.length > 0 ? (
            <ul className="space-y-3">
              {recs.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 text-sm text-text-secondary font-medium items-start"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400/50 mt-1.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary italic">
              No optimization recommendations available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
