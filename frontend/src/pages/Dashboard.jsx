import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Activity, CreditCard, PiggyBank, Target, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoalTracker from '../components/GoalTracker';

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [stats, setStats] = useState({ totalExpense: 0, totalIncome: 0 });
  const [aiSummary, setAiSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
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
      // GSAP Stagger animation for cards
      gsap.fromTo(
        gsap.utils.toArray('.dash-card'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500 tracking-wide animate-pulse">Initializing financial overview...</div>;
  }

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

      {expenses.length === 0 ? (
        <Card className="dash-card glass-card">
          <CardContent className="py-24 text-center">
            <h3 className="text-2xl font-bold text-text-secondary tracking-tight">System Initialization Pending</h3>
            <p className="mt-3 text-sm text-text-tertiary max-w-md mx-auto">Upload your first dataset to activate the AI forecasting engine and unlock health forensics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
              { label: 'Gross Revenue', value: stats.totalIncome, icon: Activity, color: 'brand' },
              { label: 'Total Outgoings', value: stats.totalExpense, icon: CreditCard, color: 'neutral' },
              { label: 'Net Surplus', value: stats.totalIncome - stats.totalExpense, icon: PiggyBank, color: 'brand' },
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

            <Card className="dash-card glass-card border-none group bg-gradient-to-br from-brand-500/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 transition-all duration-500 group-hover:scale-110 shadow-lg shadow-brand-500/10">
                    <Target className="h-5 w-5 text-brand-400" />
                  </div>
                   <div className="text-[10px] font-black text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20">AI LIVE</div>
                </div>
                <dl>
                  <dt className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">Health Forensics</dt>
                  <dd className="text-3xl font-black text-text-primary tracking-tighter mt-1 flex items-baseline">
                    {healthScore ? healthScore.score : '--'}
                    <span className="text-xs font-bold text-text-tertiary ml-1">/ 100</span>
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
                          <span className="text-brand-400">{healthScore.savings_rate_pct}%</span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/5 relative">
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
                           <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(212,175,55,0.3)] bg-gradient-to-r from-brand-600 to-brand-400" 
                            style={{ width: `${Math.max(0, Math.min(100, healthScore.savings_rate_pct * 2))}%` }}
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
                <CardTitle className="text-lg font-black tracking-tight text-text-primary">Fiscal Archive</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-b-[2.5rem]">
                  <ul className="divide-y divide-white/5">
                    {expenses.slice(0, 5).map((record) => (
                      <li key={record.id} className="p-6 hover:bg-white/[0.02] transition-all duration-500 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-bg-panel border border-white/5 flex items-center justify-center text-text-tertiary group-hover:text-brand-400 group-hover:border-brand-500/20 transition-all duration-500">
                               <Activity className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-text-primary tracking-tight">{record.month} Snapshot</p>
                              <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1">
                                Net Surplus: <span className="text-brand-500 font-black">₹{record.savings.toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                               <p className="text-xs font-black text-text-primary tracking-tighter">₹{record.total_expense.toLocaleString()}</p>
                               <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Utilized</p>
                            </div>
                            <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-brand-500/40 transition-all cursor-pointer">
                               <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand-400" />
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
