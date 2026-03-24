import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { expenseService } from '../api/expenseService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

// Matches the backend schema
const CATEGORIES = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AddExpense() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const successRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState({
    Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: ''
  });

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const handleExpenseChange = (category, value) => {
    setExpenses(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Transform string inputs to numbers & default 0 for empty strings
    const payload = {
      month,
      income: parseFloat(income) || 0,
      expenses: Object.fromEntries(
        Object.entries(expenses).map(([k, v]) => [k, parseFloat(v) || 0])
      )
    };

    try {
      await expenseService.addExpense(payload);
      setSuccess(true);
      
      // Animate success message
      setTimeout(() => {
        if (successRef.current) {
          gsap.fromTo(successRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
        }
      }, 50);

      // Reset form
      setIncome('');
      setExpenses({ Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: '' });
      
    } catch (err) {
      setError('Failed to add expense record. Please try again.');
      // Shake animation on error
      gsap.fromTo(formRef.current, 
        { x: -5 }, 
        { x: 5, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(formRef.current, {x: 0}) }
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-[80vh] items-center justify-center relative">
        <div className="absolute inset-0 bg-brand-500/5 blur-[120px] rounded-full" />
        <div ref={successRef} className="text-center space-y-8 relative z-10 glass-card p-12 rounded-[3rem] border border-brand-500/20 shadow-2xl shadow-brand-500/10">
          <div className="mx-auto h-24 w-24 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <svg className="h-12 w-12 text-brand-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white tracking-tight">Record Encrypted</h2>
            <p className="text-zinc-400 font-medium">Your financial data has been synchronized and secured.</p>
          </div>
          <div className="pt-4 flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => setSuccess(false)} className="px-8 py-3 rounded-xl border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-900 transition-all">Add Another</Button>
            <Button variant="primary" onClick={() => navigate('/')} className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black shadow-lg shadow-brand-500/20 transition-all">Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8" ref={formRef}>
      <header>
        <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Expand Ledger</h1>
        <p className="text-sm text-zinc-400 mt-1 font-medium">Capture your monthly financial snapshots for AI analysis.</p>
      </header>

      <Card className="glass-card border-none bg-zinc-900/40 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400 uppercase tracking-widest text-center">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Fiscal Month</label>
                <div className="relative">
                   <select
                    className="flex h-12 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 appearance-none transition-all shadow-inner"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {MONTHS.map(m => <option key={m} value={m} className="bg-zinc-950 text-zinc-100">{m}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <Input
                label="Total Gross Income / $"
                type="number"
                min="1"
                step="any"
                required
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="0.00"
                className="font-bold"
              />
            </div>

            <div>
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-b border-white/5 pb-4 mb-8">Category Allocation Profile</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                {CATEGORIES.map(category => (
                  <Input
                    key={category}
                    label={`${category} / outgoings`}
                    type="number"
                    min="0"
                    step="any"
                    value={expenses[category]}
                    onChange={(e) => handleExpenseChange(category, e.target.value)}
                    placeholder="0.00"
                    className="font-bold"
                  />
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end">
              <Button type="submit" isLoading={isLoading} className="w-full md:w-auto h-12 px-10 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]">
                Save Financial Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-center text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">
        Verified Ledger Sync • AES-256 Security
      </p>
    </div>
  );
}
