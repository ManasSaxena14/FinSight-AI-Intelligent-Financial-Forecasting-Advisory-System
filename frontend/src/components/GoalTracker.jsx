import { useState, useEffect } from 'react';
import { premiumService } from '../api/premiumService';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Target, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function GoalTracker() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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

  if (isLoading && goals.length === 0) {
    return <div className="text-sm text-zinc-500 p-4 animate-pulse">Loading goals...</div>;
  }

  return (
    <Card className="dash-card border-none bg-gradient-to-b from-zinc-800/40 to-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-700/50">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Financial Goals
        </CardTitle>
        <button onClick={() => setIsAdding(!isAdding)} className="text-brand-400 hover:text-brand-300 transition-colors text-sm font-semibold flex items-center gap-1">
          {isAdding ? "Cancel" : <><PlusCircle className="w-4 h-4"/> Add Goal</>}
        </button>
      </CardHeader>
      
      <CardContent className="pt-5">
        {isAdding && (
          <form onSubmit={handleCreateGoal} className="mb-6 p-5 bg-zinc-900/80 rounded-xl space-y-4 border border-zinc-700/50 shadow-inner">
            <Input 
              label="Goal Name" 
              placeholder="e.g. Vacation Fund" 
              value={newGoal.name} 
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} 
              required 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Target Amount ($)" 
                type="number" 
                min="1" 
                value={newGoal.target_amount} 
                onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} 
                required 
              />
              <Input 
                label="Target Date" 
                type="date" 
                value={newGoal.target_date} 
                onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })} 
                required 
              />
            </div>
            <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">Save Goal</Button>
          </form>
        )}

        {goals.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-zinc-500">
            <p className="text-sm font-medium mb-1">No active goals.</p>
            <p className="text-xs">Set a goal to start tracking your progress!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map(goal => (
              <div key={goal.id} className="relative group">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h4 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                      {goal.name} 
                      {goal.progress_percentage >= 100 && <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Target: {new Date(goal.target_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-zinc-100">${goal.current_savings.toLocaleString()}</span>
                    <span className="text-xs text-zinc-600"> / ${goal.target_amount.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden shadow-inner border border-zinc-700/50">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor] ${
                      goal.progress_percentage >= 100 ? 'bg-emerald-400 text-emerald-400' : 'bg-brand-500 text-brand-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, goal.progress_percentage))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold tracking-wider">{goal.progress_percentage}%</span>
                  <span className={`text-[10px] tracking-wider font-bold ${goal.is_on_track ? 'text-brand-400/80' : 'text-amber-500/80'}`}>
                    {goal.progress_percentage >= 100 ? 'COMPLETED' : goal.is_on_track ? 'ON TRACK' : 'NEEDS ATTENTION'}
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
