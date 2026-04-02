import { Outlet } from 'react-router-dom';
import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Sidebar from './Sidebar';
import Chatbot from './Chatbot';
import { Bell, LogOut, CheckCircle2, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { premiumService } from '../api/premiumService';

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  warning:  { icon: AlertTriangle, color: 'text-brand-400', bg: 'bg-brand-500/10' },
  success:  { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  info:     { icon: Info,          color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function Layout() {
  const mainRef = useRef(null);
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useLayoutEffect(() => {
    // Elegant fade-up entry animation for the initial app load
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power4.out" }
    );
  }, []);

  useEffect(() => {
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await premiumService.getNotifications();
        setNotifications(res.notifications);
        setUnreadCount(res.unread_count);
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    };
    fetchNotifications();
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) setUnreadCount(0); // Mark as read when opened
  };

  return (
    <div className="flex h-screen bg-bg-base text-text-primary font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      
      {/* Soft abstract background glows */}
      <div className="absolute top-[-25%] right-[-15%] w-[60%] h-[60%] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-25%] left-[-15%] w-[60%] h-[60%] bg-white/5 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Top Navbar / Global Header */}
        <header className="h-20 bg-bg-panel/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-10 shadow-2xl relative z-40">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight text-text-primary flex items-baseline gap-2">
              Overview <span className="text-text-tertiary font-bold text-xs uppercase tracking-[0.2em] ml-2">/ Intelligence Suite</span>
            </h2>
          </div>
          
          <div className="ml-auto flex items-center space-x-8">
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className={`relative text-text-tertiary hover:text-brand-400 transition-all duration-300 group ${showNotifications ? 'text-brand-400' : ''}`}
              >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-bg-panel shadow-[0_0_8px_rgba(212,175,55,0.6)] flex items-center justify-center text-[8px] font-bold text-black animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-6 w-96 max-h-[32rem] bg-black/60 backdrop-blur-3xl border border-white/5 shadow-2xl shadow-black/80 rounded-3xl overflow-hidden flex flex-col z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <h4 className="font-black italic text-sm tracking-widest uppercase">System Alerts</h4>
                  </div>
                  <div className="overflow-y-auto w-full custom-scrollbar flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-text-tertiary font-medium text-xs tracking-widest uppercase">
                        No active alerts
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map((notif) => {
                          const conf = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
                          const Icon = conf.icon;
                          return (
                            <div key={notif.id} className="p-4 hover:bg-white/[0.02] transition-colors flex gap-4">
                              <div className={`shrink-0 p-2 rounded-xl h-fit border border-white/5 ${conf.bg} ${conf.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black tracking-tight text-text-primary italic mb-1">{notif.title}</p>
                                <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-2">{notif.message}</p>
                                <p className="text-[8px] text-text-tertiary uppercase font-bold tracking-widest inline-block px-1.5 py-0.5 rounded bg-black/20 border border-white/5">{notif.type}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 group cursor-pointer border-l border-white/5 pl-8 py-2 relative">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-text-primary tracking-tight">{user?.email?.split('@')[0] || 'Member'}</p>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">Enterprise Elite</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-bg-elevated to-bg-panel border border-brand-500/20 flex items-center justify-center text-brand-400 font-black shadow-lg group-hover:border-brand-500/50 transition-all duration-500 group-hover:scale-105 overflow-hidden">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* Optional: Simple Logout Tooltip/Dropdown integration check */}
              <button 
                onClick={logout}
                className="absolute -bottom-10 right-0 bg-bg-panel border border-white/5 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 text-text-tertiary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-2xl"
              >
                <LogOut className="w-3 h-3" /> Terminate Session
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto" ref={mainRef}>
          <div className="container mx-auto px-8 py-10 max-w-7xl">
             <Outlet />
          </div>
        </main>
      </div>

      {/* Global AI Chatbot Widget */}
      <Chatbot />
    </div>
  );
}
