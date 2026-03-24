import { useState } from 'react';
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
  useState(() => {
    if (currentExpenses) setProposedExpenses(currentExpenses);
    if (currentIncome) setIncome(currentIncome);
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
    <Card className="analytics-card border-none bg-zinc-900/60 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-3xl rounded-full" />
      
      <CardHeader className="border-zinc-800/80 bg-zinc-900/40 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20">
            <Calculator className="w-6 h-6 text-brand-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Scenario Simulator</CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium tracking-wide">AI-powered predictive budget stress testing.</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8 pb-10 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Inputs */}
          <div className="space-y-8">
            <div>
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-3">Target Monthly Income</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input 
                  type="number" 
                  value={income} 
                  onChange={e => setIncome(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-zinc-100 font-bold outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-3">Adjust Category Allocations</h4>
              {CATEGORIES.map(cat => (
                <div key={cat} className="group">
                  <div className="flex justify-between text-xs font-bold text-zinc-400 mb-2 group-hover:text-zinc-200 transition-colors">
                    <span className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-brand-500 transition-colors" />
                       {cat}
                    </span>
                    <span className="text-zinc-50 tracking-tighter">${proposedExpenses[cat]?.toLocaleString() || 0}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.max(5000, (proposedExpenses[cat] || 0) * 3)} 
                    step="50"
                    value={proposedExpenses[cat] || 0} 
                    onChange={e => handleExpenseChange(cat, e.target.value)}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
                  />
                </div>
              ))}
            </div>
            
            <div className="pt-4">
              <Button onClick={handleAnalyze} isLoading={isLoading} className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]">
                Execute Simulation
              </Button>
            </div>
          </div>

          {/* Results Display */}
          <div className="bg-zinc-950/50 rounded-3xl border border-zinc-800/80 p-8 flex flex-col justify-center min-h-[400px] shadow-inner relative overflow-hidden group/result">
            <div className="absolute inset-0 bg-brand-500/[0.01] opacity-0 group-hover/result:opacity-100 transition-opacity pointer-events-none" />
            
            {result ? (
              <div className="space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-2">Projected Monthly Surplus</p>
                  <div className={`text-5xl font-black tracking-tighter drop-shadow-2xl ${result.projected_savings >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    ${result.projected_savings.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Simulated Spending</p>
                    <p className="text-xl font-black text-zinc-100">${totalProposed.toLocaleString()}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Simulated Health</p>
                    <p className={`text-xl font-black ${result.projected_health_score >= 80 ? 'text-emerald-400' : result.projected_health_score >= 60 ? 'text-blue-400' : 'text-amber-500'}`}>
                      {result.projected_health_score}<span className="text-xs text-zinc-600 ml-0.5">/100</span>
                    </p>
                  </div>
                </div>

                <Card className="bg-brand-500/5 border-zinc-800/80 rounded-2xl overflow-hidden group/advice">
                   <div className="p-5 flex gap-4 text-sm text-zinc-300">
                    <div className="shrink-0">
                      <div className="p-2 bg-brand-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-brand-400" />
                      </div>
                    </div>
                    <p className="leading-relaxed font-medium italic text-zinc-400 group-hover/advice:text-zinc-200 transition-colors">"{result.advice}"</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="relative inline-block mb-6">
                  <Calculator className="w-16 h-16 text-zinc-800 opacity-50" />
                  <ArrowRight className="w-6 h-6 text-brand-500 absolute -bottom-2 -right-2 animate-bounce-x" />
                </div>
                <h4 className="text-zinc-200 font-bold mb-2">Awaiting Parameters</h4>
                <p className="text-sm text-zinc-500 max-w-[200px] mx-auto font-medium">Configure your spending profile and execute the simulation.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
