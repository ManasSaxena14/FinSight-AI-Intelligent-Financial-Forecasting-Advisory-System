
export const getScoreColors = (score) => {
  if (!score) return { bg: 'from-brand-500/5 to-transparent', border: 'border-brand-500/20', text: 'text-brand-500', glow: 'shadow-brand-500/10', badge: 'bg-brand-500/10 text-brand-500', icon: 'text-brand-400' };
  if (score >= 90) return { bg: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: 'text-emerald-400' };
  if (score >= 70) return { bg: 'from-brand-500/10 to-transparent', border: 'border-brand-500/40', text: 'text-brand-400', glow: 'shadow-brand-500/20', badge: 'bg-brand-500/20 text-brand-400 border-brand-500/30', icon: 'text-brand-400' };
  if (score >= 40) return { bg: 'from-amber-500/10 to-transparent', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/20', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: 'text-amber-400' };
  return { bg: 'from-rose-500/10 to-transparent', border: 'border-rose-500/40', text: 'text-rose-400', glow: 'shadow-rose-500/20', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: 'text-rose-400' };
};
