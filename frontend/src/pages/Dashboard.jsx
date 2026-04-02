import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Activity, CreditCard, PiggyBank, Target, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoalTracker from '../components/GoalTracker';

export const getScoreColors = (score) => {
  if (!score) return { bg: 'from-brand-500/5 to-transparent', border: 'border-brand-500/20', text: 'text-brand-500', glow: 'shadow-brand-500/10', badge: 'bg-brand-500/10 text-brand-500', icon: 'text-brand-400' };
  if (score >= 90) return { bg: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'text-emerald-400' };
  if (score >= 70) return { bg: 'from-brand-500/10 to-transparent', border: 'border-brand-500/40', text: 'text-brand-400', glow: 'shadow-brand-500/20', badge: 'bg-brand-500/20 text-brand-400 border-brand-500/30', icon: 'text-brand-400' };
  if (score >= 40) return { bg: 'from-amber-500/10 to-transparent', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/20', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'text-amber-400' };
  return { bg: 'from-rose-500/10 to-transparent', border: 'border-rose-500/40', text: 'text-rose-400', glow: 'shadow-rose-500/20', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: 'text-rose-400' };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [stats, setStats] = useState({ totalExpense: 0, totalIncome: 0 });
  const [aiSummary, setAiSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await expenseService.getExpenses();
        setExpenses(data);

        if (data.length > 0) {
          // Use the most recent month for health score & stats
          const latest = data[0];
          setStats({ totalExpense: latest.total_expense, totalIncome: latest.income });
          
          const context = {
            income: latest.income,
            expenses: latest.expenses,
            savings: latest.savings
          };

          // Fetch ML health score and AI Summary concurrently
          const [healthData, summaryData] = await Promise.allSettled([
            mlService.getHealthScore({
              income: latest.income,
              expenses: latest.expenses
            }),
            premiumService.getMonthlySummary(context)
          ]);

          if (healthData.status === 'fulfilled') setHealthScore(healthData.value);
          if (summaryData.status === 'fulfilled') setAiSummary(summaryData.value.reply);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // GSAP Stagger animation for cards (kept alongside Framer Motion for specific element staggers)
      gsap.fromTo(
        gsap.utils.toArray('.dash-card'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, [isLoading]);

  const scoreColor = getScoreColors(healthScore?.score);

  return (
    <div className="space-y-10 relative" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      <div className="relative z-10">
        <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">
          Welcome back{user?.name ? `, ${user.name}` : ''}.
        </h1>
        <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide">
          Your intelligent financial snapshot for the current fiscal cycle.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.4 }}
            className="p-16 text-center text-zinc-500 tracking-widest uppercase font-black text-[10px] animate-pulse"
          >
            Initializing financial overview...
          </motion.div>
        ) : expenses.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="dash-card glass-card">
              <CardContent className="py-24 text-center">
                <h3 className="text-2xl font-bold text-text-secondary tracking-tight">System Initialization Pending</h3>
                <p className="mt-3 text-sm text-text-tertiary max-w-md mx-auto">Upload your first dataset to activate the AI forecasting engine and unlock health forensics.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
          >
            {/* AI Narrative Summary Card */}
            {aiSummary && (
              <Card className="dash-card border-none bg-gradient-to-br from-bg-panel/80 via-black/40 to-bg-panel/80 shadow-2xl relative overflow-hidden group border border-white/5 rounded-[2.5rem]">
                 <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
                <CardContent className="p-8 sm:p-10">
                  <div className="flex flex-col md:flex-row items-start gap-8">
                    <div className="shrink-0 p-4 bg-brand-500/10 rounded-[2rem] border border-brand-500/20 shadow-2xl shadow-brand-500/5">
                      <Sparkles className="h-8 w-8 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.3em]">AI Synthesis Report</p>
                         <div className="h-px w-12 bg-brand-500/20" />
                      </div>
                      <p className="text-text-primary text-xl md:text-2xl font-medium leading-relaxed tracking-tight">
                        {aiSummary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Key Metrics */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {[
                { label: 'Total Income', value: stats.totalIncome, icon: Activity, color: 'brand' },
                { label: 'Total Expenses', value: stats.totalExpense, icon: CreditCard, color: 'neutral' },
                { label: 'Net Savings', value: stats.totalIncome - stats.totalExpense, icon: PiggyBank, color: 'brand' },
              ].map((metric, i) => (
                <Card key={i} className="dash-card glass-card border-none group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${metric.color === 'brand' ? 'bg-brand-500/10 border border-brand-500/20' : 'bg-white/5 border border-white/10'} transition-all duration-500 group-hover:scale-110 shadow-lg shadow-black/20`}>
                        <metric.icon className={`h-5 w-5 ${metric.color === 'brand' ? 'text-brand-400' : 'text-text-tertiary'}`} />
                      </div>
                      <TrendingUp className="h-4 w-4 text-brand-500/30" />
                    </div>
                    <dl>
                      <dt className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">{metric.label}</dt>
                      <dd className="text-3xl font-black text-text-primary tracking-tighter mt-1">₹{metric.value.toLocaleString()}</dd>
                    </dl>
                  </CardContent>
                </Card>
              ))}

              <Card className={`dash-card glass-card border-none group bg-gradient-to-br ${scoreColor.bg}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl bg-black/40 border ${scoreColor.border} transition-all duration-500 group-hover:scale-110 shadow-lg ${scoreColor.glow}`}>
                      <Target className={`h-5 w-5 ${scoreColor.icon}`} />
                    </div>
                     <motion.div 
                       animate={{ opacity: [1, 0.5, 1] }} 
                       transition={{ duration: 2, repeat: Infinity }}
                       className={`text-[10px] font-black px-3 py-1.5 rounded-lg border ${scoreColor.badge}`}
                     >
                       AI LIVE
                     </motion.div>
                  </div>
                  <dl>
                    <dt className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">Intelligence Score</dt>
                    <dd className={`text-3xl font-black tracking-tighter mt-1 flex items-baseline ${scoreColor.text}`}>
                      {healthScore ? healthScore.score : '--'}
                      <span className="text-xs font-bold text-text-tertiary ml-2">/ 100</span>
                    </dd>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 relative z-10">
              {/* Financial Status Summary */}
              <div className="lg:col-span-1 space-y-8">
                <Card className="dash-card glass-card border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-black tracking-tight text-text-primary flex justify-between items-center">
                      Health Audit
                      <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {healthScore ? (
                      <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                          <p className="text-text-secondary text-sm leading-relaxed font-medium capitalize">
                            Diagnostic: <strong className="text-text-primary font-black ml-1">{healthScore.status}</strong>
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-[10px] uppercase font-black tracking-widest px-1">
                            <span className="text-text-tertiary">Accumulation Rate</span>
                            <span className={`${scoreColor.text}`}>{healthScore.savings_rate_pct}%</span>
                          </div>
                          <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/5 relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
                             <div 
                              className={`h-full bg-gradient-to-r ${scoreColor.bg}`}
                              style={{ width: `${Math.max(0, Math.min(100, healthScore.savings_rate_pct))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         <div className="h-4 w-full bg-white/5 rounded-full animate-pulse" />
                         <div className="h-10 w-full bg-white/5 rounded-2xl animate-pulse" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Goal Tracker Component */}
                <GoalTracker />
              </div>

              {/* Recent Expenses List */}
              <Card className="dash-card glass-card border-none lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-black tracking-tight text-text-primary flex justify-between items-center px-1">
                    Financial History
                    <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">Deep Dive Available</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-hidden rounded-b-[2.5rem]">
                    <ul className="divide-y divide-white/5">
                      {expenses.slice(0, 5).map((record) => {
                        const isExpanded = expandedRecordId === record.id;
                        return (
                        <li key={record.id} className="flex flex-col transition-all duration-500 group">
                          <div 
                            className="p-6 hover:bg-white/[0.02] cursor-pointer flex items-center justify-between"
                            onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-2xl bg-bg-panel border border-white/5 flex items-center justify-center transition-all duration-500 ${isExpanded ? 'text-brand-400 border-brand-500/40' : 'text-text-tertiary group-hover:text-brand-400 group-hover:border-brand-500/20'}`}>
                                 <Activity className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-text-primary tracking-tight">{record.month} Snapshot</p>
                                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1">
                                  Net Savings: <span className="text-brand-500 font-black">₹{record.savings.toLocaleString()}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right hidden sm:block">
                                 <p className="text-xs font-black text-text-primary tracking-tighter">₹{record.total_expense.toLocaleString()}</p>
                                 <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Utilized</p>
                              </div>
                              <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-brand-500/40 transition-all cursor-pointer">
                                 <ChevronRight className={`w-4 h-4 text-text-tertiary group-hover:text-brand-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && record.entries && record.entries.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-black/20"
                              >
                                <ul className="px-6 pb-6 pt-2 space-y-3">
                                  {record.entries.map((entry, idx) => {
                                    const entryExpense = Object.values(entry.expenses).reduce((a, b) => a + b, 0);
                                    return (
                                      <li key={idx} className="flex items-center justify-between pl-16 pr-6 py-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-brand-500/20 transition-all group/entry shadow-lg">
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-text-primary tracking-tight">Entry {(idx + 1).toString().padStart(2, '0')}.</span>
                                            <div className="h-1 w-1 rounded-full bg-brand-500/40" />
                                          </div>
                                          <span className="text-[8px] text-text-tertiary font-black uppercase tracking-widest mt-0.5">Authorized {new Date(entry.added_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-sm font-black text-text-primary tracking-tighter block group-hover:text-brand-400 transition-colors">₹{entryExpense.toLocaleString()}</span>
                                          <div className="text-[8px] text-text-tertiary font-black uppercase tracking-widest text-right">Debit Snapshot</div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      )})}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
