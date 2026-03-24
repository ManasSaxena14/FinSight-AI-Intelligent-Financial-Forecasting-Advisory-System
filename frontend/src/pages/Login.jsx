import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
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
      navigate('/');
    } else {
      setError(result.message);
      setIsLoading(false);
      // Shake animation on error
      gsap.fromTo(formRef.current, 
        { x: -10 }, 
        { x: 10, duration: 0.1, yoyo: true, repeat: 3, onComplete: () => gsap.set(formRef.current, {x: 0}) }
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs for depth */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-brand-600/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-md space-y-10 relative z-10" ref={formRef}>
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white mb-6 shadow-xl shadow-brand-500/20 ring-1 ring-white/20">
            <span className="text-2xl font-black tracking-tighter">FS</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-sm font-medium text-zinc-500">
            Unlock your intelligent financial future.
          </p>
        </div>

        <div className="glass-card border border-white/5 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs font-bold text-rose-400 uppercase tracking-widest text-center">{error}</div>
              </div>
            )}
            
            <div className="space-y-5">
              <Input
                label="Identity / Email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                fullWidth
                value={email}
                placeholder="alex@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Security Access / Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                fullWidth
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]" isLoading={isLoading}>
              Enter Dashboard
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-8">
            <p className="text-sm font-medium text-zinc-500">
              New to FinSight?{' '}
              <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
                Initialize Account
              </Link>
            </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
          FinSight AI © 2026 • Encrypted Session
        </p>
      </div>
    </div>
  );
}
