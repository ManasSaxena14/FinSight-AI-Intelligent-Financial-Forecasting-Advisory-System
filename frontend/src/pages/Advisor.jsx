import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Bot, Target, Calculator, Lightbulb, Sparkles, ChevronRight } from 'lucide-react';
import GoalTracker from '../components/GoalTracker';
import ScenarioAnalyzer from '../components/ScenarioAnalyzer';
import SmartSavings from '../components/SmartSavings';
import LiveBudgetTracker from '../components/LiveBudgetTracker';
import { expenseService } from '../api/expenseService';
import { premiumService } from '../api/premiumService';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'overview',   label: 'Overview',         icon: Sparkles,    desc: 'Budget status and monthly summary' },
  { id: 'goals',      label: 'Financial Goals',  icon: Target,      desc: 'Set and track savings targets' },
  { id: 'savings',    label: 'Smart Savings',    icon: Lightbulb,   desc: 'Ideas to save more' },
  { id: 'scenario',   label: 'What-if',          icon: Calculator,  desc: 'Try different spending scenarios' },
];

export default function Advisor() {
  const [activeTab, setActiveTab]   = useState('overview');
  const [latestRecord, setLatest]   = useState(null);
  const [aiSummary, setAiSummary]   = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const containerRef = useRef(null);
  const summaryRef = useRef(null);

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
          if (summaryData) {
            setAiSummary(summaryData.reply);
            setShowAnalysis(true);
          }
        } else {
          setLatest(null);
          setAiSummary('');
          setShowAnalysis(false);
        }
      } catch (err) {
        console.error('Advisor data load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    const handleUpdated = () => {
      setIsLoading(true);
      load();
    };

    window.addEventListener('expenses:updated', handleUpdated);
    return () => window.removeEventListener('expenses:updated', handleUpdated);
  }, []);

  useEffect(() => {
    if (!isLoading && containerRef.current) {
      const ctx = gsap.context(() => {
        // Initial header entry
        gsap.fromTo(".animate-header", 
          { y: 20, opacity: 0, filter: 'blur(10px)' },
          { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: "power3.out" }
        );

        // Tab navigation entry
        gsap.fromTo(".advisor-card",
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
        );
      }, containerRef);
      return () => ctx.revert();
    }
  }, [isLoading]);

  // Typing effect for AI summary
  useEffect(() => {
    if (showAnalysis && aiSummary && summaryRef.current) {
      gsap.fromTo(summaryRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
      );
    }
  }, [showAnalysis, aiSummary]);

  // Re-animate content when tab changes
  useEffect(() => {
    const el = document.getElementById('tab-content');
    if (el) {
      gsap.fromTo(el, 
        { opacity: 0, scale: 0.98, filter: 'blur(4px)' }, 
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }
      );
    }
  }, [activeTab]);

  return (
    <div className="space-y-10 relative min-h-screen" ref={containerRef}>
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      {/* Page Header */}
      <div className="relative z-10 animate-header">
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 relative z-10">
              <Bot className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
            </div>
            <div className="absolute inset-0 bg-brand-500/20 blur-xl animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">
              AI Advisor
            </h1>
            <p className="text-sm text-text-tertiary mt-1 font-medium tracking-wide">
              Goals, savings tips, what-if scenarios, and your latest numbers in one place.
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border text-sm font-black uppercase tracking-wider transition-all duration-500 group relative overflow-hidden ${
                isActive
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-400 shadow-[0_0_30px_rgba(212,175,55,0.1)]'
                  : 'bg-black/20 border-white/5 text-text-tertiary hover:border-white/10 hover:text-text-secondary hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
              )}
              <Icon className={`w-4 h-4 transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] scale-110' : 'group-hover:text-brand-500/60'}`} />
              <span className="tracking-[0.15em] text-[11px] relative z-10">{tab.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50 relative z-10" />}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div id="tab-content" className="relative z-10 space-y-8">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* AI Narrative Summary - ONLY SHOWN ON INPUT */}
            {isLoading ? (
              <div className="advisor-card h-40 bg-white/[0.03] rounded-[2.5rem] animate-pulse flex items-center justify-center border border-white/5">
                <div className="flex flex-col items-center gap-4">
                  <Sparkles className="w-8 h-8 text-brand-500/30 animate-spin" />
                  <span className="text-[10px] font-black text-brand-500/40 uppercase tracking-[0.4em]">Loading summary…</span>
                </div>
              </div>
            ) : showAnalysis ? (
              <div ref={summaryRef} className="advisor-card bg-gradient-to-br from-bg-panel/90 via-black/40 to-bg-panel/90 border border-white/10 rounded-[2.5rem] shadow-3xl p-10 relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-brand-500/10 transition-colors duration-1000" />
                
                <div className="flex flex-col md:flex-row items-start gap-10 relative z-10">
                  <div className="relative shrink-0">
                    <div className="p-5 bg-brand-500/10 rounded-[2.5rem] border border-brand-500/20 shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-700">
                      <Sparkles className="h-10 w-10 text-brand-400 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                    </div>
                    <div className="absolute inset-0 bg-brand-500/20 blur-2xl animate-pulse" />
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-px w-8 bg-brand-500/30" />
                      <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.4em]">Your monthly summary</p>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <p className="text-text-primary text-xl font-medium leading-relaxed tracking-tight selection:bg-brand-500/30">
                      {aiSummary}
                    </p>
                    <div className="flex items-center gap-6 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Powered by AI</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Based on your data</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="advisor-card bg-black/40 backdrop-blur-md border-2 border-dashed border-white/5 rounded-[3rem] p-20 text-center group hover:border-brand-500/20 transition-all duration-700">
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full group-hover:bg-brand-500/20 transition-colors" />
                  <Bot className="w-full h-full text-white/10 group-hover:text-brand-500/30 transition-colors relative z-10" />
                </div>
                <h3 className="text-xl font-black text-white/40 tracking-tighter mb-4 group-hover:text-white/60 transition-colors">No spending data yet</h3>
                <p className="text-text-tertiary text-xs font-black uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                  Add your monthly income and expenses to see a personalized summary here.
                </p>
              </div>
            )}

            {/* Live Budget Tracker - ONLY SHOWN ON DATA */}
            {showAnalysis && (
              <div className="advisor-card">
                <LiveBudgetTracker />
              </div>
            )}

            {/* Quick stats row if data exists */}
            {latestRecord && (
              <div className="advisor-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Month',            value: latestRecord.month,                                   unit: '', color: 'text-brand-400' },
                  { label: 'Income',           value: `₹${latestRecord.income.toLocaleString()}`,           unit: '', color: 'text-emerald-400' },
                  { label: 'Total spending',   value: `₹${latestRecord.total_expense.toLocaleString()}`,    unit: '', color: 'text-rose-400' },
                  { label: 'Net savings',      value: `₹${latestRecord.savings.toLocaleString()}`,          unit: '', color: 'text-blue-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] hover:border-brand-500/20 transition-all duration-500 group">
                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.3em] mb-4 group-hover:text-brand-500/60 transition-colors">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className={cn("text-3xl font-black italic tracking-tighter", stat.color)}>{stat.value}</p>
                    </div>
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
              <div className="bg-black/40 backdrop-blur-md border-2 border-dashed border-white/5 rounded-[3rem] p-20 text-center group hover:border-brand-500/20 transition-all duration-700">
                <Calculator className="w-16 h-16 text-white/10 mx-auto mb-8 group-hover:text-brand-500/30 transition-colors" />
                <h3 className="text-xl font-black text-white/40 tracking-tighter mb-4 group-hover:text-white/60 transition-colors">Add data first</h3>
                <p className="text-text-tertiary text-xs font-black uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                  Add your income and expenses to try “what-if” spending scenarios.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
