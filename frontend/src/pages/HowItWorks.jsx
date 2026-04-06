import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  ShieldCheck, 
  Brain, 
  Database, 
  LineChart, 
  ArrowRight, 
  HelpCircle,
  Cpu,
  Fingerprint,
  Layers,
  Zap,
  Target,
  Trophy,
  PieChart,
  Bot,
  Sparkles,
  TrendingUp,
  History
} from 'lucide-react';
import { Card } from '../components/Card';
import { cn } from '../utils/cn';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const MotionDiv = motion.div;

const FLOW_STEPS = [
  {
    id: 'data-entry',
    title: 'Data Ingestion',
    description: 'User inputs monthly income and expenses across categorized fiscal streams.',
    icon: Database,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    id: 'encryption',
    title: 'Neural Encryption',
    description: 'AES-256 standards secure data packets before transmission to isolated storage.',
    icon: Fingerprint,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'analysis',
    title: 'Pattern Recognition',
    description: 'Proprietary ML models scan for anomalies, trends, and growth opportunities.',
    icon: Cpu,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20'
  },
  {
    id: 'output',
    title: 'Intelligence Delivery',
    description: 'Visualized trajectory forecasts and tailored advisory protocols are generated.',
    icon: LineChart,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  }
];

export default function HowItWorks() {
  const containerRef = useRef(null);

  const FEATURES = [
    {
      title: "Financial Goal Engine",
      description: "Define high-priority neural targets for savings or significant acquisitions. Our engine calculates the most efficient liquidity allocation, providing a day-by-day roadmap to your 'Trophy' milestones while maintaining operational stability.",
      icon: Target,
      highlight: "Smart Prioritization",
      iconColor: "text-rose-400",
      bgColor: "bg-rose-500/5",
      borderColor: "border-rose-500/10"
    },
    {
      title: "AI Advisory Module",
      description: "Engage with a 24/7 autonomous financial consultant. Utilizing advanced natural language processing, the module audits your 'Ledger' to provide hyper-personalized insights on cost optimization and surplus liquidity deployment.",
      icon: Bot,
      highlight: "Neural Support 24/7",
      iconColor: "text-brand-400",
      bgColor: "bg-brand-500/5",
      borderColor: "border-brand-500/10"
    },
    {
      title: "Predictive Analytics",
      description: "Forecast your financial trajectory with high-fidelity 'Momentum' charts. Our regression models identify potential 'Fiscal Leaks' before they manifest, allowing for preemptive course correction and net-worth protection.",
      icon: TrendingUp,
      highlight: "Future Projection",
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/5",
      borderColor: "border-blue-500/10"
    },
    {
      title: "Categorical Matrix",
      description: "Perform deep-scale analysis of your spending DNA. We decompose every credit and debit stream—from 'Asset Liquidity' to 'Entertainment'—using multi-dimensional visualizations that reveal hidden behavioral patterns.",
      icon: PieChart,
      highlight: "DNA Decomposition",
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/5",
      borderColor: "border-purple-500/10"
    },
    {
      title: "Dynamic Budgeting",
      description: "Establish flexible spending boundaries that adapt to your income velocity. The system automatically recalibrates your monthly limits based on real-time ingestion of your expense matrix.",
      icon: History,
      highlight: "Adaptive Limits",
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/5",
      borderColor: "border-emerald-500/10"
    },
    {
      title: "Secure Node Sync",
      description: "Synchronize your data across multiple access points with total confidence. Our decentralized architecture ensures that your financial intelligence is always available, yet protected by industry-leading encryption.",
      icon: ShieldCheck,
      highlight: "Node Integrity",
      iconColor: "text-brand-500",
      bgColor: "bg-brand-500/5",
      borderColor: "border-brand-500/10"
    }
  ];

  const FAQS = [
    {
      question: "How does the AI advisor generate recommendations?",
      answer: "Our system utilizes an ensemble of machine learning models that analyze your historical spending patterns, income stability, and goal progression. It compares your data against optimal fiscal benchmarks to provide context-aware, actionable advice."
    },
    {
      question: "Is my financial data shared with third parties?",
      answer: "No. FinSight AI operates on a principle of total fiscal isolation. Your data is encrypted at the source and used exclusively to train your personal local forecasting model. We never sell or share user data."
    },
    {
      question: "What makes the forecasting model 'predictive'?",
      answer: "Unlike simple budget trackers, our system looks at velocity and acceleration of spending. It identifies seasonal trends and non-linear patterns to predict your end-of-month balance with up to 98% accuracy."
    },
    {
      question: "What are 'Financial Goals' in the system?",
      answer: "Goals are neural targets that the AI uses to prioritize your spending. When you set a goal, the system automatically adjusts its advisory logic to ensure your surplus liquidity is directed toward that target."
    },
    {
      question: "How often should I synchronize my ledger?",
      answer: "For maximum accuracy, we recommend a monthly sync cycle. This provides the neural engine with enough 'Temporal Cycles' to recognize your evolving financial momentum."
    },
    {
      question: "Can I export my fiscal intelligence data?",
      answer: "Yes. The system allows for high-fidelity data exports in multiple formats, ensuring you maintain full sovereignty over your financial history and trajectory reports."
    },
    {
      question: "How secure is the AES-256 encryption?",
      answer: "AES-256 is the global standard for military-grade encryption. Every data packet ingested by our nodes is encrypted before it ever leaves your local environment, making it virtually impenetrable."
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(".animate-header", 
        { y: 30, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: "power4.out", stagger: 0.2 }
      );

      // Parallax effect for floating elements
      gsap.to(".floating-node", {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          each: 0.5,
          from: "random"
        }
      });

      // Step animations with enhanced reveal
      gsap.fromTo(".animate-step",
        { scale: 0.8, opacity: 0, rotationX: -15 },
        { 
          scale: 1, 
          opacity: 1, 
          rotationX: 0,
          duration: 1, 
          stagger: 0.15, 
          ease: "expo.out", 
          delay: 0.4 
        }
      );

      // Feature cards with a subtle tilt and slide
      gsap.fromTo(".animate-feature",
        { y: 60, opacity: 0, skewY: 2 },
        { 
          y: 0, 
          opacity: 1, 
          skewY: 0,
          duration: 1, 
          stagger: 0.1, 
          ease: "power4.out", 
          delay: 0.6 
        }
      );

      // FAQ entries with a sliding reveal
      gsap.fromTo(".animate-faq",
        { x: -40, opacity: 0 },
        { 
          x: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.12, 
          ease: "back.out(1.2)", 
          delay: 0.8 
        }
      );

      // Glow pulse for the security badge
      gsap.to(".security-glow", {
        opacity: 0.6,
        scale: 1.1,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-32 py-16 px-6 relative" ref={containerRef}>
      {/* Dynamic Background Elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl floating-node pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl floating-node pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.02),transparent_70%)] pointer-events-none" />
      
      <div className="absolute inset-0 bg-noise opacity-[0.015] pointer-events-none" />
      
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className="text-center space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-3 animate-header">
          <div className="h-px w-12 bg-brand-500/40" />
          <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.6em]">System Architecture</span>
          <div className="h-px w-12 bg-brand-500/40" />
        </div>
        <h1 className="text-6xl sm:text-7xl font-black text-text-primary tracking-tighter italic leading-tight animate-header">
          Neural <span className="text-brand-500">Infrastructure.</span>
        </h1>
        <p className="text-lg text-text-secondary font-medium tracking-tight max-w-2xl mx-auto animate-header">
          Explore the sophisticated intelligence layers and security protocols that power your financial evolution.
        </p>
      </header>

      {/* ── Flowchart Section ───────────────────────────────────────────── */}
      <section className="space-y-16 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Layers className="w-6 h-6 text-brand-400 relative z-10" />
            <div className="absolute inset-0 bg-brand-400/20 blur-lg security-glow" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Operational Pipeline</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="flowchart-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {FLOW_STEPS.map((step, idx) => (
            <div key={step.id} className="relative group animate-step">
              <Card className="glass-card h-full border-none bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_20px_50px_rgba(212,175,55,0.05)]">
                <div className="space-y-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110", step.bg, step.border)}>
                    <step.icon className={cn("w-7 h-7", step.color)} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-brand-500/50">0{idx + 1}</span>
                      <h3 className="text-lg font-black italic text-text-primary tracking-tight">{step.title}</h3>
                    </div>
                    <p className="text-xs text-text-tertiary font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>
              {idx < FLOW_STEPS.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-4 -translate-y-1/2 z-20 pointer-events-none">
                  <ArrowRight className="w-6 h-6 text-brand-500/20 group-hover:text-brand-500/50 transition-colors" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Deep Dive ───────────────────────────────────────────── */}
      <section className="space-y-16 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Sparkles className="w-6 h-6 text-brand-400 relative z-10" />
            <div className="absolute inset-0 bg-brand-400/20 blur-lg security-glow" />
          </div>
          <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Feature Ecosystem</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.map((feature, idx) => (
            <Card key={idx} className="animate-feature glass-card border-none bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.03] transition-all duration-500 group hover:translate-y-[-8px]">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className={cn(
                  "h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center border transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]",
                  feature.bgColor, feature.borderColor
                )}>
                  <feature.icon className={cn("h-8 w-8", feature.iconColor)} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em]">{feature.highlight}</span>
                    <div className="h-px w-4 bg-brand-500/30" />
                  </div>
                  <h3 className="text-2xl font-black italic text-text-primary tracking-tighter group-hover:text-brand-400 transition-colors">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Q&A Section ─────────────────────────────────────────────────── */}
      <section className="faq-section grid grid-cols-1 lg:grid-cols-3 gap-16 relative z-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <HelpCircle className="w-6 h-6 text-brand-400 relative z-10" />
              <div className="absolute inset-0 bg-brand-400/20 blur-lg security-glow" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Intelligence Briefing</h2>
          </div>
          <p className="text-sm text-text-secondary font-medium leading-relaxed">
            Common inquiries regarding system protocols, security measures, and predictive methodologies.
          </p>
          <div className="pt-8">
            <Card className="bg-brand-500/5 border border-brand-500/10 rounded-3xl p-6 group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-4 h-4 text-brand-400" />
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Real-time Node</span>
              </div>
              <p className="text-xs text-brand-200/70 font-medium relative z-10">
                Our support architects are always active in the encrypted chat modules for personalized technical assistance.
              </p>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {FAQS.map((faq, idx) => (
            <MotionDiv
              key={idx}
              initial={false}
              className="animate-faq group"
            >
              <Card className="glass-card border-none bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.03] transition-all duration-300 hover:shadow-[0_10px_30px_rgba(255,255,255,0.02)]">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-1 border border-brand-500/20 group-hover:scale-110 transition-transform">
                      <span className="text-[10px] font-black text-brand-400 italic">Q</span>
                    </div>
                    <h3 className="text-lg font-black text-text-primary tracking-tight group-hover:text-brand-400 transition-colors duration-300">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-1 border border-white/10">
                      <span className="text-[10px] font-black text-text-tertiary italic">A</span>
                    </div>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* ── Security Badge ──────────────────────────────────────────────── */}
      <footer className="relative z-10 pt-12 border-t border-white/5 pb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <ShieldCheck className="w-8 h-8 text-emerald-500 relative z-10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl security-glow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-text-primary uppercase tracking-widest">Quantum Guard Verified</p>
              <p className="text-[10px] text-text-tertiary font-medium">Last system audit: {new Date().toLocaleDateString()} • Node Status: Stable</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Neural Engine v4.2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

