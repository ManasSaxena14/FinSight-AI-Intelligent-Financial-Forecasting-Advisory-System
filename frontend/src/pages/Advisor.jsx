import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, BrainCircuit, Check, Languages, MessageSquare, Pencil, Plus, Trash2, Wrench, X } from 'lucide-react';
import { advisorService, aiService } from '../api/aiService';
import AgentChat from '../components/advisor/AgentChat';
import { Badge, Button, Panel } from '../components/ui';
import { cn } from '../lib/cn';
import { gsap, splitReveal } from '../lib/motion';

const CoreOrb = lazy(() => import('../three/CoreOrb'));

const LANGS = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish' },
];

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ConversationItem({ convo, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(convo.title);
  return (
    <li className={cn('group rounded-xl border transition', active ? 'border-line-strong bg-white/[0.05]' : 'border-transparent hover:bg-white/[0.03]')}>
      {editing ? (
        <form className="flex items-center gap-1 p-1.5" onSubmit={(e) => { e.preventDefault(); onRename(title); setEditing(false); }}>
          <input autoFocus value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="field h-8 flex-1 px-2 text-[13px]" aria-label="Conversation title" />
          <button type="submit" className="grid h-7 w-7 place-items-center rounded-lg text-pos" aria-label="Save title"><Check className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setEditing(false)} className="grid h-7 w-7 place-items-center rounded-lg text-fg-faint" aria-label="Cancel"><X className="h-3.5 w-3.5" /></button>
        </form>
      ) : (
        <div className="flex items-center gap-1 pr-1">
          <button onClick={onSelect} className="min-w-0 flex-1 px-3 py-2.5 text-left">
            <p className="truncate text-[13px] text-fg">{convo.title}</p>
            <p className="truncate text-[11px] text-fg-faint">{timeAgo(convo.updated_at)} · {convo.preview || `${convo.messages} messages`}</p>
          </button>
          <button onClick={() => setEditing(true)} aria-label="Rename" className="grid h-7 w-7 place-items-center rounded-lg text-fg-faint opacity-0 hover:text-fg focus:opacity-100 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} aria-label="Delete" className="grid h-7 w-7 place-items-center rounded-lg text-fg-faint opacity-0 hover:text-neg focus:opacity-100 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </li>
  );
}

export default function Advisor() {
  const [thinking, setThinking] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [chatKey, setChatKey] = useState(0);
  const [language, setLanguage] = useState('auto');
  const rootRef = useRef(null);
  const titleRef = useRef(null);

  const loadConversations = useCallback(() => advisorService.listConversations().then(setConversations).catch(() => {}), []);

  useEffect(() => {
    loadConversations();
    aiService.getPreferences().then((p) => setLanguage(p.language)).catch(() => {});
  }, [loadConversations]);

  useLayoutEffect(() => {
    let split;
    const ctx = gsap.context(() => {
      split = splitReveal(titleRef.current, { delay: 0.05 });
      gsap.from('[data-advisor-in]', { opacity: 0, y: 24, stagger: 0.08, duration: 1, delay: 0.15 });
    }, rootRef);
    return () => { ctx.revert(); split?.revert(); };
  }, []);

  const newChat = () => { setActiveId(null); setChatKey((k) => k + 1); };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    try {
      await aiService.setLanguage(lang);
      toast.success(`Advisor language: ${LANGS.find((l) => l.id === lang).label}`);
    } catch {
      toast.error('Could not save language');
    }
  };

  const remove = async (id) => {
    try {
      await advisorService.deleteConversation(id);
      if (id === activeId) newChat();
      loadConversations();
    } catch {
      toast.error('Could not delete the conversation');
    }
  };

  const rename = async (id, title) => {
    try {
      await advisorService.renameConversation(id, title);
      loadConversations();
    } catch {
      toast.error('Could not rename');
    }
  };

  return (
    <div ref={rootRef} className="space-y-6">
      <section className="relative grid items-center gap-4 md:grid-cols-[1fr_auto]">
        <div className="relative z-10">
          <p className="eyebrow mb-3" data-advisor-in>AI Advisor</p>
          <h1 ref={titleRef} className="text-[34px] font-medium leading-[1.03] tracking-[-0.035em] sm:text-[46px]">
            Ask anything about <span className="display italic text-gold-gradient">your money.</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-2" data-advisor-in>
            <Badge tone="ai"><BrainCircuit className="h-3 w-3" /> Tool-using agent · GPT-OSS 120B</Badge>
            <Badge><BookOpen className="h-3 w-3" /> Cites an Indian finance knowledge base</Badge>
            <Badge><Wrench className="h-3 w-3" /> Proposes, never saves without you</Badge>
          </div>
        </div>
        <div className="relative hidden h-[150px] w-[220px] md:block" data-advisor-in>
          <Suspense fallback={null}>
            <CoreOrb className="absolute inset-0" energy={thinking ? 1 : 0.35} color={thinking ? '#a78bfa' : '#d4af37'} rings={false} />
          </Suspense>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel className="flex max-h-[min(760px,calc(100dvh-8rem))] flex-col overflow-hidden" data-advisor-in>
          <div className="flex items-center justify-between gap-2 border-b border-line p-3">
            <p className="flex items-center gap-2 pl-1 text-sm text-fg"><MessageSquare className="h-4 w-4 text-fg-faint" /> Conversations</p>
            <Button size="sm" variant="secondary" onClick={newChat}><Plus className="h-3.5 w-3.5" /> New</Button>
          </div>
          <ul className="max-h-60 flex-1 space-y-1 overflow-y-auto p-2 lg:max-h-none">
            {conversations.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-faint">Your chats will be saved here.</li>}
            {conversations.map((c) => (
              <ConversationItem key={c.id} convo={c} active={c.id === activeId}
                onSelect={() => setActiveId(c.id)} onDelete={() => remove(c.id)} onRename={(t) => rename(c.id, t)} />
            ))}
          </ul>
          <div className="border-t border-line p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-fg-faint"><Languages className="h-3.5 w-3.5" /> Reply language</p>
            <div role="radiogroup" aria-label="Reply language" className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-white/[0.02] p-1">
              {LANGS.map((l) => (
                <button key={l.id} role="radio" aria-checked={language === l.id} onClick={() => changeLanguage(l.id)}
                  className={cn('h-7 rounded-lg text-[11.5px] transition', language === l.id ? 'bg-white/[0.08] text-fg' : 'text-fg-muted hover:text-fg')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="flex h-[min(760px,calc(100dvh-8rem))] flex-col overflow-hidden" data-advisor-in>
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className={`h-2 w-2 rounded-full ${thinking ? 'animate-pulse bg-ai' : 'bg-pos'}`} />
            <p className="truncate text-sm text-fg">{conversations.find((c) => c.id === activeId)?.title || 'New conversation'}</p>
            <span className="ml-auto hidden text-xs text-fg-faint sm:block">Enter to send · Shift+Enter for a new line</span>
          </div>
          <AgentChat
            key={chatKey}
            conversationId={activeId}
            language={language}
            onThinking={setThinking}
            onConversation={(id) => { setActiveId(id); loadConversations(); }}
            className="min-h-0 flex-1"
          />
        </Panel>
      </section>
    </div>
  );
}
