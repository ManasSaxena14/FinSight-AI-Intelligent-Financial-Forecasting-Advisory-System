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

const FEATURES = [
  {
    title: "Financial Goal Engine",
    description: "Set neural targets for savings or big purchases. Our AI automatically calculates the optimal path, adjusting your daily spending recommendations to ensure you hit your 'Trophy' milestones on time.",
    icon: Target,
    highlight: "Smart Prioritization",
    iconColor: "text-rose-400",
    bgColor: "bg-rose-500/5",
    borderColor: "border-rose-500/10"
  },
  {
    title: "AI Advisory Module",
    description: "Access a personal financial consultant 24/7. Using natural language processing, the AI analyzes your 'Ledger' to give you hyper-personalized advice on where to cut costs and how to invest surplus liquidity.",
    icon: Bot,
    highlight: "24/7 Neural Support",
    iconColor: "text-brand-400",
    bgColor: "bg-brand-500/5",
    borderColor: "border-brand-500/10"
  },
  {
    title: "Predictive Analytics",
    description: "Move beyond history. Our 'Momentum' charts use advanced regression models to project your future balance. It identifies 'Fiscal Leaks' before they impact your net worth.",
    icon: TrendingUp,
    highlight: "Future Projection",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/10"
  },
  {
    title: "Categorical Matrix",
    description: "Deep-dive into your spending DNA. We break down every credit and debit stream—from 'Asset Liquidity' to 'Entertainment'—using intuitive visualizations that reveal your true financial habits.",
    icon: PieChart,
    highlight: "DNA Breakdown",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/5",
    borderColor: "border-purple-500/10"
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
  }
];

export default function HowItWorks() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".animate-header", {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power4.out",
        stagger: 0.2
      });

      gsap.from(".animate-step", {
        scale: 0.9,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.2)",
        scrollTrigger: {
          trigger: ".flowchart-grid",
          start: "top 80%"
        }
      });

      gsap.from(".animate-feature", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 85%"
        }
      });

      gsap.from(".animate-faq", {
        x: -20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".faq-section",
          start: "top 80%"
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-32 py-16 px-6 relative overflow-y-auto custom-scrollbar" ref={containerRef}>
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
          <Layers className="w-6 h-6 text-brand-400" />
          <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Operational Pipeline</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="flowchart-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {FLOW_STEPS.map((step, idx) => (
            <div key={step.id} className="relative group animate-step">
              <Card className="glass-card h-full border-none bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-500/5">
                <div className="space-y-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", step.bg, step.border)}>
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
                  <ArrowRight className="w-6 h-6 text-brand-500/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Deep Dive ───────────────────────────────────────────── */}
      <section className="space-y-16 relative z-10">
        <div className="flex items-center gap-4">
          <Sparkles className="w-6 h-6 text-brand-400" />
          <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Feature Ecosystem</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="features-grid grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.map((feature, idx) => (
            <Card key={idx} className="animate-feature glass-card border-none bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.03] transition-all duration-500 group">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className={cn(
                  "h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center border transition-transform duration-700 group-hover:rotate-[360deg]",
                  feature.bgColor, feature.borderColor
                )}>
                  <feature.icon className={cn("h-8 w-8", feature.iconColor)} />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em]">{feature.highlight}</span>
                    <div className="h-px w-4 bg-brand-500/30" />
                  </div>
                  <h3 className="text-2xl font-black italic text-text-primary tracking-tighter">{feature.title}</h3>
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
            <HelpCircle className="w-6 h-6 text-brand-400" />
            <h2 className="text-2xl font-black italic tracking-tight text-text-primary">Intelligence Briefing</h2>
          </div>
          <p className="text-sm text-text-secondary font-medium leading-relaxed">
            Common inquiries regarding system protocols, security measures, and predictive methodologies.
          </p>
          <div className="pt-8">
            <Card className="bg-brand-500/5 border border-brand-500/10 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-4 h-4 text-brand-400" />
                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Real-time Node</span>
              </div>
              <p className="text-xs text-brand-200/70 font-medium">
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
              <Card className="glass-card border-none bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.03] transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-1 border border-brand-500/20">
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
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <div className="text-left">
              <p className="text-xs font-black text-text-primary uppercase tracking-widest">Quantum Guard Verified</p>
              <p className="text-[10px] text-text-tertiary font-medium">Last system audit: {new Date().toLocaleDateString()} • Node Status: Stable</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Neural Engine v4.2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">AES-256 Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
