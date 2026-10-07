/* eslint-disable react-refresh/only-export-components */
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '../../lib/cn';
import { countUp, gsap, magnetic, splitReveal, spotlight } from '../../lib/motion';

// ── Button ─────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
  primary:
    'bg-gradient-to-b from-brand-300 to-brand-500 text-ink-950 shadow-[0_1px_0_0_rgba(255,255,255,0.4)_inset,0_10px_30px_-10px_rgba(212,175,55,0.6)] hover:from-brand-200 hover:to-brand-400',
  secondary: 'border border-line-strong bg-white/[0.04] text-fg hover:bg-white/[0.08]',
  ghost: 'text-fg-muted hover:bg-white/[0.05] hover:text-fg',
  danger: 'border border-neg/30 bg-neg/10 text-neg hover:bg-neg/15',
};
const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-xl px-6 text-[15px]',
  icon: 'h-9 w-9 rounded-xl',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', isLoading = false, magnet = false, className, children, disabled, ...props },
  forwardedRef,
) {
  const localRef = useRef(null);
  const ref = forwardedRef || localRef;
  useEffect(() => (magnet ? magnetic(ref.current, 0.2) : undefined), [magnet, ref]);
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-[background,color,box-shadow,transform] duration-300 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

// ── Panel ──────────────────────────────────────────────────────────────────

export function Panel({ className, children, glow = false, ...props }) {
  const ref = useRef(null);
  useEffect(() => (glow ? spotlight(ref.current) : undefined), [glow]);
  return (
    <div ref={ref} className={cn('panel', glow && 'panel-hover', className)} {...props}>
      {glow && <div aria-hidden className="spotlight pointer-events-none absolute inset-0 rounded-[inherit]" />}
      {children}
    </div>
  );
}

export function PanelHeader({ icon: Icon, title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.03] text-brand-300">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Form fields ────────────────────────────────────────────────────────────

export const Field = forwardRef(function Field({ label, hint, error, prefix, className, id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="field-label">{label}</label>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-faint">{prefix}</span>}
        <input ref={ref} id={inputId} className={cn('field', prefix && 'pl-8', error && 'border-neg/50', className)} {...props} />
      </div>
      {error ? <p className="mt-1.5 text-xs text-neg">{error}</p> : hint ? <p className="mt-1.5 text-xs text-fg-faint">{hint}</p> : null}
    </div>
  );
});

export function Select({ label, className, children, id, ...props }) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="field-label">{label}</label>}
      <select id={id} className={cn('field cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236f7682' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
        {...props}>
        {children}
      </select>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

const BADGE_TONES = {
  neutral: 'border-line bg-white/[0.04] text-fg-muted',
  gold: 'border-brand-500/30 bg-brand-500/10 text-brand-300',
  pos: 'border-pos/30 bg-pos/10 text-pos',
  neg: 'border-neg/30 bg-neg/10 text-neg',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  ai: 'border-ai/30 bg-ai/10 text-ai',
};

export function Badge({ tone = 'neutral', className, children, dot = false }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// ── Animated number ────────────────────────────────────────────────────────

export function AnimatedNumber({ value, format, className, duration = 1.3, delay = 0 }) {
  const ref = useRef(null);
  const last = useRef(0);
  useEffect(() => {
    if (value == null || !Number.isFinite(Number(value))) return;
    countUp(ref.current, Number(value), { from: last.current, duration, delay, format });
    last.current = Number(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={className}>{value == null ? '—' : format ? format(0) : '0'}</span>;
}

// ── Stat card ──────────────────────────────────────────────────────────────

export function Stat({ label, value, format, sub, icon: Icon, tone = 'neutral', className, delay = 0 }) {
  const toneText = { neutral: 'text-fg', gold: 'text-brand-300', pos: 'text-pos', neg: 'text-neg' }[tone];
  return (
    <Panel glow className={cn('p-5', className)} data-reveal>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-fg-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />}
      </div>
      <div className={cn('mt-3 leading-none', typeof value === 'number' ? 'num text-[28px] sm:text-[30px]' : 'text-[22px] font-medium tracking-tight', toneText)}>
        {typeof value === 'number' ? <AnimatedNumber value={value} format={format} delay={delay} /> : value ?? '—'}
      </div>
      {sub && <div className="mt-2.5 text-xs text-fg-faint">{sub}</div>}
    </Panel>
  );
}

// ── Page header with split-text reveal ─────────────────────────────────────

export function PageHeader({ eyebrow, title, accent, description, actions, className }) {
  const titleRef = useRef(null);
  const restRef = useRef(null);
  useLayoutEffect(() => {
    let split;
    const ctx = gsap.context(() => {
      split = splitReveal(titleRef.current, { delay: 0.05 });
      gsap.from(restRef.current?.children || [], { opacity: 0, y: 12, duration: 0.9, stagger: 0.08, delay: 0.25 });
    });
    return () => { ctx.revert(); split?.revert(); };
  }, [title, accent]);
  return (
    <header className={cn('flex flex-col gap-5 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 ref={titleRef} className="text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-fg sm:text-[44px]">
          {title}{accent && <> <span className="display italic text-gold-gradient">{accent}</span></>}
        </h1>
        <div ref={restRef}>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// ── Tabs with a sliding indicator ──────────────────────────────────────────

export function Tabs({ tabs, value, onChange, className }) {
  const listRef = useRef(null);
  const pillRef = useRef(null);
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector(`[data-tab="${value}"]`);
    if (!active || !pillRef.current) return;
    gsap.to(pillRef.current, { x: active.offsetLeft, width: active.offsetWidth, duration: 0.55, ease: 'expo.out' });
  }, [value, tabs.length]);
  return (
    <div ref={listRef} role="tablist" className={cn('scrollbar-none relative inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-white/[0.02] p-1', className)}>
      <span ref={pillRef} className="absolute bottom-1 left-0 top-1 rounded-lg border border-line-strong bg-white/[0.07]" style={{ width: 0 }} />
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          data-tab={t.id}
          onClick={() => onChange(t.id)}
          className={cn('relative z-10 inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[13px] transition-colors',
            value === t.id ? 'text-fg' : 'text-fg-muted hover:text-fg')}
        >
          {t.icon && <t.icon className="h-4 w-4" strokeWidth={1.75} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Ring gauge ─────────────────────────────────────────────────────────────

export function Ring({ value = 0, size = 120, stroke = 8, color = '#d4af37', track = 'rgba(255,255,255,0.06)', children }) {
  const circleRef = useRef(null);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, value));
    gsap.fromTo(circleRef.current, { strokeDashoffset: c }, { strokeDashoffset: c * (1 - clamped / 100), duration: 1.6, ease: 'expo.out' });
  }, [value, c]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle ref={circleRef} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c} style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// ── Meter (horizontal bar) ─────────────────────────────────────────────────

export function Meter({ value = 0, color = 'bg-brand-400', className }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(ref.current, { width: '0%' }, { width: `${Math.max(0, Math.min(100, value))}%`, duration: 1.4, ease: 'expo.out' });
  }, [value]);
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]', className)}>
      <div ref={ref} className={cn('h-full rounded-full', color)} />
    </div>
  );
}

// ── Skeleton & empty state ─────────────────────────────────────────────────

export function Skeleton({ className }) {
  return <div className={cn('shimmer rounded-xl', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <Panel className={cn('px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[0.03] text-brand-300">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-lg font-medium text-fg">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Panel>
  );
}

// ── Disclosure helper used by tips/anomaly lists ──────────────────────────

export function useCollapse(open) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(open);
  // Mount immediately when opening (state adjusted during render, not in an effect).
  if (open && !mounted) setMounted(true);
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (open) gsap.fromTo(ref.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.5 });
    else gsap.to(ref.current, { height: 0, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => setMounted(false) });
  }, [open, mounted]);
  return { ref, mounted };
}

// ── Thumbs feedback ────────────────────────────────────────────────────────

export function FeedbackButtons({ value, onRate, className, label = 'this' }) {
  const [busy, setBusy] = useState(false);
  const rate = async (rating) => {
    if (busy) return;
    setBusy(true);
    try {
      await onRate(value === rating ? 'clear' : rating);
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[{ rating: 'up', icon: ThumbsUp, text: 'Helpful' }, { rating: 'down', icon: ThumbsDown, text: 'Not helpful' }].map((b) => (
        <button key={b.rating} type="button" disabled={busy} onClick={() => rate(b.rating)} aria-pressed={value === b.rating}
          aria-label={`${b.text}: ${label}`} title={b.text}
          className={cn('grid h-7 w-7 place-items-center rounded-lg transition disabled:opacity-50',
            value === b.rating ? (b.rating === 'up' ? 'bg-pos/15 text-pos' : 'bg-neg/15 text-neg') : 'text-fg-faint hover:bg-white/[0.05] hover:text-fg')}>
          <b.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </span>
  );
}
