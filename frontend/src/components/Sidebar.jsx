import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, PieChart, LogOut, Hexagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Add Expense', href: '/add-expense', icon: PlusCircle },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-800 text-zinc-100 z-20 shadow-2xl relative">
      {/* Brand logo area */}
      <div className="flex h-20 items-center px-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-3 font-bold text-xl tracking-wider">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-lg border-glow">
            <Hexagon className="h-5 w-5 fill-white/20" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-400">FinSight</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-300 ${isActive ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User area */}
      <div className="border-t border-zinc-800/50 p-5 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 shadow-inner text-sm font-bold text-zinc-200">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-bold text-zinc-200">{user?.email || 'User'}</p>
            <p className="truncate text-xs text-zinc-500">Premium Member</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
