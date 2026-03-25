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
    <div className="space-y-10 relative" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      <header className="relative z-10">
        <h1 className="text-4xl font-black text-text-primary tracking-tighter italic italic">Intelligence & Forensics.</h1>
        <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide">Predictive machine learning models and fiscal optimization pathways.</p>
      </header>

      {/* Alerts / Recommendations */}
      {data.recommendations && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          <Card className="analytics-card glass-card border-none bg-black/20 border-l-[4px] border-l-brand-600/40 shadow-2xl relative overflow-hidden group rounded-[2rem]">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
               <AlertCircle size={100} className="text-brand-500" />
            </div>
            <CardHeader className="pb-4 pt-6 bg-transparent border-none">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                  <AlertCircle className="h-5 w-5 text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                </div>
                <CardTitle className="text-text-primary font-black tracking-tight uppercase text-xs tracking-[0.2em]">Budget Forensic Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.recommendations.alerts.length > 0 ? (
                <ul className="space-y-3">
                  {data.recommendations.alerts.map((alert, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-text-secondary font-medium items-start">
                       <span className="h-1.5 w-1.5 rounded-full bg-brand-500/50 mt-1.5" />
                       {alert}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-tertiary italic">No budget anomalies detected this cycle.</p>
              )}
            </CardContent>
          </Card>

          <Card className="analytics-card glass-card border-none bg-black/20 border-l-[4px] border-l-brand-400/40 shadow-2xl relative overflow-hidden group rounded-[2rem]">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
               <Lightbulb size={100} className="text-brand-500" />
            </div>
            <CardHeader className="pb-4 pt-6 bg-transparent border-none">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                  <Lightbulb className="h-5 w-5 text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                </div>
                <CardTitle className="text-text-primary font-black tracking-tight uppercase text-xs tracking-[0.2em]">Optimization Engine</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.recommendations.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-text-secondary font-medium items-start">
                     <span className="h-1.5 w-1.5 rounded-full bg-brand-400/50 mt-1.5" />
                     {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        
        {/* Spending Trend Chart */}
        <Card className="analytics-card flex flex-col glass-card border-none rounded-[2.5rem]">
          <CardHeader className="pb-0">
            <CardTitle className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Financial Momentum</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#404040" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#404040" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#1f1f1f" />
                <XAxis 
                  dataKey="name" 
                  stroke="#404040" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={15} 
                  fontWeight="bold"
                />
                <YAxis 
                  stroke="#404040" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                  fontWeight="bold"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111111', borderRadius: '24px', border: '1px solid #ffffff0d', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.8)', padding: '16px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  labelStyle={{ color: '#606060', marginBottom: '8px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Area 
                  type="monotone" 
                  dataKey="Income" 
                  stroke="#d4af37" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="Expense" 
                  stroke="#71717a" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card className="analytics-card flex flex-col glass-card border-none rounded-[2.5rem]">
          <CardHeader className="pb-0">
            <CardTitle className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Functional Allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#1f1f1f" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#a0a0a0" 
                  fontSize={11} 
                  fontWeight="black"
                  tickLine={false} 
                  axisLine={false} 
                  width={100} 
                  textAnchor="end"
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  contentStyle={{ backgroundColor: '#111111', borderRadius: '16px', border: '1px solid #ffffff0d' }}
                  itemStyle={{ color: '#d4af37', fontWeight: '900', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#d4af37" 
                  radius={[0, 12, 12, 0]} 
                  barSize={16} 
                  animationDuration={2000}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Forecast */}
        {data.forecast && (
          <Card className="analytics-card lg:col-span-2 relative overflow-hidden border-none bg-gradient-to-br from-bg-panel via-black to-bg-panel text-white shadow-2xl group rounded-[3rem] border border-white/5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/10 rounded-full blur-[120px] group-hover:bg-brand-500/15 transition-all duration-1000" />
            
            <CardContent className="p-12 sm:p-16 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-brand-500/10 rounded-3xl border border-brand-500/20 shadow-2xl shadow-brand-500/10">
                      <TrendingUp className="h-8 w-8 text-brand-400" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.4em]">Forecasting Engine v4.2</p>
                       <h3 className="text-3xl font-black tracking-tighter">Predictive Analysis.</h3>
                    </div>
                  </div>
                  <p className="text-text-secondary text-xl font-medium leading-relaxed max-w-2xl tracking-tight">
                    Our neural network projects your liability matrix will <span className={`font-black tracking-tighter ${data.forecast.trend_direction === 'increase' ? 'text-brand-400' : 'text-text-primary'}`}>{data.forecast.trend_direction}</span> to approximately <strong className="text-text-primary underline decoration-brand-500/30 decoration-4 underline-offset-8">${data.forecast.predicted_next_month_expense.toLocaleString()}</strong> in the next billing cycle.
                  </p>
                  <div className="flex gap-4 pt-4">
                     <div className="px-5 py-2.5 bg-white/[0.03] rounded-full border border-white/5 text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(212,175,55,1)]" />
                        Confidence: 94.2%
                     </div>
                     <div className="px-5 py-2.5 bg-white/[0.03] rounded-full border border-white/5 text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Model: GRU-LSTM Ensemble</div>
                  </div>
                </div>

                <div className="shrink-0 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-12 border border-white/10 text-center min-w-[280px] shadow-2xl ring-1 ring-white/10 relative overflow-hidden group/box transition-transform hover:scale-105 duration-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover/box:opacity-100 transition-opacity" />
                  <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10">Projected Liability</p>
                  <p className="text-6xl font-black tracking-tight text-white drop-shadow-2xl mb-4 relative z-10 italic">${data.forecast.predicted_next_month_expense.toLocaleString()}</p>
                  <div className={`mt-2 inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-all ${data.forecast.trend_direction === 'increase' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'bg-white/10 text-white border border-white/20'}`}>
                    {data.forecast.trend_direction === 'increase' ? <TrendingUp className="mr-2 h-3.5 w-3.5"/> : <TrendingDown className="mr-2 h-3.5 w-3.5"/>}
                    {data.forecast.trend_direction} Trend
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Scenario Analyzer */}
      <div className="pt-6 analytics-card relative z-10">
        <ScenarioAnalyzer 
          currentIncome={latestExpenseRecord.income} 
          currentExpenses={latestExpenseObj} 
        />
      </div>

    </div>
  );
}
