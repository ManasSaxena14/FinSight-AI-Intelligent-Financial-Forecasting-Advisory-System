import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Check, ExternalLink, Loader2, Sparkles, Square, User, X } from 'lucide-react';
import { advisorService } from '../../api/aiService';
import { cn } from '../../lib/cn';
import { gsap } from '../../lib/motion';
import { FeedbackButtons } from '../ui';
import AdvisorCard from './Cards';
import Markdown from './Markdown';
import VoiceButton from './VoiceButton';

const WELCOME = "Hi! I'm your FinSight advisor. I can read your numbers, run what-ifs, plan goals, find subscriptions, and answer money questions with sources. Ask in English, Hindi or Hinglish.";

function SourcePreview({ source, onClose }) {
  const url = (source.sources || '').split(',').map((s) => s.trim()).find((s) => s.startsWith('http'));
  return (
    <div className="mt-2 rounded-xl border border-ai/25 bg-ai/[0.06] p-3 text-[12.5px]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-fg"><span className="mr-1.5 text-ai">[{source.ref}]</span>{source.title} · {source.section}</p>
        <button onClick={onClose} aria-label="Close source" className="text-fg-faint hover:text-fg"><X className="h-3.5 w-3.5" /></button>
      </div>
      <p className="mt-1.5 leading-relaxed text-fg-muted">{source.snippet}…</p>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-fg-faint">
        {source.as_of && <span>As of {source.as_of}</span>}
        {url && <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ai hover:underline">{url.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" /></a>}
      </p>
    </div>
  );
}

function ToolChips({ tools }) {
  if (!tools?.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {tools.map((t, i) => (
        <span key={`${t.name}-${i}`} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]',
          t.status === 'running' ? 'border-ai/30 bg-ai/10 text-ai' : t.status === 'error' ? 'border-warn/30 text-warn' : 'border-line text-fg-faint')}>
          {t.status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : t.status === 'error' ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          {t.label}
        </span>
      ))}
    </div>
  );
}

function Message({ msg, streaming, conversationId }) {
  const [rating, setRating] = useState(msg.feedback?.rating || null);
  const ref = useRef(null);
  const [openRef, setOpenRef] = useState(null);
  useLayoutEffect(() => { gsap.from(ref.current, { opacity: 0, y: 10, duration: 0.5 }); }, []);
  const isUser = msg.role === 'user';
  const sources = msg.sources || [];
  const open = sources.find((s) => s.ref === openRef);
  const cards = (msg.cards || []).filter((c, _, all) => c.type !== 'snapshot' || all.length === 1);

  return (
    <div ref={ref} className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
        isUser ? 'border-line bg-white/[0.04] text-fg-muted' : 'border-brand-500/30 bg-brand-500/10 text-brand-300')}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn('min-w-0', isUser ? 'max-w-[85%]' : 'max-w-[92%] flex-1')}>
        {!isUser && <ToolChips tools={msg.tools} />}
        {(msg.text || streaming || isUser) && (
          <div className={cn('rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
            isUser ? 'rounded-tr-md bg-fg text-ink-950' : 'rounded-tl-md border border-line bg-white/[0.03] text-fg-muted')}>
            {isUser ? <p className="whitespace-pre-wrap">{msg.text}</p> : msg.text ? <Markdown text={msg.text} onCite={(n) => setOpenRef(openRef === n ? null : n)} /> : null}
            {streaming && !msg.text && (
              <span className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400/70" style={{ animationDelay: `${i * 120}ms` }} />)}</span>
            )}
            {streaming && msg.text && <span className="caret" />}
            {msg.source === 'fallback' && <p className="mt-2 text-[11px] text-fg-faint">Offline answer — the AI model was unavailable.</p>}
          </div>
        )}
        {open && <SourcePreview source={open} onClose={() => setOpenRef(null)} />}
        {!isUser && sources.length > 0 && !open && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <button key={s.ref} onClick={() => setOpenRef(s.ref)}
                className="inline-flex max-w-[260px] items-center gap-1.5 truncate rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[11px] text-fg-muted hover:border-ai/40 hover:text-fg">
                <BookOpen className="h-3 w-3 shrink-0 text-ai" /><span className="truncate">[{s.ref}] {s.title}</span>
              </button>
            ))}
          </div>
        )}
        {cards.length > 0 && <div className="mt-3 space-y-3">{cards.map((c, i) => <AdvisorCard key={i} card={c} />)}</div>}
        {!isUser && !streaming && msg.id && conversationId && (
          <FeedbackButtons className="mt-1.5" value={rating} label="this answer"
            onRate={async (r) => {
              if (r === 'clear') return;
              await advisorService.feedback(conversationId, msg.id, r);
              setRating(r);
            }} />
        )}
      </div>
    </div>
  );
}

