import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { AlertCircle, Lightbulb, ShieldAlert, TrendingDown, Info } from 'lucide-react';
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
  const overallAnomalyScore = recommendations.overall_anomaly_score || 0;

  return (
     <div ref={panelRef} className="space-y-8">
       {/* Overall Anomaly Score Bar */}
       {overallAnomalyScore > 0 && (
         <Card className="insight-card glass-card border-none bg-black/20 shadow-2xl rounded-[2rem] overflow-hidden">
           <CardContent className="py-6 px-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                   <ShieldAlert className="h-4 w-4 text-rose-400" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                     Multivariate Anomaly Score
                   </p>
                   <p className="text-sm font-bold text-text-primary">
                     {overallAnomalyScore > 60 ? 'Unusual Spending Pattern Detected' : 'Pattern Within Normal Range'}
                   </p>
                 </div>
               </div>
               <div className="flex-1 max-w-md w-full">
                 <div className="flex justify-between mb-1">
                   <span className="text-[9px] font-black text-text-tertiary uppercase">Sensitivity</span>
                   <span className="text-[9px] font-black text-rose-400 uppercase">{overallAnomalyScore}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div 
                     className={cn(
                       "h-full transition-all duration-1000 ease-out rounded-full",
                       overallAnomalyScore > 70 ? "bg-rose-500" : overallAnomalyScore > 40 ? "bg-brand-500" : "bg-emerald-500"
                     )}
                     style={{ width: `${overallAnomalyScore}%` }}
                   />
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
       )}
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Budget alerts */}
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
                 Budget alerts
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
                     <span className={cn(
                       "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                       alert.toLowerCase().includes('critical') ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-brand-500/50"
                     )} />
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
                 <ul className="space-y-3">
                   {anomalies.map((a, idx) => (
                     <li
                       key={idx}
                       className="bg-white/[0.02] p-3 rounded-xl border border-white/5 group/item transition-colors hover:bg-white/[0.04]"
                     >
                       <div className="flex justify-between items-start mb-1">
                         <div className="flex items-center gap-2">
                           <TrendingDown className={cn(
                             "h-3.5 w-3.5 shrink-0",
                             a.severity === 'critical' ? "text-rose-500" : "text-rose-400/60"
                           )} />
                           <span className="text-xs font-black text-text-primary uppercase tracking-tight">
                             {a.category || a.name}
                           </span>
                         </div>
                         <span className={cn(
                           "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                           a.severity === 'critical' ? "bg-rose-500/20 text-rose-400" : "bg-brand-500/10 text-brand-400"
                         )}>
                           {a.severity}
                         </span>
                       </div>
                       <p className="text-[11px] text-text-tertiary font-medium pl-5">
                         {a.message
                           ? a.message
                           : `Spending in this area looks unusually high compared to your normal pattern this month.`}
                       </p>
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
                 Simple money tips
               </CardTitle>
             </div>
           </CardHeader>
           <CardContent>
             {recs.length > 0 ? (
               <ul className="space-y-3">
                 {recs.map((rec, idx) => (
                   <li
                     key={idx}
                     className="flex gap-3 text-sm text-text-secondary font-medium items-start bg-white/[0.02] p-3 rounded-xl border border-white/5"
                   >
                     <Info className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                     <span className="leading-relaxed">{rec}</span>
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
     </div>
   );
 }
