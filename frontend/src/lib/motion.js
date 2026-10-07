import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, useGSAP);

gsap.defaults({ ease: 'expo.out', duration: 0.9 });

// Dev-only handle for inspecting/forcing animations from the console.
if (import.meta.env.DEV) window.gsap = gsap;

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fade/rise every `[data-reveal]` inside `scope`, staggered, as it scrolls into view. */
export function revealChildren(scope, { y = 28, stagger = 0.07, start = 'top 88%' } = {}) {
  const items = gsap.utils.toArray('[data-reveal]', scope);
  if (!items.length) return;
  if (prefersReducedMotion()) {
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }
  gsap.set(items, { opacity: 0, y });
  ScrollTrigger.batch(items, {
    start,
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger, duration: 1, overwrite: true }),
  });
}

/** Split a heading into lines/words and slide them up from a mask. */
export function splitReveal(target, { delay = 0, stagger = 0.06 } = {}) {
  if (!target) return null;
  if (prefersReducedMotion()) return null;
  const split = SplitText.create(target, { type: 'lines,words', mask: 'lines', linesClass: 'pb-[0.08em]' });
  // background-clip:text gradients don't reach the new word wrappers; re-apply per word.
  split.words.forEach((word) => {
    const gradient = word.parentElement?.closest('.text-gold-gradient');
    if (gradient) word.classList.add('text-gold-gradient', 'pr-[0.06em]');
  });
  gsap.from(split.words, { yPercent: 110, opacity: 0, duration: 1.1, stagger, delay });
  return split;
}

/** Tween a number into an element's textContent using a formatter. */
export function countUp(el, to, { from = 0, duration = 1.4, format = (v) => Math.round(v).toLocaleString('en-IN'), delay = 0 } = {}) {
  if (!el) return;
  if (prefersReducedMotion() || !Number.isFinite(to)) {
    el.textContent = format(to);
    return;
  }
  const state = { v: from };
  gsap.to(state, {
    v: to,
    duration,
    delay,
    ease: 'power3.out',
    onUpdate: () => {
      el.textContent = format(state.v);
    },
  });
}

/** Pointer-follow "magnetic" pull for buttons. Returns a cleanup fn. */
export function magnetic(el, strength = 0.25) {
  if (!el || prefersReducedMotion()) return () => {};
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
  const move = (e) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    xTo(0);
    yTo(0);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

/** Spotlight: write pointer position into CSS vars --mx/--my on the element. */
export function spotlight(el) {
  if (!el) return () => {};
  const move = (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  el.addEventListener('pointermove', move);
  return () => el.removeEventListener('pointermove', move);
}
