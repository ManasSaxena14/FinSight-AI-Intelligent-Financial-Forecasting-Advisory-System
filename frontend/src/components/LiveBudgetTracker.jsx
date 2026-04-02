import { useState, useEffect, useRef } from 'react';
import { premiumService } from '../api/premiumService';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

const TREND_CONFIG = {
  up:     { icon: TrendingUp,   color: 'text-emerald-400', label: 'Improving',  bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30' },
  down:   { icon: TrendingDown, color: 'text-red-400',     label: 'Declining',  bg: 'bg-red-500/10',      border: 'border-red-500/30'     },
  stable: { icon: Minus,        color: 'text-brand-400',   label: 'Stable',     bg: 'bg-brand-500/10',    border: 'border-brand-500/30'   },
};

const STATUS_COLOR = {
  'Excellent':          'text-emerald-400',
  'Good':               'text-brand-400',
  'Fair':               'text-amber-400',
  'Needs Improvement':  'text-red-400',
  'No Data':            'text-text-tertiary',
};

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

export default function LiveBudgetTracker() {
  const [data, setData]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastPulse, setLastPulse] = useState(null);
  const [spinning, setSpinning]   = useState(false);
  const intervalRef = useRef(null);

  const fetchLive = async (manual = false) => {
    if (manual) setSpinning(true);
    try {
      const result = await premiumService.getLiveBudget();
      setData(result);
      setLastPulse(new Date());
    } catch (err) {
      console.error('Live budget fetch failed:', err);
    } finally {
      setIsLoading(false);
      if (manual) setTimeout(() => setSpinning(false), 800);
    }
  };

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(() => fetchLive(), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-black/20 border border-white/5 rounded-[2rem] p-6 animate-pulse">
        <div className="h-4 w-32 bg-white/[0.04] rounded-full mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/[0.04] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trend = TREND_CONFIG[data.trend] || TREND_CONFIG.stable;
  const TrendIcon = trend.icon;
  const scoreColor = STATUS_COLOR[data.health_status] || 'text-text-tertiary';

  // Score ring percentage
  const scorePercent = Math.max(0, Math.min(100, data.health_score));
  const circumference = 2 * Math.PI * 28;
  const strokeDash = (scorePercent / 100) * circumference;

  const formatTime = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-black/20 border border-white/5 rounded-[2rem] p-7 relative overflow-hidden group">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-brand-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-75 animate-ping top-0 right-0" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] top-0 right-0" />
          </div>
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.35em]">
            Live Budget Monitor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest hidden sm:block">
            Updated {formatTime(lastPulse)}
          </p>
          <button
            onClick={() => fetchLive(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text-tertiary hover:text-brand-400 transition-all active:scale-90"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Health Score Ring */}
        <div className="sm:col-span-1 flex flex-col items-center justify-center bg-white/[0.02] rounded-2xl p-5 border border-white/5">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="28"
              fill="none"
              stroke={scorePercent >= 70 ? '#d4af37' : scorePercent >= 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="-mt-12 text-center">
            <p className={`text-xl font-black tracking-tight italic ${scoreColor}`}>{data.health_score}</p>
            <p className="text-[8px] text-text-tertiary font-black uppercase tracking-widest">/100</p>
          </div>
          <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${scoreColor}`}>{data.health_status}</p>
        </div>

        {/* Income */}
        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
          <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mb-2">Income</p>
          <p className="text-xl font-black text-text-primary italic tracking-tight">₹{data.total_income.toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Activity className="w-3 h-3 text-brand-500" />
            <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">This Cycle</p>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
          <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mb-2">Expenses</p>
          <p className="text-xl font-black text-text-primary italic tracking-tight">₹{data.total_expense.toLocaleString()}</p>
          <div className="w-full bg-black/30 rounded-full h-1 mt-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, (data.total_expense / data.total_income) * 100)}%` }}
            />
          </div>
        </div>

        {/* Savings + Trend */}
        <div className={`${trend.bg} rounded-2xl p-5 border ${trend.border} flex flex-col justify-between`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">Savings</p>
            <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${trend.color}`}>
              <TrendIcon className="w-3 h-3" />
              {trend.label}
            </div>
          </div>
          <p className={`text-xl font-black italic tracking-tight ${data.total_savings >= 0 ? 'text-text-primary' : 'text-red-400'}`}>
            ₹{data.total_savings.toLocaleString()}
          </p>
          <p className={`text-[10px] font-black italic mt-2 ${trend.color}`}>
            {data.savings_rate}% savings rate
          </p>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-5 flex items-center gap-2">
        <div className="flex-1 h-px bg-white/5" />
        <p className="text-[8px] text-text-tertiary font-bold uppercase tracking-widest whitespace-nowrap">
          Auto-refreshes every 30s
        </p>
        <div className="flex-1 h-px bg-white/5" />
      </div>
    </div>
  );
}
