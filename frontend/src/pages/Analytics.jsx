import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { AlertCircle, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import ScenarioAnalyzer from '../components/ScenarioAnalyzer';

export default function Analytics() {
  const [data, setData] = useState({
    expenses: [],
    forecast: null,
    recommendations: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch historical expenses
        const rawExpenses = await expenseService.getExpenses();
        const history = rawExpenses.reverse(); // chronological order for charts
        
        if (history.length > 0) {
          const latest = history[history.length - 1];
          const payload = { income: latest.income, expenses: latest.expenses };

          // Fetch ML forecast and recommendations concurrently for speed
          const [forecastData, recData] = await Promise.all([
            mlService.getForecast(payload),
            mlService.getRecommendations(payload)
          ]);

          setData({
            expenses: history,
            forecast: forecastData,
            recommendations: recData
          });
        } else {
          setData(prev => ({ ...prev, expenses: [] }));
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      gsap.fromTo(
        gsap.utils.toArray('.analytics-card'),
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  if (isLoading) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse tracking-wide font-medium">Processing complex ML analytics...</div>;
  }

  if (data.expenses.length === 0) {
    return (
      <Card className="analytics-card mt-6 border-zinc-800">
        <CardContent className="py-16 text-center">
          <h3 className="text-xl font-bold text-zinc-200">Need More Data</h3>
          <p className="mt-2 text-sm text-zinc-500">Please add at least one monthly expense record to unlock predictive analytics.</p>
        </CardContent>
      </Card>
    );
  }

  // Format data for Recharts
  const trendData = data.expenses.map(e => ({
    name: e.month,
    Expense: e.total_expense,
    Savings: e.savings,
    Income: e.income
  }));

  const latestExpenseRecord = data.expenses[data.expenses.length - 1];
  const latestExpenseObj = latestExpenseRecord.expenses;
  const categoryData = Object.keys(latestExpenseObj).map(key => ({
    name: key,
    amount: latestExpenseObj[key]
  })).sort((a,b) => b.amount - a.amount);

  return (
    <div className="space-y-8" ref={containerRef}>
      <header>
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">AI Analytics & Insights</h1>
        <p className="text-sm text-zinc-400 mt-1">Advanced machine learning forecasting and spending optimization.</p>
      </header>

      {/* Alerts / Recommendations */}
      {data.recommendations && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="analytics-card border-none bg-zinc-900/40 border-l-[4px] border-l-amber-500/50 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <AlertCircle size={80} className="text-amber-500" />
            </div>
            <CardHeader className="pb-3 pt-5 bg-transparent border-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                </div>
                <CardTitle className="text-zinc-100">Overspending Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.recommendations.alerts.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 font-medium">
                  {data.recommendations.alerts.map((alert, idx) => (
                    <li key={idx} className="marker:text-amber-500/60">{alert}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 italic">No budget anomalies detected this month.</p>
              )}
            </CardContent>
          </Card>

          <Card className="analytics-card border-none bg-zinc-900/40 border-l-[4px] border-l-brand-500/50 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Lightbulb size={80} className="text-brand-500" />
            </div>
            <CardHeader className="pb-3 pt-5 bg-transparent border-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 rounded-lg border border-brand-500/20">
                  <Lightbulb className="h-5 w-5 text-brand-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </div>
                <CardTitle className="text-zinc-100">Smart Recommendations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 font-medium font-inter">
                {data.recommendations.recommendations.map((rec, idx) => (
                  <li key={idx} className="marker:text-brand-500/60">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Spending Trend Chart */}
        <Card className="analytics-card flex flex-col bg-zinc-900/30 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-400 uppercase tracking-widest">Financial Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="name" 
                  stroke="#52525b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                  fontFamily="Inter"
                />
                <YAxis 
                  stroke="#52525b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                  fontFamily="Inter"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '13px', fontWeight: '600' }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '600' }} />
                <Area 
                  type="monotone" 
                  dataKey="Income" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="Expense" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card className="analytics-card flex flex-col bg-zinc-900/30 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="text-base font-bold text-zinc-400 uppercase tracking-widest">Allocation Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                <XAxis type="number" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#a1a1aa" 
                  fontSize={12} 
                  fontFamily="Inter"
                  fontWeight="600"
                  tickLine={false} 
                  axisLine={false} 
                  width={90} 
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.03)'}}
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46' }}
                  itemStyle={{ color: '#10b981', fontWeight: '700' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#10b981" 
                  radius={[0, 10, 10, 0]} 
                  barSize={20} 
                  animationDuration={1500}
                  className="drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Forecast */}
        {data.forecast && (
          <Card className="analytics-card lg:col-span-2 relative overflow-hidden border-none bg-gradient-to-br from-brand-900/80 via-zinc-900 to-zinc-950 text-white shadow-2xl group border border-brand-500/10">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] group-hover:bg-brand-500/20 transition-all duration-700" />
            
            <CardContent className="p-10 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-400/20 rounded-xl border border-brand-400/30">
                      <TrendingUp className="h-7 w-7 text-brand-400" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Machine Learning Forecast</h3>
                  </div>
                  <p className="text-zinc-300 text-lg leading-relaxed max-w-2xl font-medium">
                    Our predictive model projects your expenses will likely <span className={`font-bold ${data.forecast.trend_direction === 'increase' ? 'text-rose-400' : 'text-emerald-400'}`}>{data.forecast.trend_direction}</span> to approximately <strong>${data.forecast.predicted_next_month_expense.toLocaleString()}</strong> next month.
                  </p>
                  <div className="flex gap-4 pt-2">
                     <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-xs font-bold text-zinc-400 uppercase tracking-widest">Confidence: High</div>
                     <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-xs font-bold text-zinc-400 uppercase tracking-widest">Model: Linear Ensemble</div>
                  </div>
                </div>

                <div className="shrink-0 bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 text-center min-w-[240px] shadow-2xl ring-1 ring-white/10">
                  <p className="text-brand-300 text-xs font-black uppercase tracking-[0.2em] mb-3">Projected Total</p>
                  <p className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">${data.forecast.predicted_next_month_expense.toLocaleString()}</p>
                  <div className={`mt-4 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${data.forecast.trend_direction === 'increase' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                    {data.forecast.trend_direction === 'increase' ? <TrendingUp className="mr-2 h-3 w-3"/> : <TrendingDown className="mr-2 h-3 w-3"/>}
                    {data.forecast.trend_direction} Trend
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* NEW: Scenario Analyzer */}
      <div className="pt-4 analytics-card">
        <ScenarioAnalyzer 
          currentIncome={latestExpenseRecord.income} 
          currentExpenses={latestExpenseObj} 
        />
      </div>

    </div>
  );
}
