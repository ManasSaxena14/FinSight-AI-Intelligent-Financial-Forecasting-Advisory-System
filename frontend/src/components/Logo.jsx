import { useId, useLayoutEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { gsap, prefersReducedMotion } from '../lib/motion';

/**
 * FinSight mark: a gold squircle holding three ascending bars (your money),
 * a rising trend line drawn over them (the forecast) that ends in a four-point
 * spark (the AI). Pass `animate` to play the build-up once on mount.
 */
export function LogoMark({ size = 36, animate = false, delay = 0, className, onComplete }) {
  const rootRef = useRef(null);
  const uid = useId().replace(/:/g, '');

  useLayoutEffect(() => {
    if (!animate) return undefined;
    const el = rootRef.current;
    if (prefersReducedMotion()) { onComplete?.(); return undefined; }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay, onComplete });
      tl.from('[data-tile]', { scale: 0.4, rotate: -25, opacity: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'back.out(1.6)' })
        .from('[data-bar]', { scaleY: 0, transformOrigin: '50% 100%', stagger: 0.08, duration: 0.7, ease: 'power3.out' }, '-=0.45')
        .from('[data-line]', { drawSVG: '0%', duration: 0.8, ease: 'power2.inOut' }, '-=0.35')
        .from('[data-spark]', { scale: 0, rotate: -120, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2.5)' }, '-=0.25')
        .fromTo('[data-shine]', { x: -60 }, { x: 60, duration: 0.9, ease: 'power2.inOut' }, '-=0.4');
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, delay]);

  return (
    <svg ref={rootRef} width={size} height={size} viewBox="0 0 48 48" fill="none" className={cn('shrink-0 overflow-visible', className)}
      role="img" aria-label="FinSight AI">
      <defs>
        <linearGradient id={`g-${uid}`} x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBF1CF" />
          <stop offset="0.45" stopColor="#E2BE4E" />
          <stop offset="1" stopColor="#9A7516" />
        </linearGradient>
        <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c-${uid}`}><rect x="2" y="2" width="44" height="44" rx="13" /></clipPath>
      </defs>
      <g data-tile>
        <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#g-${uid})`} />
        <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" stroke="#fff" strokeOpacity="0.35" />
        <g clipPath={`url(#c-${uid})`}>
          <rect data-shine x="-10" y="-4" width="14" height="60" fill={`url(#s-${uid})`} transform="rotate(20 24 24)" opacity="0.9" />
        </g>
      </g>
      <rect data-bar x="11" y="29" width="5.5" height="9" rx="1.8" fill="#0B0C10" />
      <rect data-bar x="20" y="25.5" width="5.5" height="12.5" rx="1.8" fill="#0B0C10" />
      <rect data-bar x="29" y="20" width="5.5" height="18" rx="1.8" fill="#0B0C10" />
      <path data-line d="M9.5 25.5 L18.5 19.5 L24 22.5 L32 15" stroke="#0B0C10" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path data-spark d="M37 5.5C37.55 9.4 38.6 10.45 42.5 11C38.6 11.55 37.55 12.6 37 16.5C36.45 12.6 35.4 11.55 31.5 11C35.4 10.45 36.45 9.4 37 5.5Z" fill="#0B0C10" />
    </svg>
  );
}

/** Mark + wordmark. `tagline` adds the strapline underneath. */
export default function Logo({ size = 34, animate = false, tagline = false, className, textClassName }) {
  const wordRef = useRef(null);
  useLayoutEffect(() => {
    if (!animate || prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('[data-word]', { opacity: 0, x: -10, filter: 'blur(6px)', stagger: 0.08, duration: 0.9, delay: 0.9 });
    }, wordRef);
    return () => ctx.revert();
  }, [animate]);
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} animate={animate} />
      <span ref={wordRef} className="leading-none">
        <span className={cn('block whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] text-fg', textClassName)}>
          <span data-word className="inline-block">FinSight</span>{' '}
          <span data-word className="display inline-block italic text-gold-gradient pr-0.5">AI</span>
        </span>
        {tagline && <span data-word className="mt-1 block text-[11px] text-fg-faint">Predict smarter. Spend better.</span>}
      </span>
    </span>
  );
}
