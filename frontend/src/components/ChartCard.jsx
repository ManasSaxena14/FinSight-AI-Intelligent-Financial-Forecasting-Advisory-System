import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { cn } from '../utils/cn';

/**
 * ChartCard — Premium wrapper for Recharts visualizations
 * Props:
 *   title     : string
 *   subtitle  : string  — optional
 *   icon      : Lucide icon component
 *   children  : chart content
 *   colSpan   : number  — grid col-span (1 or 2)
 *   minHeight : string  — e.g. '380px'
 *   isLoading : bool
 */
export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  colSpan = 1,
  minHeight = '380px',
  isLoading = false,
  className,
}) {
  const cardRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!cardRef.current || isLoading || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            cardRef.current,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
          );
          setHasAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isLoading, hasAnimated]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'glass-card border-none rounded-[2.5rem] overflow-hidden bg-bg-panel shadow-2xl relative',
          colSpan === 2 && 'lg:col-span-2',
          className
        )}
      >
        <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <div className="px-8 py-6 border-b border-white/5">
          <div className="h-3 w-32 bg-white/5 rounded-full animate-pulse" />
        </div>
        <div className="px-8 py-6" style={{ minHeight }}>
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-48 h-48 rounded-full bg-white/[0.03] animate-pulse" />
            <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={{ opacity: 0 }}
      className={cn(
        'glass-card border-none rounded-[2.5rem] overflow-hidden bg-bg-panel shadow-2xl relative flex flex-col group',
        colSpan === 2 && 'lg:col-span-2',
        className
      )}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      {/* Hover glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div className="px-8 py-5 border-b border-white/5 flex items-center gap-3 relative z-10">
        {Icon && (
          <div className="p-2 bg-brand-500/10 rounded-xl border border-brand-500/20">
            <Icon className="h-4 w-4 text-brand-400" />
          </div>
        )}
        <div>
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[9px] text-text-tertiary/60 font-medium mt-0.5 tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 px-6 py-6 relative z-10" style={{ minHeight }}>
        {children}
      </div>
    </div>
  );
}
