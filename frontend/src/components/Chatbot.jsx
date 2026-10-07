import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, Sparkles, X } from 'lucide-react';
import { gsap, magnetic } from '../lib/motion';
import AgentChat from './advisor/AgentChat';

const CoreOrb = lazy(() => import('../three/CoreOrb'));

/** Floating advisor launcher + compact chat window (hidden on the Advisor page). */
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const windowRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => magnetic(buttonRef.current, 0.3), []);

  if (open && !mounted) setMounted(true);

  useLayoutEffect(() => {
    if (!open && windowRef.current) {
      gsap.to(windowRef.current, { opacity: 0, y: 16, scale: 0.96, duration: 0.3, ease: 'power2.in', onComplete: () => setMounted(false) });
    }
  }, [open]);

  useLayoutEffect(() => {
    if (open && mounted && windowRef.current) {
      gsap.fromTo(windowRef.current, { opacity: 0, y: 24, scale: 0.94, transformOrigin: 'bottom right' },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 });
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <>
      {mounted && (
        <div ref={windowRef} role="dialog" aria-label="AI advisor"
          className="panel fixed bottom-24 right-4 z-50 flex h-[min(640px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden !bg-ink-850/95 sm:right-6 sm:w-[400px]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-line bg-ink-900">
              <Suspense fallback={null}>
                <CoreOrb className="absolute -inset-2" energy={thinking ? 0.9 : 0.3} rings={false} halo={false} />
              </Suspense>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">FinSight advisor</p>
              <p className="text-[11px] text-fg-faint">{thinking ? 'Thinking…' : 'Saved to your conversations'}</p>
            </div>
            <Link to="/advisor" onClick={() => setOpen(false)} title="Open full advisor" className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint hover:text-fg">
              <Maximize2 className="h-4 w-4" />
            </Link>
            <button onClick={() => setOpen(false)} title="Close" className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </div>
          <AgentChat compact conversationId={conversationId} onConversation={(id) => setConversationId(id)}
            onThinking={setThinking} className="min-h-0 flex-1" />
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close advisor' : 'Open advisor'}
        className="fixed bottom-5 right-4 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-brand-300 to-brand-500 text-ink-950 shadow-[0_16px_40px_-12px_rgba(212,175,55,0.7)] sm:right-6"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        {!open && <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-brand-400/30 [animation-duration:2.4s]" />}
      </button>
    </>
  );
}
