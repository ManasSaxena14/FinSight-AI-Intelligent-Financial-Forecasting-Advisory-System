import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Activity, CreditCard, PiggyBank, Target, Sparkles, TrendingUp } from 'lucide-react';
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
    <div className="space-y-8" ref={containerRef}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
        <p className="text-sm text-zinc-400 mt-1">Here's your financial overview for the latest recorded month.</p>
      </div>

      {expenses.length === 0 ? (
        <Card className="dash-card">
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-medium text-zinc-200">No data available</h3>
            <p className="mt-2 text-sm text-zinc-500">Start by adding your first expense report to unlock AI insights.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* AI Narrative Summary Card */}
          {aiSummary && (
            <Card className="dash-card border-none bg-gradient-to-r from-zinc-900/80 via-zinc-950 to-zinc-900/80 shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute inset-0 bg-brand-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="shrink-0 p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Sparkles className="h-7 w-7 text-brand-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">AI Intelligence Report</p>
                    <p className="text-zinc-200 text-lg md:text-xl font-medium leading-relaxed italic">
                      "{aiSummary}"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="dash-card">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] p-3 rounded-xl">
                    <Activity className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-zinc-400">Monthly Income</dt>
                      <dd className="text-2xl font-bold text-zinc-100 tracking-tight">${stats.totalIncome.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dash-card">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] p-3 rounded-xl">
                    <CreditCard className="h-6 w-6 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-zinc-400">Total Expenses</dt>
                      <dd className="text-2xl font-bold text-zinc-100 tracking-tight">${stats.totalExpense.toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dash-card">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] p-3 rounded-xl">
                    <PiggyBank className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-zinc-400">Monthly Savings</dt>
                      <dd className="text-2xl font-bold text-zinc-100 tracking-tight">${(stats.totalIncome - stats.totalExpense).toLocaleString()}</dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dash-card">
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-brand-500/10 border border-brand-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] p-3 rounded-xl">
                    <Target className="h-6 w-6 text-brand-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-zinc-400">Health Score (ML)</dt>
                      <dd className="text-2xl font-bold text-zinc-100 tracking-tight flex items-baseline">
                        {healthScore ? healthScore.score : '--'}
                        <span className="text-xs font-medium text-zinc-500 ml-1">/ 100</span>
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Financial Status Summary */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="dash-card">
                <CardHeader>
                  <CardTitle>Health Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {healthScore ? (
                    <div className="space-y-5">
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        Your financial health is considered <strong className="text-zinc-50">{healthScore.status}</strong> based on our ML analysis.
                      </p>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-400">Savings Rate</span>
                          <span className="text-zinc-200 font-bold">{healthScore.savings_rate_pct}%</span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden shadow-inner border border-zinc-700/50">
                          <div 
                            className={`h-2 rounded-full shadow-[0_0_10px_currentColor] ${healthScore.score >= 80 ? 'bg-emerald-500 text-emerald-500' : healthScore.score >= 60 ? 'bg-blue-500 text-blue-500' : healthScore.score >= 40 ? 'bg-amber-500 text-amber-500' : 'bg-rose-500 text-rose-500'}`} 
                            style={{ width: `${Math.max(0, Math.min(100, healthScore.savings_rate_pct * 2))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm animate-pulse">Analyzing health score...</p>
                  )}
                </CardContent>
              </Card>

              {/* Goal Tracker Component */}
              <GoalTracker />
            </div>

            {/* Recent Expenses List */}
            <Card className="dash-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-zinc-800/60">
                  {expenses.slice(0, 4).map((record) => (
                    <li key={record.id} className="p-5 hover:bg-zinc-800/30 transition-colors duration-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{record.month} Report</p>
                          <p className="text-xs text-zinc-400 mt-1">Savings: <span className="text-emerald-400">${record.savings.toLocaleString()}</span></p>
                        </div>
                        <div className="text-sm font-bold text-zinc-200 border border-zinc-700/80 px-4 py-1.5 rounded-lg bg-zinc-800/50 shadow-sm backdrop-blur-sm">
                          ${record.total_expense.toLocaleString()} Spent
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
