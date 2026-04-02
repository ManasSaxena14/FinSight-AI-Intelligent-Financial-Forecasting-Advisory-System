import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { User, Mail, ShieldCheck, CreditCard, LogOut, Sparkles } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const containerRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 relative" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      <header className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter italic">Neural Profile.</h1>
          <p className="text-sm text-text-tertiary mt-2 font-medium tracking-wide italic">Verified Identity & Security Authorization.</p>
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
              <CardTitle className="text-2xl font-black text-text-primary italic tracking-tight">{user.name}</CardTitle>
              <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.3em] mt-1">Authorized User Profile</p>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-12 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-2 px-1">Email Hash</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <Mail className="w-4 h-4 text-brand-400" />
                  <span className="text-sm font-medium text-text-secondary">{user.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest block mb-2 px-1">Identity UID</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <div className="h-2 w-2 rounded-full bg-brand-500" />
                  <span className="text-[10px] font-mono text-text-tertiary truncate">{user.id}</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-500/5 to-transparent border border-brand-500/10 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">Security Insight</p>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed font-medium">Your session is currently protected by AES-256 encryption. Last login detected from a verified secure terminal.</p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Membership & Actions */}
        <div className="space-y-10">
          <Card className="glass-card border-none bg-black/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 text-center space-y-8">
              <div className="mx-auto h-20 w-20 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-center text-text-tertiary">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Membership Status</p>
                <h3 className="text-2xl font-black text-text-primary italic tracking-tight">Essential Tier</h3>
                <p className="text-[9px] font-bold text-brand-500 uppercase tracking-[0.2em] mt-2">Active Authorization</p>
              </div>
              <Button onClick={() => window.location.href='/plans'} variant="secondary" className="w-full py-4 rounded-2xl border-white/5 text-text-secondary font-black hover:bg-white/5 transition-all text-[10px] uppercase tracking-widest">
                Upgrade Access
              </Button>
            </CardContent>
          </Card>

          <Button 
            onClick={logout}
            className="w-full h-16 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            Terminate Session
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 opacity-30 pt-10">
        <div className="h-px w-12 bg-text-tertiary" />
        <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.5em]">
          ISO-27001 Certified • Neural Protocol
        </p>
        <div className="h-px w-12 bg-text-tertiary" />
      </div>
    </div>
  );
}
