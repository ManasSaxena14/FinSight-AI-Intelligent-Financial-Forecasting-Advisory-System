import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { expenseService } from '../api/expenseService';
import { Card, CardContent } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

// Matches the backend schema
const CATEGORIES = ["Food", "Travel", "Rent", "Shopping", "Bills", "Entertainment"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AddExpense() {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form State
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState({
    Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: ''
  });

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
      
      // Reset form
      setIncome('');
      setExpenses({ Food: '', Travel: '', Rent: '', Shopping: '', Bills: '', Entertainment: '' });
      
    } catch (err) {
      setError('Failed to add expense record. Please try again.');
      // Shake animation on error (keeping GSAP for this specific effect as it's quick and clean)
      gsap.fromTo(".form-container", 
        { x: -5 }, 
        { x: 5, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(".form-container", {x: 0}) }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 relative py-10 px-4 sm:px-0">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
      
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="form-container space-y-10"
          >
            <header className="relative z-10">
              <h1 className="text-4xl sm:text-5xl font-black text-text-primary tracking-tighter italic">Ledger Entry.</h1>
              <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide italic">Track and synchronize your monthly spending with FinSight AI.</p>
            </header>

            <Card className="glass-card border-none bg-black/20 shadow-2xl rounded-[3rem] overflow-hidden relative z-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
              <CardContent className="p-8 sm:p-14">
                <form onSubmit={handleSubmit} className="space-y-12">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] text-center shadow-2xl"
                    >
                      {error}
                    </motion.div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] px-2">Select Month</label>
                      <div className="relative group">
                         <select
                          className="flex h-14 w-full rounded-2xl border border-white/5 bg-bg-panel/40 px-6 py-2 text-sm text-text-primary font-black focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/40 appearance-none transition-all shadow-2xl group-hover:border-white/10"
                          value={month}
                          onChange={(e) => setMonth(e.target.value)}
                        >
                          {MONTHS.map(m => <option key={m} value={m} className="bg-bg-base text-text-primary">{m}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary group-hover:text-brand-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Total Monthly Income (₹)"
                      type="number"
                      min="0"
                      step="any"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="0.00"
                      className="font-black h-14 rounded-2xl bg-bg-panel/40 border-white/5 focus:border-brand-500/40 focus:ring-brand-500/5"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-4 mb-10">
                       <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em]">Monthly Expenses</h4>
                       <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      {CATEGORIES.map((category, idx) => (
                        <Input
                          key={category}
                          label={`${category} Spending`}
                          type="number"
                          min="0"
                          step="any"
                          value={expenses[category]}
                          onChange={(e) => handleExpenseChange(category, e.target.value)}
                          placeholder="0.00"
                          className="font-black h-12 rounded-xl bg-bg-panel/20 border-white/5 focus:border-brand-500/30"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex justify-end">
                    <Button type="submit" isLoading={isLoading} className="w-full md:w-auto h-14 px-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 hover:scale-[1.02] text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-brand-500/20 transition-all active:scale-[0.98]">
                      Update Financial Records
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="flex h-[80vh] items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-brand-500/5 blur-[150px] rounded-full" />
            <div className="text-center space-y-10 relative z-10 glass-card p-12 sm:p-20 rounded-[4rem] border border-white/5 shadow-2xl shadow-brand-500/10 max-w-2xl w-full">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 12 }}
                className="mx-auto h-32 w-32 rounded-[3.5rem] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-2xl shadow-brand-500/20 group"
              >
                <svg className="h-16 w-16 text-brand-400 drop-shadow-[0_0_20px_rgba(212,175,55,0.8)] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black text-text-primary tracking-tighter italic">Record Processed.</h2>
                <p className="text-text-tertiary font-bold uppercase tracking-widest text-xs">Your monthly analytical footprint has been established.</p>
              </div>
              <div className="pt-10 flex flex-col sm:flex-row gap-5 justify-center px-4">
                <Button variant="secondary" onClick={() => setSuccess(false)} className="flex-1 py-5 rounded-2xl border-white/5 text-text-secondary font-black hover:bg-white/5 transition-all text-[10px] uppercase tracking-widest">New Entry</Button>
                <Button variant="primary" onClick={() => navigate('/analytics')} className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 hover:scale-[1.02] text-white font-black shadow-2xl shadow-blue-500/20 transition-all text-[10px] uppercase tracking-widest">Analytics</Button>
                <Button variant="primary" onClick={() => navigate('/')} className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 hover:scale-[1.02] text-black font-black shadow-2xl shadow-brand-500/20 transition-all text-[10px] uppercase tracking-widest">Console</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-6"
      >
         <div className="h-px w-12 bg-text-tertiary" />
         <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.5em]">
            ISO-27001 Certified • Neural Protocol
         </p>
         <div className="h-px w-12 bg-text-tertiary" />
      </motion.div>
    </div>
  );
}

