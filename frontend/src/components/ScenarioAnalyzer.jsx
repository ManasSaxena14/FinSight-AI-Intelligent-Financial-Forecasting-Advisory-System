import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Calculator, ArrowRight, TrendingUp, TrendingDown, Info } from 'lucide-react';

const CATEGORIES = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"];

export default function ScenarioAnalyzer({ currentIncome, currentExpenses }) {
  const [proposedExpenses, setProposedExpenses] = useState(currentExpenses || {
    Food: 0, Travel: 0, Rent: 0, Shopping: 0, Bills: 0, Entertainment: 0
  });
  const [income, setIncome] = useState(currentIncome || 0);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize if props come in later
  useEffect(() => {
    if (currentExpenses) {
      setProposedExpenses(prev => {
        const isInitial = Object.values(prev).every(v => v === 0);
        return isInitial ? currentExpenses : prev;
      });
    }
    if (currentIncome) {
      setIncome(prev => (prev === 0 || prev === undefined ? currentIncome : prev));
    }
  }, [currentIncome, currentExpenses]);

  const handleExpenseChange = (category, value) => {
    setProposedExpenses(prev => ({ ...prev, [category]: Number(value) }));
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const payload = {
        current_income: Number(income),
        proposed_expenses: proposedExpenses
      };
      const res = await premiumService.analyzeScenario(payload);
      setResult(res);
    } catch (err) {
      console.error("Failed scenario analysis", err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalProposed = Object.values(proposedExpenses).reduce((acc, val) => acc + val, 0);

  return (
    <Card className="analytics-card border-none bg-black/20 shadow-2xl rounded-[3rem] overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <CardHeader className="border-white/5 bg-transparent py-8 px-10">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-brand-500/10 rounded-2xl border border-brand-500/20 shadow-2xl shadow-brand-500/10">
            <Calculator className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
          </div>
          <div>
            <CardTitle className="text-sm font-black tracking-[0.3em] text-text-primary uppercase italic">Stress Test Engine</CardTitle>
            <p className="text-[10px] text-text-tertiary mt-1 font-black uppercase tracking-[0.2em]">Neural Predictive Budget Simulation v4.0</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-10 pb-12 px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Inputs */}
          <div className="space-y-10">
            <div>
              <label className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] block mb-4 px-2">Liquidity Injection / Income</label>
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-500 font-black italic">₹</span>
                <input 
                  type="number" 
                  value={income} 
                  onChange={e => setIncome(e.target.value)} 
                  className="w-full pl-12 pr-6 py-4 bg-black/20 border border-white/5 rounded-2xl focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/40 text-text-primary font-black italic outline-none transition-all shadow-2xl group-hover:border-white/10"
                />
              </div>
            </div>

            <div className="space-y-10">
              <div className="flex items-center gap-4 mb-2">
                 <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">Monthly Expense Targets</h4>
                 <div className="h-px flex-1 bg-white/5" />
              </div>
              {CATEGORIES.map(cat => {
                const maxVal = Math.max(5000, (currentExpenses[cat] || 0) * 3);
                const currentVal = proposedExpenses[cat] || 0;
                const fillPercentage = Math.min(100, Math.max(0, (currentVal / maxVal) * 100));

                return (
                <div key={cat} className="group">
                  <div className="flex justify-between text-[10px] font-black text-text-tertiary mb-3 group-hover:text-text-secondary transition-colors uppercase tracking-widest">
                    <span className="flex items-center gap-3 italic">
                       <span className={`w-1.5 h-1.5 rounded-full ${currentVal !== currentExpenses[cat] ? 'bg-brand-500 shadow-[0_0_8px_rgba(212,175,55,1)]' : 'bg-white/10 group-hover:bg-brand-500 group-hover:shadow-[0_0_8px_rgba(212,175,55,1)]'} transition-all`} />
                       {cat}
                    </span>
                    <span className="text-text-primary font-black italic tracking-tight text-xs">₹{currentVal.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={maxVal} 
                    step="50"
                    value={currentVal} 
                    onChange={e => handleExpenseChange(cat, e.target.value)}
                    style={{
                      backgroundSize: `${fillPercentage}% 100%`
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/5 bg-gradient-to-r from-brand-500 to-brand-500 bg-no-repeat transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(212,175,55,1)] [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(212,175,55,1)] [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:transition-transform"
                  />
                </div>
              )})}
            </div>
            
            <div className="pt-6">
              <Button onClick={handleAnalyze} isLoading={isLoading} className="w-full h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-black font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Run Stress Simulation
              </Button>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-black/20 rounded-[3rem] border border-white/5 p-10 flex flex-col justify-center min-h-[450px] shadow-2xl relative overflow-hidden group/result">
            <div className="absolute inset-0 bg-brand-500/[0.02] opacity-0 group-hover/result:opacity-100 transition-opacity pointer-events-none" />
            
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(5px)' }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="space-y-10 relative z-10"
                >
                  <div className="text-center">
                    <p className="text-[10px] text-text-tertiary uppercase tracking-[0.4em] font-black mb-4">Projected Monthly Savings</p>
                    <div className={`text-6xl font-black tracking-tighter drop-shadow-2xl italic ${result.projected_savings >= 0 ? 'text-text-primary underline decoration-brand-500/40 decoration-8 underline-offset-8' : 'text-rose-500'}`}>
                      ₹{result.projected_savings.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-bg-panel/40 p-6 rounded-3xl border border-white/5 text-center shadow-2xl group hover:border-brand-500/20 transition-colors">
                      <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mb-2">Simulated Total Spending</p>
                      <p className="text-2xl font-black text-text-primary italic">₹{totalProposed.toLocaleString()}</p>
                    </div>
                    <div className="bg-bg-panel/40 p-6 rounded-3xl border border-white/5 text-center shadow-2xl group hover:border-brand-500/20 transition-colors">
                      <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mb-2">Health Score</p>
                      <p className={`text-2xl font-black italic ${result.projected_health_score >= 80 ? 'text-brand-400 shadow-brand-500/20' : result.projected_health_score >= 60 ? 'text-text-primary' : 'text-rose-500'}`}>
                        {result.projected_health_score}<span className="text-xs text-text-tertiary ml-1 not-italic">/100</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-brand-500/10 to-transparent border border-brand-500/20 rounded-3xl overflow-hidden group/advice shadow-2xl">
                     <div className="p-8 flex gap-6 text-sm text-text-secondary">
                      <div className="shrink-0">
                        <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/30">
                          <TrendingUp className="w-6 h-6 text-brand-400" />
                        </div>
                      </div>
                      <div>
                          <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em] mb-2">Forensic Advice</p>
                          <p className="leading-relaxed font-bold italic text-text-primary tracking-tight">"{result.advice}"</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-16 animate-pulse"
                >
                  <div className="relative inline-block mb-10">
                    <Calculator className="w-24 h-24 text-white/5 opacity-50" />
                    <ArrowRight className="w-8 h-8 text-brand-500 absolute -bottom-2 -right-2 drop-shadow-[0_0_10px_rgba(212,175,55,1)]" />
                  </div>
                  <h4 className="text-text-secondary font-black tracking-widest uppercase text-xs mb-3">Awaiting Parameters</h4>
                  <p className="text-[10px] text-text-tertiary max-w-[220px] mx-auto font-bold uppercase tracking-[0.2em] leading-relaxed">Initialize spending profile to execute neural stress simulation.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
