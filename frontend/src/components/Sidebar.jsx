import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, PieChart, Bot, LogOut, Hexagon, Crown, Target, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Add Expense', href: '/add-expense', icon: PlusCircle },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Financial Goals', href: '/goals', icon: Target },
  { name: 'AI Advisor', href: '/advisor', icon: Bot },
  { name: 'How It Works', href: '/how-it-works', icon: HelpCircle },
  { name: 'Membership', href: '/plans', icon: Crown },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-bg-panel/60 backdrop-blur-2xl border-r border-white/5 text-text-primary z-20 shadow-2xl relative">
      <div className="absolute inset-0 bg-noise" />
      
      {/* Brand logo area */}
      <div className="flex h-28 items-center px-4 border-b border-white/5 relative z-10 w-full mb-2">
        <div className="flex items-center w-full justify-center relative relative group cursor-pointer" onClick={() => navigate('/')}>
          {/* Subtle ambient glow behind the logo */}
          <div className="absolute inset-0 bg-white/15 blur-2xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
          <img 
            src="/LOGO_WITH_TAGLINE.png" 
            alt="FinSight AI Logo" 
            className="h-24 w-auto object-contain ml-[-1rem] relative z-10 transition-transform duration-300 group-hover:scale-[1.02] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-8 px-4 relative z-10">
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-500 ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]'
                      : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-500 ${isActive ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : 'text-text-tertiary group-hover:text-text-secondary'}`}
                      aria-hidden="true"
                    />
                    <span className="tracking-tight">{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User area */}
      <div className="border-t border-white/5 p-5 bg-black/20 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-bg-elevated to-bg-panel border border-white/5 shadow-inner text-xs font-black text-brand-400">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-bold text-text-primary">{user?.name || user?.email || 'Authorized User'}</p>
            <p className="truncate text-[10px] text-brand-500/70 font-black uppercase tracking-widest">FinSight member</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-text-tertiary hover:bg-white/5 hover:text-brand-400 transition-all duration-300 active:scale-95"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
