import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Button, Field } from '../components/ui';
import { gsap } from '../lib/motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      toast.success('Welcome back');
      setLeaving(true);
    } else {
      setError(result.message);
      gsap.fromTo(formRef.current, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    }
  };

  return (
    <AuthShell
      leaving={leaving}
      onLeft={() => navigate('/')}
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={<>New to FinSight? <Link to="/register" className="text-brand-300 hover:text-brand-200">Create an account</Link></>}
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {error && <p role="alert" className="rounded-xl border border-neg/30 bg-neg/10 px-3 py-2 text-sm text-neg">{error}</p>}
        <Button type="submit" size="lg" className="relative w-full overflow-hidden" isLoading={isLoading || leaving} magnet>
          <span data-sheen aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
