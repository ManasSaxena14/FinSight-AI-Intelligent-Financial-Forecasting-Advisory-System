import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, IndianRupee, Zap } from 'lucide-react';

const PRIORITY_CONFIG = {
  high:   { label: 'High Impact', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: AlertTriangle },
  medium: { label: 'Medium',      color: 'text-brand-400',  bg: 'bg-brand-500/10',  border: 'border-brand-500/30',  icon: TrendingUp   },
  low:    { label: 'Optimised',   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',icon: CheckCircle  },
};

export default function SmartSavings() {
  const [data, setData]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    premiumService.getSmartSavings()
      .then(setData)
      .catch(err => console.error('Smart savings fetch failed:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
          transition={{ duration: 0.4 }}
        >
          <Card className="analytics-card border-none bg-black/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white/[0.03] rounded-3xl animate-pulse" />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ) : !data ? null : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Card className="analytics-card border-none bg-black/20 shadow-2xl rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/[0.04] blur-[120px] rounded-full pointer-events-none" />

            <CardHeader className="border-b border-white/5 bg-transparent py-8 px-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-5">
                  <div className="p-3.5 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-2xl shadow-brand-500/10">
                    <Lightbulb className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black tracking-[0.3em] text-text-primary uppercase italic">
                      Smart savings
                    </CardTitle>
                    <p className="text-[10px] text-text-tertiary mt-1 font-black uppercase tracking-[0.2em]">
                      Personalized savings tips
                    </p>
                  </div>
                </div>

                {/* Potential savings badge */}
                {data.monthly_saving_potential > 0 && (
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">Monthly Potential</p>
                      <p className="text-2xl font-black text-brand-400 tracking-tight italic drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                        +₹{data.monthly_saving_potential.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">Annual Potential</p>
                      <p className="text-2xl font-black text-text-primary tracking-tight italic">
                        +₹{data.annual_saving_potential.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary bar */}
              <div className="mt-6 p-5 bg-gradient-to-r from-brand-500/10 to-transparent rounded-2xl border border-brand-500/10 flex items-center gap-4">
                <Zap className="w-4 h-4 text-brand-400 shrink-0" />
                <p className="text-sm text-text-secondary font-medium leading-relaxed">{data.summary}</p>
              </div>
            </CardHeader>

            <CardContent className="p-10 pt-8 space-y-5">
              {data.tips.map((tip, idx) => {
                const cfg = PRIORITY_CONFIG[tip.priority] || PRIORITY_CONFIG.low;
                const Icon = cfg.icon;
                const isOpen = expanded === idx;

                return (
                  <motion.div
                    key={idx}
                    layout // Animate layout changes automatically
                    className={`rounded-3xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-black/40`}
                    onClick={() => setExpanded(isOpen ? null : idx)}
                  >
                    <div className="flex items-center gap-6 p-6">
                      {/* Priority icon */}
                      <div className={`shrink-0 p-3 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>

                      {/* Category + priority */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h4 className="font-black text-text-primary text-sm tracking-tight italic">{tip.category}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {!isOpen && (
                          <p className="text-[11px] text-text-tertiary font-medium truncate max-w-[480px]">
                            {tip.tip.substring(0, 80)}…
                          </p>
                        )}
                      </div>

                      {/* Saving amount */}
                      {tip.potential_saving > 0 && (
                        <div className="shrink-0 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <IndianRupee className="w-3.5 h-3.5 text-brand-500" />
                            <span className="text-lg font-black text-text-primary tracking-tight italic">
                              {tip.potential_saving.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">saved/mo</p>
                        </div>
                      )}

                      {/* Expand chevron */}
                      <motion.div 
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-white/10 text-text-tertiary"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div 
                          key="details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="px-6 pb-6 pt-0 overflow-hidden"
                        >
                          <div className="border-t border-white/5 pt-5">
                            <p className="text-sm text-text-secondary leading-relaxed font-medium">{tip.tip}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
