import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Bot, Target, Calculator, Lightbulb, Sparkles, ChevronRight } from 'lucide-react';
import GoalTracker from '../components/GoalTracker';
import ScenarioAnalyzer from '../components/ScenarioAnalyzer';
import SmartSavings from '../components/SmartSavings';
import LiveBudgetTracker from '../components/LiveBudgetTracker';
import { expenseService } from '../api/expenseService';
import { premiumService } from '../api/premiumService';

const TABS = [
  { id: 'overview',   label: 'Live Overview',    icon: Sparkles,    desc: 'Real-time budget status & AI narrative' },
  { id: 'savings',    label: 'Smart Savings',    icon: Lightbulb,   desc: 'Personalized AI savings recommendations'  },
  { id: 'scenario',   label: 'Stress Test',      icon: Calculator,  desc: 'What-if scenario budget simulation'       },
];

export default function Advisor() {
  const [activeTab, setActiveTab]   = useState('overview');
  const [latestRecord, setLatest]   = useState(null);
  const [aiSummary, setAiSummary]   = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const expenses = await expenseService.getExpenses();
        if (expenses.length > 0) {
          const latest = expenses[0];
          setLatest(latest);
          // Fetch AI summary
          const summaryData = await premiumService.getMonthlySummary({
            income:   latest.income,
            expenses: latest.expenses,
            savings:  latest.savings,
          }).catch(() => null);
          if (summaryData) setAiSummary(summaryData.reply);
        }
      } catch (err) {
        console.error('Advisor data load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      gsap.fromTo(
        gsap.utils.toArray('.advisor-card'),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  // Re-animate content when tab changes
  useEffect(() => {
    gsap.fromTo('#tab-content', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }, [activeTab]);

  return (
    <div className="space-y-10 relative" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      {/* Page Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
            <Bot className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">
              AI Advisor.
            </h1>
            <p className="text-sm text-text-tertiary mt-1 font-medium tracking-wide">
              Premium intelligence suite — goals, savings, stress tests & live analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="advisor-card flex flex-wrap gap-3 relative z-10">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`advisor-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border text-sm font-black uppercase tracking-wider transition-all duration-300 group ${
                isActive
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-400 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                  : 'bg-black/20 border-white/5 text-text-tertiary hover:border-white/10 hover:text-text-secondary'
              }`}
            >
              <Icon className={`w-4 h-4 transition-all ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'group-hover:text-brand-500/60'}`} />
              <span className="tracking-[0.15em] text-[11px]">{tab.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div id="tab-content" className="relative z-10 space-y-8">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* AI Narrative Summary */}
            {isLoading ? (
              <div className="advisor-card h-28 bg-white/[0.03] rounded-[2.5rem] animate-pulse" />
            ) : aiSummary ? (
              <div className="advisor-card bg-gradient-to-br from-bg-panel/80 via-black/40 to-bg-panel/80 border border-white/5 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="flex items-start gap-8 relative z-10">
                  <div className="shrink-0 p-4 bg-brand-500/10 rounded-[2rem] border border-brand-500/20 shadow-2xl">
                    <Sparkles className="h-8 w-8 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.3em] mb-3">Monthly AI Synthesis</p>
                    <p className="text-text-primary text-lg font-medium leading-relaxed tracking-tight">{aiSummary}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="advisor-card bg-black/20 border border-white/5 rounded-[2.5rem] p-10 text-center">
                <p className="text-text-tertiary text-sm font-black uppercase tracking-widest">Add expense data to unlock AI narrative synthesis.</p>
              </div>
            )}

            {/* Live Budget Tracker */}
            <div className="advisor-card">
              <LiveBudgetTracker />
            </div>

            {/* Quick stats row if data exists */}
            {latestRecord && (
              <div className="advisor-card grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Latest Month',   value: latestRecord.month,                                   unit: '' },
                  { label: 'Gross Income',   value: `₹${latestRecord.income.toLocaleString()}`,           unit: '' },
                  { label: 'Total Spent',    value: `₹${latestRecord.total_expense.toLocaleString()}`,    unit: '' },
                  { label: 'Net Surplus',    value: `₹${latestRecord.savings.toLocaleString()}`,          unit: '' },
                ].map(stat => (
                  <div key={stat.label} className="bg-black/20 border border-white/5 rounded-2xl p-5 hover:border-brand-500/20 transition-colors">
                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className="text-xl font-black text-text-primary italic tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GOALS TAB ────────────────────────────────────────────────────────────── */}
        {activeTab === 'goals' && (
          <div className="advisor-card">
            <GoalTracker />
          </div>
        )}

        {/* ── SMART SAVINGS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'savings' && (
          <div className="advisor-card">
            <SmartSavings />
          </div>
        )}

        {/* ── SCENARIO / STRESS TEST TAB ───────────────────────────────────────────── */}
        {activeTab === 'scenario' && (
          <div className="advisor-card">
            {latestRecord ? (
              <ScenarioAnalyzer
                currentIncome={latestRecord.income}
                currentExpenses={latestRecord.expenses}
              />
            ) : (
              <div className="bg-black/20 border border-white/5 rounded-[3rem] p-20 text-center">
                <Calculator className="w-16 h-16 text-white/5 mx-auto mb-6" />
                <p className="text-text-tertiary text-sm font-black uppercase tracking-widest">Add expense data to run scenario simulations.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
