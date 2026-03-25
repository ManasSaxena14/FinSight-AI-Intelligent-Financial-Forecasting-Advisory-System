import { Outlet } from 'react-router-dom';
import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Sidebar from './Sidebar';
import Chatbot from './Chatbot';
import { Bell } from 'lucide-react';

export default function Layout() {
  const mainRef = useRef(null);

  useLayoutEffect(() => {
    // Elegant fade-up entry animation for the initial app load
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power4.out" }
    );
  }, []);

  return (
    <div className="flex h-screen bg-bg-base text-text-primary font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      
      {/* Soft abstract background glows */}
      <div className="absolute top-[-25%] right-[-15%] w-[60%] h-[60%] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-25%] left-[-15%] w-[60%] h-[60%] bg-white/5 rounded-full blur-[150px] pointer-events-none" />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Top Navbar / Global Header */}
        <header className="h-20 bg-bg-panel/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-10 shadow-2xl relative z-20">
          <div className="flex flex-col">
            <h2 className="text-xl font-black tracking-tight text-text-primary flex items-baseline gap-2">
              Overview <span className="text-text-tertiary font-bold text-xs uppercase tracking-[0.2em] ml-2">/ Intelligence Suite</span>
            </h2>
          </div>
          
          <div className="ml-auto flex items-center space-x-8">
            <button className="relative text-text-tertiary hover:text-brand-400 transition-all duration-300 group">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-brand-500 rounded-full border-2 border-bg-panel shadow-[0_0_8px_rgba(212,175,55,0.6)]"></span>
            </button>
            
            <div className="flex items-center gap-4 group cursor-pointer border-l border-white/5 pl-8 py-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-text-primary tracking-tight">Vip User</p>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">Enterprise</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-bg-elevated to-bg-panel border border-brand-500/20 flex items-center justify-center text-brand-400 font-black shadow-lg group-hover:border-brand-500/50 transition-all duration-500 group-hover:scale-105">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
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
