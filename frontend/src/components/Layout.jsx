import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Bell, Bot, CheckCircle2, Crown, HelpCircle, Info, LayoutDashboard,
  LineChart, LogOut, Menu, PlusCircle, Target, User, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { premiumService } from '../api/premiumService';
import { cn } from '../lib/cn';
import { gsap, prefersReducedMotion, ScrollTrigger } from '../lib/motion';
import Chatbot from './Chatbot';
import Logo from './Logo';

const AmbientField = lazy(() => import('../three/AmbientField'));

const NAVIGATION = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Add money', href: '/add-expense', icon: PlusCircle },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'AI Advisor', href: '/advisor', icon: Bot, badge: 'AI' },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'How it works', href: '/how-it-works', icon: HelpCircle },
  { name: 'Membership', href: '/plans', icon: Crown },
];

const SEVERITY = {
  critical: { icon: AlertTriangle, color: 'text-neg' },
  warning: { icon: AlertTriangle, color: 'text-warn' },
  success: { icon: CheckCircle2, color: 'text-pos' },
  info: { icon: Info, color: 'text-info' },
};

function useConfirmLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return () =>
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg">Sign out of FinSight?</p>
        <div className="flex gap-2">
          <button
            onClick={() => { toast.dismiss(t.id); logout(); navigate('/welcome'); }}
            className="h-8 flex-1 rounded-lg bg-neg/90 text-xs font-medium text-white hover:bg-neg"
          >
            Sign out
          </button>
          <button onClick={() => toast.dismiss(t.id)} className="h-8 flex-1 rounded-lg border border-line text-xs text-fg-muted hover:text-fg">
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000 });
}

function NavItems({ onNavigate }) {
  const location = useLocation();
  const listRef = useRef(null);
  const indicatorRef = useRef(null);

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[aria-current="page"]');
    if (!active || !indicatorRef.current) {
      gsap.to(indicatorRef.current, { opacity: 0, duration: 0.2 });
      return;
    }
    gsap.to(indicatorRef.current, { y: active.offsetTop, height: active.offsetHeight, opacity: 1, duration: 0.6, ease: 'expo.out' });
  }, [location.pathname]);

  return (
    <nav ref={listRef} className="relative space-y-0.5">
      <span ref={indicatorRef} className="absolute left-0 right-0 top-0 rounded-xl border border-line-strong bg-white/[0.05] opacity-0">
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
      </span>
      {NAVIGATION.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn('relative z-10 flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
              isActive ? 'text-fg' : 'text-fg-muted hover:text-fg')
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn('h-[18px] w-[18px]', isActive ? 'text-brand-300' : 'text-fg-faint')} strokeWidth={1.75} />
              <span className="flex-1">{item.name}</span>
              {item.badge && <span className="rounded-md border border-ai/30 bg-ai/10 px-1.5 text-[10px] font-medium text-ai">{item.badge}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const confirmLogout = useConfirmLogout();
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="px-5 pb-6 pt-6" aria-label="FinSight AI overview">
        <Logo size={36} tagline />
      </Link>
      <div className="flex-1 overflow-y-auto px-3">
        <p className="eyebrow px-3 pb-2">Menu</p>
        <NavItems onNavigate={onNavigate} />
      </div>
      <div className="m-3 flex items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3">
        <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-600 text-sm font-semibold text-ink-950">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-fg">{user?.name || 'Member'}</p>
            <p className="truncate text-[11px] text-fg-faint">{user?.email}</p>
          </div>
        </Link>
        <button onClick={confirmLogout} title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-fg-faint hover:bg-white/5 hover:text-fg">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const load = () =>
      premiumService.getNotifications()
        .then((res) => { setItems(res.notifications); setUnread(res.unread_count); })
        .catch(() => {});
    load();
    window.addEventListener('expenses:updated', load);
    return () => window.removeEventListener('expenses:updated', load);
  }, []);

  useLayoutEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(panelRef.current, { opacity: 0, y: -8, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.4 });
      gsap.from(panelRef.current.querySelectorAll('li'), { opacity: 0, x: 10, stagger: 0.04, duration: 0.5, delay: 0.05 });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setUnread(0); }}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/[0.02] text-fg-muted hover:text-fg"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-400 px-1 text-[10px] font-semibold text-ink-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div ref={panelRef} className="panel absolute right-0 z-50 mt-2 w-[min(92vw,380px)] origin-top-right overflow-hidden !bg-ink-850/95">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Notifications</p>
            <span className="text-xs text-fg-faint">{items.length}</span>
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-fg-faint">You're all caught up.</li>}
            {items.map((n) => {
              const s = SEVERITY[n.severity] || SEVERITY.info;
              return (
                <li key={n.id} className="flex gap-3 px-4 py-3.5">
                  <s.icon className={cn('mt-0.5 h-4 w-4 shrink-0', s.color)} strokeWidth={1.75} />
                  <div>
                    <p className="text-[13px] font-medium text-fg">{n.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{n.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentRef = useRef(null);
  const drawerRef = useRef(null);
  const current = NAVIGATION.find((n) => (n.href === '/' ? location.pathname === '/' : location.pathname.startsWith(n.href)));

  // Route transition: content rises out of a soft blur.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400);
    if (!prefersReducedMotion() && contentRef.current) {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 18, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, clearProps: 'filter,transform' });
    }
    return () => clearTimeout(refresh);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (drawerOpen && drawerRef.current) {
      gsap.fromTo(drawerRef.current, { x: '-100%' }, { x: '0%', duration: 0.55 });
    }
  }, [drawerOpen]);

  return (
    <div className="relative flex min-h-dvh bg-ink-900 text-fg">
      {/* Background: aurora gradients + 3D data dust */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[20%] -top-[30%] h-[70vh] w-[70vw] rounded-full bg-brand-500/[0.07] blur-[140px]" />
        <div className="absolute -bottom-[30%] -right-[10%] h-[60vh] w-[60vw] rounded-full bg-ai/[0.06] blur-[160px]" />
        <Suspense fallback={null}>
          <AmbientField className="absolute inset-0" />
        </Suspense>
        <div className="bg-grid absolute inset-0 opacity-60" />
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-20 hidden h-dvh w-64 shrink-0 border-r border-line bg-ink-900/60 backdrop-blur-2xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside ref={drawerRef} className="relative h-full w-[82vw] max-w-xs border-r border-line bg-ink-900">
            <button onClick={() => setDrawerOpen(false)} className="absolute right-3 top-6 grid h-8 w-8 place-items-center rounded-lg text-fg-muted" aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-ink-900/60 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button onClick={() => setDrawerOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-fg-muted lg:hidden" aria-label="Open menu">
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-fg-faint sm:inline">FinSight</span>
            <span className="hidden text-fg-faint sm:inline">/</span>
            <span className="truncate text-fg">{current?.name || (location.pathname === '/profile' ? 'Profile' : '')}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/add-expense" className="hidden h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 text-[13px] text-fg-muted hover:text-fg sm:flex">
              <PlusCircle className="h-4 w-4" strokeWidth={1.75} /> Add
            </Link>
            <Notifications />
            <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/[0.02] text-fg-muted hover:text-fg" aria-label="Profile">
              <User className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Link>
          </div>
        </header>

        <main className="relative flex-1 overflow-x-clip">
          <div ref={contentRef} className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pt-10">
            <Outlet />
          </div>
        </main>
      </div>

      {location.pathname !== '/advisor' && <Chatbot />}
    </div>
  );
}
