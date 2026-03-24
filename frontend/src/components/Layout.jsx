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
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="flex h-screen bg-bg-base text-text-primary font-sans relative overflow-hidden">
      {/* Soft abstract background glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* Top Navbar Placeholder / Global Header */}
        <header className="h-20 bg-zinc-900/40 backdrop-blur-xl border-b border-zinc-800/80 flex items-center px-10 shadow-lg">
          <h2 className="text-xl font-bold tracking-tight text-white flex gap-2">
            Overview <span className="text-zinc-600 font-normal">/ Active Portfolio</span>
          </h2>
          <div className="ml-auto flex items-center space-x-6">
            <button className="relative text-zinc-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-brand-500 rounded-full border border-zinc-900"></span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-zinc-500 flex items-center justify-center text-white shadow-md cursor-pointer hover:border-brand-400 transition-colors">
              U
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
