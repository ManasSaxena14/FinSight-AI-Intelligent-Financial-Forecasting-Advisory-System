import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import { expenseService } from '../api/expenseService';
import { Card, CardContent } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { 
  Wallet, ChevronRight, Calendar, Banknote, 
  Utensils, Car, Home, ShoppingBag, Zap, Clapperboard,
  CheckCircle2, Sparkles, ShieldCheck, ArrowRight, Brain,
  Info, Cpu, Lock
} from 'lucide-react';

const CATEGORIES = [
  { name: "Food", icon: Utensils, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", glow: "shadow-orange-500/20" },
  { name: "Travel", icon: Car, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", glow: "shadow-blue-500/20" },
  { name: "Rent", icon: Home, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "shadow-emerald-500/20" },
  { name: "Shopping", icon: ShoppingBag, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", glow: "shadow-purple-500/20" },
  { name: "Bills", icon: Zap, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", glow: "shadow-rose-500/20" },
  { name: "Entertainment", icon: Clapperboard, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", glow: "shadow-amber-500/20" }
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MotionDiv = motion.div;

export default function AddExpense() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState({
    Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: ''
  });

  useEffect(() => {
    if (!success) {
      const ctx = gsap.context(() => {
        gsap.from(".animate-field", {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          delay: 0.2
        });
      }, formRef);
      return () => ctx.revert();
    }
  }, [success]);

  const handleExpenseChange = (category, value) => {
    setExpenses(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const parsedIncome = parseFloat(income);
    const parsedExpenses = Object.fromEntries(
      Object.entries(expenses).map(([k, v]) => [k, parseFloat(v) || 0])
    );
    const totalExpense = Object.values(parsedExpenses).reduce((sum, val) => sum + val, 0);

    if (!Number.isFinite(parsedIncome) || parsedIncome <= 0) {
      const msg = 'Income must be greater than 0.';
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
      return;
    }
    if (totalExpense <= 0) {
      const msg = 'Add at least one expense greater than 0.';
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
      return;
    }

    const payload = {
      month,
      income: parsedIncome,
      expenses: parsedExpenses
    };

    try {
      await expenseService.addExpense(payload);
      toast.success('Expenses saved');
      // Notify other views (Dashboard, Analytics, Advisor, etc.)
      // so they can refetch and recompute AI summaries instantly.
      try {
        window.dispatchEvent(new Event('expenses:updated'));
      } catch {
        // window may not exist in some environments; ignore.
      }
      setSuccess(true);
      setIncome('');
      setExpenses({ Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: '' });
    } catch (err) {
      console.error('Submission failed:', err);
      const errorMessage = err.response?.data?.detail || 'Could not save. Check you are signed in and try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      gsap.fromTo(formRef.current, { x: -4 }, { x: 4, duration: 0.08, yoyo: true, repeat: 5, ease: "power1.inOut" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-16 py-12 px-6 lg:px-8 relative" ref={formRef}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.05),transparent_50%)] pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {!success ? (
          <MotionDiv
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            transition={{ duration: 0.6, ease: "circOut" }}
            className="space-y-16"
          >
            {/* ── High-Impact Header ────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12 animate-field">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 text-brand-500 animate-pulse" />
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.6em]">Add spending</span>
                </div>
                <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter italic leading-[0.85]">
                  Add your <span className="text-brand-500">monthly data</span>
                </h1>
                <p className="text-lg text-text-secondary font-medium tracking-tight max-w-2xl">
                  Enter income and expenses so forecasts, your health score, and tips stay up to date.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6 shadow-2xl">
                  <div className="h-12 w-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-brand-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest">Connection</p>
                    <p className="text-sm font-black text-white italic">Secure</p>
                  </div>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* ── Primary Form Core ────────────────────────────────────────── */}
              <div className="lg:col-span-8 space-y-12 animate-field">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Temporal Cycle Selector */}
                  <div className="group space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <Calendar className="h-4 w-4 text-brand-400" />
                      <label className="text-[11px] font-black text-white uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Month</label>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full h-20 rounded-[2rem] bg-white/[0.03] border-2 border-white/5 px-8 text-xl text-white font-black appearance-none focus:outline-none focus:border-brand-500/50 focus:ring-8 focus:ring-brand-500/5 transition-all cursor-pointer hover:bg-white/[0.06] shadow-2xl"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                      >
                        {MONTHS.map(m => <option key={m} value={m} className="bg-[#0a0a0a] text-white">{m}</option>)}
                      </select>
                      <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-brand-500 rotate-90 pointer-events-none group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  {/* Asset Liquidity Input */}
                  <div className="group space-y-4">
                    <div className="flex items-center gap-3 px-2">
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <label className="text-[11px] font-black text-white uppercase tracking-[0.4em] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Income (₹)</label>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                        placeholder="[ 000,000.00 ]"
                        className="w-full h-20 rounded-[2rem] bg-white/[0.03] border-2 border-white/5 px-8 text-2xl text-white font-black placeholder:text-white/10 placeholder:italic placeholder:tracking-widest focus:border-emerald-500/50 focus:ring-8 focus:ring-emerald-500/5 transition-all shadow-2xl pulsing-placeholder"
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-500/30 font-black text-xs uppercase tracking-widest pointer-events-none">Credits</div>
                    </div>
                  </div>
                </div>

                {/* Expense Matrix Grid */}
                <div className="space-y-8">
                  <div className="flex items-center gap-6 px-2">
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Spending by category</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.name} className="group/item relative">
                        <div className={cn(
                          "absolute inset-0 rounded-[2.5rem] bg-gradient-to-br opacity-0 group-hover/item:opacity-5 transition-opacity duration-500",
                          cat.bg
                        )} />
                        <Card className="glass-card border-none bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 transition-all duration-500 group-hover/item:bg-white/[0.04] group-hover/item:translate-y-[-4px] group-hover/item:shadow-2xl">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 group-hover/item:scale-110",
                                  cat.bg, cat.border, cat.glow
                                )}>
                                  <cat.icon className={cn("h-6 w-6", cat.color)} />
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest group-hover/item:text-brand-400 transition-colors">{cat.name}</h3>
                              </div>
                              {expenses[cat.name] > 0 && (
                                <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                              )}
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={expenses[cat.name]}
                                onChange={(e) => handleExpenseChange(cat.name, e.target.value)}
                                placeholder="[ 0.00 ]"
                                className="h-14 bg-transparent border-b-2 border-white/5 rounded-none px-0 text-xl font-black text-white focus:border-brand-500 transition-all placeholder:text-white/10 placeholder:italic placeholder:tracking-widest pulsing-placeholder"
                              />
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-tertiary uppercase tracking-widest opacity-0 group-hover/item:opacity-100 transition-opacity">Amount</span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Sidebar Context & Action ─────────────────────────────────── */}
              <div className="lg:col-span-4 space-y-8 animate-field">
                <div className="sticky top-12 space-y-8">
                  <Card className="glass-card border-none bg-gradient-to-br from-brand-500/10 to-transparent border border-brand-500/20 rounded-[3rem] p-10 shadow-3xl overflow-hidden relative group">
                    <div className="absolute -right-8 -top-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                      <Brain className="h-48 w-48 text-brand-500" />
                    </div>
                    <div className="relative z-10 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Info className="h-4 w-4 text-brand-400" />
                          <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.4em]">Before you save</h3>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed font-medium">
                          Saving updates your monthly totals and feeds forecasts and AI insights. You can add more entries for the same month later.
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        isLoading={isLoading} 
                        className="w-full h-20 rounded-[2rem] bg-white text-black hover:bg-brand-500 hover:text-black font-black uppercase tracking-[0.4em] text-[13px] shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.03] active:scale-[0.97] group flex items-center justify-center gap-4"
                      >
                        Save
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                      </Button>

                      {error && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 uppercase tracking-widest text-center">
                          {error}
                        </div>
                      )}
                    </div>
                  </Card>

                  <div className="px-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.3em]">Service ready</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.3em]">Encryption: AES-256</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </MotionDiv>
        ) : (
          <MotionDiv
            key="success"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            className="flex flex-col items-center justify-center py-32 text-center space-y-12"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/30 blur-[100px] rounded-full animate-pulse" />
              <div className="relative h-32 w-32 rounded-[3rem] bg-white text-black flex items-center justify-center shadow-3xl rotate-12">
                <CheckCircle2 className="h-16 w-12 -rotate-12" />
              </div>
            </div>
            
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-6xl lg:text-8xl font-black text-white italic tracking-tighter leading-none">
                Saved <span className="text-brand-500">successfully</span>
              </h2>
              <p className="text-xl text-text-secondary font-medium tracking-tight">
                Your numbers are stored. Forecasts and summaries will refresh shortly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-8">
              <Button 
                onClick={() => setSuccess(false)}
                className="h-16 px-12 rounded-2xl border-2 border-white/10 bg-white/5 text-white font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 transition-all shadow-2xl"
              >
                Add another
              </Button>
              <Button 
                onClick={() => navigate('/analytics')}
                className="h-16 px-12 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-[0.3em] text-[11px] hover:bg-brand-400 shadow-[0_20px_40px_rgba(212,175,55,0.2)] transition-all"
              >
                View analytics
              </Button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
