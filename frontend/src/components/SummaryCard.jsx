import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

/**
 * SummaryCard — Reusable analytics metric card
 * Props:
 *   label       : string  — metric label
 *   value       : string  — formatted value
 *   subValue    : string  — optional smaller sub-value
 *   icon        : React component (Lucide icon)
 *   accent      : 'gold' | 'neutral' | 'positive' | 'danger'
 *   badge       : string  — optional badge text (e.g. "AI LIVE")
 *   isLoading   : bool
 */
export default function SummaryCard({
  label,
  value,
  subValue,
  icon: Icon,
  accent = 'neutral',
  customColors,
  badge,
  isLoading = false,
  className,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current || isLoading) return;
    const el = cardRef.current;

    const enter = () => {
      gsap.to(el, { y: -4, scale: 1.015, duration: 0.4, ease: 'power2.out' });
      gsap.to(el.querySelector('.card-icon'), {
        scale: 1.15,
        duration: 0.4,
        ease: 'back.out(1.7)',
      });
    };
    const leave = () => {
      gsap.to(el, { y: 0, scale: 1, duration: 0.5, ease: 'power2.out' });
      gsap.to(el.querySelector('.card-icon'), {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    };
  }, [isLoading]);

  const accentConfig = {
    gold:     { icon: 'bg-brand-500/10 border-brand-500/20 text-brand-400', value: 'text-brand-400', border: 'border-brand-500/10', glow: '' },
    neutral:  { icon: 'bg-white/5 border-white/10 text-text-tertiary',      value: 'text-text-primary', border: 'border-white/5', glow: '' },
    positive: { icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', value: 'text-emerald-400', border: 'border-emerald-500/10', glow: '' },
    danger:   { icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400',    value: 'text-rose-400', border: 'border-rose-500/10', glow: '' },
  };

  const cfg = customColors ? {
    icon: customColors.icon ? `${customColors.icon} bg-black/40 border border-white/10` : accentConfig[accent].icon,
    value: customColors.text || accentConfig[accent].value,
    border: customColors.border || accentConfig[accent].border,
    glow: customColors.glow || '',
    badge: customColors.badge || ''
  } : accentConfig[accent];

  if (isLoading) {
    return (
      <div className={cn('glass-card border-none rounded-[2rem] overflow-hidden bg-bg-panel relative p-6', className)}>
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <div className="flex items-center justify-between mb-5">
          <div className="h-11 w-11 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-4 w-14 rounded-full bg-white/5 animate-pulse" />
        </div>
        <div className="space-y-2 mt-2">
          <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse" />
          <div className="h-8 w-28 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-3 w-16 bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'glass-card border border-white/5 rounded-[2rem] overflow-hidden bg-bg-panel shadow-2xl relative cursor-default',
        cfg.border,
        className,
      )}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      <div className="p-6">
        {/* Top row: icon + badge */}
        <div className="flex items-center justify-between mb-5">
          {Icon && (
            <div className={cn('card-icon p-3 rounded-2xl border shadow-lg', cfg.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          {badge && (
            <motion.span 
              animate={{ opacity: [1, 0.6, 1], scale: [1, 1.02, 1] }} 
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={cn("text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.15)] border-2 backdrop-blur-md", cfg.badge || "text-brand-500 bg-brand-500/10 border-brand-500/30")}
            >
              {badge}
            </motion.span>
          )}
        </div>

        {/* Label */}
        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.25em] mb-1 pl-0.5">
          {label}
        </p>

        {/* Primary Value */}
        <p className={cn('text-3xl font-black tracking-tighter', cfg.value)}>
          {value}
        </p>

        {/* Sub-value */}
        {subValue && (
          <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1.5 pl-0.5">
            {subValue}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={cn('h-px w-full', accent === 'gold' ? 'bg-gradient-to-r from-transparent via-brand-500/30 to-transparent' : 'bg-white/5')} />
    </div>
  );
}
