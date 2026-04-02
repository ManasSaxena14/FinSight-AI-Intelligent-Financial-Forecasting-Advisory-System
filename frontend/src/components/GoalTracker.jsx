import { useState, useEffect } from 'react';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Target, PlusCircle, CheckCircle2, Trash2, DollarSign } from 'lucide-react';

export default function GoalTracker() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [activeContribute, setActiveContribute] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // Form State
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', target_date: '' });

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await premiumService.getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newGoal.name,
        target_amount: parseFloat(newGoal.target_amount),
        target_date: newGoal.target_date
      };
      await premiumService.createGoal(payload);
      setIsAdding(false);
      setNewGoal({ name: '', target_amount: '', target_date: '' });
      fetchGoals(); // refresh the list
    } catch (err) {
      console.error("Failed to create goal", err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this objective?")) return;
    try {
      await premiumService.deleteGoal(goalId);
      fetchGoals();
    } catch (err) {
      console.error("Failed to delete goal", err);
    }
  };

  const handleContribute = async (e, goalId) => {
    e.preventDefault();
    if (!contributeAmount || isNaN(contributeAmount)) return;
    try {
      await premiumService.contributeToGoal(goalId, parseFloat(contributeAmount));
      setActiveContribute(null);
      setContributeAmount('');
      fetchGoals();
    } catch (err) {
      console.error("Failed to contribute to goal", err);
    }
  };

  if (isLoading && goals.length === 0) {
    return <div className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] p-8 animate-pulse italic">Synchronizing goals...</div>;
  }

  return (
    <Card className="dash-card border-none bg-black/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b border-white/5 bg-transparent">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
            <Target className="w-5 h-5 text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
          </div>
          <CardTitle className="text-xs font-black tracking-[0.2em] text-text-primary uppercase italic">Objectives Matrix</CardTitle>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="text-brand-400 hover:text-brand-300 transition-all text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-2 group"
        >
          {isAdding ? "Abort" : <><PlusCircle className="w-4 h-4 group-hover:scale-110 transition-transform"/> New Objective</>}
        </button>
      </CardHeader>
      
      <CardContent className="p-8">
        {isAdding && (
          <form onSubmit={handleCreateGoal} className="mb-10 p-8 bg-black/40 rounded-3xl space-y-6 border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
            <Input 
              label="Objective Identification" 
              placeholder="e.g. Asset Accumulation" 
              value={newGoal.name} 
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} 
              required 
              className="bg-black/20"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input 
                label="Target Liquidity (₹)" 
                type="number" 
                min="1" 
                value={newGoal.target_amount} 
                onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} 
                required 
                className="bg-black/20"
              />
              <Input 
                label="Deadline" 
                type="date" 
                value={newGoal.target_date} 
                onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })} 
                required 
                className="bg-black/20"
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-br from-brand-400 to-brand-600 text-black shadow-2xl shadow-brand-500/20 h-12 rounded-xl uppercase font-black tracking-widest text-[10px]">Secure Objective</Button>
          </form>
        )}

        {goals.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-text-tertiary">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">No active objectives detected.</p>
            <p className="text-[9px] font-medium tracking-widest opacity-50 uppercase">Initialize a new financial target to begin auditing.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {goals.map(goal => (
              <div key={goal.id} className="relative group/goal">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-text-primary text-sm tracking-tight flex items-center gap-2 italic">
                      {goal.name} 
                      {goal.progress_percentage >= 100 && <CheckCircle2 className="w-4 h-4 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />}
                    </h4>
                    <p className="text-[10px] text-text-tertiary mt-1 font-bold uppercase tracking-widest">Target: {new Date(goal.target_date).toLocaleDateString()}</p>
                    {goal.days_remaining !== null && (
                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${goal.is_on_track ? 'text-text-tertiary' : 'text-rose-500'}`}>
                        {goal.days_remaining > 0 ? `${goal.days_remaining} Days Remaining` : 'Deadline Passed'} 
                        {goal.required_monthly_saving > 0 && ` •  Req ₹${goal.required_monthly_saving}/mo`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="text-right">
                      <span className="text-sm font-black text-text-primary tracking-tight italic">${goal.current_savings.toLocaleString()}</span>
                      <span className="text-[10px] text-text-tertiary font-bold tracking-widest"> / ${goal.target_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/goal:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setActiveContribute(activeContribute === goal.id ? null : goal.id)}
                        className="p-1.5 rounded-lg bg-black/20 hover:bg-brand-500/10 hover:text-brand-400 text-text-tertiary border border-white/5 transition-colors"
                        title="Contribute"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 rounded-lg bg-black/20 hover:bg-rose-500/10 hover:text-rose-500 text-text-tertiary border border-white/5 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {activeContribute === goal.id && (
                   <form onSubmit={(e) => handleContribute(e, goal.id)} className="mb-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="Amount"
                          value={contributeAmount}
                          onChange={e => setContributeAmount(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                          required
                        />
                      </div>
                      <Button type="submit" className="py-2 px-4 h-auto text-[10px] bg-brand-500 hover:bg-brand-400 text-black rounded-lg uppercase tracking-widest font-bold">Add</Button>
                      <button type="button" onClick={() => setActiveContribute(null)} className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold hover:text-text-secondary px-2">Cancel</button>
                   </form>
                )}

                <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden shadow-inner border border-white/5 relative">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600 relative overflow-hidden"
                    style={{ width: `${Math.max(2, Math.min(100, goal.progress_percentage))}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:200%_100%] animate-shimmer" />
                    <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(212,175,55,1)]" />
                  </div>
                </div>
                <div className="flex justify-between mt-3 px-1">
                  <span className="text-[10px] text-text-tertiary font-black tracking-[0.2em]">{goal.progress_percentage}% MATRIX COMPLETION</span>
                  <span className={`text-[10px] tracking-[0.3em] font-black uppercase ${goal.progress_percentage >= 100 || goal.is_on_track ? 'text-brand-400' : 'text-rose-500'}`}>
                    {goal.progress_percentage >= 100 ? 'SUCCESS' : goal.is_on_track ? 'NOMINAL' : 'CRITICAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
