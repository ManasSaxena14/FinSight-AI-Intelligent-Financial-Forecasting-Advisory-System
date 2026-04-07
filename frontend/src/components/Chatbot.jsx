import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { MessageSquare, X, Send, Bot, User, Zap } from 'lucide-react';
import { premiumService } from '../api/premiumService';
import { expenseService } from '../api/expenseService';

const QUICK_PROMPTS = [
  { label: 'Savings Tip', message: 'How can I save more this month?' },
  { label: 'Budget Rule', message: 'Explain the 50/30/20 budget rule' },
  { label: 'Invest Advice', message: 'How should I start investing?' },
  { label: 'Reduce Debt', message: 'Best strategy to eliminate debt?' },
  { label: 'Emergency Fund', message: 'How large should my emergency fund be?' },
  { label: 'Credit Score', message: 'How do I improve my credit score?' },
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'advisor', text: 'Hi! I am your FinSight assistant. Ask about budgeting, saving, or debt—or tap a quick prompt below.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState(null);
  
  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch context once when opened
  useEffect(() => {
    if (isOpen && !context) {
      expenseService.getExpenses().then(data => {
        if (data && data.length > 0) {
          const latest = data[0];
          setContext({
            income: latest.income,
            expenses: latest.expenses,
            savings: latest.savings
          });
        }
      }).catch(err => console.error("Could not fetch context for chat", err));
    }
  }, [isOpen, context]);

  // Animate open/close
  useEffect(() => {
    if (chatRef.current) {
      if (isOpen) {
        gsap.fromTo(chatRef.current, 
          { y: 30, opacity: 0, scale: 0.9, filter: 'blur(10px)' }, 
          { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'back.out(1.2)', display: 'flex' }
        );
      } else {
        gsap.to(chatRef.current, { 
          y: 20, opacity: 0, scale: 0.95, filter: 'blur(10px)', duration: 0.3, ease: 'power2.in', 
          onComplete: () => { if (chatRef.current) chatRef.current.style.display = 'none'; }
        });
      }
    }
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    try {
      const response = await premiumService.sendChatMessage(text, context, history);
      setMessages(prev => [...prev, { role: 'advisor', text: response.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'advisor', text: 'I encountered a connection issue. Please verify your network and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    await sendMessage(inputText);
  };

  const handleQuickPrompt = (message) => {
    sendMessage(message);
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      {/* Toggle Button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 p-5 bg-gradient-to-br from-brand-400 to-brand-600 text-black rounded-[2rem] shadow-2xl shadow-brand-500/20 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-white/20 group hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-500 shadow-[0_0_10px_rgba(212,175,55,1)]"></span>
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div 
        ref={chatRef}
        id="chatbot-window"
        className="fixed bottom-28 right-8 w-[420px] h-[650px] glass-card border-none rounded-[3.5rem] shadow-2xl flex-col overflow-hidden z-50 flex shadow-black/80 ring-1 ring-white/5 bg-black/60 backdrop-blur-3xl"
        style={{ display: 'none' }}
      >
        {/* Header */}
        <div className="bg-bg-panel/40 p-8 text-white flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="bg-brand-500/10 p-4 rounded-[1.5rem] border border-brand-500/20 shadow-2xl shadow-brand-500/10">
              <Bot className="w-7 h-7 text-brand-400 drop-shadow-[0_0_10px_rgba(212,175,55,0.6)]" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tighter italic">AI assistant</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></span>
                <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.3em]">Online</p>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-text-tertiary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/10">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 rounded-[1.2rem] p-3 border shadow-2xl transition-transform hover:scale-105 duration-300 ${msg.role === 'user' ? 'bg-bg-panel/60 border-white/5 text-text-tertiary' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-5 rounded-[1.8rem] max-w-[80%] text-sm leading-relaxed font-medium shadow-2xl ${
                msg.role === 'user' 
                  ? 'bg-text-primary text-black rounded-tr-none tracking-tight' 
                  : 'bg-bg-panel/40 border border-white/5 text-text-secondary rounded-tl-none backdrop-blur-2xl'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-[1.2rem] p-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 shadow-2xl"><Bot className="w-4 h-4" /></div>
              <div className="p-6 bg-bg-panel/40 border border-white/5 rounded-[1.8rem] rounded-tl-none flex gap-2 backdrop-blur-2xl shadow-2xl">
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts — shown only when no conversation yet */}
        {showQuickPrompts && !isLoading && (
          <div className="px-6 py-3 border-t border-white/5 bg-bg-panel/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3 h-3 text-brand-500" />
              <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.25em]">Quick Prompts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleQuickPrompt(qp.message)}
                  className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-brand-500/20 bg-brand-500/5 text-brand-400 hover:bg-brand-500/15 hover:border-brand-500/40 transition-all active:scale-95"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-6 bg-bg-panel/40 backdrop-blur-3xl border-t border-white/5 flex gap-4">
          <input
            id="chatbot-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a money question…"
            className="flex-1 bg-black/20 border border-white/5 rounded-[1.5rem] px-6 py-4 text-sm text-text-primary focus:outline-none focus:border-brand-500/40 focus:ring-4 focus:ring-brand-500/5 transition-all placeholder:text-text-tertiary font-bold shadow-inner"
          />
          <button 
            type="submit" 
            id="chatbot-send-btn"
            disabled={!inputText.trim() || isLoading}
            className="p-4 bg-gradient-to-br from-brand-400 to-brand-600 text-black rounded-[1.5rem] hover:scale-105 disabled:opacity-20 transition-all active:scale-95 shadow-2xl shadow-brand-500/20 group"
          >
            <Send className="w-6 h-6 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </form>
      </div>
    </>
  );
}
