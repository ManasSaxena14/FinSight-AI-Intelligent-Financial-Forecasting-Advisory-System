import { Target } from 'lucide-react';
import GoalTracker from '../components/GoalTracker';

export default function Goals() {
  return (
    <div className="space-y-10 relative">
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      {/* Page Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
            <Target className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">
              Financial Goals.
            </h1>
            <p className="text-sm text-text-tertiary mt-1 font-medium tracking-wide">
              Set, track, and audit your long-term wealth accumulation objectives.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <GoalTracker />
      </div>
    </div>
  );
}
