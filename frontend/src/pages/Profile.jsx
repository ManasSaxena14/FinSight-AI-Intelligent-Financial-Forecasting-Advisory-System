import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { expenseService } from '../api/expenseService';
import { User, Mail, ShieldCheck, CreditCard, LogOut, Sparkles, History, IndianRupee, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);

  const handleLogout = () => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/20">
            <LogOut className="h-4 w-4 text-rose-500" />
          </div>
          <p className="font-black text-[10px] uppercase tracking-[0.2em] text-white">Terminate Session?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              logout();
              toast.success('Signed out successfully');
              navigate('/login');
            }}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-500/20"
          >
            Confirm
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'bottom-right',
      style: {
        minWidth: '240px',
        padding: '20px',
      }
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await expenseService.getExpenses();
        setExpenses(data);
      } catch (err) {
        console.error("Failed to load expense history", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-10 relative" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">Your profile</h1>
          <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide italic">Your account and sign-in details.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-500/5">
          <ShieldCheck className="w-4 h-4" />
          System Authenticated
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        {/* Left Column - User Info */}
        <Card className="lg:col-span-2 glass-card border-none bg-black/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-10 pb-0 flex flex-row items-center gap-6">
            <div className="h-20 w-20 rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-2xl shadow-brand-500/20 group">
              <User className="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-text-primary italic tracking-tight">{user.name || 'Account Holder'}</CardTitle>
              <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.3em] mt-1">Signed in as {user.name || 'Guest'}</p>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-12 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-2 px-1">Email Hash</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all group-hover:border-white/10 overflow-hidden">
                  <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="text-sm font-medium text-text-secondary truncate">{user.email}</span>
                </div>
              </div>
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-2 px-1">User ID</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 transition-all group-hover:border-white/10 overflow-hidden">
                  <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                  <span className="text-[10px] font-mono text-text-tertiary truncate lowercase">{user.id || 'SYNC_PHASE_ACTIVE'}</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-500/5 to-transparent border border-brand-500/10 space-y-4 relative overflow-hidden group/insight">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/insight:opacity-[0.1] transition-opacity">
                <ShieldCheck size={40} className="text-brand-500" />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">Account security</p>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed font-medium relative z-10">
                Your account uses a secure, encrypted connection when you sign in and use the app.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Membership & Actions */}
        <div className="space-y-10">
          <Card className="glass-card border-none bg-gradient-to-br from-brand-500/10 via-black/20 to-transparent shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 text-center space-y-8">
              <div className="mx-auto h-20 w-20 rounded-[2rem] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Plan</p>
                <h3 className="text-2xl font-black text-text-primary italic tracking-tight uppercase">Standard</h3>
                <p className="text-[9px] font-bold text-brand-500 uppercase tracking-[0.2em] mt-2">Active</p>
              </div>
              <Button onClick={() => window.location.href='/plans'} variant="secondary" className="w-full py-4 rounded-2xl border-brand-500/20 text-brand-400 font-black hover:bg-brand-500/10 transition-all text-[10px] uppercase tracking-widest">
                Optimize Access
              </Button>
            </CardContent>
          </Card>

          <Button 
            onClick={handleLogout}
            className="w-full h-16 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            Terminate Session
          </Button>
        </div>
      </div>

      {/* Fiscal Archive Section */}
      <div className="relative z-10 space-y-8 pt-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
            <History className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-text-primary tracking-tighter italic">Fiscal Archive.</h3>
            <p className="text-[10px] text-text-tertiary uppercase font-black tracking-widest mt-1">Audit trail for historical financial ledgers.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-text-tertiary text-[10px] uppercase font-black tracking-widest animate-pulse italic">
            Synchronizing historical datasets...
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center bg-black/20 rounded-[3rem] border border-white/5">
             <p className="text-[10px] text-text-tertiary uppercase font-black tracking-[0.3em]">No historical audit trails detected.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expenses.map((entry) => (
              <div key={entry.id} className="glass-card bg-black/20 p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Calendar size={60} />
                </div>
                <div className="flex flex-col h-full space-y-6">
                  <div className="flex items-center justify-between">
                     <p className="text-xl font-black text-text-primary italic tracking-tight">{entry.month}</p>
                     <div className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[8px] font-black uppercase text-brand-400 tracking-widest">Verified</div>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Aggregate Income</span>
                       <span className="text-sm font-black text-text-primary italic font-mono">₹{entry.income?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Total Spending</span>
                       <span className="text-sm font-black text-rose-400 italic font-mono">₹{entry.total_expense?.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-brand-500/70 uppercase tracking-widest">Net Surplus</span>
                       <span className={`text-md font-black italic font-mono ${entry.savings >= 0 ? 'text-brand-400' : 'text-rose-500'}`}>
                          ₹{entry.savings?.toLocaleString()}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 opacity-30 pt-10">
        <div className="h-px w-12 bg-text-tertiary" />
        <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.5em]">
          Industry-standard security practices
        </p>
        <div className="h-px w-12 bg-text-tertiary" />
      </div>
    </div>
  );
}

