import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { premiumService } from '../api/premiumService';
import { expenseService } from '../api/expenseService';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'advisor', text: 'Hi! I am your FinSight AI Advisor. How can I help you optimize your finances today?' }
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
          const latest = data[0]; // grab most recent
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

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await premiumService.sendChatMessage(userMessage, context);
      setMessages(prev => [...prev, { role: 'advisor', text: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'advisor', text: 'I encountered a connection synchronized issue. Please verify your network and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 p-4 bg-brand-600 text-white rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-white/10"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      <div 
        ref={chatRef}
        className="fixed bottom-28 right-8 w-[380px] h-[550px] glass border border-white/10 rounded-[2rem] shadow-2xl flex-col overflow-hidden z-50 flex shadow-black/60 ring-1 ring-white/5"
        style={{ display: 'none' }}
      >
        {/* Header */}
        <div className="bg-zinc-950/40 backdrop-blur-2xl p-6 text-white flex items-center gap-4 border-b border-white/5">
          <div className="bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Bot className="w-6 h-6 text-brand-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">FinSight AI Advisor</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_#10b981]"></span>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Neural Agent Active</p>
            </div>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/20 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 rounded-xl p-2 border ${msg.role === 'user' ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed font-medium ${
                msg.role === 'user' 
                  ? 'bg-zinc-100 text-zinc-950 rounded-tr-none shadow-lg' 
                  : 'bg-zinc-800/40 border border-white/5 text-zinc-200 rounded-tl-none backdrop-blur-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl p-2 bg-brand-500/10 border border-brand-500/20 text-brand-400"><Bot className="w-4 h-4" /></div>
              <div className="p-4 bg-zinc-800/40 border border-white/5 rounded-2xl rounded-tl-none flex gap-1.5 backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-500/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-5 bg-zinc-950/40 backdrop-blur-3xl border-t border-white/5 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-zinc-900/60 border border-white/10 rounded-2xl px-5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-zinc-600 font-medium"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="p-3.5 bg-brand-600 text-white rounded-2xl hover:bg-brand-500 disabled:opacity-30 disabled:hover:bg-brand-600 transition-all active:scale-95 shadow-lg shadow-brand-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </>
  );
}
