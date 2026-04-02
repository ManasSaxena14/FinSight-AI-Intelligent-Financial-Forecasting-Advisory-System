import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Shield, Zap, Crown, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../components/Card';
import { Button } from '../components/Button';

export default function Plans() {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Premium entrance animation
      gsap.fromTo('.plan-card', 
        { y: 60, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 1, stagger: 0.2, ease: "power4.out" }
      );
      
      // Floating animation for icons
      gsap.to('.plan-icon', {
        y: -10,
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: "sine.inOut",
        stagger: 0.3
      });
      
      // Reveal header
      gsap.fromTo('.header-reveal',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out" }
      );
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  const plans = [
    {
      id: 'basic',
      name: 'Essential',
      price: 'Free',
      icon: Shield,
      color: 'text-zinc-400',
      bgClass: 'bg-zinc-500/10 border-zinc-500/20',
      active: true,
      features: [
        { name: 'Core Expense Tracking', active: true },
        { name: 'Basic AI Financial Summaries', active: true },
        { name: 'Standard Goals (Up to 3)', active: true },
        { name: 'Basic Market Insights', active: false },
        { name: 'Real-time Predictive Engine', active: false }
      ]
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '₹1,499/mo',
      icon: Zap,
      color: 'text-blue-400',
      bgClass: 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      active: false,
      tag: 'Upcoming',
      features: [
        { name: 'Advanced AI Routing', active: true },
        { name: 'Unlimited Financial Goals', active: true },
        { name: 'Pro Predictive Stress Testing', active: true },
        { name: 'Automated Tax Optimization', active: true },
        { name: 'Custom AI Personas', active: false }
      ]
    },
    {
      id: 'premium',
      name: 'Elite Wealth',
      price: '₹4,999/mo',
      icon: Crown,
      color: 'text-brand-400',
      bgClass: 'bg-brand-500/10 border-brand-500/50 shadow-[0_0_50px_rgba(212,175,55,0.25)]',
      active: false,
      tag: 'Upcoming',
      highlight: true,
      features: [
        { name: 'Full Neural Forecasting Model', active: true },
        { name: 'Direct Portfolio Management', active: true },
        { name: 'Crypto & Real Estate Assets', active: true },
        { name: '24/7 AI CPA/Tax Consultant', active: true },
        { name: 'API Access for Integrations', active: true }
      ]
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] py-12" ref={containerRef}>
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="header-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-black uppercase tracking-[0.3em] mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Membership Tiers</span>
        </div>
        <h1 className="header-reveal text-5xl md:text-7xl font-black text-text-primary tracking-tighter italic mb-6">
           Elevate your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Financial Future.</span>
        </h1>
        <p className="header-reveal text-text-tertiary text-lg max-w-xl mx-auto font-medium leading-relaxed">
          Upgrade to unlock institutional-grade AI analysis, predictive stress testing, and autonomous tax optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 relative z-10">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className={`plan-card relative overflow-hidden backdrop-blur-3xl border transition-all duration-500 group hover:-translate-y-4 hover:shadow-2xl ${plan.bgClass} ${plan.highlight ? 'md:-mt-8 md:mb-8' : ''}`}>
              {plan.highlight && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600 animate-shimmer bg-[length:200%_100%]" />
              )}
              {plan.tag && (
                <div className="absolute top-6 right-6">
                  <span className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-secondary backdrop-blur-md">
                    {plan.tag}
                  </span>
                </div>
              )}
              
              <CardContent className="p-10 flex flex-col h-full">
                <div className={`p-4 rounded-2xl w-fit mb-8 bg-black/40 border border-white/5 plan-icon shadow-xl ${plan.color}`}>
                  <Icon className="w-8 h-8 drop-shadow-[0_0_15px_currentColor]" />
                </div>
                
                <h3 className="text-2xl font-black italic tracking-tight text-text-primary mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className={`text-4xl font-black uppercase tracking-tighter ${plan.color}`}>{plan.price}</span>
                  {plan.price !== 'Free' && <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">/ billed monthly</span>}
                </div>
                
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
                
                <ul className="space-y-5 mb-10 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex flex-start gap-4 text-sm">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 transition-colors ${feature.active ? plan.color : 'text-zinc-700'}`} />
                      <span className={`font-medium tracking-wide ${feature.active ? 'text-text-secondary' : 'text-zinc-600 line-through'}`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all h-auto flex items-center justify-center gap-3 ${
                    plan.active 
                      ? 'bg-white/5 text-text-secondary cursor-default hover:bg-white/5 border border-white/10' 
                      : plan.highlight
                        ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-black hover:scale-105 active:scale-95 shadow-brand-500/25'
                        : 'bg-blue-500 hover:bg-blue-400 text-white hover:scale-105 active:scale-95 shadow-blue-500/25'
                  }`}
                  disabled={plan.active}
                >
                  {plan.active ? 'Current Deployment' : `Pre-register for ${plan.name}`}
                  {!plan.active && <ChevronRight className="w-4 h-4" />}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