/**
 * Agent chat bound to a saved conversation. Pass conversationId to resume one;
 * onConversation(id, title) fires when a new one is created by the first send.
 */
export default function AgentChat({ conversationId, onConversation, onThinking, compact = false, className, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const activeIdRef = useRef(conversationId || null);
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load an existing conversation (unless we just created it ourselves).
  useEffect(() => {
    if (conversationId === activeIdRef.current && messages.length) return;
    activeIdRef.current = conversationId || null;
    abortRef.current?.abort();
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    setLoading(true);
    advisorService.getConversation(conversationId)
      .then((c) => { if (!cancelled) setMessages(c.messages.map((m) => ({ ...m, cards: m.cards || [], sources: m.sources || [], tools: m.tools || [] }))); })
      .catch(() => { if (!cancelled) setMessages([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => { advisorService.suggestions().then(setSuggestions).catch(() => {}); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = useCallback((fn) => setMessages((prev) => {
    const next = prev.slice();
    next[next.length - 1] = fn(next[next.length - 1]);
    return next;
  }), []);

  const send = async (text) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    onThinking?.(true);
    setMessages((prev) => [...prev, { role: 'user', text: message }, { role: 'assistant', text: '', cards: [], sources: [], tools: [] }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await advisorService.chat(message, activeIdRef.current, {
        signal: controller.signal,
        onEvent: (e) => {
          if (e.type === 'meta') {
            if (activeIdRef.current !== e.conversation_id) {
              activeIdRef.current = e.conversation_id;
              onConversation?.(e.conversation_id, e.title);
            }
          } else if (e.type === 'token') {
            patchLast((m) => ({ ...m, text: m.text + e.text }));
          } else if (e.type === 'tool') {
            patchLast((m) => {
              const tools = m.tools.filter((t) => !(t.name === e.name && t.status === 'running'));
              return { ...m, tools: [...tools, { name: e.name, label: e.label, status: e.status }] };
            });
          } else if (e.type === 'card') {
            patchLast((m) => ({ ...m, cards: [...m.cards, e.card] }));
          } else if (e.type === 'sources') {
            patchLast((m) => ({ ...m, sources: [...m.sources, ...e.items] }));
          } else if (e.type === 'saved') {
            patchLast((m) => ({ ...m, id: e.message_id }));
          } else if (e.type === 'done') {
            patchLast((m) => ({ ...m, source: e.source }));
          }
        },
      });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        patchLast((m) => ({ ...m, text: m.text || 'Something went wrong reaching the advisor. Please try again.' }));
      }
    } finally {
      setBusy(false);
      onThinking?.(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  const empty = !loading && messages.length === 0;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div ref={listRef} className={cn('flex-1 space-y-5 overflow-y-auto', compact ? 'p-4' : 'p-5 sm:p-6')}>
        {loading && <div className="flex justify-center py-10 text-fg-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {empty && (
          <>
            <Message msg={{ role: 'assistant', text: WELCOME }} />
            <div className="flex flex-wrap gap-2 pl-10">
              {suggestions.slice(0, compact ? 4 : 6).map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-left text-[13px] text-fg-muted transition hover:border-brand-500/40 hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <Message key={i} msg={m} conversationId={activeIdRef.current}
            streaming={busy && i === messages.length - 1 && m.role === 'assistant'} />
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className={cn('border-t border-line', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-end gap-1.5 rounded-2xl border border-line bg-white/[0.03] p-1.5 pl-4 transition focus-within:border-brand-500/50">
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask, or log: “450 on Swiggy today”…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-fg outline-none placeholder:text-fg-faint"
          />
          <VoiceButton language={language} onText={(t) => setInput((v) => (v ? `${v} ${t}` : t))} />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} title="Stop" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-fg">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} title="Send"
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 text-ink-950 transition disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-fg-faint">Educational guidance, not investment, tax or legal advice. Entries are only saved when you confirm.</p>
      </form>
    </div>
  );
}
