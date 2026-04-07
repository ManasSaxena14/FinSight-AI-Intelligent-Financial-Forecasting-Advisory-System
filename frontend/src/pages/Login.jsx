import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  useEffect(() => {
    // Subtle fade-in and slide-up animation on mount using GSAP
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

    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Signed in successfully.');
      navigate('/');
    } else {
      setError(result.message);
      toast.error(result.message);
      setIsLoading(false);
      // Shake animation on error
      gsap.fromTo(formRef.current, 
        { x: -10 }, 
        { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(formRef.current, {x: 0}) }
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      <div className="w-full max-w-md space-y-12 relative z-10" ref={formRef}>
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-10">
            <img src="/MAIN_LOGO.png" alt="FinSight AI Logo" className="h-40 w-auto object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-105 transition-transform duration-500" />
          </div>
          <h2 className="text-4xl font-black tracking-tight text-text-primary mb-3">
            Sign in
          </h2>
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em]">
            Secure connection
          </p>
        </div>

        <div className="glass-card border border-white/5 p-10 sm:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden bg-black/40 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/10 to-transparent" />
          
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] text-center">{error}</div>
              </div>
            )}
            
            <div className="space-y-6">
              <Input
                label="Email Address"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                placeholder="authority@finsight.ai"
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-xl bg-white/[0.03] border-white/10 focus:border-brand-500/40"
              />

              <Input
                label="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-xl bg-white/[0.03] border-white/10 focus:border-brand-500/40"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-14 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-brand-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]" isLoading={isLoading}>
              Continue to dashboard
            </Button>
          </form>

          <div className="mt-10 text-center border-t border-white/5 pt-10">
            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
              New here?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 transition-colors ml-2 underline underline-offset-4 decoration-brand-500/30">
                Create an account
              </Link>
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-6 opacity-30">
          <div className="h-px w-8 bg-text-tertiary" />
          <p className="text-[9px] text-text-tertiary font-black uppercase tracking-[0.5em]">
            Data encrypted in transit
          </p>
          <div className="h-px w-8 bg-text-tertiary" />
        </div>
      </div>
    </div>
  );
}
