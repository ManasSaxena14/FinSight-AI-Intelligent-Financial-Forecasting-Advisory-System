import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from './Logo';

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/20" />
          <LogoMark size={52} animate className="relative" />
        </div>
        <p className="text-xs text-fg-faint">Loading FinSight…</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!token) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}
