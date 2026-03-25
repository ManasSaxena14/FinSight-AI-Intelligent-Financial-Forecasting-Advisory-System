import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  useEffect(() => {
    // Subtle fade-in and slide-up animation
    gsap.fromTo(
      formRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await register(name, email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
      setIsLoading(false);
      gsap.fromTo(formRef.current, 
        { x: -10 }, 
        { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(formRef.current, {x: 0}) }
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      
      {/* Background blobs for depth */}
      <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 -left-20 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[150px]" />

      <div className="w-full max-w-md space-y-12 relative z-10" ref={formRef}>
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-black mb-10 shadow-3xl shadow-brand-500/20 ring-1 ring-white/10 group hover:scale-105 transition-transform duration-500">
            <span className="text-3xl font-black tracking-tighter italic">FS</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-text-primary mb-3 italic">
            Genesis.
          </h2>
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em]">
            Initialize Neural Profile • Secure Protocol
          </p>
        </div>

        <div className="glass-card border-none p-10 sm:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden bg-bg-panel/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] text-center">{error}</div>
              </div>
            )}
            
            <div className="space-y-6">
              <Input
                label="Full Nomenclature / Name"
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                placeholder="Alex Johnson"
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-2xl bg-black/20 focus:border-brand-500/40"
              />

              <Input
                label="Digital Identity / Email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                placeholder="authority@finsight.ai"
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl bg-black/20 focus:border-brand-500/40"
              />

              <Input
                label="Security Access / Password"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-2xl bg-black/20 focus:border-brand-500/40"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]" isLoading={isLoading}>
              Initialize Neural Vault
            </Button>
          </form>

          <div className="mt-10 text-center border-t border-white/5 pt-10">
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
              Already Identified?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors ml-2 underline underline-offset-4 decoration-brand-500/30">
                Secure Log In
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 opacity-30">
          <div className="h-px w-8 bg-text-tertiary" />
          <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.5em]">
            AES-256 Quantum Shielded
          </p>
          <div className="h-px w-8 bg-text-tertiary" />
        </div>
      </div>
    </div>
  );
}
