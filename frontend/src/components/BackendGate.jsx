import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ServerCog } from 'lucide-react';
import { API_URL } from '../api/client';
import { LogoMark } from './Logo';

const POLL_MS = 3000;
const REQUEST_TIMEOUT_MS = 8000;
const GIVE_UP_MS = 3 * 60 * 1000;      // free hosts can take 60-90 s to wake; stop nagging after 3 min
const FRESH_MS = 10 * 60 * 1000;       // a successful check this recent means the server is still awake
const KEEPALIVE_MS = 9 * 60 * 1000;    // ping while the app is open so the host doesn't go back to sleep
const STORAGE_KEY = 'finsight:backend-ok-at';

const readStamp = () => {
  try { return Number(sessionStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
};
const writeStamp = () => {
  try { sessionStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* storage unavailable */ }
};

async function pingBackend() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal, cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const STEPS = [
  'Contacting the server',
  'Waking it up (free hosting sleeps when idle)',
  'Connecting to the database',
  'Almost there',
];

/**
 * Holds the whole app back until the API answers /api/health, so the interface
 * never loads against a sleeping backend. A recent success skips the wait.
 */
export default function BackendGate({ children }) {
  const [ready, setReady] = useState(() => Date.now() - readStamp() < FRESH_MS);
  const [failed, setFailed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(Date.now());

  // Wait for the backend (or re-check quietly in the background if we think it's awake).
  useEffect(() => {
    let cancelled = false;
    let timer;
    startedRef.current = Date.now();

    const tick = async () => {
      const ok = await pingBackend();
      if (cancelled) return;
      if (ok) {
        writeStamp();
        setFailed(false);
        setReady(true);
        try {
          const token = localStorage.getItem('token');
          if (!token || window.location.pathname === '/login' || window.location.pathname === '/register') {
            if (window.location.pathname !== '/welcome') {
              window.location.replace('/welcome');
            }
          }
        } catch {
          /* storage unavailable */
        }
        return;
      }
      if (ready) {
        // Looked awake from a recent visit but isn't: fall back to the waiting screen.
        setReady(false);
      }
      if (Date.now() - startedRef.current > GIVE_UP_MS) {
        setFailed(true);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Seconds counter for the waiting screen.
  useEffect(() => {
    if (ready || failed) return undefined;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [ready, failed, attempt]);

  // Keep the host awake while someone is using the app.
  useEffect(() => {
    if (!ready) return undefined;
    const id = setInterval(async () => { if (await pingBackend()) writeStamp(); }, KEEPALIVE_MS);
    return () => clearInterval(id);
  }, [ready]);

  const retry = useCallback(() => {
    setFailed(false);
    setSeconds(0);
    setAttempt((a) => a + 1);
  }, []);

  if (ready) return children;

  const step = Math.min(STEPS.length - 1, Math.floor(seconds / 12));
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink-900 px-6 text-fg">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[60vh] w-[60vw] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-[140px]" />
      </div>
      <div className="relative w-full max-w-sm text-center" role="status" aria-live="polite">
        <div className="relative mx-auto mb-8 w-fit">
          {!failed && <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/20 [animation-duration:2s]" />}
          <LogoMark size={64} animate className="relative" />
        </div>

        {failed ? (
          <>
            <ServerCog className="mx-auto mb-3 h-6 w-6 text-warn" strokeWidth={1.5} />
            <h1 className="text-xl font-medium tracking-tight">The server isn't responding</h1>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              It may still be starting up, or there may be a connection problem. Your data is safe.
            </p>
            <button onClick={retry}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 px-5 text-sm font-medium text-ink-950">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium tracking-tight">Starting FinSight AI</h1>
            <p className="mt-2 text-sm text-fg-muted">{STEPS[step]}…</p>
            <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-[gate_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-brand-600 via-brand-300 to-brand-600" />
            </div>
            <p className="num mt-3 text-xs text-fg-faint">{seconds}s</p>
            {seconds >= 20 && (
              <p className="mx-auto mt-5 max-w-xs text-xs leading-relaxed text-fg-faint">
                The first visit after a quiet period can take up to a minute while the server wakes up.
                You won't need to do anything.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
