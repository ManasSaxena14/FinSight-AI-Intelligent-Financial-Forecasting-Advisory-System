import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Activity, CreditCard, PiggyBank, TrendingUp, TrendingDown,
  Brain, HeartPulse, Coins, BarChart3, PieChart as PieIcon,
  LineChart as LineIcon, Sparkles, AlertTriangle, UserCheck
} from 'lucide-react';
import { Card, CardContent } from '../components/Card';
import SummaryCard from '../components/SummaryCard';
import ChartCard from '../components/ChartCard';
import InsightsPanel from '../components/InsightsPanel';
import ScenarioAnalyzer from '../components/ScenarioAnalyzer';
import { expenseService } from '../api/expenseService';
import { mlService } from '../api/mlService';
import { getScoreColors } from '../utils/scoreColors';

// ── Chart color palette ──────────────────────────────────────────────────────
const GOLD_PALETTE = [
  '#d4af37', '#b69119', '#e5c35c', '#8a7324',
  '#f0d977', '#c9a52c', '#a68b2e', '#dbc462',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#111111',
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
  padding: '14px 18px',
};
const TOOLTIP_ITEM_STYLE = {
  fontSize: '11px',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const TOOLTIP_LABEL_STYLE = {
  color: '#ffffff',
  marginBottom: '8px',
  fontSize: '10px',
  fontWeight: '1000',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
};

// ── Custom Pie label for category percentages ────────────────────────────────
const renderPieLabel = ({ name, percent, x, y, midAngle }) => {
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor={midAngle > 180 ? 'end' : 'start'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={1000}
      style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Custom Tooltip Component ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={TOOLTIP_LABEL_STYLE}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ ...TOOLTIP_ITEM_STYLE, color: entry.color || '#d4af37' }}>
          {entry.name}: {prefix}{Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};


export default function Analytics() {
  const [data, setData] = useState({
    expenses: [],
    forecast: null,
    recommendations: null,
    healthScore: null,
    prediction: null,
    classification: null,
    savingsRisk: null,
    spendingPattern: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // ── Data fetching (step 1: load expense history quickly) ─────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const rawExpenses = await expenseService.getExpenses();
        const history = [...rawExpenses].reverse(); // chronological

        if (history.length > 0) {
          setData((prev) => ({ ...prev, expenses: history }));
        } else {
          setData((prev) => ({ ...prev, expenses: [] }));
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
        setError('Unable to fetch analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    const handleUpdated = () => {
      setIsLoading(true);
      fetchHistory();
    };

    window.addEventListener('expenses:updated', handleUpdated);
    return () => window.removeEventListener('expenses:updated', handleUpdated);
  }, []);

  // ── Data fetching (step 2: run heavier AI/ML in background) ──────────────
  useEffect(() => {
    const runMl = async () => {
      if (!data.expenses || data.expenses.length === 0) return;
      setIsMlLoading(true);
      try {
        const history = data.expenses;
        const latest = history[history.length - 1];
        const previous = history.length > 1 ? history[history.length - 2] : null;
        const payload = {
          income: latest.income,
          expenses: latest.expenses,
          ...(previous ? { previous_expenses: previous.expenses } : {}),
        };

        const results = await Promise.allSettled([
          mlService.getForecast(payload),
          mlService.getRecommendations(payload),
          mlService.getHealthScore(payload),
          mlService.getClassification(payload),
          mlService.getSavingsRisk(payload),
          mlService.getSpendingPattern(payload),
        ]);

        setData((prev) => ({
          ...prev,
          forecast: results[0].status === 'fulfilled' ? results[0].value : prev.forecast,
          recommendations: results[1].status === 'fulfilled' ? results[1].value : prev.recommendations,
          healthScore: results[2].status === 'fulfilled' ? results[2].value : prev.healthScore,
          prediction: results[0].status === 'fulfilled' ? results[0].value : prev.prediction,
          classification: results[3].status === 'fulfilled' ? results[3].value : prev.classification,
          savingsRisk: results[4].status === 'fulfilled' ? results[4].value : prev.savingsRisk,
          spendingPattern: results[5].status === 'fulfilled' ? results[5].value : prev.spendingPattern,
        }));
      } catch (err) {
        console.error('Failed to load ML analytics', err);
      } finally {
        setIsMlLoading(false);
      }
    };

    runMl();
  }, [data.expenses]);

  // ── GSAP entrance for summary cards ──────────────────────────────────────
  useEffect(() => {
    if (!isLoading && containerRef.current) {
      const ctx = gsap.context(() => {
        // Header animation
        gsap.fromTo(
          ".animate-header",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
        );

        // Summary cards animation
        gsap.fromTo(
          '.summary-card',
          { y: 40, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.05, ease: 'back.out(1.2)', delay: 0.2 }
        );

        // Health score indicators pulse
        gsap.to(".health-indicator", {
          boxShadow: "0 0 15px rgba(212, 175, 55, 0.3)",
          repeat: -1,
          yoyo: true,
          duration: 1.5,
          ease: "sine.inOut"
        });
      }, containerRef);
      
      return () => ctx.revert();
    }
  }, [isLoading]);


  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <Card className="mt-6 border-white/5 bg-black/20 rounded-[2.5rem] shadow-2xl">
        <CardContent className="py-24 text-center">
          <div className="p-5 bg-rose-500/10 rounded-3xl border border-rose-500/20 w-fit mx-auto mb-6">
            <Activity className="h-8 w-8 text-rose-400" />
          </div>
          <h3 className="text-xl font-black text-text-primary tracking-tighter">
            System Error
          </h3>
          <p className="mt-3 text-sm text-text-tertiary max-w-md mx-auto">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!isLoading && data.expenses.length === 0) {
    return (
      <Card className="mt-6 border-white/5 bg-black/20 rounded-[2.5rem] shadow-2xl">
        <CardContent className="py-24 text-center">
          <div className="p-5 bg-brand-500/10 rounded-3xl border border-brand-500/20 w-fit mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
          </div>
          <h3 className="text-xl font-black text-text-primary tracking-tighter italic uppercase">
            No data yet
          </h3>
          <p className="mt-4 text-[10px] text-text-tertiary uppercase tracking-[0.2em] max-w-xs mx-auto">
            Add your income and expenses to see charts, forecasts, and insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Data processing ──────────────────────────────────────────────────────
  const latestRecord = data.expenses[data.expenses.length - 1];
  const latestExpenses = latestRecord?.expenses || {};
  const totalIncome = latestRecord?.income || 0;
  const totalExpense = latestRecord?.total_expense || 0;
  const remainingBalance = totalIncome - totalExpense;

  // Monthly trend data
  const trendData = data.expenses.map((e) => ({
    name: e.month,
    Income: e.income,
    Expense: e.total_expense,
    Savings: e.savings,
  }));

  // Category-wise data (for pie + bar)
  const categoryData = Object.entries(latestExpenses)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Forecast chart data (combine history + prediction)
  const forecastChartData = data.expenses.map((e) => ({
    name: e.month,
    Actual: e.total_expense,
  }));

  if (data.forecast && data.forecast.forecast) {
    data.forecast.forecast.forEach((f) => {
      forecastChartData.push({
        name: f.month_name || `Month ${f.month}`,
        Actual: null,
        Predicted: f.predicted_expense,
      });
    });
  } else if (data.forecast) {
    forecastChartData.push({
      name: 'Next Month',
      Actual: null,
      Predicted: data.forecast.predicted_next_month_expense,
    });
  }

  return (
    <div className="space-y-10 relative min-h-screen" ref={containerRef}>
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-header">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">
            Analytics
          </h1>
          <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide">
            Charts and forecasts based on your own spending and income.
          </p>
        </div>

        {data.healthScore && (
          <div className="flex gap-4">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 flex flex-col items-center justify-center min-w-[140px] health-indicator group hover:border-brand-500/30 transition-all duration-500">
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1 group-hover:text-brand-400 transition-colors">
                Health status
              </p>
              <p
                className={`text-2xl font-black italic transition-colors ${
                  data.healthScore.score >= 70 ? 'text-brand-400' : 'text-text-primary'
                }`}
              >
                {data.healthScore.score}
                <span className="text-xs not-italic ml-1 opacity-40">/100</span>
              </p>
            </div>
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 flex flex-col items-center justify-center min-w-[140px] health-indicator group hover:border-brand-500/30 transition-all duration-500">
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1 group-hover:text-brand-400 transition-colors">
                Savings Rate
              </p>
              <p className="text-2xl font-black text-brand-400 italic">
                {data.healthScore.savings_rate_pct}%
              </p>
            </div>
          </div>
        )}
      </header>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="space-y-8 relative z-10">
        <div>
          <h3 className="text-lg font-black text-text-secondary tracking-widest uppercase mb-4 pl-1">
            Current Fiscal State
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="summary-card">
              <SummaryCard
                label="Total Income"
                value={`₹${totalIncome.toLocaleString()}`}
                subValue="Current Cycle"
                icon={Coins}
                accent="gold"
                isLoading={isLoading}
              />
            </div>
            <div className="summary-card">
              <SummaryCard
                label="Total Expense"
                value={`₹${totalExpense.toLocaleString()}`}
                subValue={`${categoryData.length} Categories`}
                icon={CreditCard}
                accent="neutral"
                isLoading={isLoading}
              />
            </div>
            <div className="summary-card">
              <SummaryCard
                label="Savings Balance"
                value={`₹${remainingBalance.toLocaleString()}`}
                subValue={remainingBalance >= 0 ? 'Surplus' : 'Deficit'}
                icon={PiggyBank}
                accent={remainingBalance >= 0 ? 'positive' : 'danger'}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-brand-500 tracking-widest uppercase mb-4 pl-1">
            Forecasts & insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div className="summary-card">
              <SummaryCard
                label="Predicted Next"
                value={
                  data.forecast
                    ? `₹${data.forecast.predicted_next_month_expense.toLocaleString()}`
                    : '—'
                }
                subValue={data.forecast ? `Trend: ${data.forecast.trend_direction}` : 'Awaiting Data'}
                icon={Brain}
                customColors={getScoreColors(data.healthScore?.score)}
                badge="AI LIVE"
                isLoading={isLoading}
              />
            </div>
            <div className="summary-card">
              <SummaryCard
                label="Savings Risk"
                value={data.savingsRisk ? data.savingsRisk.class_label : '—'}
                subValue={data.savingsRisk ? `Risk: ${data.savingsRisk.risk_score}/100` : 'Awaiting Data'}
                icon={AlertTriangle}
                accent={data.savingsRisk ? (data.savingsRisk.risk_level === 'low' ? 'positive' : data.savingsRisk.risk_level === 'medium' ? 'gold' : 'danger') : 'neutral'}
                badge="GBM RISK"
                isLoading={isLoading}
              />
            </div>
            <div className="summary-card">
              <SummaryCard
                label="Pattern Archetype"
                value={data.spendingPattern ? data.spendingPattern.archetype : '—'}
                subValue={data.spendingPattern ? data.spendingPattern.dominant_category : 'Awaiting Data'}
                icon={UserCheck}
                accent="gold"
                badge="ML PATTERN"
                isLoading={isLoading}
              />
            </div>
            <div className="summary-card">
              <SummaryCard
                label="Health Score"
                value={data.healthScore ? `${data.healthScore.score}/100` : '—'}
                subValue={data.healthScore ? data.healthScore.status : 'Awaiting Data'}
                icon={HeartPulse}
                customColors={getScoreColors(data.healthScore?.score)}
                badge="AI LIVE"
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Insights Panel (Alerts + Recommendations) ───────────────────── */}
      <div className="relative z-10">
        <InsightsPanel
          recommendations={data.recommendations}
          isLoading={isLoading || isMlLoading}
        />
      </div>

      {/* ── Charts Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">

        {/* Pie Chart — Category-wise spending */}
        <ChartCard
          title="Spending Distribution"
          subtitle="Category-wise allocation breakdown"
          icon={PieIcon}
          isLoading={isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 30, right: 30, left: 30, bottom: 30 }}>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius="50%"
                outerRadius="75%"
                paddingAngle={3}
                dataKey="amount"
                nameKey="name"
                label={renderPieLabel}
                labelLine={false}
                animationBegin={200}
                animationDuration={1500}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={2}
              >
                {categoryData.map((_, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={GOLD_PALETTE[idx % GOLD_PALETTE.length]}
                    className="transition-opacity duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '11px',
                  fontWeight: '1000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#ffffff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Line Chart — Monthly expense trend */}
        <ChartCard
          title="Income & spending over time"
          subtitle="Compare income, spending, and savings by month"
          icon={LineIcon}
          isLoading={isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 20, right: 20, left: 20, bottom: 15 }}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4af37" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#404040" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#404040" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333333" />
              <XAxis
                dataKey="name"
                stroke="#ffffff"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={15}
                fontWeight="1000"
              />
              <YAxis
                stroke="#ffffff"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v}`}
                fontWeight="1000"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="rect"
                wrapperStyle={{
                  paddingBottom: '30px',
                  fontSize: '11px',
                  fontWeight: '1000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#ffffff'
                }}
              />
              <Area
                type="monotone"
                dataKey="Income"
                stroke="#d4af37"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradIncome)"
                animationDuration={2000}
                dot={false}
                activeDot={{ r: 5, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="Expense"
                stroke="#606060"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradExpense)"
                animationDuration={2000}
                dot={false}
                activeDot={{ r: 5, fill: '#606060', stroke: '#0a0a0a', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="Savings"
                stroke="#34d399"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#gradSavings)"
                animationDuration={2000}
                dot={false}
                activeDot={{ r: 4, fill: '#34d399', stroke: '#0a0a0a', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar Chart — Category comparison */}
        <ChartCard
          title="Functional Allocation"
          subtitle="Ranked spending by category"
          icon={BarChart3}
          isLoading={isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333333" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#ffffff"
                fontSize={12}
                fontWeight="1000"
                tickLine={false}
                axisLine={false}
                width={120}
                textAnchor="end"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar
                dataKey="amount"
                fill="#d4af37"
                radius={[0, 12, 12, 0]}
                barSize={18}
                animationDuration={2000}
              >
                {categoryData.map((_, idx) => (
                  <Cell
                    key={`bar-${idx}`}
                    fill={GOLD_PALETTE[idx % GOLD_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Forecast Chart — Historical + Prediction */}
        <ChartCard
          title="Forecast Trajectory"
          subtitle="Actual expense history vs. predicted next month"
          icon={TrendingUp}
          isLoading={isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastChartData} margin={{ top: 20, right: 20, left: 20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333333" />
              <XAxis
                dataKey="name"
                stroke="#ffffff"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={15}
                fontWeight="1000"
              />
              <YAxis
                stroke="#ffffff"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v}`}
                fontWeight="1000"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="rect"
                wrapperStyle={{
                  paddingBottom: '30px',
                  fontSize: '11px',
                  fontWeight: '1000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#ffffff'
                }}
              />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="#d4af37"
                strokeWidth={2}
                dot={{ r: 4, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#d4af37', stroke: '#0a0a0a', strokeWidth: 3 }}
                animationDuration={2000}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Predicted"
                stroke="#e5c35c"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ r: 6, fill: '#e5c35c', stroke: '#0a0a0a', strokeWidth: 3 }}
                animationDuration={2000}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── AI Forecast Hero Section ────────────────────────────────────── */}
      {data.forecast && (
        <div className="relative z-10">
          <Card className="lg:col-span-2 relative overflow-hidden border-none bg-gradient-to-br from-bg-panel via-black to-bg-panel text-white shadow-2xl group rounded-[3rem] border border-white/5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/10 rounded-full blur-[120px] group-hover:bg-brand-500/15 transition-all duration-1000 pointer-events-none" />

            <CardContent className="p-12 sm:p-16 relative z-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-16">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-brand-500/10 rounded-3xl border border-brand-500/20 shadow-2xl shadow-brand-500/10">
                      <TrendingUp className="h-8 w-8 text-brand-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.4em]">
                        Spending outlook
                      </p>
                      <h3 className="text-3xl font-black tracking-tighter">
                        Next month at a glance
                      </h3>
                    </div>
                  </div>
                  <p className="text-text-secondary text-xl font-medium leading-relaxed max-w-2xl tracking-tight">
                    Based on your history, total spending may{' '}
                    <span
                      className={`font-black tracking-tighter ${
                        data.forecast.trend_direction === 'increase'
                          ? 'text-brand-400'
                          : 'text-text-primary'
                      }`}
                    >
                      {data.forecast.trend_direction}
                    </span>{' '}
                    to about{' '}
                    <strong className="text-text-primary underline decoration-brand-500/30 decoration-4 underline-offset-8">
                      ₹{data.forecast.predicted_next_month_expense.toLocaleString()}
                    </strong>{' '}
                    next month. This is an estimate—not financial advice.
                  </p>
                  <div className="flex gap-4 pt-4 flex-wrap">
                    <div className="px-5 py-2.5 bg-white/[0.03] rounded-full border border-white/5 text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(212,175,55,1)]" />
                      Estimate only
                    </div>
                    <div className="px-5 py-2.5 bg-white/[0.03] rounded-full border border-white/5 text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                      Based on your past months
                    </div>
                  </div>
                </div>

                <div className="shrink-0 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-12 border border-white/10 text-center min-w-[260px] shadow-2xl ring-1 ring-white/10 relative overflow-hidden group/box transition-transform hover:scale-105 duration-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover/box:opacity-100 transition-opacity" />
                  <p className="text-brand-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10">
                    Projected Liability
                  </p>
                  <p className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-2xl mb-4 relative z-10 italic">
                    ₹{data.forecast.predicted_next_month_expense.toLocaleString()}
                  </p>
                  <div
                    className={`mt-2 inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] relative z-10 transition-all ${
                      data.forecast.trend_direction === 'increase'
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    {data.forecast.trend_direction === 'increase' ? (
                      <TrendingUp className="mr-2 h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="mr-2 h-3.5 w-3.5" />
                    )}
                    {data.forecast.trend_direction} Trend
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Scenario Analyzer ───────────────────────────────────────────── */}
      {latestRecord && (
        <div className="relative z-10">
          <ScenarioAnalyzer
            currentIncome={latestRecord.income}
            currentExpenses={latestExpenses}
          />
        </div>
      )}

      {/* ── Loading overlay ─────────────────────────────────────────────── */}
      {isLoading && (
        <div className="p-16 text-center text-text-tertiary animate-pulse tracking-[0.3em] font-black uppercase italic text-xs">
          Loading analytics…
        </div>
      )}
    </div>
  );
}
